/**
 * @fileoverview Comprehensive test suite for NotificationService
 * Tests notification creation, delivery tracking, and real-time updates
 * @version 1.0.0
 */

import { Container } from 'inversify'; // ^6.0.1
import { describe, it, expect, beforeEach, afterEach, jest } from 'jest'; // ^29.0.0
import { NotificationService } from '../services/notification.service';
import { 
    INotification, 
    NotificationType, 
    NotificationStatus, 
    NotificationPriority,
    DeliveryMethod 
} from '../interfaces/notification.interface';
import { SYSTEM_ERRORS, BUSINESS_ERRORS } from '../../common/constants/error-codes';

// Mock implementations
class NotificationRepositoryMock {
    create = jest.fn();
    findByFilter = jest.fn();
    updateStatus = jest.fn();
    findById = jest.fn();
    markAllAsRead = jest.fn();
}

class WebSocketServiceMock {
    broadcastNotification = jest.fn();
    start = jest.fn();
    getConnectionStats = jest.fn();
}

class EmailServiceMock {
    sendEmail = jest.fn();
}

class PerformanceMonitorMock {
    recordMetric = jest.fn();
    getAverageDeliveryTime = jest.fn();
}

describe('NotificationService', () => {
    let container: Container;
    let notificationService: NotificationService;
    let notificationRepositoryMock: NotificationRepositoryMock;
    let webSocketServiceMock: WebSocketServiceMock;
    let emailServiceMock: EmailServiceMock;
    let performanceMonitorMock: PerformanceMonitorMock;

    beforeEach(async () => {
        // Initialize test container and mocks
        container = new Container();
        notificationRepositoryMock = new NotificationRepositoryMock();
        webSocketServiceMock = new WebSocketServiceMock();
        emailServiceMock = new EmailServiceMock();
        performanceMonitorMock = new PerformanceMonitorMock();

        // Bind mocks to container
        container.bind('NotificationRepository').toConstantValue(notificationRepositoryMock);
        container.bind('WebSocketService').toConstantValue(webSocketServiceMock);
        container.bind('EmailService').toConstantValue(emailServiceMock);
        container.bind('PerformanceMonitor').toConstantValue(performanceMonitorMock);

        // Initialize service
        notificationService = container.resolve(NotificationService);

        // Setup default mock implementations
        webSocketServiceMock.start.mockResolvedValue(undefined);
        performanceMonitorMock.getAverageDeliveryTime.mockResolvedValue(150);
    });

    afterEach(() => {
        // Clear all mock calls
        jest.clearAllMocks();
    });

    describe('Notification Creation and Delivery', () => {
        it('should create and deliver notification through multiple channels', async () => {
            // Setup test data
            const testNotification: Partial<INotification> = {
                userId: 'test-user-1',
                type: NotificationType.TASK_ASSIGNED,
                title: 'New Task Assigned',
                message: 'You have been assigned a new task',
                priority: NotificationPriority.HIGH,
                deliveryMethod: [DeliveryMethod.WEBSOCKET, DeliveryMethod.EMAIL],
                metadata: { taskId: 'task-123' }
            };

            // Setup mock responses
            notificationRepositoryMock.create.mockResolvedValue({
                ...testNotification,
                id: 'notification-1',
                status: NotificationStatus.UNREAD,
                createdAt: new Date(),
                updatedAt: new Date(),
                version: 1
            });

            webSocketServiceMock.broadcastNotification.mockResolvedValue(undefined);
            emailServiceMock.sendEmail.mockResolvedValue(true);

            // Execute test
            const result = await notificationService.createNotification(testNotification);

            // Verify notification creation
            expect(notificationRepositoryMock.create).toHaveBeenCalledWith(testNotification);
            expect(result).toBeDefined();
            expect(result.id).toBe('notification-1');

            // Verify WebSocket delivery
            expect(webSocketServiceMock.broadcastNotification).toHaveBeenCalledWith(
                expect.objectContaining({ id: 'notification-1' })
            );

            // Verify email delivery
            expect(emailServiceMock.sendEmail).toHaveBeenCalledWith(
                expect.objectContaining({ id: 'notification-1' }),
                testNotification.userId
            );

            // Verify delivery tracking
            expect(notificationRepositoryMock.updateStatus).toHaveBeenCalledWith(
                'notification-1',
                NotificationStatus.UNREAD,
                expect.objectContaining({
                    deliveryAttempts: expect.arrayContaining([
                        expect.objectContaining({ method: DeliveryMethod.WEBSOCKET }),
                        expect.objectContaining({ method: DeliveryMethod.EMAIL })
                    ])
                })
            );
        });

        it('should handle delivery failures with retry mechanism', async () => {
            // Setup test data with failed delivery
            const testNotification: Partial<INotification> = {
                userId: 'test-user-2',
                type: NotificationType.TASK_UPDATED,
                title: 'Task Updated',
                message: 'Task status has changed',
                priority: NotificationPriority.MEDIUM,
                deliveryMethod: [DeliveryMethod.WEBSOCKET],
                metadata: { taskId: 'task-456' }
            };

            // Mock WebSocket failure
            webSocketServiceMock.broadcastNotification
                .mockRejectedValueOnce(new Error('Connection failed'))
                .mockResolvedValueOnce(undefined);

            notificationRepositoryMock.create.mockResolvedValue({
                ...testNotification,
                id: 'notification-2',
                status: NotificationStatus.UNREAD,
                createdAt: new Date(),
                updatedAt: new Date(),
                version: 1
            });

            // Execute test
            const result = await notificationService.createNotification(testNotification);

            // Verify retry attempt
            expect(webSocketServiceMock.broadcastNotification).toHaveBeenCalledTimes(2);
            expect(notificationRepositoryMock.updateStatus).toHaveBeenCalledWith(
                'notification-2',
                NotificationStatus.UNREAD,
                expect.objectContaining({
                    deliveryAttempts: expect.arrayContaining([
                        expect.objectContaining({
                            method: DeliveryMethod.WEBSOCKET,
                            success: false
                        }),
                        expect.objectContaining({
                            method: DeliveryMethod.WEBSOCKET,
                            success: true
                        })
                    ])
                })
            );
        });

        it('should enforce rate limits for notifications', async () => {
            // Setup rate limit test
            const notifications = Array(6).fill(null).map((_, index) => ({
                userId: 'test-user-3',
                type: NotificationType.TASK_COMMENT,
                title: `Test Notification ${index}`,
                message: 'Test message',
                priority: NotificationPriority.LOW,
                deliveryMethod: [DeliveryMethod.WEBSOCKET]
            }));

            // Execute tests sequentially
            for (let i = 0; i < 5; i++) {
                await notificationService.createNotification(notifications[i]);
            }

            // Verify rate limit exceeded
            await expect(
                notificationService.createNotification(notifications[5])
            ).rejects.toThrow(SYSTEM_ERRORS.RATE_LIMIT_EXCEEDED);
        });
    });

    describe('Notification Retrieval and Management', () => {
        it('should retrieve notifications with filtering and pagination', async () => {
            // Setup mock data
            const mockNotifications = Array(3).fill(null).map((_, index) => ({
                id: `notification-${index}`,
                userId: 'test-user-4',
                type: NotificationType.TASK_ASSIGNED,
                title: `Test ${index}`,
                message: 'Test message',
                status: NotificationStatus.UNREAD,
                priority: NotificationPriority.MEDIUM,
                createdAt: new Date(),
                updatedAt: new Date(),
                version: 1
            }));

            notificationRepositoryMock.findByFilter.mockResolvedValue({
                notifications: mockNotifications,
                total: 3,
                page: 1,
                pages: 1
            });

            // Execute test
            const result = await notificationService.getUserNotifications('test-user-4', {
                status: [NotificationStatus.UNREAD],
                type: [NotificationType.TASK_ASSIGNED],
                priority: [NotificationPriority.MEDIUM],
                page: 1,
                limit: 10
            });

            // Verify results
            expect(result.notifications).toHaveLength(3);
            expect(result.total).toBe(3);
            expect(result.metrics).toBeDefined();
        });

        it('should mark notifications as read', async () => {
            // Setup test data
            const notificationId = 'notification-5';
            const mockNotification = {
                id: notificationId,
                userId: 'test-user-5',
                status: NotificationStatus.UNREAD
            };

            notificationRepositoryMock.findById.mockResolvedValue(mockNotification);
            notificationRepositoryMock.updateStatus.mockResolvedValue({
                ...mockNotification,
                status: NotificationStatus.READ
            });

            // Execute test
            await notificationService.markAsRead(notificationId);

            // Verify status update
            expect(notificationRepositoryMock.updateStatus).toHaveBeenCalledWith(
                notificationId,
                NotificationStatus.READ,
                expect.any(Object)
            );
        });
    });

    describe('Performance and Delivery Metrics', () => {
        it('should track delivery performance metrics', async () => {
            // Setup test notification with performance tracking
            const testNotification: Partial<INotification> = {
                userId: 'test-user-6',
                type: NotificationType.SYSTEM,
                title: 'Performance Test',
                message: 'Test message',
                priority: NotificationPriority.HIGH,
                deliveryMethod: [DeliveryMethod.WEBSOCKET, DeliveryMethod.EMAIL]
            };

            const startTime = Date.now();
            await notificationService.createNotification(testNotification);
            const deliveryTime = Date.now() - startTime;

            // Verify performance metrics
            expect(performanceMonitorMock.recordMetric).toHaveBeenCalledWith(
                'notificationDelivery',
                expect.any(Number)
            );
            expect(deliveryTime).toBeLessThan(2000); // 2 second SLA
        });
    });
});