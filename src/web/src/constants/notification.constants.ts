import { NotificationType, NotificationPriority, NotificationStatus } from '../interfaces/notification.interface';

/**
 * Display duration in milliseconds for notifications based on priority
 * @version 1.0.0
 */
export const NOTIFICATION_DISPLAY_DURATION = {
    HIGH: 10000,    // 10 seconds for high priority
    MEDIUM: 7000,   // 7 seconds for medium priority
    LOW: 5000      // 5 seconds for low priority
} as const;

/**
 * Polling interval for fetching notifications when WebSocket is unavailable
 * Fallback mechanism for real-time updates
 * @version 1.0.0
 */
export const NOTIFICATION_POLLING_INTERVAL = 30000; // 30 seconds

/**
 * Maximum number of notifications to fetch in a single request
 * Helps with pagination and performance optimization
 * @version 1.0.0
 */
export const NOTIFICATION_BATCH_SIZE = 20;

/**
 * Comprehensive display configuration for each notification type
 * Includes accessibility, animation, and visual properties
 * @version 1.0.0
 */
export const NOTIFICATION_DISPLAY_CONFIG = {
    [NotificationType.TASK_ASSIGNED]: {
        icon: 'task_assignment',
        color: '#1976d2',
        sound: 'notification.mp3',
        position: 'top-right',
        animation: {
            enter: 'slide-right',
            exit: 'fade-out',
            duration: 300
        },
        accessibility: {
            role: 'alert',
            live: 'polite',
            description: 'New task assigned'
        }
    },
    [NotificationType.TASK_UPDATED]: {
        icon: 'update',
        color: '#2196f3',
        sound: 'update.mp3',
        position: 'top-right',
        animation: {
            enter: 'slide-right',
            exit: 'fade-out',
            duration: 300
        },
        accessibility: {
            role: 'status',
            live: 'polite',
            description: 'Task updated'
        }
    },
    [NotificationType.TASK_COMPLETED]: {
        icon: 'check_circle',
        color: '#4caf50',
        sound: 'success.mp3',
        position: 'top-right',
        animation: {
            enter: 'slide-up',
            exit: 'fade-out',
            duration: 400
        },
        accessibility: {
            role: 'alert',
            live: 'assertive',
            description: 'Task completed'
        }
    },
    [NotificationType.PROJECT_UPDATED]: {
        icon: 'folder',
        color: '#ff9800',
        sound: 'update.mp3',
        position: 'top-right',
        animation: {
            enter: 'slide-right',
            exit: 'fade-out',
            duration: 300
        },
        accessibility: {
            role: 'status',
            live: 'polite',
            description: 'Project updated'
        }
    },
    [NotificationType.MENTION]: {
        icon: 'alternate_email',
        color: '#e91e63',
        sound: 'mention.mp3',
        position: 'top-right',
        animation: {
            enter: 'bounce',
            exit: 'fade-out',
            duration: 400
        },
        accessibility: {
            role: 'alert',
            live: 'assertive',
            description: 'You were mentioned'
        }
    },
    [NotificationType.SYSTEM]: {
        icon: 'info',
        color: '#607d8b',
        sound: 'system.mp3',
        position: 'top-right',
        animation: {
            enter: 'fade-in',
            exit: 'fade-out',
            duration: 300
        },
        accessibility: {
            role: 'status',
            live: 'polite',
            description: 'System notification'
        }
    }
} as const;

/**
 * Maps notification status to corresponding Material Icons
 * Used for visual representation of notification states
 * @version 1.0.0
 */
export const NOTIFICATION_STATUS_ICONS = {
    [NotificationStatus.UNREAD]: 'mark_email_unread',
    [NotificationStatus.READ]: 'mark_email_read',
    [NotificationStatus.ARCHIVED]: 'archive'
} as const;

/**
 * Maps notification priorities to color codes
 * Used for visual distinction of notification importance
 * @version 1.0.0
 */
export const NOTIFICATION_PRIORITY_COLORS = {
    [NotificationPriority.HIGH]: '#f44336',    // Red
    [NotificationPriority.MEDIUM]: '#ff9800',  // Orange
    [NotificationPriority.LOW]: '#4caf50'      // Green
} as const;