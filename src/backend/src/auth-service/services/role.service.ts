/**
 * @fileoverview Role-based access control (RBAC) service implementation
 * Provides comprehensive business logic for role management and permission validation
 * @version 1.0.0
 */

import { injectable } from 'inversify';
import { validate } from 'class-validator';
import { RateLimiter } from 'rate-limiter-flexible';
import { AuditLogger } from '@company/audit-logger';
import { RoleRepository } from '../repositories/role.repository';
import { IRole, IRoleFilter, IRolePermission } from '../interfaces/role.interface';
import { IApplicationError } from '../../common/interfaces/error.interface';
import { AUTH_ERRORS, BUSINESS_ERRORS } from '../../common/constants/error-codes';
import { CLIENT_ERROR_CODES, SERVER_ERROR_CODES } from '../../common/constants/status-codes';

/**
 * Service class implementing comprehensive RBAC operations
 * Handles role management, permission validation, and access control
 */
@injectable()
export class RoleService {
    private readonly rateLimiter: RateLimiter;

    constructor(
        private readonly roleRepository: RoleRepository,
        private readonly auditLogger: AuditLogger,
        rateLimiterConfig?: any
    ) {
        // Initialize rate limiter for role operations
        this.rateLimiter = new RateLimiter({
            points: 100, // Number of points
            duration: 60, // Per 60 seconds
            ...rateLimiterConfig
        });
    }

    /**
     * Retrieves roles based on filter criteria with pagination
     * @param filter - Role filter parameters
     * @param userId - ID of user making the request
     * @returns Paginated list of roles
     * @throws {IApplicationError} On validation or access errors
     */
    async getRoles(
        filter: IRoleFilter,
        userId: string
    ): Promise<{
        roles: IRole[];
        total: number;
        page: number;
        limit: number;
    }> {
        try {
            // Apply rate limiting
            await this.rateLimiter.consume(userId);

            // Validate filter parameters
            const validationErrors = await validate(filter);
            if (validationErrors.length > 0) {
                throw {
                    message: 'Invalid filter parameters',
                    code: BUSINESS_ERRORS.VALIDATION_ERROR,
                    status: CLIENT_ERROR_CODES.BAD_REQUEST,
                    details: validationErrors
                } as IApplicationError;
            }

            // Retrieve roles with pagination
            const result = await this.roleRepository.findAll(filter);

            // Log access for audit
            await this.auditLogger.log({
                action: 'ROLE_LIST',
                userId,
                resource: 'role',
                details: { filter }
            });

            return result;
        } catch (error) {
            if (error.code === 'RATE_LIMIT_EXCEEDED') {
                throw {
                    message: 'Too many role requests',
                    code: AUTH_ERRORS.RATE_LIMIT_EXCEEDED,
                    status: CLIENT_ERROR_CODES.TOO_MANY_REQUESTS
                } as IApplicationError;
            }
            throw error;
        }
    }

    /**
     * Creates a new role with validation
     * @param roleData - Role data to create
     * @param userId - ID of user creating the role
     * @returns Newly created role
     * @throws {IApplicationError} On validation or creation errors
     */
    async createRole(roleData: IRole, userId: string): Promise<IRole> {
        try {
            // Validate role data
            const validationErrors = await validate(roleData);
            if (validationErrors.length > 0) {
                throw {
                    message: 'Invalid role data',
                    code: BUSINESS_ERRORS.VALIDATION_ERROR,
                    status: CLIENT_ERROR_CODES.BAD_REQUEST,
                    details: validationErrors
                } as IApplicationError;
            }

            // Create role
            const role = await this.roleRepository.create(roleData);

            // Log creation
            await this.auditLogger.log({
                action: 'ROLE_CREATE',
                userId,
                resource: 'role',
                resourceId: role.id,
                details: { roleData }
            });

            return role;
        } catch (error) {
            if (error.code === 'DUPLICATE_KEY') {
                throw {
                    message: 'Role with this name already exists',
                    code: BUSINESS_ERRORS.RESOURCE_EXISTS,
                    status: CLIENT_ERROR_CODES.CONFLICT
                } as IApplicationError;
            }
            throw error;
        }
    }

