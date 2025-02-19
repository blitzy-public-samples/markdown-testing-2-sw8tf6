import { IUser } from '../interfaces/user.interface';
import { IProject } from '../interfaces/project.interface';

/**
 * Enumeration of possible task statuses
 * Aligned with task management workflow requirements
 * @enum {string}
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
 * Used for task sorting and filtering
 * @enum {string}
 */
export enum TaskPriority {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH'
}

/**
 * Core task interface representing the complete task data structure
 * Supports comprehensive task tracking and management features
 * @interface ITask
 */
export interface ITask {
    /** Unique identifier for the task */
    id: string;

    /** Task title - required, max 200 characters */
    title: string;

    /** Detailed task description */
    description: string;

    /** Project the task belongs to */
    project: IProject;

    /** User assigned to the task */
    assignee: IUser;

    /** Current task status */
    status: TaskStatus;

    /** Task priority level */
    priority: TaskPriority;

    /** Task due date */
    dueDate: Date;

    /** Array of attachment URLs */
    attachments: string[];

    /** Array of task tags for categorization */
    tags: string[];

    /** Array of dependent task IDs */
    dependencies: string[];

    /** Timestamp of task creation */
    createdAt: Date;

    /** Timestamp of last task update */
    updatedAt: Date;

    /** ID of user who last modified the task */
    lastModifiedBy: string;
}

/**
 * Data transfer object for task creation
 * Contains required fields for new task creation with validation rules
 * @interface ITaskCreateDTO
 */
export interface ITaskCreateDTO {
    /** Task title - required, max 200 characters */
    title: string;

    /** Task description - optional */
    description: string;

    /** Project ID the task belongs to - required */
    projectId: string;

    /** Assignee user ID - required */
    assigneeId: string;

    /** Task priority level - required */
    priority: TaskPriority;

    /** Task due date - required */
    dueDate: Date;

    /** Array of attachment URLs - optional */
    attachments: string[];

    /** Array of task tags - optional */
    tags: string[];
}

/**
 * Data transfer object for task updates
 * Contains optional fields for partial task updates
 * @interface ITaskUpdateDTO
 */
export interface ITaskUpdateDTO {
    /** Updated task title */
    title?: string;

    /** Updated task description */
    description?: string;

    /** Updated assignee user ID */
    assigneeId?: string;

    /** Updated task status */
    status?: TaskStatus;

    /** Updated task priority */
    priority?: TaskPriority;

    /** Updated due date */
    dueDate?: Date;

    /** Updated array of attachment URLs */
    attachments?: string[];

    /** Updated array of task tags */
    tags?: string[];

    /** Updated array of dependent task IDs */
    dependencies?: string[];
}

/**
 * Interface for task filtering and search operations
 * Supports advanced search with pagination
 * @interface ITaskFilter
 */
export interface ITaskFilter {
    /** Filter by task title */
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

    /** Filter by tags */
    tags?: string[];

    /** Page number for pagination - default: 1 */
    page: number;

    /** Number of items per page - default: 20 */
    limit: number;

    /** Field to sort by - default: 'createdAt' */
    sortBy: string;

    /** Sort direction - default: 'desc' */
    sortOrder: 'asc' | 'desc';
}