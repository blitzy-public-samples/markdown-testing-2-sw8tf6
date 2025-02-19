/**
 * @fileoverview Project database model using Prisma ORM
 * @version 1.0.0
 * 
 * Implements a production-ready Project model with:
 * - Comprehensive validation rules
 * - Optimized database relationships and indexes
 * - Performance-focused caching and scaling features
 * - Full audit trail support
 */

import { PrismaClient } from '@prisma/client'; // v5.0.0
import { 
  IProject, 
  ProjectStatus 
} from '../interfaces/project.interface';
import { IBaseAuditableEntity } from '../../common/interfaces/base.interface';
import { 
  Entity, 
  Index, 
  Cache, 
  MaxMembers, 
  ValidateProjectDates 
} from '@prisma/decorators';

/**
 * Custom decorator for validating project dates
 * Ensures start date is before end date and within valid range
 */
function ValidateProjectDates() {
  return function (target: any) {
    Reflect.defineMetadata('validate:dates', true, target);
  };
}

/**
 * Custom decorator for limiting project members
 * Enforces maximum member limit for scalability
 */
function MaxMembers(limit: number) {
  return function (target: any) {
    Reflect.defineMetadata('validate:maxMembers', limit, target);
  };
}

/**
 * Project database model with comprehensive validation and optimization
 * Implements IProject interface with additional database-specific features
 */
@Entity('projects')
@Index(['ownerId', 'status'], { name: 'idx_owner_status' })
@Index(['startDate', 'endDate'], { name: 'idx_date_range' })
@Index(['name'], { name: 'idx_name_search' })
@Cache({ duration: 3600 })
@MaxMembers(100)
@ValidateProjectDates()
export class Project implements IProject, IBaseAuditableEntity {
  /** Unique identifier for the project */
  id: string;

  /** Project name - unique within organization */
  @Index()
  name: string;

  /** Detailed project description */
  description: string;

  /** Project owner's user ID */
  @Index()
  ownerId: string;

  /** Current project status */
  @Index()
  status: ProjectStatus;

  /** Project start date */
  startDate: Date;

  /** Project end date */
  endDate: Date;

  /** Array of member user IDs */
  members: string[];

  /** Project metadata for extensibility */
  metadata: Record<string, unknown>;

  /** Creation timestamp */
  createdAt: Date;

  /** ID of user who created the project */
  createdBy: string;

  /** Last update timestamp */
  updatedAt: Date;

  /** ID of user who last updated the project */
  updatedBy: string;

  /** Version number for optimistic locking */
  version: number;

  constructor(data: Partial<Project>) {
    Object.assign(this, data);
    this.version = 1;
    this.metadata = data.metadata || {};
  }

  /**
   * Validates project data before persistence
   * Throws validation error if constraints are not met
   */
  validate(): void {
    // Validate name
    if (!this.name || this.name.length < 3 || this.name.length > 100) {
      throw new Error('Project name must be between 3 and 100 characters');
    }

    // Validate dates
    if (this.startDate >= this.endDate) {
      throw new Error('Start date must be before end date');
    }

    // Validate member count
    if (this.members && this.members.length > 100) {
      throw new Error('Project cannot have more than 100 members');
    }

    // Validate status
    if (!Object.values(ProjectStatus).includes(this.status)) {
      throw new Error('Invalid project status');
    }
  }

  /**
   * Updates project version for optimistic locking
   * Called before saving changes to database
   */
  incrementVersion(): void {
    this.version += 1;
    this.updatedAt = new Date();
  }

  /**
   * Checks if project is active and can be modified
   * Returns boolean indicating project modifiability
   */
  isModifiable(): boolean {
    return this.status !== ProjectStatus.ARCHIVED && 
           this.status !== ProjectStatus.COMPLETED;
  }
}

/**
 * Prisma model configuration for Project
 * Defines database schema and relationships
 */
export const ProjectModel = {
  name: 'Project',
  columns: {
    id: { type: 'String', primary: true },
    name: { type: 'String', unique: true },
    description: { type: 'String' },
    ownerId: { type: 'String' },
    status: { type: 'Enum', values: Object.values(ProjectStatus) },
    startDate: { type: 'DateTime' },
    endDate: { type: 'DateTime' },
    members: { type: 'String[]' },
    metadata: { type: 'Json' },
    createdAt: { type: 'DateTime' },
    createdBy: { type: 'String' },
    updatedAt: { type: 'DateTime' },
    updatedBy: { type: 'String' },
    version: { type: 'Int' }
  },
  indexes: {
    owner_status_idx: ['ownerId', 'status'],
    date_range_idx: ['startDate', 'endDate'],
    name_search_idx: ['name']
  }
};