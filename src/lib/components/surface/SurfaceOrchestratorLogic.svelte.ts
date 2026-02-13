/**
 * SurfaceOrchestratorLogic.svelte.ts
 * 
 * Pure business logic functions extracted from SurfaceOrchestrator.svelte.
 * All functions receive state as parameters instead of closing over reactive state.
 */

import type {
  DatumCsys,
  DatumPlane,
  Point3D,
  Edge,
  Curve,
  SurfaceFace,
  Snapshot,
  ToolCursorMode,
  SnapCandidate,
  IntersectionDiagnostics,
  HoverTooltip,
  SurfaceRecipe,
  SurfaceRecipeConfig,
  SurfaceRecipeStep,
  RecipeRunState,
  RecipeTransaction,
  DatumSliceMode,
  DatumSliceRunResult
} from './SurfaceOrchestratorDeps';

import {
  bilerp,
  lerp3,
  clamp,
  vecAdd,
  vecScale,
  vecUnit,
  vecSub,
  vecNorm,
  deg,
  edgeExists,
  buildLoftSegments,
  computeCurveOffsetBestEffort,
  surfaceNormal,
  createDatumCsys,
  createDatumPlane,
  planeBasis,
  findBestSnapCandidate,
  buildHoverTooltip,
  snapCandidateSignature,
  nearestPointIndex,
  shouldProcessHover,
  shouldRecomputeHover,
  makeHoverModeKey,
  applySelectionHits,
  nextSelectionModeState,
  nextCreateModeState,
  linePickState,
  surfacePickState,
  transitionToolCursor,
  diagnoseIntersectionResult,
  precheckIntersectionInputs
} from './SurfaceOrchestratorDeps';

// --- Types for State Context Objects ---

export interface SamplerState {
  points: Point3D[];
  samplerMode: 'quad' | 'edges';
  samplerNu: number;
  samplerNv: number;
  samplerEdgeSegs: number;
  samplerAppend: boolean;
}

export interface GeometryState {
  points: Point3D[];
  edges: Edge[];
  curves: Curve[];
  surfaces: SurfaceFace[];
  planes: DatumPlane[];
  csys: DatumCsys[];
  activeEdgeIdx: number | null;
  activeCurveIdx: number | null;
  loftA: number | null;
  loftB: number | null;
  pendingPointIdx: number | null;
  selectedPointIds: number[];
}

export interface ViewState {
  rot: { alpha: number; beta: number };
  zoomK: number;
  pan: { x: number; y: number };
  w: number;
  h: number;
}

export interface ToolState {
  toolCursor: ToolCursorMode;
  selectionMode: 'none' | 'box' | 'lasso';
  curveMode: boolean;
  createMode: 'idle' | 'point' | 'line' | 'surface';
  creatorPick: null | { kind: 'line'; slot: 'A' | 'B' } | { kind: 'surface'; slot: number };
  surfaceDraft: number[];
  datumPick: null | { target: 'csys3' | 'csysPointLine'; slot: 'origin' | 'x' | 'y' | 'line' };
  lineInsertPickMode: boolean;
}

export interface SnapState {
  snapEndpoints: boolean;
  snapMidpoints: boolean;
  snapCurveNearest: boolean;
  snapSurfaceProjection: boolean;
  snapThresholdPx: number;
}

// --- Point Cloud Sampler ---

export interface GenerateSamplerPointsParams {
  points: Point3D[];
  samplerMode: 'quad' | 'edges';
  samplerNu: number;
  samplerNv: number;
  samplerEdgeSegs: number;
  samplerAppend: boolean;
}

export interface GenerateSamplerPointsResult {
  success: boolean;
  error: string | null;
  newPoints: Point3D[] | null;
  shouldClearDependencies: boolean;
}

