/**
 * Authentication Routes Configuration
 * Implements secure authentication endpoints with comprehensive security measures
 * including rate limiting, audit logging, and MFA support.
 * @version 1.0.0
 */

import { Router } from 'express'; // ^4.18.2
import { injectable } from 'inversify'; // ^6.0.1
import helmet from 'helmet'; // ^7.0.0
import rateLimit from 'express-rate-limit'; // ^6.7.0
import { AuthController } from '../controllers/auth.controller';
import { RoleMiddleware } from '../middleware/role.middleware';
import { validateRequest } from '../../api-gateway/middleware/validation.middleware';
import { AUTH_ERRORS } from '../../common/constants/error-codes';
import { CLIENT_ERROR_CODES } from '../../common/constants/status-codes';

@injectable()
export class AuthRoutes {
    private readonly router: Router;
    private readonly loginLimiter: any;
    private readonly mfaLimiter: any;

    constructor(
        private readonly authController: AuthController,
        private readonly roleMiddleware: RoleMiddleware
    ) {
        this.router = Router();
        
        // Configure rate limiters
        this.loginLimiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 5, // 5 attempts per window
            message: {
                status: CLIENT_ERROR_CODES.TOO_MANY_REQUESTS,
                code: AUTH_ERRORS.ACCOUNT_LOCKED,
                message: 'Too many login attempts. Please try again later.'
            }
        });

        this.mfaLimiter = rateLimit({
            windowMs: 5 * 60 * 1000, // 5 minutes
            max: 3, // 3 attempts per window
            message: {
                status: CLIENT_ERROR_CODES.TOO_MANY_REQUESTS,
                code: AUTH_ERRORS.MFA_INVALID,
                message: 'Too many MFA attempts. Please try again later.'
            }
        });

        this.configureRoutes();
    }

    /**
     * Configures authentication routes with security middleware
     * @private
     */
    private configureRoutes(): void {
        // Apply security headers
        this.router.use(helmet());

        // Login route with rate limiting
        this.router.post(
            '/login',
            this.loginLimiter,
            validateRequest(/* validator instance */),
            this.authController.login
        );

        // Registration route
        this.router.post(
            '/register',
            validateRequest(/* validator instance */),
            this.authController.register
        );

        // Token refresh route
        this.router.post(
            '/refresh-token',
            validateRequest(/* validator instance */),
            this.authController.refreshToken
        );

        // MFA setup route (requires authentication)
        this.router.post(
            '/mfa/setup',
            this.roleMiddleware.hasRole(['user']),
            validateRequest(/* validator instance */),
            this.authController.setupMFA
        );

        // MFA verification route
        this.router.post(
            '/mfa/verify',
            this.mfaLimiter,
            validateRequest(/* validator instance */),
            this.authController.verifyMFA
        );

        // Error handling middleware
        this.router.use((err: any, req: any, res: any, next: any) => {
            const status = err.status || CLIENT_ERROR_CODES.INTERNAL_SERVER_ERROR;
            const message = err.message || 'An unexpected error occurred';
            const code = err.code || AUTH_ERRORS.INTERNAL_ERROR;

            res.status(status).json({
                status,
                message,
                code,
                timestamp: new Date().toISOString(),
                path: req.path,
                requestId: req.headers['x-request-id']
            });
        });
    }

    /**
     * Returns the configured router instance
     * @returns Express Router instance
     */
    public getRouter(): Router {
        return this.router;
    }
}