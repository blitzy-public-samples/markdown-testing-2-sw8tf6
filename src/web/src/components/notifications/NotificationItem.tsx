import React, { useCallback, useMemo, useState, useRef } from 'react';
import classnames from 'classnames'; // v2.x
import { INotification, NotificationType, NotificationPriority } from '../../interfaces/notification.interface';
import { Tooltip } from '../common/Tooltip';
import { formatDate } from '../../utils/date.util';

interface NotificationItemProps {
  /** The notification data to display */
  notification: INotification;
  /** Callback when notification is marked as read */
  onRead: (id: string) => void;
  /** Callback when notification is archived */
  onArchive: (id: string) => void;
  /** Callback when notification is clicked */
  onClick: (notification: INotification) => void;
  /** Additional CSS class names */
  className?: string;
  /** Test ID for automated testing */
  testId?: string;
  /** RTL support flag */
  isRTL?: boolean;
  /** Animation duration in milliseconds */
  animationDuration?: number;
}

const getNotificationIcon = (type: NotificationType): string => {
  switch (type) {
    case NotificationType.TASK_ASSIGNED:
      return 'task-assigned-icon';
    case NotificationType.TASK_UPDATED:
      return 'task-updated-icon';
    case NotificationType.TASK_COMPLETED:
      return 'task-completed-icon';
    case NotificationType.TASK_COMMENT:
      return 'task-comment-icon';
    case NotificationType.TASK_DUE_SOON:
      return 'task-due-soon-icon';
    case NotificationType.PROJECT_CREATED:
      return 'project-created-icon';
    case NotificationType.PROJECT_UPDATED:
      return 'project-updated-icon';
    case NotificationType.PROJECT_COMPLETED:
      return 'project-completed-icon';
    case NotificationType.MENTION:
      return 'mention-icon';
    case NotificationType.SYSTEM:
      return 'system-icon';
    default:
      return 'default-notification-icon';
  }
};

const getNotificationColor = (priority: NotificationPriority): string => {
  switch (priority) {
    case NotificationPriority.HIGH:
      return 'notification-priority-high';
    case NotificationPriority.MEDIUM:
      return 'notification-priority-medium';
    case NotificationPriority.LOW:
      return 'notification-priority-low';
    default:
      return 'notification-priority-default';
  }
};

const NotificationItem: React.FC<NotificationItemProps> = React.memo(({
  notification,
  onRead,
  onArchive,
  onClick,
  className,
  testId = 'notification-item',
  isRTL = false,
  animationDuration = 200
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout>();

  const handleMouseEnter = useCallback(() => {
    clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 50); // Debounced hover
  }, []);

  const handleMouseLeave = useCallback(() => {
    clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 50);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onClick(notification);
  }, [notification, onClick]);

  const handleReadClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onRead(notification.id);
  }, [notification.id, onRead]);

  const handleArchiveClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onArchive(notification.id);
  }, [notification.id, onArchive]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(notification);
    }
  }, [notification, onClick]);

  const formattedDate = useMemo(() => 
    formatDate(notification.createdAt, 'MMM dd, yyyy HH:mm'),
    [notification.createdAt]
  );

  const notificationIcon = useMemo(() => 
    getNotificationIcon(notification.type),
    [notification.type]
  );

  const priorityClass = useMemo(() => 
    getNotificationColor(notification.priority),
    [notification.priority]
  );

  return (
    <div
      ref={itemRef}
      className={classnames(
        'notification-item',
        priorityClass,
        {
          'notification-item--unread': notification.status === 'UNREAD',
          'notification-item--hovered': isHovered,
          'notification-item--expanded': isExpanded,
          'notification-item--rtl': isRTL,
          'hardware-accelerated': true
        },
        className
      )}
      style={{
        '--animation-duration': `${animationDuration}ms`
      } as React.CSSProperties}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onKeyDown={handleKeyDown}
      role="listitem"
      tabIndex={0}
      data-testid={testId}
      aria-label={`${notification.title} - ${notification.message}`}
    >
      <div className="notification-item__icon">
        <i className={notificationIcon} aria-hidden="true" />
      </div>

      <div className="notification-item__content">
        <div className="notification-item__header">
          <h3 className="notification-item__title">
            {notification.title}
          </h3>
          <Tooltip content={formattedDate}>
            <time 
              className="notification-item__time"
              dateTime={notification.createdAt.toISOString()}
            >
              {formattedDate}
            </time>
          </Tooltip>
        </div>

        <p className="notification-item__message">
          {notification.message}
        </p>

        {notification.metadata && (
          <div className="notification-item__metadata">
            {Object.entries(notification.metadata).map(([key, value]) => (
              <span key={key} className="notification-item__metadata-item">
                {key}: {value}
              </span>
            ))}
          </div>
        )}
      </div>

      <div 
        className={classnames(
          'notification-item__actions',
          { 'notification-item__actions--visible': isHovered }
        )}
      >
        <Tooltip content="Mark as read">
          <button
            className="notification-item__action-btn"
            onClick={handleReadClick}
            aria-label="Mark as read"
          >
            <i className="read-icon" aria-hidden="true" />
          </button>
        </Tooltip>
        
        <Tooltip content="Archive">
          <button
            className="notification-item__action-btn"
            onClick={handleArchiveClick}
            aria-label="Archive notification"
          >
            <i className="archive-icon" aria-hidden="true" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
});

NotificationItem.displayName = 'NotificationItem';

export default NotificationItem;