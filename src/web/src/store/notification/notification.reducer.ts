import { Reducer } from 'redux'; // v4.2.1
import { NotificationActionTypes, INotificationState } from './notification.types';
import { NotificationStatus } from '../../interfaces/notification.interface';

/**
 * Initial state for the notification reducer
 * Implements efficient state management for real-time notifications
 */
const initialState: INotificationState = {
    notifications: [],
    loading: false,
    error: null,
    unreadCount: 0,
    filters: {
        priority: [],
        status: [],
        dateRange: {
            start: new Date(0),
            end: new Date()
        }
    },
    lastUpdated: new Date()
};

/**
 * Calculates the unread notification count efficiently
 * @param notifications Array of notifications to count unread from
 * @returns Number of unread notifications
 */
const calculateUnreadCount = (notifications: INotificationState['notifications']): number => {
    return notifications.reduce((count, notification) => 
        notification.status === NotificationStatus.UNREAD ? count + 1 : count, 0);
};

/**
 * Redux reducer for managing notification state
 * Implements optimized state updates and real-time capabilities
 */
export const notificationReducer: Reducer<INotificationState, any> = (
    state = initialState,
    action
): INotificationState => {
    switch (action.type) {
        case NotificationActionTypes.FETCH_NOTIFICATIONS_REQUEST:
            return {
                ...state,
                loading: true,
                error: null
            };

        case NotificationActionTypes.FETCH_NOTIFICATIONS_SUCCESS:
            return {
                ...state,
                loading: false,
                notifications: action.payload,
                unreadCount: calculateUnreadCount(action.payload),
                lastUpdated: new Date()
            };

        case NotificationActionTypes.FETCH_NOTIFICATIONS_FAILURE:
            return {
                ...state,
                loading: false,
                error: action.payload,
                lastUpdated: new Date()
            };

        case NotificationActionTypes.MARK_NOTIFICATION_READ: {
            const updatedNotifications = state.notifications.map(notification =>
                notification.id === action.payload
                    ? { ...notification, status: NotificationStatus.READ, readAt: new Date() }
                    : notification
            );

            return {
                ...state,
                notifications: updatedNotifications,
                unreadCount: calculateUnreadCount(updatedNotifications),
                lastUpdated: new Date()
            };
        }

        case NotificationActionTypes.MARK_ALL_NOTIFICATIONS_READ: {
            const updatedNotifications = state.notifications.map(notification => ({
                ...notification,
                status: NotificationStatus.READ,
                readAt: new Date()
            }));

            return {
                ...state,
                notifications: updatedNotifications,
                unreadCount: 0,
                lastUpdated: new Date()
            };
        }

        case NotificationActionTypes.CLEAR_NOTIFICATIONS:
            return {
                ...initialState,
                filters: state.filters, // Preserve filters
                lastUpdated: new Date()
            };

        case NotificationActionTypes.RECEIVE_NOTIFICATION: {
            // Optimized array operation for real-time updates
            const updatedNotifications = [action.payload, ...state.notifications];
            
            return {
                ...state,
                notifications: updatedNotifications,
                unreadCount: state.unreadCount + 1,
                lastUpdated: new Date()
            };
        }

        case NotificationActionTypes.UPDATE_NOTIFICATION_PRIORITY: {
            const updatedNotifications = state.notifications.map(notification =>
                notification.id === action.payload.id
                    ? { ...notification, priority: action.payload.priority }
                    : notification
            );

            return {
                ...state,
                notifications: updatedNotifications,
                lastUpdated: new Date()
            };
        }

        case NotificationActionTypes.FILTER_NOTIFICATIONS:
            return {
                ...state,
                filters: {
                    ...state.filters,
                    ...action.payload
                },
                lastUpdated: new Date()
            };

        default:
            return state;
    }
};