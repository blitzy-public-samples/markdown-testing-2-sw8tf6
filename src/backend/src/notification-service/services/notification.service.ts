/**
 * @fileoverview Core notification service implementing comprehensive notification management
 * with multi-channel delivery, performance monitoring, and delivery tracking
 * @version 1.0.0
 */

import { injectable, inject } from 'inversify';
import { 
    INotification, 
    NotificationType, 
    NotificationStatus,
    NotificationPriority,
    DeliveryMethod 
} from '../interfaces/notification.interface';
import { NotificationRepository } from '../repositories/notification.repository';
import { EmailService } from './email.service';
import { WebSocketService } from './websocket.service';
import { Logger } from '../../common/utils/logger.util';
import { SYSTEM_ERRORS, BUSINESS_ERRORS } from '../../common/constants/error-codes';
import notificationConfig from '../config/notification.config';

/**
 * Interface for delivery metrics tracking
 */
interface DeliveryMetrics {
    totalAttempts: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    averageDeliveryTime: number;
    deliveryMethodStats: Record<DeliveryMethod, {
        attempts: number;
        successes: number;
        failures: number;
        averageTime: number;
    }>;
}

/**
 * Interface for delivery attempt tracking
 */
interface DeliveryAttempt {
    method: DeliveryMethod;
    timestamp: Date;
    success: boolean;
    duration: number;
    error?: string;
}

/**
 * Core notification service implementing comprehensive notification management
 * with multi-channel delivery and performance monitoring
 */
@injectable()
export class NotificationService {
    private readonly logger: Logger;
    private readonly deliveryMetrics: Map<string, DeliveryMetrics>;
    private readonly templateCache: Map<string, { template: string; expiresAt: Date }>;
    private readonly rateLimiters: Map<string, { count: number; resetTime: Date }>;

    constructor(
        @inject(NotificationRepository) private readonly notificationRepository: NotificationRepository,
        @inject(EmailService) private readonly emailService: EmailService,
        @inject(WebSocketService) private readonly websocketService: WebSocketService
    ) {
        this.logger = new Logger(
            notificationConfig.monitoring,
            'NotificationService',
            '1.0.0'
        );
        this.deliveryMetrics = new Map();
        this.templateCache = new Map();
        this.rateLimiters = new Map();

        // Initialize WebSocket service
        this.initializeWebSocket();
    }

    /**
     * Initializes WebSocket service with error handling
     */
    private async initializeWebSocket(): Promise<void> {
        try {
            await this.websocketService.start();
        } catch (error) {
            this.logger.error('Failed to initialize WebSocket service', error as Error, {
                code: SYSTEM_ERRORS.SERVICE_UNAVAILABLE
            });
        }
    }

