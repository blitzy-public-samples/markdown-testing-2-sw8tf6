/**
 * @fileoverview Task interface definitions and related types for the task management system
 * @version 1.0.0
 */

import { IBaseAuditableEntity, IBaseFilter } from '../../common/interfaces/base.interface';

/**
 * Enumeration of possible task statuses
 * Enforces strict validation of task state transitions
 */
export enum TaskStatus {
    TODO = 'TODO',
    IN_PROGRESS = 'IN_PROGRESS',
    IN_REVIEW = 'IN_REVIEW',
    COMPLETED = 'COMPLETED',
    BLOCKED = 'BLOCKED'
}

/**
 * Enumeration of task priority levels
 * Used for task prioritization and filtering
 */
export enum TaskPriority {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH'
}

/**
 * Core task interface extending base auditable entity
 * Defines the complete structure of a task with validation rules
 */
export interface ITask extends IBaseAuditableEntity {
    /** Task title - Required, max 200 characters */
    title: string;

    /** Detailed task description - Optional, max 2000 characters */
    description: string;

    /** Reference to the parent project - Required, valid UUID */
    projectId: string;

    /** Reference to the assigned user - Required, valid UUID */
    assigneeId: string;

    /** Current task status - Required, must be valid TaskStatus */
    status: TaskStatus;

    /** Task priority level - Required, must be valid TaskPriority */
    priority: TaskPriority;

    /** Task due date - Required, must be a future date */
    dueDate: Date;

    /** Array of attachment references - Optional, valid file references */
    attachments: string[];

    /** Array of task tags - Optional, max 10 tags */
    tags: string[];
}

/**
 * Data Transfer Object for task creation
 * Omits audit fields that are handled by the system
 */
export interface ICreateTaskDTO {
    /** @see ITask.title */
    title: string;

    /** @see ITask.description */
    description: string;

    /** @see ITask.projectId */
    projectId: string;

    /** @see ITask.assigneeId */
    assigneeId: string;

    /** @see ITask.priority */
    priority: TaskPriority;

    /** @see ITask.dueDate */
    dueDate: Date;

    /** @see ITask.attachments */
    attachments: string[];

    /** @see ITask.tags */
    tags: string[];
}

/**
 * Data Transfer Object for task updates
 * All fields are optional to support partial updates
 */
export interface IUpdateTaskDTO {
    /** @see ITask.title */
    title?: string;

    /** @see ITask.description */
    description?: string;

    /** @see ITask.assigneeId */
    assigneeId?: string;

    /** @see ITask.status */
    status?: TaskStatus;

    /** @see ITask.priority */
    priority?: TaskPriority;

    /** @see ITask.dueDate */
    dueDate?: Date;

    /** @see ITask.attachments */
    attachments?: string[];

    /** @see ITask.tags */
    tags?: string[];
}

/**
 * Interface for task filtering and search
 * Extends base filter interface with task-specific criteria
 */
export interface ITaskFilter extends IBaseFilter {
    /** Filter by task title (partial match) */
    title?: string;

    /** Filter by project ID */
    projectId?: string;

    /** Filter by assignee ID */
    assigneeId?: string;

    /** Filter by task status */
    status?: TaskStatus;

    /** Filter by priority level */
    priority?: TaskPriority;

    /** Filter by due date */
    dueDate?: Date;

    /** Filter by tags (exact match) */
    tags?: string[];
}