/**
 * API Service
 * Version: 1.0.0
 * 
 * Core API service that provides a configured Axios instance and methods for making
 * HTTP requests to backend microservices with comprehensive error handling,
 * authentication, retry logic, and performance optimization.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'; // ^1.6.0
import axiosRetry from 'axios-retry'; // ^3.8.0
import { apiConfig } from '../config/api.config';
import { handleApiError } from '../utils/error.util';
import { getAuthHeaders } from '../utils/auth.util';

/**
 * Interface for request cache entry
 */
interface CacheEntry<T> {
    data: T;
    timestamp: number;
    expiresAt: number;
}

/**
 * API Service class for handling HTTP requests with enhanced features
 */
export class ApiService {
    private readonly axiosInstance: AxiosInstance;
    private readonly cache: Map<string, CacheEntry<any>>;
    private readonly pendingRequests: Map<string, Promise<any>>;

    constructor() {
        this.axiosInstance = this.createAxiosInstance();
        this.cache = new Map();
        this.pendingRequests = new Map();
        this.setupRequestDeduplication();
    }

    /**
     * Creates and configures an Axios instance with enhanced features
     */
    private createAxiosInstance(): AxiosInstance {
        const instance = axios.create({
            baseURL: apiConfig.baseURL,
            timeout: apiConfig.timeout,
            headers: apiConfig.headers
        });

        // Configure retry logic with exponential backoff
        axiosRetry(instance, {
            retries: apiConfig.retryConfig.maxRetries,
            retryDelay: (retryCount) => {
                const delay = Math.min(
                    apiConfig.retryConfig.retryDelay * Math.pow(2, retryCount - 1),
                    apiConfig.retryConfig.maxBackoffTime
                );
                return delay + Math.random() * 1000; // Add jitter
            },
            retryCondition: (error) => {
                return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
                    apiConfig.retryConfig.statusCodesToRetry.includes(error.response?.status || 0);
            }
        });

        // Request interceptor for authentication and request enhancement
        instance.interceptors.request.use(
            async (config) => {
                const authHeaders = await getAuthHeaders();
                config.headers = {
                    ...config.headers,
                    ...authHeaders,
                    'X-Request-ID': this.generateRequestId()
                };
                return config;
            },
            (error) => Promise.reject(handleApiError(error))
        );

        // Response interceptor for error handling and response processing
        instance.interceptors.response.use(
            (response) => response,
            (error) => Promise.reject(handleApiError(error))
        );

        return instance;
    }

    /**
     * Generates a unique request ID for tracing
     */
    private generateRequestId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Sets up request deduplication to prevent duplicate in-flight requests
     */
    private setupRequestDeduplication(): void {
        this.axiosInstance.interceptors.request.use(
            (config) => {
                const requestKey = this.getRequestKey(config);
                const pendingRequest = this.pendingRequests.get(requestKey);

                if (pendingRequest) {
                    return pendingRequest;
                }

                return config;
            }
        );
    }

    /**
     * Generates a unique key for request deduplication
     */
    private getRequestKey(config: AxiosRequestConfig): string {
        return `${config.method}-${config.url}-${JSON.stringify(config.params)}`;
    }

    /**
     * Generic GET request method with caching and error handling
     */
    public async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
        const cacheKey = `GET-${endpoint}-${JSON.stringify(params)}`;
        
        // Check cache first
        const cachedResponse = this.checkCache<T>(cacheKey);
        if (cachedResponse) {
            return cachedResponse;
        }

        try {
            const response = await this.axiosInstance.get<T>(endpoint, { params });
            this.updateCache(cacheKey, response.data);
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    }

    /**
     * Generic POST request method with error handling
     */
    public async post<T>(endpoint: string, data: any): Promise<T> {
        try {
            const response = await this.axiosInstance.post<T>(endpoint, data);
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    }

    /**
     * Generic PUT request method with error handling
     */
    public async put<T>(endpoint: string, data: any): Promise<T> {
        try {
            const response = await this.axiosInstance.put<T>(endpoint, data);
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    }

    /**
     * Generic DELETE request method with error handling
     */
    public async delete<T>(endpoint: string): Promise<T> {
        try {
            const response = await this.axiosInstance.delete<T>(endpoint);
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    }

    /**
     * Checks if cached response is valid
     */
    private checkCache<T>(key: string): T | null {
        const cached = this.cache.get(key);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    /**
     * Updates cache with new response data
     */
    private updateCache<T>(key: string, data: T): void {
        if (apiConfig.cacheConfig.enabled) {
            this.cache.set(key, {
                data,
                timestamp: Date.now(),
                expiresAt: Date.now() + apiConfig.cacheConfig.maxAge
            });
        }
    }

    /**
     * Clears the entire request cache
     */
    public clearCache(): void {
        this.cache.clear();
    }
}

// Export singleton instance
export const apiService = new ApiService();