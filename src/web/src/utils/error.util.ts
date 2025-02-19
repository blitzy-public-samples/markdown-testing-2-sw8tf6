/**
 * @fileoverview Error handling utilities for the web application
 * Provides standardized error handling, transformation, and reporting
 * with TypeScript support and UI component integration
 * @version 1.0.0
 */

import { ERROR_MESSAGES, ERROR_SEVERITY_LEVELS, ERROR_DISPLAY_DURATION } from '../constants/error.constants';
import axios, { AxiosError } from 'axios'; // ^1.6.0

/**
 * Type definitions for error handling
 */
type ErrorSeverityLevel = typeof ERROR_SEVERITY_LEVELS[keyof typeof ERROR_SEVERITY_LEVELS];
type ErrorMetadata = Record<string, any>;

/**
 * Custom error class for application-wide error handling
 * Extends the native Error class with additional properties for better error management
 */
export class AppError extends Error {
  readonly code: string;
  readonly severity: ErrorSeverityLevel;
  readonly metadata: ErrorMetadata;
  readonly timestamp: number;

  constructor(
    code: string,
    message: string,
    severity: ErrorSeverityLevel,
    metadata: ErrorMetadata = {}
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.severity = severity;
    this.metadata = metadata;
    this.timestamp = Date.now();

    // Capture stack trace for debugging
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }

    // Ensure proper instanceof checks work
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Creates a standardized error instance with proper message and severity
 * @param code - Error code in format CATEGORY_SUBCATEGORY
 * @param metadata - Additional error context and data
 * @returns AppError instance
 */
export function createError(code: string, metadata: ErrorMetadata = {}): AppError {
  const [category, subCategory] = code.split('_');
  let message = 'An unknown error occurred';
  let severity: ErrorSeverityLevel = ERROR_SEVERITY_LEVELS.ERROR;

  // Determine message and severity based on category
  if (category && subCategory) {
    const categoryMessages = ERROR_MESSAGES[category as keyof typeof ERROR_MESSAGES];
    if (categoryMessages) {
      message = categoryMessages[subCategory as keyof typeof categoryMessages] || message;
    }

    // Map categories to severity levels
    switch (category) {
      case 'AUTH':
        severity = ERROR_SEVERITY_LEVELS.ERROR;
        break;
      case 'VALIDATION':
        severity = ERROR_SEVERITY_LEVELS.WARNING;
        break;
      case 'BUSINESS':
        severity = ERROR_SEVERITY_LEVELS.ERROR;
        break;
      case 'SYSTEM':
        severity = ERROR_SEVERITY_LEVELS.CRITICAL;
        break;
      default:
        severity = ERROR_SEVERITY_LEVELS.ERROR;
    }
  }

  return new AppError(code, message, severity, metadata);
}

/**
 * Transforms API errors into standardized AppError instances
 * @param error - Original error from API call
 * @returns Standardized AppError instance
 */
export function handleApiError(error: Error): AppError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    const status = axiosError.response?.status;
    const data = axiosError.response?.data as Record<string, any>;

    // Map HTTP status codes to error codes
    let code: string;
    switch (status) {
      case 400:
        code = 'VALIDATION_INVALID_REQUEST';
        break;
      case 401:
        code = 'AUTH_INVALID_CREDENTIALS';
        break;
      case 403:
        code = 'AUTH_INSUFFICIENT_PERMISSIONS';
        break;
      case 404:
        code = 'BUSINESS_RESOURCE_NOT_FOUND';
        break;
      case 429:
        code = 'SYSTEM_RATE_LIMIT_EXCEEDED';
        break;
      case 500:
        code = 'SYSTEM_INTERNAL_ERROR';
        break;
      default:
        code = 'SYSTEM_NETWORK_ERROR';
    }

    return createError(code, {
      originalError: error,
      status,
      data,
      url: axiosError.config?.url,
      method: axiosError.config?.method
    });
  }

  // Handle non-Axios errors
  return createError('SYSTEM_INTERNAL_ERROR', {
    originalError: error
  });
}

/**
 * Handles form and data validation errors
 * @param errors - Object containing field-specific validation errors
 * @returns Validation error instance
 */
export function handleValidationError(errors: Record<string, string>): AppError {
  const errorMessages = Object.entries(errors)
    .map(([field, message]) => `${field}: ${message}`)
    .join('; ');

  return createError('VALIDATION_INVALID_FORMAT', {
    fieldErrors: errors,
    errorCount: Object.keys(errors).length,
    formattedMessage: errorMessages
  });
}

/**
 * Type guard to check if an error is an AppError instance
 * @param error - Error to check
 * @returns Boolean indicating if error is AppError
 */
export function isAppError(error: Error): error is AppError {
  return (
    error instanceof AppError &&
    'code' in error &&
    'severity' in error &&
    'metadata' in error
  );
}

/**
 * Utility type for error handling response
 */
export interface ErrorHandlingResult {
  error: AppError;
  displayDuration: number;
  timestamp: number;
}

/**
 * Prepares error for display in UI components
 * @param error - Original error
 * @returns Formatted error handling result
 */
export function prepareErrorForDisplay(error: Error): ErrorHandlingResult {
  const appError = isAppError(error) ? error : handleApiError(error);
  
  return {
    error: appError,
    displayDuration: ERROR_DISPLAY_DURATION,
    timestamp: Date.now()
  };
}