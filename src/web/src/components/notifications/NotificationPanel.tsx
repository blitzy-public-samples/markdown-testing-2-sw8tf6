import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import classnames from 'classnames'; // v2.x
import { useWebSocket, ConnectionState } from '../../hooks/useWebSocket';
import NotificationList from './NotificationList';
import { INotification, NotificationStatus } from '../../interfaces/notification.interface';
import { formatDate } from '../../utils/date.util';

interface NotificationPanelProps {
  /** Additional CSS class names */
  className?: string;
  /** Callback when a notification is clicked */
  onNotificationClick?: (notification: INotification) => void;
  /** Maximum number of notifications to display */
  maxNotifications?: number;
  /** Auto-close panel after notification click */
  autoClose?: boolean;
  /** Enable offline support */
  offlineSupport?: boolean;
  /** Test ID for automated testing */
  testId?: string;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({
  className,
  onNotificationClick,
  maxNotifications = 50,
  autoClose = true,
  offlineSupport = true,
  testId = 'notification-panel'
}) => {
  // State management
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [offlineQueue, setOfflineQueue] = useState<INotification[]>([]);
  const [error, setError] = useState<Error | null>(null);

  // Refs
  const panelRef = useRef<HTMLDivElement>(null);
  const lastNotificationRef = useRef<string | null>(null);

  // WebSocket connection
  const {
    isConnected,
    connectionState,
    connect,
    disconnect,
    subscribe,
    emit
  } = useWebSocket(true);

  // Calculate unread notifications count
  const calculateUnreadCount = useCallback(() => {
    const count = notifications.filter(
      n => n.status === NotificationStatus.UNREAD
    ).length;
    setUnreadCount(count);
  }, [notifications]);

  // Handle new notification received
  const handleNewNotification = useCallback((notification: INotification) => {
    setNotifications(prev => {
      const updated = [notification, ...prev].slice(0, maxNotifications);
      return updated;
    });
    lastNotificationRef.current = notification.id;
  }, [maxNotifications]);

  // Handle notification click
  const handleNotificationClick = useCallback((notification: INotification) => {
    onNotificationClick?.(notification);
    if (autoClose) {
      setIsOpen(false);
    }
  }, [onNotificationClick, autoClose]);

  // Handle mark all as read
  const handleMarkAllAsRead = useCallback(async () => {
    try {
      if (!isConnected && offlineSupport) {
        setOfflineQueue(prev => [...prev, ...notifications]);
        return;
      }

      await emit('notifications:markAllRead', {});
      setNotifications(prev =>
        prev.map(n => ({
          ...n,
          status: NotificationStatus.READ,
          readAt: new Date()
        }))
      );
      calculateUnreadCount();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      setError(new Error('Failed to mark notifications as read'));
    }
  }, [isConnected, offlineSupport, notifications, emit, calculateUnreadCount]);

  // Handle clear all notifications
  const handleClearAll = useCallback(async () => {
    try {
      if (!isConnected && offlineSupport) {
        setOfflineQueue(prev => [...prev, ...notifications]);
        return;
      }

      await emit('notifications:clearAll', {});
      setNotifications([]);
      calculateUnreadCount();
    } catch (error) {
      console.error('Error clearing notifications:', error);
      setError(new Error('Failed to clear notifications'));
    }
  }, [isConnected, offlineSupport, notifications, emit, calculateUnreadCount]);

  // Setup WebSocket subscriptions
  useEffect(() => {
    subscribe('notification:received', handleNewNotification);
    subscribe('notifications:updated', (updatedNotifications: INotification[]) => {
      setNotifications(updatedNotifications.slice(0, maxNotifications));
      calculateUnreadCount();
    });

    return () => {
      disconnect();
    };
  }, [subscribe, disconnect, handleNewNotification, maxNotifications, calculateUnreadCount]);

  // Process offline queue when back online
  useEffect(() => {
    if (isConnected && offlineQueue.length > 0) {
      Promise.all(
        offlineQueue.map(async notification => {
          await emit('notification:sync', notification);
        })
      ).then(() => {
        setOfflineQueue([]);
      }).catch(error => {
        console.error('Error processing offline queue:', error);
        setError(new Error('Failed to process offline notifications'));
      });
    }
  }, [isConnected, offlineQueue, emit]);

  // Update unread count when notifications change
  useEffect(() => {
    calculateUnreadCount();
  }, [notifications, calculateUnreadCount]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Render error state
  if (error) {
    return (
      <div 
        className="notification-panel__error" 
        role="alert"
        data-testid={`${testId}-error`}
      >
        <p>{error.message}</p>
        <button onClick={() => setError(null)}>Dismiss</button>
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      className={classnames(
        'notification-panel',
        {
          'notification-panel--open': isOpen,
          'notification-panel--offline': !isConnected,
          'hardware-accelerated': true
        },
        className
      )}
      data-testid={testId}
    >
      <button
        className={classnames('notification-panel__trigger', {
          'notification-panel__trigger--has-unread': unreadCount > 0
        })}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications (${unreadCount} unread)`}
        aria-expanded={isOpen}
        data-testid={`${testId}-trigger`}
      >
        <i className="notification-icon" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="notification-panel__badge">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div 
          className="notification-panel__content"
          role="dialog"
          aria-label="Notifications"
        >
          <div className="notification-panel__header">
            <h2>Notifications</h2>
            <div className="notification-panel__actions">
              <button
                onClick={handleMarkAllAsRead}
                disabled={unreadCount === 0}
                aria-label="Mark all as read"
                data-testid={`${testId}-mark-read`}
              >
                Mark all as read
              </button>
              <button
                onClick={handleClearAll}
                disabled={notifications.length === 0}
                aria-label="Clear all notifications"
                data-testid={`${testId}-clear-all`}
              >
                Clear all
              </button>
            </div>
          </div>

          {!isConnected && (
            <div className="notification-panel__offline-banner" role="status">
              You're offline. Some actions will be queued.
            </div>
          )}

          <NotificationList
            notifications={notifications}
            onNotificationClick={handleNotificationClick}
            maxHeight="60vh"
            enableSound={true}
            groupByDate={true}
            sortOrder="desc"
            offlineSupport={offlineSupport}
            className="notification-panel__list"
          />
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;