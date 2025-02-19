/**
 * @fileoverview Express router configuration for task comment endpoints
 * Implements comprehensive security, validation, caching, and performance monitoring
 * @version 1.0.0
 */

import { Router } from 'express'; // ^4.18.2
import { container } from 'inversify'; // ^6.0.1
import { celebrate, Joi, Segments } from 'celebrate'; // ^15.0.1
import rateLimit from 'express-rate-limit'; // ^6.7.0
import compression from 'compression'; // ^1.7.4
import { correlationMiddleware } from 'express-correlation-id'; // ^2.0.1
import { authenticate } from '../../common/middleware/auth.middleware';
import { validateRequest } from '../../common/middleware/validation.middleware';
import { CommentController } from '../controllers/comment.controller';
import { TYPES } from '../../common/constants/types';
import { performanceMonitor } from '@opentelemetry/api'; // ^1.4.1

// Initialize router
const router = Router();

// Get controller instance
const commentController = container.get<CommentController>(TYPES.CommentController);

// Configure rate limiter for comment operations
const commentRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    message: 'Too many comment operations from this IP, please try again later'
});

// Validation schemas
const commentSchema = {
    [Segments.BODY]: Joi.object({
        content: Joi.string().required().max(5000)
            .trim()
            .description('Comment content text'),
        parentCommentId: Joi.string().uuid().allow(null)
            .description('Parent comment ID for replies'),
        mentions: Joi.array().items(Joi.string().uuid())
            .max(20)
            .description('Array of user IDs mentioned in comment'),
        attachments: Joi.array().items(Joi.object({
            name: Joi.string().required(),
            type: Joi.string().required(),
            size: Joi.number().max(10 * 1024 * 1024), // 10MB limit
            data: Joi.binary()
        })).max(10).description('Array of file attachments')
    })
};

const commentUpdateSchema = {
    [Segments.BODY]: Joi.object({
        content: Joi.string().required().max(5000)
            .trim()
            .description('Updated comment content'),
        mentions: Joi.array().items(Joi.string().uuid())
            .max(20)
            .description('Updated array of mentioned user IDs'),
        attachments: Joi.array().items(Joi.object({
            id: Joi.string().uuid(),
            name: Joi.string(),
            type: Joi.string(),
            size: Joi.number().max(10 * 1024 * 1024),
            data: Joi.binary()
        })).max(10).description('Updated file attachments')
    })
};

// Route definitions with comprehensive middleware stack
router.get('/comments/:id',
    correlationMiddleware(),
    authenticate,
    validateRequest,
    performanceMonitor,
    compression(),
    commentController.getComment
);

router.get('/tasks/:taskId/comments',
    correlationMiddleware(),
    authenticate,
    validateRequest,
    performanceMonitor,
    compression(),
    commentController.getTaskComments
);

router.post('/tasks/:taskId/comments',
    correlationMiddleware(),
    authenticate,
    celebrate(commentSchema),
    validateRequest,
    commentRateLimiter,
    performanceMonitor,
    commentController.createComment
);

router.put('/comments/:id',
    correlationMiddleware(),
    authenticate,
    celebrate(commentUpdateSchema),
    validateRequest,
    commentRateLimiter,
    performanceMonitor,
    commentController.updateComment
);

router.delete('/comments/:id',
    correlationMiddleware(),
    authenticate,
    validateRequest,
    commentRateLimiter,
    performanceMonitor,
    commentController.deleteComment
);

export default router;