export function generateSamplerPoints(params: GenerateSamplerPointsParams): GenerateSamplerPointsResult {
  const { points, samplerMode, samplerNu, samplerNv, samplerEdgeSegs, samplerAppend } = params;

  if (points.length < 4) {
    return {
      success: false,
      error: 'Need at least 4 points (P0–P3) to sample.',
      newPoints: null,
      shouldClearDependencies: false
    };
  }

  const p0 = points[0];
  const p1 = points[1];
  const p2 = points[2];
  const p3 = points[3];

  const newPts: Point3D[] = [];

  if (samplerMode === 'quad') {
    const Nu = Math.max(2, Math.floor(Number(samplerNu) || 2));
    const Nv = Math.max(2, Math.floor(Number(samplerNv) || 2));
    for (let j = 0; j < Nv; j++) {
      const v = Nv === 1 ? 0 : j / (Nv - 1);
      for (let i = 0; i < Nu; i++) {
        const u = Nu === 1 ? 0 : i / (Nu - 1);
        newPts.push(bilerp(p0, p1, p2, p3, u, v));
      }
    }
  } else {
    const segs = Math.max(1, Math.floor(Number(samplerEdgeSegs) || 1));
    const ring: [Point3D, Point3D][] = [
      [p0, p1],
      [p1, p2],
      [p2, p3],
      [p3, p0]
    ];
    for (const [a, b] of ring) {
      for (let s = 0; s <= segs; s++) {
        const t = segs === 0 ? 0 : s / segs;
        newPts.push(lerp3(a, b, t));
      }
    }
  }

  if (!newPts.length) {
    return {
      success: false,
      error: 'No points generated.',
      newPoints: null,
      shouldClearDependencies: false
    };
  }

  return {
    success: true,
    error: null,
    newPoints: newPts,
    shouldClearDependencies: !samplerAppend
  };
}

// --- Selection Helpers ---

export function clearSelection(): number[] {
  return [];
}

export function invertSelection(points: Point3D[], selectedPointIds: number[]): number[] {
  const cur = new Set(selectedPointIds);
  const next: number[] = [];
  for (let i = 0; i < points.length; i++) {
    if (!cur.has(i)) next.push(i);
  }
  return next;
}

export function applySelectionFromHits(
  hits: number[],
  current: number[],
  ev: { shiftKey?: boolean; altKey?: boolean }
): number[] {
  const add = ev.shiftKey ?? false;
  const sub = ev.altKey ?? false;
  return applySelectionHits({
    current,
    hits,
    add,
    subtract: sub
  });
}

// --- SVG Coordinate Helpers ---

export function svgCoordsFromEvent(
  ev: PointerEvent | MouseEvent,
  svgEl: SVGSVGElement | null
): { x: number; y: number } {
  const r = svgEl?.getBoundingClientRect();
  if (!r) return { x: 0, y: 0 };
  return { x: ev.clientX - r.left, y: ev.clientY - r.top };
}

// --- Accessibility Helper ---

export function keyActivate(e: KeyboardEvent, fn: () => void) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fn();
  }
}

// --- Heatmap Color ---

export function heatColor(absd: number, scale: number): string {
  const t = clamp(absd / Math.max(1e-12, scale), 0, 1);
  const r = Math.round(60 + 195 * t);
  const g = Math.round(220 - 150 * t);
  const b = Math.round(90 - 70 * t);
  return `rgba(${r},${g},${b},0.80)`;
}

// --- Context Builder Functions ---

export interface CylUiCtx {
  getCylRes: () => { rms: number; absDistances: number[] } | null;
  getCylRefineK: () => number;
  getCylFitPointIds: () => number[];
  getSelectedPointIds: () => number[];
  setSelectedPointIds: (next: number[]) => void;
}

export interface EvaluationUiCtx {
  getPoints: () => Point3D[];
  getSelectedPointIds: () => number[];
  getEvalUseSelection: () => boolean;
  getEvalTol: () => number;
  getEvalSigmaMult: () => number;
  getEvalMaxOutliers: () => number;
  setCylErr: (v: string | null) => void;
  setCylBusy: (v: boolean) => void;
  setCylFitPointIds: (v: number[]) => void;
  setCylRes: (v: any) => void;
  setEvalErr: (v: string | null) => void;
  setEvalBusy: (v: boolean) => void;
  setEvalRes: (v: any) => void;
  getSliceAxis: () => 'x' | 'y' | 'z';
  getSliceBins: () => number;
  getSliceThickness: () => number;
  setSliceErr: (v: string | null) => void;
  setSliceBusy: (v: boolean) => void;
  setSliceRes: (v: any) => void;
  getDatumPlaneChoices: () => DatumPlane[];
  getDatumSlicePlaneIdx: () => number;
  getDatumSliceMode: () => DatumSliceMode;
  getDatumSliceSpacing: () => number;
  getDatumSliceCount: () => number;
  getDatumSliceThickness: () => number;
  getDatumSliceUseSelection: () => boolean;
  setDatumSliceErr: (v: string | null) => void;
  setDatumSliceBusy: (v: boolean) => void;
  setDatumSliceRes: (v: DatumSliceRunResult | null) => void;
  getDatumSliceRes: () => DatumSliceRunResult | null;
  setSelectedSliceId: (v: number | null) => void;
  getIncludeOptionalSliceColumns: () => boolean;
  getStatusWarnings: () => any[];
  setStatusWarnings: (v: any[]) => void;
  getEmittedWarningIds: () => Set<string>;
  toast: any;
}

