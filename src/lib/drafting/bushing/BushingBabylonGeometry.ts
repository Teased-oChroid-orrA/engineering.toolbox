import type { CanonicalDraftScene, CanonicalLoop, CanonicalLoopPrimitive } from './BushingDraftRenderer';

export type Vec2 = { x: number; y: number };

export type LoopPolygon = {
  loop: CanonicalLoop;
  points: Vec2[];
  signedArea: number;
  absArea: number;
};

export type BabylonLoopDiagnostic = {
  severity: 'info' | 'warning' | 'error';
  code: string;
  message: string;
  loopId?: string;
};

const ARC_SEGMENTS_PER_QUARTER = 10;
const MIN_ARC_SEGMENTS = 4;
const MAX_ARC_SEGMENTS = 72;

function degToRad(v: number): number {
  return (v * Math.PI) / 180;
}

function normalizeLoopPoints(points: Vec2[], eps = 1e-8): Vec2[] {
  if (!points.length) return [];
  const out: Vec2[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = out[out.length - 1];
    const p = points[i];
    if (Math.hypot(p.x - prev.x, p.y - prev.y) > eps) out.push(p);
  }
  if (out.length >= 2) {
    const first = out[0];
    const last = out[out.length - 1];
    if (Math.hypot(first.x - last.x, first.y - last.y) <= eps) out.pop();
  }
  return out;
}

function pointsSignedArea(points: Vec2[]): number {
  if (points.length < 3) return 0;
  let a = 0;
  for (let i = 0; i < points.length; i++) {
    const p0 = points[i];
    const p1 = points[(i + 1) % points.length];
    a += p0.x * p1.y - p1.x * p0.y;
  }
  return a * 0.5;
}

function primitiveStartPoint(p: CanonicalLoopPrimitive): Vec2 {
  if (p.kind === 'line') return p.from;
  const a = degToRad(p.startDeg);
  return {
    x: p.center.x + p.radius * Math.cos(a),
    y: p.center.y + p.radius * Math.sin(a)
  };
}

function sampleArc(p: Extract<CanonicalLoopPrimitive, { kind: 'arc' }>): Vec2[] {
  const a0 = degToRad(p.startDeg);
  const a1 = degToRad(p.endDeg);
  const delta = a1 - a0;
  const quarterTurns = Math.max(1, Math.abs(delta) / (Math.PI * 0.5));
  const segCount = Math.max(
    MIN_ARC_SEGMENTS,
    Math.min(MAX_ARC_SEGMENTS, Math.ceil(quarterTurns * ARC_SEGMENTS_PER_QUARTER))
  );
  const out: Vec2[] = [];
  for (let i = 1; i <= segCount; i++) {
    const t = i / segCount;
    const a = a0 + delta * t;
    out.push({ x: p.center.x + p.radius * Math.cos(a), y: p.center.y + p.radius * Math.sin(a) });
  }
  return out;
}

export function loopToPolygon(loop: CanonicalLoop): Vec2[] {
  if (!loop.primitives.length) return [];
  const pts: Vec2[] = [];
  const first = primitiveStartPoint(loop.primitives[0]);
  pts.push(first);
  for (const primitive of loop.primitives) {
    if (primitive.kind === 'line') {
      pts.push(primitive.to);
      continue;
    }
    pts.push(...sampleArc(primitive));
  }
  return normalizeLoopPoints(pts);
}

export function buildLoopPolygons(scene: CanonicalDraftScene): { polygons: LoopPolygon[]; diagnostics: BabylonLoopDiagnostic[] } {
  const diagnostics: BabylonLoopDiagnostic[] = [];
  const polygons: LoopPolygon[] = [];

  for (const loop of scene.loops) {
    const points = loopToPolygon(loop);
    const hasNonFinite = points.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y));
    if (hasNonFinite) {
      diagnostics.push({
        severity: 'error',
        code: 'BABYLON_LOOP_NON_FINITE',
        message: 'Loop contains non-finite coordinates.',
        loopId: loop.id
      });
      continue;
    }
    if (points.length < 3) {
      diagnostics.push({
        severity: 'warning',
        code: 'BABYLON_LOOP_TOO_SMALL',
        message: 'Loop skipped because it has fewer than 3 sampled points.',
        loopId: loop.id
      });
      continue;
    }
    const signedArea = pointsSignedArea(points);
    const absArea = Math.abs(signedArea);
    if (absArea < 1e-8) {
      diagnostics.push({
        severity: 'warning',
        code: 'BABYLON_LOOP_ZERO_AREA',
        message: 'Loop skipped because sampled area is too small.',
        loopId: loop.id
      });
      continue;
    }
    polygons.push({ loop, points, signedArea, absArea });
  }

  if (!polygons.length) {
    diagnostics.push({
      severity: 'error',
      code: 'BABYLON_NO_POLYGONS',
      message: 'No valid loops were available for Babylon rendering.'
    });
  }

  return { polygons, diagnostics };
}
