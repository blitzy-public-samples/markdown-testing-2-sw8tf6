/**
 * @fileoverview Error constants and configurations for the web application
 * Contains standardized error messages, display durations, and severity levels
 * for consistent error handling across the frontend
 * @version 1.0.0
 */

/**
 * Standardized error messages categorized by error type
 */
export const ERROR_MESSAGES = {
  AUTH: {
    INVALID_CREDENTIALS: 'Invalid email or password',
    TOKEN_EXPIRED: 'Your session has expired. Please login again',
    TOKEN_INVALID: 'Invalid authentication token',
    TOKEN_MISSING: 'Authentication token is missing',
    INSUFFICIENT_PERMISSIONS: "You don't have permission to perform this action",
    MFA_REQUIRED: 'Multi-factor authentication is required',
    MFA_INVALID: 'Invalid MFA code',
    SESSION_EXPIRED: 'Your session has expired',
    ACCOUNT_LOCKED: 'Account has been locked. Please contact support',
    ACCOUNT_DISABLED: 'Account has been disabled'
  },

  VALIDATION: {
    REQUIRED_FIELD: 'This field is required',
    INVALID_FORMAT: 'Invalid format',
    INVALID_LENGTH: 'Invalid length',
    INVALID_RANGE: 'Value is out of range',
    INVALID_TYPE: 'Invalid type',
    DUPLICATE_ENTRY: 'This entry already exists',
    INVALID_REFERENCE: 'Invalid reference',
    INVALID_STATUS: 'Invalid status',
    INVALID_DATE: 'Invalid date',
    INVALID_FILE: 'Invalid file'
  },

  BUSINESS: {
    RESOURCE_NOT_FOUND: 'The requested resource was not found',
    RESOURCE_EXISTS: 'Resource already exists',
    RESOURCE_LOCKED: 'Resource is locked',
    OPERATION_INVALID: 'Invalid operation',
    LIMIT_EXCEEDED: 'Limit exceeded',
    STATUS_INVALID: 'Invalid status',
    DEPENDENCY_FAILED: 'Dependency operation failed',
    WORKFLOW_INVALID: 'Invalid workflow state',
    DATA_INTEGRITY: 'Data integrity error',
    BUSINESS_RULE_VIOLATION: 'Business rule violation'
  },

  SYSTEM: {
    INTERNAL_ERROR: 'An internal error occurred',
    DATABASE_ERROR: 'Database operation failed',
    NETWORK_ERROR: 'Network connection error',
    SERVICE_UNAVAILABLE: 'Service is temporarily unavailable',
    EXTERNAL_SERVICE_ERROR: 'External service error',
    CACHE_ERROR: 'Cache operation failed',
    FILE_SYSTEM_ERROR: 'File system error',
    CONFIGURATION_ERROR: 'Configuration error',
    RATE_LIMIT_EXCEEDED: 'Too many requests',
    CIRCUIT_BREAKER_OPEN: 'Service is temporarily unavailable'
  }
} as const;

/**
 * Default duration (in milliseconds) to display error messages in the UI
 */
export const ERROR_DISPLAY_DURATION = 5000 as const;

/**
 * Error severity levels for different types of errors
 * Used to determine the visual treatment of error messages
 */
export const ERROR_SEVERITY_LEVELS = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
} as const;

// Type definitions for better TypeScript support
export type ErrorMessageType = typeof ERROR_MESSAGES;
export type ErrorCategory = keyof typeof ERROR_MESSAGES;
export type ErrorCode<T extends ErrorCategory> = keyof typeof ERROR_MESSAGES[T];
export type SeverityLevel = keyof typeof ERROR_SEVERITY_LEVELS;
export type SeverityValue = typeof ERROR_SEVERITY_LEVELS[SeverityLevel];

/**
 * Ensures error messages and severity levels are readonly at compile time
 */
Object.freeze(ERROR_MESSAGES);
Object.freeze(ERROR_SEVERITY_LEVELS);