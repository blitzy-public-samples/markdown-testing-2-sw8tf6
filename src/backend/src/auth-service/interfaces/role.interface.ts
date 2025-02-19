/**
 * @fileoverview Role-based access control (RBAC) interfaces for the authentication system
 * @version 1.0.0
 * 
 * Provides comprehensive type definitions for:
 * - Role entities with system and custom role support
 * - Granular permission control with scoped access
 * - Advanced filtering and pagination for role management
 */

import { IBaseEntity } from '../../common/interfaces/base.interface';

/**
 * Core interface for role entities in the RBAC system
 * Extends base entity interface for consistent tracking
 */
export interface IRole extends IBaseEntity {
    /** Unique name identifier for the role */
    name: string;

    /** Detailed description of the role's purpose and scope */
    description: string;

    /** Collection of granular permissions assigned to the role */
    permissions: IRolePermission[];

    /** Flag indicating if this is a system-defined role (true) or custom role (false) */
    isSystem: boolean;

    /** Flag indicating if the role is currently active and usable */
    isActive: boolean;
}

/**
 * Interface defining the structure of role permissions
 * Provides granular access control with conditional logic
 */
export interface IRolePermission {
    /** Allowed action on the resource */
    action: 'create' | 'read' | 'update' | 'delete' | 'manage';

    /** Access scope level for the permission */
    scope: 'global' | 'project' | 'own' | 'team';

    /** Target resource identifier for the permission */
    resource: string;

    /** Optional conditions for fine-grained access control */
    conditions?: Record<string, any>;
}

/**
 * Interface for role filtering and pagination options
 * Supports advanced search and sorting capabilities
 */
export interface IRoleFilter {
    /** Filter by role name (partial match supported) */
    name?: string;

    /** Filter by system role status */
    isSystem?: boolean;

    /** Filter by active status */
    isActive?: boolean;

    /** Page number for pagination (1-based) */
    page: number;

    /** Number of items per page */
    limit: number;

    /** Field to sort by */
    sortBy: keyof IRole;

    /** Sort direction */
    sortOrder: 'asc' | 'desc';

    /** Full-text search query across role fields */
    searchQuery?: string;
}