// @types/express ^4.17.0 - Type definitions for Express framework
// @types/jsonwebtoken ^9.0.0 - Type definitions for JWT payload

import { JwtPayload } from '@types/jsonwebtoken';

// Global environment type augmentations
declare global {
  namespace NodeJS {
    interface Process {
      env: ProcessEnv;
    }

    interface ProcessEnv {
      NODE_ENV: 'development' | 'staging' | 'production';
      PORT: string;
      DATABASE_URL: string;
      JWT_SECRET: string;
      REDIS_URL: string;
    }
  }

  // Express request augmentation to include authenticated user and request metadata
  namespace Express {
    interface Request {
      user?: JwtPayload;
      correlationId?: string;
      requestTime?: number;
    }
  }
}

// Standard error response interface
export interface IErrorResponse {
  status: number;
  code: string;
  message: string;
  details: Record<string, any>;
  stack: string;
}

// Custom error interface for internal error handling
export interface CustomError {
  code: number;
  message: string;
  details: Record<string, any>;
  isOperational: boolean;
}

// Log levels for consistent logging
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

// Environment type for configuration management
export type Environment = 'development' | 'staging' | 'production';

// Generic service response interface
export interface ServiceResponse<T = any> {
  success: boolean;
  data: T;
  error: CustomError;
  metadata: Record<string, any>;
}

// Generic paginated response interface
export interface PaginatedResponse<T = any> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Ensure this file is treated as a module
export {};