export interface RecipeUiCtx {
  getSelEdgeA: () => number | null;
  getSelEdgeB: () => number | null;
  getOffsetDist: () => number;
  getRefPointIdx: () => number;
  getDatumSlicePlaneIdx: () => number;
  getDatumSliceMode: () => DatumSliceMode;
  getDatumSliceSpacing: () => number;
  getDatumSliceCount: () => number;
  getDatumSliceThickness: () => number;
  getDatumSliceUseSelection: () => boolean;
  getIncludeOptionalSliceColumns: () => boolean;
  setRecipeNameDraft: (v: string) => void;
  getRecipeNameDraft: () => string;
  getRecipes: () => SurfaceRecipe[];
  setRecipes: (v: SurfaceRecipe[]) => void;
  getSelectedRecipeId: () => string | null;
  setSelectedRecipeId: (v: string | null) => void;
  setRecipeRun: (v: RecipeRunState | null) => void;
  setSelEdgeA: (v: number | null) => void;
  setSelEdgeB: (v: number | null) => void;
  setOffsetDist: (v: number) => void;
  setRefPointIdx: (v: number) => void;
  setDatumSlicePlaneIdx: (v: number) => void;
  setDatumSliceMode: (v: DatumSliceMode) => void;
  setDatumSliceSpacing: (v: number) => void;
  setDatumSliceCount: (v: number) => void;
  setDatumSliceThickness: (v: number) => void;
  setDatumSliceUseSelection: (v: boolean) => void;
  setIncludeOptionalSliceColumns: (v: boolean) => void;
}

export interface RecipeRunUiCtx {
  getRecipeRun: () => RecipeRunState | null;
  setRecipeRun: (v: RecipeRunState | null) => void;
  getRecipes: () => SurfaceRecipe[];
  getSelectedRecipe: () => SurfaceRecipe | null;
  getRecipeStepConfirmed: () => boolean;
  getRecipeTx: () => RecipeTransaction | null;
  setRecipeTx: (v: RecipeTransaction | null) => void;
  beginRecipeTransaction: () => RecipeTransaction;
  getCurrentSnapshot: () => Snapshot;
  applySnapshot: (s: Snapshot) => void;
  getUndoRedoStacks: () => { undoStack: Snapshot[]; redoStack: Snapshot[] };
  setUndoRedoStacks: (v: { undoStack: Snapshot[]; redoStack: Snapshot[] }) => void;
  applyRecipeConfig: (cfg: SurfaceRecipeConfig) => void;
  calcOffsetIntersection: () => Promise<void>;
  computeDatumSlices: () => Promise<void>;
  exportDatumSliceCombined: () => void;
  getDatumSliceRes: () => DatumSliceRunResult | null;
  getIntersectionDiagnostics: () => IntersectionDiagnostics;
  emitStatusWarnings: (warnings: any[]) => void;
  getDatumSliceErr: () => string | null;
}

// --- Geometry Creation Helpers ---

export interface CreateLineFromPairParams {
  aRaw: number | null;
  bRaw: number | null;
  points: Point3D[];
  edges: Edge[];
}

export interface CreateLineResult {
  success: boolean;
  newEdgeIdx: number | null;
}

export function createLineFromPair(params: CreateLineFromPairParams): CreateLineResult {
  const { aRaw, bRaw, points, edges } = params;
  
  if (aRaw == null || bRaw == null) {
    return { success: false, newEdgeIdx: null };
  }
  
  const a = Number(aRaw);
  const b = Number(bRaw);
  
  if (
    !Number.isInteger(a) ||
    !Number.isInteger(b) ||
    a < 0 ||
    b < 0 ||
    a >= points.length ||
    b >= points.length ||
    a === b
  ) {
    return { success: false, newEdgeIdx: null };
  }
  
  if (edgeExists(edges, a, b)) {
    return { success: false, newEdgeIdx: null };
  }
  
  return { success: true, newEdgeIdx: edges.length };
}

export interface CreateSurfaceFromIndicesParams {
  idsRaw: number[];
  points: Point3D[];
  surfaces: SurfaceFace[];
}

