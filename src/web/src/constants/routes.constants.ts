/**
 * @fileoverview Route constants for the Task Management System
 * Defines all application routes with TypeScript type safety
 * @version 1.0.0
 */

/**
 * Public routes accessible without authentication
 */
export const PUBLIC_ROUTES = {
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password/:resetToken',
  MFA_SETUP: '/auth/mfa-setup',
  MFA_VERIFY: '/auth/mfa-verify',
  VERIFY_EMAIL: '/auth/verify-email/:verificationToken'
} as const;

/**
 * Protected routes requiring authentication
 */
export const PROTECTED_ROUTES = {
  DASHBOARD: '/dashboard',
  TASKS: {
    ROOT: '/tasks',
    LIST: '/tasks/list',
    CREATE: '/tasks/create',
    DETAILS: '/tasks/:taskId',
    EDIT: '/tasks/:taskId/edit',
    ARCHIVE: '/tasks/:taskId/archive',
    COMMENTS: '/tasks/:taskId/comments',
    ATTACHMENTS: '/tasks/:taskId/attachments'
  },
  PROJECTS: {
    ROOT: '/projects',
    LIST: '/projects/list',
    CREATE: '/projects/create',
    DETAILS: '/projects/:projectId',
    EDIT: '/projects/:projectId/edit',
    MEMBERS: '/projects/:projectId/members',
    TASKS: '/projects/:projectId/tasks',
    SETTINGS: '/projects/:projectId/settings'
  },
  SETTINGS: {
    ROOT: '/settings',
    PROFILE: '/settings/profile',
    SECURITY: '/settings/security',
    PREFERENCES: '/settings/preferences',
    NOTIFICATIONS: '/settings/notifications',
    INTEGRATIONS: '/settings/integrations',
    TEAM: '/settings/team'
  }
} as const;

/**
 * Error and system status routes
 */
export const ERROR_ROUTES = {
  NOT_FOUND: '/404',
  SERVER_ERROR: '/500',
  FORBIDDEN: '/403',
  UNAUTHORIZED: '/401',
  MAINTENANCE: '/maintenance',
  OFFLINE: '/offline'
} as const;

/**
 * URL parameter placeholders for dynamic routes
 */
export const ROUTE_PARAMS = {
  TASK_ID: ':taskId',
  PROJECT_ID: ':projectId',
  RESET_TOKEN: ':resetToken',
  VERIFICATION_TOKEN: ':verificationToken',
  COMMENT_ID: ':commentId',
  ATTACHMENT_ID: ':attachmentId',
  MEMBER_ID: ':memberId'
} as const;

/**
 * Default redirect paths for different authentication states
 */
export const DEFAULT_REDIRECT = {
  AUTHENTICATED: '/dashboard',
  UNAUTHENTICATED: '/auth/login',
  MFA_REQUIRED: '/auth/mfa-verify',
  EMAIL_VERIFICATION_REQUIRED: '/auth/verify-email'
} as const;

// Type definitions for route constants
type ValueOf<T> = T[keyof T];
type RouteString = ValueOf<typeof PUBLIC_ROUTES> | ValueOf<typeof ERROR_ROUTES> | ValueOf<typeof DEFAULT_REDIRECT>;
type NestedRouteString = ValueOf<typeof PROTECTED_ROUTES> | ValueOf<typeof ROUTE_PARAMS>;

// Ensure all routes are readonly at compile time
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

export type PublicRoutes = DeepReadonly<typeof PUBLIC_ROUTES>;
export type ProtectedRoutes = DeepReadonly<typeof PROTECTED_ROUTES>;
export type ErrorRoutes = DeepReadonly<typeof ERROR_ROUTES>;
export type RouteParams = DeepReadonly<typeof ROUTE_PARAMS>;
export type DefaultRedirects = DeepReadonly<typeof DEFAULT_REDIRECT>;