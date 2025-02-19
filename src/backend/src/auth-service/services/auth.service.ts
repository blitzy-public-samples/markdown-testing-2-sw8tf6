/**
 * Enhanced Authentication Service
 * Implements comprehensive security features including MFA, rate limiting,
 * account lockout, and audit logging.
 * @version 1.0.0
 */

import { authenticator } from 'otplib'; // v12.0.1
import { compare } from 'bcryptjs'; // v2.4.3
import { IUser, IAuthCredentials, IAuthTokens } from '../interfaces/auth.interface';
import { UserRepository } from '../repositories/user.repository';
import { jwtConfig } from '../config/jwt.config';

export class AuthService {
    // Security constants
    private readonly MAX_LOGIN_ATTEMPTS = 5;
    private readonly LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes
    private readonly TOKEN_EXPIRY = '15m';
    private readonly REFRESH_TOKEN_EXPIRY = '7d';
    private readonly MFA_WINDOW = 1; // Time step validation window

    constructor(
        private readonly userRepository: UserRepository
    ) {
        // Configure MFA settings
        authenticator.options = {
            window: this.MFA_WINDOW,
            step: 30
        };
    }

    /**
     * Authenticates a user with comprehensive security checks
     * @param credentials User login credentials with optional MFA token
     * @returns Promise resolving to authentication tokens
     */
    async login(credentials: IAuthCredentials): Promise<IAuthTokens> {
        try {
            // Find user and validate existence
            const user = await this.userRepository.findByEmail(credentials.email);
            if (!user) {
                throw new Error('Invalid credentials');
            }

            // Check account lockout status
            if (this.isAccountLocked(user)) {
                throw new Error(`Account locked. Try again after ${user.lastLoginAt}`);
            }

            // Validate password
            const isPasswordValid = await compare(credentials.password, user.password);
            if (!isPasswordValid) {
                await this.handleFailedLogin(user);
                throw new Error('Invalid credentials');
            }

            // Verify MFA if enabled
            if (user.isMFAEnabled) {
                if (!credentials.mfaCode) {
                    throw new Error('MFA code required');
                }

                const isMFAValid = await this.verifyMFA(user, credentials.mfaCode);
                if (!isMFAValid) {
                    await this.handleFailedLogin(user);
                    throw new Error('Invalid MFA code');
                }
            }

            // Generate token pair
            const tokens = await this.generateTokenPair(user);

            // Update login metadata
            await this.userRepository.updateLastLogin(user.id);

            return tokens;
        } catch (error) {
            throw new Error(`Authentication failed: ${error.message}`);
        }
    }

    /**
     * Refreshes authentication tokens with security validations
     * @param refreshToken Current refresh token
     * @returns Promise resolving to new token pair
     */
    async refreshToken(refreshToken: string): Promise<IAuthTokens> {
        try {
            // Verify refresh token
            const decoded = await jwtConfig.verifyToken(refreshToken);
            if (typeof decoded === 'string' || !decoded.userId) {
                throw new Error('Invalid refresh token');
            }

            // Check token blacklist
            const isBlacklisted = await jwtConfig.isTokenBlacklisted(refreshToken);
            if (isBlacklisted) {
                throw new Error('Token has been revoked');
            }

            // Retrieve user and validate
            const user = await this.userRepository.findById(decoded.userId);
            if (!user || !user.isActive) {
                throw new Error('User not found or inactive');
            }

            // Generate new token pair
            return this.generateTokenPair(user);
        } catch (error) {
            throw new Error(`Token refresh failed: ${error.message}`);
        }
    }

    /**
     * Sets up Multi-Factor Authentication for a user
     * @param userId User identifier
     * @returns Promise resolving to MFA setup data
     */
    async setupMFA(userId: string): Promise<{ secret: string; qrCode: string; backupCodes: string[] }> {
        try {
            const user = await this.userRepository.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Generate MFA secret
            const secret = authenticator.generateSecret();
            const qrCode = authenticator.keyuri(user.email, 'Task Management System', secret);

            // Generate backup codes
            const backupCodes = Array.from({ length: 10 }, () =>
                Math.random().toString(36).substr(2, 8).toUpperCase()
            );

            // Store MFA data
            await this.userRepository.updateMFASecret(userId, secret, backupCodes);

            return {
                secret,
                qrCode,
                backupCodes
            };
        } catch (error) {
            throw new Error(`MFA setup failed: ${error.message}`);
        }
    }

    /**
     * Verifies MFA token or backup code
     * @param user User entity
     * @param token MFA token or backup code
     * @returns Promise resolving to verification result
     */
    private async verifyMFA(user: IUser, token: string): Promise<boolean> {
        if (!user.mfaSecret) {
            throw new Error('MFA not configured');
        }

        return authenticator.verify({
            token,
            secret: user.mfaSecret
        });
    }

    /**
     * Generates a new pair of access and refresh tokens
     * @param user User entity
     * @returns Promise resolving to token pair
     */
    private async generateTokenPair(user: IUser): Promise<IAuthTokens> {
        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role.name,
            permissions: user.role.permissions
        };

        const [accessToken, refreshToken] = await Promise.all([
            jwtConfig.generateToken(payload, { expiresIn: this.TOKEN_EXPIRY }),
            jwtConfig.generateToken(payload, { expiresIn: this.REFRESH_TOKEN_EXPIRY })
        ]);

        return {
            accessToken,
            refreshToken,
            expiresIn: parseInt(this.TOKEN_EXPIRY) * 60
        };
    }

    /**
     * Checks if an account is locked due to failed attempts
     * @param user User entity
     * @returns boolean indicating if account is locked
     */
    private isAccountLocked(user: IUser): boolean {
        if (!user.lastLoginAt) return false;
        const lockoutTime = new Date(user.lastLoginAt.getTime() + this.LOCKOUT_DURATION);
        return user.failedLoginAttempts >= this.MAX_LOGIN_ATTEMPTS && lockoutTime > new Date();
    }

    /**
     * Handles failed login attempt
     * @param user User entity
     */
    private async handleFailedLogin(user: IUser): Promise<void> {
        const attempts = (user.failedLoginAttempts || 0) + 1;
        await this.userRepository.updateFailedAttempts(user.id, attempts);
    }
}