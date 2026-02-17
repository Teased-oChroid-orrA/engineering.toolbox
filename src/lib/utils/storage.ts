/**
 * Type-safe localStorage utility with consistent error handling.
 * 
 * **Features:**
 * - Automatic JSON serialization/deserialization
 * - Type-safe getters with fallback values
 * - Consistent error handling across the app
 * - Optional validation support
 * - Batch operations
 * 
 * **Usage:**
 * ```typescript
 * import { storage } from '$lib/utils/storage';
 * 
 * // Simple get/set
 * storage.set('key', { data: 'value' });
 * const data = storage.get('key', { data: 'default' });
 * 
 * // Type-safe with validation
 * const config = storage.get('config', defaultConfig, validateConfig);
 * ```
 */

import { storageLogger } from './loggers';

export interface StorageOptions {
  /** Validation function to check retrieved values */
  validate?: (value: any) => boolean;
  /** Whether to suppress error logging (for expected failures) */
  silent?: boolean;
}

/**
 * Type-safe wrapper around localStorage.
 */
class StorageUtil {
  /**
   * Check if localStorage is available.
   */
  isAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get item from localStorage with type safety.
   * 
   * @param key - Storage key
   * @param fallback - Fallback value if key not found or parsing fails
   * @param options - Storage options (validation, silent)
   * @returns Parsed value or fallback
   */
  get<T>(key: string, fallback: T, options?: StorageOptions): T {
    if (!this.isAvailable()) {
      return fallback;
    }

    try {
      const item = localStorage.getItem(key);
      if (item === null) {
        return fallback;
      }

      const parsed = JSON.parse(item) as T;

      // Validate if validator provided
      if (options?.validate && !options.validate(parsed)) {
        if (!options.silent) {
          storageLogger.warn(`Validation failed for key: ${key}`);
        }
        return fallback;
      }

      return parsed;
    } catch (error) {
      if (!options?.silent) {
        storageLogger.error(`Failed to get item: ${key}`, error);
      }
      return fallback;
    }
  }

  /**
   * Get raw string value from localStorage (no JSON parsing).
   * 
   * @param key - Storage key
   * @param fallback - Fallback value if key not found
   * @returns String value or fallback
   */
  getString(key: string, fallback: string = ''): string {
    if (!this.isAvailable()) {
      return fallback;
    }

    try {
      const item = localStorage.getItem(key);
      return item ?? fallback;
    } catch (error) {
      storageLogger.error(`Failed to get string: ${key}`, error);
      return fallback;
    }
  }

  /**
   * Set item in localStorage with automatic JSON serialization.
   * 
   * @param key - Storage key
   * @param value - Value to store (will be JSON serialized)
   * @returns Success boolean
   */
  set<T>(key: string, value: T): boolean {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
      storageLogger.debug(`Set item: ${key}`);
      return true;
    } catch (error) {
      storageLogger.error(`Failed to set item: ${key}`, error);
      return false;
    }
  }

  /**
   * Set raw string value in localStorage (no JSON serialization).
   * 
   * @param key - Storage key
   * @param value - String value to store
   * @returns Success boolean
   */
  setString(key: string, value: string): boolean {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      localStorage.setItem(key, value);
      storageLogger.debug(`Set string: ${key}`);
      return true;
    } catch (error) {
      storageLogger.error(`Failed to set string: ${key}`, error);
      return false;
    }
  }

  /**
   * Remove item from localStorage.
   * 
   * @param key - Storage key
   * @returns Success boolean
   */
  remove(key: string): boolean {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      localStorage.removeItem(key);
      storageLogger.debug(`Removed item: ${key}`);
      return true;
    } catch (error) {
      storageLogger.error(`Failed to remove item: ${key}`, error);
      return false;
    }
  }

  /**
   * Check if key exists in localStorage.
   * 
   * @param key - Storage key
   * @returns True if key exists
   */
  has(key: string): boolean {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      return localStorage.getItem(key) !== null;
    } catch (error) {
      storageLogger.error(`Failed to check key: ${key}`, error);
      return false;
    }
  }

  /**
   * Clear all items from localStorage.
   * WARNING: This removes ALL stored data!
   * 
   * @returns Success boolean
   */
  clear(): boolean {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      localStorage.clear();
      storageLogger.warn('Cleared all localStorage');
      return true;
    } catch (error) {
      storageLogger.error('Failed to clear localStorage', error);
      return false;
    }
  }

  /**
   * Get all keys from localStorage.
   * 
   * @returns Array of keys
   */
  keys(): string[] {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      return Object.keys(localStorage);
    } catch (error) {
      storageLogger.error('Failed to get keys', error);
      return [];
    }
  }

  /**
   * Batch get multiple items.
   * 
   * @param keys - Array of keys to retrieve
   * @returns Record of key-value pairs
   */
  getMany<T>(keys: string[], fallback: T): Record<string, T> {
    const result: Record<string, T> = {};
    for (const key of keys) {
      result[key] = this.get(key, fallback);
    }
    return result;
  }

  /**
   * Batch set multiple items.
   * 
   * @param items - Record of key-value pairs to store
   * @returns Success boolean
   */
  setMany<T>(items: Record<string, T>): boolean {
    let success = true;
    for (const [key, value] of Object.entries(items)) {
      if (!this.set(key, value)) {
        success = false;
      }
    }
    return success;
  }
}

/**
 * Singleton storage utility instance.
 * Use this throughout the application for consistent storage access.
 */
export const storage = new StorageUtil();
