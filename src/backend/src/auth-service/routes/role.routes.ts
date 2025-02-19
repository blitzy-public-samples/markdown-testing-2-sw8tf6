/**
 * @fileoverview Enhanced role management routes with comprehensive RBAC implementation
 * Provides secure API endpoints for role management with caching and monitoring
 * @version 1.0.0
 */

import { Router } from 'express'; // ^4.18.2
import { container } from 'inversify'; // ^6.0.1
import { cache } from 'express-cache-middleware'; // ^1.0.0
import { monitor } from 'express-monitor'; // ^2.0.0

import { RoleController } from '../controllers/role.controller';
import { RoleMiddleware } from '../middleware/role.middleware';
import { IApplicationError } from '../../common/interfaces/error.interface';
import { CLIENT_ERROR_CODES } from '../../common/constants/status-codes';
import { AUTH_ERRORS } from '../../common/constants/error-codes';

// Initialize router with monitoring
const roleRouter = Router();
const roleController = container.get<RoleController>(RoleController);
const roleMiddleware = container.get<RoleMiddleware>(RoleMiddleware);

// Configure performance monitoring
roleRouter.use(monitor({
    path: '/roles',
    title: 'Role Management API',
    spans: ['http', 'database', 'cache'],
    threshold: 100 // ms
}));

// Configure route caching
const cacheConfig = {
    duration: 300, // 5 minutes
    cacheHeader: true,
    cacheNull: false,
    key: (req: any) => `role:${req.path}:${req.user?.id}`
};

/**
 * GET /roles
 * Retrieves paginated list of roles with filtering
 * @security Bearer token, Admin role required
 */
roleRouter.get('/',
    roleMiddleware.hasRole(['admin'], 'global'),
    roleMiddleware.rateLimit({
        windowMs: 60 * 1000, // 1 minute
        max: 100 // Max 100 requests per minute
    }),
    cache(cacheConfig),
    roleMiddleware.auditLog('ROLE_LIST'),
    async (req, res, next) => {
        try {
            await roleController.getRoles(req, res);
        } catch (error) {
            next(createError(error));
        }
    }
);

/**
 * GET /roles/:id
 * Retrieves role by ID with security checks
 * @security Bearer token, Admin role required
 */
roleRouter.get('/:id',
    roleMiddleware.hasRole(['admin'], 'global'),
    roleMiddleware.rateLimit({
        windowMs: 60 * 1000,
        max: 100
    }),
    cache(cacheConfig),
    roleMiddleware.auditLog('ROLE_VIEW'),
    async (req, res, next) => {
        try {
            await roleController.getRoleById(req, res);
        } catch (error) {
            next(createError(error));
        }
    }
);

/**
 * POST /roles
 * Creates new role with validation and security checks
 * @security Bearer token, Admin role required
 */
roleRouter.post('/',
    roleMiddleware.hasRole(['admin'], 'global'),
    roleMiddleware.validateHierarchy(),
    roleMiddleware.rateLimit({
        windowMs: 60 * 1000,
        max: 50
    }),
    roleMiddleware.auditLog('ROLE_CREATE'),
    async (req, res, next) => {
        try {
            await roleController.createRole(req, res);
        } catch (error) {
            next(createError(error));
        }
    }
);

/**
 * PUT /roles/:id
 * Updates existing role with validation and security checks
 * @security Bearer token, Admin role required
 */
roleRouter.put('/:id',
    roleMiddleware.hasRole(['admin'], 'global'),
    roleMiddleware.validateHierarchy(),
    roleMiddleware.rateLimit({
        windowMs: 60 * 1000,
        max: 50
    }),
    roleMiddleware.auditLog('ROLE_UPDATE'),
    async (req, res, next) => {
        try {
            await roleController.updateRole(req, res);
        } catch (error) {
            next(createError(error));
        }
    }
);

/**
 * DELETE /roles/:id
 * Deletes role with system role protection
 * @security Bearer token, Admin role required
 */
roleRouter.delete('/:id',
    roleMiddleware.hasRole(['admin'], 'global'),
    roleMiddleware.rateLimit({
        windowMs: 60 * 1000,
        max: 30
    }),
    roleMiddleware.auditLog('ROLE_DELETE'),
    async (req, res, next) => {
        try {
            await roleController.deleteRole(req, res);
        } catch (error) {
            next(createError(error));
        }
    }
);

/**
 * Creates standardized error response
 * @param error Error to process
 * @returns Standardized application error
 */
function createError(error: any): IApplicationError {
    return {
        message: error.message || 'An unexpected error occurred',
        code: error.code || AUTH_ERRORS.INSUFFICIENT_PERMISSIONS,
        status: error.status || CLIENT_ERROR_CODES.INTERNAL_SERVER_ERROR,
        details: error.details || [],
        correlationId: error.correlationId
    };
}

// Error handling middleware
roleRouter.use((error: IApplicationError, req: any, res: any, next: any) => {
    res.status(error.status).json({
        status: error.status,
        code: error.code,
        message: error.message,
        details: error.details,
        correlationId: error.correlationId || req.correlationId,
        timestamp: new Date().toISOString()
    });
});

export { roleRouter };