    /**
     * Creates and delivers a new notification through configured channels
     * @param notificationData - Notification data to process
     * @returns Created notification with delivery status
     */
    public async createNotification(notificationData: Omit<INotification, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Promise<INotification> {
        try {
            // Validate notification data
            this.validateNotificationData(notificationData);

            // Check rate limits
            if (this.isRateLimitExceeded(notificationData.userId)) {
                throw new Error(SYSTEM_ERRORS.RATE_LIMIT_EXCEEDED);
            }

            // Create notification record
            const notification = await this.notificationRepository.create(notificationData);

            // Track delivery metrics
            const deliveryAttempts: DeliveryAttempt[] = [];

            // Attempt real-time delivery via WebSocket
            if (notificationData.deliveryMethod.includes(DeliveryMethod.WEBSOCKET)) {
                const wsStart = Date.now();
                try {
                    await this.websocketService.broadcastNotification(notification);
                    deliveryAttempts.push({
                        method: DeliveryMethod.WEBSOCKET,
                        timestamp: new Date(),
                        success: true,
                        duration: Date.now() - wsStart
                    });
                } catch (error) {
                    deliveryAttempts.push({
                        method: DeliveryMethod.WEBSOCKET,
                        timestamp: new Date(),
                        success: false,
                        duration: Date.now() - wsStart,
                        error: (error as Error).message
                    });
                }
            }

            // Attempt email delivery if configured
            if (notificationData.deliveryMethod.includes(DeliveryMethod.EMAIL)) {
                const emailStart = Date.now();
                try {
                    const emailSuccess = await this.emailService.sendEmail(
                        notification,
                        notificationData.userId
                    );
                    deliveryAttempts.push({
                        method: DeliveryMethod.EMAIL,
                        timestamp: new Date(),
                        success: emailSuccess,
                        duration: Date.now() - emailStart
                    });
                } catch (error) {
                    deliveryAttempts.push({
                        method: DeliveryMethod.EMAIL,
                        timestamp: new Date(),
                        success: false,
                        duration: Date.now() - emailStart,
                        error: (error as Error).message
                    });
                }
            }

            // Update notification with delivery attempts
            const updatedNotification = await this.notificationRepository.updateStatus(
                notification.id,
                this.determineNotificationStatus(deliveryAttempts),
                { deliveryAttempts }
            );

            // Update delivery metrics
            this.updateDeliveryMetrics(notification.id, deliveryAttempts);

            return updatedNotification;

        } catch (error) {
            this.logger.error('Failed to create notification', error as Error, {
                userId: notificationData.userId,
                type: notificationData.type
            });
            throw error;
        }
    }

    /**
     * Retrieves notifications for a user with advanced filtering
     * @param userId - User ID to get notifications for
     * @param filter - Filter criteria for notifications
     * @returns Paginated notifications with delivery metrics
     */
    public async getUserNotifications(
        userId: string,
        filter: {
            status?: NotificationStatus[];
            type?: NotificationType[];
            priority?: NotificationPriority[];
            startDate?: Date;
            endDate?: Date;
            page: number;
            limit: number;
        }
    ): Promise<{
        notifications: INotification[];
        total: number;
        metrics: DeliveryMetrics;
    }> {
        try {
            const result = await this.notificationRepository.findByFilter({
                userId,
                ...filter
            });

            const metrics = this.getAggregateMetrics(
                result.notifications.map(n => n.id)
            );

            return {
                notifications: result.notifications,
                total: result.total,
                metrics
            };

        } catch (error) {
            this.logger.error('Failed to retrieve notifications', error as Error, {
                userId,
                filter
            });
            throw error;
        }
    }

    /**
     * Validates notification data against business rules
     * @param data - Notification data to validate
     */
    private validateNotificationData(data: Partial<INotification>): void {
        if (!data.userId || !data.type || !data.title || !data.message) {
            throw new Error(BUSINESS_ERRORS.RESOURCE_NOT_FOUND);
        }

        if (!data.deliveryMethod || data.deliveryMethod.length === 0) {
            throw new Error(BUSINESS_ERRORS.BUSINESS_RULE_VIOLATION);
        }
    }

    /**
     * Determines notification status based on delivery attempts
     * @param attempts - Array of delivery attempts
     * @returns Appropriate notification status
     */
    private determineNotificationStatus(attempts: DeliveryAttempt[]): NotificationStatus {
        if (attempts.length === 0) {
            return NotificationStatus.UNREAD;
        }

        const hasSuccessfulDelivery = attempts.some(attempt => attempt.success);
        return hasSuccessfulDelivery ? NotificationStatus.UNREAD : NotificationStatus.ARCHIVED;
    }

    /**
     * Updates delivery metrics for monitoring
     * @param notificationId - Notification ID
     * @param attempts - Delivery attempts to record
     */
    private updateDeliveryMetrics(notificationId: string, attempts: DeliveryAttempt[]): void {
        const metrics = this.deliveryMetrics.get(notificationId) || {
            totalAttempts: 0,
            successfulDeliveries: 0,
            failedDeliveries: 0,
            averageDeliveryTime: 0,
            deliveryMethodStats: Object.values(DeliveryMethod).reduce((acc, method) => ({
                ...acc,
                [method]: {
                    attempts: 0,
                    successes: 0,
                    failures: 0,
                    averageTime: 0
                }
            }), {})
        };

        attempts.forEach(attempt => {
            metrics.totalAttempts++;
            if (attempt.success) {
                metrics.successfulDeliveries++;
            } else {
                metrics.failedDeliveries++;
            }

            const methodStats = metrics.deliveryMethodStats[attempt.method];
            methodStats.attempts++;
            if (attempt.success) {
                methodStats.successes++;
            } else {
                methodStats.failures++;
            }

            // Update average delivery time
            methodStats.averageTime = (
                (methodStats.averageTime * (methodStats.attempts - 1) + attempt.duration) /
                methodStats.attempts
            );
        });

        this.deliveryMetrics.set(notificationId, metrics);
    }

    /**
     * Checks if rate limit is exceeded for a user
     * @param userId - User ID to check
     * @returns Boolean indicating if rate limit is exceeded
     */
    private isRateLimitExceeded(userId: string): boolean {
        const now = new Date();
        const limit = notificationConfig.rateLimits.maxPerUser;
        const key = `${userId}:${now.getHours()}`;

        const userLimit = this.rateLimiters.get(key) || {
            count: 0,
            resetTime: new Date(now.getTime() + 3600000)
        };

        if (now > userLimit.resetTime) {
            userLimit.count = 0;
            userLimit.resetTime = new Date(now.getTime() + 3600000);
        }

        if (userLimit.count >= limit) {
            return true;
        }

        userLimit.count++;
        this.rateLimiters.set(key, userLimit);
        return false;
    }

    /**
     * Gets aggregate metrics for multiple notifications
     * @param notificationIds - Array of notification IDs
     * @returns Aggregated delivery metrics
     */
    private getAggregateMetrics(notificationIds: string[]): DeliveryMetrics {
        const aggregate: DeliveryMetrics = {
            totalAttempts: 0,
            successfulDeliveries: 0,
            failedDeliveries: 0,
            averageDeliveryTime: 0,
            deliveryMethodStats: Object.values(DeliveryMethod).reduce((acc, method) => ({
                ...acc,
                [method]: {
                    attempts: 0,
                    successes: 0,
                    failures: 0,
                    averageTime: 0
                }
            }), {})
        };

        notificationIds.forEach(id => {
            const metrics = this.deliveryMetrics.get(id);
            if (metrics) {
                aggregate.totalAttempts += metrics.totalAttempts;
                aggregate.successfulDeliveries += metrics.successfulDeliveries;
                aggregate.failedDeliveries += metrics.failedDeliveries;

                Object.entries(metrics.deliveryMethodStats).forEach(([method, stats]) => {
                    const aggStats = aggregate.deliveryMethodStats[method as DeliveryMethod];
                    aggStats.attempts += stats.attempts;
                    aggStats.successes += stats.successes;
                    aggStats.failures += stats.failures;
                    aggStats.averageTime = (
                        (aggStats.averageTime * (aggStats.attempts - stats.attempts) +
                        stats.averageTime * stats.attempts) /
                        aggStats.attempts
                    );
                });
            }
        });

        return aggregate;
    }
}