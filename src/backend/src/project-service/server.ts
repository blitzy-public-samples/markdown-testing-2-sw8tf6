/**
 * Project Service Entry Point
 * Initializes and configures the Express application with comprehensive security,
 * monitoring, and performance optimizations for project management functionality.
 * @version 1.0.0
 */

import express, { Express, Request, Response, NextFunction } from 'express'; // v4.18.2
import helmet from 'helmet'; // v7.0.0
import compression from 'compression'; // v1.7.4
import cors from 'cors'; // v2.8.5
import rateLimit from 'express-rate-limit'; // v6.9.0
import * as promClient from 'prom-client'; // v14.2.0
import { projectConfig } from './config/project.config';
import { Logger } from '../../common/utils/logger.util';
import configureProjectRoutes from './routes/project.routes';
import { SYSTEM_ERRORS } from '../../common/constants/error-codes';
import { SERVER_ERROR_CODES } from '../../common/constants/status-codes';

// Initialize logger
const logger = new Logger(
  projectConfig.app.monitoring,
  'ProjectService',
  projectConfig.app.version
);

// Initialize metrics registry
const metricsRegistry = new promClient.Registry();
promClient.collectDefaultMetrics({ register: metricsRegistry });

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5]
});
metricsRegistry.registerMetric(httpRequestDuration);

/**
 * Initializes Express application with enhanced security and monitoring
 */
function initializeServer(): Express {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
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
    dnsPrefetchControl: true,
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: true,
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true
  }));

  // CORS configuration
  app.use(cors({
    origin: projectConfig.app.corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400 // 24 hours
  }));

  // Compression middleware
  app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req: Request, res: Response) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    }
  }));

  // Rate limiting
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
      status: SERVER_ERROR_CODES.SERVICE_UNAVAILABLE,
      code: SYSTEM_ERRORS.RATE_LIMIT_EXCEEDED,
      message: 'Too many requests, please try again later'
    }
  }));

  // Body parser middleware with size limits
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Request correlation ID middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    req.id = req.headers['x-correlation-id'] as string || 
             req.headers['x-request-id'] as string || 
             `proj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    res.setHeader('X-Correlation-ID', req.id);
    next();
  });

  // Request logging middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const startTime = process.hrtime();

    res.on('finish', () => {
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const duration = seconds + nanoseconds / 1e9;

      httpRequestDuration
        .labels(req.method, req.path, res.statusCode.toString())
        .observe(duration);

      logger.info('Request completed', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        correlationId: req.id
      });
    });

    next();
  });

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      version: projectConfig.app.version
    });
  });

  // Metrics endpoint
  app.get('/metrics', async (req: Request, res: Response) => {
    try {
      res.set('Content-Type', promClient.register.contentType);
      res.send(await promClient.register.metrics());
    } catch (error) {
      res.status(500).send(error.message);
    }
  });

  // Configure project routes
  app.use(configureProjectRoutes());

  // Global error handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    logger.error('Unhandled error', err, {
      correlationId: req.id,
      path: req.path,
      method: req.method
    });

    res.status(err.status || SERVER_ERROR_CODES.INTERNAL_SERVER_ERROR).json({
      status: err.status || SERVER_ERROR_CODES.INTERNAL_SERVER_ERROR,
      code: err.code || SYSTEM_ERRORS.INTERNAL_ERROR,
      message: err.message || 'Internal server error',
      correlationId: req.id
    });
  });

  return app;
}

/**
 * Starts the HTTP server with graceful shutdown support
 */
async function startServer(): Promise<void> {
  const app = initializeServer();
  const port = projectConfig.app.port;

  // Track active connections for graceful shutdown
  let connections = new Set<any>();

  const server = app.listen(port, () => {
    logger.info('Project service started', {
      port,
      env: projectConfig.app.env,
      version: projectConfig.app.version
    });
  });

  // Connection tracking
  server.on('connection', connection => {
    connections.add(connection);
    connection.on('close', () => {
      connections.delete(connection);
    });
  });

  // Graceful shutdown handler
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, starting graceful shutdown`);

    server.close(async () => {
      try {
        // Close all active connections
        for (const connection of connections) {
          connection.destroy();
        }
        connections.clear();

        // Cleanup resources
        await promClient.register.clear();
        await logger.close();

        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', error as Error);
        process.exit(1);
      }
    });
  };

  // Register shutdown handlers
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Unhandled rejection handler
  process.on('unhandledRejection', (reason: any) => {
    logger.error('Unhandled Promise rejection', reason as Error);
  });
}

// Start server if running directly
if (require.main === module) {
  startServer().catch(error => {
    logger.error('Failed to start server', error as Error);
    process.exit(1);
  });
}

// Export for testing
export const app = initializeServer();