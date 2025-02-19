/**
 * @fileoverview Comment entity model with TypeORM decorators, nested replies support,
 * and comprehensive audit trails
 * @version 1.0.0
 */

import { 
    Entity, 
    Column, 
    PrimaryGeneratedColumn, 
    ManyToOne, 
    OneToMany, 
    JoinColumn, 
    Index 
} from 'typeorm'; // ^0.3.0

import { IComment } from '../interfaces/comment.interface';
import { IBaseAuditableEntity } from '../../common/interfaces/base.interface';
import { Task } from './task.model';

/**
 * Comment entity with support for nested replies, attachments, and user mentions
 * Includes optimized indices for common query patterns
 */
@Entity('comments')
@Index(['taskId', 'createdAt'])
@Index(['parentCommentId'])
export class Comment implements IComment, IBaseAuditableEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({
        type: 'text',
        nullable: false
    })
    content: string;

    @Column({
        type: 'uuid',
        nullable: false
    })
    @Index()
    taskId: string;

    @Column({
        type: 'uuid',
        nullable: true
    })
    parentCommentId: string | null;

    @Column({
        type: 'simple-array',
        nullable: true,
        default: []
    })
    attachments: string[];

    @Column({
        type: 'simple-array',
        nullable: true,
        default: []
    })
    mentions: string[];

    @Column({
        type: 'int',
        default: 0
    })
    depth: number;

    @Column({
        type: 'boolean',
        default: false
    })
    isEdited: boolean;

    @Column({
        type: 'timestamp with time zone',
        default: () => 'CURRENT_TIMESTAMP'
    })
    createdAt: Date;

    @Column({
        type: 'uuid',
        nullable: false
    })
    createdBy: string;

    @Column({
        type: 'timestamp with time zone',
        default: () => 'CURRENT_TIMESTAMP',
        onUpdate: 'CURRENT_TIMESTAMP'
    })
    updatedAt: Date;

    @Column({
        type: 'uuid',
        nullable: false
    })
    updatedBy: string;

    @ManyToOne(() => Task, task => task.comments, {
        onDelete: 'CASCADE'
    })
    @JoinColumn({ name: 'taskId' })
    task: Task;

    @ManyToOne(() => Comment, comment => comment.replies, {
        onDelete: 'CASCADE',
        nullable: true
    })
    @JoinColumn({ name: 'parentCommentId' })
    parentComment: Comment;

    @OneToMany(() => Comment, comment => comment.parentComment, {
        cascade: ['insert', 'update']
    })
    replies: Comment[];

    /**
     * Creates a new Comment instance with validation
     * @param commentData - Partial comment data for initialization
     */
    constructor(commentData?: Partial<IComment>) {
        if (commentData) {
            this.content = commentData.content;
            this.taskId = commentData.taskId;
            this.parentCommentId = commentData.parentCommentId || null;
            this.attachments = commentData.attachments || [];
            this.mentions = commentData.mentions || [];
            this.depth = commentData.depth || 0;
            this.isEdited = commentData.isEdited || false;
        }

        // Initialize arrays
        this.attachments = this.attachments || [];
        this.mentions = this.mentions || [];
        this.replies = [];
    }

    /**
     * Converts comment entity to JSON with proper date formatting
     * and nested reply handling
     * @returns Formatted comment object
     */
    toJSON(): Record<string, any> {
        const comment = {
            id: this.id,
            content: this.content,
            taskId: this.taskId,
            parentCommentId: this.parentCommentId,
            attachments: this.attachments,
            mentions: this.mentions,
            depth: this.depth,
            isEdited: this.isEdited,
            createdAt: this.createdAt?.toISOString(),
            createdBy: this.createdBy,
            updatedAt: this.updatedAt?.toISOString(),
            updatedBy: this.updatedBy,
            replyCount: this.replies?.length || 0
        };

        // Remove null/undefined values
        Object.keys(comment).forEach(key => {
            if (comment[key] === null || comment[key] === undefined) {
                delete comment[key];
            }
        });

        return comment;
    }

    /**
     * Validates comment data before save
     * @throws Error if validation fails
     */
    async validateBeforeSave(): Promise<void> {
        if (!this.content || this.content.trim().length === 0) {
            throw new Error('Comment content is required');
        }

        if (this.content.length > 5000) {
            throw new Error('Comment content must not exceed 5000 characters');
        }

        if (!this.taskId) {
            throw new Error('Task ID is required');
        }

        if (this.depth > 5) {
            throw new Error('Maximum nesting depth of 5 levels exceeded');
        }

        if (this.attachments && this.attachments.length > 10) {
            throw new Error('Maximum 10 attachments per comment allowed');
        }

        if (this.mentions && this.mentions.length > 20) {
            throw new Error('Maximum 20 user mentions per comment allowed');
        }
    }
}