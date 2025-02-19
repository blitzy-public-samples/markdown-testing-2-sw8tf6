/**
 * @fileoverview Standardized error code constants used across all microservices
 * Provides consistent error handling and categorization for the Task Management System
 * @version 1.0.0
 */

/**
 * Authentication and Authorization Error Codes
 * Used for security-related failures including login, token, and permission issues
 */
export const enum AUTH_ERRORS {
  /** Invalid username/password combination */
  INVALID_CREDENTIALS = 'AUTH_001',
  /** JWT token has expired */
  TOKEN_EXPIRED = 'AUTH_002',
  /** JWT token signature is invalid or malformed */
  TOKEN_INVALID = 'AUTH_003',
  /** Required authentication token not provided */
  TOKEN_MISSING = 'AUTH_004',
  /** User lacks required permissions for the operation */
  INSUFFICIENT_PERMISSIONS = 'AUTH_005',
  /** Multi-factor authentication is required */
  MFA_REQUIRED = 'AUTH_006',
  /** Invalid MFA code provided */
  MFA_INVALID = 'AUTH_007',
  /** User session has expired */
  SESSION_EXPIRED = 'AUTH_008',
  /** Account locked due to multiple failed attempts */
  ACCOUNT_LOCKED = 'AUTH_009',
  /** Account has been administratively disabled */
  ACCOUNT_DISABLED = 'AUTH_010'
}

/**
 * Data Validation Error Codes
 * Used for input validation failures and data format issues
 */
export const enum VALIDATION_ERRORS {
  /** Required field is missing or empty */
  REQUIRED_FIELD = 'VAL_001',
  /** Field value does not match required format */
  INVALID_FORMAT = 'VAL_002',
  /** Field length is outside allowed range */
  INVALID_LENGTH = 'VAL_003',
  /** Numeric value is outside allowed range */
  INVALID_RANGE = 'VAL_004',
  /** Field value is of incorrect data type */
  INVALID_TYPE = 'VAL_005',
  /** Unique constraint violation */
  DUPLICATE_ENTRY = 'VAL_006',
  /** Referenced entity does not exist */
  INVALID_REFERENCE = 'VAL_007',
  /** Invalid status transition or value */
  INVALID_STATUS = 'VAL_008',
  /** Date value is invalid or out of range */
  INVALID_DATE = 'VAL_009',
  /** File upload validation failed */
  INVALID_FILE = 'VAL_010'
}

/**
 * Business Logic Error Codes
 * Used for business rule violations and operational constraints
 */
export const enum BUSINESS_ERRORS {
  /** Requested resource not found */
  RESOURCE_NOT_FOUND = 'BUS_001',
  /** Resource already exists */
  RESOURCE_EXISTS = 'BUS_002',
  /** Resource is locked or in use */
  RESOURCE_LOCKED = 'BUS_003',
  /** Operation not allowed in current state */
  OPERATION_INVALID = 'BUS_004',
  /** Operation would exceed allowed limits */
  LIMIT_EXCEEDED = 'BUS_005',
  /** Invalid status transition */
  STATUS_INVALID = 'BUS_006',
  /** Dependent service or operation failed */
  DEPENDENCY_FAILED = 'BUS_007',
  /** Workflow rule violation */
  WORKFLOW_INVALID = 'BUS_008',
  /** Data integrity constraint violation */
  DATA_INTEGRITY = 'BUS_009',
  /** Generic business rule violation */
  BUSINESS_RULE_VIOLATION = 'BUS_010'
}

/**
 * System-Level Error Codes
 * Used for infrastructure and technical failures
 */
export const enum SYSTEM_ERRORS {
  /** Unhandled system error */
  INTERNAL_ERROR = 'SYS_001',
  /** Database operation failed */
  DATABASE_ERROR = 'SYS_002',
  /** Network communication failed */
  NETWORK_ERROR = 'SYS_003',
  /** Service is temporarily unavailable */
  SERVICE_UNAVAILABLE = 'SYS_004',
  /** External service integration failed */
  EXTERNAL_SERVICE_ERROR = 'SYS_005',
  /** Cache operation failed */
  CACHE_ERROR = 'SYS_006',
  /** File system operation failed */
  FILE_SYSTEM_ERROR = 'SYS_007',
  /** System configuration error */
  CONFIGURATION_ERROR = 'SYS_008',
  /** Rate limit threshold exceeded */
  RATE_LIMIT_EXCEEDED = 'SYS_009',
  /** Circuit breaker is in open state */
  CIRCUIT_BREAKER_OPEN = 'SYS_010'
}