    /**
     * Validates if a role has required permissions
     * @param roleId - Role identifier
     * @param requiredPermissions - Array of required permissions
     * @param scope - Permission scope to validate
     * @returns Validation result with details
     * @throws {IApplicationError} On validation errors
     */
    async validatePermissions(
        roleId: string,
        requiredPermissions: string[],
        scope: string
    ): Promise<{
        isValid: boolean;
        missingPermissions: string[];
    }> {
        const role = await this.roleRepository.findById(roleId);
        if (!role) {
            throw {
                message: 'Role not found',
                code: BUSINESS_ERRORS.RESOURCE_NOT_FOUND,
                status: CLIENT_ERROR_CODES.NOT_FOUND
            } as IApplicationError;
        }

        const missingPermissions = requiredPermissions.filter(
            required => !this.hasPermission(role.permissions, required, scope)
        );

        return {
            isValid: missingPermissions.length === 0,
            missingPermissions
        };
    }

    /**
     * Updates an existing role with validation
     * @param roleId - Role identifier
     * @param roleData - Updated role data
     * @param userId - ID of user updating the role
     * @returns Updated role
     * @throws {IApplicationError} On validation or update errors
     */
    async updateRole(
        roleId: string,
        roleData: Partial<IRole>,
        userId: string
    ): Promise<IRole> {
        try {
            const updatedRole = await this.roleRepository.update(roleId, roleData);
            if (!updatedRole) {
                throw {
                    message: 'Role not found',
                    code: BUSINESS_ERRORS.RESOURCE_NOT_FOUND,
                    status: CLIENT_ERROR_CODES.NOT_FOUND
                } as IApplicationError;
            }

            // Log update
            await this.auditLogger.log({
                action: 'ROLE_UPDATE',
                userId,
                resource: 'role',
                resourceId: roleId,
                details: { roleData }
            });

            return updatedRole;
        } catch (error) {
            if (error.message === 'Cannot modify system role') {
                throw {
                    message: 'System roles cannot be modified',
                    code: AUTH_ERRORS.INSUFFICIENT_PERMISSIONS,
                    status: CLIENT_ERROR_CODES.FORBIDDEN
                } as IApplicationError;
            }
            throw error;
        }
    }

    /**
     * Deletes a role with system role protection
     * @param roleId - Role identifier
     * @param userId - ID of user deleting the role
     * @returns True if deleted successfully
     * @throws {IApplicationError} On deletion errors
     */
    async deleteRole(roleId: string, userId: string): Promise<boolean> {
        try {
            const deleted = await this.roleRepository.delete(roleId);
            if (!deleted) {
                throw {
                    message: 'Role not found',
                    code: BUSINESS_ERRORS.RESOURCE_NOT_FOUND,
                    status: CLIENT_ERROR_CODES.NOT_FOUND
                } as IApplicationError;
            }

            // Log deletion
            await this.auditLogger.log({
                action: 'ROLE_DELETE',
                userId,
                resource: 'role',
                resourceId: roleId
            });

            return true;
        } catch (error) {
            if (error.message === 'Cannot delete system role') {
                throw {
                    message: 'System roles cannot be deleted',
                    code: AUTH_ERRORS.INSUFFICIENT_PERMISSIONS,
                    status: CLIENT_ERROR_CODES.FORBIDDEN
                } as IApplicationError;
            }
            throw error;
        }
    }

    /**
     * Checks if a role has a specific permission
     * @private
     * @param rolePermissions - Role's permissions
     * @param requiredPermission - Required permission to check
     * @param scope - Permission scope
     * @returns True if permission exists
     */
    private hasPermission(
        rolePermissions: IRolePermission[],
        requiredPermission: string,
        scope: string
    ): boolean {
        const [reqAction, reqResource] = requiredPermission.split(':');
        
        return rolePermissions.some(permission => {
            const hasAction = permission.action === reqAction || permission.action === 'manage';
            const hasResource = permission.resource === reqResource;
            const hasScope = permission.scope === scope || permission.scope === 'global';
            
            return hasAction && hasResource && hasScope;
        });
    }
}