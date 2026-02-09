import type { Curve, DatumCsys, DatumPlane, Edge, Point3D, SurfaceFace } from '../types';

export type Snapshot = {
  points: Point3D[];
  edges: Edge[];
  curves: Curve[];
  surfaces: SurfaceFace[];
  csys: DatumCsys[];
  planes: DatumPlane[];
  activeEdgeIdx: number | null;
};

export function clonePoints(ps: Point3D[]) {
  return ps.map((p) => ({ x: p.x, y: p.y, z: p.z }));
}

export function cloneEdges(es: Edge[]) {
  return es.map((e) => [e[0], e[1]] as Edge);
}

export function cloneCurves(cs: Curve[]) {
  return cs.map((c) => ({ name: c.name, pts: [...c.pts] }));
}

export function cloneSurfaces(ss: SurfaceFace[]) {
  return ss.map((s) => ({ name: s.name, pts: [...s.pts] }));
}

export function cloneCsys(cs: DatumCsys[]) {
  return cs.map((c) => ({
    name: c.name,
    origin: { ...c.origin },
    xAxis: { ...c.xAxis },
    yAxis: { ...c.yAxis },
    zAxis: { ...c.zAxis }
  }));
}

export function clonePlanes(ps: DatumPlane[]) {
  return ps.map((p) => ({
    name: p.name,
    origin: { ...p.origin },
    normal: { ...p.normal },
    xDir: p.xDir ? { ...p.xDir } : undefined,
    source: p.source
  }));
}

export function createSnapshot(
  points: Point3D[],
  edges: Edge[],
  curves: Curve[],
  surfaces: SurfaceFace[],
  csys: DatumCsys[],
  planes: DatumPlane[],
  activeEdgeIdx: number | null
): Snapshot {
  return {
    points: clonePoints(points),
    edges: cloneEdges(edges),
    curves: cloneCurves(curves),
    surfaces: cloneSurfaces(surfaces),
    csys: cloneCsys(csys),
    planes: clonePlanes(planes),
    activeEdgeIdx
  };
}

export function materializeSnapshot(s: Snapshot) {
  return {
    points: clonePoints(s.points),
    edges: cloneEdges(s.edges),
    curves: cloneCurves(s.curves),
    surfaces: cloneSurfaces(s.surfaces),
    csys: cloneCsys(s.csys),
    planes: clonePlanes(s.planes),
    activeEdgeIdx: s.activeEdgeIdx
  };
}
