/// <reference types="vite/client" />

/**
 * Type definitions for Vite environment variables
 * @version 1.0.0
 * @package vite ^4.4.5
 */

interface ImportMetaEnv {
  /**
   * Base URL for API endpoints
   * @type {string}
   * @example "https://api.taskmanagement.com"
   */
  readonly VITE_API_URL: string;

  /**
   * Authentication service URL
   * @type {string}
   * @example "https://auth.taskmanagement.com"
   */
  readonly VITE_AUTH_URL: string;

  /**
   * WebSocket server URL for real-time updates
   * @type {string}
   * @example "wss://ws.taskmanagement.com"
   */
  readonly VITE_WEBSOCKET_URL: string;

  /**
   * Current application environment
   * @type {string}
   * @example "production" | "staging" | "development"
   */
  readonly VITE_APP_ENV: string;

  /**
   * Application version number
   * @type {string}
   * @example "1.0.0"
   */
  readonly VITE_APP_VERSION: string;

  /**
   * CDN base URL for static assets
   * @type {string}
   * @example "https://cdn.taskmanagement.com"
   */
  readonly VITE_CDN_URL: string;

  /**
   * Storage service URL for file uploads
   * @type {string}
   * @example "https://storage.taskmanagement.com"
   */
  readonly VITE_STORAGE_URL: string;

  /**
   * Analytics tracking identifier
   * @type {string}
   * @example "UA-XXXXXXXXX-X"
   */
  readonly VITE_ANALYTICS_ID: string;

  /**
   * Feature flags configuration JSON string
   * @type {string}
   * @example '{"newDashboard":true,"betaFeatures":false}'
   */
  readonly VITE_FEATURE_FLAGS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}