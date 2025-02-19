import { PrismaClient } from '@prisma/client';
import { validateOrReject } from 'class-validator';
import { IBaseEntity } from '../../common/interfaces/base.interface';
import { 
    INotification, 
    NotificationType, 
    NotificationStatus, 
    NotificationPriority,
    DeliveryMethod,
    INotificationFilter 
} from '../interfaces/notification.interface';

/**
 * Interface for pagination options
 */
interface PaginationOptions {
    page: number;
    limit: number;
    cursor?: string;
}

/**
 * Interface for batch operation results
 */
interface BatchResult {
    successful: number;
    failed: number;
    errors: Error[];
}

/**
 * Interface for archive operation results
 */
interface ArchiveResult {
    archivedCount: number;
    errors: Error[];
}

/**
 * Notification model implementing comprehensive notification management
 * with Prisma ORM, including validation, error handling, and performance optimizations
 */
export class NotificationModel {
    private readonly prisma: PrismaClient;
    private readonly batchSize: number;
    private readonly cacheManager: Map<string, { data: INotification; timestamp: number }>;
    private readonly cacheTTL: number = 300000; // 5 minutes in milliseconds

    /**
     * Initialize notification model with configured Prisma client and settings
     * @param prisma - Prisma client instance
     * @param batchSize - Size for batch operations
     */
    constructor(prisma: PrismaClient, batchSize: number = 100) {
        this.prisma = prisma;
        this.batchSize = batchSize;
        this.cacheManager = new Map();
    }

    /**
     * Creates a new notification with validation and error handling
     * @param data - Notification data
     * @returns Created notification
     * @throws ValidationError if data is invalid
     */
    async create(data: Omit<INotification, keyof IBaseEntity>): Promise<INotification> {
        try {
            // Validate notification data
            await validateOrReject(data);

            // Create notification with audit fields
            const notification = await this.prisma.notification.create({
                data: {
                    ...data,
                    version: 1,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            });

            return notification;
        } catch (error) {
            throw new Error(`Failed to create notification: ${error.message}`);
        }
    }

    /**
     * Retrieves a notification by ID with caching
     * @param id - Notification ID
     * @returns Found notification or null
     */
    async findById(id: string): Promise<INotification | null> {
        try {
            // Check cache first
            const cached = this.cacheManager.get(id);
            if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
                return cached.data;
            }

            // Query database if not in cache
            const notification = await this.prisma.notification.findUnique({
                where: { id }
            });

            // Update cache if found
            if (notification) {
                this.cacheManager.set(id, {
                    data: notification,
                    timestamp: Date.now()
                });
            }

            return notification;
        } catch (error) {
            throw new Error(`Failed to find notification: ${error.message}`);
        }
    }

    /**
     * Retrieves paginated notifications for a user
     * @param userId - User ID
     * @param options - Pagination options
     * @returns Paginated notifications
     */
    async findByUserId(
        userId: string,
        options: PaginationOptions
    ): Promise<{ items: INotification[]; total: number; nextCursor?: string }> {
        try {
            const { page, limit, cursor } = options;

            const [items, total] = await Promise.all([
                this.prisma.notification.findMany({
                    where: { userId },
                    take: limit,
                    skip: cursor ? 1 : (page - 1) * limit,
                    cursor: cursor ? { id: cursor } : undefined,
                    orderBy: { createdAt: 'desc' }
                }),
                this.prisma.notification.count({
                    where: { userId }
                })
            ]);

            return {
                items,
                total,
                nextCursor: items.length === limit ? items[items.length - 1].id : undefined
            };
        } catch (error) {
            throw new Error(`Failed to find notifications: ${error.message}`);
        }
    }

    /**
     * Updates notification status with delivery tracking
     * @param id - Notification ID
     * @param status - New status
     * @param metadata - Delivery metadata
     * @returns Updated notification
     */
    async updateStatus(
        id: string,
        status: NotificationStatus,
        metadata?: Record<string, any>
    ): Promise<INotification> {
        try {
            const notification = await this.prisma.notification.update({
                where: { id },
                data: {
                    status,
                    metadata: metadata ? { ...metadata } : undefined,
                    version: { increment: 1 },
                    updatedAt: new Date()
                }
            });

            // Update cache
            this.cacheManager.delete(id);

            return notification;
        } catch (error) {
            throw new Error(`Failed to update notification status: ${error.message}`);
        }
    }

    /**
     * Creates multiple notifications efficiently
     * @param notifications - Array of notifications to create
     * @returns Batch operation results
     */
    async batchCreate(notifications: Omit<INotification, keyof IBaseEntity>[]): Promise<BatchResult> {
        const result: BatchResult = {
            successful: 0,
            failed: 0,
            errors: []
        };

        try {
            // Process in batches
            for (let i = 0; i < notifications.length; i += this.batchSize) {
                const batch = notifications.slice(i, i + this.batchSize);
                
                await this.prisma.$transaction(async (tx) => {
                    for (const notification of batch) {
                        try {
                            await validateOrReject(notification);
                            await tx.notification.create({
                                data: {
                                    ...notification,
                                    version: 1,
                                    createdAt: new Date(),
                                    updatedAt: new Date()
                                }
                            });
                            result.successful++;
                        } catch (error) {
                            result.failed++;
                            result.errors.push(error);
                        }
                    }
                });
            }

            return result;
        } catch (error) {
            throw new Error(`Batch creation failed: ${error.message}`);
        }
    }

    /**
     * Archives notifications older than retention period
     * @param daysToRetain - Days to keep notifications before archiving
     * @returns Archive operation results
     */
    async archiveOldNotifications(daysToRetain: number): Promise<ArchiveResult> {
        const result: ArchiveResult = {
            archivedCount: 0,
            errors: []
        };

        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToRetain);

            const archived = await this.prisma.notification.updateMany({
                where: {
                    createdAt: {
                        lt: cutoffDate
                    },
                    status: {
                        not: NotificationStatus.ARCHIVED
                    }
                },
                data: {
                    status: NotificationStatus.ARCHIVED,
                    version: { increment: 1 },
                    updatedAt: new Date()
                }
            });

            result.archivedCount = archived.count;
            return result;
        } catch (error) {
            throw new Error(`Archive operation failed: ${error.message}`);
        }
    }
}