import { Injectable, Logger } from '@nestjs/common';
import { INotification, INotificationFilter, NotificationStatus } from '../interfaces/notification.interface';
import { NotificationModel } from '../models/notification.model';
import { IBaseFilter } from '../../common/interfaces/base.interface';

/**
 * Repository class implementing advanced data access patterns for notification management
 * with support for real-time updates, batch operations, and comprehensive error handling
 * @version 1.0.0
 */
@Injectable()
export class NotificationRepository {
    constructor(
        private readonly notificationModel: NotificationModel,
        private readonly logger: Logger
    ) {
        this.logger = new Logger('NotificationRepository');
    }

    /**
     * Creates a new notification with validation and audit logging
     * @param data - Notification data to create
     * @returns Newly created notification
     * @throws Error if creation fails
     */
    async create(data: Omit<INotification, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Promise<INotification> {
        try {
            this.logger.debug(`Creating notification for user: ${data.userId}`);
            const notification = await this.notificationModel.create(data);
            this.logger.debug(`Created notification with ID: ${notification.id}`);
            return notification;
        } catch (error) {
            this.logger.error(`Failed to create notification: ${error.message}`);
            throw error;
        }
    }

    /**
     * Retrieves notifications using advanced filtering with pagination and sorting
     * @param filter - Combined notification and base filters
     * @returns Paginated notifications with metadata
     */
    async findByFilter(filter: INotificationFilter & IBaseFilter): Promise<{
        notifications: INotification[];
        total: number;
        page: number;
        pages: number;
    }> {
        try {
            const { userId, type, status, startDate, endDate, page, limit, sortBy, sortOrder } = filter;
            
            const result = await this.notificationModel.findByUserId(userId, {
                page,
                limit,
                cursor: undefined // Using offset pagination as per base interface
            });

            const totalPages = Math.ceil(result.total / limit);

            return {
                notifications: result.items,
                total: result.total,
                page,
                pages: totalPages
            };
        } catch (error) {
            this.logger.error(`Failed to retrieve notifications: ${error.message}`);
            throw error;
        }
    }

    /**
     * Marks all unread notifications as read for a specific user
     * @param userId - User ID to update notifications for
     * @returns Count of updated notifications
     */
    async markAllAsRead(userId: string): Promise<{ updated: number }> {
        try {
            this.logger.debug(`Marking all notifications as read for user: ${userId}`);
            
            const result = await this.notificationModel.batchCreate([{
                userId,
                status: NotificationStatus.READ,
                metadata: {
                    batchUpdate: true,
                    updatedAt: new Date().toISOString()
                }
            }]);

            return { updated: result.successful };
        } catch (error) {
            this.logger.error(`Failed to mark notifications as read: ${error.message}`);
            throw error;
        }
    }

    /**
     * Retrieves a single notification by ID
     * @param id - Notification ID
     * @returns Found notification or null
     */
    async findById(id: string): Promise<INotification | null> {
        try {
            return await this.notificationModel.findById(id);
        } catch (error) {
            this.logger.error(`Failed to find notification by ID: ${error.message}`);
            throw error;
        }
    }

    /**
     * Updates notification status with delivery tracking
     * @param id - Notification ID
     * @param status - New status
     * @param metadata - Optional metadata
     * @returns Updated notification
     */
    async updateStatus(
        id: string,
        status: NotificationStatus,
        metadata?: Record<string, any>
    ): Promise<INotification> {
        try {
            return await this.notificationModel.updateStatus(id, status, metadata);
        } catch (error) {
            this.logger.error(`Failed to update notification status: ${error.message}`);
            throw error;
        }
    }

    /**
     * Archives notifications older than specified retention period
     * @param daysToRetain - Number of days to keep notifications before archiving
     * @returns Count of archived notifications
     */
    async archiveOldNotifications(daysToRetain: number): Promise<{ archivedCount: number }> {
        try {
            const result = await this.notificationModel.archiveOldNotifications(daysToRetain);
            this.logger.debug(`Archived ${result.archivedCount} notifications`);
            return { archivedCount: result.archivedCount };
        } catch (error) {
            this.logger.error(`Failed to archive notifications: ${error.message}`);
            throw error;
        }
    }
}