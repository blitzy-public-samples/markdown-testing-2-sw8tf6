import { Subject } from 'rxjs'; // ^7.8.1
import { debounceTime, distinctUntilChanged } from 'rxjs/operators'; // ^7.8.1
import { 
    INotification, 
    INotificationFilter, 
    NotificationStatus, 
    NotificationPriority 
} from '../interfaces/notification.interface';
import { WebSocketService } from './websocket.service';
import { apiService } from './api.service';
import { handleApiError } from '../utils/error.util';
import { API_ENDPOINTS } from '../constants/api.constants';

/**
 * Interface for notification retry configuration
 */
interface RetryConfig {
    attempts: number;
    maxAttempts: number;
    backoffMs: number;
}

/**
 * Service responsible for managing notifications with real-time updates,
 * offline support, and advanced state management
 * @version 1.0.0
 */
export class NotificationService {
    private readonly notificationsSubject = new Subject<INotification[]>();
    private notifications: INotification[] = [];
    private readonly retryConfigs = new Map<string, RetryConfig>();
    private readonly CLEANUP_INTERVAL = 300000; // 5 minutes
    private readonly MAX_CACHED_NOTIFICATIONS = 100;
    private readonly DB_NAME = 'notifications_db';
    private readonly STORE_NAME = 'notifications';
    private offlineDb: IDBDatabase | null = null;

    constructor(private readonly webSocketService: WebSocketService) {
        this.initializeService();
    }

    /**
     * Initializes the notification service with WebSocket subscription
     * and offline support
     */
    private async initializeService(): Promise<void> {
        try {
            await this.initializeOfflineStore();
            this.setupWebSocketSubscription();
            this.setupNotificationCleanup();
            await this.loadInitialNotifications();
        } catch (error) {
            console.error('Failed to initialize notification service:', error);
            throw handleApiError(error);
        }
    }

    /**
     * Initializes IndexedDB for offline notification storage
     */
    private initializeOfflineStore(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, 1);

