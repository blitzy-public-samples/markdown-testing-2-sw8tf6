/**
 * Notification Service Configuration
 * Defines comprehensive settings for notification delivery, rate limiting,
 * templates, and integration with email and WebSocket providers.
 * @version 1.0.0
 */

import { config } from 'dotenv'; // ^16.3.1
import { IAppConfig, IEmailConfig } from '../../common/interfaces/config.interface';
import { IWebSocketConfig } from './websocket.config';
import { NotificationType } from '../interfaces/notification.interface';

// Load environment variables
config();

// Default configuration constants
const DEFAULT_RATE_LIMITS = {
  maxPerMinute: 60,
  maxPerHour: 1000,
  maxPerUser: 100,
  cooldownPeriod: 60000 // 1 minute in milliseconds
};

const DEFAULT_RETRY_POLICY = {
  maxAttempts: 3,
  backoffMs: 1000,
  maxBackoffMs: 30000,
  jitterMs: 100
};

const DEFAULT_BATCH_PROCESSING = {
  maxBatchSize: 100,
  intervalMs: 5000,
  maxRetries: 3
};

/**
 * Notification service configuration interface
 * Defines comprehensive settings for all notification functionality
 */
export interface INotificationConfig {
  /** Global notification service enabled flag */
  enabled: boolean;

  /** Delivery method configurations */
  deliveryMethods: {
    websocket: {
      enabled: boolean;
      maxConnections: number;
      heartbeatInterval: number;
    };
    email: {
      enabled: boolean;
      provider: string;
      templatePath: string;
    };
    push: {
      enabled: boolean;
      platform: string;
      credentials: Record<string, any>;
    };
  };

  /** Rate limiting configuration */
  rateLimits: {
    maxPerMinute: number;
    maxPerHour: number;
    maxPerUser: number;
    cooldownPeriod: number;
  };

  /** Template configuration */
  templates: {
    path: string;
    defaultLocale: string;
    supportedLocales: string[];
    cacheTimeout: number;
  };

  /** Retry policy for failed notifications */
  retryPolicy: {
    maxAttempts: number;
    backoffMs: number;
    maxBackoffMs: number;
    jitterMs: number;
  };

  /** Batch processing configuration */
  batchProcessing: {
    enabled: boolean;
    maxBatchSize: number;
    intervalMs: number;
    maxRetries: number;
  };
}

/**
 * Loads and validates notification service configuration
 * Combines environment variables with default settings
 */
const loadNotificationConfig = (): INotificationConfig => {
  const env = (process.env.NODE_ENV || 'development') as IAppConfig['env'];
  
  // Environment-specific template paths
  const templatePaths = {
    development: './templates/dev',
    staging: './templates/staging',
    production: '/etc/taskmanager/notification-templates',
    dr: '/etc/taskmanager/notification-templates'
  };

  // Validate and parse numeric configurations
  const maxConnections = parseInt(process.env.NOTIFICATION_WS_MAX_CONNECTIONS || '10000', 10);
  const heartbeatInterval = parseInt(process.env.NOTIFICATION_WS_HEARTBEAT_INTERVAL || '30000', 10);
  const maxPerMinute = parseInt(process.env.NOTIFICATION_RATE_LIMIT_PER_MINUTE || DEFAULT_RATE_LIMITS.maxPerMinute.toString(), 10);
  const maxPerHour = parseInt(process.env.NOTIFICATION_RATE_LIMIT_PER_HOUR || DEFAULT_RATE_LIMITS.maxPerHour.toString(), 10);
  const maxPerUser = parseInt(process.env.NOTIFICATION_RATE_LIMIT_PER_USER || DEFAULT_RATE_LIMITS.maxPerUser.toString(), 10);

  return {
    enabled: process.env.NOTIFICATION_SERVICE_ENABLED !== 'false',

    deliveryMethods: {
      websocket: {
        enabled: process.env.NOTIFICATION_WEBSOCKET_ENABLED !== 'false',
        maxConnections,
        heartbeatInterval
      },
      email: {
        enabled: process.env.NOTIFICATION_EMAIL_ENABLED !== 'false',
        provider: process.env.EMAIL_PROVIDER || 'sendgrid',
        templatePath: process.env.EMAIL_TEMPLATE_PATH || templatePaths[env]
      },
      push: {
        enabled: process.env.NOTIFICATION_PUSH_ENABLED === 'true',
        platform: process.env.PUSH_NOTIFICATION_PLATFORM || 'firebase',
        credentials: {
          apiKey: process.env.PUSH_NOTIFICATION_API_KEY,
          projectId: process.env.PUSH_NOTIFICATION_PROJECT_ID
        }
      }
    },

    rateLimits: {
      maxPerMinute,
      maxPerHour,
      maxPerUser,
      cooldownPeriod: parseInt(process.env.NOTIFICATION_COOLDOWN_PERIOD || DEFAULT_RATE_LIMITS.cooldownPeriod.toString(), 10)
    },

    templates: {
      path: templatePaths[env],
      defaultLocale: process.env.DEFAULT_LOCALE || 'en',
      supportedLocales: (process.env.SUPPORTED_LOCALES || 'en,es,fr').split(','),
      cacheTimeout: parseInt(process.env.TEMPLATE_CACHE_TIMEOUT || '3600000', 10) // 1 hour
    },

    retryPolicy: {
      maxAttempts: parseInt(process.env.NOTIFICATION_RETRY_MAX_ATTEMPTS || DEFAULT_RETRY_POLICY.maxAttempts.toString(), 10),
      backoffMs: parseInt(process.env.NOTIFICATION_RETRY_BACKOFF_MS || DEFAULT_RETRY_POLICY.backoffMs.toString(), 10),
      maxBackoffMs: parseInt(process.env.NOTIFICATION_RETRY_MAX_BACKOFF_MS || DEFAULT_RETRY_POLICY.maxBackoffMs.toString(), 10),
      jitterMs: parseInt(process.env.NOTIFICATION_RETRY_JITTER_MS || DEFAULT_RETRY_POLICY.jitterMs.toString(), 10)
    },

    batchProcessing: {
      enabled: process.env.NOTIFICATION_BATCH_ENABLED !== 'false',
      maxBatchSize: parseInt(process.env.NOTIFICATION_BATCH_SIZE || DEFAULT_BATCH_PROCESSING.maxBatchSize.toString(), 10),
      intervalMs: parseInt(process.env.NOTIFICATION_BATCH_INTERVAL_MS || DEFAULT_BATCH_PROCESSING.intervalMs.toString(), 10),
      maxRetries: parseInt(process.env.NOTIFICATION_BATCH_MAX_RETRIES || DEFAULT_BATCH_PROCESSING.maxRetries.toString(), 10)
    }
  };
};

// Export the configured notification settings
const notificationConfig = loadNotificationConfig();
export default notificationConfig;