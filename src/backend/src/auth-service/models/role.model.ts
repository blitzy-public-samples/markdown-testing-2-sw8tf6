/**
 * @fileoverview Role-based access control (RBAC) model implementation
 * @version 1.0.0
 * 
 * Implements MongoDB schema and model for role management with:
 * - Comprehensive validation rules for permissions
 * - Version tracking and audit support
 * - System and custom role handling
 */

import { Schema, model, Document } from 'mongoose'; // @version ^7.x
import { IRole } from '../interfaces/role.interface';
import { IBaseEntity } from '../../common/interfaces/base.interface';

// Valid permission actions
const VALID_ACTIONS = ['create', 'read', 'update', 'delete', 'manage'] as const;

// Valid permission scopes
const VALID_SCOPES = ['global', 'project', 'team', 'own'] as const;

// Valid resource types
const VALID_RESOURCES = [
  'task',
  'project',
  'user',
  'role',
  'team',
  'comment',
  'attachment'
] as const;

/**
 * MongoDB schema definition for role entities
 * Includes comprehensive validation and versioning support
 */
const RoleSchema = new Schema<IRole & Document>(
  {
    name: {
      type: String,
      required: [true, 'Role name is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Role name must be at least 3 characters'],
      maxlength: [50, 'Role name cannot exceed 50 characters']
    },
    description: {
      type: String,
      required: [true, 'Role description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters'],
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    permissions: {
      type: [String],
      required: [true, 'Permissions are required'],
      validate: {
        validator: validatePermissions,
        message: 'Invalid permission format or content'
      }
    },
    isSystem: {
      type: Boolean,
      required: true,
      default: false,
      immutable: true // System role status cannot be changed after creation
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true
    },
    version: {
      type: Number,
      required: true,
      default: 1,
      min: 1
    }
  },
  {
    timestamps: true, // Automatically manage createdAt and updatedAt
    versionKey: false, // Use our custom version field instead
    collection: 'roles' // Explicit collection name
  }
);

/**
 * Validates the format and content of role permissions
 * Ensures permissions follow the action:resource:scope format
 * @param permissions - Array of permission strings to validate
 * @returns boolean indicating if permissions are valid
 */
function validatePermissions(permissions: string[]): boolean {
  if (!Array.isArray(permissions) || permissions.length === 0) {
    return false;
  }

  const uniquePermissions = new Set(permissions);
  if (uniquePermissions.size !== permissions.length) {
    return false; // Duplicate permissions not allowed
  }

  return permissions.every(permission => {
    const parts = permission.split(':');
    if (parts.length !== 3) {
      return false;
    }

    const [action, resource, scope] = parts;

    return (
      VALID_ACTIONS.includes(action as typeof VALID_ACTIONS[number]) &&
      VALID_RESOURCES.includes(resource as typeof VALID_RESOURCES[number]) &&
      VALID_SCOPES.includes(scope as typeof VALID_SCOPES[number])
    );
  });
}

// Index definitions for optimized queries
RoleSchema.index({ name: 1 }, { unique: true });
RoleSchema.index({ isSystem: 1, isActive: 1 });
RoleSchema.index({ createdAt: 1 });
RoleSchema.index({ updatedAt: 1 });

/**
 * Pre-save middleware to handle version increments
 * Automatically increments version number on document updates
 */
RoleSchema.pre('save', function(next) {
  if (!this.isNew) {
    this.version += 1;
  }
  next();
});

/**
 * Pre-update middleware to prevent system role modifications
 * Ensures system roles can only be modified by privileged operations
 */
RoleSchema.pre(['updateOne', 'findOneAndUpdate'], function(next) {
  const update = this.getUpdate() as any;
  if (update.isSystem !== undefined) {
    return next(new Error('Cannot modify system role status'));
  }
  next();
});

/**
 * Custom method to safely update role permissions
 * Includes validation and system role protection
 */
RoleSchema.methods.updatePermissions = async function(newPermissions: string[]) {
  if (this.isSystem) {
    throw new Error('Cannot modify system role permissions');
  }
  
  if (!validatePermissions(newPermissions)) {
    throw new Error('Invalid permission format');
  }

  this.permissions = newPermissions;
  this.version += 1;
  return this.save();
};

// Create and export the Mongoose model
export const Role = model<IRole & Document>('Role', RoleSchema);