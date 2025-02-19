/**
 * Core configuration interfaces for the Task Management System backend services.
 * Provides comprehensive type safety and validation for environment, service,
 * and infrastructure settings across all microservices.
 * @version 1.0.0
 */

/**
 * Core application configuration interface
 * Defines essential application settings including environment, security, and service identification
 */
export interface IAppConfig {
  /** Current deployment environment */
  env: 'development' | 'staging' | 'production' | 'dr';
  /** Port number for the service to listen on */
  port: number;
  /** Service version identifier */
  version: string;
  /** Unique service name identifier */
  serviceName: string;
  /** Flag indicating if secure protocols are enforced */
  isSecure: boolean;
  /** Allowed CORS origins */
  corsOrigins: string[];
}

/**
 * Database configuration interface
 * Supports PostgreSQL configuration with replication and security settings
 */
export interface IDbConfig {
  /** Database host address */
  host: string;
  /** Database port number */
  port: number;
  /** Database name */
  database: string;
  /** Database username */
  username: string;
  /** Database password */
  password: string;
  /** SSL connection flag */
  ssl: boolean;
  /** Replica set identifier for clustering */
  replicaSet: string;
  /** Read preference for replica sets */
  readPreference: 'primary' | 'secondary' | 'nearest';
}

/**
 * Cache configuration interface
 * Defines Redis cache settings with clustering support
 */
export interface ICacheConfig {
  /** Cache server host address */
  host: string;
  /** Cache server port number */
  port: number;
  /** Cache server password */
  password: string;
  /** Default TTL in seconds */
  ttl: number;
  /** Cluster mode flag */
  cluster: boolean;
  /** Key prefix for namespace isolation */
  keyPrefix: string;
}

/**
 * Authentication configuration interface
 * Comprehensive security settings for authentication and authorization
 */
export interface IAuthConfig {
  /** JWT signing secret */
  jwtSecret: string;
  /** JWT token expiration time */
  jwtExpiresIn: string;
  /** Refresh token expiration time */
  refreshTokenExpiresIn: string;
  /** MFA enforcement flag */
  mfaEnabled: boolean;
  /** Password policy configuration */
  passwordPolicy: {
    minLength: number;
    requireSpecialChars: boolean;
    requireNumbers: boolean;
  };
  /** Rate limiting configuration */
  rateLimiting: {
    enabled: boolean;
    maxAttempts: number;
    windowMs: number;
  };
}

/**
 * Storage configuration interface
 * Supports multiple storage providers with encryption capabilities
 */
export interface IStorageConfig {
  /** Storage provider type */
  provider: 's3' | 'local';
  /** Storage bucket/container name */
  bucket: string;
  /** Storage region identifier */
  region: string;
  /** Storage access credentials */
  accessKey: string;
  /** Storage secret credentials */
  secretKey: string;
  /** Storage encryption configuration */
  encryption: {
    enabled: boolean;
    algorithm: string;
    key?: string;
  };
}

/**
 * Email service configuration interface
 * Supports multiple email providers with template management
 */
export interface IEmailConfig {
  /** Email service provider */
  provider: 'sendgrid' | 'smtp';
  /** Provider API key */
  apiKey: string;
  /** Default sender email */
  fromEmail: string;
  /** Default sender name */
  fromName: string;
  /** Email template mappings */
  templates: {
    [key: string]: string;
  };
}

/**
 * Monitoring configuration interface
 * Defines observability settings including metrics, tracing, and alerting
 */
export interface IMonitoringConfig {
  /** Monitoring enabled flag */
  enabled: boolean;
  /** Metrics server port */
  metricsPort: number;
  /** Application log level */
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  /** Distributed tracing configuration */
  tracing: {
    enabled: boolean;
    samplingRate: number;
  };
  /** Alert notification configuration */
  alerting: {
    enabled: boolean;
    endpoints: string[];
  };
}