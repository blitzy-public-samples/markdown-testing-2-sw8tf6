import { ApiService } from '../../src/services/api.service';
import { apiConfig } from '../../src/config/api.config';
import { ERROR_MESSAGES } from '../../src/constants/error.constants';
import { AUTH_ERROR_MESSAGES } from '../../src/constants/auth.constants';
import axios from 'axios'; // ^1.6.0
import MockAdapter from 'axios-mock-adapter'; // ^1.22.0
import { performance } from 'perf_hooks';

describe('ApiService', () => {
    let apiService: ApiService;
    let mockAxios: MockAdapter;

    beforeAll(() => {
        // Configure test environment
        jest.setTimeout(10000); // 10 second timeout for async tests
    });

    beforeEach(() => {
        apiService = new ApiService();
        mockAxios = new MockAdapter(axios);
        // Reset circuit breaker and cache state
        apiService.clearCache();
    });

    afterEach(() => {
        mockAxios.reset();
        jest.clearAllMocks();
    });

    describe('Configuration', () => {
        it('should initialize with correct config', () => {
            expect(apiService).toBeInstanceOf(ApiService);
            const axiosInstance = (apiService as any).axiosInstance;
            expect(axiosInstance.defaults.baseURL).toBe(apiConfig.baseURL);
            expect(axiosInstance.defaults.timeout).toBe(apiConfig.timeout);
            expect(axiosInstance.defaults.headers['Content-Type']).toBe('application/json');
        });

        it('should apply retry configuration', () => {
            const config = (apiService as any).axiosInstance.defaults;
            expect(config.raxConfig).toBeDefined();
            expect(config.raxConfig.retry).toBe(apiConfig.retryConfig.maxRetries);
            expect(config.raxConfig.retryDelay).toBeDefined();
        });
    });

    describe('HTTP Methods', () => {
        const testEndpoint = '/test';
        const testData = { id: 1, name: 'Test' };

        it('should make successful GET request', async () => {
            mockAxios.onGet(testEndpoint).reply(200, testData);
            const startTime = performance.now();
            
            const response = await apiService.get(testEndpoint);
            
            const endTime = performance.now();
            expect(response).toEqual(testData);
            expect(endTime - startTime).toBeLessThan(apiConfig.timeout);
        });

        it('should make successful POST request', async () => {
            mockAxios.onPost(testEndpoint, testData).reply(201, { ...testData, id: 1 });
            
            const response = await apiService.post(testEndpoint, testData);
            
            expect(response).toEqual({ ...testData, id: 1 });
            expect(mockAxios.history.post[0].data).toBe(JSON.stringify(testData));
        });

        it('should make successful PUT request', async () => {
            const updatedData = { ...testData, name: 'Updated' };
            mockAxios.onPut(`${testEndpoint}/1`, updatedData).reply(200, updatedData);
            
            const response = await apiService.put(`${testEndpoint}/1`, updatedData);
            
            expect(response).toEqual(updatedData);
        });

        it('should make successful DELETE request', async () => {
            mockAxios.onDelete(`${testEndpoint}/1`).reply(204);
            
            await apiService.delete(`${testEndpoint}/1`);
            
            expect(mockAxios.history.delete.length).toBe(1);
        });
    });

    describe('Error Handling and Resilience', () => {
        const testEndpoint = '/test';

        it('should handle network errors with retry', async () => {
            const retryAttempts = [];
            mockAxios.onGet(testEndpoint)
                .replyOnce(500)
                .replyOnce(500)
                .replyOnce(200, { data: 'success' });

            const response = await apiService.get(testEndpoint);

            expect(response).toEqual({ data: 'success' });
            expect(mockAxios.history.get.length).toBe(3);
        });

        it('should handle rate limiting', async () => {
            mockAxios.onGet(testEndpoint).reply(429, {
                message: ERROR_MESSAGES.SYSTEM.RATE_LIMIT_EXCEEDED
            });

            await expect(apiService.get(testEndpoint))
                .rejects
                .toThrow(ERROR_MESSAGES.SYSTEM.RATE_LIMIT_EXCEEDED);
        });

        it('should implement circuit breaker', async () => {
            let errorCount = 0;
            mockAxios.onGet(testEndpoint).reply(() => {
                errorCount++;
                return [500];
            });

            // Make multiple requests to trigger circuit breaker
            const requests = Array(6).fill(null).map(() => apiService.get(testEndpoint));
            
            await Promise.all(requests.map(p => p.catch(() => {})));
            
            expect(errorCount).toBeLessThanOrEqual(5); // Circuit breaker should prevent additional requests
        });
    });

    describe('Authentication and Security', () => {
        const testEndpoint = '/secure';
        const mockToken = 'mock-jwt-token';

        it('should handle token refresh flow', async () => {
            mockAxios.onGet(testEndpoint)
                .replyOnce(401, { message: AUTH_ERROR_MESSAGES.SESSION_EXPIRED })
                .replyOnce(200, { data: 'success' });

            mockAxios.onPost(apiConfig.endpoints.AUTH.REFRESH)
                .reply(200, { accessToken: 'new-token' });

            const response = await apiService.get(testEndpoint);

            expect(response).toEqual({ data: 'success' });
            expect(mockAxios.history.post).toHaveLength(1);
            expect(mockAxios.history.get[1].headers.Authorization).toBe('Bearer new-token');
        });

        it('should include security headers', async () => {
            mockAxios.onGet(testEndpoint).reply(200, { data: 'success' });

            await apiService.get(testEndpoint);

            const headers = mockAxios.history.get[0].headers;
            expect(headers['X-Request-ID']).toBeDefined();
            expect(headers['X-Client-Version']).toBeDefined();
        });
    });

    describe('Performance and Caching', () => {
        const testEndpoint = '/cached';
        const testData = { id: 1, data: 'test' };

        it('should cache GET requests', async () => {
            mockAxios.onGet(testEndpoint).reply(200, testData);

            // First request
            const response1 = await apiService.get(testEndpoint);
            // Second request should use cache
            const response2 = await apiService.get(testEndpoint);

            expect(response1).toEqual(testData);
            expect(response2).toEqual(testData);
            expect(mockAxios.history.get.length).toBe(1); // Only one actual API call
        });

        it('should measure response times', async () => {
            mockAxios.onGet(testEndpoint).reply(200, testData);

            const startTime = performance.now();
            await apiService.get(testEndpoint);
            const endTime = performance.now();

            expect(endTime - startTime).toBeLessThan(apiConfig.timeout);
        });

        it('should handle concurrent requests', async () => {
            mockAxios.onGet(testEndpoint).reply(200, testData);

            const requests = Array(5).fill(null).map(() => apiService.get(testEndpoint));
            const responses = await Promise.all(requests);

            expect(responses).toHaveLength(5);
            expect(mockAxios.history.get.length).toBe(1); // Deduplication should work
        });
    });
});