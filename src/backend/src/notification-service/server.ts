/**
 * @fileoverview Entry point for the notification microservice
 * Implements secure, scalable notification delivery with WebSocket and REST support
 * @version 1.0.0
 */

import express, { Express, Request, Response, NextFunction } from 'express'; // ^4.18.2
import cors from 'cors'; // ^2.8.5
import helmet from 'helmet'; // ^7.0.0
import morgan from 'morgan'; // ^1.10.0
import { Container } from 'inversify'; // ^6.0.1
import { Server } from 'http';
import { Logger } from '../common/utils/logger.util';
import { NotificationService } from './services/notification.service';
import { WebSocketService } from './services/websocket.service';
import { EmailService } from './services/email.service';
import notificationRouter from './routes/notification.routes';
import notificationConfig from './config/notification.config';
import websocketConfig from './config/websocket.config';
import { SYSTEM_ERRORS } from '../common/constants/error-codes';

/**
 * Main notification server class implementing comprehensive notification management
 * with support for WebSocket and REST APIs
 */
export class NotificationServer {
    private readonly app: Express;
    private readonly container: Container;
    private server: Server | null;
    private readonly logger: Logger;
    private readonly notificationService: NotificationService;
    private readonly webSocketService: WebSocketService;

    /**
     * Initializes the notification server with all required dependencies
     */
    constructor() {
        this.app = express();
        this.container = new Container();
        this.server = null;
        this.logger = new Logger(
            notificationConfig.monitoring,
            'NotificationServer',
            '1.0.0'
        );

        // Initialize dependency injection
        this.initializeDependencies();

        // Initialize services
        this.notificationService = this.container.get(NotificationService);
        this.webSocketService = new WebSocketService(websocketConfig, this.logger);

        // Configure server
        this.configureServer();
    }

    /**
     * Initializes dependency injection container
     */
    private initializeDependencies(): void {
        this.container.bind(NotificationService).toSelf();
        this.container.bind(EmailService).toSelf();
        this.container.bind(Logger).toConstantValue(this.logger);
    }

    /**
     * Configures Express server with middleware and routes
     */
    private configureServer(): void {
        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    ...helmet.contentSecurityPolicy.getDefaultDirectives(),
                    'connect-src': ["'self'", 'wss://*']
                }
            }
        }));

        // CORS configuration
        this.app.use(cors({
            origin: notificationConfig.corsOrigins,
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
            allowedHeaders: ['Content-Type', 'Authorization'],
            credentials: true
        }));

        // Request parsing
        this.app.use(express.json({ limit: '1mb' }));
        this.app.use(express.urlencoded({ extended: true }));

        // Logging
        this.app.use(morgan('combined'));

        // Routes
        this.app.use('/api/v1', notificationRouter);

        // Health check endpoint
        this.app.get('/health', (req: Request, res: Response) => {
            res.status(200).json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: '1.0.0'
            });
        });

        // Error handling
        this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
            this.logger.error('Unhandled error', err, {
                code: SYSTEM_ERRORS.INTERNAL_ERROR
            });
            res.status(500).json({
                error: 'Internal server error',
                code: SYSTEM_ERRORS.INTERNAL_ERROR
            });
        });
    }

    /**
     * Starts the notification server and WebSocket service
     */
    public async start(): Promise<void> {
        try {
            const port = parseInt(process.env.PORT || '3000', 10);

            // Start HTTP server
            this.server = this.app.listen(port, () => {
                this.logger.info('Notification server started', {
                    port,
                    environment: process.env.NODE_ENV
                });
            });

            // Initialize WebSocket service
            await this.webSocketService.start();

            // Configure graceful shutdown
            this.setupGracefulShutdown();

        } catch (error) {
            this.logger.error('Failed to start server', error as Error, {
                code: SYSTEM_ERRORS.SERVICE_UNAVAILABLE
            });
            throw error;
        }
    }

    /**
     * Configures graceful shutdown handlers
     */
    private setupGracefulShutdown(): void {
        const shutdown = async (signal: string) => {
            this.logger.info(`Received ${signal}, starting graceful shutdown`);

            try {
                // Stop accepting new connections
                if (this.server) {
                    this.server.close(() => {
                        this.logger.info('HTTP server closed');
                    });
                }

                // Close WebSocket connections
                await this.webSocketService.stop();

                // Close database connections and cleanup
                await this.cleanup();

                this.logger.info('Graceful shutdown completed');
                process.exit(0);

            } catch (error) {
                this.logger.error('Error during shutdown', error as Error, {
                    code: SYSTEM_ERRORS.INTERNAL_ERROR
                });
                process.exit(1);
            }
        };

        // Register shutdown handlers
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    }

    /**
     * Performs cleanup operations before shutdown
     */
    private async cleanup(): Promise<void> {
        try {
            // Close database connections
            // Additional cleanup as needed
            await this.logger.close();
        } catch (error) {
            this.logger.error('Cleanup failed', error as Error, {
                code: SYSTEM_ERRORS.INTERNAL_ERROR
            });
            throw error;
        }
    }

    /**
     * Stops the notification server
     */
    public async stop(): Promise<void> {
        try {
            if (this.server) {
                await new Promise<void>((resolve, reject) => {
                    this.server?.close((err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            }
            await this.cleanup();
        } catch (error) {
            this.logger.error('Failed to stop server', error as Error, {
                code: SYSTEM_ERRORS.INTERNAL_ERROR
            });
            throw error;
        }
    }
}

// Create and export server instance
const notificationServer = new NotificationServer();
export default notificationServer;