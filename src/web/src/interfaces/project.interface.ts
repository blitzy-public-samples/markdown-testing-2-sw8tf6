import { IUser } from '../interfaces/user.interface';

/**
 * Enumeration of possible project statuses
 * Aligned with state management requirements
 * @enum {string}
 */
export enum ProjectStatus {
    DRAFT = 'DRAFT',
    ACTIVE = 'ACTIVE',
    COMPLETED = 'COMPLETED',
    ARCHIVED = 'ARCHIVED',
    BLOCKED = 'BLOCKED'
}

/**
 * Core project interface representing the complete project data structure
 * Supports comprehensive project management features
 * @interface IProject
 */
export interface IProject {
    /** Unique identifier for the project */
    id: string;

    /** Project name */
    name: string;

    /** Detailed project description */
    description: string;

    /** Project owner information */
    owner: IUser;

    /** Current project status */
    status: ProjectStatus;

    /** Project start date */
    startDate: Date;

    /** Project end date */
    endDate: Date;

    /** Array of project team members */
    members: IUser[];

    /** Project completion progress (0-100) */
    progress: number;

    /** Project priority level */
    priority: 'low' | 'medium' | 'high';

    /** Array of project tags for categorization */
    tags: string[];

    /** Timestamp of project creation */
    createdAt: Date;

    /** Timestamp of last project update */
    updatedAt: Date;
}

/**
 * Interface for project filtering and search operations
 * Supports advanced search with pagination
 * @interface IProjectFilter
 */
export interface IProjectFilter {
    /** Optional filter by project name */
    name?: string;

    /** Optional filter by owner ID */
    owner?: string;

    /** Optional filter by project status */
    status?: ProjectStatus;

    /** Optional filter by priority level */
    priority?: 'low' | 'medium' | 'high';

    /** Optional filter by start date */
    startDate?: Date;

    /** Optional filter by end date */
    endDate?: Date;

    /** Optional filter by tags */
    tags?: string[];

    /** Optional filter by team member */
    member?: string;

    /** Optional filter by minimum progress */
    progressMin?: number;

    /** Optional filter by maximum progress */
    progressMax?: number;

    /** Page number for pagination */
    page: number;

    /** Number of items per page */
    limit: number;

    /** Field to sort by */
    sortBy: string;

    /** Sort direction */
    sortOrder: 'asc' | 'desc';
}

/**
 * Data transfer object for project creation
 * Contains required fields for new project creation
 * @interface IProjectCreateDTO
 */
export interface IProjectCreateDTO {
    /** Project name */
    name: string;

    /** Project description */
    description: string;

    /** Project start date */
    startDate: Date;

    /** Project end date */
    endDate: Date;

    /** Project priority level */
    priority: 'low' | 'medium' | 'high';

    /** Array of project tags */
    tags: string[];

    /** Array of member IDs to be added to the project */
    members: string[];
}

/**
 * Data transfer object for project updates
 * Contains all modifiable project fields
 * @interface IProjectUpdateDTO
 */
export interface IProjectUpdateDTO {
    /** Updated project name */
    name: string;

    /** Updated project description */
    description: string;

    /** Updated project status */
    status: ProjectStatus;

    /** Updated start date */
    startDate: Date;

    /** Updated end date */
    endDate: Date;

    /** Updated priority level */
    priority: 'low' | 'medium' | 'high';

    /** Updated progress value */
    progress: number;

    /** Updated project tags */
    tags: string[];

    /** Updated array of member IDs */
    members: string[];
}