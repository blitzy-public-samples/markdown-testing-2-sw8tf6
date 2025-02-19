/**
 * File Service Entry Point
 * Implements secure, performant file management microservice with comprehensive monitoring
 * @version 1.0.0
 */

import express, { Express, Request, Response, NextFunction } from 'express'; // ^4.18.2
import cors from 'cors'; // ^2.8.5
import helmet from 'helmet'; // ^7.0.0
import compression from 'compression'; // ^1.7.4
import { rateLimit } from 'express-rate-limit'; // ^6.7.0
import morgan from 'morgan'; // ^1.10.0
import createHttpError from 'http-errors'; // ^2.0.0
import { fileRouter } from './routes/file.routes';
import { storageConfig } from './config/storage.config';
import { correlationIdMiddleware } from '../common/middleware/correlation-id.middleware';
import { Logger } from '../common/utils/logger.util';
import { SYSTEM_ERRORS } from '../common/constants/error-codes';

// Environment variables with defaults
const PORT = process.env.PORT || 3003;
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGINS = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'];
const RATE_LIMIT_WINDOW = process.env.RATE_LIMIT_WINDOW || 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = process.env.RATE_LIMIT_MAX || 100;

/**
 * Initializes Express application with comprehensive security and performance middleware
 */
const initializeServer = (): Express => {
  const app = express();

  // Initialize logger
  const logger = new Logger(
    {
      enabled: true,
      logLevel: NODE_ENV === 'production' ? 'info' : 'debug',
      metricsPort: 9090,
      maxFileSize: '20m',
      retentionDays: 30,
      tracing: { enabled: true, samplingRate: 1 },
      alerting: { enabled: true, endpoints: [] }
    },
    'file-service',
    '1.0.0'
  );
  app.locals.logger = logger;

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
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
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true
  }));

  // CORS configuration
  app.use(cors({
    origin: CORS_ORIGINS,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
    credentials: true,
    maxAge: 600 // 10 minutes
  }));

  // Response compression
  app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    }
  }));

  // Request correlation
  app.use(correlationIdMiddleware);

  // Rate limiting
  app.use(rateLimit({
    windowMs: RATE_LIMIT_WINDOW,
    max: RATE_LIMIT_MAX,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
  }));

  // Request logging
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'file-service',
      version: '1.0.0'
    });
  });

  // Mount file routes
  app.use('/api/files', fileRouter);

  // Error handling
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    const status = err.status || 500;
    const errorCode = err.code || SYSTEM_ERRORS.INTERNAL_ERROR;

    logger.error('Request failed', err, {
      path: req.path,
      method: req.method,
      correlationId: (req as any).correlationId
    });

    res.status(status).json({
      error: {
        code: errorCode,
        message: err.message,
        correlationId: (req as any).correlationId
      }
    });
  });

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: SYSTEM_ERRORS.INTERNAL_ERROR,
        message: 'Resource not found',
        correlationId: (req as any).correlationId
      }
    });
  });

  return app;
};

/**
 * Starts the server with proper error handling and graceful shutdown
 */
const startServer = async (app: Express): Promise<void> => {
  try {
    // Validate storage configuration
    if (!storageConfig.provider || !storageConfig.bucket) {
      throw new Error('Invalid storage configuration');
    }

    const server = app.listen(PORT, () => {
      app.locals.logger.info(`File Service started on port ${PORT}`, {
        environment: NODE_ENV,
        storageProvider: storageConfig.provider
      });
    });

    // Graceful shutdown handler
    const shutdown = async () => {
      app.locals.logger.info('Shutting down File Service...');
      
      server.close(async () => {
        try {
          await app.locals.logger.close();
          process.exit(0);
        } catch (error) {
          process.exit(1);
        }
      });

      // Force shutdown after timeout
      setTimeout(() => {
        app.locals.logger.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    app.locals.logger.error('Failed to start File Service', error as Error);
    process.exit(1);
  }
};

// Initialize and start server
const app = initializeServer();
startServer(app);

// Export for testing
export { app };