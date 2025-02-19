import { io, Socket, ManagerOptions } from 'socket.io-client'; // ^4.7.2
import { IWebSocketConfig, websocketConfig } from '../config/websocket.config';

/**
 * Interface for pending messages that need to be queued when offline
 */
interface PendingMessage {
  event: string;
  data: any;
  attempts: number;
  timestamp: number;
  resolve: (value: void | PromiseLike<void>) => void;
  reject: (reason?: any) => void;
}

/**
 * Interface for subscription options
 */
interface SubscriptionOptions {
  timeout?: number;
  retries?: number;
  acknowledgment?: boolean;
}

/**
 * Interface for emit options
 */
interface EmitOptions {
  timeout?: number;
  retries?: number;
  priority?: 'high' | 'normal' | 'low';
  acknowledgment?: boolean;
}

/**
 * WebSocketService class provides a robust implementation for real-time
 * communication with comprehensive error handling and message delivery guarantees
 */
export class WebSocketService {
  private socket: Socket | null = null;
  private readonly config: IWebSocketConfig;
  private isConnected: boolean = false;
  private messageQueue: PendingMessage[] = [];
  private reconnectAttempts: number = 0;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private readonly eventListeners: Map<string, Function[]> = new Map();
  private readonly MAX_RECONNECT_ATTEMPTS: number = 5;
  private readonly CONNECTION_TIMEOUT: number = 10000;
  private readonly MESSAGE_RETRY_DELAY: number = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  /**
   * Creates an instance of WebSocketService
   * @param config - WebSocket configuration
   */
  constructor(config: IWebSocketConfig = websocketConfig) {
    this.config = {
      ...config,
      options: {
        ...config.options,
        reconnection: true,
        timeout: this.CONNECTION_TIMEOUT,
      },
    };
  }

  /**
   * Establishes WebSocket connection with automatic reconnection
   * @returns Promise that resolves when connection is established
   */
  public async connect(): Promise<void> {
    if (this.socket?.connected) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        this.socket = io(this.config.url, this.config.options);
        this.setupConnectionHandlers(resolve, reject);
        this.setupHeartbeat();
        this.setupReconnection();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Gracefully disconnects the WebSocket connection
   */
  public disconnect(): void {
    this.clearHeartbeat();
    this.clearConnectionTimeout();
    this.reconnectAttempts = 0;
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.isConnected = false;
    this.emit(this.config.events.DISCONNECT, null);
  }

  /**
   * Subscribes to WebSocket events with delivery guarantees
   * @param event - Event name to subscribe to
   * @param callback - Callback function to handle the event
   * @param options - Subscription options
   */
  public subscribe(
    event: string,
    callback: Function,
    options: SubscriptionOptions = {}
  ): void {
    if (!event || typeof callback !== 'function') {
      throw new Error('Invalid event or callback');
    }

    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }

    const listeners = this.eventListeners.get(event)!;
    listeners.push(callback);

    if (this.socket) {
      this.socket.on(event, async (data: any) => {
        try {
          if (options.acknowledgment) {
            await callback(data);
            this.socket?.emit(`${event}:ack`);
          } else {
            callback(data);
          }
        } catch (error) {
          console.error(`Error handling event ${event}:`, error);
        }
      });
    }
  }

  /**
   * Emits events with guaranteed delivery and offline queuing
   * @param event - Event name to emit
   * @param data - Data to send
   * @param options - Emit options
   * @returns Promise that resolves when message is delivered
   */
  public async emit(
    event: string,
    data: any,
    options: EmitOptions = {}
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const message: PendingMessage = {
        event,
        data,
        attempts: 0,
        timestamp: Date.now(),
        resolve,
        reject,
      };

      if (!this.isConnected) {
        this.queueMessage(message);
        return;
      }

      this.sendMessage(message, options);
    });
  }

  /**
   * Returns the current connection status
   * @returns Boolean indicating if socket is connected
   */
  public isSocketConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Sets up connection event handlers
   * @param resolve - Promise resolve function
   * @param reject - Promise reject function
   */
  private setupConnectionHandlers(
    resolve: (value: void | PromiseLike<void>) => void,
    reject: (reason?: any) => void
  ): void {
    if (!this.socket) return;

    this.connectionTimeout = setTimeout(() => {
      reject(new Error('Connection timeout'));
      this.disconnect();
    }, this.CONNECTION_TIMEOUT);

    this.socket.on(this.config.events.CONNECT, () => {
      this.clearConnectionTimeout();
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.processMessageQueue();
      resolve();
    });

    this.socket.on(this.config.events.ERROR, (error: Error) => {
      console.error('WebSocket error:', error);
      reject(error);
    });

    this.socket.on(this.config.events.DISCONNECT, () => {
      this.isConnected = false;
      this.handleDisconnection();
    });
  }

  /**
   * Sets up heartbeat mechanism to detect connection issues
   */
  private setupHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping');
      }
    }, 30000);
  }

  /**
   * Clears the heartbeat interval
   */
  private clearHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Sets up reconnection logic with exponential backoff
   */
  private setupReconnection(): void {
    if (!this.socket) return;

    this.socket.io.on('reconnect_attempt', () => {
      this.reconnectAttempts++;
      if (this.reconnectAttempts > this.MAX_RECONNECT_ATTEMPTS) {
        this.disconnect();
      }
    });
  }

  /**
   * Handles disconnection events
   */
  private handleDisconnection(): void {
    this.isConnected = false;
    if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
      this.attemptReconnection();
    }
  }

  /**
   * Attempts to reconnect to the WebSocket server
   */
  private attemptReconnection(): void {
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 5000);
    setTimeout(() => {
      this.connect().catch(console.error);
    }, delay);
  }

  /**
   * Queues a message for later delivery
   * @param message - Message to queue
   */
  private queueMessage(message: PendingMessage): void {
    this.messageQueue.push(message);
  }

  /**
   * Processes the message queue after reconnection
   */
  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.sendMessage(message);
      }
    }
  }

  /**
   * Sends a message with retry logic
   * @param message - Message to send
   * @param options - Emit options
   */
  private sendMessage(
    message: PendingMessage,
    options: EmitOptions = {}
  ): void {
    if (!this.socket) {
      message.reject(new Error('No socket connection'));
      return;
    }

    const timeout = options.timeout || 5000;
    const maxRetries = options.retries || 3;

    const send = () => {
      if (message.attempts >= maxRetries) {
        message.reject(new Error('Max retries exceeded'));
        return;
      }

      message.attempts++;

      const timeoutId = setTimeout(() => {
        if (options.acknowledgment) {
          retry();
        }
      }, timeout);

      this.socket!.emit(message.event, message.data, () => {
        clearTimeout(timeoutId);
        message.resolve();
      });
    };

    const retry = () => {
      setTimeout(send, this.MESSAGE_RETRY_DELAY);
    };

    send();
  }

  /**
   * Clears the connection timeout
   */
  private clearConnectionTimeout(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }
}