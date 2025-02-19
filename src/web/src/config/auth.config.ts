/**
 * Authentication Configuration
 * Version: 1.0.0
 * 
 * Configures authentication settings and parameters for the frontend application.
 * Implements OAuth2.0 with Auth0 integration, JWT token management, session handling,
 * and comprehensive security policies.
 */

import { Auth0Client } from '@auth0/auth0-spa-js'; // v2.1.0
import {
    AUTH_ROLES,
    AUTH_STORAGE_KEYS,
    AUTH_ENDPOINTS,
    AUTH_TIMEOUTS,
    PASSWORD_VALIDATION
} from '../constants/auth.constants';

/**
 * Core Auth0 configuration settings
 */
export const authConfig = {
    auth0: {
        domain: process.env.REACT_APP_AUTH0_DOMAIN as string,
        clientId: process.env.REACT_APP_AUTH0_CLIENT_ID as string,
        audience: process.env.REACT_APP_AUTH0_AUDIENCE as string,
        redirectUri: `${window.location.origin}/callback`,
        scope: 'openid profile email offline_access',
        cacheLocation: 'localstorage',
        useRefreshTokens: true
    },

    /**
     * Token management configuration with refresh mechanisms
     */
    tokenConfig: {
        accessTokenExpiry: AUTH_TIMEOUTS.SESSION_TIMEOUT,
        refreshTokenExpiry: AUTH_TIMEOUTS.SESSION_TIMEOUT * 24, // 24x longer than access token
        refreshThreshold: AUTH_TIMEOUTS.TOKEN_REFRESH_THRESHOLD,
        tokenStorage: {
            type: 'localStorage',
            encryption: true,
            keys: AUTH_STORAGE_KEYS
        }
    },

    /**
     * Session management configuration
     */
    sessionConfig: {
        sessionTimeout: AUTH_TIMEOUTS.SESSION_TIMEOUT,
        inactivityTimeout: AUTH_TIMEOUTS.SESSION_TIMEOUT / 2, // Half of session timeout
        rememberMeDuration: AUTH_TIMEOUTS.SESSION_TIMEOUT * 30, // 30 days
        sessionPersistence: true,
        sessionRenewalThreshold: AUTH_TIMEOUTS.TOKEN_REFRESH_THRESHOLD,
        storageKeys: AUTH_STORAGE_KEYS
    },

    /**
     * Security policy configuration
     */
    securityConfig: {
        mfaEnabled: true,
        mfaEnforcementLevel: 'risk-based' as const,
        passwordPolicy: {
            minLength: PASSWORD_VALIDATION.MIN_LENGTH,
            maxLength: PASSWORD_VALIDATION.MAX_LENGTH,
            requireSpecialChar: PASSWORD_VALIDATION.REQUIRE_SPECIAL_CHARS,
            requireNumber: PASSWORD_VALIDATION.REQUIRE_NUMBERS,
            requireUppercase: PASSWORD_VALIDATION.REQUIRE_UPPERCASE,
            requireLowercase: PASSWORD_VALIDATION.REQUIRE_LOWERCASE,
            maxAge: 90 // days
        },
        maxLoginAttempts: 5,
        lockoutDuration: AUTH_TIMEOUTS.LOGIN_ATTEMPT_TIMEOUT,
        ipWhitelist: process.env.REACT_APP_IP_WHITELIST?.split(',') || [],
        auditLogging: true,
        roles: AUTH_ROLES,
        endpoints: AUTH_ENDPOINTS
    }
} as const;

/**
 * Creates and configures an Auth0 client instance
 * @returns Configured Auth0 client instance
 */
export const createAuth0Client = async (): Promise<Auth0Client> => {
    // Validate required environment variables
    if (!authConfig.auth0.domain || !authConfig.auth0.clientId) {
        throw new Error('Missing required Auth0 configuration parameters');
    }

    // Initialize Auth0 client with configuration
    const auth0Client = new Auth0Client({
        domain: authConfig.auth0.domain,
        client_id: authConfig.auth0.clientId,
        audience: authConfig.auth0.audience,
        redirect_uri: authConfig.auth0.redirectUri,
        scope: authConfig.auth0.scope,
        cacheLocation: authConfig.auth0.cacheLocation,
        useRefreshTokens: authConfig.auth0.useRefreshTokens,
        advancedOptions: {
            defaultScope: authConfig.auth0.scope
        }
    });

    return auth0Client;
};