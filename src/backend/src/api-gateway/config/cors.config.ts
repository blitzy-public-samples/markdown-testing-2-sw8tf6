/**
 * CORS Configuration for Task Management System API Gateway
 * Implements environment-specific security policies for cross-origin requests
 * @version 1.0.0
 */

import { CorsOptions } from 'cors'; // v2.8.5
import { IAppConfig } from '../../common/interfaces/config.interface';

/**
 * Type-safe interface for CORS configuration options
 */
interface CorsConfig {
  origin: string[];
  methods: string[];
  allowedHeaders: string[];
  credentials: boolean;
  maxAge: number;
  preflightContinue: boolean;
  optionsSuccessStatus: number;
  exposedHeaders: string[];
}

/**
 * Default CORS configuration for different environments
 * Implements strict security policies while ensuring compatibility
 * with supported browsers and clients
 */
const defaultCorsConfig: Record<IAppConfig['env'], CorsConfig> = {
  development: {
    origin: [
      'http://localhost:3000',  // React development server
      'http://localhost:5173',  // Vite development server
      'http://localhost:8080'   // Alternative development port
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers'
    ],
    exposedHeaders: [
      'Content-Length',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining'
    ],
    credentials: true,
    maxAge: 3600,              // 1 hour cache for preflight requests
    preflightContinue: false,
    optionsSuccessStatus: 204
  },
  staging: {
    origin: [
      'https://staging.taskmanager.com',
      'https://api.staging.taskmanager.com'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin'
    ],
    exposedHeaders: [
      'Content-Length',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining'
    ],
    credentials: true,
    maxAge: 86400,             // 24 hour cache for preflight requests
    preflightContinue: false,
    optionsSuccessStatus: 204
  },
  production: {
    origin: [
      'https://taskmanager.com',
      'https://api.taskmanager.com',
      'https://mobile.taskmanager.com'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin'
    ],
    exposedHeaders: [
      'Content-Length',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining'
    ],
    credentials: true,
    maxAge: 86400,             // 24 hour cache for preflight requests
    preflightContinue: false,
    optionsSuccessStatus: 204
  },
  dr: {
    // DR environment inherits production configuration
    origin: [
      'https://taskmanager.com',
      'https://api.taskmanager.com',
      'https://mobile.taskmanager.com'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin'
    ],
    exposedHeaders: [
      'Content-Length',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining'
    ],
    credentials: true,
    maxAge: 86400,             // 24 hour cache for preflight requests
    preflightContinue: false,
    optionsSuccessStatus: 204
  }
};

/**
 * Environment-specific CORS configuration
 * Exports type-safe CORS options for use in API Gateway
 */
export const corsConfig: Record<IAppConfig['env'], CorsOptions> = defaultCorsConfig;