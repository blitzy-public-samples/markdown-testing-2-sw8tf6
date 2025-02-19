import { createSelector } from '@reduxjs/toolkit'; // v1.9.5
import { RootState } from '../rootReducer';
import { INotificationState } from './notification.types';

/**
 * Base selector to access the notification state slice
 * Provides type-safe access to the complete notification state
 */
export const selectNotificationState = (state: RootState): INotificationState => state.notifications;

/**
 * Memoized selector for retrieving all notifications
 * Efficiently recomputes only when the notifications array changes
 * @returns Array of notifications with type safety
 */
export const selectAllNotifications = createSelector(
    [selectNotificationState],
    (notificationState): INotificationState['notifications'] => notificationState.notifications
);

/**
 * Memoized selector for the notification loading state
 * Used to show loading indicators in the UI
 * @returns Boolean indicating if notifications are being loaded
 */
export const selectNotificationLoading = createSelector(
    [selectNotificationState],
    (notificationState): boolean => notificationState.loading
);

/**
 * Memoized selector for notification error state
 * Provides type-safe access to error messages
 * @returns Error message string or null if no error
 */
export const selectNotificationError = createSelector(
    [selectNotificationState],
    (notificationState): string | null => notificationState.error
);

/**
 * Memoized selector for unread notification count
 * Efficiently tracks number of unread notifications for badges
 * @returns Number of unread notifications
 */
export const selectUnreadCount = createSelector(
    [selectNotificationState],
    (notificationState): number => notificationState.unreadCount
);

/**
 * Memoized selector for notification filters
 * Provides access to current filter settings
 * @returns Current notification filters configuration
 */
export const selectNotificationFilters = createSelector(
    [selectNotificationState],
    (notificationState): INotificationState['filters'] => notificationState.filters
);

/**
 * Memoized selector for last notification update timestamp
 * Used for tracking real-time updates and optimistic UI
 * @returns Date of last notification update
 */
export const selectLastUpdated = createSelector(
    [selectNotificationState],
    (notificationState): Date => notificationState.lastUpdated
);

/**
 * Memoized selector for filtered notifications
 * Applies current filters to notification list with optimal performance
 * @returns Filtered array of notifications
 */
export const selectFilteredNotifications = createSelector(
    [selectAllNotifications, selectNotificationFilters],
    (notifications, filters) => {
        return notifications.filter(notification => {
            const matchesPriority = filters.priority.length === 0 || 
                filters.priority.includes(notification.priority);
            
            const matchesStatus = filters.status.length === 0 || 
                filters.status.includes(notification.status);
            
            const matchesDate = notification.createdAt >= filters.dateRange.start &&
                notification.createdAt <= filters.dateRange.end;

            return matchesPriority && matchesStatus && matchesDate;
        });
    }
);