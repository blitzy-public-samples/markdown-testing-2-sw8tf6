/**
 * @fileoverview Task entity model with TypeORM decorators and enhanced validation
 * @version 1.0.0
 */

import { 
    Entity, 
    Column, 
    OneToMany, 
    Index,
    VersionColumn 
} from 'typeorm'; // ^0.3.0

import { 
    ITask, 
    TaskStatus, 
    TaskPriority 
} from '../interfaces/task.interface';
import { IComment } from '../interfaces/comment.interface';
import { BaseEntity } from '../../common/models/base.entity';

/**
 * Task entity with optimized database schema and validation rules
 */
@Entity('tasks')
@Index(['projectId', 'status'])
@Index(['assigneeId', 'dueDate'])
@Index(['title', 'description']) // Full-text search optimization
export class Task extends BaseEntity implements ITask {
    @Column({ 
        type: 'varchar', 
        length: 200, 
        nullable: false 
    })
    title: string;

    @Column({ 
        type: 'text', 
        nullable: true 
    })
    description: string;

    @Column({ 
        type: 'uuid', 
        nullable: false 
    })
    @Index()
    projectId: string;

    @Column({ 
        type: 'uuid', 
        nullable: false 
    })
    @Index()
    assigneeId: string;

    @Column({ 
        type: 'enum', 
        enum: TaskStatus, 
        default: TaskStatus.TODO 
    })
    @Index()
    status: TaskStatus;

    @Column({ 
        type: 'enum', 
        enum: TaskPriority, 
        default: TaskPriority.MEDIUM 
    })
    priority: TaskPriority;

    @Column({ 
        type: 'timestamp with time zone', 
        nullable: false 
    })
    dueDate: Date;

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
    tags: string[];

    @OneToMany(() => Comment, comment => comment.task, {
        cascade: ['insert', 'update'],
        eager: false
    })
    comments: IComment[];

    @VersionColumn()
    version: number;

    /**
     * Creates a new Task instance with validation
     * @param taskData - Partial task data for initialization
     */
    constructor(taskData?: Partial<ITask>) {
        super();
        
        if (taskData) {
            this.title = taskData.title;
            this.description = taskData.description || '';
            this.projectId = taskData.projectId;
            this.assigneeId = taskData.assigneeId;
            this.status = taskData.status || TaskStatus.TODO;
            this.priority = taskData.priority || TaskPriority.MEDIUM;
            this.dueDate = taskData.dueDate;
            this.attachments = taskData.attachments || [];
            this.tags = taskData.tags || [];
        }

        // Initialize empty arrays
        this.attachments = this.attachments || [];
        this.tags = this.tags || [];
        this.comments = [];
    }

    /**
     * Converts task entity to JSON with proper date formatting
     * @returns Formatted task object
     */
    toJSON(): Record<string, any> {
        const task = {
            ...super.toJSON(),
            title: this.title,
            description: this.description,
            projectId: this.projectId,
            assigneeId: this.assigneeId,
            status: this.status,
            priority: this.priority,
            dueDate: this.dueDate.toISOString(),
            attachments: this.attachments,
            tags: this.tags,
            commentCount: this.comments?.length || 0,
            version: this.version
        };

        // Remove null/undefined values
        Object.keys(task).forEach(key => {
            if (task[key] === null || task[key] === undefined) {
                delete task[key];
            }
        });

        return task;
    }

    /**
     * Validates task data before save
     * @throws Error if validation fails
     */
    async validateBeforeSave(): Promise<void> {
        if (!this.title || this.title.length > 200) {
            throw new Error('Title is required and must not exceed 200 characters');
        }

        if (this.description && this.description.length > 2000) {
            throw new Error('Description must not exceed 2000 characters');
        }

        if (!this.projectId) {
            throw new Error('Project ID is required');
        }

        if (!this.assigneeId) {
            throw new Error('Assignee ID is required');
        }

        if (!this.dueDate || this.dueDate < new Date()) {
            throw new Error('Due date must be a future date');
        }

        if (this.tags && this.tags.length > 10) {
            throw new Error('Maximum 10 tags are allowed');
        }
    }
}