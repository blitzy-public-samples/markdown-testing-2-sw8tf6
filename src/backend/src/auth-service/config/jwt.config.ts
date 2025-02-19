/**
 * JWT Configuration and Token Management
 * Provides secure token generation, validation, and lifecycle management
 * with comprehensive security measures and strict type checking.
 * @version 1.0.0
 */

import { sign, verify } from 'jsonwebtoken'; // ^9.0.0
import { IAuthConfig } from '../../common/interfaces/config.interface';

// Global JWT configuration constants
const JWT_ALGORITHM = 'HS256';
const TOKEN_ISSUER = 'task-management-system';

/**
 * Token payload interface for type safety
 */
interface ITokenPayload {
  userId: string;
  role: string;
  permissions: string[];
  version: string;
  [key: string]: any;
}

/**
 * Token generation options interface
 */
interface ITokenOptions {
  expiresIn?: string;
  audience?: string;
  subject?: string;
  includeDefaults?: boolean;
}

/**
 * JWT Configuration and utility functions
 */
export const jwtConfig = {
  algorithm: JWT_ALGORITHM,
  issuer: TOKEN_ISSUER,
  audience: process.env.JWT_AUDIENCE || 'task-management-system',
  tokenVersion: '1',
  clockTolerance: 30, // seconds
  includeDefaults: true,
  maxTokenAge: process.env.JWT_MAX_AGE || '24h',
  refreshTokenEnabled: true,
  blacklistEnabled: true,

  /**
   * Generates a secure JWT token with comprehensive payload validation
   * @param payload - Token payload data
   * @param options - Token generation options
   * @returns Promise<string> - Generated JWT token
   */
  async generateToken(
    payload: ITokenPayload,
    options: ITokenOptions = {}
  ): Promise<string> {
    try {
      // Validate required payload fields
      if (!payload.userId || !payload.role) {
        throw new Error('Invalid payload: missing required fields');
      }

      // Sanitize payload data
      const sanitizedPayload = {
        ...payload,
        userId: payload.userId.trim(),
        role: payload.role.trim(),
        permissions: Array.isArray(payload.permissions) 
          ? payload.permissions.map(p => p.trim())
          : [],
      };

      // Add security metadata
      const tokenPayload = {
        ...sanitizedPayload,
        version: this.tokenVersion,
        iat: Math.floor(Date.now() / 1000),
        iss: this.issuer,
      };

      // Merge options with defaults
      const tokenOptions = {
        algorithm: this.algorithm as any,
        expiresIn: options.expiresIn || this.maxTokenAge,
        audience: options.audience || this.audience,
        issuer: this.issuer,
        subject: options.subject || payload.userId,
      };

      // Generate and return token
      return sign(
        tokenPayload,
        process.env.JWT_SECRET as string,
        tokenOptions
      );
    } catch (error) {
      throw new Error(`Token generation failed: ${error.message}`);
    }
  },

  /**
   * Performs comprehensive verification and validation of JWT tokens
   * @param token - JWT token string
   * @returns Promise<object> - Decoded and validated token payload
   */
  async verifyToken(token: string): Promise<object> {
    try {
      // Validate token format
      if (!token || typeof token !== 'string') {
        throw new Error('Invalid token format');
      }

      // Token verification options
      const verifyOptions = {
        algorithms: [this.algorithm],
        issuer: this.issuer,
        audience: this.audience,
        clockTolerance: this.clockTolerance,
        maxAge: this.maxTokenAge,
      };

      // Verify token
      const decoded = verify(
        token,
        process.env.JWT_SECRET as string,
        verifyOptions
      );

      // Additional security validations
      if (typeof decoded === 'string') {
        throw new Error('Invalid token structure');
      }

      // Validate token version
      if (decoded.version !== this.tokenVersion) {
        throw new Error('Token version mismatch');
      }

      // Validate required claims
      if (!decoded.userId || !decoded.role) {
        throw new Error('Missing required claims');
      }

      // Check token blacklist if enabled
      if (this.blacklistEnabled) {
        // Implementation note: Blacklist check should be implemented
        // using Redis or similar cache for performance
        await this.checkTokenBlacklist(token);
      }

      return decoded;
    } catch (error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  },

  /**
   * Checks if a token has been blacklisted
   * @param token - JWT token string
   * @returns Promise<void>
   */
  private async checkTokenBlacklist(token: string): Promise<void> {
    // Implementation placeholder for token blacklist check
    // This should be implemented using Redis or similar cache
    return Promise.resolve();
  }
};