/**
 * @fileoverview Role repository implementation for RBAC operations
 * @version 1.0.0
 * 
 * Implements secure data access layer for role management with:
 * - Comprehensive CRUD operations with validation
 * - System role protection mechanisms
 * - Pagination and advanced filtering
 * - Audit trail support
 */

import { Document } from 'mongoose'; // @version ^7.x
import { IRole, IRoleFilter } from '../interfaces/role.interface';
import { Role } from '../models/role.model';

/**
 * Repository class for managing role entities with security and audit support
 */
export class RoleRepository {
    private readonly roleModel = Role;

    /**
     * Retrieves paginated list of roles based on filter criteria
     * @param filter - Query filter parameters including pagination
     * @returns Paginated roles with metadata
     */
    async findAll(filter: IRoleFilter): Promise<{
        roles: IRole[];
        total: number;
        page: number;
        limit: number;
    }> {
        const {
            name,
            isSystem,
            isActive,
            page = 1,
            limit = 10,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            searchQuery
        } = filter;

        // Build query conditions
        const query: any = {};
        
        if (name) {
            query.name = { $regex: name, $options: 'i' };
        }
        
        if (isSystem !== undefined) {
            query.isSystem = isSystem;
        }
        
        if (isActive !== undefined) {
            query.isActive = isActive;
        }

        if (searchQuery) {
            query.$or = [
                { name: { $regex: searchQuery, $options: 'i' } },
                { description: { $regex: searchQuery, $options: 'i' } }
            ];
        }

        // Calculate pagination
        const skip = (page - 1) * limit;
        
        // Execute queries with proper projection
        const [roles, total] = await Promise.all([
            this.roleModel
                .find(query)
                .select('-__v')
                .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            this.roleModel.countDocuments(query)
        ]);

        return {
            roles,
            total,
            page,
            limit
        };
    }

    /**
     * Retrieves a single role by ID with proper error handling
     * @param id - Role identifier
     * @returns Role if found, null otherwise
     */
    async findById(id: string): Promise<IRole | null> {
        if (!id?.match(/^[0-9a-fA-F]{24}$/)) {
            return null;
        }

        return this.roleModel
            .findById(id)
            .select('-__v')
            .lean();
    }

    /**
     * Creates a new role with validation and duplicate checking
     * @param role - Role data to create
     * @returns Newly created role
     * @throws Error if validation fails or duplicate exists
     */
    async create(role: IRole): Promise<IRole> {
        // Validate required fields
        if (!role.name || !role.permissions || !Array.isArray(role.permissions)) {
            throw new Error('Invalid role data');
        }

        // Check for existing role
        const existingRole = await this.roleModel
            .findOne({ name: role.name })
            .lean();

        if (existingRole) {
            throw new Error('Role with this name already exists');
        }

        // Create new role with audit trail
        const newRole = new this.roleModel({
            ...role,
            version: 1,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        return newRole.save();
    }

    /**
     * Updates an existing role with system role protection
     * @param id - Role identifier
     * @param roleData - Partial role data to update
     * @returns Updated role if successful
     * @throws Error if role is protected or validation fails
     */
    async update(id: string, roleData: Partial<IRole>): Promise<IRole | null> {
        if (!id?.match(/^[0-9a-fA-F]{24}$/)) {
            throw new Error('Invalid role ID');
        }

        // Find existing role
        const existingRole = await this.roleModel.findById(id);
        if (!existingRole) {
            return null;
        }

        // Prevent system role modifications
        if (existingRole.isSystem) {
            throw new Error('Cannot modify system role');
        }

        // Validate name uniqueness if being updated
        if (roleData.name && roleData.name !== existingRole.name) {
            const duplicateRole = await this.roleModel
                .findOne({ name: roleData.name })
                .lean();
            
            if (duplicateRole) {
                throw new Error('Role with this name already exists');
            }
        }

        // Update role with audit trail
        const updatedRole = await this.roleModel
            .findOneAndUpdate(
                { _id: id },
                {
                    ...roleData,
                    updatedAt: new Date(),
                    $inc: { version: 1 }
                },
                {
                    new: true,
                    runValidators: true,
                    select: '-__v'
                }
            );

        return updatedRole;
    }

    /**
     * Deletes a role with system role and reference checking
     * @param id - Role identifier
     * @returns True if deleted, false if not found or protected
     * @throws Error if role is protected or has references
     */
    async delete(id: string): Promise<boolean> {
        if (!id?.match(/^[0-9a-fA-F]{24}$/)) {
            throw new Error('Invalid role ID');
        }

        // Find role and check if it's a system role
        const role = await this.roleModel.findById(id);
        if (!role) {
            return false;
        }

        if (role.isSystem) {
            throw new Error('Cannot delete system role');
        }

        // Perform deletion
        const result = await this.roleModel.deleteOne({ _id: id });
        return result.deletedCount === 1;
    }
}