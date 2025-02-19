/**
 * API Gateway Server Implementation
 * Provides centralized request routing with comprehensive security, monitoring,
 * and performance features for the Task Management System.
 * @version 1.0.0
 */

import express, { Express } from 'express'; // ^4.18.2
import helmet from 'helmet'; // ^7.0.0
import compression from 'compression'; // ^1.7.4
import cors from 'cors'; // ^2.8.5
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0
import Redis from 'ioredis'; // ^5.3.2

import { corsConfig } from './config/cors.config';
import { createRateLimitConfig } from './config/rate-limit.config';
import configureRoutes from './config/routes.config';
import logger from '../../common/utils/logger.util';
import errorMiddleware from './middleware/error.middleware';

// Environment variables
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

/**
 * Initializes Express server with comprehensive middleware chain
 * @returns Configured Express application
 */
function initializeServer(): Express {
  const app = express();
  const redisClient = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy: (times: number) => Math.min(times * 50, 2000)
  });

  // Add correlation ID middleware
  app.use((req, res, next) => {
    req.headers['x-correlation-id'] = req.headers['x-correlation-id'] || uuidv4();
    req.headers['x-request-id'] = uuidv4();
    req.startTime = Date.now();
    next();
  });

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: "same-site" },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: { policy: 'same-origin' },
    xssFilter: true
  }));

  // CORS configuration
  app.use(cors(corsConfig[NODE_ENV as keyof typeof corsConfig]));

  // Compression middleware
  app.use(compression({
    level: 6,
    threshold: 10 * 1024, // 10KB
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    }
  }));

  // Rate limiting
  const publicApiLimiter = createRateLimitConfig(
    NODE_ENV as any,
    'publicApi',
    redisClient
  );
  app.use(publicApiLimiter);

  // Body parsing middleware with limits
  app.use(express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
      req.rawBody = buf;
    }
  }));
  app.use(express.urlencoded({ 
    extended: true,
    limit: '10mb'
  }));

  // Request timeout middleware
  app.use((req, res, next) => {
    res.setTimeout(30000, () => {
      res.status(408).json({
        status: 408,
        message: 'Request Timeout',
        code: 'TIMEOUT_ERROR',
        correlationId: req.headers['x-correlation-id']
      });
    });
    next();
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version,
      environment: NODE_ENV
    });
  });

  // Configure API routes
  configureRoutes(app);

  // Error handling middleware
  app.use(errorMiddleware);

  return app;
}

/**
 * Starts the server with graceful shutdown handling
 * @param app Express application instance
 */
async function startServer(app: Express): Promise<void> {
  const server = app.listen(PORT, () => {
    logger.info(`API Gateway started`, {
      port: PORT,
      environment: NODE_ENV,
      timestamp: new Date().toISOString()
    });
  });

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received - initiating graceful shutdown`);

    server.close(async (err) => {
      if (err) {
        logger.error('Error during server shutdown', err as Error, {
          signal
        });
        process.exit(1);
      }

      try {
        // Close any database connections or other resources
        await logger.close();
        process.exit(0);
      } catch (error) {
        logger.error('Error closing resources', error as Error, {
          signal
        });
        process.exit(1);
      }
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout', new Error('Shutdown timeout'), {
        signal
      });
      process.exit(1);
    }, 30000);
  };

  // Register shutdown handlers
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Unhandled rejection handler
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', reason as Error, {
      promise
    });
  });

  // Uncaught exception handler
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', error, {
      fatal: true
    });
    process.exit(1);
  });
}

// Initialize and start server
const app = initializeServer();
startServer(app);

// Export app instance for testing
export { app };