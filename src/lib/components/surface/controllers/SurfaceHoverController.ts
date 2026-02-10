import type { SnapCandidate } from './SurfaceSnapController';
import type { ToolCursorMode } from './SurfaceCursorController';

export type HoverTooltip = {
  x: number;
  y: number;
  title: string;
  lines: string[];
};

function fmtNum(v: number, p = 3) {
  return Number.isFinite(v) ? v.toFixed(p) : '—';
}

function snapTitle(snap: SnapCandidate) {
  if (snap.kind === 'endpoint') return `Endpoint P${(snap.pointIdx ?? 0) + 1}`;
  if (snap.kind === 'midpoint') return `Midpoint L${(snap.edgeIdx ?? 0) + 1}`;
  if (snap.kind === 'curve_nearest') return `Curve Nearest C${(snap.curveIdx ?? 0) + 1}`;
  return `Surface Projection S${(snap.surfaceIdx ?? 0) + 1}`;
}

function cursorHint(mode: ToolCursorMode) {
  if (mode === 'line') return 'Click to place line point';
  if (mode === 'surface') return 'Click to add surface vertex';
  if (mode === 'curve') return 'Click to append curve point';
  if (mode === 'insert') return 'Click selected line to insert point';
  return 'Select geometry';
}

export function buildHoverTooltip(snap: SnapCandidate | null, mode: ToolCursorMode): HoverTooltip | null {
  if (!snap) return null;
  return {
    x: snap.screen.x,
    y: snap.screen.y,
    title: snapTitle(snap),
    lines: [
      `d(px): ${fmtNum(snap.distancePx, 1)}`,
      `X ${fmtNum(snap.world.x)}  Y ${fmtNum(snap.world.y)}  Z ${fmtNum(snap.world.z)}`,
      cursorHint(mode)
    ]
  };
}

