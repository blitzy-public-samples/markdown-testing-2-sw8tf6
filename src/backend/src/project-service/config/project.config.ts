/**
 * Project Service Configuration
 * Defines comprehensive configuration settings for the project management service
 * including database, caching, validation rules, and performance optimizations.
 * @version 1.0.0
 */

import { config } from 'dotenv'; // v16.3.1
import { IAppConfig, IDbConfig, ICacheConfig } from '../../common/interfaces/config.interface';
import { ProjectStatus } from '../interfaces/project.interface';

// Load environment variables
config();

/**
 * Extended project service configuration interface
 * Includes service-specific settings and performance optimizations
 */
export interface IProjectConfig {
  app: IAppConfig;
  db: IDbConfig;
  cache: ICacheConfig;
  validation: {
    projectName: {
      minLength: number;
      maxLength: number;
      pattern: RegExp;
    };
    description: {
      maxLength: number;
    };
    members: {
      maxCount: number;
    };
  };
  performance: {
    maxProjectsPerPage: number;
    maxConcurrentOperations: number;
    cacheEnabled: boolean;
    queryTimeout: number;
  };
  monitoring: {
    metricsEnabled: boolean;
    slowQueryThreshold: number;
    errorThreshold: number;
  };
}

/**
 * Loads and validates the project service configuration
 * Applies environment-specific overrides and performance optimizations
 */
const loadConfig = (): IProjectConfig => {
  // Validate required environment variables
  if (!process.env.DB_HOST || !process.env.DB_NAME) {
    throw new Error('Missing required database configuration');
  }

  // Base configuration object
  const config: IProjectConfig = {
    app: {
      env: (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development',
      port: parseInt(process.env.PORT || '3002', 10),
      version: '1.0.0',
      serviceName: 'project-service',
      isSecure: process.env.NODE_ENV === 'production',
      corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000']
    },
    db: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME,
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      ssl: process.env.DB_SSL === 'true',
      replicaSet: process.env.DB_REPLICA_SET || '',
      readPreference: 'primary'
    },
    cache: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || '',
      ttl: parseInt(process.env.CACHE_TTL || '3600', 10),
      cluster: process.env.REDIS_CLUSTER === 'true',
      keyPrefix: 'project:'
    },
    validation: {
      projectName: {
        minLength: 3,
        maxLength: 100,
        pattern: /^[a-zA-Z0-9\s\-_]+$/
      },
      description: {
        maxLength: 2000
      },
      members: {
        maxCount: 100
      }
    },
    performance: {
      maxProjectsPerPage: 50,
      maxConcurrentOperations: 10,
      cacheEnabled: true,
      queryTimeout: 5000 // 5 seconds
    },
    monitoring: {
      metricsEnabled: true,
      slowQueryThreshold: 1000, // 1 second
      errorThreshold: 5 // errors per minute
    }
  };

  // Environment-specific overrides
  switch (config.app.env) {
    case 'production':
      config.performance.maxProjectsPerPage = 100;
      config.performance.maxConcurrentOperations = 20;
      config.cache.ttl = 7200; // 2 hours
      config.validation.members.maxCount = 500;
      break;
    case 'staging':
      config.performance.maxProjectsPerPage = 75;
      config.performance.maxConcurrentOperations = 15;
      config.cache.ttl = 3600; // 1 hour
      config.validation.members.maxCount = 200;
      break;
    case 'development':
      config.performance.maxProjectsPerPage = 25;
      config.performance.maxConcurrentOperations = 5;
      config.cache.ttl = 300; // 5 minutes
      config.monitoring.metricsEnabled = false;
      break;
  }

  return config;
};

// Export the validated configuration
export const projectConfig = loadConfig();

// Export constants for project status validation
export const PROJECT_STATUS_VALUES = Object.values(ProjectStatus);