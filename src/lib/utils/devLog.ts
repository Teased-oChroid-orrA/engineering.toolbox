/**
 * Development logging utility
 * Only logs in development mode (DEV build or localhost)
 */
export function devLog(namespace: string, ...args: any[]): void {
  if (typeof window !== 'undefined' && window.location.hostname === '127.0.0.1') {
    console.log(`[${namespace}]`, ...args);
  }
}
