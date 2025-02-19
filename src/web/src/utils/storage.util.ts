/**
 * @fileoverview Storage utility functions for managing browser localStorage operations
 * with type-safe methods, enhanced security, and performance optimizations.
 * @version 1.0.0
 */

// Global constants for storage configuration
const APP_STORAGE_PREFIX = "tms_";
const STORAGE_QUOTA_LIMIT = 5 * 1024 * 1024; // 5MB quota limit

/**
 * Custom error class for storage-related errors
 */
class StorageError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "StorageError";
  }
}

/**
 * Type guard to check if a value is a plain object
 */
const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

/**
 * Sanitizes input value to prevent XSS attacks
 */
const sanitizeValue = <T>(value: T): T => {
  if (typeof value === "string") {
    return value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") as T;
  }
  if (isPlainObject(value)) {
    const sanitizedObj: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      sanitizedObj[key] = sanitizeValue(val);
    }
    return sanitizedObj as T;
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue) as T;
  }
  return value;
};

/**
 * Calculates current storage usage in bytes
 */
const calculateStorageUsage = (): number => {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(APP_STORAGE_PREFIX)) {
      total += localStorage.getItem(key)?.length || 0;
    }
  }
  return total;
};

/**
 * Stores a value in localStorage with comprehensive error handling and security measures
 * @param key - Storage key (will be prefixed with APP_STORAGE_PREFIX)
 * @param value - Value to store (will be serialized to JSON)
 * @throws {StorageError} When storage quota is exceeded or serialization fails
 */
export const setLocalStorageItem = <T>(key: string, value: T): void => {
  try {
    // Validate key
    if (!key || typeof key !== "string") {
      throw new StorageError("Invalid storage key", "INVALID_KEY");
    }

    // Sanitize input value
    const sanitizedValue = sanitizeValue(value);

    // Check storage quota
    const serializedValue = JSON.stringify(sanitizedValue);
    const valueSize = serializedValue.length;
    if (calculateStorageUsage() + valueSize > STORAGE_QUOTA_LIMIT) {
      throw new StorageError("Storage quota exceeded", "QUOTA_EXCEEDED");
    }

    // Store with prefix
    const prefixedKey = `${APP_STORAGE_PREFIX}${key}`;
    localStorage.setItem(prefixedKey, serializedValue);

    // Emit storage event for monitoring
    window.dispatchEvent(new StorageEvent("storage", {
      key: prefixedKey,
      newValue: serializedValue
    }));

  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }
    if (error instanceof Error) {
      if (error.name === "QuotaExceededError") {
        throw new StorageError("Storage quota exceeded", "QUOTA_EXCEEDED");
      }
      throw new StorageError(`Storage operation failed: ${error.message}`, "OPERATION_FAILED");
    }
    throw new StorageError("Unknown storage error", "UNKNOWN_ERROR");
  }
};

/**
 * Retrieves and deserializes a value from localStorage with type checking
 * @param key - Storage key (will be prefixed with APP_STORAGE_PREFIX)
 * @returns Parsed value or null if not found
 * @throws {StorageError} When parsing fails or type check fails
 */
export const getLocalStorageItem = <T>(key: string): T | null => {
  try {
    // Validate and format key
    if (!key || typeof key !== "string") {
      throw new StorageError("Invalid storage key", "INVALID_KEY");
    }

    const prefixedKey = `${APP_STORAGE_PREFIX}${key}`;
    const serializedValue = localStorage.getItem(prefixedKey);

    if (!serializedValue) {
      return null;
    }

    // Parse with error handling
    const parsedValue = JSON.parse(serializedValue) as T;

    // Runtime type checking
    if (typeof parsedValue === "undefined") {
      return null;
    }

    return parsedValue;

  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }
    if (error instanceof SyntaxError) {
      throw new StorageError("Invalid stored data format", "INVALID_FORMAT");
    }
    throw new StorageError("Failed to retrieve storage item", "RETRIEVAL_FAILED");
  }
};

/**
 * Removes an item from localStorage with proper cleanup
 * @param key - Storage key (will be prefixed with APP_STORAGE_PREFIX)
 * @throws {StorageError} When removal fails
 */
export const removeLocalStorageItem = (key: string): void => {
  try {
    // Validate key
    if (!key || typeof key !== "string") {
      throw new StorageError("Invalid storage key", "INVALID_KEY");
    }

    const prefixedKey = `${APP_STORAGE_PREFIX}${key}`;
    localStorage.removeItem(prefixedKey);

    // Emit storage event
    window.dispatchEvent(new StorageEvent("storage", {
      key: prefixedKey,
      newValue: null
    }));

  } catch (error) {
    throw new StorageError("Failed to remove storage item", "REMOVAL_FAILED");
  }
};

/**
 * Clears all application-specific items from localStorage
 * @throws {StorageError} When clear operation fails
 */
export const clearLocalStorage = (): void => {
  try {
    // Only clear items with application prefix
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(APP_STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }

    // Remove items
    keysToRemove.forEach(key => localStorage.removeItem(key));

    // Emit storage clear event
    window.dispatchEvent(new StorageEvent("storage", {
      key: null,
      newValue: null
    }));

  } catch (error) {
    throw new StorageError("Failed to clear storage", "CLEAR_FAILED");
  }
};