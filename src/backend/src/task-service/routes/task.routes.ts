/**
 * @fileoverview Task routes configuration with enhanced security, caching, and performance optimizations
 * @version 1.0.0
 */

import { Router } from 'express'; // ^4.18.2
import { authenticate, authorize, rateLimit } from '@middleware/auth'; // ^1.0.0
import { cache } from '@middleware/cache'; // ^1.0.0
import { TaskController } from '../controllers/task.controller';
import { BaseValidator } from '../../common/validators/base.validator';
import { VALIDATION_ERRORS, BUSINESS_ERRORS } from '../../common/constants/error-codes';
import { CLIENT_ERROR_CODES, SERVER_ERROR_CODES } from '../../common/constants/status-codes';
import { ITaskFilter, TaskStatus } from '../interfaces/task.interface';

/**
 * Configures and returns an Express router with task-related routes
 * Implements comprehensive security, caching, and performance optimizations
 */
export default function configureTaskRoutes(
    taskController: TaskController,
    cacheConfig: {
        ttl: number;
        maxSize: number;
    },
    rateLimitConfig: {
        windowMs: number;
        max: number;
    }
): Router {
    const router = Router();
    const validator = new BaseValidator();

    // Rate limiting configuration
    const taskRateLimit = rateLimit({
        windowMs: rateLimitConfig.windowMs,
        max: rateLimitConfig.max,
        message: {
            status: CLIENT_ERROR_CODES.TOO_MANY_REQUESTS,
            code: BUSINESS_ERRORS.LIMIT_EXCEEDED,
            message: 'Too many requests, please try again later'
        }
    });

    // Cache configuration for GET endpoints
    const taskCache = cache({
        ttl: cacheConfig.ttl,
        maxSize: cacheConfig.maxSize,
        exclude: (req) => req.method !== 'GET'
    });

    /**
     * GET /tasks
     * Retrieves tasks with filtering, pagination and caching
     */
    router.get('/tasks',
        authenticate(),
        taskCache,
        async (req, res, next) => {
            try {
                const filter: ITaskFilter = {
                    page: parseInt(req.query.page as string) || 1,
                    limit: parseInt(req.query.limit as string) || 10,
                    title: req.query.title as string,
                    projectId: req.query.projectId as string,
                    assigneeId: req.query.assigneeId as string,
                    status: req.query.status as TaskStatus,
                    sortBy: req.query.sortBy as string || 'createdAt',
                    sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc'
                };

                const result = await taskController.getTasks(filter);
                res.json(result);
            } catch (error) {
                next(error);
            }
        }
    );

    /**
     * GET /tasks/:taskId
     * Retrieves a specific task by ID with caching
     */
    router.get('/tasks/:taskId',
        authenticate(),
        taskCache,
        async (req, res, next) => {
            try {
                const task = await taskController.getTaskById(req.params.taskId);
                if (!task) {
                    return res.status(CLIENT_ERROR_CODES.NOT_FOUND).json({
                        code: BUSINESS_ERRORS.RESOURCE_NOT_FOUND,
                        message: 'Task not found'
                    });
                }
                res.json(task);
            } catch (error) {
                next(error);
            }
        }
    );

    /**
     * POST /tasks
     * Creates a new task with validation and rate limiting
     */
    router.post('/tasks',
        authenticate(),
        authorize(['ADMIN', 'MANAGER', 'TEAM_LEAD']),
        taskRateLimit,
        async (req, res, next) => {
            try {
                const validationErrors = await validator.validate(req.body);
                if (validationErrors.length > 0) {
                    return res.status(CLIENT_ERROR_CODES.BAD_REQUEST).json({
                        code: VALIDATION_ERRORS.INVALID_FORMAT,
                        message: 'Validation failed',
                        details: validationErrors
                    });
                }

                const task = await taskController.createTask(
                    req.body,
                    req.headers['user-id'] as string,
                    req.headers['user-role'] as string
                );
                res.status(CLIENT_ERROR_CODES.CREATED).json(task);
            } catch (error) {
                next(error);
            }
        }
    );

    /**
     * PUT /tasks/:taskId
     * Updates a task with validation and status transition checks
     */
    router.put('/tasks/:taskId',
        authenticate(),
        authorize(['ADMIN', 'MANAGER', 'TEAM_LEAD']),
        taskRateLimit,
        async (req, res, next) => {
            try {
                const validationErrors = await validator.validate(req.body);
                if (validationErrors.length > 0) {
                    return res.status(CLIENT_ERROR_CODES.BAD_REQUEST).json({
                        code: VALIDATION_ERRORS.INVALID_FORMAT,
                        message: 'Validation failed',
                        details: validationErrors
                    });
                }

                const task = await taskController.updateTask(
                    req.params.taskId,
                    req.body,
                    req.headers['user-id'] as string,
                    req.headers['user-role'] as string
                );
                res.json(task);
            } catch (error) {
                next(error);
            }
        }
    );

    /**
     * PUT /tasks/:taskId/status
     * Updates task status with transition validation
     */
    router.put('/tasks/:taskId/status',
        authenticate(),
        authorize(['ADMIN', 'MANAGER', 'TEAM_LEAD']),
        taskRateLimit,
        async (req, res, next) => {
            try {
                const task = await taskController.updateTaskStatus(
                    req.params.taskId,
                    req.body.status,
                    req.headers['user-id'] as string,
                    req.headers['user-role'] as string
                );
                res.json(task);
            } catch (error) {
                next(error);
            }
        }
    );

    /**
     * DELETE /tasks/:taskId
     * Deletes a task with proper authorization
     */
    router.delete('/tasks/:taskId',
        authenticate(),
        authorize(['ADMIN', 'MANAGER']),
        taskRateLimit,
        async (req, res, next) => {
            try {
                await taskController.deleteTask(
                    req.params.taskId,
                    req.headers['user-id'] as string,
                    req.headers['user-role'] as string
                );
                res.status(CLIENT_ERROR_CODES.NO_CONTENT).send();
            } catch (error) {
                next(error);
            }
        }
    );

    // Error handling middleware
    router.use((error: Error, req: any, res: any, next: any) => {
        console.error('Task Route Error:', error);
        res.status(SERVER_ERROR_CODES.INTERNAL_SERVER_ERROR).json({
            code: BUSINESS_ERRORS.INTERNAL_ERROR,
            message: 'An unexpected error occurred',
            correlationId: req.headers['x-correlation-id']
        });
    });

    return router;
}