/**
 * @fileoverview REST API controller handling task comment operations with comprehensive
 * validation, real-time updates, and performance optimizations.
 * @version 1.0.0
 */

import { injectable, inject } from 'inversify'; // ^6.0.1
import { Request, Response } from 'express'; // ^4.18.2
import { CommentService } from '../services/comment.service';
import { NotificationService } from '@company/notification-service'; // ^1.0.0
import { Logger } from '@company/logger'; // ^1.0.0
import { ValidationUtils } from '@company/validation-utils'; // ^1.0.0
import { SYSTEM_ERRORS, BUSINESS_ERRORS } from '../../common/constants/error-codes';
import { NotificationType, NotificationPriority } from '../../notification-service/interfaces/notification.interface';

/**
 * Controller handling HTTP requests for task comment operations
 * Implements comprehensive validation, caching, and real-time updates
 */
@injectable()
export class CommentController {
    constructor(
        @inject(CommentService) private readonly commentService: CommentService,
        @inject(NotificationService) private readonly notificationService: NotificationService,
        @inject(Logger) private readonly logger: Logger,
        @inject(ValidationUtils) private readonly validationUtils: ValidationUtils
    ) {}

    /**
     * Retrieves a single comment by ID with caching and error handling
     * @param req - Express request object
     * @param res - Express response object
     */
    public async getComment(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;

            // Validate comment ID format
            if (!this.validationUtils.isValidUUID(id)) {
                return res.status(400).json({
                    error: BUSINESS_ERRORS.INVALID_FORMAT,
                    message: 'Invalid comment ID format'
                });
            }

            const comment = await this.commentService.getCommentById(id);
            if (!comment) {
                return res.status(404).json({
                    error: BUSINESS_ERRORS.RESOURCE_NOT_FOUND,
                    message: 'Comment not found'
                });
            }

            // Set cache headers
            res.set('Cache-Control', 'private, max-age=300'); // 5 minutes
            return res.status(200).json(comment);

        } catch (error) {
            this.logger.error('Failed to retrieve comment', error as Error, {
                commentId: req.params.id
            });
            return res.status(500).json({
                error: SYSTEM_ERRORS.INTERNAL_ERROR,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Retrieves paginated comments for a task with filtering and sorting
     * @param req - Express request object
     * @param res - Express response object
     */
    public async getTaskComments(req: Request, res: Response): Promise<Response> {
        try {
            const { taskId } = req.params;
            const {
                page = 1,
                limit = 20,
                parentCommentId = null,
                includeReplies = true,
                maxDepth = 5,
                sortBy = 'createdAt',
                sortOrder = 'desc'
            } = req.query;

            // Validate task ID and query parameters
            if (!this.validationUtils.isValidUUID(taskId)) {
                return res.status(400).json({
                    error: BUSINESS_ERRORS.INVALID_FORMAT,
                    message: 'Invalid task ID format'
                });
            }

            if (!this.validationUtils.isValidPaginationParams(page, limit)) {
                return res.status(400).json({
                    error: BUSINESS_ERRORS.INVALID_RANGE,
                    message: 'Invalid pagination parameters'
                });
            }

            const result = await this.commentService.getTaskComments({
                taskId,
                parentCommentId: parentCommentId as string | null,
                includeReplies: Boolean(includeReplies),
                maxDepth: Number(maxDepth),
                page: Number(page),
                limit: Number(limit),
                sortBy: String(sortBy),
                sortOrder: String(sortOrder)
            });

            // Set cache headers with revalidation
            res.set('Cache-Control', 'private, must-revalidate, max-age=60'); // 1 minute
            return res.status(200).json({
                comments: result.comments,
                total: result.total,
                hierarchy: result.hierarchy,
                page: Number(page),
                limit: Number(limit)
            });

        } catch (error) {
            this.logger.error('Failed to retrieve task comments', error as Error, {
                taskId: req.params.taskId
            });
            return res.status(500).json({
                error: SYSTEM_ERRORS.INTERNAL_ERROR,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Creates a new comment with validation and real-time notification
     * @param req - Express request object
     * @param res - Express response object
     */
    public async createComment(req: Request, res: Response): Promise<Response> {
        try {
            const { taskId, content, parentCommentId, mentions, attachments } = req.body;
            const userId = req.user.id; // Assuming user ID is set by auth middleware

            // Validate required fields
            if (!this.validationUtils.isValidUUID(taskId)) {
                return res.status(400).json({
                    error: BUSINESS_ERRORS.INVALID_FORMAT,
                    message: 'Invalid task ID format'
                });
            }

            if (!content || content.trim().length === 0) {
                return res.status(400).json({
                    error: BUSINESS_ERRORS.INVALID_FORMAT,
                    message: 'Comment content is required'
                });
            }

            // Validate content length
            if (content.length > 5000) {
                return res.status(400).json({
                    error: BUSINESS_ERRORS.INVALID_LENGTH,
                    message: 'Comment content must not exceed 5000 characters'
                });
            }

            // Create comment
            const comment = await this.commentService.createComment({
                taskId,
                content,
                parentCommentId,
                mentions,
                attachments,
                userId
            });

            // Send real-time notifications
            await Promise.all([
                // Notify task owner
                this.notificationService.createNotification({
                    userId: comment.taskId, // Assuming task ID is the owner's ID
                    type: NotificationType.TASK_COMMENT,
                    title: 'New comment on your task',
                    message: `${req.user.name} commented on your task`,
                    priority: NotificationPriority.MEDIUM,
                    metadata: {
                        taskId,
                        commentId: comment.id
                    }
                }),
                // Notify mentioned users
                ...(mentions || []).map(mentionedUserId =>
                    this.notificationService.createNotification({
                        userId: mentionedUserId,
                        type: NotificationType.MENTION,
                        title: 'You were mentioned in a comment',
                        message: `${req.user.name} mentioned you in a comment`,
                        priority: NotificationPriority.MEDIUM,
                        metadata: {
                            taskId,
                            commentId: comment.id
                        }
                    })
                )
            ]);

            this.logger.info('Comment created successfully', {
                commentId: comment.id,
                taskId,
                userId
            });

            return res.status(201).json(comment);

        } catch (error) {
            this.logger.error('Failed to create comment', error as Error, {
                taskId: req.body.taskId,
                userId: req.user.id
            });
            return res.status(500).json({
                error: SYSTEM_ERRORS.INTERNAL_ERROR,
                message: 'Internal server error'
            });
        }
    }
}