export interface CreateSurfaceResult {
  success: boolean;
  newSurfaceIdx: number | null;
}

export function createSurfaceFromIndices(params: CreateSurfaceFromIndicesParams): CreateSurfaceResult {
  const { idsRaw, points, surfaces } = params;
  
  if (idsRaw.length < 3) {
    return { success: false, newSurfaceIdx: null };
  }
  
  const ids = idsRaw.map((v) => Number(v));
  
  if (ids.some((i) => !Number.isInteger(i) || i < 0 || i >= points.length)) {
    return { success: false, newSurfaceIdx: null };
  }
  
  if (new Set(ids).size !== ids.length) {
    return { success: false, newSurfaceIdx: null };
  }
  
  return { success: true, newSurfaceIdx: surfaces.length };
}

// --- Datum Creation ---

export interface AddDatumCsysParams {
  mode: 'global' | 'three_points' | 'point_line' | 'copy';
  points: Point3D[];
  edges: Edge[];
  csys: DatumCsys[];
  name: string;
  originPointIdx: number;
  xPointIdx: number;
  yPointIdx: number;
  fromLineIdx: number;
  copyIdx: number;
}

export function addDatumCsys(params: AddDatumCsysParams): DatumCsys | null {
  return createDatumCsys(params);
}

export interface AddDatumPlaneParams {
  mode: 'three_points' | 'point_normal' | 'offset_surface' | 'two_lines' | 'point_direction' | 'csys_principal';
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
  principal: 'XY' | 'YZ' | 'ZX';
}

export function addDatumPlane(params: AddDatumPlaneParams): DatumPlane | null {
  return createDatumPlane(params);
}

// --- Surface Offset ---

export interface OffsetSurfaceParams {
  surfaceIdx: number;
  offsetDist: number;
  surfaces: SurfaceFace[];
  points: Point3D[];
}

export interface OffsetSurfaceResult {
  newPoints: Point3D[];
  newSurface: SurfaceFace;
}

export function offsetSurface(params: OffsetSurfaceParams): OffsetSurfaceResult | null {
  const { surfaceIdx, offsetDist, surfaces, points } = params;
  const s = surfaces[surfaceIdx];
  if (!s) return null;

  const n = surfaceNormal(s, points);
  const dist = Number(offsetDist) || 0;
  
  const newIdxMap = new Map<number, number>();
  const newPoints: Point3D[] = [];
  const startIdx = points.length;
  
  for (let i = 0; i < s.pts.length; i++) {
    const pi = s.pts[i];
    const np = vecAdd(points[pi], vecScale(n, dist));
    newPoints.push(np);
    newIdxMap.set(pi, startIdx + i);
  }
  
  const newPts = s.pts.map((pi) => newIdxMap.get(pi) as number);
  
  return {
    newPoints,
    newSurface: { name: `Surface ${surfaces.length + 1}`, pts: newPts }
  };
}

// --- Curve Offset ---

export interface OffsetCurveOnSurfaceParams {
  curveIdx: number;
  surfaceIdx: number;
  offsetDist: number;
  offsetFlip: boolean;
  curves: Curve[];
  surfaces: SurfaceFace[];
  points: Point3D[];
}

export interface OffsetCurveResult {
  newPoints: Point3D[];
  newCurve: Curve;
  status: {
    severity: 'info' | 'warning' | 'error' | null;
    method: 'geodesic' | 'surface_projected' | 'directional_3d' | null;
    message: string | null;
  };
}

export function offsetCurveOnSurface(params: OffsetCurveOnSurfaceParams): OffsetCurveResult | null {
  const { curveIdx, surfaceIdx, offsetDist, offsetFlip, curves, surfaces, points } = params;
  
  const c = curves[curveIdx];
  const s = surfaces[surfaceIdx];
  if (!c || !s || c.pts.length < 2) return null;

  const d = (Number(offsetDist) || 0) * (offsetFlip ? -1 : 1);
  
  const result = computeCurveOffsetBestEffort({
    points,
    curve: c,
    surface: s,
    distance: d
  });

  return {
    newPoints: result.points,
    newCurve: { name: `Curve ${curves.length + 1}`, pts: [] },
    status: {
      severity: result.severity,
      method: result.method,
      message: result.message
    }
  };
}

// --- Extrusion ---