            request.onerror = () => reject(new Error('Failed to open offline store'));

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(this.STORE_NAME)) {
                    db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
                }
            };

            request.onsuccess = (event) => {
                this.offlineDb = (event.target as IDBOpenDBRequest).result;
                resolve();
            };
        });
    }

    /**
     * Sets up WebSocket subscription for real-time notifications
     */
    private setupWebSocketSubscription(): void {
        this.webSocketService.subscribe(
            'notification:received',
            (notification: INotification) => {
                this.handleNotificationReceived(notification);
            },
            { acknowledgment: true }
        );
    }

    /**
     * Sets up periodic cleanup of expired notifications
     */
    private setupNotificationCleanup(): void {
        setInterval(() => {
            this.cleanupExpiredNotifications();
        }, this.CLEANUP_INTERVAL);
    }

    /**
     * Loads initial notifications from API and offline store
     */
    private async loadInitialNotifications(): Promise<void> {
        try {
            const [apiNotifications, offlineNotifications] = await Promise.all([
                this.fetchNotificationsFromApi(),
                this.getOfflineNotifications()
            ]);

            this.notifications = this.mergeNotifications(
                apiNotifications,
                offlineNotifications
            );
            this.notificationsSubject.next(this.notifications);
        } catch (error) {
            console.error('Failed to load initial notifications:', error);
            // Fall back to offline notifications if API fails
            this.notifications = await this.getOfflineNotifications();
            this.notificationsSubject.next(this.notifications);
        }
    }

    /**
     * Fetches notifications from the API
     */
    private async fetchNotificationsFromApi(): Promise<INotification[]> {
        try {
            return await apiService.get<INotification[]>(API_ENDPOINTS.NOTIFICATIONS.BASE);
        } catch (error) {
            throw handleApiError(error);
        }
    }

    /**
     * Retrieves notifications from offline store
     */
    private async getOfflineNotifications(): Promise<INotification[]> {
        return new Promise((resolve, reject) => {
            if (!this.offlineDb) {
                resolve([]);
                return;
            }

            const transaction = this.offlineDb.transaction([this.STORE_NAME], 'readonly');
            const store = transaction.objectStore(this.STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error('Failed to get offline notifications'));
        });
    }

    /**
     * Merges notifications from different sources with deduplication
     */
    private mergeNotifications(
        apiNotifications: INotification[],
        offlineNotifications: INotification[]
    ): INotification[] {
        const notificationMap = new Map<string, INotification>();
        
        [...apiNotifications, ...offlineNotifications].forEach(notification => {
            const existing = notificationMap.get(notification.id);
            if (!existing || existing.createdAt < notification.createdAt) {
                notificationMap.set(notification.id, notification);
            }
        });

        return Array.from(notificationMap.values())
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, this.MAX_CACHED_NOTIFICATIONS);
    }

    /**
     * Handles incoming notifications with priority handling and offline support
     */
    private async handleNotificationReceived(notification: INotification): Promise<void> {
        try {
            // Validate notification
            if (!this.isValidNotification(notification)) {
                console.error('Invalid notification received:', notification);
                return;
            }

            // Update local state
            const index = this.notifications.findIndex(n => n.id === notification.id);
            if (index >= 0) {
                this.notifications[index] = notification;
            } else {
                this.notifications.unshift(notification);
                this.notifications = this.notifications.slice(0, this.MAX_CACHED_NOTIFICATIONS);
            }

            // Store in offline cache
            await this.storeNotificationOffline(notification);

            // Emit updated notifications
            this.notificationsSubject.next([...this.notifications]);
        } catch (error) {
            console.error('Error handling notification:', error);
        }
    }

    /**
     * Validates notification object structure
     */
    private isValidNotification(notification: any): notification is INotification {
        return (
            notification &&
            typeof notification.id === 'string' &&
            typeof notification.type === 'string' &&
            typeof notification.status === 'string' &&
            notification.createdAt instanceof Date
        );
    }

    /**
     * Stores notification in offline storage
     */
    private async storeNotificationOffline(notification: INotification): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.offlineDb) {
                resolve();
                return;
            }

            const transaction = this.offlineDb.transaction([this.STORE_NAME], 'readwrite');
            const store = transaction.objectStore(this.STORE_NAME);
            const request = store.put(notification);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error('Failed to store notification offline'));
        });
    }

    /**
     * Removes expired notifications from storage
     */
    private async cleanupExpiredNotifications(): Promise<void> {
        const now = new Date();
        this.notifications = this.notifications.filter(notification => {
            return !notification.expiresAt || notification.expiresAt > now;
        });

        this.notificationsSubject.next([...this.notifications]);

        // Cleanup offline store
        if (this.offlineDb) {
            const transaction = this.offlineDb.transaction([this.STORE_NAME], 'readwrite');
            const store = transaction.objectStore(this.STORE_NAME);
            
            this.notifications.forEach(notification => {
                if (notification.expiresAt && notification.expiresAt <= now) {
                    store.delete(notification.id);
                }
            });
        }
    }

    /**
     * Retrieves notifications with filtering and sorting
     */
    public async getNotifications(filter?: INotificationFilter): Promise<INotification[]> {
        try {
            let filteredNotifications = [...this.notifications];

            if (filter) {
                filteredNotifications = filteredNotifications.filter(notification => {
                    return (
                        (!filter.types || filter.types.includes(notification.type)) &&
                        (!filter.statuses || filter.statuses.includes(notification.status)) &&
                        (!filter.priorities || filter.priorities.includes(notification.priority)) &&
                        (!filter.startDate || notification.createdAt >= filter.startDate) &&
                        (!filter.endDate || notification.createdAt <= filter.endDate) &&
                        (!filter.searchText || 
                            notification.title.toLowerCase().includes(filter.searchText.toLowerCase()) ||
                            notification.message.toLowerCase().includes(filter.searchText.toLowerCase()))
                    );
                });

                // Apply pagination
                if (filter.offset !== undefined && filter.limit !== undefined) {
                    filteredNotifications = filteredNotifications.slice(
                        filter.offset,
                        filter.offset + filter.limit
                    );
                }
            }

            return filteredNotifications;
        } catch (error) {
            throw handleApiError(error);
        }
    }

    /**
     * Marks notifications as read with offline support
     */
    public async markAsRead(notificationIds: string[]): Promise<void> {
        try {
            // Optimistic update
            this.notifications = this.notifications.map(notification => {
                if (notificationIds.includes(notification.id)) {
                    return {
                        ...notification,
                        status: NotificationStatus.READ,
                        readAt: new Date()
                    };
                }
                return notification;
            });

            this.notificationsSubject.next([...this.notifications]);

            // Update API
            await apiService.put(API_ENDPOINTS.NOTIFICATIONS.MARK_READ, { notificationIds });

            // Update offline store
            await Promise.all(
                this.notifications
                    .filter(n => notificationIds.includes(n.id))
                    .map(n => this.storeNotificationOffline(n))
            );
        } catch (error) {
            // Revert optimistic update on error
            this.notifications = this.notifications.map(notification => {
                if (notificationIds.includes(notification.id) && notification.status === NotificationStatus.READ) {
                    return {
                        ...notification,
                        status: NotificationStatus.UNREAD,
                        readAt: null
                    };
                }
                return notification;
            });

            this.notificationsSubject.next([...this.notifications]);
            throw handleApiError(error);
        }
    }

    /**
     * Subscribes to notification updates
     */
    public subscribeToNotifications(
        callback: (notifications: INotification[]) => void
    ): () => void {
        const subscription = this.notificationsSubject
            .pipe(
                debounceTime(100),
                distinctUntilChanged((prev, curr) => 
                    JSON.stringify(prev) === JSON.stringify(curr)
                )
            )
            .subscribe(callback);

        return () => subscription.unsubscribe();
    }
}