/**
 * Comprehensive enum defining all possible notification types in the system
 * @version 1.0.0
 */
export enum NotificationType {
    TASK_ASSIGNED = 'TASK_ASSIGNED',
    TASK_UPDATED = 'TASK_UPDATED',
    TASK_COMPLETED = 'TASK_COMPLETED',
    TASK_COMMENT = 'TASK_COMMENT',
    TASK_DUE_SOON = 'TASK_DUE_SOON',
    PROJECT_CREATED = 'PROJECT_CREATED',
    PROJECT_UPDATED = 'PROJECT_UPDATED',
    PROJECT_COMPLETED = 'PROJECT_COMPLETED',
    MENTION = 'MENTION',
    SYSTEM = 'SYSTEM'
}

/**
 * Defines notification priority levels for proper display and handling
 * @version 1.0.0
 */
export enum NotificationPriority {
    HIGH = 'HIGH',
    MEDIUM = 'MEDIUM',
    LOW = 'LOW'
}

/**
 * Defines all possible notification states for tracking notification lifecycle
 * @version 1.0.0
 */
export enum NotificationStatus {
    UNREAD = 'UNREAD',
    READ = 'READ',
    ARCHIVED = 'ARCHIVED',
    DELETED = 'DELETED'
}

/**
 * Comprehensive interface for notification data structure
 * Provides complete type safety for notification objects
 * @interface INotification
 */
export interface INotification {
    /** Unique identifier for the notification */
    id: string;
    
    /** ID of the user this notification is for */
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
    
    /** Additional contextual data for the notification */
    metadata: Record<string, any>;
    
    /** Timestamp when the notification was created */
    createdAt: Date;
    
    /** Timestamp when the notification was read (if applicable) */
    readAt: Date | null;
    
    /** Timestamp when the notification should expire (if applicable) */
    expiresAt: Date | null;
    
    /** URL to navigate to when notification is clicked (if applicable) */
    actionUrl: string | null;
}

/**
 * Interface for advanced notification filtering with pagination
 * @interface INotificationFilter
 */
export interface INotificationFilter {
    /** Filter by specific notification types */
    types: NotificationType[];
    
    /** Filter by notification statuses */
    statuses: NotificationStatus[];
    
    /** Filter by priority levels */
    priorities: NotificationPriority[];
    
    /** Filter notifications after this date */
    startDate: Date;
    
    /** Filter notifications before this date */
    endDate: Date;
    
    /** Search text to filter notifications */
    searchText: string;
    
    /** Maximum number of notifications to return */
    limit: number;
    
    /** Number of notifications to skip */
    offset: number;
}

/**
 * Interface for customizing notification display properties in the UI
 * Supports full accessibility and visual customization
 * @interface INotificationDisplay
 */
export interface INotificationDisplay {
    /** Icon to display with the notification */
    icon: string;
    
    /** Color theme for the notification */
    color: string;
    
    /** Duration to display the notification (in milliseconds) */
    duration: number;
    
    /** Position on screen to display the notification */
    position: string;
    
    /** Animation style for notification appearance/disappearance */
    animation: string;
    
    /** Whether to play a sound when showing the notification */
    sound: boolean;
    
    /** Whether the notification should automatically close */
    autoClose: boolean;
}