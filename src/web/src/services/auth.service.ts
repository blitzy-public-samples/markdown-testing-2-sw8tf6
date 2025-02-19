/**
 * Authentication Service
 * Version: 1.0.0
 * 
 * Provides comprehensive authentication functionality with enhanced security features:
 * - Secure token management with automatic refresh
 * - Multi-factor authentication support
 * - Request deduplication
 * - Enhanced error handling
 * - Session management
 */

import { Auth0Client } from '@auth0/auth0-spa-js'; // v2.1.0
import {
    LoginCredentials,
    RegistrationData,
    AuthResponse,
    PasswordResetData,
    MFASetupData,
    AuthError
} from '../interfaces/auth.interface';
import { authConfig } from '../config/auth.config';
import { axiosInstance, handleApiError, ApiError } from '../utils/api.util';
import { AUTH_ERROR_MESSAGES, AUTH_ENDPOINTS, AUTH_STORAGE_KEYS, AUTH_TIMEOUTS } from '../constants/auth.constants';
import { IUser, UserRole } from '../interfaces/user.interface';

export class AuthService {
    private auth0Client: Auth0Client | null = null;
    private accessToken: string | null = null;
    private refreshToken: string | null = null;
    private tokenExpiryTime: number = 0;
    private isAuthenticated: boolean = false;
    private pendingRequests: Map<string, Promise<any>> = new Map();
    private refreshTokenPromise: Promise<string> | null = null;

    constructor() {
        this.initializeAuth0Client();
        this.setupTokenRefreshMonitor();
    }

    /**
     * Initializes Auth0 client with enhanced security configuration
     */
    private async initializeAuth0Client(): Promise<void> {
        try {
            this.auth0Client = await createAuth0Client();
        } catch (error) {
            console.error('Auth0 client initialization failed:', error);
            throw new Error('Authentication service initialization failed');
        }
    }

    /**
     * Authenticates user with enhanced security measures
     */
    public async login(credentials: LoginCredentials): Promise<AuthResponse> {
        try {
            // Request deduplication
            const cacheKey = `login-${credentials.email}`;
            if (this.pendingRequests.has(cacheKey)) {
                return this.pendingRequests.get(cacheKey);
            }

            const loginPromise = this.performLogin(credentials);
            this.pendingRequests.set(cacheKey, loginPromise);

            const response = await loginPromise;
            this.pendingRequests.delete(cacheKey);
            return response;
        } catch (error) {
            const apiError = error as ApiError;
            if (apiError.statusCode === 401) {
                throw new Error(AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS);
            }
            throw error;
        }
    }

    /**
     * Performs the actual login operation with security checks
     */
    private async performLogin(credentials: LoginCredentials): Promise<AuthResponse> {
        const response = await axiosInstance.post<AuthResponse>(
            AUTH_ENDPOINTS.LOGIN,
            credentials
        );

        const authResponse = response.data;
        this.setAuthenticationState(authResponse);
        return authResponse;
    }

    /**
     * Registers new user with enhanced validation
     */
    public async register(data: RegistrationData): Promise<AuthResponse> {
        try {
            const response = await axiosInstance.post<AuthResponse>(
                AUTH_ENDPOINTS.REGISTER,
                data
            );

            const authResponse = response.data;
            this.setAuthenticationState(authResponse);
            return authResponse;
        } catch (error) {
            throw await handleApiError(error as ApiError, {
                endpoint: AUTH_ENDPOINTS.REGISTER,
                method: 'POST',
                timestamp: Date.now(),
                correlationId: `reg-${Date.now()}`
            });
        }
    }

    /**
     * Sets up Multi-Factor Authentication
     */
    public async setupMFA(): Promise<MFASetupData> {
        if (!this.isAuthenticated) {
            throw new Error(AUTH_ERROR_MESSAGES.TOKEN_MISSING);
        }

        try {
            const response = await axiosInstance.post<MFASetupData>(
                AUTH_ENDPOINTS.MFA_SETUP,
                {},
                {
                    headers: { Authorization: `Bearer ${this.accessToken}` }
                }
            );

            return response.data;
        } catch (error) {
            throw await handleApiError(error as ApiError, {
                endpoint: AUTH_ENDPOINTS.MFA_SETUP,
                method: 'POST',
                timestamp: Date.now(),
                correlationId: `mfa-${Date.now()}`
            });
        }
    }

    /**
     * Handles secure token refresh with deduplication
     */
    public async refreshToken(): Promise<string> {
        if (this.refreshTokenPromise) {
            return this.refreshTokenPromise;
        }

        this.refreshTokenPromise = this.performTokenRefresh();
        try {
            const newToken = await this.refreshTokenPromise;
            return newToken;
        } finally {
            this.refreshTokenPromise = null;
        }
    }

    /**
     * Performs the actual token refresh operation
     */
    private async performTokenRefresh(): Promise<string> {
        if (!this.refreshToken) {
            throw new Error(AUTH_ERROR_MESSAGES.TOKEN_MISSING);
        }

        try {
            const response = await axiosInstance.post<AuthResponse>(
                AUTH_ENDPOINTS.REFRESH_TOKEN,
                { refreshToken: this.refreshToken }
            );

            const { accessToken, refreshToken, expiresIn } = response.data;
            this.updateTokens(accessToken, refreshToken, expiresIn);
            return accessToken;
        } catch (error) {
            this.handleAuthError(error as ApiError);
            throw error;
        }
    }

    /**
     * Updates authentication state with new tokens
     */
    private setAuthenticationState(authResponse: AuthResponse): void {
        const { accessToken, refreshToken, expiresIn } = authResponse;
        this.updateTokens(accessToken, refreshToken, expiresIn);
        this.isAuthenticated = true;
        this.setupTokenRefreshMonitor();
    }

    /**
     * Updates stored tokens with security measures
     */
    private updateTokens(accessToken: string, refreshToken: string, expiresIn: number): void {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.tokenExpiryTime = Date.now() + (expiresIn * 1000);

        // Secure token storage
        localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, accessToken);
        localStorage.setItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    }

    /**
     * Monitors token expiration and triggers refresh
     */
    private setupTokenRefreshMonitor(): void {
        setInterval(() => {
            if (this.shouldRefreshToken()) {
                this.refreshToken().catch(console.error);
            }
        }, authConfig.tokenConfig.refreshThreshold * 1000);
    }

    /**
     * Determines if token refresh is needed
     */
    private shouldRefreshToken(): boolean {
        if (!this.accessToken || !this.tokenExpiryTime) {
            return false;
        }
        const timeUntilExpiry = this.tokenExpiryTime - Date.now();
        return timeUntilExpiry <= authConfig.tokenConfig.refreshThreshold * 1000;
    }

    /**
     * Handles authentication errors with appropriate responses
     */
    private handleAuthError(error: ApiError): void {
        this.isAuthenticated = false;
        localStorage.removeItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN);
        throw error;
    }

    /**
     * Logs out user and cleans up session
     */
    public async logout(): Promise<void> {
        try {
            if (this.accessToken) {
                await axiosInstance.post(AUTH_ENDPOINTS.LOGOUT);
            }
        } finally {
            this.cleanupSession();
        }
    }

    /**
     * Cleans up session data
     */
    private cleanupSession(): void {
        this.accessToken = null;
        this.refreshToken = null;
        this.isAuthenticated = false;
        this.tokenExpiryTime = 0;
        localStorage.clear();
    }
}

export const authService = new AuthService();