/**
 * API Utilities
 * Version: 1.0.0
 * 
 * Provides enterprise-grade utilities for handling API requests, responses, and errors
 * with enhanced security, monitoring, and performance features.
 */

import axios, { AxiosError, AxiosInstance } from 'axios'; // ^1.6.0
import { apiConfig } from '../config/api.config';
import { ERROR_MESSAGES } from '../constants/error.constants';

/**
 * Request context interface for enhanced error tracking
 */
interface RequestContext {
    endpoint: string;
    method: string;
    timestamp: number;
    correlationId: string;
    userContext?: {
        userId?: string;
        sessionId?: string;
    };
}

/**
 * Enhanced API Error class with correlation tracking and context
 */
export class ApiError extends Error {
    public readonly statusCode: number;
    public readonly data: Record<string, any>;
    public readonly correlationId: string;
    public readonly context: RequestContext;
    public readonly errorCode: string;

    constructor(
        statusCode: number,
        message: string,
        data: Record<string, any>,
        context: RequestContext
    ) {
        super(message);
        this.name = 'ApiError';
        this.statusCode = statusCode;
        this.data = data;
        this.context = context;
        this.correlationId = `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.errorCode = this.generateErrorCode(statusCode);

        // Ensure proper stack trace
        Error.captureStackTrace(this, ApiError);
    }

    private generateErrorCode(statusCode: number): string {
        const category = this.determineErrorCategory(statusCode);
        return `${category}_${statusCode}_${Date.now()}`;
    }

    private determineErrorCategory(statusCode: number): string {
        if (statusCode >= 500) return 'SERVER';
        if (statusCode >= 400) return 'CLIENT';
        return 'UNKNOWN';
    }
}

/**
 * Creates and configures an Axios instance with enhanced features
 */
export const createAxiosInstance = (): AxiosInstance => {
    const instance = axios.create({
        baseURL: apiConfig.baseURL,
        timeout: apiConfig.timeout,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Request-ID': `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }
    });

    // Request interceptor for caching
    instance.interceptors.request.use(async (config) => {
        if (config.method?.toLowerCase() === 'get' && apiConfig.cacheConfig.enabled) {
            const cacheKey = `${apiConfig.cacheConfig.cacheKeyPrefix}-${config.url}`;
            const cachedResponse = await getCachedResponse(cacheKey);
            if (cachedResponse) {
                return Promise.resolve(cachedResponse);
            }
        }
        return config;
    });

    // Response interceptor for error handling and caching
    instance.interceptors.response.use(
        async (response) => {
            if (response.config.method?.toLowerCase() === 'get' && apiConfig.cacheConfig.enabled) {
                const cacheKey = `${apiConfig.cacheConfig.cacheKeyPrefix}-${response.config.url}`;
                await cacheResponse(cacheKey, response);
            }
            return response;
        },
        async (error: AxiosError) => {
            const context: RequestContext = {
                endpoint: error.config?.url || 'unknown',
                method: error.config?.method?.toUpperCase() || 'unknown',
                timestamp: Date.now(),
                correlationId: error.config?.headers?.['X-Request-ID'] as string
            };

            return Promise.reject(await handleApiError(error, context));
        }
    );

    return instance;
};

/**
 * Enhanced error handler that transforms Axios errors into standardized ApiError instances
 */
export const handleApiError = async (
    error: AxiosError,
    context: RequestContext
): Promise<ApiError> => {
    const statusCode = error.response?.status || 500;
    let errorMessage: string;
    let errorData: Record<string, any> = {};

    // Determine appropriate error message based on error type
    if (!error.response) {
        errorMessage = ERROR_MESSAGES.SYSTEM.NETWORK_ERROR;
    } else if (statusCode === 401) {
        errorMessage = ERROR_MESSAGES.AUTH.TOKEN_INVALID;
    } else if (statusCode === 403) {
        errorMessage = ERROR_MESSAGES.AUTH.INSUFFICIENT_PERMISSIONS;
    } else if (statusCode === 404) {
        errorMessage = ERROR_MESSAGES.BUSINESS.RESOURCE_NOT_FOUND;
    } else if (statusCode === 429) {
        errorMessage = ERROR_MESSAGES.SYSTEM.RATE_LIMIT_EXCEEDED;
    } else {
        errorMessage = error.response.data?.message || ERROR_MESSAGES.SYSTEM.INTERNAL_ERROR;
    }

    // Enhance error data with additional context
    errorData = {
        originalError: error.response?.data,
        requestUrl: error.config?.url,
        requestMethod: error.config?.method?.toUpperCase(),
        timestamp: new Date().toISOString()
    };

    // Log error with context for monitoring
    console.error('API Error:', {
        statusCode,
        message: errorMessage,
        context,
        error: errorData
    });

    return new ApiError(statusCode, errorMessage, errorData, context);
};

/**
 * Implements intelligent retry logic for failed API requests
 */
export const retryRequest = async (
    error: AxiosError,
    retryCount: number,
    context: RequestContext
): Promise<boolean> => {
    if (retryCount >= apiConfig.retryConfig.maxRetries) {
        return false;
    }

    const statusCode = error.response?.status;
    if (!statusCode || !apiConfig.retryConfig.statusCodesToRetry.includes(statusCode)) {
        return false;
    }

    // Calculate exponential backoff delay
    const delay = Math.min(
        apiConfig.retryConfig.retryDelay * Math.pow(apiConfig.retryConfig.backoffMultiplier, retryCount),
        apiConfig.retryConfig.maxBackoffTime
    );

    // Log retry attempt
    console.info('Retrying request:', {
        attempt: retryCount + 1,
        delay,
        context
    });

    await new Promise(resolve => setTimeout(resolve, delay));
    return true;
};

/**
 * Cache response data for GET requests
 */
const cacheResponse = async (key: string, response: any): Promise<void> => {
    if (apiConfig.cacheConfig.enabled) {
        try {
            const cacheData = {
                data: response.data,
                timestamp: Date.now()
            };
            localStorage.setItem(key, JSON.stringify(cacheData));
        } catch (error) {
            console.warn('Cache storage failed:', error);
        }
    }
};

/**
 * Retrieve cached response data
 */
const getCachedResponse = async (key: string): Promise<any | null> => {
    if (apiConfig.cacheConfig.enabled) {
        try {
            const cached = localStorage.getItem(key);
            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < apiConfig.cacheConfig.maxAge) {
                    return { data, cached: true };
                }
                localStorage.removeItem(key);
            }
        } catch (error) {
            console.warn('Cache retrieval failed:', error);
        }
    }
    return null;
};

// Export configured axios instance
export const axiosInstance = createAxiosInstance();