/**
 * @fileoverview Role-based access control (RBAC) controller implementation
 * Provides secure HTTP endpoints for role management with comprehensive validation
 * @version 1.0.0
 */

import { injectable } from 'inversify'; // ^6.0.1
import { Request, Response } from 'express'; // ^4.18.2
import { RateLimit } from 'express-rate-limit'; // ^6.7.0
import { AuditLogger } from '@company/audit-logger'; // ^1.0.0
import { RoleService } from '../services/role.service';
import { IRole } from '../interfaces/role.interface';
import { validate } from '../../common/decorators/validate.decorator';
import { IApplicationError } from '../../common/interfaces/error.interface';
import { SUCCESS_CODES, CLIENT_ERROR_CODES } from '../../common/constants/status-codes';
import { AUTH_ERRORS, BUSINESS_ERRORS } from '../../common/constants/error-codes';

/**
 * Controller handling RBAC operations with comprehensive security measures
 */
@injectable()
export class RoleController {
    // Rate limiting configuration for role endpoints
    private static readonly rateLimitConfig = {
        windowMs: 60 * 1000, // 1 minute
        max: 100, // Max 100 requests per minute
        message: 'Too many role management requests, please try again later'
    };

    constructor(
        private readonly roleService: RoleService,
        private readonly auditLogger: AuditLogger
    ) {}

    /**
     * Retrieves paginated list of roles with filtering
     * @param req Express request
     * @param res Express response
     */
    @RateLimit(RoleController.rateLimitConfig)
    @validate()
    async getRoles(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            const filter = {
                name: req.query.name as string,
                isSystem: req.query.isSystem === 'true',
                isActive: req.query.isActive === 'true',
                page: parseInt(req.query.page as string) || 1,
                limit: parseInt(req.query.limit as string) || 10,
                sortBy: req.query.sortBy as keyof IRole || 'createdAt',
                sortOrder: req.query.sortOrder as 'asc' | 'desc' || 'desc',
                searchQuery: req.query.search as string
            };

            const result = await this.roleService.getRoles(filter, userId);

            // Set cache control headers for performance
            res.set('Cache-Control', 'private, max-age=300');
            res.status(SUCCESS_CODES.OK).json(result);

            // Log successful retrieval
            await this.auditLogger.log({
                action: 'ROLE_LIST',
                userId,
                resource: 'role',
                details: { filter }
            });
        } catch (error) {
            this.handleError(error, res);
        }
    }

    /**
     * Retrieves role by ID with security checks
     * @param req Express request
     * @param res Express response
     */
    @RateLimit(RoleController.rateLimitConfig)
    @validate()
    async getRoleById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const userId = req.user?.id;

            const role = await this.roleService.getRoleById(id);
            if (!role) {
                throw {
                    message: 'Role not found',
                    code: BUSINESS_ERRORS.RESOURCE_NOT_FOUND,
                    status: CLIENT_ERROR_CODES.NOT_FOUND
                } as IApplicationError;
            }

            res.status(SUCCESS_CODES.OK).json(role);

            await this.auditLogger.log({
                action: 'ROLE_VIEW',
                userId,
                resource: 'role',
                resourceId: id
            });
        } catch (error) {
            this.handleError(error, res);
        }
    }

    /**
     * Creates new role with validation and security checks
     * @param req Express request
     * @param res Express response
     */
    @RateLimit(RoleController.rateLimitConfig)
    @validate()
    async createRole(req: Request, res: Response): Promise<void> {
        try {
            const roleData: IRole = req.body;
            const userId = req.user?.id;

            const newRole = await this.roleService.createRole(roleData, userId);

            res.status(SUCCESS_CODES.CREATED).json(newRole);

            await this.auditLogger.log({
                action: 'ROLE_CREATE',
                userId,
                resource: 'role',
                resourceId: newRole.id,
                details: { roleData }
            });
        } catch (error) {
            this.handleError(error, res);
        }
    }

    /**
     * Updates existing role with validation and security checks
     * @param req Express request
     * @param res Express response
     */
    @RateLimit(RoleController.rateLimitConfig)
    @validate()
    async updateRole(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const roleData: Partial<IRole> = req.body;
            const userId = req.user?.id;

            const updatedRole = await this.roleService.updateRole(id, roleData, userId);

            res.status(SUCCESS_CODES.OK).json(updatedRole);

            await this.auditLogger.log({
                action: 'ROLE_UPDATE',
                userId,
                resource: 'role',
                resourceId: id,
                details: { roleData }
            });
        } catch (error) {
            this.handleError(error, res);
        }
    }

    /**
     * Deletes role with system role protection
     * @param req Express request
     * @param res Express response
     */
    @RateLimit(RoleController.rateLimitConfig)
    @validate()
    async deleteRole(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const userId = req.user?.id;

            await this.roleService.deleteRole(id, userId);

            res.status(SUCCESS_CODES.NO_CONTENT).send();

            await this.auditLogger.log({
                action: 'ROLE_DELETE',
                userId,
                resource: 'role',
                resourceId: id
            });
        } catch (error) {
            this.handleError(error, res);
        }
    }

    /**
     * Centralized error handling with proper status codes
     * @private
     * @param error Error to handle
     * @param res Express response
     */
    private handleError(error: any, res: Response): void {
        const status = error.status || CLIENT_ERROR_CODES.INTERNAL_SERVER_ERROR;
        const code = error.code || AUTH_ERRORS.INSUFFICIENT_PERMISSIONS;
        const message = error.message || 'An unexpected error occurred';
        const details = error.details || [];

        res.status(status).json({
            status,
            code,
            message,
            details,
            timestamp: new Date().toISOString(),
            correlationId: res.locals.correlationId
        });
    }
}