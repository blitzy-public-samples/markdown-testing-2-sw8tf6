/**
 * @fileoverview Enterprise-grade service implementing comprehensive task comment management
 * with real-time notifications, caching, transaction support, and robust error handling
 * @version 1.0.0
 */

import { injectable } from 'inversify'; // ^6.0.1
import { CircuitBreaker } from 'opossum'; // ^6.0.0
import { Logger } from 'winston'; // ^3.8.0
import { CacheService } from 'node-cache-manager'; // ^3.0.0
import { CommentRepository } from '../repositories/comment.repository';
import { NotificationService } from '../../notification-service/services/notification.service';
import { IComment, ICreateCommentDTO, IUpdateCommentDTO, ICommentQueryOptions } from '../interfaces/comment.interface';
import { NotificationType, NotificationPriority } from '../../notification-service/interfaces/notification.interface';
import { SYSTEM_ERRORS, BUSINESS_ERRORS } from '../../common/constants/error-codes';

/**
 * Enterprise-grade service implementing comprehensive comment management
 * with caching, transactions, and monitoring
 */
@injectable()
export class CommentService {
    private readonly circuitBreaker: CircuitBreaker;
    private readonly cacheKeyPrefix = 'comment:';
    private readonly cacheTTL = 300; // 5 minutes

    constructor(
        private readonly commentRepository: CommentRepository,
        private readonly notificationService: NotificationService,
        private readonly cacheService: CacheService,
        private readonly logger: Logger
    ) {
        // Configure circuit breaker for external service calls
        this.circuitBreaker = new CircuitBreaker(
            async (operation: () => Promise<any>) => operation(),
            {
                timeout: 5000, // 5 seconds
                errorThresholdPercentage: 50,
                resetTimeout: 30000, // 30 seconds
                name: 'CommentService'
            }
        );

        this.setupCircuitBreakerEvents();
    }

    /**
     * Retrieves a comment by ID with caching support
     * @param id - Comment ID to retrieve
     * @returns Promise resolving to found comment or null
     */
    public async getCommentById(id: string): Promise<IComment | null> {
        try {
            // Check cache first
            const cacheKey = `${this.cacheKeyPrefix}${id}`;
            const cachedComment = await this.cacheService.get<IComment>(cacheKey);
            
            if (cachedComment) {
                this.logger.debug('Cache hit for comment', { id });
                return cachedComment;
            }

            // Fetch from repository if not in cache
            const comment = await this.commentRepository.findById(id);
            
            if (comment) {
                await this.cacheService.set(cacheKey, comment, this.cacheTTL);
            }

            return comment;
        } catch (error) {
            this.logger.error('Failed to retrieve comment', error as Error, {
                id,
                code: SYSTEM_ERRORS.DATABASE_ERROR
            });
            throw error;
        }
    }

    /**
     * Creates a new comment with transaction support and notification delivery
     * @param createCommentDto - Comment creation data
     * @param userId - ID of user creating the comment
     * @returns Promise resolving to created comment
     */
    public async createComment(
        createCommentDto: ICreateCommentDTO,
        userId: string
    ): Promise<IComment> {
        const transaction = await this.commentRepository.beginTransaction();

        try {
            // Create comment within transaction
            const comment = await this.commentRepository.create(
                createCommentDto,
                userId,
                transaction
            );

            // Send notifications for mentions and parent task owner
            await this.circuitBreaker.fire(async () => {
                const notifications = [];

                // Notify mentioned users
                if (createCommentDto.mentions?.length) {
                    notifications.push(...createCommentDto.mentions.map(mentionedUserId => ({
                        userId: mentionedUserId,
                        type: NotificationType.TASK_COMMENT,
                        title: 'You were mentioned in a comment',
                        message: `${userId} mentioned you in a comment on task ${createCommentDto.taskId}`,
                        priority: NotificationPriority.MEDIUM,
                        metadata: {
                            taskId: createCommentDto.taskId,
                            commentId: comment.id
                        }
                    })));
                }

                // Send notifications in parallel
                await Promise.all(notifications.map(notification =>
                    this.notificationService.createNotification(notification)
                ));
            });

            await transaction.commit();

            // Invalidate relevant caches
            await this.invalidateRelatedCaches(createCommentDto.taskId);

            this.logger.info('Comment created successfully', {
                commentId: comment.id,
                taskId: createCommentDto.taskId,
                userId
            });

            return comment;

        } catch (error) {
            await transaction.rollback();
            
            this.logger.error('Failed to create comment', error as Error, {
                taskId: createCommentDto.taskId,
                userId,
                code: SYSTEM_ERRORS.DATABASE_ERROR
            });
            
            throw error;
        }
    }

