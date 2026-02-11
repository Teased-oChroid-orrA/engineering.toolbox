import {
  clamp,
  lerp3,
  viewportDepthOpacity,
  type Edge,
  type Point3D,
  type SurfaceFace
} from '../SurfaceOrchestratorDeps';

type ProjectedPoint = { x: number; y: number; z: number };

type RotateState = { alpha: number; beta: number };

type ZRange = { min: number; max: number };

type OrbitPivotCtx = {
  nearestPoint: (mx: number, my: number) => number | null;
  projected: Array<ProjectedPoint | undefined | null>;
  points: Point3D[];
  edges: Edge[];
  surfaces: SurfaceFace[];
};

export function rotateForViewUi(p: Point3D, r: RotateState): Point3D {
  const ca = Math.cos(r.alpha);
  const sa = Math.sin(r.alpha);
  const cb = Math.cos(r.beta);
  const sb = Math.sin(r.beta);
  const x = p.x * ca - p.z * sa;
  const z0 = p.x * sa + p.z * ca;
  const y = p.y * cb - z0 * sb;
  const z = p.y * sb + z0 * cb;
  return { x, y, z };
}

export function nearestEdgeHitUi(
  mx: number,
  my: number,
  edges: Edge[],
  projected: Array<ProjectedPoint | undefined | null>
): { edgeIdx: number; t: number; d: number } | null {
  let best: { edgeIdx: number; t: number; d: number } | null = null;
  for (let ei = 0; ei < edges.length; ei++) {
    const [a, b] = edges[ei];
    const p0 = projected[a];
    const p1 = projected[b];
    if (!p0 || !p1) continue;
    const vx = p1.x - p0.x;
    const vy = p1.y - p0.y;
    const len2 = vx * vx + vy * vy;
    if (len2 < 1e-9) continue;
    const t = clamp(((mx - p0.x) * vx + (my - p0.y) * vy) / len2, 0, 1);
    const cx = p0.x + t * vx;
    const cy = p0.y + t * vy;
    const d = Math.hypot(mx - cx, my - cy);
    if (!best || d < best.d) best = { edgeIdx: ei, t, d };
  }
  if (!best || best.d > 24) return null;
  return best;
}

export function pickOrbitPivotUi(mx: number, my: number, ctx: OrbitPivotCtx): Point3D {
  const pIdx = ctx.nearestPoint(mx, my);
  if (pIdx != null && ctx.projected[pIdx] && Math.hypot(ctx.projected[pIdx].x - mx, ctx.projected[pIdx].y - my) < 20) {
    return ctx.points[pIdx];
  }

  const edgeHit = nearestEdgeHitUi(mx, my, ctx.edges, ctx.projected);
  if (edgeHit) {
    const [a, b] = ctx.edges[edgeHit.edgeIdx];
    return lerp3(ctx.points[a], ctx.points[b], edgeHit.t);
  }

  let bestSurface: { i: number; d: number } | null = null;
  for (let i = 0; i < ctx.surfaces.length; i++) {
    const projectedPoints = ctx.surfaces[i].pts.map((idx) => ctx.projected[idx]).filter(Boolean) as ProjectedPoint[];
    if (projectedPoints.length < 3) continue;
    const cx = projectedPoints.reduce((acc, p) => acc + p.x, 0) / projectedPoints.length;
    const cy = projectedPoints.reduce((acc, p) => acc + p.y, 0) / projectedPoints.length;
    const d = Math.hypot(mx - cx, my - cy);
    if (!bestSurface || d < bestSurface.d) bestSurface = { i, d };
  }

  if (bestSurface && bestSurface.d < 36) {
    const s = ctx.surfaces[bestSurface.i];
    const centroid = s.pts.reduce(
      (acc, idx) => ({
        x: acc.x + ctx.points[idx].x,
        y: acc.y + ctx.points[idx].y,
        z: acc.z + ctx.points[idx].z
      }),
      { x: 0, y: 0, z: 0 }
    );
    return { x: centroid.x / s.pts.length, y: centroid.y / s.pts.length, z: centroid.z / s.pts.length };
  }

  if (ctx.points.length) {
    const c = ctx.points.reduce(
      (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y, z: acc.z + p.z }),
      { x: 0, y: 0, z: 0 }
    );
    return { x: c.x / ctx.points.length, y: c.y / ctx.points.length, z: c.z / ctx.points.length };
  }

  return { x: 0, y: 0, z: 0 };
}

export function depthOpacityUi(z: number, zRange: ZRange): number {
  const base = viewportDepthOpacity(z, zRange);
  return 0.08 + 0.92 * Math.pow(base, 1.35);
}

export function pointDepthOpacityUi(z: number, zRange: ZRange): number {
  const d = depthOpacityUi(z, zRange);
  return 0.25 + 0.75 * d;
}

export function surfaceDepthOpacityUi(z: number, zRange: ZRange): number {
  const d = depthOpacityUi(z, zRange);
  return 0.15 + 0.85 * d;
}
