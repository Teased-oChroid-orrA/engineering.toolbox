/**
 * Helper functions for localStorage access with error handling for Tauri environment
 */
import { storageLogger } from '$lib/utils/loggers';

export function safeGetItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch (e) {
    storageLogger.error(`Failed to get ${key}`, e);
    return null;
  }
}

export function safeSetItem(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    storageLogger.error(`Failed to set ${key}`, e);
  }
}

export function safeParseJSON<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch (e) {
    storageLogger.error('Failed to parse JSON', e);
    return fallback;
  }
}
