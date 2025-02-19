import { ManagerOptions } from 'socket.io-client';

// Environment variables for WebSocket configuration
const WS_URL = process.env.VITE_WS_URL || 'ws://localhost:3002';
const WS_PATH = process.env.VITE_WS_PATH || '/ws';

/**
 * Interface defining the structure of WebSocket configuration
 * Ensures type safety and consistent configuration across the application
 * @interface IWebSocketConfig
 */
export interface IWebSocketConfig {
  /** WebSocket server URL */
  url: string;
  /** Socket.IO client configuration options */
  options: ManagerOptions;
  /** Catalog of WebSocket events used in the application */
  events: Record<string, string>;
}

/**
 * Default WebSocket configuration with production-ready settings
 * Implements real-time communication requirements with optimized connection handling
 * @constant
 */
export const websocketConfig: IWebSocketConfig = {
  // WebSocket server URL from environment variables
  url: WS_URL,

  // Socket.IO client configuration with production-optimized settings
  options: {
    // WebSocket endpoint path
    path: WS_PATH,

    // Reconnection strategy
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,

    // Connection behavior
    autoConnect: false,
    transports: ['websocket'],
    withCredentials: true,
  },

  // Comprehensive event catalog for real-time operations
  events: {
    // Connection events
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',
    ERROR: 'error',

    // Task-related events
    TASK_UPDATED: 'task:updated',
    TASK_CREATED: 'task:created',
    TASK_DELETED: 'task:deleted',

    // Project-related events
    PROJECT_UPDATED: 'project:updated',
    PROJECT_CREATED: 'project:created',
    PROJECT_DELETED: 'project:deleted',

    // Notification events
    NOTIFICATION_RECEIVED: 'notification:received',
  },
};

/**
 * Retrieves environment-specific WebSocket configuration
 * @returns {IWebSocketConfig} Configured WebSocket configuration object
 */
export function getWebSocketConfig(): IWebSocketConfig {
  return websocketConfig;
}