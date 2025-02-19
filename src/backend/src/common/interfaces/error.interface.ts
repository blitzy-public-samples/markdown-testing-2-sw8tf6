/**
 * @fileoverview Defines standardized error interfaces for consistent error handling across microservices
 * Supports comprehensive error tracking, monitoring, and internationalization requirements
 * @version 1.0.0
 */

import {
  AUTH_ERRORS,
  VALIDATION_ERRORS,
  BUSINESS_ERRORS,
  SYSTEM_ERRORS
} from '../constants/error-codes';

import {
  CLIENT_ERROR_CODES,
  SERVER_ERROR_CODES
} from '../constants/status-codes';

/**
 * Detailed error information with contextual data support
 * Used for providing granular error details and metadata
 */
export interface IErrorDetail {
  /** Field or parameter that caused the error */
  field: string;
  
  /** Human-readable error message */
  message: string;
  
  /** Specific error code for the issue */
  code: string;
  
  /** Additional contextual information about the error */
  context?: Record<string, unknown>;
}

/**
 * Comprehensive API error response structure
 * Used for standardized error responses across all API endpoints
 */
export interface IErrorResponse {
  /** HTTP status code for the error */
  status: CLIENT_ERROR_CODES | SERVER_ERROR_CODES;
  
  /** Human-readable error message */
  message: string;
  
  /** Specific error code from defined categories */
  code: AUTH_ERRORS | VALIDATION_ERRORS | BUSINESS_ERRORS | SYSTEM_ERRORS;
  
  /** Array of detailed error information */
  details: IErrorDetail[];
  
  /** Timestamp when the error occurred */
  timestamp: Date;
  
  /** API endpoint path where error occurred */
  path: string;
  
  /** Correlation ID for request tracing */
  correlationId: string;
  
  /** Unique request identifier */
  requestId: string;
}

/**
 * Validation error structure for detailed constraint violations
 * Used for input validation errors with nested validation support
 */
export interface IValidationError {
  /** Field that failed validation */
  field: string;
  
  /** Map of validation constraints that failed */
  constraints: Record<string, string>;
  
  /** Invalid value that caused validation failure */
  value: unknown;
  
  /** Nested validation errors for complex objects */
  children?: IValidationError[];
}

/**
 * Internal application error structure with enhanced debugging
 * Used for error handling and logging within the application
 */
export interface IApplicationError {
  /** Error message describing what went wrong */
  message: string;
  
  /** Specific error code from defined categories */
  code: AUTH_ERRORS | VALIDATION_ERRORS | BUSINESS_ERRORS | SYSTEM_ERRORS;
  
  /** HTTP status code associated with the error */
  status: CLIENT_ERROR_CODES | SERVER_ERROR_CODES;
  
  /** Array of detailed error information */
  details: IErrorDetail[];
  
  /** Error stack trace for debugging */
  stack?: string;
  
  /** Original error that caused this error */
  cause?: Error;
}