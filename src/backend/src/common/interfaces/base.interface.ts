/**
 * @fileoverview Core base interfaces for consistent entity structure across microservices
 * @version 1.0.0
 * 
 * Provides foundational interfaces for:
 * - Basic entity structure with versioning
 * - Auditable entities with user tracking
 * - Soft-deletable entities
 * - Query filtering and pagination
 */

/**
 * Base interface for all database entities
 * Provides essential tracking fields including versioning support
 */
export interface IBaseEntity {
    /** Unique identifier for the entity */
    id: string;

    /** Timestamp when the entity was created */
    createdAt: Date;

    /** Timestamp when the entity was last updated */
    updatedAt: Date;

    /** Version number for optimistic concurrency control */
    version: number;
}

/**
 * Extended interface for entities requiring audit trails
 * Includes user tracking for create and update operations
 */
export interface IBaseAuditableEntity extends IBaseEntity {
    /** ID of the user who created the entity */
    createdBy: string;

    /** ID of the user who last updated the entity */
    updatedBy: string;
}

/**
 * Extended interface for entities supporting soft deletion
 * Maintains version history while marking records as deleted
 */
export interface IBaseSoftDeleteEntity extends IBaseEntity {
    /** Timestamp when the entity was soft deleted, null if active */
    deletedAt: Date | null;
}

/**
 * Standard interface for query filtering, pagination, and sorting
 * Used across all database operations for consistent data access patterns
 */
export interface IBaseFilter {
    /** Page number for pagination, 1-based indexing */
    page: number;

    /** Number of items per page */
    limit: number;

    /** Field name to sort by */
    sortBy: string;

    /** Sort direction */
    sortOrder: 'asc' | 'desc';
}