/**
 * @fileoverview Express middleware for managing correlation IDs across microservices
 * Implements request tracing through correlation ID generation, validation, and propagation
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // v4.x
import { v4 as uuidv4, validate as uuidValidate } from 'uuid'; // v9.x
import { Logger } from '../utils/logger.util';
import { SYSTEM_ERRORS } from '../constants/error-codes';

// Header name for correlation ID
const CORRELATION_ID_HEADER = 'X-Correlation-ID';

/**
 * Express middleware that ensures each request has a valid correlation ID
 * for distributed tracing across microservices
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const correlationIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Extract existing correlation ID from request headers
    let correlationId = req.headers[CORRELATION_ID_HEADER.toLowerCase()] as string;

    // Validate existing correlation ID if present
    if (correlationId) {
      if (!uuidValidate(correlationId)) {
        const error = new Error('Invalid correlation ID format');
        (error as any).code = SYSTEM_ERRORS.INTERNAL_ERROR;
        throw error;
      }
    } else {
      // Generate new correlation ID if none exists
      correlationId = uuidv4();
    }

    // Set correlation ID in request headers for downstream services
    req.headers[CORRELATION_ID_HEADER.toLowerCase()] = correlationId;

    // Set correlation ID in response headers for client tracking
    res.setHeader(CORRELATION_ID_HEADER, correlationId);

    // Set correlation ID in logger for consistent tracing
    const logger = req.app.locals.logger as Logger;
    if (logger) {
      logger.setCorrelationId(correlationId);
    }

    // Add correlation ID to request object for easy access
    (req as any).correlationId = correlationId;

    // Continue to next middleware
    next();
  } catch (error) {
    // Log error with system error code
    const logger = req.app.locals.logger as Logger;
    if (logger) {
      logger.error(
        'Failed to process correlation ID',
        error as Error,
        {
          path: req.path,
          method: req.method,
          headers: req.headers
        }
      );
    }

    // Continue chain even if correlation ID processing fails
    next(error);
  }
};