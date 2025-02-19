/**
 * @fileoverview Method decorator for automatic request data validation
 * Implements comprehensive validation with error handling and performance tracking
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import { BaseValidator } from '../validators/base.validator';
import { IValidationError } from '../interfaces/error.interface';
import { CLIENT_ERROR_CODES } from '../constants/status-codes';
import { VALIDATION_ERRORS } from '../constants/error-codes';

/**
 * Validation decorator options
 */
interface ValidateOptions {
  /** Enable caching of validation results */
  enableCache?: boolean;
  /** Custom error status code */
  errorStatus?: CLIENT_ERROR_CODES;
  /** Performance threshold in milliseconds */
  performanceThreshold?: number;
  /** Additional validation context */
  context?: Record<string, any>;
}

/**
 * Default validation options
 */
const DEFAULT_OPTIONS: ValidateOptions = {
  enableCache: true,
  errorStatus: CLIENT_ERROR_CODES.BAD_REQUEST,
  performanceThreshold: 100,
  context: {},
};

/**
 * Cache for validation results
 */
const validationCache = new Map<string, {
  result: IValidationError[];
  timestamp: number;
  ttl: number;
}>();

/**
 * Generates a unique correlation ID for request tracking
 */
function generateCorrelationId(): string {
  return `val_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Method decorator factory for request data validation
 * @param validator BaseValidator instance for validation
 * @param options Validation options
 */
export function validate(
  validator: BaseValidator,
  options: ValidateOptions = {}
): MethodDecorator {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (
      req: Request,
      res: Response,
      next: NextFunction,
      ...args: any[]
    ) {
      const correlationId = generateCorrelationId();
      const startTime = process.hrtime();

      try {
        // Extract request data
        const data = req.body;
        const cacheKey = JSON.stringify({ data, validator });

        // Check cache if enabled
        if (mergedOptions.enableCache) {
          const cached = validationCache.get(cacheKey);
          if (cached && Date.now() - cached.timestamp < cached.ttl) {
            if (cached.result.length > 0) {
              return res.status(mergedOptions.errorStatus).json({
                status: mergedOptions.errorStatus,
                code: VALIDATION_ERRORS.VALIDATION_FAILED,
                message: 'Validation failed',
                errors: cached.result,
                correlationId,
                cached: true,
              });
            }
            // Proceed with cached validation success
            return originalMethod.apply(this, [req, res, next, ...args]);
          }
        }

        // Perform validation
        const validationErrors = await validator.validate(data, {
          ...mergedOptions.context,
          correlationId,
        });

        // Calculate performance metrics
        const [seconds, nanoseconds] = process.hrtime(startTime);
        const duration = seconds * 1000 + nanoseconds / 1000000;

        // Cache validation result if enabled
        if (mergedOptions.enableCache) {
          validationCache.set(cacheKey, {
            result: validationErrors,
            timestamp: Date.now(),
            ttl: 60000, // 1 minute TTL
          });
        }

        // Check performance threshold
        if (duration > mergedOptions.performanceThreshold) {
          console.warn(
            `Validation performance threshold exceeded: ${duration}ms`,
            { correlationId, method: propertyKey.toString() }
          );
        }

        // Return validation errors if any
        if (validationErrors.length > 0) {
          return res.status(mergedOptions.errorStatus).json({
            status: mergedOptions.errorStatus,
            code: VALIDATION_ERRORS.VALIDATION_FAILED,
            message: 'Validation failed',
            errors: validationErrors,
            correlationId,
            performance: {
              duration,
              threshold: mergedOptions.performanceThreshold,
            },
          });
        }

        // Proceed with original method if validation passes
        return originalMethod.apply(this, [req, res, next, ...args]);
      } catch (error) {
        // Handle validation exceptions
        const [seconds, nanoseconds] = process.hrtime(startTime);
        const duration = seconds * 1000 + nanoseconds / 1000000;

        return res.status(CLIENT_ERROR_CODES.UNPROCESSABLE_ENTITY).json({
          status: CLIENT_ERROR_CODES.UNPROCESSABLE_ENTITY,
          code: VALIDATION_ERRORS.VALIDATION_ERROR,
          message: 'Validation processing error',
          error: error.message,
          correlationId,
          performance: {
            duration,
            threshold: mergedOptions.performanceThreshold,
          },
        });
      }
    };

    return descriptor;
  };
}