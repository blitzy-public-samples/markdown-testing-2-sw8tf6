/**
 * @fileoverview Express middleware for centralized error handling in the API Gateway
 * Processes different types of errors and returns standardized error responses
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // v4.x
import {
  IErrorResponse,
  IErrorDetail,
  IValidationError,
  IApplicationError
} from '../../common/interfaces/error.interface';
import {
  AUTH_ERRORS,
  VALIDATION_ERRORS,
  BUSINESS_ERRORS,
  SYSTEM_ERRORS
} from '../../common/constants/error-codes';
import {
  CLIENT_ERROR_CODES,
  SERVER_ERROR_CODES
} from '../../common/constants/status-codes';
import { Logger } from '../../common/utils/logger.util';

/**
 * Maps error types to appropriate HTTP status codes
 */
const ERROR_STATUS_MAP = new Map<string, number>([
  [AUTH_ERRORS.INVALID_CREDENTIALS, CLIENT_ERROR_CODES.UNAUTHORIZED],
  [AUTH_ERRORS.TOKEN_EXPIRED, CLIENT_ERROR_CODES.UNAUTHORIZED],
  [AUTH_ERRORS.INSUFFICIENT_PERMISSIONS, CLIENT_ERROR_CODES.FORBIDDEN],
  [VALIDATION_ERRORS.REQUIRED_FIELD, CLIENT_ERROR_CODES.BAD_REQUEST],
  [VALIDATION_ERRORS.INVALID_FORMAT, CLIENT_ERROR_CODES.BAD_REQUEST],
  [BUSINESS_ERRORS.RESOURCE_NOT_FOUND, CLIENT_ERROR_CODES.NOT_FOUND],
  [BUSINESS_ERRORS.RESOURCE_EXISTS, CLIENT_ERROR_CODES.CONFLICT],
  [SYSTEM_ERRORS.INTERNAL_ERROR, SERVER_ERROR_CODES.INTERNAL_SERVER_ERROR],
  [SYSTEM_ERRORS.SERVICE_UNAVAILABLE, SERVER_ERROR_CODES.SERVICE_UNAVAILABLE]
]);

/**
 * Creates a standardized error response with enhanced context and metrics
 * @param error - Original error object
 * @param req - Express request object
 * @returns Standardized error response
 */
const createErrorResponse = (
  error: Error | IApplicationError,
  req: Request
): IErrorResponse => {
  const startTime = req.startTime || Date.now();
  const processingTime = Date.now() - startTime;
  
  // Default to internal server error if no specific status is set
  const status = (error as IApplicationError).status || 
    ERROR_STATUS_MAP.get((error as IApplicationError).code as string) || 
    SERVER_ERROR_CODES.INTERNAL_SERVER_ERROR;

  // Create error details array
  const details: IErrorDetail[] = (error as IApplicationError).details || [{
    field: 'general',
    message: error.message,
    code: (error as IApplicationError).code || SYSTEM_ERRORS.INTERNAL_ERROR,
    context: {
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }
  }];

  return {
    status,
    message: error.message,
    code: (error as IApplicationError).code || SYSTEM_ERRORS.INTERNAL_ERROR,
    details,
    timestamp: new Date(),
    path: req.path,
    correlationId: req.headers['x-correlation-id'] as string,
    requestId: req.headers['x-request-id'] as string
  };
};

/**
 * Express middleware for handling all application errors
 * Includes performance tracking and enhanced error context
 */
const errorMiddleware = (
  error: Error | IApplicationError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();
  const logger = new Logger({
    enabled: true,
    metricsPort: 9090,
    logLevel: 'error',
    tracing: { enabled: true, samplingRate: 1 },
    alerting: { enabled: true, endpoints: [] }
  }, 'api-gateway', '1.0.0');

  try {
    // Set correlation ID for request tracing
    logger.setCorrelationId(req.headers['x-correlation-id'] as string);

    // Log error with enhanced context
    logger.error('Request error occurred', error, {
      path: req.path,
      method: req.method,
      requestId: req.headers['x-request-id'],
      userId: req.headers['x-user-id'],
      processingTime: Date.now() - (req.startTime || startTime)
    });

    // Create standardized error response
    const errorResponse = createErrorResponse(error, req);

    // Add performance metrics headers
    res.set({
      'X-Error-Time': `${Date.now() - startTime}ms`,
      'X-Total-Time': `${Date.now() - (req.startTime || startTime)}ms`
    });

    // Send error response
    res.status(errorResponse.status).json(errorResponse);
  } catch (e) {
    // Fallback error handling for errors in error handler
    logger.error('Error in error handler', e as Error, {
      originalError: error
    });

    res.status(SERVER_ERROR_CODES.INTERNAL_SERVER_ERROR).json({
      status: SERVER_ERROR_CODES.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred',
      code: SYSTEM_ERRORS.INTERNAL_ERROR,
      details: [{
        field: 'system',
        message: 'Error handler failed',
        code: SYSTEM_ERRORS.INTERNAL_ERROR
      }],
      timestamp: new Date(),
      path: req.path,
      correlationId: req.headers['x-correlation-id'] as string,
      requestId: req.headers['x-request-id'] as string
    });
  }
};

export default errorMiddleware;