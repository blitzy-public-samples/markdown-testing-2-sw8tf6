/**
 * @fileoverview Enhanced RBAC middleware implementation with caching and hierarchical roles
 * Provides comprehensive role-based access control with performance optimizations
 * @version 1.0.0
 */

import { Request, Response, NextFunction, RequestHandler } from 'express'; // @version ^4.18.2
import { injectable, inject } from 'inversify'; // @version ^6.0.1
import { Logger } from 'winston'; // @version ^3.8.2
import NodeCache from 'node-cache'; // @version ^5.1.2

import { IRole, IRolePermission } from '../interfaces/role.interface';
import { RoleService } from '../services/role.service';
import { IApplicationError } from '../../common/interfaces/error.interface';
import { AUTH_ERRORS } from '../../common/constants/error-codes';
import { CLIENT_ERROR_CODES } from '../../common/constants/status-codes';

/**
 * Enhanced RBAC middleware with caching and hierarchical role support
 * Implements comprehensive access control for API resources
 */
@injectable()
export class RoleMiddleware {
    private readonly CACHE_TTL = 300; // 5 minutes cache
    private readonly CACHE_CHECK_PERIOD = 600; // 10 minutes cleanup
    
    constructor(
        @inject('RoleService') private readonly roleService: RoleService,
        @inject('Cache') private readonly cache: NodeCache,
        @inject('Logger') private readonly logger: Logger
    ) {
        // Initialize cache with automatic cleanup
        this.cache = new NodeCache({
            stdTTL: this.CACHE_TTL,
            checkperiod: this.CACHE_CHECK_PERIOD,
            useClones: false
        });
    }

    /**
     * Middleware to validate role-based access with caching
     * @param requiredRoles - Array of role names required for access
     * @param scope - Access scope (global, project, team, own)
     * @returns Express middleware function
     */
    public hasRole(requiredRoles: string[], scope: string = 'global'): RequestHandler {
        return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
            try {
                const userId = req.user?.id;
                const userRoles = req.user?.roles || [];

                if (!userId || !userRoles.length) {
                    throw this.createError('User not authenticated', AUTH_ERRORS.TOKEN_MISSING);
                }

                const cacheKey = `role:${userId}:${requiredRoles.join(',')}:${scope}`;
                const cachedResult = this.cache.get<boolean>(cacheKey);

                if (cachedResult !== undefined) {
                    if (!cachedResult) {
                        throw this.createError('Insufficient role permissions', AUTH_ERRORS.INSUFFICIENT_PERMISSIONS);
                    }
                    return next();
                }

                const hasAccess = await this.validateRoleAccess(userId, userRoles, requiredRoles, scope);
                
                // Cache the validation result
                this.cache.set(cacheKey, hasAccess);

                if (!hasAccess) {
                    throw this.createError('Insufficient role permissions', AUTH_ERRORS.INSUFFICIENT_PERMISSIONS);
                }

                // Log successful authorization
                this.logger.info('Role authorization successful', {
                    userId,
                    roles: userRoles,
                    requiredRoles,
                    scope,
                    path: req.path
                });

                next();
            } catch (error) {
                next(error);
            }
        };
    }

    /**
     * Middleware to validate granular permissions with caching
     * @param requiredPermissions - Array of required permissions
     * @param scope - Access scope (global, project, team, own)
     * @returns Express middleware function
     */
    public hasPermission(requiredPermissions: string[], scope: string = 'global'): RequestHandler {
        return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
            try {
                const userId = req.user?.id;
                const userRoles = req.user?.roles || [];

                if (!userId || !userRoles.length) {
                    throw this.createError('User not authenticated', AUTH_ERRORS.TOKEN_MISSING);
                }

                const cacheKey = `perm:${userId}:${requiredPermissions.join(',')}:${scope}`;
                const cachedResult = this.cache.get<boolean>(cacheKey);

                if (cachedResult !== undefined) {
                    if (!cachedResult) {
                        throw this.createError('Insufficient permissions', AUTH_ERRORS.INSUFFICIENT_PERMISSIONS);
                    }
                    return next();
                }

                const hasAccess = await this.validatePermissionAccess(userId, userRoles, requiredPermissions, scope);
                
                // Cache the validation result
                this.cache.set(cacheKey, hasAccess);

                if (!hasAccess) {
                    throw this.createError('Insufficient permissions', AUTH_ERRORS.INSUFFICIENT_PERMISSIONS);
                }

                // Log successful permission check
                this.logger.info('Permission check successful', {
                    userId,
                    roles: userRoles,
                    requiredPermissions,
                    scope,
                    path: req.path
                });

                next();
            } catch (error) {
                next(error);
            }
        };
    }

    /**
     * Validates role-based access with hierarchy support
     * @param userId - User identifier
     * @param userRoles - Array of user's role IDs
     * @param requiredRoles - Array of required role names
     * @param scope - Access scope
     * @returns Promise resolving to access validation result
     */
    private async validateRoleAccess(
        userId: string,
        userRoles: string[],
        requiredRoles: string[],
        scope: string
    ): Promise<boolean> {
        try {
            const roleValidations = await Promise.all(
                userRoles.map(async (roleId) => {
                    const role = await this.roleService.getRoleById(roleId);
                    if (!role) return false;

                    const hierarchy = await this.roleService.getRoleHierarchy(role);
                    return requiredRoles.some(requiredRole => 
                        hierarchy.includes(requiredRole) && this.validateScope(role, scope)
                    );
                })
            );

            return roleValidations.some(isValid => isValid);
        } catch (error) {
            this.logger.error('Role validation error', {
                userId,
                userRoles,
                requiredRoles,
                scope,
                error
            });
            return false;
        }
    }

    /**
     * Validates permission-based access with inheritance
     * @param userId - User identifier
     * @param userRoles - Array of user's role IDs
     * @param requiredPermissions - Array of required permissions
     * @param scope - Access scope
     * @returns Promise resolving to permission validation result
     */
    private async validatePermissionAccess(
        userId: string,
        userRoles: string[],
        requiredPermissions: string[],
        scope: string
    ): Promise<boolean> {
        try {
            const permissionValidations = await Promise.all(
                userRoles.map(async (roleId) => {
                    const role = await this.roleService.getRoleById(roleId);
                    if (!role) return false;

                    return this.roleService.validateRolePermissions(
                        role,
                        requiredPermissions,
                        scope
                    );
                })
            );

            return permissionValidations.some(validation => validation.isValid);
        } catch (error) {
            this.logger.error('Permission validation error', {
                userId,
                userRoles,
                requiredPermissions,
                scope,
                error
            });
            return false;
        }
    }

    /**
     * Validates if role scope is compatible with required scope
     * @param role - Role entity
     * @param requiredScope - Required access scope
     * @returns Boolean indicating scope compatibility
     */
    private validateScope(role: IRole, requiredScope: string): boolean {
        const scopeHierarchy = {
            global: ['global', 'project', 'team', 'own'],
            project: ['project', 'team', 'own'],
            team: ['team', 'own'],
            own: ['own']
        };

        return role.permissions.some(permission => {
            const validScopes = scopeHierarchy[permission.scope as keyof typeof scopeHierarchy];
            return validScopes?.includes(requiredScope);
        });
    }

    /**
     * Creates a standardized application error
     * @param message - Error message
     * @param code - Error code
     * @returns Standardized application error
     */
    private createError(message: string, code: AUTH_ERRORS): IApplicationError {
        return {
            message,
            code,
            status: CLIENT_ERROR_CODES.FORBIDDEN,
            details: [{
                field: 'authorization',
                message,
                code
            }]
        };
    }
}