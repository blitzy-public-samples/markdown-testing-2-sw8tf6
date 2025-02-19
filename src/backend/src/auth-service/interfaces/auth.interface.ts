/**
 * @fileoverview Core authentication interfaces for user management and security
 * @version 1.0.0
 * 
 * Provides comprehensive interfaces for:
 * - User entity with MFA support
 * - Authentication credentials and tokens
 * - User creation and update DTOs
 * - MFA setup and verification
 */

import { IBaseEntity } from '../../common/interfaces/base.interface';
import { IRole } from './role.interface';

/**
 * Core user entity interface with complete authentication and MFA capabilities
 * Extends base entity interface for consistent tracking
 */
export interface IUser extends IBaseEntity {
    /** User's email address (unique identifier) */
    email: string;

    /** Hashed password */
    password: string;

    /** User's display name */
    name: string;

    /** Reference to the user's role */
    roleId: string;

    /** Populated role object with permissions */
    role: IRole;

    /** Flag indicating if the user account is active */
    isActive: boolean;

    /** Flag indicating if MFA is enabled for the user */
    isMFAEnabled: boolean;

    /** TOTP secret for MFA (null if MFA not enabled) */
    mfaSecret: string | null;

    /** Timestamp of user's last successful login */
    lastLoginAt: Date | null;
}

/**
 * Authentication credentials interface with MFA support
 * Used for login and authentication requests
 */
export interface IAuthCredentials {
    /** User's email address */
    email: string;

    /** User's password (plain text for validation) */
    password: string;

    /** Optional MFA verification code */
    mfaCode?: string;
}

/**
 * JWT token response interface with refresh capabilities
 * Provides complete token management for session handling
 */
export interface IAuthTokens {
    /** JWT access token */
    accessToken: string;

    /** JWT refresh token for token renewal */
    refreshToken: string;

    /** Access token expiration time in seconds */
    expiresIn: number;
}

/**
 * Data transfer object for user creation
 * Enforces required fields for new user registration
 */
export interface IUserCreateDTO {
    /** User's email address */
    email: string;

    /** User's initial password */
    password: string;

    /** User's display name */
    name: string;

    /** Initial role assignment */
    roleId: string;
}

/**
 * Data transfer object for user updates
 * Supports partial updates with optional fields
 */
export interface IUserUpdateDTO {
    /** Updated display name */
    name?: string;

    /** New password (if changing) */
    password?: string;

    /** New role assignment */
    roleId?: string;

    /** Updated account status */
    isActive?: boolean;
}

/**
 * Data transfer object for MFA setup and verification
 * Handles the complete MFA configuration process
 */
export interface IMFASetupDTO {
    /** User ID for MFA setup */
    userId: string;

    /** Generated TOTP secret */
    secret: string;

    /** Verification code for validating MFA setup */
    verificationCode: string;
}