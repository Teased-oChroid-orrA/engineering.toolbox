import type { Curve, Edge, Point3D, SurfaceFace } from '../../../surface/types';
import { clamp, lerp3 } from '../../../surface/geom/points';

export type SnapKind = 'endpoint' | 'midpoint' | 'curve_nearest' | 'surface_projection';

export type SnapSettings = {
  endpoints: boolean;
  midpoints: boolean;
  curveNearest: boolean;
  surfaceProjection: boolean;
  thresholdPx: number;
};

export type SnapCandidate = {
  kind: SnapKind;
  distancePx: number;
  screen: { x: number; y: number };
  world: Point3D;
  pointIdx?: number;
  edgeIdx?: number;
  curveIdx?: number;
  surfaceIdx?: number;
};

function nearestPointOnSegment2D(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number }
) {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const len2 = vx * vx + vy * vy;
  if (len2 < 1e-12) return { t: 0, x: a.x, y: a.y, d: Math.hypot(p.x - a.x, p.y - a.y) };
  const t = clamp(((p.x - a.x) * vx + (p.y - a.y) * vy) / len2, 0, 1);
  const x = a.x + t * vx;
  const y = a.y + t * vy;
  return { t, x, y, d: Math.hypot(p.x - x, p.y - y) };
}

export function findBestSnapCandidate(args: {
  cursor: { x: number; y: number };
  points: Point3D[];
  edges: Edge[];
  curves: Curve[];
  surfaces: SurfaceFace[];
  projected: { x: number; y: number; z: number }[];
  settings: SnapSettings;
  surfaceScreenCenters?: Array<{ x: number; y: number } | null>;
  surfaceWorldCenters?: Array<Point3D | null>;
}): SnapCandidate | null {
  const { cursor, points, edges, curves, surfaces, projected, settings, surfaceScreenCenters, surfaceWorldCenters } = args;
  let best: SnapCandidate | null = null;

  const consider = (c: SnapCandidate) => {
    if (c.distancePx > settings.thresholdPx) return;
    if (!best || c.distancePx < best.distancePx) best = c;
  };

  if (settings.endpoints) {
    for (let i = 0; i < projected.length; i++) {
      const p2 = projected[i];
      const d = Math.hypot(cursor.x - p2.x, cursor.y - p2.y);
      consider({
        kind: 'endpoint',
        distancePx: d,
        screen: { x: p2.x, y: p2.y },
        world: points[i],
        pointIdx: i
      });
    }
  }

  if (settings.midpoints) {
    for (let ei = 0; ei < edges.length; ei++) {
      const [a, b] = edges[ei];
      const pa = projected[a];
      const pb = projected[b];
      if (!pa || !pb) continue;
      const mx = (pa.x + pb.x) / 2;
      const my = (pa.y + pb.y) / 2;
      const d = Math.hypot(cursor.x - mx, cursor.y - my);
      consider({
        kind: 'midpoint',
        distancePx: d,
        screen: { x: mx, y: my },
        world: lerp3(points[a], points[b], 0.5),
        edgeIdx: ei
      });
    }
  }

  if (settings.curveNearest) {
    for (let ci = 0; ci < curves.length; ci++) {
      const c = curves[ci];
      for (let j = 0; j + 1 < c.pts.length; j++) {
        const aIdx = c.pts[j];
        const bIdx = c.pts[j + 1];
        const pa = projected[aIdx];
        const pb = projected[bIdx];
        if (!pa || !pb) continue;
        const h = nearestPointOnSegment2D(cursor, pa, pb);
        consider({
          kind: 'curve_nearest',
          distancePx: h.d,
          screen: { x: h.x, y: h.y },
          world: lerp3(points[aIdx], points[bIdx], h.t),
          curveIdx: ci
        });
      }
    }
  }

  if (settings.surfaceProjection) {
    for (let si = 0; si < surfaces.length; si++) {
      const cachedScreen = surfaceScreenCenters?.[si];
      const cachedWorld = surfaceWorldCenters?.[si];
      if (cachedScreen && cachedWorld) {
        const d = Math.hypot(cursor.x - cachedScreen.x, cursor.y - cachedScreen.y);
        consider({
          kind: 'surface_projection',
          distancePx: d,
          screen: cachedScreen,
          world: cachedWorld,
          surfaceIdx: si
        });
        continue;
      }

      const s = surfaces[si];
      if (!s.pts.length) continue;
      let cx = 0;
      let cy = 0;
      let wx = 0;
      let wy = 0;
      let wz = 0;
      let n = 0;
      for (const pi of s.pts) {
        const pp = projected[pi];
        const pw = points[pi];
        if (!pp || !pw) continue;
        cx += pp.x;
        cy += pp.y;
        wx += pw.x;
        wy += pw.y;
        wz += pw.z;
        n++;
      }
      if (n < 3) continue;
      cx /= n;
      cy /= n;
      const d = Math.hypot(cursor.x - cx, cursor.y - cy);
      consider({
        kind: 'surface_projection',
        distancePx: d,
        screen: { x: cx, y: cy },
        world: { x: wx / n, y: wy / n, z: wz / n },
        surfaceIdx: si
      });
    }
  }

  return best;
}
