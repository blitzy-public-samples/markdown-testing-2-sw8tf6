import { useEffect, useState, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import debounce from 'lodash/debounce';
import {
  INotification,
  INotificationFilter,
  NotificationType,
  NotificationStatus,
  INotificationPreferences
} from '../interfaces/notification.interface';
import NotificationService from '../services/notification.service';
import useWebSocket from './useWebSocket';

/**
 * Custom hook for managing notifications with real-time updates,
 * offline support, and accessibility features
 * @version 1.0.0
 */
export const useNotification = (
  filter?: INotificationFilter,
  preferences?: INotificationPreferences
) => {
  // State management
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);

  // Refs for persistent values
  const notificationService = useRef<NotificationService>(new NotificationService());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // WebSocket connection for real-time updates
  const {
    isConnected: wsConnected,
    subscribe,
    unsubscribe
  } = useWebSocket(true);

  /**
   * Initializes notification audio for accessibility
   */
  useEffect(() => {
    audioRef.current = new Audio('/notification-sound.mp3');
    audioRef.current.preload = 'auto';
  }, []);

  /**
   * Handles online/offline status changes
   */
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /**
   * Loads initial notifications and sets up real-time updates
   */
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        setLoading(true);
        const initialNotifications = await notificationService.current.getNotifications(filter);
        setNotifications(initialNotifications);
        updateUnreadCount(initialNotifications);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load notifications'));
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();

    // Subscribe to real-time updates
    const handleNotificationReceived = (notification: INotification) => {
      setNotifications(prev => {
        const updated = [notification, ...prev.filter(n => n.id !== notification.id)];
        updateUnreadCount(updated);
        playNotificationSound(notification);
        return updated;
      });
    };

    subscribe('notification:received', handleNotificationReceived);

    // Set up notification cleanup
    cleanupRef.current = notificationService.current.subscribeToNotifications(
      (updatedNotifications: INotification[]) => {
        setNotifications(updatedNotifications);
        updateUnreadCount(updatedNotifications);
      }
    );

    return () => {
      unsubscribe('notification:received', handleNotificationReceived);
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [filter, subscribe, unsubscribe]);

  /**
   * Updates unread notification count
   */
  const updateUnreadCount = useCallback((notificationList: INotification[]) => {
    const count = notificationList.filter(
      n => n.status === NotificationStatus.UNREAD
    ).length;
    setUnreadCount(count);
    // Update favicon badge if supported
    if ('setAppBadge' in navigator) {
      if (count > 0) {
        navigator.setAppBadge(count).catch(console.error);
      } else {
        navigator.clearAppBadge().catch(console.error);
      }
    }
  }, []);

  /**
   * Plays notification sound based on preferences
   */
  const playNotificationSound = useCallback((notification: INotification) => {
    if (
      preferences?.sound &&
      audioRef.current &&
      document.visibilityState !== 'visible'
    ) {
      audioRef.current.play().catch(console.error);
    }
  }, [preferences]);

  /**
   * Marks notifications as read with offline support
   */
  const markAsRead = useCallback(async (notificationIds: string[]) => {
    try {
      await notificationService.current.markAsRead(notificationIds);
      setNotifications(prev =>
        prev.map(notification =>
          notificationIds.includes(notification.id)
            ? { ...notification, status: NotificationStatus.READ }
            : notification
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to mark notifications as read'));
      throw err;
    }
  }, []);

  /**
   * Marks all notifications as read
   */
  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications
      .filter(n => n.status === NotificationStatus.UNREAD)
      .map(n => n.id);
    if (unreadIds.length > 0) {
      await markAsRead(unreadIds);
    }
  }, [notifications, markAsRead]);

  /**
   * Archives a notification
   */
  const archiveNotification = useCallback(async (notificationId: string) => {
    try {
      const updatedNotifications = notifications.map(notification =>
        notification.id === notificationId
          ? { ...notification, status: NotificationStatus.ARCHIVED }
          : notification
      );
      setNotifications(updatedNotifications);
      updateUnreadCount(updatedNotifications);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to archive notification'));
      throw err;
    }
  }, [notifications, updateUnreadCount]);

  /**
   * Filters notifications based on criteria
   */
  const filterNotifications = useCallback(
    debounce(async (filterCriteria: INotificationFilter) => {
      try {
        const filteredNotifications = await notificationService.current.getNotifications(
          filterCriteria
        );
        setNotifications(filteredNotifications);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to filter notifications'));
        throw err;
      }
    }, 300),
    []
  );

  /**
   * Updates notification preferences
   */
  const updatePreferences = useCallback(
    async (newPreferences: Partial<INotificationPreferences>) => {
      try {
        // Implementation would typically involve API call
        // For now, just update local state
        Object.assign(preferences || {}, newPreferences);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to update preferences'));
        throw err;
      }
    },
    [preferences]
  );

  return {
    notifications,
    loading,
    error,
    isOffline,
    unreadCount,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    filterNotifications,
    updatePreferences
  };
};

export default useNotification;