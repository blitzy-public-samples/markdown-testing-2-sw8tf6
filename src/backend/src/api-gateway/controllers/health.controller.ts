import { Request, Response } from 'express';
import { SUCCESS_CODES } from '../../common/constants/status-codes';
import * as os from 'node:os';

// Service metadata
const SERVICE_NAME = 'api-gateway';
const SERVICE_VERSION = process.env.SERVICE_VERSION || '1.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';
const START_TIME = Date.now();

/**
 * Interface for health check response metrics
 */
interface HealthMetrics {
    uptime: number;
    memoryUsage: {
        total: number;
        free: number;
        used: number;
        percentageUsed: number;
    };
    responseTime: number;
}

/**
 * Interface for dependency health status
 */
interface DependencyHealth {
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime: number;
    lastChecked: string;
    details?: Record<string, any>;
}

/**
 * Formats metrics in Prometheus-compatible format
 * @param metrics Health check metrics
 * @returns Prometheus formatted metrics string
 */
const formatPrometheusMetrics = (metrics: HealthMetrics): string => {
    return `
# HELP api_gateway_uptime_seconds The uptime of the API Gateway service in seconds
# TYPE api_gateway_uptime_seconds gauge
api_gateway_uptime_seconds ${metrics.uptime}

# HELP api_gateway_memory_usage_bytes Memory usage metrics
# TYPE api_gateway_memory_usage_bytes gauge
api_gateway_memory_total_bytes ${metrics.memoryUsage.total}
api_gateway_memory_free_bytes ${metrics.memoryUsage.free}
api_gateway_memory_used_bytes ${metrics.memoryUsage.used}
api_gateway_memory_usage_percent ${metrics.memoryUsage.percentageUsed}

# HELP api_gateway_health_check_response_time_ms Health check response time in milliseconds
# TYPE api_gateway_health_check_response_time_ms gauge
api_gateway_health_check_response_time_ms ${metrics.responseTime}
    `.trim();
}

/**
 * Collects system metrics for health check
 * @returns Health metrics object
 */
const collectHealthMetrics = (): HealthMetrics => {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    
    return {
        uptime: process.uptime(),
        memoryUsage: {
            total: totalMemory,
            free: freeMemory,
            used: usedMemory,
            percentageUsed: (usedMemory / totalMemory) * 100
        },
        responseTime: 0 // Will be set before response
    };
};

/**
 * Checks health of a dependency service
 * @param name Dependency service name
 * @param checkFn Function to check dependency health
 * @returns Promise with dependency health status
 */
const checkDependencyHealth = async (
    name: string,
    checkFn: () => Promise<boolean>
): Promise<DependencyHealth> => {
    const startTime = Date.now();
    try {
        const isHealthy = await checkFn();
        return {
            name,
            status: isHealthy ? 'healthy' : 'degraded',
            responseTime: Date.now() - startTime,
            lastChecked: new Date().toISOString()
        };
    } catch (error) {
        return {
            name,
            status: 'unhealthy',
            responseTime: Date.now() - startTime,
            lastChecked: new Date().toISOString(),
            details: {
                error: error.message
            }
        };
    }
};

/**
 * Handles health check requests and returns comprehensive service health status
 * @param req Express request object
 * @param res Express response object
 * @returns Promise with health check response
 */
export const checkHealth = async (req: Request, res: Response): Promise<Response> => {
    const requestStart = Date.now();
    
    // Collect health metrics
    const metrics = collectHealthMetrics();
    
    // Calculate response time
    metrics.responseTime = Date.now() - requestStart;
    
    // Format response with service metadata and metrics
    const healthResponse = {
        status: 'healthy',
        service: SERVICE_NAME,
        version: SERVICE_VERSION,
        environment: NODE_ENV,
        timestamp: new Date().toISOString(),
        metrics,
        prometheusMetrics: formatPrometheusMetrics(metrics)
    };
    
    return res.status(SUCCESS_CODES.OK).json(healthResponse);
};

/**
 * Handles readiness check requests and verifies service dependencies
 * @param req Express request object
 * @param res Express response object
 * @returns Promise with readiness check response
 */
export const checkReadiness = async (req: Request, res: Response): Promise<Response> => {
    const requestStart = Date.now();
    
    // Check all service dependencies
    const dependencies = await Promise.all([
        checkDependencyHealth('database', async () => {
            // Implement database connection check
            return true;
        }),
        checkDependencyHealth('redis', async () => {
            // Implement Redis connection check
            return true;
        }),
        checkDependencyHealth('rabbitmq', async () => {
            // Implement RabbitMQ connection check
            return true;
        })
    ]);
    
    // Determine overall readiness status
    const isReady = dependencies.every(dep => dep.status === 'healthy');
    
    // Calculate response time
    const responseTime = Date.now() - requestStart;
    
    // Format readiness response
    const readinessResponse = {
        status: isReady ? 'ready' : 'not_ready',
        service: SERVICE_NAME,
        version: SERVICE_VERSION,
        environment: NODE_ENV,
        timestamp: new Date().toISOString(),
        dependencies,
        uptime: process.uptime(),
        startTime: new Date(START_TIME).toISOString(),
        responseTime
    };
    
    return res.status(SUCCESS_CODES.OK).json(readinessResponse);
};