export interface ExtrusionDirectionParams {
  pathPts: number[];
  extrudeDirMode: 'vector' | 'curve' | 'surfaceNormal';
  extrudeVector: Point3D;
  extrudeSurfaceIdx: number;
  extrudeFlip: boolean;
  points: Point3D[];
  surfaces: SurfaceFace[];
}

export function extrusionDirection(params: ExtrusionDirectionParams): Point3D {
  const { pathPts, extrudeDirMode, extrudeVector, extrudeSurfaceIdx, extrudeFlip, points, surfaces } = params;
  
  let dir: Point3D;
  
  if (extrudeDirMode === 'vector') {
    dir = vecUnit(extrudeVector);
  } else if (extrudeDirMode === 'curve') {
    if (pathPts.length < 2) {
      dir = { x: 0, y: 0, z: 1 };
    } else {
      dir = vecUnit(vecSub(points[pathPts[pathPts.length - 1]], points[pathPts[0]]));
    }
  } else {
    const s = surfaces[extrudeSurfaceIdx];
    dir = s ? surfaceNormal(s, points) : { x: 0, y: 0, z: 1 };
  }
  
  if (extrudeFlip) {
    dir = vecScale(dir, -1);
  }
  
  return dir;
}

export interface ExtrudeLineOrCurveParams {
  extrudeTarget: 'line' | 'curve';
  extrudeLineIdx: number;
  extrudeCurveIdx: number;
  extrudeDirMode: 'vector' | 'curve' | 'surfaceNormal';
  extrudeVector: Point3D;
  extrudeSurfaceIdx: number;
  extrudeFlip: boolean;
  extrudeDistance: number;
  edges: Edge[];
  curves: Curve[];
  points: Point3D[];
  surfaces: SurfaceFace[];
}

export interface ExtrudeResult {
  newPoints: Point3D[];
  newSurfaces: SurfaceFace[];
  newEdges: Edge[];
}

export function extrudeLineOrCurve(params: ExtrudeLineOrCurveParams): ExtrudeResult | null {
  const {
    extrudeTarget,
    extrudeLineIdx,
    extrudeCurveIdx,
    extrudeDirMode,
    extrudeVector,
    extrudeSurfaceIdx,
    extrudeFlip,
    extrudeDistance,
    edges,
    curves,
    points,
    surfaces
  } = params;

  const pathPts =
    extrudeTarget === 'line'
      ? (edges[extrudeLineIdx] ? [edges[extrudeLineIdx][0], edges[extrudeLineIdx][1]] : [])
      : (curves[extrudeCurveIdx]?.pts ?? []);

  if (pathPts.length < 2) return null;

  const dir = extrusionDirection({
    pathPts,
    extrudeDirMode,
    extrudeVector,
    extrudeSurfaceIdx,
    extrudeFlip,
    points,
    surfaces
  });

  const dist = Number(extrudeDistance) || 0;
  
  const newPoints: Point3D[] = [];
  const topIdx: number[] = [];
  const startIdx = points.length;
  
  for (let i = 0; i < pathPts.length; i++) {
    const pi = pathPts[i];
    newPoints.push(vecAdd(points[pi], vecScale(dir, dist)));
    topIdx.push(startIdx + i);
  }

  const newSurfaces: SurfaceFace[] = [];
  const newEdges: Edge[] = [];
  
  for (let i = 0; i < pathPts.length - 1; i++) {
    const a = pathPts[i];
    const b0 = pathPts[i + 1];
    const c = topIdx[i + 1];
    const d = topIdx[i];
    
    newSurfaces.push({ name: `Surface ${surfaces.length + newSurfaces.length + 1}`, pts: [a, b0, c, d] });
    
    if (!edgeExists(edges, a, b0)) newEdges.push([a, b0]);
    if (!edgeExists(edges, b0, c)) newEdges.push([b0, c]);
    if (!edgeExists(edges, c, d)) newEdges.push([c, d]);
    if (!edgeExists(edges, d, a)) newEdges.push([d, a]);
  }

  return { newPoints, newSurfaces, newEdges };
}

// --- Topology Healing ---

export interface TopologyHealingParams {
  points: Point3D[];
  edges: Edge[];
  curves: Curve[];
  surfaces: SurfaceFace[];
  tolerance: number;
}

export interface TopologyHealingResult {
  points: Point3D[];
  edges: Edge[];
  curves: Curve[];
  surfaces: SurfaceFace[];
}

