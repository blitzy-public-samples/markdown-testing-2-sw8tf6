/**
 * @fileoverview Project interface definitions for the project service
 * @version 1.0.0
 * 
 * Defines core interfaces and types for project management including:
 * - Project status enumeration
 * - Project entity structure
 * - Project filtering capabilities
 */

import { 
    IBaseAuditableEntity, 
    IBaseFilter 
} from '../../common/interfaces/base.interface';

/**
 * Enumeration of possible project statuses
 * Represents the lifecycle states of a project
 */
export enum ProjectStatus {
    /** Initial project state during setup */
    DRAFT = 'DRAFT',
    
    /** Project is currently in progress */
    ACTIVE = 'ACTIVE',
    
    /** Project has reached its objectives */
    COMPLETED = 'COMPLETED',
    
    /** Project is no longer active but preserved for reference */
    ARCHIVED = 'ARCHIVED'
}

/**
 * Core project entity interface
 * Extends the base auditable entity to include project-specific fields
 */
export interface IProject extends IBaseAuditableEntity {
    /** Project name - must be unique within an organization */
    name: string;
    
    /** Detailed project description */
    description: string;
    
    /** ID of the user who owns/manages the project */
    ownerId: string;
    
    /** Current status of the project */
    status: ProjectStatus;
    
    /** Project start date */
    startDate: Date;
    
    /** Project target completion date */
    endDate: Date;
    
    /** Array of user IDs who are project members */
    members: string[];
    
    /** Additional project metadata for extensibility */
    metadata: Record<string, unknown>;
}

/**
 * Interface for filtering project queries
 * Extends the base filter interface with project-specific search criteria
 */
export interface IProjectFilter extends IBaseFilter {
    /** Optional project name search term */
    name?: string;
    
    /** Optional owner ID filter */
    ownerId?: string;
    
    /** Optional project status filter */
    status?: ProjectStatus;
    
    /** Optional start date filter */
    startDate?: Date;
    
    /** Optional end date filter */
    endDate?: Date;
    
    /** Optional array of member IDs to filter by */
    memberIds?: string[];
}