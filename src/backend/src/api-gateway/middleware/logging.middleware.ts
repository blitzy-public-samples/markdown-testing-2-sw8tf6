/**
 * @fileoverview Express middleware for comprehensive request/response logging
 * Provides structured logging with high-precision timing, correlation tracking,
 * and ELK Stack integration for monitoring and debugging purposes
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // v4.x
import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import { Logger } from '../../common/utils/logger.util';
import { SYSTEM_ERRORS } from '../../common/constants/error-codes';

// Symbols for storing request-specific data
const REQUEST_START_TIME = Symbol('requestStartTime');
const CORRELATION_ID = Symbol('correlationId');

// Sensitive headers that should be redacted in logs
const SENSITIVE_HEADERS = ['authorization', 'cookie', 'x-api-key'];

/**
 * Calculates request duration in microseconds using process.hrtime
 * @param startTime - The high-resolution start time
 * @returns Duration in microseconds
 */
const calculateDuration = (startTime: [number, number]): number => {
  const diff = process.hrtime(startTime);
  return (diff[0] * 1e6 + diff[1] / 1e3); // Convert to microseconds
};

/**
 * Sanitizes request/response data by removing sensitive information
 * @param obj - Object to sanitize
 * @returns Sanitized object
 */
const sanitizeData = (obj: Record<string, any>): Record<string, any> => {
  const sanitized = { ...obj };
  
  // Redact sensitive headers
  if (sanitized.headers) {
    SENSITIVE_HEADERS.forEach(header => {
      if (sanitized.headers[header]) {
        sanitized.headers[header] = '[REDACTED]';
      }
    });
  }
  
  return sanitized;
};

/**
 * Express middleware that provides comprehensive request/response logging
 * with high-precision timing and correlation tracking
 */
export const loggingMiddleware = (logger: Logger) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Generate and store correlation ID
      const correlationId = req.headers['x-correlation-id'] as string || uuidv4();
      (req as any)[CORRELATION_ID] = correlationId;
      logger.setCorrelationId(correlationId);

      // Store request start time with microsecond precision
      (req as any)[REQUEST_START_TIME] = process.hrtime();

      // Log incoming request
      logger.info('Incoming request', {
        type: 'request',
        method: req.method,
        path: req.path,
        query: sanitizeData(req.query),
        headers: sanitizeData(req.headers),
        ip: req.ip,
        userAgent: req.get('user-agent'),
        contentLength: req.get('content-length'),
        protocol: req.protocol,
        secure: req.secure
      });

      // Capture original end function
      const originalEnd = res.end;
      
      // Override end function to log response
      res.end = function(chunk?: any, encoding?: string, callback?: () => void): Response {
        // Calculate request duration
        const duration = calculateDuration((req as any)[REQUEST_START_TIME]);
        
        // Get memory usage delta
        const memoryBefore = process.memoryUsage();
        
        // Log response
        logger.info('Outgoing response', {
          type: 'response',
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
          correlationId: (req as any)[CORRELATION_ID],
          contentLength: res.get('content-length'),
          memoryDelta: {
            heapUsed: process.memoryUsage().heapUsed - memoryBefore.heapUsed,
            external: process.memoryUsage().external - memoryBefore.external
          }
        });

        // Call original end function
        return originalEnd.call(this, chunk, encoding as BufferEncoding, callback);
      };

      // Continue middleware chain
      next();
    } catch (error) {
      // Log error with full context
      logger.error('Logging middleware error', error as Error, {
        type: 'middleware_error',
        code: SYSTEM_ERRORS.INTERNAL_ERROR,
        method: req.method,
        path: req.path,
        correlationId: (req as any)[CORRELATION_ID]
      });
      
      // Continue middleware chain even if logging fails
      next();
    }
  };
};