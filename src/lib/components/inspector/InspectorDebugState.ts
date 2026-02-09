export type InspectorDebugState = {
  showControlsDebug: boolean;
  quietBackendLogs: boolean;
  debugLogEnabled: boolean;
  debugLogPath: string;
};

export const defaultInspectorDebugState = (): InspectorDebugState => ({
  showControlsDebug: true,
  quietBackendLogs: true,
  debugLogEnabled: true,
  debugLogPath: ''
});

export function createInspectorDebugLogger(opts: {
  enabled: () => boolean;
  writeBatch: (lines: string[]) => Promise<string | void>;
  onPath?: (path: string) => void;
}) {
  let queue: string[] = [];
  let flushTimer: ReturnType<typeof setTimeout> | null = null;
  let flushInFlight = false;
  const lastByKey = new Map<string, number>();

  const flush = async () => {
    if (!opts.enabled() || flushInFlight || queue.length === 0) return;
    flushInFlight = true;
    try {
      while (queue.length > 0) {
        const batch = queue.splice(0, 80);
        const p = await opts.writeBatch(batch);
        if (p) opts.onPath?.(String(p));
      }
    } finally {
      flushInFlight = false;
    }
  };

  const enqueue = (event: string, data?: Record<string, unknown>) => {
    if (!opts.enabled()) return;
    const payload = data ? JSON.stringify(data) : '';
    queue.push(`[Inspector] ${event}${payload ? ` ${payload}` : ''}`);
    if (!flushTimer) {
      flushTimer = setTimeout(() => {
        flushTimer = null;
        void flush();
      }, 300);
    }
  };

  const enqueueRate = (key: string, minMs: number, event: string, data?: Record<string, unknown>) => {
    const now = Date.now();
    const prev = lastByKey.get(key) ?? 0;
    if (now - prev < minMs) return;
    lastByKey.set(key, now);
    enqueue(event, data);
  };

  return {
    enqueue,
    enqueueRate,
    flush
  };
}
