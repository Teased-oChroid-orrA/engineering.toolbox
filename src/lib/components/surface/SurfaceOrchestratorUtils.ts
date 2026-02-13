import type { Point3D } from './SurfaceOrchestratorDeps';
import { clamp } from './SurfaceOrchestratorDeps';

export function heatColor(absd: number, scale: number): string {
  const t = clamp(absd / Math.max(1e-12, scale), 0, 1);
  const r = Math.round(60 + 195 * t);
  const g = Math.round(220 - 150 * t);
  const b = Math.round(90 - 70 * t);
  return `rgba(${r},${g},${b},0.80)`;
}

export function keyActivate(e: KeyboardEvent, fn: () => void) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fn();
  }
}

export function svgCoordsFromEvent(
  ev: PointerEvent | MouseEvent,
  svgEl: SVGSVGElement | null
): { x: number; y: number } {
  const r = svgEl?.getBoundingClientRect();
  if (!r) return { x: 0, y: 0 };
  return { x: ev.clientX - r.left, y: ev.clientY - r.top };
}

export function resetView() {
  return {
    rot: { alpha: -0.65, beta: 0.35 },
    zoomK: 1,
    pan: { x: 0, y: 0 }
  };
}
