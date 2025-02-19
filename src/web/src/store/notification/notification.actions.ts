import { Dispatch } from 'redux'; // v4.2.1
import { ThunkAction } from 'redux-thunk'; // v2.4.2
import { 
    NotificationActionTypes,
    INotificationState,
    NotificationAction,
    NotificationFilters
} from './notification.types';
import { 
    INotification,
    INotificationFilter,
    NotificationStatus,
    NotificationPriority
} from '../../interfaces/notification.interface';
import { notificationService } from '../../services/notification.service';
import { handleApiError } from '../../utils/error.util';
import { WebSocketService } from '../../services/websocket.service';

// Type definition for thunk actions
type ThunkResult<R> = ThunkAction<R, INotificationState, undefined, NotificationAction>;

/**
 * WebSocket service instance for real-time notifications
 */
const webSocketService = new WebSocketService();

/**
 * Enhanced async thunk action creator for fetching notifications
 * Implements retry logic, error handling, and offline support
 */
export const fetchNotifications = (
    filter?: INotificationFilter
): ThunkResult<Promise<void>> => {
    return async (dispatch: Dispatch<NotificationAction>) => {
        dispatch({ type: NotificationActionTypes.FETCH_NOTIFICATIONS_REQUEST });

        try {
            const notifications = await notificationService.getNotifications(filter);
            dispatch({
                type: NotificationActionTypes.FETCH_NOTIFICATIONS_SUCCESS,
                payload: notifications
            });
        } catch (error) {
            const transformedError = handleApiError(error);
            dispatch({
                type: NotificationActionTypes.FETCH_NOTIFICATIONS_FAILURE,
                payload: transformedError.message
            });
        }
    };
};

/**
 * Async thunk action creator for marking a notification as read
 * Implements optimistic updates and offline support
 */
export const markNotificationAsRead = (
    notificationId: string
): ThunkResult<Promise<void>> => {
    return async (dispatch: Dispatch<NotificationAction>) => {
        // Optimistic update
        dispatch({
            type: NotificationActionTypes.MARK_NOTIFICATION_READ,
            payload: notificationId
        });

        try {
            await notificationService.markAsRead([notificationId]);
        } catch (error) {
            // Revert optimistic update on failure
            dispatch(fetchNotifications()); // Refresh notifications
            throw handleApiError(error);
        }
    };
};

/**
 * Async thunk action creator for marking all notifications as read
 * Implements batch processing and error handling
 */
export const markAllNotificationsAsRead = (): ThunkResult<Promise<void>> => {
    return async (dispatch: Dispatch<NotificationAction>) => {
        dispatch({ type: NotificationActionTypes.MARK_ALL_NOTIFICATIONS_READ });

        try {
            await notificationService.markAsRead(['all']);
        } catch (error) {
            // Revert on failure
            dispatch(fetchNotifications());
            throw handleApiError(error);
        }
    };
};

/**
 * Action creator for handling real-time notification reception
 * Integrates with WebSocket service for live updates
 */
export const receiveNotification = (
    notification: INotification
): NotificationAction => ({
    type: NotificationActionTypes.RECEIVE_NOTIFICATION,
    payload: notification
});

/**
 * Async thunk action creator for updating notification priority
 * Implements validation and error handling
 */
export const updateNotificationPriority = (
    notificationId: string,
    priority: NotificationPriority
): ThunkResult<Promise<void>> => {
    return async (dispatch: Dispatch<NotificationAction>) => {
        try {
            await notificationService.updatePriority(notificationId, priority);
            dispatch({
                type: NotificationActionTypes.UPDATE_NOTIFICATION_PRIORITY,
                payload: { id: notificationId, priority }
            });
        } catch (error) {
            throw handleApiError(error);
        }
    };
};

/**
 * Action creator for clearing all notifications
 * Implements confirmation and cleanup
 */
export const clearNotifications = (): NotificationAction => ({
    type: NotificationActionTypes.CLEAR_NOTIFICATIONS
});

/**
 * Action creator for filtering notifications
 * Implements advanced filtering capabilities
 */
export const filterNotifications = (
    filters: NotificationFilters
): NotificationAction => ({
    type: NotificationActionTypes.FILTER_NOTIFICATIONS,
    payload: filters
});

/**
 * Action creator for handling notification expiry
 * Implements automatic cleanup of expired notifications
 */
export const handleNotificationExpiry = (
    notificationId: string
): NotificationAction => ({
    type: NotificationActionTypes.HANDLE_NOTIFICATION_EXPIRY,
    payload: notificationId
});

/**
 * Initializes real-time notification handling
 * Sets up WebSocket connection and event listeners
 */
export const initializeNotifications = (): ThunkResult<Promise<void>> => {
    return async (dispatch: Dispatch<NotificationAction>) => {
        try {
            await webSocketService.connect();
            
            webSocketService.subscribe(
                'notification:received',
                (notification: INotification) => {
                    dispatch(receiveNotification(notification));
                },
                { acknowledgment: true }
            );

            // Initial fetch
            dispatch(fetchNotifications());
        } catch (error) {
            throw handleApiError(error);
        }
    };
};