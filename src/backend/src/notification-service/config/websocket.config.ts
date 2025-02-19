/**
 * WebSocket Server Configuration
 * Provides environment-specific settings for real-time notification delivery
 * with enhanced security, performance, and monitoring capabilities.
 * @version 1.0.0
 */

import { config } from 'dotenv'; // ^16.3.1
import { IAppConfig } from '../../common/interfaces/config.interface';

// Load environment variables
config();

// Global Constants
const DEFAULT_WS_PORT = 3002;
const DEFAULT_WS_PATH = '/ws';
const DEFAULT_PING_INTERVAL = 25000;
const DEFAULT_PING_TIMEOUT = 5000;
const DEFAULT_MAX_CONNECTIONS = 10000;

const DEVELOPMENT_CORS_ORIGINS = ['http://localhost:3000', 'http://localhost:3001'];
const STAGING_CORS_ORIGINS = ['https://staging.taskmanager.com'];
const PRODUCTION_CORS_ORIGINS = ['https://taskmanager.com'];

/**
 * WebSocket server configuration interface
 * Defines comprehensive settings for secure and scalable real-time communication
 */
export interface IWebSocketConfig {
  /** WebSocket server port */
  port: number;
  /** WebSocket endpoint path */
  path: string;
  /** CORS configuration */
  cors: {
    origin: string[];
    methods: string[];
    credentials: boolean;
    allowedHeaders: string[];
    maxAge: number;
  };
  /** Connection health check interval (ms) */
  pingInterval: number;
  /** Connection timeout threshold (ms) */
  pingTimeout: number;
  /** Maximum concurrent connections */
  maxConnections: number;
  /** SSL configuration for secure WebSocket */
  ssl: {
    enabled: boolean;
    key?: string;
    cert?: string;
  };
  /** Rate limiting configuration */
  rateLimit: {
    windowMs: number;
    max: number;
  };
}

/**
 * Loads environment-specific WebSocket configuration
 * with security and performance optimizations
 */
const loadWebSocketConfig = (): IWebSocketConfig => {
  const env = (process.env.NODE_ENV || 'development') as IAppConfig['env'];
  
  // Determine environment-specific settings
  const corsOrigins = {
    development: DEVELOPMENT_CORS_ORIGINS,
    staging: STAGING_CORS_ORIGINS,
    production: PRODUCTION_CORS_ORIGINS
  }[env] || DEVELOPMENT_CORS_ORIGINS;

  // Parse numeric configurations with fallbacks
  const port = parseInt(process.env.WS_PORT || DEFAULT_WS_PORT.toString(), 10);
  const pingInterval = parseInt(process.env.WS_PING_INTERVAL || DEFAULT_PING_INTERVAL.toString(), 10);
  const pingTimeout = parseInt(process.env.WS_PING_TIMEOUT || DEFAULT_PING_TIMEOUT.toString(), 10);
  const maxConnections = parseInt(process.env.WS_MAX_CONNECTIONS || DEFAULT_MAX_CONNECTIONS.toString(), 10);

  // Environment-specific rate limiting
  const rateLimitConfig = {
    development: { windowMs: 60000, max: 100 },
    staging: { windowMs: 60000, max: 500 },
    production: { windowMs: 60000, max: 1000 }
  }[env] || { windowMs: 60000, max: 100 };

  return {
    port,
    path: process.env.WS_PATH || DEFAULT_WS_PATH,
    cors: {
      origin: corsOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
      allowedHeaders: [
        'Authorization',
        'Content-Type',
        'X-Requested-With',
        'X-Socket-ID'
      ],
      maxAge: 86400 // 24 hours
    },
    pingInterval,
    pingTimeout,
    maxConnections,
    ssl: {
      enabled: env === 'production',
      key: process.env.SSL_KEY_PATH,
      cert: process.env.SSL_CERT_PATH
    },
    rateLimit: rateLimitConfig
  };
};

// Export the configured WebSocket settings
const websocketConfig = loadWebSocketConfig();
export default websocketConfig;