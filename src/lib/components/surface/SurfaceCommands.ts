import { invoke } from '@tauri-apps/api/core';

export type StepImportResult = {
  points: { x: number; y: number; z: number }[];
  edges: [number, number][];
  warnings?: string[];
};

// Minimal STEP geometry extraction (points + polyline/line edges).
// Supports the common subset used for point clouds and wire polyline exports.
// NOTE: For full CAD topology (EDGE_CURVE/ADVANCED_FACE), we will add a Rust-side triangulation path later.
export function parseStepPointsAndEdges(stepText: string, maxPoints = 200_000): StepImportResult {
  const warningSet = new Set<string>();
  const warnings: string[] = [];
  const points: { x: number; y: number; z: number }[] = [];
  const idToIdx = new Map<number, number>();
  const addWarning = (w: string) => {
    if (warningSet.has(w)) return;
    warningSet.add(w);
    warnings.push(w);
  };

  // CARTESIAN_POINT('',(x,y,z));
  const rePt = /#(\d+)\s*=\s*CARTESIAN_POINT\s*\([^,]*,\s*\(\s*([-+0-9.Ee]+)\s*,\s*([-+0-9.Ee]+)\s*,\s*([-+0-9.Ee]+)\s*\)\s*\)\s*;/gi;
  let m: RegExpExecArray | null;
  while ((m = rePt.exec(stepText))) {
    if (points.length >= maxPoints) {
      addWarning(`Point cap reached (${maxPoints}); additional points ignored.`);
      break;
    }
    const id = Number(m[1]);
    const x = Number(m[2]);
    const y = Number(m[3]);
    const z = Number(m[4]);
    if (!Number.isFinite(id) || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
    if (idToIdx.has(id)) continue;
    idToIdx.set(id, points.length);
    points.push({ x, y, z });
  }

  // DIRECTION('',(dx,dy,dz));
  const directionById = new Map<number, { x: number; y: number; z: number }>();
  const reDir = /#(\d+)\s*=\s*DIRECTION\s*\([^,]*,\s*\(\s*([-+0-9.Ee]+)\s*,\s*([-+0-9.Ee]+)\s*,\s*([-+0-9.Ee]+)\s*\)\s*\)\s*;/gi;
  while ((m = reDir.exec(stepText))) {
    const id = Number(m[1]);
    const x = Number(m[2]);
    const y = Number(m[3]);
    const z = Number(m[4]);
    if (!Number.isFinite(id) || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
    directionById.set(id, { x, y, z });
  }

  // VECTOR('',#dir,magnitude);
  const vectorById = new Map<number, { dirId: number; magnitude: number }>();
  const reVec = /#(\d+)\s*=\s*VECTOR\s*\([^,]*,\s*#(\d+)\s*,\s*([-+0-9.Ee]+)\s*\)\s*;/gi;
  while ((m = reVec.exec(stepText))) {
    const id = Number(m[1]);
    const dirId = Number(m[2]);
    const magnitude = Number(m[3]);
    if (!Number.isFinite(id) || !Number.isFinite(dirId) || !Number.isFinite(magnitude)) continue;
    vectorById.set(id, { dirId, magnitude });
  }

  const edges: [number, number][] = [];
  const edgeSet = new Set<string>();
  const pointKeyToIdx = new Map<string, number>();
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    pointKeyToIdx.set(`${p.x.toFixed(8)},${p.y.toFixed(8)},${p.z.toFixed(8)}`, i);
  }

  const addEdge = (a: number, b: number) => {
    if (a === b) return;
    if (a < 0 || b < 0 || a >= points.length || b >= points.length) return;
    const key = a < b ? `${a},${b}` : `${b},${a}`;
    if (edgeSet.has(key)) return;
    edgeSet.add(key);
    edges.push([a, b]);
  };

  const addOrGetPoint = (p: { x: number; y: number; z: number }) => {
    const key = `${p.x.toFixed(8)},${p.y.toFixed(8)},${p.z.toFixed(8)}`;
    const existing = pointKeyToIdx.get(key);
    if (existing != null) return existing;
    if (points.length >= maxPoints) {
      addWarning(`Point cap reached (${maxPoints}); could not add derived LINE endpoint.`);
      return null;
    }
    const idx = points.length;
    points.push(p);
    pointKeyToIdx.set(key, idx);
    return idx;
  };

  // POLYLINE((#12,#13,#14)); and POLYLINE('',(#12,#13,#14));
  const rePoly = /POLYLINE\s*\(\s*(?:[^,]*,\s*)?\(\s*([^)]+?)\s*\)\s*\)\s*;/gi;
  while ((m = rePoly.exec(stepText))) {
    const list = m[1];
    const refs = list
      .split(',')
      .map((s) => s.trim())
      .map((s) => (s.startsWith('#') ? Number(s.slice(1)) : NaN))
      .filter((n) => Number.isFinite(n));
    if (refs.length < 2) continue;
    const idxs: number[] = [];
    for (const id of refs) {
      const idx = idToIdx.get(id);
      if (idx != null) idxs.push(idx);
    }
    for (let i = 0; i + 1 < idxs.length; i++) addEdge(idxs[i], idxs[i + 1]);
  }

  // LINE('',#start,#otherRef) where otherRef is either:
  // - #point (non-standard but common in some exporters), or
  // - #vector (standard STEP). For vector lines we derive an endpoint and render a finite segment.
  const reLine = /LINE\s*\(\s*[^,]*,\s*#(\d+)\s*,\s*#(\d+)\s*\)\s*;/gi;
  while ((m = reLine.exec(stepText))) {
    const startId = Number(m[1]);
    const otherId = Number(m[2]);
    const startIdx = idToIdx.get(startId);
    if (startIdx == null) continue;

    const directEndIdx = idToIdx.get(otherId);
    if (directEndIdx != null) {
      addEdge(startIdx, directEndIdx);
      continue;
    }

    const vec = vectorById.get(otherId);
    if (!vec) continue;
    const dir = directionById.get(vec.dirId);
    if (!dir) {
      addWarning(`LINE references VECTOR #${otherId} with missing DIRECTION #${vec.dirId}.`);
      continue;
    }

    const dLen = Math.hypot(dir.x, dir.y, dir.z);
    if (dLen < 1e-12) {
      addWarning(`VECTOR #${otherId} has near-zero direction; skipped LINE segment.`);
      continue;
    }
    const d = { x: dir.x / dLen, y: dir.y / dLen, z: dir.z / dLen };
    const p0 = points[startIdx];
    const p1 = {
      x: p0.x + d.x * vec.magnitude,
      y: p0.y + d.y * vec.magnitude,
      z: p0.z + d.z * vec.magnitude
    };
    const endIdx = addOrGetPoint(p1);
    if (endIdx == null) continue;
    addEdge(startIdx, endIdx);
  }

  return { points, edges, warnings: warnings.length ? warnings : undefined };
}

export const surfaceCmd = {
  bestFitCylinder: (args: any) => invoke<any>('surface_eval_best_fit_cylinder', args),
  bestFitPlane: (args: any) => invoke<any>('surface_eval_best_fit_plane', args),
  sectionSlices: (args: any) => invoke<any>('surface_eval_section_slices', args),
  calcOffsetIntersection: (args: any) => invoke<any>('surface_calc_offset_intersection', args),
  importStepText: (args: { stepText: string; maxPoints: number }) => invoke<any>('surface_import_step_text', args),
};
