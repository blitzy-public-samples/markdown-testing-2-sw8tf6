import { Action } from 'redux'; // v4.2.1
import { 
    INotification, 
    NotificationType, 
    NotificationStatus, 
    NotificationPriority 
} from '../../interfaces/notification.interface';

/**
 * Enum defining all possible Redux action types for notification management
 */
export enum NotificationActionTypes {
    FETCH_NOTIFICATIONS_REQUEST = '@notification/FETCH_NOTIFICATIONS_REQUEST',
    FETCH_NOTIFICATIONS_SUCCESS = '@notification/FETCH_NOTIFICATIONS_SUCCESS',
    FETCH_NOTIFICATIONS_FAILURE = '@notification/FETCH_NOTIFICATIONS_FAILURE',
    MARK_NOTIFICATION_READ = '@notification/MARK_NOTIFICATION_READ',
    MARK_ALL_NOTIFICATIONS_READ = '@notification/MARK_ALL_NOTIFICATIONS_READ',
    CLEAR_NOTIFICATIONS = '@notification/CLEAR_NOTIFICATIONS',
    RECEIVE_NOTIFICATION = '@notification/RECEIVE_NOTIFICATION',
    UPDATE_NOTIFICATION_PRIORITY = '@notification/UPDATE_NOTIFICATION_PRIORITY',
    FILTER_NOTIFICATIONS = '@notification/FILTER_NOTIFICATIONS'
}

/**
 * Interface defining the shape of notification filters
 */
export interface NotificationFilters {
    priority: NotificationPriority[];
    status: NotificationStatus[];
    dateRange: {
        start: Date;
        end: Date;
    };
}

/**
 * Interface defining the shape of the notification state in Redux store
 */
export interface INotificationState {
    notifications: INotification[];
    loading: boolean;
    error: string | null;
    unreadCount: number;
    filters: NotificationFilters;
    lastUpdated: Date;
}

/**
 * Action interfaces for type-safe notification management
 */
export interface IFetchNotificationsRequestAction extends Action {
    type: NotificationActionTypes.FETCH_NOTIFICATIONS_REQUEST;
}

export interface IFetchNotificationsSuccessAction extends Action {
    type: NotificationActionTypes.FETCH_NOTIFICATIONS_SUCCESS;
    payload: INotification[];
}

export interface IFetchNotificationsFailureAction extends Action {
    type: NotificationActionTypes.FETCH_NOTIFICATIONS_FAILURE;
    payload: string;
}

export interface IMarkNotificationReadAction extends Action {
    type: NotificationActionTypes.MARK_NOTIFICATION_READ;
    payload: string; // notification id
}

export interface IMarkAllNotificationsReadAction extends Action {
    type: NotificationActionTypes.MARK_ALL_NOTIFICATIONS_READ;
}

export interface IClearNotificationsAction extends Action {
    type: NotificationActionTypes.CLEAR_NOTIFICATIONS;
}

export interface IReceiveNotificationAction extends Action {
    type: NotificationActionTypes.RECEIVE_NOTIFICATION;
    payload: INotification;
}

export interface IUpdateNotificationPriorityAction extends Action {
    type: NotificationActionTypes.UPDATE_NOTIFICATION_PRIORITY;
    payload: {
        id: string;
        priority: NotificationPriority;
    };
}

export interface IFilterNotificationsAction extends Action {
    type: NotificationActionTypes.FILTER_NOTIFICATIONS;
    payload: NotificationFilters;
}

/**
 * Union type of all possible notification actions
 */
export type NotificationAction =
    | IFetchNotificationsRequestAction
    | IFetchNotificationsSuccessAction
    | IFetchNotificationsFailureAction
    | IMarkNotificationReadAction
    | IMarkAllNotificationsReadAction
    | IClearNotificationsAction
    | IReceiveNotificationAction
    | IUpdateNotificationPriorityAction
    | IFilterNotificationsAction;