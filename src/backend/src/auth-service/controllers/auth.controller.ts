/**
 * Enhanced Authentication Controller
 * Implements secure authentication endpoints with comprehensive security features,
 * rate limiting, monitoring, and detailed error handling.
 * @version 1.0.0
 */

import { Request, Response } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible'; // ^2.4.1
import winston from 'winston'; // ^3.8.2
import { AuthService } from '../services/auth.service';
import { validateRequest } from '../../api-gateway/middleware/validation.middleware';
import { IAuthCredentials, IUserCreateDTO, IMFASetupDTO } from '../interfaces/auth.interface';
import { AUTH_ERRORS, VALIDATION_ERRORS } from '../../common/constants/error-codes';
import { CLIENT_ERROR_CODES, SUCCESS_CODES } from '../../common/constants/status-codes';

/**
 * Authentication controller with enhanced security features
 */
export class AuthController {
    private readonly rateLimiter: RateLimiterMemory;
    private readonly logger: winston.Logger;

    constructor(
        private readonly authService: AuthService,
        logger: winston.Logger
    ) {
        // Initialize rate limiter with security settings
        this.rateLimiter = new RateLimiterMemory({
            points: 5, // Number of attempts
            duration: 60 * 15, // Per 15 minutes
            blockDuration: 60 * 30, // Block for 30 minutes
        });

        this.logger = logger;
    }

    /**
     * Handles user login with enhanced security measures
     * @param req Express request
     * @param res Express response
     */
    public login = async (req: Request, res: Response): Promise<void> => {
        const requestId = req.headers['x-request-id'] as string;
        const startTime = Date.now();

        try {
            // Rate limiting check
            await this.rateLimiter.consume(req.ip);

            // Validate credentials
            const credentials: IAuthCredentials = req.body;
            if (!credentials.email || !credentials.password) {
                throw {
                    status: CLIENT_ERROR_CODES.BAD_REQUEST,
                    code: VALIDATION_ERRORS.REQUIRED_FIELD,
                    message: 'Email and password are required',
                };
            }

            // Attempt authentication
            const tokens = await this.authService.login(credentials);

            // Log successful login
            this.logger.info('Login successful', {
                userId: tokens.userId,
                requestId,
                duration: Date.now() - startTime,
            });

            res.status(SUCCESS_CODES.OK).json(tokens);
        } catch (error) {
            // Handle rate limiting errors
            if (error.remainingPoints === 0) {
                this.logger.warn('Rate limit exceeded', {
                    ip: req.ip,
                    requestId,
                });
                res.status(CLIENT_ERROR_CODES.TOO_MANY_REQUESTS).json({
                    status: CLIENT_ERROR_CODES.TOO_MANY_REQUESTS,
                    code: AUTH_ERRORS.ACCOUNT_LOCKED,
                    message: 'Too many login attempts. Please try again later.',
                    retryAfter: error.msBeforeNext / 1000,
                });
                return;
            }

            // Log authentication failures
            this.logger.error('Login failed', {
                error: error.message,
                requestId,
                duration: Date.now() - startTime,
            });

            res.status(error.status || CLIENT_ERROR_CODES.UNAUTHORIZED).json({
                status: error.status || CLIENT_ERROR_CODES.UNAUTHORIZED,
                code: error.code || AUTH_ERRORS.INVALID_CREDENTIALS,
                message: error.message || 'Authentication failed',
            });
        }
    };

    /**
     * Handles new user registration with security validations
     * @param req Express request
     * @param res Express response
     */
    public register = async (req: Request, res: Response): Promise<void> => {
        const requestId = req.headers['x-request-id'] as string;
        const startTime = Date.now();

        try {
            // Rate limiting check for registration
            await this.rateLimiter.consume(req.ip);

            const userData: IUserCreateDTO = req.body;

            // Create new user
            const result = await this.authService.register(userData);

            // Log successful registration
            this.logger.info('User registered successfully', {
                userId: result.id,
                requestId,
                duration: Date.now() - startTime,
            });

            res.status(SUCCESS_CODES.CREATED).json({
                message: 'Registration successful',
                userId: result.id,
            });
        } catch (error) {
            this.logger.error('Registration failed', {
                error: error.message,
                requestId,
                duration: Date.now() - startTime,
            });

            res.status(error.status || CLIENT_ERROR_CODES.BAD_REQUEST).json({
                status: error.status || CLIENT_ERROR_CODES.BAD_REQUEST,
                code: error.code || VALIDATION_ERRORS.INVALID_FORMAT,
                message: error.message || 'Registration failed',
            });
        }
    };

