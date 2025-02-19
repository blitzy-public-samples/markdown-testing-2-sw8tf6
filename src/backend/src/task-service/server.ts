/**
 * @fileoverview Main server file for the Task microservice implementing comprehensive
 * error handling, monitoring, and observability features
 * @version 1.0.0
 */

import express, { Express, Request, Response, NextFunction } from 'express'; // ^4.18.2
import cors from 'cors'; // ^2.8.5
import helmet from 'helmet'; // ^7.0.0
import compression from 'compression'; // ^1.7.4
import morgan from 'morgan'; // ^1.10.0
import configureTaskRoutes from './routes/task.routes';
import commentRoutes from './routes/comment.routes';
import { Logger } from '../../common/utils/logger.util';
import { SYSTEM_ERRORS, BUSINESS_ERRORS } from '../../common/constants/error-codes';
import { CLIENT_ERROR_CODES, SERVER_ERROR_CODES } from '../../common/constants/status-codes';

// Initialize Express application
const app: Express = express();

// Initialize logger
const logger = new Logger({
    enabled: true,
    metricsPort: 9090,
    logLevel: 'info',
    tracing: { enabled: true, samplingRate: 0.1 },
    alerting: { enabled: true, endpoints: [] }
}, 'task-service', '1.0.0');

/**
 * Initializes and configures all middleware for the Express application
 * @param app Express application instance
 */
function initializeMiddleware(app: Express): void {
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
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
        credentials: true,
        maxAge: 86400 // 24 hours
    }));

    // Request compression
    app.use(compression());

    // Request logging with correlation IDs
    app.use(morgan(':method :url :status :response-time ms - :res[content-length] - :req[x-correlation-id]'));

    // Body parsing middleware
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Add request correlation ID
    app.use((req: Request, res: Response, next: NextFunction) => {
        req.headers['x-correlation-id'] = req.headers['x-correlation-id'] || 
            `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        next();
    });

    // Add response time header
    app.use((req: Request, res: Response, next: NextFunction) => {
        const start = Date.now();
        res.on('finish', () => {
            const duration = Date.now() - start;
            res.setHeader('X-Response-Time', `${duration}ms`);
        });
        next();
    });
}

/**
 * Configures all routes for the task service
 * @param app Express application instance
 */
function initializeRoutes(app: Express): void {
    // Health check endpoint
    app.get('/health', (req: Request, res: Response) => {
        res.status(200).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            service: 'task-service'
        });
    });

    // Configure task routes
    app.use('/api', configureTaskRoutes(
        {
            ttl: 300,
            maxSize: 1000
        },
        {
            windowMs: 15 * 60 * 1000,
            max: 100
        }
    ));

    // Configure comment routes
    app.use('/api', commentRoutes);

    // 404 handler
    app.use((req: Request, res: Response) => {
        res.status(CLIENT_ERROR_CODES.NOT_FOUND).json({
            status: CLIENT_ERROR_CODES.NOT_FOUND,
            message: 'Resource not found',
            code: BUSINESS_ERRORS.RESOURCE_NOT_FOUND,
            path: req.path,
            timestamp: new Date(),
            correlationId: req.headers['x-correlation-id']
        });
    });

    // Global error handler
    app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
        handleError(error, req, res, next);
    });
}

/**
 * Global error handler middleware
 */
function handleError(
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
): void {
    logger.error('Unhandled error', error, {
        path: req.path,
        method: req.method,
        correlationId: req.headers['x-correlation-id']
    });

    const errorResponse = {
        status: SERVER_ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: 'An unexpected error occurred',
        code: SYSTEM_ERRORS.INTERNAL_ERROR,
        correlationId: req.headers['x-correlation-id'],
        timestamp: new Date(),
        path: req.path
    };

    res.status(errorResponse.status).json(errorResponse);
}

/**
 * Starts the HTTP server with proper error handling
 * @param app Express application instance
 */
async function startServer(app: Express): Promise<void> {
    try {
        // Initialize middleware
        initializeMiddleware(app);

        // Initialize routes
        initializeRoutes(app);

        // Start server
        const port = process.env.PORT || 3000;
        const server = app.listen(port, () => {
            logger.info('Task service started successfully', {
                port,
                environment: process.env.NODE_ENV,
                version: '1.0.0'
            });
        });

        // Graceful shutdown handler
        process.on('SIGTERM', () => {
            logger.info('SIGTERM received, shutting down gracefully');
            server.close(() => {
                logger.info('Server closed');
                process.exit(0);
            });
        });

    } catch (error) {
        logger.error('Failed to start server', error as Error, {
            code: SYSTEM_ERRORS.INTERNAL_ERROR
        });
        process.exit(1);
    }
}

// Start the server
startServer(app);

// Export app for testing
export { app };