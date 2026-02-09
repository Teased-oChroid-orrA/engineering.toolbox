export type Point3D = { x: number; y: number; z: number };
export type Edge = [number, number];
export type Curve = { name: string; pts: number[] };

export type Snapshot = { points: Point3D[]; edges: Edge[]; curves: Curve[]; activeEdgeIdx: number | null };

export function clonePoints(ps: Point3D[]) { return ps.map((p) => ({ x: p.x, y: p.y, z: p.z })); }
export function cloneEdges(es: Edge[]) { return es.map((e) => [e[0], e[1]] as Edge); }
export function cloneCurves(cs: Curve[]) { return cs.map((c) => ({ name: c.name, pts: [...c.pts] })); }

export function makeSnapshot(state: { points: Point3D[]; edges: Edge[]; curves: Curve[]; activeEdgeIdx: number | null }): Snapshot {
  return { points: clonePoints(state.points), edges: cloneEdges(state.edges), curves: cloneCurves(state.curves), activeEdgeIdx: state.activeEdgeIdx };
}

export function pushUndo(undoStack: Snapshot[], curSnap: Snapshot) {
  const next = [...undoStack, curSnap];
  return next.length > 100 ? next.slice(next.length - 100) : next;
}

export function applySnapshot(s: Snapshot) {
  return { points: clonePoints(s.points), edges: cloneEdges(s.edges), curves: cloneCurves(s.curves), activeEdgeIdx: s.activeEdgeIdx };
}
