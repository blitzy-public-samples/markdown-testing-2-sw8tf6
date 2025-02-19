/**
 * @fileoverview Task service configuration settings
 * Defines comprehensive configuration for task management including
 * limits, validation rules, caching strategies, and performance parameters
 * @version 1.0.0
 */

import { IAppConfig } from '../../common/interfaces/config.interface';
import { TaskStatus, TaskPriority } from '../interfaces/task.interface';

/**
 * Task service configuration interface
 */
interface ITaskConfig {
  limits: ITaskLimits;
  defaults: ITaskDefaults;
  cache: ITaskCache;
  validation: ITaskValidation;
}

/**
 * Task service limit configurations
 */
interface ITaskLimits {
  maxTasksPerPage: number;
  maxTitleLength: number;
  maxDescriptionLength: number;
  maxTagsPerTask: number;
  maxTagLength: number;
  maxAttachmentsPerTask: number;
  maxAttachmentSize: number; // in bytes
}

/**
 * Task default value configurations
 */
interface ITaskDefaults {
  status: TaskStatus;
  priority: TaskPriority;
  dueDateOffset: number; // in days
}

/**
 * Task validation rules
 */
interface ITaskValidation {
  dueDateRules: {
    minOffset: number; // minimum hours from now
    maxOffset: number; // maximum days from now
  };
  allowedAttachmentTypes: string[];
  tagRules: {
    minLength: number;
    allowedCharacters: RegExp;
  };
}

/**
 * Task caching configuration
 */
interface ITaskCache {
  ttl: number; // in seconds
  invalidationEvents: string[];
  warmupStrategy: {
    enabled: boolean;
    interval: number; // in minutes
  };
}

// Global constants
export const DEFAULT_TASK_STATUS = TaskStatus.TODO;
export const DEFAULT_TASK_PRIORITY = TaskPriority.MEDIUM;
export const MAX_TASKS_PER_PAGE = 100; // Performance requirement: max 100 tasks per view
export const MAX_TITLE_LENGTH = 200;
export const MAX_DESCRIPTION_LENGTH = 5000;
export const MAX_TAGS_PER_TASK = 10;
export const MAX_ATTACHMENTS_PER_TASK = 20;
export const TASK_CACHE_TTL = 300; // 5 minutes
export const MAX_TAG_LENGTH = 50;
export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_ATTACHMENT_TYPES = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg'];
export const CACHE_INVALIDATION_EVENTS = ['task.update', 'task.delete', 'project.update'];

/**
 * Environment-specific task configuration factory
 * @param appConfig Application configuration
 * @returns Task service configuration object
 */
export const getTaskConfig = (appConfig: IAppConfig): ITaskConfig => {
  const baseConfig: ITaskConfig = {
    limits: {
      maxTasksPerPage: MAX_TASKS_PER_PAGE,
      maxTitleLength: MAX_TITLE_LENGTH,
      maxDescriptionLength: MAX_DESCRIPTION_LENGTH,
      maxTagsPerTask: MAX_TAGS_PER_TASK,
      maxTagLength: MAX_TAG_LENGTH,
      maxAttachmentsPerTask: MAX_ATTACHMENTS_PER_TASK,
      maxAttachmentSize: MAX_ATTACHMENT_SIZE
    },
    defaults: {
      status: DEFAULT_TASK_STATUS,
      priority: DEFAULT_TASK_PRIORITY,
      dueDateOffset: 7 // Default due date is 7 days from creation
    },
    cache: {
      ttl: TASK_CACHE_TTL,
      invalidationEvents: CACHE_INVALIDATION_EVENTS,
      warmupStrategy: {
        enabled: true,
        interval: 30 // Warm up cache every 30 minutes
      }
    },
    validation: {
      dueDateRules: {
        minOffset: 1, // Minimum 1 hour from now
        maxOffset: 365 // Maximum 1 year from now
      },
      allowedAttachmentTypes: ALLOWED_ATTACHMENT_TYPES,
      tagRules: {
        minLength: 2,
        allowedCharacters: /^[a-zA-Z0-9-_]+$/
      }
    }
  };

  // Environment-specific overrides
  switch (appConfig.env) {
    case 'development':
      return {
        ...baseConfig,
        cache: {
          ...baseConfig.cache,
          ttl: 60, // Shorter cache in development
          warmupStrategy: {
            enabled: false,
            interval: 30
          }
        }
      };

    case 'staging':
      return {
        ...baseConfig,
        limits: {
          ...baseConfig.limits,
          maxAttachmentSize: 20 * 1024 * 1024 // 20MB in staging
        }
      };

    case 'production':
      return baseConfig;

    default:
      return baseConfig;
  }
};

// Export default configuration
export const taskConfig = getTaskConfig({
  env: 'production',
  port: 3000,
  version: '1.0.0',
  serviceName: 'task-service',
  isSecure: true,
  corsOrigins: ['https://app.taskmanager.com']
});