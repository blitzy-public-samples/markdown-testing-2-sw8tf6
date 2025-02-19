import { IUser } from './user.interface';

/**
 * Interface for user login credentials with MFA support
 * @interface LoginCredentials
 */
export interface LoginCredentials {
    /** User's email address */
    email: string;
    
    /** User's password */
    password: string;
    
    /** Optional MFA token for two-factor authentication */
    mfaToken?: string;
    
    /** Type of MFA method being used */
    mfaType?: 'totp' | 'sms';
}

/**
 * Interface for user registration data with consent tracking
 * @interface RegistrationData
 */
export interface RegistrationData {
    /** User's email address */
    email: string;
    
    /** User's password - must meet complexity requirements */
    password: string;
    
    /** User's full name */
    name: string;
    
    /** User's role in the system */
    role: string;
    
    /** Flag indicating user has given consent for data processing */
    consentGiven: boolean;
}

/**
 * Interface for authentication response data with enhanced token management
 * @interface AuthResponse
 */
export interface AuthResponse {
    /** Authenticated user data */
    user: IUser;
    
    /** JWT access token */
    accessToken: string;
    
    /** JWT refresh token for token renewal */
    refreshToken: string;
    
    /** Token expiration time in seconds */
    expiresIn: number;
    
    /** Token type - always Bearer */
    tokenType: 'Bearer';
    
    /** Token version for invalidation tracking */
    tokenVersion: number;
}

/**
 * Interface for password reset data with confirmation
 * @interface PasswordResetData
 */
export interface PasswordResetData {
    /** Password reset token received via email */
    token: string;
    
    /** New password */
    password: string;
    
    /** Password confirmation to prevent typos */
    confirmPassword: string;
}

/**
 * Interface for MFA setup data with multiple authentication methods
 * @interface MFASetupData
 */
export interface MFASetupData {
    /** Base64 encoded QR code for TOTP setup */
    qrCode: string;
    
    /** TOTP secret key */
    secret: string;
    
    /** List of recovery keys for backup access */
    recoveryKeys: string[];
    
    /** Type of MFA being set up */
    mfaType: 'totp' | 'sms';
    
    /** Backup authentication method */
    backupMethod: 'email' | 'recovery-keys';
}

/**
 * Interface for authentication-related error handling
 * @interface AuthError
 */
export interface AuthError {
    /** Error code for programmatic handling */
    code: string;
    
    /** Human-readable error message */
    message: string;
    
    /** Additional error details */
    details: Record<string, unknown>;
}

/**
 * Type alias for authenticated user data
 * @type AuthUser
 */
export type AuthUser = IUser;