/**
 * @fileoverview Defines core notification interfaces and types for the notification service
 * @version 1.0.0
 */

import { IBaseEntity } from '../../common/interfaces/base.interface';

/**
 * Enumeration of all possible notification types in the system
 */
export enum NotificationType {
    TASK_ASSIGNED = 'TASK_ASSIGNED',
    TASK_UPDATED = 'TASK_UPDATED',
    TASK_COMPLETED = 'TASK_COMPLETED',
    TASK_COMMENT = 'TASK_COMMENT',
    PROJECT_UPDATED = 'PROJECT_UPDATED',
    MENTION = 'MENTION',
    SYSTEM = 'SYSTEM'
}

/**
 * Enumeration of notification priority levels
 */
export enum NotificationPriority {
    HIGH = 'HIGH',
    MEDIUM = 'MEDIUM',
    LOW = 'LOW'
}

/**
 * Enumeration of possible notification status states
 */
export enum NotificationStatus {
    UNREAD = 'UNREAD',
    READ = 'READ',
    ARCHIVED = 'ARCHIVED'
}

/**
 * Enumeration of supported notification delivery methods
 */
export enum DeliveryMethod {
    WEBSOCKET = 'WEBSOCKET',
    EMAIL = 'EMAIL',
    PUSH = 'PUSH'
}

/**
 * Main notification interface extending base entity
 * Defines the structure for all notifications in the system
 */
export interface INotification extends IBaseEntity {
    /** ID of the user who should receive the notification */
    userId: string;

    /** Type of the notification */
    type: NotificationType;

    /** Short summary of the notification */
    title: string;

    /** Detailed notification message */
    message: string;

    /** Priority level of the notification */
    priority: NotificationPriority;

    /** Current status of the notification */
    status: NotificationStatus;

    /** Methods through which the notification should be delivered */
    deliveryMethod: DeliveryMethod[];

    /** Additional contextual data for the notification */
    metadata: Record<string, any>;

    /** Timestamp when the notification was created */
    createdAt: Date;

    /** Timestamp when the notification was last updated */
    updatedAt: Date;
}

/**
 * Interface for filtering notifications in queries
 * Used for retrieving notifications based on specific criteria
 */
export interface INotificationFilter {
    /** Filter by user ID */
    userId?: string;

    /** Filter by notification type */
    type?: NotificationType;

    /** Filter by notification status */
    status?: NotificationStatus;

    /** Filter by priority level */
    priority?: NotificationPriority;

    /** Filter by start date */
    startDate?: Date;

    /** Filter by end date */
    endDate?: Date;
}