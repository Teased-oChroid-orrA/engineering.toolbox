import { appendStatusWarnings, type SurfaceStatusWarning, type ToastPayload } from './SurfaceWarningsController';
import { untrack } from 'svelte';

export function mergeWarningsUntracked(args: {
  getCurrent: () => SurfaceStatusWarning[];
  incoming: SurfaceStatusWarning[];
  seen: Set<string>;
  maxItems?: number;
}) {
  const current = untrack(args.getCurrent);
  return appendStatusWarnings(current, args.incoming, args.seen, args.maxItems ?? 50);
}

export function dispatchWarningToasts(
  toasts: ToastPayload[],
  sink: { error: (title: string, detail?: string) => void; warning: (title: string, detail?: string) => void; info: (title: string, detail?: string) => void }
) {
  for (const t of toasts) {
    if (t.kind === 'error') sink.error(t.title, t.detail);
    else if (t.kind === 'warning') sink.warning(t.title, t.detail);
    else sink.info(t.title, t.detail);
  }
}

export function buildSlicingRuntimeWarning(message: string): SurfaceStatusWarning {
  return {
    id: `slicing:error:${message}`,
    when: new Date().toISOString(),
    source: 'slicing',
    severity: 'error',
    code: 'SLICE_RUNTIME',
    message
  };
}
