/**
 * Storage Configuration Module
 * Provides robust configuration management for file storage services with
 * comprehensive validation and secure credential handling.
 * @version 1.0.0
 */

import { config } from 'dotenv';
import { IStorageConfig } from '../../common/interfaces/config.interface';

// Initialize environment variables
config();

/**
 * Validates and sanitizes storage configuration settings
 * Implements comprehensive validation with secure credential handling
 */
const getStorageConfig = (): IStorageConfig => {
  // Validate storage provider
  const provider = process.env.STORAGE_PROVIDER as 's3' | 'local';
  if (!provider || !['s3', 'local'].includes(provider)) {
    throw new Error('Invalid or missing STORAGE_PROVIDER. Must be either "s3" or "local"');
  }

  // Validate bucket name
  const bucket = process.env.STORAGE_BUCKET;
  if (!bucket || bucket.trim().length === 0) {
    throw new Error('STORAGE_BUCKET is required');
  }

  // Initialize provider-specific configuration
  let storageConfig: IStorageConfig = {
    provider,
    bucket,
    region: '',
    accessKey: '',
    secretKey: '',
    encryption: {
      enabled: true,
      algorithm: 'AES-256'
    }
  };

  // Configure provider-specific settings
  if (provider === 's3') {
    const region = process.env.AWS_REGION;
    const accessKey = process.env.AWS_ACCESS_KEY_ID;
    const secretKey = process.env.AWS_SECRET_ACCESS_KEY;

    // Validate S3-specific requirements
    if (!region || region.trim().length === 0) {
      throw new Error('AWS_REGION is required for S3 storage');
    }

    if (!accessKey || !secretKey) {
      throw new Error('AWS credentials are required for S3 storage');
    }

    // Validate AWS region format
    const awsRegionPattern = /^[a-z]{2}-[a-z]+-\d{1}$/;
    if (!awsRegionPattern.test(region)) {
      throw new Error('Invalid AWS_REGION format');
    }

    storageConfig = {
      ...storageConfig,
      region,
      accessKey,
      secretKey,
    };
  } else {
    // Local storage configuration
    storageConfig = {
      ...storageConfig,
      region: 'local',
      accessKey: 'local',
      secretKey: 'local',
    };
  }

  // Apply environment-specific configurations
  const environment = process.env.NODE_ENV || 'development';
  switch (environment) {
    case 'production':
      // Enhanced security measures for production
      storageConfig.encryption.algorithm = 'AES-256-GCM';
      break;
    case 'staging':
      // Staging-specific configurations
      storageConfig.encryption.algorithm = 'AES-256-CBC';
      break;
    case 'development':
      // Development-specific configurations
      storageConfig.encryption.enabled = false;
      break;
    default:
      throw new Error(`Unsupported environment: ${environment}`);
  }

  return storageConfig;
};

/**
 * Validated storage configuration
 * Exports secure and validated storage settings with comprehensive type safety
 */
export const storageConfig: IStorageConfig = getStorageConfig();

/**
 * Re-export specific configuration values for convenience
 * while maintaining type safety
 */
export const {
  provider,
  bucket,
  region,
  encryption
} = storageConfig;