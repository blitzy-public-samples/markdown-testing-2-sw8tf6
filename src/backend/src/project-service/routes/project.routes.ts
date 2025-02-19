/**
 * Project Routes Configuration
 * Implements secure project management endpoints with comprehensive validation,
 * monitoring, and enterprise-grade features.
 * @version 1.0.0
 */

import { Router } from 'express'; // v4.18.2
import { container } from 'inversify'; // v6.0.1
import rateLimit from 'express-rate-limit'; // v6.7.0
import compression from 'compression'; // v1.7.4
import helmet from 'helmet'; // v7.0.0
import { body, param, query } from 'express-validator'; // v7.0.1
import createError from 'http-errors'; // v2.0.0
import { ProjectController } from '../controllers/project.controller';
import { authenticate, authorizeRoles } from '../../api-gateway/middleware/auth.middleware';
import { TYPES } from '../../common/constants/types';
import { ProjectStatus } from '../interfaces/project.interface';
import { CLIENT_ERROR_CODES } from '../../common/constants/status-codes';

// API version prefix
const API_VERSION = '/api/v1';

// Rate limiting configuration
const projectRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // Max 100 requests per minute
    message: 'Too many requests from this IP, please try again later'
});

/**
 * Configures and returns project management routes with security middleware
 * @returns Configured Express router
 */
export default function configureProjectRoutes(): Router {
    const router = Router();
    const projectController = container.get<ProjectController>(TYPES.ProjectController);

    // Apply security middleware
    router.use(helmet());
    router.use(compression());
    router.use(projectRateLimit);

    // Authentication middleware for all routes
    router.use(authenticate);

    // GET /projects - Retrieve paginated projects with filtering
    router.get(
        `${API_VERSION}/projects`,
        [
            query('page').optional().isInt({ min: 1 }).toInt(),
            query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
            query('status').optional().isIn(Object.values(ProjectStatus)),
            query('name').optional().isString().trim()
        ],
        authorizeRoles(['USER', 'ADMIN'], ['projects:read']),
        projectController.getProjects
    );

    // POST /projects - Create new project
    router.post(
        `${API_VERSION}/projects`,
        [
            body('name').isString().trim().isLength({ min: 3, max: 100 }),
            body('description').isString().trim(),
            body('startDate').isISO8601(),
            body('endDate').isISO8601(),
            body('members').optional().isArray(),
            body('metadata').optional().isObject()
        ],
        authorizeRoles(['USER', 'ADMIN'], ['projects:create']),
        projectController.createProject
    );

    // GET /projects/:id - Retrieve specific project
    router.get(
        `${API_VERSION}/projects/:id`,
        [
            param('id').isUUID()
        ],
        authorizeRoles(['USER', 'ADMIN'], ['projects:read']),
        projectController.getProject
    );

    // PUT /projects/:id - Update project
    router.put(
        `${API_VERSION}/projects/:id`,
        [
            param('id').isUUID(),
            body('name').optional().isString().trim().isLength({ min: 3, max: 100 }),
            body('description').optional().isString().trim(),
            body('status').optional().isIn(Object.values(ProjectStatus)),
            body('startDate').optional().isISO8601(),
            body('endDate').optional().isISO8601(),
            body('members').optional().isArray(),
            body('metadata').optional().isObject()
        ],
        authorizeRoles(['USER', 'ADMIN'], ['projects:update'], { 
            resourceType: 'project',
            ownershipCheck: true 
        }),
        projectController.updateProject
    );

    // DELETE /projects/:id - Delete project
    router.delete(
        `${API_VERSION}/projects/:id`,
        [
            param('id').isUUID()
        ],
        authorizeRoles(['ADMIN'], ['projects:delete'], {
            resourceType: 'project',
            ownershipCheck: true
        }),
        projectController.deleteProject
    );

    // POST /projects/:id/members - Add project member
    router.post(
        `${API_VERSION}/projects/:id/members`,
        [
            param('id').isUUID(),
            body('userId').isUUID()
        ],
        authorizeRoles(['USER', 'ADMIN'], ['projects:update:members'], {
            resourceType: 'project',
            ownershipCheck: true
        }),
        projectController.addProjectMember
    );

    // DELETE /projects/:id/members/:userId - Remove project member
    router.delete(
        `${API_VERSION}/projects/:id/members/:userId`,
        [
            param('id').isUUID(),
            param('userId').isUUID()
        ],
        authorizeRoles(['USER', 'ADMIN'], ['projects:update:members'], {
            resourceType: 'project',
            ownershipCheck: true
        }),
        projectController.removeProjectMember
    );

    // Error handling middleware
    router.use((err: any, req: any, res: any, next: any) => {
        if (err.status === CLIENT_ERROR_CODES.NOT_FOUND) {
            next(createError(CLIENT_ERROR_CODES.NOT_FOUND, 'Project not found'));
        }
        next(err);
    });

    return router;
}