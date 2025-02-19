// @types/express ^4.17.0 - Core Express framework type definitions
// @types/jsonwebtoken ^9.0.0 - JWT token payload type definitions

import { Express } from '@types/express';
import { JwtPayload } from '@types/jsonwebtoken';
import { CustomError } from './global';

declare global {
  namespace Express {
    /**
     * Extended Express Request interface with authentication and request context
     */
    interface Request {
      /**
       * Authenticated user information from JWT token
       */
      user?: JwtPayload & {
        id: string;
        role: string;
        permissions: string[];
      };

      /**
       * Unique identifier for request tracing
       */
      correlationId: string;

      /**
       * Request start timestamp for performance monitoring
       */
      startTime: number;

      /**
       * Data that has passed validation middleware
       */
      validatedData: unknown;

      /**
       * Request-scoped context for passing data between middleware
       */
      context: Record<string, unknown>;
    }

    /**
     * Extended Express Response interface with standardized response helpers
     */
    interface Response {
      /**
       * Send a success response with optional status code
       * @param data Response payload
       * @param status HTTP status code (default: 200)
       */
      success<T>(data: T, status?: number): Response;

      /**
       * Send an error response with optional status code
       * @param error Error object
       * @param status HTTP status code (default: error.code or 500)
       */
      error(error: CustomError | Error, status?: number): Response;

      /**
       * Send a paginated response with metadata
       * @param data Array of items for current page
       * @param total Total number of items
       * @param page Current page number
       * @param limit Items per page
       * @param filters Optional filter criteria used
       */
      paginated<T>(
        data: T[],
        total: number,
        page: number,
        limit: number,
        filters?: Record<string, unknown>
      ): Response;
    }
  }
}

// Ensure this file is treated as a module
export {};