export function runTopologyHealing(params: TopologyHealingParams): TopologyHealingResult {
  const { points, edges, curves, surfaces, tolerance } = params;
  const tol = Math.max(1e-9, Number(tolerance) || 1e-6);

  const reps: Point3D[] = [];
  const map: number[] = [];

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    let found = -1;
    for (let j = 0; j < reps.length; j++) {
      const q = reps[j];
      if (Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z) <= tol) {
        found = j;
        break;
      }
    }
    if (found >= 0) {
      map[i] = found;
    } else {
      map[i] = reps.length;
      reps.push({ ...p });
    }
  }

  const edgeKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);
  const seenEdges = new Set<string>();
  
  const newEdges = edges
    .map(([a, b]) => [map[a], map[b]] as Edge)
    .filter(([a, b]) => a !== b)
    .filter(([a, b]) => {
      const k = edgeKey(a, b);
      if (seenEdges.has(k)) return false;
      seenEdges.add(k);
      return true;
    });

  const newCurves = curves
    .map((c) => {
      const out: number[] = [];
      for (const pi of c.pts.map((pi) => map[pi])) {
        if (out.length === 0 || out[out.length - 1] !== pi) out.push(pi);
      }
      return { ...c, pts: out };
    })
    .filter((c) => c.pts.length >= 2);

  const newSurfaces = surfaces
    .map((s) => {
      const out: number[] = [];
      for (const pi of s.pts.map((pi) => map[pi])) {
        if (!out.includes(pi)) out.push(pi);
      }
      return { ...s, pts: out };
    })
    .filter((s) => s.pts.length >= 3);

  return {
    points: reps,
    edges: newEdges,
    curves: newCurves,
    surfaces: newSurfaces
  };
}

// --- Point Insertion on Edge ---

export interface InsertPointOnEdgeParams {
  edgeIdx: number;
  t: number;
  edges: Edge[];
  points: Point3D[];
}

export interface InsertPointResult {
  newPoint: Point3D;
  newPointIdx: number;
  edgesToRemove: number[];
  edgesToAdd: Edge[];
  newActiveEdgeIdx: number;
}

export function insertPointOnEdge(params: InsertPointOnEdgeParams): InsertPointResult | null {
  const { edgeIdx, t, edges, points } = params;
  const e = edges[edgeIdx];
  if (!e) return null;

  const [a, b] = e;
  const tClamped = clamp(t, 0, 1);
  const np = lerp3(points[a], points[b], tClamped);
  const ni = points.length;

  return {
    newPoint: np,
    newPointIdx: ni,
    edgesToRemove: [edgeIdx],
    edgesToAdd: [[a, ni], [ni, b]],
    newActiveEdgeIdx: edgeIdx + 1
  };
}

// --- Point Deletion ---

export interface DeletePointParams {
  idx: number;
  points: Point3D[];
  edges: Edge[];
  curves: Curve[];
  surfaces: SurfaceFace[];
}

export interface DeletePointResult {
  points: Point3D[];
  edges: Edge[];
  curves: Curve[];
  surfaces: SurfaceFace[];
}

export function deletePoint(params: DeletePointParams): DeletePointResult {
  const { idx, points, edges, curves, surfaces } = params;

  const newPoints = points.filter((_, i) => i !== idx);
  
  const newEdges = edges
    .filter(([a, b]) => a !== idx && b !== idx)
    .map(([a, b]) => [a > idx ? a - 1 : a, b > idx ? b - 1 : b] as Edge);

  const newCurves = curves.map((c) => ({
    ...c,
    pts: c.pts
      .filter((p) => p !== idx)
      .map((p) => (p > idx ? p - 1 : p))
  }));

  const newSurfaces = surfaces
    .map((s) => ({
      ...s,
      pts: s.pts
        .filter((p) => p !== idx)
        .map((p) => (p > idx ? p - 1 : p))
    }))
    .filter((s) => s.pts.length >= 3);

  return {
    points: newPoints,
    edges: newEdges,
    curves: newCurves,
    surfaces: newSurfaces
  };
}

// --- Edge Deletion ---

export function deleteEdge(idx: number, edges: Edge[]): Edge[] {
  return edges.filter((_, i) => i !== idx);
}

// --- Curve Helpers ---

export function deleteCurve(idx: number, curves: Curve[]): Curve[] {
  return curves.filter((_, i) => i !== idx);
}

// --- Surface Deletion ---

export function deleteSurface(idx: number, surfaces: SurfaceFace[]): SurfaceFace[] {
  return surfaces.filter((_, i) => i !== idx);
}

// --- Taper Angle Estimation ---

