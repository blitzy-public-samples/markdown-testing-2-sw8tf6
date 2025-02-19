/**
 * Enumeration of user roles for role-based access control
 * @enum {string}
 */
export enum UserRole {
    ADMIN = 'ADMIN',
    MANAGER = 'MANAGER',
    USER = 'USER',
    GUEST = 'GUEST'
}

/**
 * Core user interface representing the complete user data structure
 * @interface IUser
 */
export interface IUser {
    /** Unique identifier for the user */
    id: string;
    
    /** User's email address used for authentication */
    email: string;
    
    /** User's full name */
    name: string;
    
    /** User's role for access control */
    role: UserRole;
    
    /** Optional URL to user's avatar image */
    avatar?: string;
    
    /** Flag indicating if user's email is verified */
    isEmailVerified: boolean;
    
    /** Flag indicating if Multi-Factor Authentication is enabled */
    isMFAEnabled: boolean;
    
    /** Timestamp of user's last login */
    lastLoginAt?: Date;
    
    /** Timestamp of user record creation */
    createdAt: Date;
    
    /** Timestamp of last user record update */
    updatedAt: Date;
}

/**
 * Interface for user profile update operations
 * Contains only editable user profile fields
 * @interface IUserProfile
 */
export interface IUserProfile {
    /** User's full name */
    name: string;
    
    /** User's email address */
    email: string;
    
    /** Optional URL to user's avatar image */
    avatar?: string;
}

/**
 * Interface for user search and filtering operations
 * Used for paginated user listing with various filter options
 * @interface IUserFilter
 */
export interface IUserFilter {
    /** Optional filter by user name */
    name?: string;
    
    /** Optional filter by email address */
    email?: string;
    
    /** Optional filter by user role */
    role?: UserRole;
    
    /** Optional filter by email verification status */
    isEmailVerified?: boolean;
    
    /** Page number for pagination */
    page: number;
    
    /** Number of items per page */
    limit: number;
    
    /** Field to sort by */
    sortBy: string;
    
    /** Sort direction */
    sortOrder: 'asc' | 'desc';
}