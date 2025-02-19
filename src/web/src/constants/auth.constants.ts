/**
 * Authentication Constants
 * Version: 1.0.0
 * 
 * Defines authentication-related constants for the frontend application including:
 * - User roles for RBAC
 * - Secure storage keys
 * - API endpoints
 * - Error messages
 * - Password validation rules
 * - Security timeouts
 */

/**
 * Available user roles for role-based access control
 */
export enum AUTH_ROLES {
    ADMIN = 'admin',
    MANAGER = 'manager',
    USER = 'user',
    GUEST = 'guest'
}

/**
 * Secure local storage keys for auth-related data
 */
export enum AUTH_STORAGE_KEYS {
    ACCESS_TOKEN = 'access_token',
    REFRESH_TOKEN = 'refresh_token',
    USER = 'auth_user',
    MFA_TEMP_TOKEN = 'mfa_temp_token'
}

/**
 * Authentication API endpoint paths
 */
export enum AUTH_ENDPOINTS {
    LOGIN = '/auth/login',
    REGISTER = '/auth/register',
    LOGOUT = '/auth/logout',
    REFRESH_TOKEN = '/auth/refresh',
    FORGOT_PASSWORD = '/auth/forgot-password',
    RESET_PASSWORD = '/auth/reset-password',
    MFA_SETUP = '/auth/mfa/setup',
    MFA_VERIFY = '/auth/mfa/verify'
}

/**
 * User-friendly authentication error messages
 */
export enum AUTH_ERROR_MESSAGES {
    INVALID_CREDENTIALS = 'Invalid email or password',
    ACCOUNT_LOCKED = 'Account locked due to multiple failed attempts',
    MFA_REQUIRED = 'Multi-factor authentication required',
    SESSION_EXPIRED = 'Session expired, please login again',
    UNAUTHORIZED = 'Unauthorized access',
    MFA_INVALID = 'Invalid MFA code',
    MFA_EXPIRED = 'MFA code expired',
    PASSWORD_RESET_EXPIRED = 'Password reset link expired',
    EMAIL_NOT_VERIFIED = 'Please verify your email address'
}

/**
 * Password validation rules following security best practices
 */
export const PASSWORD_VALIDATION = {
    MIN_LENGTH: 12,
    MAX_LENGTH: 64,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL_CHARS: true,
    SPECIAL_CHARS_PATTERN: '^[!@#$%^&*(),.?":{}|<>]$',
    DISALLOWED_CHARS: '\\s\\\\' // Disallow whitespace and backslash
} as const;

/**
 * Timeout values in seconds for various authentication operations
 */
export const AUTH_TIMEOUTS = {
    SESSION_TIMEOUT: 1800,         // 30 minutes
    TOKEN_REFRESH_THRESHOLD: 300,  // 5 minutes before token expiry
    MFA_CODE_EXPIRY: 300,         // 5 minutes
    PASSWORD_RESET_EXPIRY: 3600,   // 1 hour
    LOGIN_ATTEMPT_TIMEOUT: 900     // 15 minutes lockout after failed attempts
} as const;