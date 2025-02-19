/**
 * @fileoverview REST API controller for notification management with comprehensive
 * support for real-time updates, performance monitoring, and security controls
 * @version 1.0.0
 */

import { 
    Controller, 
    Post, 
    Get, 
    Put, 
    Body, 
    Param, 
    Query, 
    UseGuards, 
    UseInterceptors,
    HttpStatus,
    ValidationPipe
} from '@nestjs/common';
import { 
    ApiTags, 
    ApiOperation, 
    ApiResponse, 
    ApiSecurity,
    ApiHeader 
} from '@nestjs/swagger';
import { RateLimit } from '@nestjs/throttler';
import { NotificationService } from '../services/notification.service';
import { 
    INotification, 
    NotificationType,
    NotificationStatus,
    NotificationPriority,
    INotificationFilter
} from '../interfaces/notification.interface';
import { Logger } from '../../common/utils/logger.util';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { LoggingInterceptor } from '../../common/interceptors/logging.interceptor';
import { PerformanceInterceptor } from '../../common/interceptors/performance.interceptor';
import { SYSTEM_ERRORS } from '../../common/constants/error-codes';

@Controller('notifications')
@ApiTags('notifications')
@UseGuards(AuthGuard, RateLimitGuard)
@UseInterceptors(LoggingInterceptor, PerformanceInterceptor)
@ApiSecurity('bearer')
export class NotificationController {
    private readonly logger: Logger;

    constructor(
        private readonly notificationService: NotificationService,
        logger: Logger
    ) {
        this.logger = logger;
    }

    /**
     * Creates a new notification with real-time delivery
     */
    @Post()
    @ApiOperation({ summary: 'Create new notification' })
    @ApiResponse({ status: HttpStatus.CREATED, description: 'Notification created successfully' })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid notification data' })
    @ApiResponse({ status: HttpStatus.TOO_MANY_REQUESTS, description: 'Rate limit exceeded' })
    @RateLimit({ ttl: 60000, limit: 100 })
    async createNotification(
        @Body(new ValidationPipe()) notificationData: Omit<INotification, 'id' | 'createdAt' | 'updatedAt' | 'version'>
    ): Promise<INotification> {
        try {
            this.logger.debug('Creating notification', { data: notificationData });
            return await this.notificationService.createNotification(notificationData);
        } catch (error) {
            this.logger.error('Failed to create notification', error as Error, {
                code: SYSTEM_ERRORS.INTERNAL_ERROR
            });
            throw error;
        }
    }

    /**
     * Retrieves notifications for a user with advanced filtering
     */
    @Get()
    @ApiOperation({ summary: 'Get user notifications' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Notifications retrieved successfully' })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid filter parameters' })
    async getUserNotifications(
        @Query('userId') userId: string,
        @Query('status') status?: NotificationStatus[],
        @Query('type') type?: NotificationType[],
        @Query('priority') priority?: NotificationPriority[],
        @Query('startDate') startDate?: Date,
        @Query('endDate') endDate?: Date,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 20
    ): Promise<{
        notifications: INotification[];
        total: number;
        metrics: any;
    }> {
        try {
            return await this.notificationService.getUserNotifications(userId, {
                status,
                type,
                priority,
                startDate,
                endDate,
                page,
                limit
            });
        } catch (error) {
            this.logger.error('Failed to retrieve notifications', error as Error, {
                userId,
                code: SYSTEM_ERRORS.INTERNAL_ERROR
            });
            throw error;
        }
    }

    /**
     * Marks a notification as read
     */
    @Put(':id/read')
    @ApiOperation({ summary: 'Mark notification as read' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Notification marked as read' })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Notification not found' })
    async markAsRead(@Param('id') id: string): Promise<INotification> {
        try {
            return await this.notificationService.updateStatus(id, NotificationStatus.READ);
        } catch (error) {
            this.logger.error('Failed to mark notification as read', error as Error, {
                notificationId: id,
                code: SYSTEM_ERRORS.INTERNAL_ERROR
            });
            throw error;
        }
    }

    /**
     * Marks all notifications as read for a user
     */
    @Put('mark-all-read')
    @ApiOperation({ summary: 'Mark all notifications as read' })
    @ApiResponse({ status: HttpStatus.OK, description: 'All notifications marked as read' })
    async markAllAsRead(@Query('userId') userId: string): Promise<{ updated: number }> {
        try {
            return await this.notificationService.markAllAsRead(userId);
        } catch (error) {
            this.logger.error('Failed to mark all notifications as read', error as Error, {
                userId,
                code: SYSTEM_ERRORS.INTERNAL_ERROR
            });
            throw error;
        }
    }

    /**
     * Retrieves notification delivery metrics
     */
    @Get('metrics')
    @ApiOperation({ summary: 'Get notification metrics' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Metrics retrieved successfully' })
    @ApiHeader({ name: 'X-API-KEY', required: true })
    async getMetrics(): Promise<{
        deliveryStats: any;
        performanceMetrics: any;
    }> {
        try {
            return await this.notificationService.getNotificationMetrics();
        } catch (error) {
            this.logger.error('Failed to retrieve metrics', error as Error, {
                code: SYSTEM_ERRORS.INTERNAL_ERROR
            });
            throw error;
        }
    }
}