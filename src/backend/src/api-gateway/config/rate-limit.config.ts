/**
 * Rate limiting configuration for the API Gateway
 * Implements distributed Redis-based rate limiting for staging and production environments
 * with environment-specific configurations for different API endpoints.
 * @version 1.0.0
 */

import { rateLimit, RateLimiterOptions } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import Redis from 'ioredis';
import { IAppConfig } from '../../common/interfaces/config.interface';

/**
 * Configuration interface for rate limiting settings
 */
interface IRateLimitConfig {
  windowMs: number;
  max: number;
  standardHeaders: boolean;
  legacyHeaders: boolean;
  message: string;
  store?: RedisStore;
}

/**
 * Environment-specific rate limit configurations
 */
interface IEnvironmentRateLimits {
  publicApi: IRateLimitConfig;
  internalApi: IRateLimitConfig;
  webhook: IRateLimitConfig;
  websocket: IRateLimitConfig;
}

/**
 * Default rate limit configurations for different environments
 */
const defaultRateLimitConfig: Record<IAppConfig['env'], IEnvironmentRateLimits> = {
  development: {
    publicApi: {
      windowMs: 60 * 1000, // 1 minute
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: 'Too many requests from this IP, please try again after a minute'
    },
    internalApi: {
      windowMs: 60 * 1000,
      max: 1000,
      standardHeaders: true,
      legacyHeaders: false,
      message: 'Internal API rate limit exceeded'
    },
    webhook: {
      windowMs: 60 * 1000,
      max: 50,
      standardHeaders: true,
      legacyHeaders: false,
      message: 'Webhook rate limit exceeded'
    },
    websocket: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 5000,
      standardHeaders: true,
      legacyHeaders: false,
      message: 'WebSocket connection limit exceeded'
    }
  },
  staging: {
    publicApi: {
      windowMs: 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: 'Too many requests from this IP, please try again after a minute'
    },
    internalApi: {
      windowMs: 60 * 1000,
      max: 1000,
      standardHeaders: true,
      legacyHeaders: false,
      message: 'Internal API rate limit exceeded'
    },
    webhook: {
      windowMs: 60 * 1000,
      max: 50,
      standardHeaders: true,
      legacyHeaders: false,
      message: 'Webhook rate limit exceeded'
    },
    websocket: {
      windowMs: 60 * 60 * 1000,
      max: 5000,
      standardHeaders: true,
      legacyHeaders: false,
      message: 'WebSocket connection limit exceeded'
    }
  },
  production: {
    publicApi: {
      windowMs: 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: 'Too many requests from this IP, please try again after a minute'
    },
    internalApi: {
      windowMs: 60 * 1000,
      max: 1000,
      standardHeaders: true,
      legacyHeaders: false,
      message: 'Internal API rate limit exceeded'
    },
    webhook: {
      windowMs: 60 * 1000,
      max: 50,
      standardHeaders: true,
      legacyHeaders: false,
      message: 'Webhook rate limit exceeded'
    },
    websocket: {
      windowMs: 60 * 60 * 1000,
      max: 5000,
      standardHeaders: true,
      legacyHeaders: false,
      message: 'WebSocket connection limit exceeded'
    }
  },
  dr: {
    publicApi: {
      windowMs: 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: 'Too many requests from this IP, please try again after a minute'
    },
    internalApi: {
      windowMs: 60 * 1000,
      max: 1000,
      standardHeaders: true,
      legacyHeaders: false,
      message: 'Internal API rate limit exceeded'
    },
    webhook: {
      windowMs: 60 * 1000,
      max: 50,
      standardHeaders: true,
      legacyHeaders: false,
      message: 'Webhook rate limit exceeded'
    },
    websocket: {
      windowMs: 60 * 60 * 1000,
      max: 5000,
      standardHeaders: true,
      legacyHeaders: false,
      message: 'WebSocket connection limit exceeded'
    }
  }
};

/**
 * Creates environment-specific rate limit configuration with Redis store for distributed environments
 * @param env - Current environment
 * @param type - Type of rate limit configuration
 * @param redisClient - Redis client instance for distributed rate limiting
 * @returns Configured rate limiter options
 */
export const createRateLimitConfig = (
  env: IAppConfig['env'],
  type: keyof IEnvironmentRateLimits,
  redisClient?: Redis
): RateLimiterOptions => {
  const config = { ...defaultRateLimitConfig[env][type] };

  // Use Redis store for staging and production environments
  if ((env === 'staging' || env === 'production' || env === 'dr') && redisClient) {
    config.store = new RedisStore({
      prefix: `ratelimit:${type}:`,
      // Reuse existing Redis connection
      sendCommand: (...args: string[]) => redisClient.call(...args),
    });
  }

  return config;
};

// Export the complete rate limit configuration
export const rateLimitConfig = defaultRateLimitConfig;