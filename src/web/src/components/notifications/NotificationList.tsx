import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import classnames from 'classnames'; // v2.x
import { useIntersectionObserver } from 'react-intersection-observer'; // v9.x
import { ErrorBoundary } from 'react-error-boundary'; // v4.x
import { useVirtualList } from 'react-virtual'; // v2.x
import useSound from 'use-sound'; // v4.x

import { INotification, NotificationStatus, NotificationType, NotificationPriority } from '../../interfaces/notification.interface';
import NotificationItem from './NotificationItem';

// Sound effects for notifications
const NOTIFICATION_SOUND = '/assets/sounds/notification.mp3';

interface NotificationListProps {
  /** List of notifications to display */
  notifications: INotification[];
  /** Callback when a notification is clicked */
  onNotificationClick: (notification: INotification) => void;
  /** Filter settings for notifications */
  filter?: {
    types?: NotificationType[];
    statuses?: NotificationStatus[];
    priorities?: NotificationPriority[];
    searchText?: string;
    startDate?: Date;
    endDate?: Date;
  };
  /** Maximum height of the notification list */
  maxHeight?: string;
  /** Enable sound effects */
  enableSound?: boolean;
  /** Group notifications by date */
  groupByDate?: boolean;
  /** Sort order for notifications */
  sortOrder?: 'asc' | 'desc';
  /** Enable offline support */
  offlineSupport?: boolean;
  /** Additional CSS class names */
  className?: string;
}

const NotificationList: React.FC<NotificationListProps> = ({
  notifications,
  onNotificationClick,
  filter = {},
  maxHeight = '500px',
  enableSound = true,
  groupByDate = true,
  sortOrder = 'desc',
  offlineSupport = true,
  className
}) => {
  // State management
  const [filteredNotifications, setFilteredNotifications] = useState<INotification[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState<{ id: string; action: string }[]>([]);
  const [playSound] = useSound(NOTIFICATION_SOUND, { volume: 0.5 });
  
  // Refs
  const listRef = useRef<HTMLDivElement>(null);
  const lastNotificationRef = useRef<string | null>(null);

  // Virtual list setup for performance
  const { virtualItems, totalSize } = useVirtualList(filteredNotifications, {
    size: filteredNotifications.length,
    itemHeight: 80, // Estimated height of each notification item
    overscan: 5
  });

  // Intersection observer for infinite scroll
  const { ref: loadMoreRef, inView } = useIntersectionObserver({
    threshold: 0.5,
    rootMargin: '100px'
  });

  // Filter and sort notifications
  const processNotifications = useCallback(() => {
    let processed = [...notifications];

    // Apply filters
    if (filter.types?.length) {
      processed = processed.filter(n => filter.types?.includes(n.type));
    }
    if (filter.statuses?.length) {
      processed = processed.filter(n => filter.statuses?.includes(n.status));
    }
    if (filter.priorities?.length) {
      processed = processed.filter(n => filter.priorities?.includes(n.priority));
    }
    if (filter.searchText) {
      const searchLower = filter.searchText.toLowerCase();
      processed = processed.filter(n => 
        n.title.toLowerCase().includes(searchLower) || 
        n.message.toLowerCase().includes(searchLower)
      );
    }
    if (filter.startDate) {
      processed = processed.filter(n => n.createdAt >= filter.startDate!);
    }
    if (filter.endDate) {
      processed = processed.filter(n => n.createdAt <= filter.endDate!);
    }

    // Sort notifications
    processed.sort((a, b) => {
      const comparison = b.createdAt.getTime() - a.createdAt.getTime();
      return sortOrder === 'asc' ? -comparison : comparison;
    });

    setFilteredNotifications(processed);
  }, [notifications, filter, sortOrder]);

  // Group notifications by date if enabled
  const groupedNotifications = useMemo(() => {
    if (!groupByDate) return null;

    return filteredNotifications.reduce((groups, notification) => {
      const date = notification.createdAt.toLocaleDateString();
      return {
        ...groups,
        [date]: [...(groups[date] || []), notification]
      };
    }, {} as Record<string, INotification[]>);
  }, [filteredNotifications, groupByDate]);

  // Handle notification read status
  const handleNotificationRead = useCallback(async (id: string) => {
    if (!isOnline && offlineSupport) {
      setOfflineQueue(prev => [...prev, { id, action: 'read' }]);
      return;
    }

    try {
      // Update notification status
      const notification = notifications.find(n => n.id === id);
      if (notification && notification.status === NotificationStatus.UNREAD) {
        if (enableSound) {
          playSound();
        }
        // API call would go here
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [isOnline, offlineSupport, notifications, enableSound, playSound]);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Process offline queue when back online
  useEffect(() => {
    if (isOnline && offlineQueue.length > 0) {
      Promise.all(
        offlineQueue.map(async ({ id, action }) => {
          if (action === 'read') {
            await handleNotificationRead(id);
          }
        })
      ).then(() => {
        setOfflineQueue([]);
      });
    }
  }, [isOnline, offlineQueue, handleNotificationRead]);

  // Update filtered notifications when inputs change
  useEffect(() => {
    processNotifications();
  }, [processNotifications]);

  // Play sound for new notifications
  useEffect(() => {
    const lastNotification = notifications[0]?.id;
    if (
      enableSound &&
      lastNotification &&
      lastNotificationRef.current &&
      lastNotification !== lastNotificationRef.current
    ) {
      playSound();
    }
    lastNotificationRef.current = lastNotification;
  }, [notifications, enableSound, playSound]);

  // Error fallback component
  const ErrorFallback = ({ error }: { error: Error }) => (
    <div className="notification-error" role="alert">
      <p>Error loading notifications: {error.message}</p>
    </div>
  );

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div
        ref={listRef}
        className={classnames(
          'notification-list',
          { 'notification-list--offline': !isOnline },
          className
        )}
        style={{ maxHeight }}
        role="log"
        aria-live="polite"
        aria-label="Notifications"
      >
        {!isOnline && (
          <div className="notification-offline-banner" role="status">
            You're offline. Some features may be limited.
          </div>
        )}

        <div style={{ height: totalSize }} className="notification-list__viewport">
          {groupedNotifications ? (
            Object.entries(groupedNotifications).map(([date, groupNotifications]) => (
              <div key={date} className="notification-group">
                <div className="notification-group__header">
                  <h2>{date}</h2>
                </div>
                {virtualItems.map(virtualRow => {
                  const notification = groupNotifications[virtualRow.index];
                  if (!notification) return null;
                  return (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onRead={handleNotificationRead}
                      onClick={() => onNotificationClick(notification)}
                    />
                  );
                })}
              </div>
            ))
          ) : (
            virtualItems.map(virtualRow => {
              const notification = filteredNotifications[virtualRow.index];
              return (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={handleNotificationRead}
                  onClick={() => onNotificationClick(notification)}
                />
              );
            })
          )}
        </div>

        <div ref={loadMoreRef} className="notification-list__loader">
          {inView && filteredNotifications.length > 0 && (
            <span className="notification-list__loader-text">
              Loading more notifications...
            </span>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default NotificationList;