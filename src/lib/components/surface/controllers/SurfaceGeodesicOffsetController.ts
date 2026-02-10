import type { Curve, Point3D, SurfaceFace } from '../../../surface/types';
import { vecSub } from '../../../surface/geom/points';

function vAdd(a: Point3D, b: Point3D): Point3D {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function vMul(a: Point3D, k: number): Point3D {
  return { x: a.x * k, y: a.y * k, z: a.z * k };
}

function vDot(a: Point3D, b: Point3D) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function vCross(a: Point3D, b: Point3D): Point3D {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  };
}

function vLen(v: Point3D) {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function vUnit(v: Point3D): Point3D {
  const l = vLen(v);
  if (l < 1e-12) return { x: 1, y: 0, z: 0 };
  return { x: v.x / l, y: v.y / l, z: v.z / l };
}

function vUnitStrict(v: Point3D): Point3D | null {
  const l = vLen(v);
  if (l < 1e-9) return null;
  return { x: v.x / l, y: v.y / l, z: v.z / l };
}

function surfaceCentroid(surface: SurfaceFace, points: Point3D[]) {
  let c = { x: 0, y: 0, z: 0 };
  for (const pi of surface.pts) c = vAdd(c, points[pi]);
  return vMul(c, 1 / Math.max(1, surface.pts.length));
}

function surfaceNormal(surface: SurfaceFace, points: Point3D[]) {
  if (surface.pts.length < 3) return { x: 0, y: 0, z: 1 };
  const p0 = points[surface.pts[0]];
  const p1 = points[surface.pts[1]];
  const p2 = points[surface.pts[2]];
  return vUnit(vCross(vecSub(p1, p0), vecSub(p2, p0)));
}

function projectToPlane(p: Point3D, planeOrigin: Point3D, planeNormal: Point3D) {
  const d = vDot(vecSub(p, planeOrigin), planeNormal);
  return vAdd(p, vMul(planeNormal, -d));
}

export function computeGeodesicOffsetCurve(args: {
  points: Point3D[];
  curve: Curve;
  surface: SurfaceFace;
  distance: number;
}) {
  const { points, curve, surface, distance } = args;
  const n = surfaceNormal(surface, points);
  const planeO = surfaceCentroid(surface, points);
  const out: Point3D[] = [];

  for (let i = 0; i < curve.pts.length; i++) {
    const cur = points[curve.pts[i]];
    const prev = points[curve.pts[Math.max(0, i - 1)]];
    const next = points[curve.pts[Math.min(curve.pts.length - 1, i + 1)]];
    const tan = vUnit(vecSub(next, prev));

    // Geodesic-style local offset direction: tangent rotated in the tangent plane.
    const side = vUnit(vCross(n, tan));
    const lifted = vAdd(cur, vMul(side, distance));
    const onSurfacePlane = projectToPlane(lifted, planeO, n);
    out.push(onSurfacePlane);
  }

  return out;
}

type OffsetMethod = 'geodesic' | 'surface_projected' | 'directional_3d';
type OffsetSeverity = 'info' | 'warning' | 'error' | null;

export type CurveOffsetBestEffortResult = {
  method: OffsetMethod;
  severity: OffsetSeverity;
  message: string | null;
  points: Point3D[];
};

function tryGeodesicOffset(points: Point3D[], curve: Curve, surface: SurfaceFace, distance: number) {
  const n = vUnitStrict(surfaceNormal(surface, points));
  if (!n) return null;
  const planeO = surfaceCentroid(surface, points);
  const out: Point3D[] = [];

  for (let i = 0; i < curve.pts.length; i++) {
    const cur = points[curve.pts[i]];
    const prev = points[curve.pts[Math.max(0, i - 1)]];
    const next = points[curve.pts[Math.min(curve.pts.length - 1, i + 1)]];
    const tan = vUnitStrict(vecSub(next, prev));
    if (!tan) return null;
    const side = vUnitStrict(vCross(n, tan));
    if (!side) return null;
    const lifted = vAdd(cur, vMul(side, distance));
    out.push(projectToPlane(lifted, planeO, n));
  }
  return out;
}

function trySurfaceProjectedApprox(points: Point3D[], curve: Curve, surface: SurfaceFace, distance: number) {
  const n = vUnitStrict(surfaceNormal(surface, points));
  if (!n) return null;
  const planeO = surfaceCentroid(surface, points);
  const out: Point3D[] = [];

  for (let i = 0; i < curve.pts.length; i++) {
    const cur = points[curve.pts[i]];
    const prev = points[curve.pts[Math.max(0, i - 1)]];
    const next = points[curve.pts[Math.min(curve.pts.length - 1, i + 1)]];
    const sec = vecSub(next, prev);
    const tanPlane = vecSub(sec, vMul(n, vDot(sec, n)));
    const tan = vUnitStrict(tanPlane);
    if (!tan) return null;
    const side = vUnitStrict(vCross(n, tan));
    if (!side) return null;
    const lifted = vAdd(cur, vMul(side, distance));
    out.push(projectToPlane(lifted, planeO, n));
  }
  return out;
}

function directional3dFallback(points: Point3D[], curve: Curve, distance: number) {
  const out: Point3D[] = [];
  for (let i = 0; i < curve.pts.length; i++) {
    const cur = points[curve.pts[i]];
    const prev = points[curve.pts[Math.max(0, i - 1)]];
    const next = points[curve.pts[Math.min(curve.pts.length - 1, i + 1)]];
    const tan = vUnit(vecSub(next, prev));
    const up = Math.abs(tan.z) > 0.92 ? ({ x: 0, y: 1, z: 0 } as Point3D) : ({ x: 0, y: 0, z: 1 } as Point3D);
    const side = vUnit(vCross(up, tan));
    out.push(vAdd(cur, vMul(side, distance)));
  }
  return out;
}

export function computeCurveOffsetBestEffort(args: {
  points: Point3D[];
  curve: Curve;
  surface: SurfaceFace;
  distance: number;
}): CurveOffsetBestEffortResult {
  const { points, curve, surface, distance } = args;

  const geodesic = tryGeodesicOffset(points, curve, surface, distance);
  if (geodesic && geodesic.length === curve.pts.length) {
    return {
      method: 'geodesic',
      severity: null,
      message: null,
      points: geodesic
    };
  }

  const projected = trySurfaceProjectedApprox(points, curve, surface, distance);
  if (projected && projected.length === curve.pts.length) {
    return {
      method: 'surface_projected',
      severity: 'warning',
      message: 'Geodesic solve unstable; used surface-projected approximation.',
      points: projected
    };
  }

  return {
    method: 'directional_3d',
    severity: 'error',
    message: 'Surface-constrained offset failed; used 3D directional fallback.',
    points: directional3dFallback(points, curve, distance)
  };
}
