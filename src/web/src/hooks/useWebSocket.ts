import { useState, useEffect, useCallback, useRef } from 'react'; // ^18.2.0
import { WebSocketService } from '../services/websocket.service';
import { websocketConfig } from '../config/websocket.config';
import { INotification } from '../interfaces/notification.interface';

/**
 * Enum for WebSocket connection states
 */
export enum ConnectionState {
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  RECONNECTING = 'RECONNECTING',
  ERROR = 'ERROR'
}

/**
 * Interface for message queue status
 */
interface QueueStatus {
  pending: number;
  processed: number;
  failed: number;
  lastProcessed: Date | null;
}

/**
 * Interface for the useWebSocket hook return value
 */
export interface IUseWebSocket {
  isConnected: boolean;
  connectionState: ConnectionState;
  connect: () => Promise<void>;
  disconnect: () => void;
  subscribe: (event: string, callback: Function) => void;
  unsubscribe: (event: string, callback: Function) => void;
  emit: (event: string, data: any) => Promise<boolean>;
  retryCount: number;
  lastHeartbeat: Date | null;
  messageQueueStatus: QueueStatus;
}

/**
 * Custom hook for managing WebSocket connections with enhanced reliability features
 * @param autoConnect - Whether to connect automatically on mount
 * @param config - Custom WebSocket configuration
 * @returns WebSocket interface with connection management and status information
 */
export const useWebSocket = (
  autoConnect: boolean = true,
  config = websocketConfig
): IUseWebSocket => {
  // State management
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.DISCONNECTED
  );
  const [retryCount, setRetryCount] = useState<number>(0);
  const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(null);
  const [messageQueueStatus, setMessageQueueStatus] = useState<QueueStatus>({
    pending: 0,
    processed: 0,
    failed: 0,
    lastProcessed: null
  });

  // Refs for persistent values
  const wsService = useRef<WebSocketService | null>(null);
  const subscriptions = useRef<Map<string, Set<Function>>>(new Map());

  /**
   * Initializes the WebSocket service
   */
  const initializeService = useCallback(() => {
    if (!wsService.current) {
      wsService.current = new WebSocketService(config);
    }
  }, [config]);

  /**
   * Connects to the WebSocket server
   */
  const connect = useCallback(async (): Promise<void> => {
    try {
      setConnectionState(ConnectionState.CONNECTING);
      await wsService.current?.connect();
      setIsConnected(true);
      setConnectionState(ConnectionState.CONNECTED);
      setRetryCount(0);
    } catch (error) {
      setConnectionState(ConnectionState.ERROR);
      console.error('WebSocket connection error:', error);
      throw error;
    }
  }, []);

  /**
   * Disconnects from the WebSocket server
   */
  const disconnect = useCallback((): void => {
    wsService.current?.disconnect();
    setIsConnected(false);
    setConnectionState(ConnectionState.DISCONNECTED);
    setLastHeartbeat(null);
  }, []);

  /**
   * Subscribes to a WebSocket event
   */
  const subscribe = useCallback((event: string, callback: Function): void => {
    if (!subscriptions.current.has(event)) {
      subscriptions.current.set(event, new Set());
    }
    
    subscriptions.current.get(event)?.add(callback);
    wsService.current?.subscribe(event, callback, { acknowledgment: true });
  }, []);

  /**
   * Unsubscribes from a WebSocket event
   */
  const unsubscribe = useCallback((event: string, callback: Function): void => {
    subscriptions.current.get(event)?.delete(callback);
    if (subscriptions.current.get(event)?.size === 0) {
      subscriptions.current.delete(event);
    }
  }, []);

  /**
   * Emits a WebSocket event with guaranteed delivery
   */
  const emit = useCallback(async (event: string, data: any): Promise<boolean> => {
    try {
      if (!wsService.current) return false;
      
      await wsService.current.emit(event, data, {
        timeout: 5000,
        retries: 3,
        acknowledgment: true
      });
      
      setMessageQueueStatus(prev => ({
        ...prev,
        processed: prev.processed + 1,
        lastProcessed: new Date()
      }));
      
      return true;
    } catch (error) {
      setMessageQueueStatus(prev => ({
        ...prev,
        failed: prev.failed + 1
      }));
      console.error('Error emitting WebSocket event:', error);
      return false;
    }
  }, []);

  /**
   * Sets up WebSocket event handlers
   */
  const setupEventHandlers = useCallback(() => {
    if (!wsService.current) return;

    wsService.current.subscribe(config.events.CONNECT, () => {
      setIsConnected(true);
      setConnectionState(ConnectionState.CONNECTED);
    });

    wsService.current.subscribe(config.events.DISCONNECT, () => {
      setIsConnected(false);
      setConnectionState(ConnectionState.DISCONNECTED);
    });

    wsService.current.subscribe(config.events.ERROR, (error: Error) => {
      setConnectionState(ConnectionState.ERROR);
      console.error('WebSocket error:', error);
    });

    // Heartbeat handling
    wsService.current.subscribe('pong', () => {
      setLastHeartbeat(new Date());
    });
  }, [config.events]);

  /**
   * Handles reconnection attempts
   */
  const handleReconnection = useCallback(() => {
    if (!isConnected && connectionState !== ConnectionState.CONNECTING) {
      setConnectionState(ConnectionState.RECONNECTING);
      setRetryCount(prev => prev + 1);
      connect().catch(() => {
        if (retryCount >= config.options.reconnectionAttempts) {
          setConnectionState(ConnectionState.ERROR);
        }
      });
    }
  }, [isConnected, connectionState, retryCount, connect, config.options.reconnectionAttempts]);

  // Initialize WebSocket service
  useEffect(() => {
    initializeService();
    setupEventHandlers();

    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
      subscriptions.current.clear();
    };
  }, [initializeService, setupEventHandlers, autoConnect, connect, disconnect]);

  // Handle reconnection
  useEffect(() => {
    if (!isConnected && connectionState === ConnectionState.DISCONNECTED) {
      const reconnectTimer = setTimeout(handleReconnection, config.options.reconnectionDelay);
      return () => clearTimeout(reconnectTimer);
    }
  }, [isConnected, connectionState, handleReconnection, config.options.reconnectionDelay]);

  return {
    isConnected,
    connectionState,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    emit,
    retryCount,
    lastHeartbeat,
    messageQueueStatus
  };
};