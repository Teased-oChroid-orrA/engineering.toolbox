import type { DatumSliceWarning } from './SurfaceSlicingExportController';
import type { IntersectionDiagnostics } from './SurfaceIntersectionController';
import type { ToastKind } from '../../../ui/toast';

export type SurfaceStatusWarning = {
  id: string;
  when: string;
  source: 'intersection' | 'slicing' | 'recipe';
  severity: 'info' | 'warning' | 'error';
  code: string;
  message: string;
  detail?: string;
};

export type ToastPayload = {
  kind: ToastKind;
  title: string;
  detail?: string;
};

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function mkId(source: SurfaceStatusWarning['source'], severity: SurfaceStatusWarning['severity'], code: string, message: string) {
  return `${source}:${severity}:${slug(code)}:${slug(message).slice(0, 80)}`;
}

export function toStatusFromIntersection(diag: IntersectionDiagnostics | null): SurfaceStatusWarning[] {
  if (!diag?.severity || !diag.message) return [];
  const sev = diag.severity;
  const code = sev === 'error' ? 'INTERSECTION_ERROR' : sev === 'warning' ? 'INTERSECTION_WARNING' : 'INTERSECTION_INFO';
  return [
    {
      id: mkId('intersection', sev, code, diag.message),
      when: new Date().toISOString(),
      source: 'intersection',
      severity: sev,
      code,
      message: diag.message,
      detail: diag.angleDeg != null ? `Angle ${diag.angleDeg.toFixed(4)}°` : undefined
    }
  ];
}

export function toStatusFromSliceWarnings(warnings: DatumSliceWarning[]): SurfaceStatusWarning[] {
  return warnings.map((w) => ({
    id: mkId('slicing', w.severity, w.code, w.message),
    when: new Date().toISOString(),
    source: 'slicing',
    severity: w.severity,
    code: w.code,
    message: w.message,
    detail: w.sliceId != null ? `slice ${w.sliceId}` : undefined
  }));
}

export function appendStatusWarnings(
  cur: SurfaceStatusWarning[],
  incoming: SurfaceStatusWarning[],
  seen: Set<string>,
  maxItems = 40
) {
  const out = [...cur];
  const toasts: ToastPayload[] = [];
  for (const w of incoming) {
    if (seen.has(w.id)) continue;
    seen.add(w.id);
    out.unshift(w);
    toasts.push({
      kind: w.severity,
      title: `${w.source.toUpperCase()} ${w.code}`,
      detail: w.message
    });
  }
  return {
    warnings: out.slice(0, maxItems),
    toasts
  };
}
