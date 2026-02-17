/**
 * Feature-flagged logging system for development and debugging.
 * 
 * **Design Principles:**
 * 1. Zero production overhead via dead code elimination
 * 2. Feature flags checked at build time (Vite tree-shaking)
 * 3. Type-safe structured logging
 * 4. Namespace-based log filtering
 * 
 * **Usage:**
 * ```typescript
 * import { createLogger } from '$lib/utils/logger';
 * 
 * const log = createLogger('ComponentName');
 * log.debug('Debug info', { data });
 * log.info('Information');
 * log.warn('Warning');
 * log.error('Error', error);
 * ```
 * 
 * **Feature Flags:**
 * Set in `.env` or import.meta.env:
 * - VITE_ENABLE_DEBUG_LOGS=true (enables all logging)
 * - VITE_ENABLE_TRACE_LOGS=true (enables trace-level logging)
 * - VITE_ENABLE_PERF_LOGS=true (enables performance logging)
 */

// Feature flags - checked at build time for dead code elimination
// Safe access for test environments where import.meta.env might be undefined
const env = typeof import.meta.env !== 'undefined' ? import.meta.env : { DEV: true };
const ENABLE_DEBUG = (env as any).VITE_ENABLE_DEBUG_LOGS === 'true' || env.DEV;
const ENABLE_TRACE = (env as any).VITE_ENABLE_TRACE_LOGS === 'true' || env.DEV;
const ENABLE_PERF = (env as any).VITE_ENABLE_PERF_LOGS === 'true' || env.DEV;

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'trace' | 'perf';

export interface Logger {
  debug: (message: string, ...args: any[]) => void;
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
  trace: (message: string, ...args: any[]) => void;
  perf: (label: string, data?: Record<string, any>) => void;
}

/**
 * Creates a namespaced logger instance.
 * 
 * @param namespace - Component or module name for log filtering
 * @returns Logger instance with feature-flagged methods
 * 
 * @example
 * const log = createLogger('BushingOrchestrator');
 * log.debug('Initializing', { config });
 */
export function createLogger(namespace: string): Logger {
  const prefix = `[${namespace}]`;

  return {
    debug: (message: string, ...args: any[]) => {
      if (ENABLE_DEBUG) {
        console.log(prefix, message, ...args);
      }
    },

    info: (message: string, ...args: any[]) => {
      if (ENABLE_DEBUG) {
        console.info(prefix, message, ...args);
      }
    },

    warn: (message: string, ...args: any[]) => {
      // Warnings always logged in development
      if (ENABLE_DEBUG) {
        console.warn(prefix, message, ...args);
      }
    },

    error: (message: string, ...args: any[]) => {
      // Errors always logged (even in production for debugging)
      console.error(prefix, message, ...args);
    },

    trace: (message: string, ...args: any[]) => {
      if (ENABLE_TRACE) {
        console.trace(prefix, message, ...args);
      }
    },

    perf: (label: string, data?: Record<string, any>) => {
      if (ENABLE_PERF) {
        console.log(prefix, `[PERF]`, label, data || '');
      }
    }
  };
}

/**
 * No-op logger for production builds when all logging is disabled.
 * Vite will tree-shake this entire logger if ENABLE_DEBUG is false.
 */
export const noopLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  trace: () => {},
  perf: () => {}
};

/**
 * Conditional logger that returns noop in production.
 * Use this for optional logging that can be completely eliminated.
 */
export function createConditionalLogger(namespace: string): Logger {
  if (!ENABLE_DEBUG && !ENABLE_TRACE && !ENABLE_PERF) {
    return noopLogger;
  }
  return createLogger(namespace);
}
