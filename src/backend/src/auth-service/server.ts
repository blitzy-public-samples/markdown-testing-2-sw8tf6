/**
 * Authentication Service Server Configuration
 * Implements secure Express application setup with comprehensive middleware,
 * monitoring, and error handling capabilities.
 * @version 1.0.0
 */

import express, { Application, Request, Response, NextFunction } from 'express'; // ^4.18.2
import helmet from 'helmet'; // ^7.0.0
import compression from 'compression'; // ^1.7.4
import cors from 'cors'; // ^2.8.5
import { container } from 'inversify'; // ^6.0.1
import rateLimit from 'express-rate-limit'; // ^6.7.0
import morgan from 'morgan'; // ^1.10.0
import errorHandler from 'express-error-handler'; // ^1.1.0
import * as promClient from 'prom-client'; // ^14.2.0

import { AuthRoutes } from './routes/auth.routes';
import { roleRouter } from './routes/role.routes';
import { correlationIdMiddleware } from '../common/middleware/correlation-id.middleware';
import { CircuitBreakerMiddleware } from '../common/middleware/circuit-breaker.middleware';
import { Logger } from '../common/utils/logger.util';
import { SYSTEM_ERRORS } from '../common/constants/error-codes';
import { CLIENT_ERROR_CODES, SERVER_ERROR_CODES } from '../common/constants/status-codes';

// Initialize Express application
const app: Application = express();

// Initialize metrics registry
const metricsRegistry = new promClient.Registry();
promClient.collectDefaultMetrics({ register: metricsRegistry });

// Initialize logger
const logger = new Logger(
  {
    enabled: true,
    metricsPort: 9090,
    logLevel: process.env.LOG_LEVEL || 'info',
    tracing: { enabled: true, samplingRate: 1 },
    alerting: { enabled: true, endpoints: [] }
  },
  'auth-service',
  process.env.SERVICE_VERSION || '1.0.0'
);

/**
 * Configures and sets up all middleware for the Express application
 * @param app Express application instance
 */
function initializeMiddleware(app: Application): void {
  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: true,
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: true,
    dnsPrefetchControl: true,
    frameguard: true,
    hidePoweredBy: true,
    hsts: true,
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: true,
    referrerPolicy: true,
    xssFilter: true
  }));

  // CORS configuration
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
    exposedHeaders: ['X-Correlation-ID'],
    credentials: true,
    maxAge: 86400 // 24 hours
  }));

  // Compression middleware
  app.use(compression({
    level: 6,
    threshold: 10 * 1024 // 10KB
  }));

  // Request correlation
  app.use(correlationIdMiddleware);

  // Circuit breaker
  const circuitBreaker = new CircuitBreakerMiddleware({
    serviceName: 'auth-service',
    serviceVersion: process.env.SERVICE_VERSION || '1.0.0',
    failureThreshold: 5,
    resetTimeout: 30000,
    requestTimeout: 5000
  });
  app.use(circuitBreaker.handleRequest.bind(circuitBreaker));

  // Rate limiting
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
      status: CLIENT_ERROR_CODES.TOO_MANY_REQUESTS,
      code: SYSTEM_ERRORS.RATE_LIMIT_EXCEEDED,
      message: 'Too many requests, please try again later.'
    }
  }));

  // Request logging
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => logger.info(message.trim())
    }
  }));

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Metrics middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.on('finish', () => {
      metricsRegistry.getMetricsAsJSON().then(metrics => {
        logger.debug('Request metrics', { metrics, path: req.path });
      });
    });
    next();
  });
}

/**
 * Sets up all routes for the authentication service
 * @param app Express application instance
 */
function initializeRoutes(app: Application): void {
  const authRoutes = container.get<AuthRoutes>(AuthRoutes);

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'UP',
      version: process.env.SERVICE_VERSION,
      timestamp: new Date().toISOString()
    });
  });

  // Metrics endpoint
  app.get('/metrics', async (req: Request, res: Response) => {
    try {
      const metrics = await metricsRegistry.metrics();
      res.set('Content-Type', metricsRegistry.contentType);
      res.end(metrics);
    } catch (error) {
      logger.error('Failed to collect metrics', error as Error, {});
      res.status(500).end();
    }
  });

  // API routes
  app.use('/api/v1/auth', authRoutes.getRouter());
  app.use('/api/v1/roles', roleRouter);

  // Error handling
  app.use(errorHandler({
    server: app,
    handlers: {
      '404': (err: any, req: Request, res: Response) => {
        res.status(CLIENT_ERROR_CODES.NOT_FOUND).json({
          status: CLIENT_ERROR_CODES.NOT_FOUND,
          code: SYSTEM_ERRORS.RESOURCE_NOT_FOUND,
          message: 'Resource not found',
          path: req.path
        });
      },
      '500': (err: any, req: Request, res: Response) => {
        logger.error('Internal server error', err, { path: req.path });
        res.status(SERVER_ERROR_CODES.INTERNAL_SERVER_ERROR).json({
          status: SERVER_ERROR_CODES.INTERNAL_SERVER_ERROR,
          code: SYSTEM_ERRORS.INTERNAL_ERROR,
          message: 'Internal server error'
        });
      }
    }
  }));
}

/**
 * Starts the Express server with error handling and graceful shutdown
 */
async function startServer(): Promise<void> {
  try {
    // Initialize middleware
    initializeMiddleware(app);

    // Initialize routes
    initializeRoutes(app);

    // Start server
    const PORT = process.env.AUTH_SERVICE_PORT || 3001;
    const server = app.listen(PORT, () => {
      logger.info(`Authentication service started on port ${PORT}`, {
        port: PORT,
        environment: process.env.NODE_ENV,
        version: process.env.SERVICE_VERSION
      });
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught exception', error, {});
      process.exit(1);
    });

    // Handle unhandled rejections
    process.on('unhandledRejection', (reason: any) => {
      logger.error('Unhandled rejection', reason as Error, {});
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start server', error as Error, {});
    process.exit(1);
  }
}

// Start server
startServer();

// Export app for testing
export { app };