import { safeAutoAnimate, isWebKitRuntime } from '$lib/utils/safeAutoAnimate';
import { PerfRecorder } from '$lib/components/inspector/InspectorOrchestratorDeps';

export function aa(node: HTMLElement, opts?: { duration?: number }, autoAnimateDuration = 160) {
  try {
    if (isWebKitRuntime()) return {} as any;
  } catch {
    if (isWebKitRuntime()) return {} as any;
  }

  const ctl = safeAutoAnimate(node, {
    duration: opts?.duration ?? autoAnimateDuration
  });
  return {
    destroy() {
      try { (ctl as any)?.disable?.(); } catch {}
    }
  };
}

export function withViewTransition(fn: () => void) {
  try {
    const d = document as any;
    if (typeof d?.startViewTransition === 'function') {
      d.startViewTransition(() => fn());
    } else fn();
  } catch {
    fn();
  }
}

export function recordPerf(
  perf: PerfRecorder,
  slo: Record<string, number>,
  op: 'filter' | 'slice' | 'sort' | 'schema' | 'category' | 'row_drawer',
  started: number,
  meta?: Record<string, unknown>
) {
  const ms = performance.now() - started;
  perf.record({ op, ms, ts: Date.now(), meta });
  const p95 = perf.summary(op).p95;
  const sloVal = slo[op];
  const status = p95 <= sloVal ? 'ok' : 'slo_violation';
  console.log('[SC][Inspector][perf]', { op, ms: Number(ms.toFixed(1)), p95: Number(p95.toFixed(1)), slo: sloVal, status, ...(meta ?? {}) });
}

export function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}
