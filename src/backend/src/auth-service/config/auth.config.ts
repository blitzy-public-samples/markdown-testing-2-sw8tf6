import { config } from 'dotenv';
import { IAuthConfig } from '../../common/interfaces/config.interface';

// Initialize environment variables
config();

// Service constants
export const AUTH_SERVICE_NAME = 'auth-service';
export const DEFAULT_JWT_EXPIRY = '24h';
export const DEFAULT_REFRESH_TOKEN_EXPIRY = '7d';
export const PASSWORD_MIN_LENGTH = 12;

/**
 * Validates authentication configuration settings and security parameters
 * @throws Error if configuration is invalid or security requirements are not met
 */
export const validateAuthConfig = (): void => {
  // Verify JWT secret
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  // Validate JWT expiration
  const jwtExpiry = process.env.JWT_EXPIRES_IN || DEFAULT_JWT_EXPIRY;
  if (!/^\d+[hdm]$/.test(jwtExpiry)) {
    throw new Error('Invalid JWT expiration format. Use format: 1h, 1d, 30m');
  }

  // Validate refresh token expiration
  const refreshExpiry = process.env.REFRESH_TOKEN_EXPIRES_IN || DEFAULT_REFRESH_TOKEN_EXPIRY;
  if (!/^\d+[hdm]$/.test(refreshExpiry)) {
    throw new Error('Invalid refresh token expiration format');
  }

  // Validate MFA configuration when enabled
  if (process.env.MFA_ENABLED === 'true') {
    if (!process.env.MFA_ISSUER || !process.env.MFA_SECRET_LENGTH) {
      throw new Error('MFA configuration incomplete');
    }
  }

  // Validate session policy parameters
  if (authConfig.sessionPolicy.maxConcurrentSessions < 1) {
    throw new Error('maxConcurrentSessions must be positive');
  }

  // Validate timeout values
  if (!/^\d+[hm]$/.test(authConfig.sessionPolicy.inactivityTimeout)) {
    throw new Error('Invalid inactivity timeout format');
  }
};

/**
 * Authentication configuration object implementing IAuthConfig interface
 * Includes comprehensive security settings for enterprise-grade authentication
 */
export const authConfig: IAuthConfig & {
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    expiryDays: number;
  };
  sessionPolicy: {
    maxConcurrentSessions: number;
    inactivityTimeout: string;
    absoluteTimeout: string;
    refreshTokenRotation: boolean;
  };
} = {
  // JWT Configuration
  jwtSecret: process.env.JWT_SECRET!,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || DEFAULT_JWT_EXPIRY,
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || DEFAULT_REFRESH_TOKEN_EXPIRY,
  
  // MFA Configuration
  mfaEnabled: process.env.MFA_ENABLED === 'true',
  
  // Password Policy
  passwordPolicy: {
    minLength: PASSWORD_MIN_LENGTH,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    expiryDays: 90
  },
  
  // Session Management
  sessionPolicy: {
    maxConcurrentSessions: 5,
    inactivityTimeout: '30m',
    absoluteTimeout: '12h',
    refreshTokenRotation: true
  },
  
  // Rate Limiting (from IAuthConfig interface)
  rateLimiting: {
    enabled: true,
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000 // 15 minutes
  }
};

// Validate configuration on module load
validateAuthConfig();

export default authConfig;