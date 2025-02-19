/**
 * @fileoverview Repository class for managing task comments with support for
 * hierarchical relationships, versioning, and audit trails
 * @version 1.0.0
 */

import { 
    EntityRepository, 
    Repository, 
    FindOptionsWhere, 
    QueryRunner,
    LessThanOrEqual,
    IsNull,
    Not
} from 'typeorm'; // ^0.3.0

import { Comment } from '../models/comment.model';
import { IComment, ICommentQueryOptions, ICreateCommentDTO, IUpdateCommentDTO } from '../interfaces/comment.interface';

/**
 * Repository class implementing data access operations for task comments
 * Includes support for hierarchical comments, versioning, and audit trails
 */
@EntityRepository(Comment)
export class CommentRepository extends Repository<Comment> {
    /**
     * Finds a comment by ID with optimized relation loading
     * @param id - Comment ID to find
     * @returns Promise resolving to found comment or null
     */
    async findById(id: string): Promise<Comment | null> {
        return this.findOne({
            where: { id },
            relations: ['parentComment', 'replies'],
            cache: {
                id: `comment_${id}`,
                milliseconds: 30000 // 30 second cache
            }
        });
    }

    /**
     * Retrieves comments for a task with pagination and hierarchical structure
     * @param queryOptions - Query options for filtering and pagination
     * @returns Promise resolving to comments, total count and hierarchy
     */
    async findByTaskId(queryOptions: ICommentQueryOptions): Promise<{
        comments: Comment[];
        total: number;
        hierarchy: Record<string, Comment[]>;
    }> {
        const {
            taskId,
            parentCommentId = null,
            includeReplies = true,
            maxDepth = 5,
            page = 1,
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = queryOptions;

        // Build base query
        const queryBuilder = this.createQueryBuilder('comment')
            .where('comment.taskId = :taskId', { taskId })
            .andWhere('comment.depth <= :maxDepth', { maxDepth });

        // Handle parent comment filtering
        if (parentCommentId === null) {
            queryBuilder.andWhere('comment.parentCommentId IS NULL');
        } else if (includeReplies) {
            queryBuilder.andWhere(
                '(comment.parentCommentId = :parentCommentId OR comment.parentCommentId IN ' +
                '(SELECT c.id FROM comments c WHERE c.parentCommentId = :parentCommentId))',
                { parentCommentId }
            );
        } else {
            queryBuilder.andWhere('comment.parentCommentId = :parentCommentId', { parentCommentId });
        }

        // Add sorting
        queryBuilder.orderBy(`comment.${sortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');

        // Add pagination
        const skip = (page - 1) * limit;
        queryBuilder.skip(skip).take(limit);

        // Execute query with count
        const [comments, total] = await queryBuilder
            .leftJoinAndSelect('comment.replies', 'replies')
            .cache({
                id: `task_comments_${taskId}_${page}`,
                milliseconds: 15000 // 15 second cache
            })
            .getManyAndCount();

        // Build hierarchy
        const hierarchy: Record<string, Comment[]> = {};
        comments.forEach(comment => {
            const parentId = comment.parentCommentId || 'root';
            if (!hierarchy[parentId]) {
                hierarchy[parentId] = [];
            }
            hierarchy[parentId].push(comment);
        });

        return { comments, total, hierarchy };
    }

    /**
     * Creates a new comment with proper versioning and audit trail
     * @param createCommentDto - Data for creating new comment
     * @param userId - ID of user creating the comment
     * @returns Promise resolving to created comment
     */
    async create(createCommentDto: ICreateCommentDTO, userId: string): Promise<Comment> {
        const queryRunner = this.manager.connection.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const comment = new Comment({
                ...createCommentDto,
                createdBy: userId,
                updatedBy: userId
            });

            // Set depth for nested comments
            if (createCommentDto.parentCommentId) {
                const parentComment = await this.findById(createCommentDto.parentCommentId);
                if (!parentComment) {
                    throw new Error('Parent comment not found');
                }
                comment.depth = parentComment.depth + 1;
                
                if (comment.depth > 5) {
                    throw new Error('Maximum nesting depth exceeded');
                }
            }

            // Validate comment
            await comment.validateBeforeSave();

            // Save comment
            const savedComment = await queryRunner.manager.save(Comment, comment);

            // Create audit trail
            await queryRunner.manager.insert('comment_audit_trail', {
                commentId: savedComment.id,
                action: 'CREATE',
                userId,
                timestamp: new Date(),
                changes: JSON.stringify(savedComment)
            });

            await queryRunner.commitTransaction();
            return savedComment;

        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * Updates a comment with optimistic locking and audit trail
     * @param id - ID of comment to update
     * @param updateCommentDto - Update data
     * @param userId - ID of user performing update
     * @returns Promise resolving to updated comment
     */
    async update(id: string, updateCommentDto: IUpdateCommentDTO, userId: string): Promise<Comment> {
        const queryRunner = this.manager.connection.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const comment = await this.findById(id);
            if (!comment) {
                throw new Error('Comment not found');
            }

            // Store original state for audit
            const originalState = { ...comment };

            // Update fields
            comment.content = updateCommentDto.content;
            comment.attachments = updateCommentDto.attachments.map(a => a.id || a.name);
            comment.mentions = updateCommentDto.mentions;
            comment.isEdited = true;
            comment.updatedBy = userId;
            comment.updatedAt = new Date();

            // Validate updates
            await comment.validateBeforeSave();

            // Save with optimistic locking
            const savedComment = await queryRunner.manager.save(Comment, comment);

            // Create audit trail
            await queryRunner.manager.insert('comment_audit_trail', {
                commentId: id,
                action: 'UPDATE',
                userId,
                timestamp: new Date(),
                changes: JSON.stringify({
                    before: originalState,
                    after: savedComment
                })
            });

            await queryRunner.commitTransaction();
            return savedComment;

        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * Soft deletes a comment and its replies with audit trail
     * @param id - ID of comment to delete
     * @param userId - ID of user performing deletion
     */
    async delete(id: string, userId: string): Promise<void> {
        const queryRunner = this.manager.connection.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Find comment and its replies
            const comment = await this.findById(id);
            if (!comment) {
                throw new Error('Comment not found');
            }

            const replyIds = await this.createQueryBuilder('comment')
                .where('comment.parentCommentId = :id', { id })
                .getMany()
                .then(replies => replies.map(r => r.id));

            // Soft delete comment and replies
            const timestamp = new Date();
            await queryRunner.manager.update(Comment, 
                [id, ...replyIds],
                {
                    deletedAt: timestamp,
                    updatedBy: userId,
                    updatedAt: timestamp
                }
            );

            // Create audit trails
            await queryRunner.manager.insert('comment_audit_trail', {
                commentId: id,
                action: 'DELETE',
                userId,
                timestamp,
                changes: JSON.stringify({ deletedAt: timestamp })
            });

            await queryRunner.commitTransaction();

        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }
}