export function estimateTaperAngleAtPoint(idx: number, edges: Edge[], points: Point3D[]): number {
  const connected = edges.filter(([a, b]) => a === idx || b === idx);
  if (connected.length === 0) return 0;

  let vSum: Point3D = { x: 0, y: 0, z: 0 };
  for (const [a, b] of connected) {
    const j = a === idx ? b : a;
    const dv = vecSub(points[j], points[idx]);
    vSum = { x: vSum.x + dv.x, y: vSum.y + dv.y, z: vSum.z + dv.z };
  }
  const vN = vecNorm(vSum);
  const dxy = Math.sqrt(vN.x * vN.x + vN.y * vN.y);
  const ang = deg(Math.atan2(Math.abs(vN.z), Math.max(1e-12, dxy)));
  return ang;
}

// --- Snap and Hover Logic ---

export interface UpdateSnapFromMouseParams {
  mx: number;
  my: number;
  points: Point3D[];
  edges: Edge[];
  curves: Curve[];
  surfaces: SurfaceFace[];
  projected: (Point3D & { z: number })[];
  surfaceScreenCenters: ({ x: number; y: number } | null)[];
  surfaceWorldCenters: (Point3D | null)[];
  settings: SnapState;
}

export function updateSnapFromMouse(params: UpdateSnapFromMouseParams): {
  snap: SnapCandidate | null;
  tooltip: HoverTooltip | null;
  signature: string;
} {
  const {
    mx,
    my,
    points,
    edges,
    curves,
    surfaces,
    projected,
    surfaceScreenCenters,
    surfaceWorldCenters,
    settings
  } = params;

  const nextSnap = findBestSnapCandidate({
    cursor: { x: mx, y: my },
    points,
    edges,
    curves,
    surfaces,
    projected,
    surfaceScreenCenters,
    surfaceWorldCenters,
    settings: {
      endpoints: settings.snapEndpoints,
      midpoints: settings.snapMidpoints,
      curveNearest: settings.snapCurveNearest,
      surfaceProjection: settings.snapSurfaceProjection,
      thresholdPx: Number(settings.snapThresholdPx) || 16
    }
  });

  const nextSig = snapCandidateSignature(nextSnap);
  const tooltip = buildHoverTooltip(nextSnap, 'select' as ToolCursorMode);

  return {
    snap: nextSnap,
    tooltip,
    signature: nextSig
  };
}

// --- Hover Processing ---

export interface ProcessHoverParams {
  mx: number;
  my: number;
  lastHoverPos: { x: number; y: number };
  lastHoverModeKey: string;
  toolCursor: ToolCursorMode;
  probeOn: boolean;
  snapState: SnapState;
  creatorPickActive: boolean;
  datumPickActive: boolean;
  lineInsertPickMode: boolean;
  points: Point3D[];
  edges: Edge[];
  projected: (Point3D & { z: number })[];
  maxTaperDeg: number;
}

export interface ProcessHoverResult {
  shouldProcess: boolean;
  snap: SnapCandidate | null;
  tooltip: HoverTooltip | null;
  probe: { x: number; y: number; angleDeg: number; ok: boolean } | null;
  newModeKey: string;
}

export function processHoverAt(params: ProcessHoverParams): ProcessHoverResult {
  const {
    mx,
    my,
    lastHoverPos,
    lastHoverModeKey,
    toolCursor,
    probeOn,
    snapState,
    creatorPickActive,
    datumPickActive,
    lineInsertPickMode,
    points,
    edges,
    projected,
    maxTaperDeg
  } = params;

  const modeKey = makeHoverModeKey({
    toolCursor,
    probeOn,
    snapEndpoints: snapState.snapEndpoints,
    snapMidpoints: snapState.snapMidpoints,
    snapCurveNearest: snapState.snapCurveNearest,
    snapSurfaceProjection: snapState.snapSurfaceProjection,
    snapThresholdPx: snapState.snapThresholdPx,
    creatorPickActive,
    datumPickActive,
    lineInsertPickMode
  });

  const needsHover = shouldProcessHover({
    probeOn,
    toolCursor,
    creatorPickActive,
    datumPickActive,
    lineInsertPickMode
  });

  if (!needsHover) {
    return {
      shouldProcess: false,
      snap: null,
      tooltip: null,
      probe: null,
      newModeKey: modeKey
    };
  }

  const shouldRecompute = shouldRecomputeHover({
    lastX: lastHoverPos.x,
    lastY: lastHoverPos.y,
    x: mx,
    y: my,
    lastModeKey: lastHoverModeKey,
    modeKey,
    minDeltaPx: 0.75
  });

  if (!shouldRecompute) {
    return {
      shouldProcess: false,
      snap: null,
      tooltip: null,
      probe: null,
      newModeKey: modeKey
    };
  }

  let probe: { x: number; y: number; angleDeg: number; ok: boolean } | null = null;
  
  if (probeOn) {
    const idx = nearestPointIndex(projected, mx, my, 22);
    if (idx != null) {
      const angleDeg = estimateTaperAngleAtPoint(idx, edges, points);
      probe = {
        x: projected[idx].x,
        y: projected[idx].y,
        angleDeg,
        ok: angleDeg <= maxTaperDeg
      };
    }
  }

  return {
    shouldProcess: true,
    snap: null,
    tooltip: null,
    probe,
    newModeKey: modeKey
  };
}

