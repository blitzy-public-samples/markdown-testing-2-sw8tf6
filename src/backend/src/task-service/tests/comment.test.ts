import { Container } from 'inversify';
import { performance } from 'perf_hooks';
import { CommentService } from '../services/comment.service';
import { CommentRepository } from '../repositories/comment.repository';
import { NotificationService } from '../../notification-service/services/notification.service';
import { NotificationType, NotificationPriority } from '../../notification-service/interfaces/notification.interface';
import { SYSTEM_ERRORS, BUSINESS_ERRORS } from '../../common/constants/error-codes';

describe('CommentService', () => {
    let container: Container;
    let commentService: CommentService;
    let commentRepository: jest.Mocked<CommentRepository>;
    let notificationService: jest.Mocked<NotificationService>;
    let performanceMetrics: { [key: string]: number[] } = {};

    const mockComment = {
        id: '123',
        content: 'Test comment',
        taskId: '456',
        parentCommentId: null,
        attachments: [],
        mentions: [],
        depth: 0,
        isEdited: false,
        createdAt: new Date(),
        createdBy: 'user1',
        updatedAt: new Date(),
        updatedBy: 'user1',
        version: 1
    };

    beforeEach(() => {
        // Reset performance metrics
        performanceMetrics = {};

        // Create new container
        container = new Container();

        // Mock repository with transaction support
        commentRepository = {
            findById: jest.fn(),
            findByTaskId: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            getVersionHistory: jest.fn(),
            getAuditTrail: jest.fn(),
            beginTransaction: jest.fn().mockResolvedValue({
                commit: jest.fn(),
                rollback: jest.fn()
            }),
            commitTransaction: jest.fn(),
            rollbackTransaction: jest.fn()
        } as unknown as jest.Mocked<CommentRepository>;

        // Mock notification service with delivery tracking
        notificationService = {
            createNotification: jest.fn(),
            trackDelivery: jest.fn()
        } as unknown as jest.Mocked<NotificationService>;

        // Bind mocks to container
        container.bind(CommentService).toSelf();
        container.bind('CommentRepository').toConstantValue(commentRepository);
        container.bind('NotificationService').toConstantValue(notificationService);

        // Get service instance
        commentService = container.get(CommentService);
    });

    describe('CRUD Operations', () => {
        it('should create a comment with version initialization', async () => {
            const startTime = performance.now();
            const createData = {
                content: 'New comment',
                taskId: '456',
                mentions: ['user2'],
                attachments: []
            };

            commentRepository.create.mockResolvedValue({
                ...mockComment,
                ...createData
            });

            notificationService.createNotification.mockResolvedValue({
                id: 'notif1',
                type: NotificationType.TASK_COMMENT,
                userId: 'user2',
                title: 'You were mentioned in a comment',
                priority: NotificationPriority.MEDIUM,
                status: 'UNREAD'
            });

            const result = await commentService.createComment(createData, 'user1');

            expect(result).toBeDefined();
            expect(result.content).toBe(createData.content);
            expect(result.version).toBe(1);
            expect(commentRepository.create).toHaveBeenCalledWith(
                expect.objectContaining(createData),
                'user1',
                expect.any(Object)
            );
            expect(notificationService.createNotification).toHaveBeenCalled();

            const endTime = performance.now();
            performanceMetrics['createComment'] = [...(performanceMetrics['createComment'] || []), endTime - startTime];
            expect(endTime - startTime).toBeLessThan(2000); // 2 second SLA
        });

        it('should retrieve a comment with version checking', async () => {
            const startTime = performance.now();
            
            commentRepository.findById.mockResolvedValue(mockComment);

            const result = await commentService.getCommentById('123');

            expect(result).toBeDefined();
            expect(result.id).toBe('123');
            expect(result.version).toBeDefined();
            expect(commentRepository.findById).toHaveBeenCalledWith('123');

            const endTime = performance.now();
            performanceMetrics['getComment'] = [...(performanceMetrics['getComment'] || []), endTime - startTime];
            expect(endTime - startTime).toBeLessThan(2000);
        });

        it('should update a comment with version increment', async () => {
            const startTime = performance.now();
            const updateData = {
                content: 'Updated content',
                mentions: ['user3'],
                attachments: []
            };

            commentRepository.findById.mockResolvedValue(mockComment);
            commentRepository.update.mockResolvedValue({
                ...mockComment,
                ...updateData,
                version: 2,
                isEdited: true
            });

            const result = await commentService.updateComment('123', updateData, 'user1');

            expect(result).toBeDefined();
            expect(result.content).toBe(updateData.content);
            expect(result.version).toBe(2);
            expect(result.isEdited).toBe(true);
            expect(commentRepository.update).toHaveBeenCalledWith(
                '123',
                expect.objectContaining(updateData),
                'user1',
                expect.any(Object)
            );

            const endTime = performance.now();
            performanceMetrics['updateComment'] = [...(performanceMetrics['updateComment'] || []), endTime - startTime];
            expect(endTime - startTime).toBeLessThan(2000);
        });

        it('should handle concurrent modification conflicts', async () => {
            commentRepository.update.mockRejectedValue(new Error(SYSTEM_ERRORS.DATABASE_ERROR));

            await expect(commentService.updateComment('123', { content: 'Concurrent update' }, 'user1'))
                .rejects.toThrow(SYSTEM_ERRORS.DATABASE_ERROR);

            expect(commentRepository.rollbackTransaction).toHaveBeenCalled();
        });
    });

    describe('Version History', () => {
        it('should retrieve version history', async () => {
            const versionHistory = [
                { ...mockComment, version: 1 },
                { ...mockComment, content: 'Updated content', version: 2 }
            ];

            commentRepository.getVersionHistory.mockResolvedValue(versionHistory);

            const result = await commentService.getCommentHistory('123');

            expect(result).toHaveLength(2);
            expect(result[1].version).toBe(2);
            expect(commentRepository.getVersionHistory).toHaveBeenCalledWith('123');
        });

        it('should handle version conflicts', async () => {
            commentRepository.update.mockRejectedValue(new Error(BUSINESS_ERRORS.RESOURCE_LOCKED));

            await expect(commentService.updateComment('123', { content: 'Conflicting update' }, 'user1'))
                .rejects.toThrow(BUSINESS_ERRORS.RESOURCE_LOCKED);
        });
    });

    describe('Audit Trail', () => {
        it('should create audit trail entries', async () => {
            const startTime = performance.now();
            const createData = {
                content: 'Audited comment',
                taskId: '456'
            };

            await commentService.createComment(createData, 'user1');

            expect(commentRepository.create).toHaveBeenCalledWith(
                expect.objectContaining(createData),
                'user1',
                expect.any(Object)
            );

            const endTime = performance.now();
            expect(endTime - startTime).toBeLessThan(2000);
        });

        it('should retrieve audit trail', async () => {
            const auditTrail = [
                { action: 'CREATE', userId: 'user1', timestamp: new Date() },
                { action: 'UPDATE', userId: 'user1', timestamp: new Date() }
            ];

            commentRepository.getAuditTrail.mockResolvedValue(auditTrail);

            const result = await commentService.getCommentAuditTrail('123');

            expect(result).toHaveLength(2);
            expect(result[0].action).toBe('CREATE');
            expect(commentRepository.getAuditTrail).toHaveBeenCalledWith('123');
        });
    });

    describe('Performance', () => {
        it('should meet response time SLAs', () => {
            const avgCreateTime = performanceMetrics['createComment']?.reduce((a, b) => a + b, 0) / 
                (performanceMetrics['createComment']?.length || 1);
            const avgUpdateTime = performanceMetrics['updateComment']?.reduce((a, b) => a + b, 0) / 
                (performanceMetrics['updateComment']?.length || 1);
            const avgGetTime = performanceMetrics['getComment']?.reduce((a, b) => a + b, 0) / 
                (performanceMetrics['getComment']?.length || 1);

            expect(avgCreateTime).toBeLessThan(2000);
            expect(avgUpdateTime).toBeLessThan(2000);
            expect(avgGetTime).toBeLessThan(2000);
        });

        it('should handle concurrent operations', async () => {
            const operations = Array(10).fill(null).map((_, i) => 
                commentService.createComment({
                    content: `Concurrent comment ${i}`,
                    taskId: '456'
                }, 'user1')
            );

            const results = await Promise.all(operations);
            expect(results).toHaveLength(10);
            results.forEach(result => {
                expect(result).toBeDefined();
                expect(result.taskId).toBe('456');
            });
        });
    });
});