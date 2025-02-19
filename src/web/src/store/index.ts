import { configureStore, getDefaultMiddleware } from '@reduxjs/toolkit'; // v2.x
import { Store } from 'redux'; // v4.2.1
import rootReducer from './rootReducer';

/**
 * Development environment flag for conditional middleware configuration
 */
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Performance monitoring middleware
 * Tracks Redux action execution time and state update performance
 */
const performanceMiddleware = () => (next: any) => (action: any) => {
    const start = performance.now();
    const result = next(action);
    const end = performance.now();
    const duration = end - start;

    // Log performance metrics for actions taking longer than 16ms (1 frame)
    if (duration > 16) {
        console.warn(`Slow action: ${action.type} took ${duration.toFixed(2)}ms`);
    }

    return result;
};

/**
 * Error handling middleware
 * Captures and processes Redux-related errors with detailed logging
 */
const errorHandlingMiddleware = () => (next: any) => (action: any) => {
    try {
        return next(action);
    } catch (error) {
        console.error('Redux Error:', {
            action: action.type,
            payload: action.payload,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });

        // Re-throw error in development for better debugging
        if (isDevelopment) {
            throw error;
        }

        return error;
    }
};

/**
 * Configures and creates the Redux store with enhanced middleware
 * Implements performance monitoring, error handling, and development tools
 */
const configureAppStore = (): Store => {
    // Configure default middleware with customized settings
    const middleware = getDefaultMiddleware({
        // Enable immutability checks in development
        immutableCheck: isDevelopment,
        // Enable serializable checks with custom ignore patterns
        serializableCheck: {
            ignoredActions: [
                // Ignore Redux-Toolkit internal actions
                'persist/PERSIST',
                'persist/REHYDRATE',
                // Ignore Date objects in specific actions
                /\/(UPDATE|CREATE)_.*_SUCCESS$/
            ],
            ignoredPaths: ['payload.date', 'payload.dueDate', 'payload.startDate', 'payload.endDate']
        },
        // Thunk middleware configuration
        thunk: {
            extraArgument: undefined
        }
    }).concat([
        performanceMiddleware,
        errorHandlingMiddleware
    ]);

    // Create store with enhanced configuration
    const store = configureStore({
        reducer: rootReducer,
        middleware,
        devTools: isDevelopment && {
            // Redux DevTools configuration
            name: 'Task Management System',
            trace: true,
            traceLimit: 25,
            maxAge: 50
        },
        // Enable hot module replacement in development
        enhancers: isDevelopment ? [] : undefined
    });

    // Enable hot module replacement for reducers
    if (isDevelopment && module.hot) {
        module.hot.accept('./rootReducer', () => {
            const newRootReducer = require('./rootReducer').default;
            store.replaceReducer(newRootReducer);
        });
    }

    return store;
};

// Create and export the configured store instance
export const store = configureAppStore();

// Export type definitions for TypeScript support
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;

// Default export for the store instance
export default store;