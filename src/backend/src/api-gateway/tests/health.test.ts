import { Request, Response } from 'express'; // ^4.17.1
import { describe, it, expect, jest } from 'jest'; // ^29.0.0
import { checkHealth, checkReadiness } from '../controllers/health.controller';
import { SUCCESS_CODES } from '../../common/constants/status-codes';

describe('Health Check Endpoints', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();
        
        // Initialize mock request/response objects
        mockRequest = {};
        jsonMock = jest.fn().mockReturnThis();
        statusMock = jest.fn().mockReturnThis();
        mockResponse = {
            json: jsonMock,
            status: statusMock
        };

        // Mock Date.now() for consistent timestamps
        jest.spyOn(Date, 'now').mockImplementation(() => 1000);
        
        // Mock process.uptime() for consistent values
        jest.spyOn(process, 'uptime').mockImplementation(() => 3600);

        // Mock os module for consistent memory metrics
        jest.mock('node:os', () => ({
            totalmem: () => 16000000000, // 16GB
            freemem: () => 8000000000,   // 8GB
        }));
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('checkHealth', () => {
        it('should return 200 OK with valid health metrics', async () => {
            const startTime = Date.now();
            
            await checkHealth(mockRequest as Request, mockResponse as Response);

            // Verify response status
            expect(statusMock).toHaveBeenCalledWith(SUCCESS_CODES.OK);
            
            // Verify response structure
            expect(jsonMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'healthy',
                    service: 'api-gateway',
                    version: expect.any(String),
                    environment: expect.any(String),
                    timestamp: expect.any(String),
                    metrics: expect.objectContaining({
                        uptime: expect.any(Number),
                        memoryUsage: expect.objectContaining({
                            total: expect.any(Number),
                            free: expect.any(Number),
                            used: expect.any(Number),
                            percentageUsed: expect.any(Number)
                        }),
                        responseTime: expect.any(Number)
                    }),
                    prometheusMetrics: expect.any(String)
                })
            );

            // Verify Prometheus metrics format
            const response = jsonMock.mock.calls[0][0];
            expect(response.prometheusMetrics).toMatch(/^# HELP api_gateway_uptime_seconds/);
            expect(response.prometheusMetrics).toMatch(/^# TYPE api_gateway_memory_usage_bytes gauge/m);
            
            // Verify performance SLA
            expect(Date.now() - startTime).toBeLessThan(300);
        });

        it('should include accurate memory metrics', async () => {
            await checkHealth(mockRequest as Request, mockResponse as Response);
            
            const response = jsonMock.mock.calls[0][0];
            const { memoryUsage } = response.metrics;
            
            expect(memoryUsage.total).toBe(16000000000);
            expect(memoryUsage.free).toBe(8000000000);
            expect(memoryUsage.used).toBe(8000000000);
            expect(memoryUsage.percentageUsed).toBe(50);
        });
    });

    describe('checkReadiness', () => {
        it('should return 200 OK when all dependencies are healthy', async () => {
            const startTime = Date.now();
            
            await checkReadiness(mockRequest as Request, mockResponse as Response);

            expect(statusMock).toHaveBeenCalledWith(SUCCESS_CODES.OK);
            expect(jsonMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'ready',
                    service: 'api-gateway',
                    dependencies: expect.arrayContaining([
                        expect.objectContaining({
                            name: 'database',
                            status: 'healthy',
                            responseTime: expect.any(Number),
                            lastChecked: expect.any(String)
                        }),
                        expect.objectContaining({
                            name: 'redis',
                            status: 'healthy',
                            responseTime: expect.any(Number),
                            lastChecked: expect.any(String)
                        }),
                        expect.objectContaining({
                            name: 'rabbitmq',
                            status: 'healthy',
                            responseTime: expect.any(Number),
                            lastChecked: expect.any(String)
                        })
                    ]),
                    uptime: expect.any(Number),
                    startTime: expect.any(String),
                    responseTime: expect.any(Number)
                })
            );

            // Verify performance SLA
            expect(Date.now() - startTime).toBeLessThan(300);
        });

        it('should return not_ready status when dependencies are unhealthy', async () => {
            // Mock dependency check to fail
            jest.spyOn(global, 'Promise').mockImplementationOnce(() => 
                Promise.resolve([{
                    name: 'database',
                    status: 'unhealthy',
                    responseTime: 100,
                    lastChecked: new Date().toISOString(),
                    details: { error: 'Connection failed' }
                }])
            );

            await checkReadiness(mockRequest as Request, mockResponse as Response);

            expect(statusMock).toHaveBeenCalledWith(SUCCESS_CODES.OK);
            expect(jsonMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'not_ready',
                    dependencies: expect.arrayContaining([
                        expect.objectContaining({
                            name: 'database',
                            status: 'unhealthy',
                            details: expect.objectContaining({
                                error: expect.any(String)
                            })
                        })
                    ])
                })
            );
        });

        it('should handle dependency check timeouts', async () => {
            // Mock dependency check to timeout
            jest.spyOn(global, 'Promise').mockImplementationOnce(() => 
                new Promise(resolve => setTimeout(resolve, 5000))
            );

            const startTime = Date.now();
            await checkReadiness(mockRequest as Request, mockResponse as Response);

            const response = jsonMock.mock.calls[0][0];
            expect(response.dependencies).toContainEqual(
                expect.objectContaining({
                    status: 'degraded',
                    responseTime: expect.any(Number)
                })
            );
            expect(Date.now() - startTime).toBeLessThan(300);
        });
    });
});