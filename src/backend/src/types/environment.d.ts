/**
 * Type declarations for environment variables used across all microservices in the Task Management System.
 * Extends the NodeJS.ProcessEnv interface to provide type safety for configuration values.
 * @version 1.0.0
 */

import { IAppConfig } from '../common/interfaces/config.interface';

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      /**
       * Current deployment environment
       * @default 'development'
       */
      NODE_ENV: IAppConfig['env'];

      /**
       * Service port number
       * @default '3000'
       */
      PORT: string;

      /**
       * API version identifier
       * @example 'v1'
       */
      API_VERSION: string;

      /**
       * JWT secret key for token signing
       * @security sensitive
       */
      JWT_SECRET: string;

      /**
       * Multi-factor authentication toggle
       * @default 'false'
       */
      MFA_ENABLED: string;

      /**
       * PostgreSQL database host
       * @example 'localhost'
       */
      DB_HOST: string;

      /**
       * PostgreSQL database port
       * @default '5432'
       */
      DB_PORT: string;

      /**
       * PostgreSQL database username
       * @security sensitive
       */
      DB_USERNAME: string;

      /**
       * PostgreSQL database password
       * @security sensitive
       */
      DB_PASSWORD: string;

      /**
       * PostgreSQL database name
       */
      DB_DATABASE: string;

      /**
       * Redis cache host
       * @example 'localhost'
       */
      REDIS_HOST: string;

      /**
       * Redis cache port
       * @default '6379'
       */
      REDIS_PORT: string;

      /**
       * Redis cache password
       * @security sensitive
       */
      REDIS_PASSWORD: string;

      /**
       * AWS S3 bucket name for file storage
       */
      AWS_S3_BUCKET: string;

      /**
       * AWS region for services
       * @example 'us-east-1'
       */
      AWS_REGION: string;

      /**
       * AWS access key ID
       * @security sensitive
       */
      AWS_ACCESS_KEY_ID: string;

      /**
       * AWS secret access key
       * @security sensitive
       */
      AWS_SECRET_ACCESS_KEY: string;

      /**
       * SendGrid API key for email service
       * @security sensitive
       */
      SENDGRID_API_KEY: string;

      /**
       * Default sender email address
       * @example 'noreply@taskmanager.com'
       */
      EMAIL_FROM: string;

      /**
       * Application logging level
       * @default 'info'
       */
      LOG_LEVEL: 'trace' | 'debug' | 'info' | 'warn' | 'error';

      /**
       * Log output format
       * @default 'json'
       */
      LOG_FORMAT: 'json' | 'text';

      /**
       * Allowed CORS origins (comma-separated)
       * @example 'http://localhost:3000,https://app.taskmanager.com'
       */
      CORS_ORIGINS: string;

      /**
       * Rate limiting configuration in JSON format
       * @example '{"windowMs":900000,"max":100}'
       */
      RATE_LIMIT_CONFIG: string;
    }
  }
}

// Export the ProcessEnv interface to make it available for import
export {};