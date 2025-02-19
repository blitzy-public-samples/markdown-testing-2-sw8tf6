/**
 * @fileoverview Express router configuration for notification endpoints
 * Implements secure, rate-limited REST endpoints for notification management
 * @version 1.0.0
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import { body, param, query, validationResult } from 'express-validator';
import { NotificationController } from '../controllers/notification.controller';
import { NotificationType, NotificationStatus, NotificationPriority } from '../interfaces/notification.interface';
import { SYSTEM_ERRORS, VALIDATION_ERRORS } from '../../common/constants/error-codes';
import notificationConfig from '../config/notification.config';

// Initialize router with compression
const notificationRouter = Router();
notificationRouter.use(compression());

// Configure rate limiting
const rateLimiter = rateLimit({
    windowMs: notificationConfig.rateLimits.cooldownPeriod,
    max: notificationConfig.rateLimits.maxPerMinute,
    message: { error: SYSTEM_ERRORS.RATE_LIMIT_EXCEEDED }
});

// Apply rate limiting to all routes
notificationRouter.use(rateLimiter);

// Create notification validation rules
const createNotificationValidation = [
    body('userId').isString().notEmpty()
        .withMessage(VALIDATION_ERRORS.REQUIRED_FIELD),
    body('type').isIn(Object.values(NotificationType))
        .withMessage(VALIDATION_ERRORS.INVALID_TYPE),
    body('title').isString().trim().isLength({ min: 1, max: 200 })
        .withMessage(VALIDATION_ERRORS.INVALID_LENGTH),
    body('message').isString().trim().isLength({ min: 1, max: 2000 })
        .withMessage(VALIDATION_ERRORS.INVALID_LENGTH),
    body('priority').isIn(Object.values(NotificationPriority))
        .withMessage(VALIDATION_ERRORS.INVALID_TYPE),
    body('deliveryMethod').isArray().notEmpty()
        .withMessage(VALIDATION_ERRORS.REQUIRED_FIELD)
];

// Get notifications validation rules
const getNotificationsValidation = [
    query('userId').isString().notEmpty()
        .withMessage(VALIDATION_ERRORS.REQUIRED_FIELD),
    query('status').optional().isArray()
        .custom(values => values.every(v => Object.values(NotificationStatus).includes(v)))
        .withMessage(VALIDATION_ERRORS.INVALID_STATUS),
    query('type').optional().isArray()
        .custom(values => values.every(v => Object.values(NotificationType).includes(v)))
        .withMessage(VALIDATION_ERRORS.INVALID_TYPE),
    query('priority').optional().isArray()
        .custom(values => values.every(v => Object.values(NotificationPriority).includes(v)))
        .withMessage(VALIDATION_ERRORS.INVALID_TYPE),
    query('startDate').optional().isISO8601()
        .withMessage(VALIDATION_ERRORS.INVALID_DATE),
    query('endDate').optional().isISO8601()
        .withMessage(VALIDATION_ERRORS.INVALID_DATE),
    query('page').optional().isInt({ min: 1 })
        .withMessage(VALIDATION_ERRORS.INVALID_RANGE),
    query('limit').optional().isInt({ min: 1, max: 100 })
        .withMessage(VALIDATION_ERRORS.INVALID_RANGE)
];

// Create notification endpoint
notificationRouter.post(
    '/notifications',
    createNotificationValidation,
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ 
                    errors: errors.array(),
                    code: VALIDATION_ERRORS.INVALID_FORMAT 
                });
            }

            const controller = new NotificationController();
            const notification = await controller.createNotification(req.body);
            
            res.status(201).json(notification);
        } catch (error) {
            next(error);
        }
    }
);

// Get user notifications endpoint
notificationRouter.get(
    '/notifications/user/:userId',
    getNotificationsValidation,
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ 
                    errors: errors.array(),
                    code: VALIDATION_ERRORS.INVALID_FORMAT 
                });
            }

            const controller = new NotificationController();
            const { notifications, total, metrics } = await controller.getUserNotifications(
                req.params.userId,
                {
                    status: req.query.status as NotificationStatus[],
                    type: req.query.type as NotificationType[],
                    priority: req.query.priority as NotificationPriority[],
                    startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
                    endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
                    page: parseInt(req.query.page as string) || 1,
                    limit: parseInt(req.query.limit as string) || 20
                }
            );

            res.status(200).json({ notifications, total, metrics });
        } catch (error) {
            next(error);
        }
    }
);

// Mark notification as read endpoint
notificationRouter.put(
    '/notifications/:id/read',
    param('id').isString().notEmpty()
        .withMessage(VALIDATION_ERRORS.REQUIRED_FIELD),
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ 
                    errors: errors.array(),
                    code: VALIDATION_ERRORS.INVALID_FORMAT 
                });
            }

            const controller = new NotificationController();
            const notification = await controller.markAsRead(req.params.id);
            
            res.status(200).json(notification);
        } catch (error) {
            next(error);
        }
    }
);

// Mark all notifications as read endpoint
notificationRouter.put(
    '/notifications/user/:userId/read-all',
    param('userId').isString().notEmpty()
        .withMessage(VALIDATION_ERRORS.REQUIRED_FIELD),
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ 
                    errors: errors.array(),
                    code: VALIDATION_ERRORS.INVALID_FORMAT 
                });
            }

            const controller = new NotificationController();
            const result = await controller.markAllAsRead(req.params.userId);
            
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }
);

// Error handling middleware
notificationRouter.use((error: Error, req: any, res: any, next: any) => {
    console.error('Notification route error:', error);
    res.status(500).json({
        error: 'Internal server error',
        code: SYSTEM_ERRORS.INTERNAL_ERROR
    });
});

export default notificationRouter;