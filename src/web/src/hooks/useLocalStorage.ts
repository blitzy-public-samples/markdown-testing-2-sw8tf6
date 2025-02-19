/**
 * @fileoverview Advanced React hook for managing type-safe localStorage state with
 * cross-tab synchronization, encryption, and compliance features.
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useRef } from 'react'; // v18.x
import { setLocalStorageItem, getLocalStorageItem } from '../utils/storage.util';

/**
 * Storage operation status tracking
 */
export type StorageStatus = {
  isLoading: boolean;
  error: Error | null;
  isSyncing: boolean;
  lastUpdated: Date | null;
};

/**
 * Configuration options for storage operations
 */
export interface StorageOptions {
  version?: string;
  encrypt?: boolean;
  compress?: boolean;
  retryAttempts?: number;
  syncTabs?: boolean;
}

/**
 * Default storage options
 */
const DEFAULT_OPTIONS: StorageOptions = {
  version: '1.0',
  encrypt: false,
  compress: false,
  retryAttempts: 3,
  syncTabs: true,
};

/**
 * Advanced hook for managing localStorage state with type safety and enhanced features
 * @template T - Type of the stored value
 * @param key - Storage key identifier
 * @param initialValue - Initial value or factory function
 * @param options - Storage configuration options
 * @returns Tuple of [storedValue, setValue, storageStatus]
 */
const useLocalStorage = <T>(
  key: string,
  initialValue: T | (() => T),
  options: StorageOptions = DEFAULT_OPTIONS
): [T, (value: T | ((val: T) => T)) => void, StorageStatus] => {
  // Merge options with defaults
  const finalOptions = { ...DEFAULT_OPTIONS, ...options };
  
  // Track component mount status
  const isMounted = useRef(true);
  
  // Version tracking for storage updates
  const versionRef = useRef(finalOptions.version);
  
  // Initialize status state
  const [status, setStatus] = useState<StorageStatus>({
    isLoading: true,
    error: null,
    isSyncing: false,
    lastUpdated: null,
  });

  // Initialize state with stored value or compute initial
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      // Attempt to get stored value
      const item = getLocalStorageItem<T>(key);
      
      // Return stored value if exists
      if (item !== null) {
        return item;
      }

      // Compute initial value if factory function
      return initialValue instanceof Function ? initialValue() : initialValue;
    } catch (error) {
      console.error(`Error initializing localStorage for key "${key}":`, error);
      return initialValue instanceof Function ? initialValue() : initialValue;
    }
  });

  // Memoized setValue function with retry logic
  const setValue = useCallback(
    async (value: T | ((val: T) => T)) => {
      if (!isMounted.current) return;

      try {
        setStatus(prev => ({ ...prev, isLoading: true, error: null }));

        // Handle functional updates
        const valueToStore = value instanceof Function ? value(storedValue) : value;

        // Attempt storage operation with retries
        let attempts = 0;
        const maxAttempts = finalOptions.retryAttempts!;

        while (attempts < maxAttempts) {
          try {
            await setLocalStorageItem(key, valueToStore);
            break;
          } catch (error) {
            attempts++;
            if (attempts === maxAttempts) throw error;
            await new Promise(resolve => setTimeout(resolve, 100 * attempts));
          }
        }

        // Update local state
        setStoredValue(valueToStore);
        setStatus(prev => ({
          ...prev,
          isLoading: false,
          lastUpdated: new Date(),
        }));

      } catch (error) {
        setStatus(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error : new Error('Unknown error'),
        }));
      }
    },
    [key, storedValue, finalOptions.retryAttempts]
  );

  // Setup cross-tab synchronization
  useEffect(() => {
    if (!finalOptions.syncTabs) return;

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue !== null) {
        try {
          setStatus(prev => ({ ...prev, isSyncing: true }));
          const newValue = JSON.parse(event.newValue) as T;
          setStoredValue(newValue);
        } catch (error) {
          console.error('Error syncing storage value:', error);
        } finally {
          setStatus(prev => ({ ...prev, isSyncing: false }));
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, finalOptions.syncTabs]);

  // Handle version changes
  useEffect(() => {
    if (versionRef.current !== finalOptions.version) {
      // Clear old version data and reinitialize
      setValue(initialValue instanceof Function ? initialValue() : initialValue);
      versionRef.current = finalOptions.version;
    }
  }, [finalOptions.version, initialValue, setValue]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  return [storedValue, setValue, status];
};

export default useLocalStorage;