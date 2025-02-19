/**
 * File Routes Configuration
 * Implements secure, performant, and monitored file management endpoints
 * @version 1.0.0
 */

import { Router } from 'express'; // ^4.18.2
import multer from 'multer'; // ^1.4.5-lts.1
import compression from 'compression'; // ^1.7.4
import { rateLimit } from 'express-rate-limit'; // ^6.7.0
import helmet from 'helmet'; // ^7.0.0
import { validateRequest } from 'express-validator'; // ^7.0.1
import { FileController } from '../controllers/file.controller';
import { authMiddleware } from '@middleware/auth'; // ^1.0.0

// Constants for file upload configuration
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 100; // 100 requests per window

/**
 * Configures and returns the Express router for file management
 * with comprehensive security, performance, and monitoring features
 */
const configureFileRoutes = (): Router => {
    const router = Router();
    const fileController = new FileController();

    // Apply security headers
    router.use(helmet({
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

    // Enable compression for file transfers
    router.use(compression({
        level: 6,
        threshold: 1024,
        filter: (req, res) => {
            if (req.headers['x-no-compression']) {
                return false;
            }
            return compression.filter(req, res);
        }
    }));

    // Configure rate limiting
    const limiter = rateLimit({
        windowMs: RATE_LIMIT_WINDOW,
        max: RATE_LIMIT_MAX,
        message: 'Too many requests from this IP, please try again later.',
        standardHeaders: true,
        legacyHeaders: false
    });

    // Configure multer for file uploads
    const upload = multer({
        limits: {
            fileSize: MAX_FILE_SIZE
        },
        fileFilter: (req, file, cb) => {
            if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new Error('Invalid file type'), false);
            }
        }
    });

    // File upload endpoint
    router.post('/upload',
        authMiddleware(['user', 'admin']),
        limiter,
        upload.single('file'),
        validateRequest([
            { field: 'taskId', rules: ['required', 'uuid'] },
            { field: 'file', rules: ['required'] }
        ]),
        fileController.uploadFile
    );

    // File download endpoint
    router.get('/:fileId/download',
        authMiddleware(['user', 'admin']),
        limiter,
        validateRequest([
            { field: 'fileId', rules: ['required', 'uuid'] }
        ]),
        fileController.downloadFile
    );

    // File deletion endpoint
    router.delete('/:fileId',
        authMiddleware(['user', 'admin']),
        limiter,
        validateRequest([
            { field: 'fileId', rules: ['required', 'uuid'] }
        ]),
        fileController.deleteFile
    );

    // File metadata endpoint
    router.get('/:fileId',
        authMiddleware(['user', 'admin']),
        limiter,
        validateRequest([
            { field: 'fileId', rules: ['required', 'uuid'] }
        ]),
        fileController.getFileMetadata
    );

    // Error handling middleware
    router.use((err: Error, req: any, res: any, next: any) => {
        console.error(`File operation error: ${err.message}`);
        res.status(500).json({
            error: 'File operation failed',
            message: err.message
        });
    });

    return router;
};

// Export configured router
export const fileRouter = configureFileRoutes();