// --- Nearest Point ---

export function nearestPoint(mx: number, my: number, projected: (Point3D & { z: number })[]): number | null {
  return nearestPointIndex(projected, mx, my, 22);
}

// --- Create Hints ---

export interface CreateHintsParams {
  toolCursor: ToolCursorMode;
  creatorPick: null | { kind: 'line'; slot: 'A' | 'B' } | { kind: 'surface'; slot: number };
  surfaceCreateKind: 'triangle' | 'quad' | 'contour';
  surfaceDraft: number[];
  datumPick: null | { target: 'csys3' | 'csysPointLine'; slot: 'origin' | 'x' | 'y' | 'line' };
}

export function getCreatorHint(params: CreateHintsParams): string {
  const { toolCursor, creatorPick } = params;
  
  if (toolCursor === 'line') return 'Line tool active: click Point A then Point B repeatedly to create chained lines.';
  if (toolCursor === 'surface') return 'Surface tool active: click points in order to create triangle/quad/contour surfaces.';
  if (toolCursor === 'curve') return 'Curve tool active: click points to append to the active curve.';
  if (toolCursor === 'insert') return 'Insert tool active: click a selected line to insert at cursor position.';
  if (!creatorPick) return 'Tip: click Pick to arm line/surface creation. Line creates at B. Triangle/Quad auto-create on final point.';
  if (creatorPick.kind === 'line') return `Pick Line ${creatorPick.slot}: click a viewport point (auto-advances to next slot).`;
  return `Pick Surface P${creatorPick.slot + 1}: click viewport points in order.`;
}

export function getSurfaceFlowHint(params: CreateHintsParams): string {
  const { surfaceCreateKind, surfaceDraft } = params;
  
  const required = surfaceCreateKind === 'triangle' ? 3 : surfaceCreateKind === 'quad' ? 4 : 3;
  
  if (surfaceCreateKind === 'contour') {
    if (surfaceDraft.length < 3) return `Contour: pick ${3 - surfaceDraft.length} more point(s), then Finish contour.`;
    return 'Contour: continue picking points, or click Finish contour now.';
  }
  
  if (surfaceDraft.length === 0) return `${surfaceCreateKind === 'triangle' ? 'Triangle' : 'Quad'}: pick point 1 of ${required}.`;
  if (surfaceDraft.length < required) return `Pick point ${surfaceDraft.length + 1} of ${required}.`;
  return 'Ready: next point creates the surface.';
}

export function getDatumPickHint(params: CreateHintsParams): string {
  const { datumPick } = params;
  
  if (!datumPick) return 'Use Pick buttons to select points/lines directly from the model.';
  if (datumPick.target === 'csys3') return `Pick CSYS 3-Points: ${datumPick.slot.toUpperCase()} from model.`;
  return datumPick.slot === 'line' ? 'Pick CSYS line from model.' : 'Pick CSYS origin point from model.';
}

// --- Loft Segments Rebuild ---

export interface RebuildLoftSegmentsParams {
  curves: Curve[];
  points: Point3D[];
  loftA: number | null;
  loftB: number | null;
}

export interface RebuildLoftSegmentsResult {
  error: string | null;
  segments: { a: Point3D; b: Point3D }[];
}

export function rebuildLoftSegments(params: RebuildLoftSegmentsParams): RebuildLoftSegmentsResult {
  const { curves, points, loftA, loftB } = params;
  const out = buildLoftSegments(curves, points, loftA, loftB);
  return {
    error: out.error,
    segments: out.segments
  };
}
