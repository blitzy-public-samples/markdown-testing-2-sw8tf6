/**
 * API Constants
 * Defines core API-related constants used throughout the application for making HTTP requests
 * to backend microservices.
 * @version 1.0.0
 */

/**
 * Current API version used in request headers
 */
export const API_VERSION = '1.0.0';

/**
 * Environment-specific API base URLs
 */
export const API_BASE_URL: Record<string, string> = {
    development: 'http://localhost:3000',
    staging: 'https://api-staging.taskmanager.com',
    production: 'https://api.taskmanager.com'
};

/**
 * Default timeout for API requests in milliseconds
 * Set to 2000ms (2 seconds) to meet performance requirements
 */
export const API_TIMEOUT = 2000;

/**
 * Default headers included with every API request
 * Includes rate limiting of 100 requests per minute
 */
export const API_HEADERS: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Client-Version': API_VERSION,
    'X-Rate-Limit': '100/min'
};

/**
 * Collection of API endpoint paths organized by feature
 */
export const API_ENDPOINTS = {
    AUTH: {
        LOGIN: '/auth/login',
        REGISTER: '/auth/register',
        REFRESH: '/auth/refresh',
        LOGOUT: '/auth/logout',
        VERIFY: '/auth/verify',
        RESET_PASSWORD: '/auth/reset-password'
    },
    TASKS: {
        BASE: '/tasks',
        BY_ID: '/tasks/:id',
        COMMENTS: '/tasks/:id/comments',
        ATTACHMENTS: '/tasks/:id/attachments',
        ASSIGN: '/tasks/:id/assign',
        STATUS: '/tasks/:id/status'
    },
    PROJECTS: {
        BASE: '/projects',
        BY_ID: '/projects/:id',
        TASKS: '/projects/:id/tasks',
        MEMBERS: '/projects/:id/members',
        SETTINGS: '/projects/:id/settings',
        ANALYTICS: '/projects/:id/analytics'
    },
    NOTIFICATIONS: {
        BASE: '/notifications',
        MARK_READ: '/notifications/mark-read',
        PREFERENCES: '/notifications/preferences',
        SUBSCRIBE: '/notifications/subscribe',
        UNSUBSCRIBE: '/notifications/unsubscribe'
    },
    USER: {
        PROFILE: '/user/profile',
        SETTINGS: '/user/settings',
        PREFERENCES: '/user/preferences',
        ACTIVITY: '/user/activity'
    }
} as const;

/**
 * HTTP status codes used in API responses
 */
export const HTTP_STATUS: Record<string, number> = {
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
};