    /**
     * Updates an existing comment with optimistic locking
     * @param id - Comment ID to update
     * @param updateCommentDto - Update data
     * @param userId - ID of user performing update
     * @returns Promise resolving to updated comment
     */
    public async updateComment(
        id: string,
        updateCommentDto: IUpdateCommentDTO,
        userId: string
    ): Promise<IComment> {
        const transaction = await this.commentRepository.beginTransaction();

        try {
            const comment = await this.commentRepository.update(
                id,
                updateCommentDto,
                userId,
                transaction
            );

            // Send notifications for new mentions
            await this.circuitBreaker.fire(async () => {
                if (updateCommentDto.mentions?.length) {
                    const notifications = updateCommentDto.mentions.map(mentionedUserId => ({
                        userId: mentionedUserId,
                        type: NotificationType.TASK_COMMENT,
                        title: 'Comment updated with mention',
                        message: `${userId} mentioned you in an updated comment`,
                        priority: NotificationPriority.MEDIUM,
                        metadata: {
                            taskId: comment.taskId,
                            commentId: comment.id
                        }
                    }));

                    await Promise.all(notifications.map(notification =>
                        this.notificationService.createNotification(notification)
                    ));
                }
            });

            await transaction.commit();

            // Invalidate caches
            await this.invalidateRelatedCaches(comment.taskId);
            await this.cacheService.del(`${this.cacheKeyPrefix}${id}`);

            return comment;

        } catch (error) {
            await transaction.rollback();
            
            this.logger.error('Failed to update comment', error as Error, {
                commentId: id,
                userId,
                code: SYSTEM_ERRORS.DATABASE_ERROR
            });
            
            throw error;
        }
    }

    /**
     * Retrieves comments for a task with pagination and caching
     * @param queryOptions - Query options for filtering and pagination
     * @returns Promise resolving to paginated comments
     */
    public async getTaskComments(
        queryOptions: ICommentQueryOptions
    ): Promise<{
        comments: IComment[];
        total: number;
        hierarchy: Record<string, IComment[]>;
    }> {
        try {
            const cacheKey = `${this.cacheKeyPrefix}task:${queryOptions.taskId}:${JSON.stringify(queryOptions)}`;
            const cached = await this.cacheService.get(cacheKey);

            if (cached) {
                this.logger.debug('Cache hit for task comments', { taskId: queryOptions.taskId });
                return cached;
            }

            const result = await this.commentRepository.findByTaskId(queryOptions);
            
            await this.cacheService.set(cacheKey, result, this.cacheTTL);
            
            return result;

        } catch (error) {
            this.logger.error('Failed to retrieve task comments', error as Error, {
                taskId: queryOptions.taskId,
                code: SYSTEM_ERRORS.DATABASE_ERROR
            });
            throw error;
        }
    }

    /**
     * Deletes a comment and its replies
     * @param id - Comment ID to delete
     * @param userId - ID of user performing deletion
     */
    public async deleteComment(id: string, userId: string): Promise<void> {
        const transaction = await this.commentRepository.beginTransaction();

        try {
            const comment = await this.commentRepository.findById(id);
            if (!comment) {
                throw new Error(BUSINESS_ERRORS.RESOURCE_NOT_FOUND);
            }

            await this.commentRepository.delete(id, userId, transaction);
            await transaction.commit();

            // Invalidate caches
            await this.invalidateRelatedCaches(comment.taskId);
            await this.cacheService.del(`${this.cacheKeyPrefix}${id}`);

            this.logger.info('Comment deleted successfully', {
                commentId: id,
                taskId: comment.taskId,
                userId
            });

        } catch (error) {
            await transaction.rollback();
            
            this.logger.error('Failed to delete comment', error as Error, {
                commentId: id,
                userId,
                code: SYSTEM_ERRORS.DATABASE_ERROR
            });
            
            throw error;
        }
    }

    /**
     * Invalidates related cache entries when comments are modified
     * @param taskId - Task ID to invalidate caches for
     */
    private async invalidateRelatedCaches(taskId: string): Promise<void> {
        const pattern = `${this.cacheKeyPrefix}task:${taskId}:*`;
        await this.cacheService.del(pattern);
    }

    /**
     * Sets up circuit breaker event handlers
     */
    private setupCircuitBreakerEvents(): void {
        this.circuitBreaker.on('open', () => {
            this.logger.warn('Circuit breaker opened', {
                code: SYSTEM_ERRORS.CIRCUIT_BREAKER_OPEN
            });
        });

        this.circuitBreaker.on('halfOpen', () => {
            this.logger.info('Circuit breaker half-open');
        });

        this.circuitBreaker.on('close', () => {
            this.logger.info('Circuit breaker closed');
        });
    }
}