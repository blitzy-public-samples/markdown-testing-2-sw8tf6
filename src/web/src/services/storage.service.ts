/**
 * @fileoverview Enhanced service class for managing browser storage operations with
 * encryption, compression, and performance optimizations.
 * @version 1.0.0
 */

import { 
  setLocalStorageItem,
  getLocalStorageItem,
  removeLocalStorageItem,
  clearLocalStorage,
  validateStorageQuota
} from '../utils/storage.util';
import { AuthResponse, AuthUser, StorageError } from '../interfaces/auth.interface';
import * as CryptoJS from 'crypto-js'; // v4.1.1
import * as LZString from 'lz-string'; // v1.5.0

/**
 * Enhanced service class for managing browser storage operations with encryption,
 * compression, and performance optimizations.
 */
export class StorageService {
  private static readonly AUTH_TOKEN_KEY = 'auth_tokens';
  private static readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private static readonly USER_KEY = 'user_data';
  private static readonly THEME_KEY = 'user_theme';
  private static readonly ENCRYPTION_KEY = process.env.REACT_APP_STORAGE_ENCRYPTION_KEY || 'default-key';
  
  // In-memory cache for frequently accessed items
  private static readonly memoryCache = new Map<string, { data: any; timestamp: number }>();
  private static readonly CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
  private static readonly TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Encrypts data using AES-256 encryption
   * @param data - Data to encrypt
   * @returns Encrypted data string
   */
  private static encrypt(data: any): string {
    const jsonStr = JSON.stringify(data);
    const compressed = LZString.compress(jsonStr);
    return CryptoJS.AES.encrypt(compressed, this.ENCRYPTION_KEY).toString();
  }

  /**
   * Decrypts encrypted data
   * @param encryptedData - Encrypted data string
   * @returns Decrypted data or null if invalid
   */
  private static decrypt<T>(encryptedData: string): T | null {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, this.ENCRYPTION_KEY);
      const decompressed = LZString.decompress(bytes.toString(CryptoJS.enc.Utf8));
      return decompressed ? JSON.parse(decompressed) as T : null;
    } catch (error) {
      console.error('Decryption failed:', error);
      return null;
    }
  }

  /**
   * Updates the memory cache with new data
   * @param key - Cache key
   * @param data - Data to cache
   */
  private static updateCache(key: string, data: any): void {
    this.memoryCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Gets data from cache if valid
   * @param key - Cache key
   * @returns Cached data or null if expired/invalid
   */
  private static getFromCache(key: string): any | null {
    const cached = this.memoryCache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.CACHE_EXPIRY_MS) {
      this.memoryCache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Stores encrypted authentication tokens with expiration
   * @param authResponse - Authentication response containing tokens
   * @throws {StorageError} When storage operation fails
   */
  public static async setAuthTokens(authResponse: AuthResponse): Promise<void> {
    try {
      const { accessToken, refreshToken, user } = authResponse;
      
      const tokenData = {
        accessToken,
        refreshToken,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.TOKEN_EXPIRY_MS
      };

      const encryptedTokens = this.encrypt(tokenData);
      const encryptedUser = this.encrypt(user);

      await setLocalStorageItem(this.AUTH_TOKEN_KEY, encryptedTokens);
      await setLocalStorageItem(this.USER_KEY, encryptedUser);

      // Update cache
      this.updateCache(this.AUTH_TOKEN_KEY, tokenData);
      this.updateCache(this.USER_KEY, user);

      // Dispatch storage event for cross-tab synchronization
      window.dispatchEvent(new StorageEvent('storage', {
        key: this.AUTH_TOKEN_KEY,
        newValue: encryptedTokens
      }));
    } catch (error) {
      throw new StorageError(
        'Failed to store authentication tokens',
        error instanceof StorageError ? error.code : 'STORAGE_ERROR'
      );
    }
  }

  /**
   * Retrieves and validates stored authentication tokens
   * @returns Decrypted tokens or null if invalid/expired
   * @throws {StorageError} When retrieval operation fails
   */
  public static async getAuthTokens(): Promise<{ 
    accessToken: string | null;
    refreshToken: string | null;
    user: AuthUser | null;
  }> {
    try {
      // Check cache first
      const cachedTokens = this.getFromCache(this.AUTH_TOKEN_KEY);
      const cachedUser = this.getFromCache(this.USER_KEY);

      if (cachedTokens && cachedUser) {
        if (Date.now() < cachedTokens.expiresAt) {
          return {
            accessToken: cachedTokens.accessToken,
            refreshToken: cachedTokens.refreshToken,
            user: cachedUser
          };
        }
      }

      // Retrieve from storage
      const encryptedTokens = await getLocalStorageItem<string>(this.AUTH_TOKEN_KEY);
      const encryptedUser = await getLocalStorageItem<string>(this.USER_KEY);

      if (!encryptedTokens || !encryptedUser) {
        return { accessToken: null, refreshToken: null, user: null };
      }

      const tokenData = this.decrypt<{
        accessToken: string;
        refreshToken: string;
        timestamp: number;
        expiresAt: number;
      }>(encryptedTokens);

      const userData = this.decrypt<AuthUser>(encryptedUser);

      if (!tokenData || !userData || Date.now() > tokenData.expiresAt) {
        await this.clearAuthData();
        return { accessToken: null, refreshToken: null, user: null };
      }

      // Update cache with valid data
      this.updateCache(this.AUTH_TOKEN_KEY, tokenData);
      this.updateCache(this.USER_KEY, userData);

      return {
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        user: userData
      };
    } catch (error) {
      console.error('Auth token retrieval failed:', error);
      return { accessToken: null, refreshToken: null, user: null };
    }
  }

  /**
   * Clears all authentication data from storage and cache
   */
  private static async clearAuthData(): Promise<void> {
    try {
      await removeLocalStorageItem(this.AUTH_TOKEN_KEY);
      await removeLocalStorageItem(this.USER_KEY);
      this.memoryCache.delete(this.AUTH_TOKEN_KEY);
      this.memoryCache.delete(this.USER_KEY);
    } catch (error) {
      console.error('Failed to clear auth data:', error);
    }
  }

  /**
   * Stores user theme preference
   * @param theme - User's theme preference
   */
  public static async setTheme(theme: 'light' | 'dark'): Promise<void> {
    try {
      await setLocalStorageItem(this.THEME_KEY, theme);
      this.updateCache(this.THEME_KEY, theme);
    } catch (error) {
      console.error('Failed to store theme preference:', error);
    }
  }

  /**
   * Retrieves user theme preference
   * @returns Theme preference or null if not set
   */
  public static async getTheme(): Promise<'light' | 'dark' | null> {
    try {
      const cached = this.getFromCache(this.THEME_KEY);
      if (cached) return cached;

      const theme = await getLocalStorageItem<'light' | 'dark'>(this.THEME_KEY);
      if (theme) {
        this.updateCache(this.THEME_KEY, theme);
      }
      return theme;
    } catch (error) {
      console.error('Failed to retrieve theme preference:', error);
      return null;
    }
  }
}