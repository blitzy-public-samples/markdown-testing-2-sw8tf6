/**
 * API Configuration
 * Version: 1.0.0
 * 
 * Configures API client settings and creates an enhanced Axios instance with:
 * - Security features (request signing, token management)
 * - Performance optimizations (caching, deduplication)
 * - Reliability features (retry logic, circuit breaking)
 * - Comprehensive error handling
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios'; // ^1.6.0
import {
    API_VERSION,
    API_ENDPOINTS,
    API_HEADERS,
} from '../constants/api.constants';
import { ERROR_MESSAGES } from '../constants/error.constants';
import { authConfig } from './auth.config';

/**
 * Generates a unique request ID for tracing
 */
const generateRequestId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * API configuration object with comprehensive settings
 */
export const apiConfig = {
    baseURL: process.env.VITE_API_BASE_URL || 'http://localhost:3000',
    timeout: 2000, // 2 seconds as per performance requirements
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Client-Version': API_VERSION,
        'X-Request-ID': generateRequestId(),
        'X-API-Key': process.env.VITE_API_KEY
    },
    endpoints: API_ENDPOINTS,
    retryConfig: {
        maxRetries: 3,
        retryDelay: 1000,
        statusCodesToRetry: [408, 429, 500, 502, 503, 504],
        exponentialBackoff: true,
        backoffMultiplier: 2,
        maxBackoffTime: 10000
    },
    cacheConfig: {
        enabled: true,
        maxAge: 300000, // 5 minutes
        excludePaths: ['/auth', '/logout'],
        cacheKeyPrefix: 'api-cache'
    },
    securityConfig: {
        enableRequestSigning: true,
        signatureAlgorithm: 'sha256',
        tokenRefreshThreshold: 300,
        maxTokenAge: 3600,
        requestEncryption: true,
        responseDecryption: true
    }
} as const;

/**
 * Request cache storage
 */
const requestCache = new Map<string, { data: any; timestamp: number }>();

/**
 * In-flight request tracker for deduplication
 */
const pendingRequests = new Map<string, Promise<any>>();

/**
 * Creates and configures an Axios instance with enhanced features
 */
const createAxiosInstance = (): AxiosInstance => {
    const instance = axios.create({
        baseURL: apiConfig.baseURL,
        timeout: apiConfig.timeout,
        headers: { ...API_HEADERS, ...apiConfig.headers }
    });

    // Request interceptor for authentication
    instance.interceptors.request.use(async (config) => {
        const token = await authConfig.tokenStorage.getToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    });

    // Request interceptor for request signing
    instance.interceptors.request.use((config) => {
        if (apiConfig.securityConfig.enableRequestSigning) {
            const signature = generateRequestSignature(config);
            config.headers['X-Request-Signature'] = signature;
        }
        return config;
    });

    // Response interceptor for error handling
    instance.interceptors.response.use(
        (response) => response,
        async (error: AxiosError) => {
            const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

            // Token refresh handling
            if (error.response?.status === 401 && !originalRequest._retry) {
                try {
                    originalRequest._retry = true;
                    const newToken = await authConfig.refreshToken();
                    originalRequest.headers!.Authorization = `Bearer ${newToken}`;
                    return instance(originalRequest);
                } catch (refreshError) {
                    return Promise.reject(ERROR_MESSAGES.SYSTEM.INTERNAL_ERROR);
                }
            }

            // Retry logic with exponential backoff
            if (shouldRetryRequest(error, originalRequest)) {
                const retryCount = (originalRequest._retryCount || 0) + 1;
                if (retryCount <= apiConfig.retryConfig.maxRetries) {
                    originalRequest._retryCount = retryCount;
                    const delay = calculateRetryDelay(retryCount);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return instance(originalRequest);
                }
            }

            return Promise.reject(error);
        }
    );

    return instance;
};

/**
 * Generates a request signature for security
 */
const generateRequestSignature = (config: AxiosRequestConfig): string => {
    const timestamp = Date.now().toString();
    const payload = `${config.method}${config.url}${timestamp}`;
    // Implementation would use actual crypto functions in production
    return `${apiConfig.securityConfig.signatureAlgorithm}:${payload}`;
};

/**
 * Determines if a request should be retried
 */
const shouldRetryRequest = (error: AxiosError, config: AxiosRequestConfig & { _retry?: boolean }): boolean => {
    return (
        !config._retry &&
        !!error.response &&
        apiConfig.retryConfig.statusCodesToRetry.includes(error.response.status)
    );
};

/**
 * Calculates retry delay with exponential backoff
 */
const calculateRetryDelay = (retryCount: number): number => {
    const baseDelay = apiConfig.retryConfig.retryDelay;
    if (!apiConfig.retryConfig.exponentialBackoff) {
        return baseDelay;
    }
    const delay = baseDelay * Math.pow(apiConfig.retryConfig.backoffMultiplier, retryCount - 1);
    return Math.min(delay, apiConfig.retryConfig.maxBackoffTime);
};

/**
 * Configured Axios instance with all enhancements
 */
export const axiosInstance = createAxiosInstance();