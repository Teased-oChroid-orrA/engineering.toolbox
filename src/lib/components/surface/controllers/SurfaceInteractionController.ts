import type { SnapCandidate } from './SurfaceSnapController';

export type ProjectedPoint = { x: number; y: number; z: number };

export function nearestPointIndex(projected: ProjectedPoint[], mx: number, my: number, maxDistPx = 22) {
  let bestIdx = -1;
  let bestD2 = Number.POSITIVE_INFINITY;
  const maxD2 = maxDistPx * maxDistPx;
  for (let i = 0; i < projected.length; i++) {
    const p = projected[i];
    const dx = p.x - mx;
    const dy = p.y - my;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) {
      bestD2 = d2;
      bestIdx = i;
    }
  }
  if (bestIdx < 0 || bestD2 > maxD2) return null;
  return bestIdx;
}

export function shouldProcessHover(args: {
  probeOn: boolean;
  toolCursor: 'select' | 'line' | 'surface' | 'curve' | 'insert';
  creatorPickActive: boolean;
  datumPickActive: boolean;
  lineInsertPickMode: boolean;
}) {
  if (args.probeOn) return true;
  if (args.creatorPickActive || args.datumPickActive || args.lineInsertPickMode) return true;
  return args.toolCursor !== 'select';
}

export function makeHoverModeKey(args: {
  toolCursor: string;
  probeOn: boolean;
  snapEndpoints: boolean;
  snapMidpoints: boolean;
  snapCurveNearest: boolean;
  snapSurfaceProjection: boolean;
  snapThresholdPx: number;
  creatorPickActive: boolean;
  datumPickActive: boolean;
  lineInsertPickMode: boolean;
}) {
  return [
    args.toolCursor,
    Number(args.probeOn),
    Number(args.snapEndpoints),
    Number(args.snapMidpoints),
    Number(args.snapCurveNearest),
    Number(args.snapSurfaceProjection),
    Math.round(args.snapThresholdPx),
    Number(args.creatorPickActive),
    Number(args.datumPickActive),
    Number(args.lineInsertPickMode)
  ].join('|');
}

export function shouldRecomputeHover(args: {
  lastX: number;
  lastY: number;
  x: number;
  y: number;
  lastModeKey: string;
  modeKey: string;
  minDeltaPx?: number;
}) {
  if (args.lastModeKey !== args.modeKey) return true;
  const d = Math.hypot(args.x - args.lastX, args.y - args.lastY);
  return d >= (args.minDeltaPx ?? 0.8);
}

export function snapCandidateSignature(s: SnapCandidate | null) {
  if (!s) return 'none';
  return [
    s.kind,
    s.pointIdx ?? -1,
    s.edgeIdx ?? -1,
    s.curveIdx ?? -1,
    s.surfaceIdx ?? -1,
    Math.round(s.world.x * 1e4),
    Math.round(s.world.y * 1e4),
    Math.round(s.world.z * 1e4)
  ].join(':');
}
