import { combineReducers } from '@reduxjs/toolkit'; // v2.x
import authReducer from './auth/auth.reducer';
import notificationReducer from './notification/notification.reducer';
import projectReducer from './project/project.reducer';
import taskReducer from './task/task.reducer';

/**
 * Root reducer configuration that combines all feature reducers
 * Implements centralized state management with real-time update capabilities
 * and performance optimization
 * 
 * State Structure:
 * - auth: Authentication state with JWT and MFA support
 * - notifications: Real-time notification system
 * - projects: Project management with optimistic updates
 * - tasks: Task management with WebSocket sync
 */
const rootReducer = combineReducers({
    /**
     * Authentication state slice
     * Handles user sessions, MFA, and token management
     */
    auth: authReducer,

    /**
     * Notification state slice
     * Manages system-wide notifications with real-time updates
     */
    notifications: notificationReducer,

    /**
     * Project state slice
     * Handles project data with optimistic updates and filtering
     */
    projects: projectReducer,

    /**
     * Task state slice
     * Manages tasks with real-time sync and WebSocket integration
     */
    tasks: taskReducer
});

/**
 * Type definition for the complete Redux state tree
 * Provides type safety for state access throughout the application
 */
export type RootState = ReturnType<typeof rootReducer>;

/**
 * Export the root reducer as the default export
 * Used by the store configuration for state management setup
 */
export default rootReducer;