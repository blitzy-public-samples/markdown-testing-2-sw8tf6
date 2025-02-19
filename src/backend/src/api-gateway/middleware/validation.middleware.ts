/**
 * @fileoverview Express middleware for API request validation with performance optimization
 * Implements comprehensive validation rules, error handling, and caching
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import NodeCache from 'node-cache';
import { BaseValidator } from '../../common/validators/base.validator';
import { IValidationError, IErrorResponse } from '../../common/interfaces/error.interface';
import { VALIDATION_ERRORS } from '../../common/constants/error-codes';
import { CLIENT_ERROR_CODES } from '../../common/constants/status-codes';

/**
 * Configuration options for validation middleware
 */
interface ValidationOptions {
  /** Enable caching of validation results */
  enableCache?: boolean;
  /** Cache TTL in seconds */
  cacheTTL?: number;
  /** Maximum request size in bytes */
  maxRequestSize?: number;
  /** Validation timeout in milliseconds */
  timeout?: number;
  /** Strip unknown properties */
  stripUnknown?: boolean;
}

/**
 * Default validation options
 */
const DEFAULT_OPTIONS: ValidationOptions = {
  enableCache: true,
  cacheTTL: 300, // 5 minutes
  maxRequestSize: 10 * 1024 * 1024, // 10MB
  timeout: 5000, // 5 seconds
  stripUnknown: true,
};

/**
 * Validation context for error tracking
 */
interface ValidationContext {
  path: string;
  method: string;
  timestamp: string;
  duration: number;
  requestId: string;
}

// Validation result cache
const validationCache = new NodeCache({
  stdTTL: DEFAULT_OPTIONS.cacheTTL,
  checkperiod: 120,
  useClones: false,
});

/**
 * Creates validation middleware with the provided validator and options
 * @param validator BaseValidator instance for request validation
 * @param options Validation configuration options
 * @returns Express middleware function
 */
export function validateRequest(
  validator: BaseValidator,
  options: ValidationOptions = {}
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string || generateRequestId();

    try {
      // Check request size
      const contentLength = parseInt(req.headers['content-length'] || '0', 10);
      if (contentLength > mergedOptions.maxRequestSize!) {
        throw createSizeError(contentLength, mergedOptions.maxRequestSize!);
      }

      // Generate cache key if caching is enabled
      const cacheKey = mergedOptions.enableCache
        ? generateCacheKey(req, validator)
        : null;

      // Check cache for existing validation result
      if (cacheKey) {
        const cachedResult = validationCache.get<IValidationError[]>(cacheKey);
        if (cachedResult) {
          if (cachedResult.length > 0) {
            throw createValidationError(cachedResult, createContext(req, startTime, requestId));
          }
          next();
          return;
        }
      }

      // Extract data to validate
      const dataToValidate = {
        ...req.body,
        ...req.query,
        ...req.params,
      };

      // Create validation timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Validation timeout exceeded'));
        }, mergedOptions.timeout);
      });

      // Perform validation with timeout
      const validationPromise = validator.validate(dataToValidate);
      const errors = await Promise.race([validationPromise, timeoutPromise]) as IValidationError[];

      // Cache validation result if enabled
      if (cacheKey) {
        validationCache.set(cacheKey, errors);
      }

      if (errors.length > 0) {
        throw createValidationError(errors, createContext(req, startTime, requestId));
      }

      next();
    } catch (error) {
      const errorResponse = error instanceof Error
        ? createSystemError(error, createContext(req, startTime, requestId))
        : error;

      res.status(errorResponse.status).json(errorResponse);
    }
  };
}

/**
 * Creates a validation error response
 * @param errors Array of validation errors
 * @param context Validation context
 * @returns Formatted error response
 */
function createValidationError(
  errors: IValidationError[],
  context: ValidationContext
): IErrorResponse {
  return {
    status: CLIENT_ERROR_CODES.BAD_REQUEST,
    message: 'Validation failed',
    code: VALIDATION_ERRORS.INVALID_FORMAT,
    details: errors.map(error => ({
      field: error.field,
      message: Object.values(error.constraints)[0],
      code: error.context?.errorCode || VALIDATION_ERRORS.INVALID_FORMAT,
      context: error.context,
    })),
    timestamp: new Date(),
    path: context.path,
    correlationId: context.requestId,
    requestId: context.requestId,
  };
}

/**
 * Creates a system error response
 * @param error Error instance
 * @param context Validation context
 * @returns Formatted error response
 */
function createSystemError(
  error: Error,
  context: ValidationContext
): IErrorResponse {
  return {
    status: CLIENT_ERROR_CODES.BAD_REQUEST,
    message: error.message,
    code: VALIDATION_ERRORS.INVALID_FORMAT,
    details: [{
      field: 'system',
      message: error.message,
      code: VALIDATION_ERRORS.INVALID_FORMAT,
      context: { error: error.name },
    }],
    timestamp: new Date(),
    path: context.path,
    correlationId: context.requestId,
    requestId: context.requestId,
  };
}

/**
 * Creates a request size error
 * @param size Actual request size
 * @param limit Maximum allowed size
 * @returns Formatted error response
 */
function createSizeError(size: number, limit: number): IErrorResponse {
  return {
    status: CLIENT_ERROR_CODES.BAD_REQUEST,
    message: 'Request size exceeds limit',
    code: VALIDATION_ERRORS.INVALID_FORMAT,
    details: [{
      field: 'size',
      message: `Request size ${size} exceeds limit of ${limit} bytes`,
      code: VALIDATION_ERRORS.INVALID_FORMAT,
      context: { size, limit },
    }],
    timestamp: new Date(),
    path: '',
    correlationId: '',
    requestId: generateRequestId(),
  };
}

/**
 * Creates validation context from request
 * @param req Express request
 * @param startTime Validation start time
 * @param requestId Request identifier
 * @returns Validation context
 */
function createContext(
  req: Request,
  startTime: number,
  requestId: string
): ValidationContext {
  return {
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    duration: Date.now() - startTime,
    requestId,
  };
}

/**
 * Generates cache key for validation result
 * @param req Express request
 * @param validator BaseValidator instance
 * @returns Cache key string
 */
function generateCacheKey(req: Request, validator: BaseValidator): string {
  const data = {
    body: req.body,
    query: req.query,
    params: req.params,
    path: req.path,
    method: req.method,
    validator: validator.constructor.name,
  };
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

/**
 * Generates unique request identifier
 * @returns Request ID string
 */
function generateRequestId(): string {
  return `val-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}