    /**
     * Handles token refresh with security validations
     * @param req Express request
     * @param res Express response
     */
    public refreshToken = async (req: Request, res: Response): Promise<void> => {
        const requestId = req.headers['x-request-id'] as string;
        const startTime = Date.now();

        try {
            const { refreshToken } = req.body;
            if (!refreshToken) {
                throw {
                    status: CLIENT_ERROR_CODES.BAD_REQUEST,
                    code: AUTH_ERRORS.TOKEN_MISSING,
                    message: 'Refresh token is required',
                };
            }

            const tokens = await this.authService.refreshToken(refreshToken);

            this.logger.info('Token refreshed successfully', {
                requestId,
                duration: Date.now() - startTime,
            });

            res.status(SUCCESS_CODES.OK).json(tokens);
        } catch (error) {
            this.logger.error('Token refresh failed', {
                error: error.message,
                requestId,
                duration: Date.now() - startTime,
            });

            res.status(error.status || CLIENT_ERROR_CODES.UNAUTHORIZED).json({
                status: error.status || CLIENT_ERROR_CODES.UNAUTHORIZED,
                code: error.code || AUTH_ERRORS.TOKEN_INVALID,
                message: error.message || 'Token refresh failed',
            });
        }
    };

    /**
     * Handles MFA setup for users
     * @param req Express request
     * @param res Express response
     */
    public setupMFA = async (req: Request, res: Response): Promise<void> => {
        const requestId = req.headers['x-request-id'] as string;
        const startTime = Date.now();

        try {
            const userId = req.user?.id;
            if (!userId) {
                throw {
                    status: CLIENT_ERROR_CODES.UNAUTHORIZED,
                    code: AUTH_ERRORS.TOKEN_MISSING,
                    message: 'Authentication required',
                };
            }

            const mfaSetup = await this.authService.setupMFA(userId);

            this.logger.info('MFA setup completed', {
                userId,
                requestId,
                duration: Date.now() - startTime,
            });

            res.status(SUCCESS_CODES.OK).json(mfaSetup);
        } catch (error) {
            this.logger.error('MFA setup failed', {
                error: error.message,
                requestId,
                duration: Date.now() - startTime,
            });

            res.status(error.status || CLIENT_ERROR_CODES.BAD_REQUEST).json({
                status: error.status || CLIENT_ERROR_CODES.BAD_REQUEST,
                code: error.code || AUTH_ERRORS.MFA_INVALID,
                message: error.message || 'MFA setup failed',
            });
        }
    };

    /**
     * Verifies MFA token or backup code
     * @param req Express request
     * @param res Express response
     */
    public verifyMFA = async (req: Request, res: Response): Promise<void> => {
        const requestId = req.headers['x-request-id'] as string;
        const startTime = Date.now();

        try {
            const { token } = req.body;
            const userId = req.user?.id;

            if (!userId || !token) {
                throw {
                    status: CLIENT_ERROR_CODES.BAD_REQUEST,
                    code: AUTH_ERRORS.MFA_INVALID,
                    message: 'User ID and token are required',
                };
            }

            const isValid = await this.authService.verifyMFA(userId, token);

            this.logger.info('MFA verification completed', {
                userId,
                success: isValid,
                requestId,
                duration: Date.now() - startTime,
            });

            if (!isValid) {
                throw {
                    status: CLIENT_ERROR_CODES.UNAUTHORIZED,
                    code: AUTH_ERRORS.MFA_INVALID,
                    message: 'Invalid MFA token',
                };
            }

            res.status(SUCCESS_CODES.OK).json({
                message: 'MFA verification successful',
            });
        } catch (error) {
            this.logger.error('MFA verification failed', {
                error: error.message,
                requestId,
                duration: Date.now() - startTime,
            });

            res.status(error.status || CLIENT_ERROR_CODES.UNAUTHORIZED).json({
                status: error.status || CLIENT_ERROR_CODES.UNAUTHORIZED,
                code: error.code || AUTH_ERRORS.MFA_INVALID,
                message: error.message || 'MFA verification failed',
            });
        }
    };
}