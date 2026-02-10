import type { DatumCsys, DatumPlane, Edge, Point3D, SurfaceFace } from '../../../surface/types';
import { vecSub } from '../../../surface/geom/points';

type CsysCreateMode = 'global' | 'three_points' | 'point_line' | 'copy';
type PlaneCreateMode =
  | 'three_points'
  | 'point_normal'
  | 'offset_surface'
  | 'two_lines'
  | 'point_direction'
  | 'csys_principal';

type PlanePrincipal = 'XY' | 'YZ' | 'ZX';

export function vecAdd(a: Point3D, b: Point3D): Point3D {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function vecScale(a: Point3D, k: number): Point3D {
  return { x: a.x * k, y: a.y * k, z: a.z * k };
}

export function vecCross(a: Point3D, b: Point3D): Point3D {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  };
}

export function vecLen(v: Point3D) {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

export function vecUnit(v: Point3D): Point3D {
  const l = vecLen(v);
  if (l < 1e-9) return { x: 1, y: 0, z: 0 };
  return { x: v.x / l, y: v.y / l, z: v.z / l };
}

export function surfaceCentroid(face: SurfaceFace, points: Point3D[]): Point3D {
  const sum = face.pts.reduce((acc, idx) => vecAdd(acc, points[idx]), { x: 0, y: 0, z: 0 });
  return vecScale(sum, 1 / Math.max(1, face.pts.length));
}

export function surfaceNormal(face: SurfaceFace, points: Point3D[]): Point3D {
  if (face.pts.length < 3) return { x: 0, y: 0, z: 1 };
  const p0 = points[face.pts[0]];
  const p1 = points[face.pts[1]];
  const p2 = points[face.pts[2]];
  return vecUnit(vecCross(vecSub(p1, p0), vecSub(p2, p0)));
}

export function createDatumCsys(args: {
  mode: CsysCreateMode;
  points: Point3D[];
  edges: Edge[];
  csys: DatumCsys[];
  name: string;
  originPointIdx: number;
  xPointIdx: number;
  yPointIdx: number;
  fromLineIdx: number;
  copyIdx: number;
}): DatumCsys | null {
  const { mode, points, edges, csys, name } = args;

  if (mode === 'global') {
    return {
      name,
      origin: { x: 0, y: 0, z: 0 },
      xAxis: { x: 1, y: 0, z: 0 },
      yAxis: { x: 0, y: 1, z: 0 },
      zAxis: { x: 0, y: 0, z: 1 }
    };
  }

  if (mode === 'three_points') {
    const o = points[args.originPointIdx];
    const px = points[args.xPointIdx];
    const py = points[args.yPointIdx];
    if (!o || !px || !py) return null;
    const x = vecUnit(vecSub(px, o));
    const v = vecSub(py, o);
    const z = vecUnit(vecCross(x, v));
    const y = vecUnit(vecCross(z, x));
    return { name, origin: { ...o }, xAxis: x, yAxis: y, zAxis: z };
  }

  if (mode === 'point_line') {
    const o = points[args.originPointIdx];
    const ln = edges[args.fromLineIdx];
    if (!o || !ln || !points[ln[0]] || !points[ln[1]]) return null;
    const x = vecUnit(vecSub(points[ln[1]], points[ln[0]]));
    const up = Math.abs(x.z) > 0.9 ? { x: 0, y: 1, z: 0 } : { x: 0, y: 0, z: 1 };
    const y = vecUnit(vecCross(up, x));
    const z = vecUnit(vecCross(x, y));
    return { name, origin: { ...o }, xAxis: x, yAxis: y, zAxis: z };
  }

  const src = csys[args.copyIdx];
  if (!src) return null;
  return {
    ...src,
    name,
    origin: { ...src.origin },
    xAxis: { ...src.xAxis },
    yAxis: { ...src.yAxis },
    zAxis: { ...src.zAxis }
  };
}

export function createDatumPlane(args: {
  mode: PlaneCreateMode;
  points: Point3D[];
  edges: Edge[];
  surfaces: SurfaceFace[];
  csys: DatumCsys[];
  name: string;
  p0Idx: number;
  p1Idx: number;
  p2Idx: number;
  normalVec: Point3D;
  offsetSurfaceIdx: number;
  offsetDistance: number;
  lineAIdx: number;
  lineBIdx: number;
  directionPointIdx: number;
  directionVec: Point3D;
  csysIdx: number;
  principal: PlanePrincipal;
}): DatumPlane | null {
  const { mode, points, edges, surfaces, csys, name } = args;
  let origin: Point3D | null = null;
  let normal: Point3D | null = null;
  let xDir: Point3D | undefined;

  if (mode === 'three_points') {
    const p0 = points[args.p0Idx];
    const p1 = points[args.p1Idx];
    const p2 = points[args.p2Idx];
    if (!p0 || !p1 || !p2) return null;
    origin = { ...p0 };
    xDir = vecUnit(vecSub(p1, p0));
    normal = vecUnit(vecCross(vecSub(p1, p0), vecSub(p2, p0)));
  } else if (mode === 'point_normal') {
    const p0 = points[args.p0Idx];
    if (!p0) return null;
    origin = { ...p0 };
    normal = vecUnit(args.normalVec);
  } else if (mode === 'offset_surface') {
    const s = surfaces[args.offsetSurfaceIdx];
    if (!s) return null;
    const c = surfaceCentroid(s, points);
    const n = surfaceNormal(s, points);
    origin = vecAdd(c, vecScale(n, Number(args.offsetDistance) || 0));
    normal = n;
  } else if (mode === 'two_lines') {
    const la = edges[args.lineAIdx];
    const lb = edges[args.lineBIdx];
    if (!la || !lb || !points[la[0]] || !points[la[1]] || !points[lb[0]] || !points[lb[1]]) return null;
    const aDir = vecUnit(vecSub(points[la[1]], points[la[0]]));
    const bDir = vecUnit(vecSub(points[lb[1]], points[lb[0]]));
    normal = vecUnit(vecCross(aDir, bDir));
    origin = { ...points[la[0]] };
    xDir = aDir;
  } else if (mode === 'point_direction') {
    const p0 = points[args.directionPointIdx];
    if (!p0) return null;
    origin = { ...p0 };
    normal = vecUnit(args.directionVec);
  } else {
    const c = csys[args.csysIdx];
    if (!c) return null;
    origin = { ...c.origin };
    if (args.principal === 'XY') {
      normal = { ...c.zAxis };
      xDir = { ...c.xAxis };
    } else if (args.principal === 'YZ') {
      normal = { ...c.xAxis };
      xDir = { ...c.yAxis };
    } else {
      normal = { ...c.yAxis };
      xDir = { ...c.zAxis };
    }
  }

  if (!origin || !normal) return null;
  return { name, origin, normal, xDir, source: mode };
}

export function planeBasis(pl: DatumPlane) {
  const n = vecUnit(pl.normal);
  let u = pl.xDir
    ? vecUnit(pl.xDir)
    : vecUnit(vecCross(Math.abs(n.z) > 0.9 ? { x: 0, y: 1, z: 0 } : { x: 0, y: 0, z: 1 }, n));
  if (vecLen(u) < 1e-9) u = { x: 1, y: 0, z: 0 };
  const v = vecUnit(vecCross(n, u));
  return { o: pl.origin, u, v, n };
}
