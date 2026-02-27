<script lang="ts">
import { onMount } from 'svelte';
import autoAnimate from '@formkit/auto-animate';
import SurfaceActionBar from './SurfaceActionBar.svelte';
import SurfaceRightRail from './SurfaceRightRail.svelte';
import SurfaceCanvas from './SurfaceCanvas.svelte';
import SurfaceModalsWrapper from './SurfaceModalsWrapper.svelte';
import SurfaceCommandPalette from './SurfaceCommandPalette.svelte';
import SurfaceIntegrityPanel from './SurfaceIntegrityPanel.svelte';
import { toast } from '../../ui/toast';
import { analyzeSurfaceIntegrity } from './SurfaceIntegrityAnalyzer';
import { computeDecimatedEdges, computeDecimatedPointIds, nearestEdgeHitProjected } from './SurfacePerformance';
import { SURFACE_MOTION_SPEC, linePickState, nextCreateModeState, nextSelectionModeState, surfacePickState, transitionToolCursor, centeredModalPos, draggedModalPos, dragOffsetFromPointer, registerContextMenu, buildSurfaceNavMenu, mountSurfaceGlobalHandlers, mountSurfaceViewportInteraction, readPersistedCoreMode, readPersistedRightRailCollapsed, readWorkspaceUiState, writeWorkspaceUiState, hasSeenCoreModePrompt, markCoreModePromptSeen, persistCoreMode, persistRightRailCollapsed, loadWorkspaceRecipes, saveWorkspaceRecipes, createSnapshot, materializeSnapshot, canHistoryRedo, canHistoryUndo, popHistoryRedo, popHistoryUndo, pushHistoryUndo, buildLoftSegments, projectPoint, viewportFitToScreen, applySelectionHits, hitsInRect, hitsInLasso, buildSliceSyncModel, buildSurfaceCsv, readSurfaceCsvFile, readSurfaceStepFile, triggerCsvDownload, triggerJsonDownload, buildCombinedSliceCsv, buildSliceMetadataSidecar, computeDatumPlaneSlices, toStatusFromIntersection, toStatusFromSliceWarnings, buildSlicingRuntimeWarning, dispatchWarningToasts, mergeWarningsUntracked, createRecipeRun, recipeStepLabel, advanceRecipeRunUntilPause, findRecipeForRun, beginRecipeTransaction, finalizeRecipeTransaction, rollbackRecipeTransaction, motionMs, findBestSnapCandidate, makeHoverModeKey, nearestPointIndex, shouldProcessHover, shouldRecomputeHover, snapCandidateSignature, createDatumCsys as createDatumCsysDep, createDatumPlane as createDatumPlaneDep, planeBasis, surfaceNormal, vecAdd, vecScale, vecUnit, diagnoseIntersectionResult, precheckIntersectionInputs, buildHoverTooltip, computeCurveOffsetBestEffort, cylKeepInliersController, cylRemoveOutliersController, cylSelectOutliersController, cylThresholdAbsController, deleteSelectedRecipeController, saveCurrentRecipeController, selectRecipeController, selectedRecipeController, snapshotRecipeConfigController, toggleSelectedRecipeStepController, applyRecipeConfigController, bilerp, clamp, deg, lerp3, vecNorm, vecSub, edgeExists, activeFitPointIds, calcOffsetIntersectionApi, computeCylinderAxisSegment, computeCylinderEvaluation, computePlaneEvaluation, computeSectionSliceEvaluation } from './SurfaceOrchestratorDeps';
import { cancelRecipeRunUi, runRecipeNextStepUi, runRecipeUntilPauseUi, startRecipeRunUi } from './controllers/SurfaceRecipeRunUiController';
import { computeCylinderFitUi, computeDatumSlicesUi, computeSectionSlicesUi, computeSurfaceEvalUi, emitStatusWarningsUi, exportDatumSliceCombinedUi } from './controllers/SurfaceEvaluationUiController';
import { depthOpacityUi, pickOrbitPivotUi, pointDepthOpacityUi, rotateForViewUi, surfaceDepthOpacityUi } from './controllers/SurfaceViewportMathController';
import type { DatumSliceMode, DatumSliceRunResult, SurfaceStatusWarning, RecipeRunState, SurfaceRecipe, SurfaceRecipeConfig, SurfaceRecipeStep, RecipeTransaction, ToolCursorMode, SnapCandidate, IntersectionDiagnostics, HoverTooltip, Curve, DatumCsys, DatumPlane, Edge, Point3D, SurfaceFace, Snapshot } from './SurfaceOrchestratorDeps';
import type { RendererMode, RendererTheme } from '$lib/surface/renderer/types';
import * as Logic from './SurfaceOrchestratorLogic.svelte';
let lastAction = $state<string>('init');
const setLastAction = (a: string) => { lastAction = a; }, SURFACE_ANALYTICS_ENABLED = false;
type SelectionMode = 'none' | 'box' | 'lasso'; type SelectionProfile = 'precision' | 'assisted';
let points = $state<Point3D[]>([{ x: 0, y: 0, z: 0 }, { x: 120, y: -10, z: 5 }, { x: 100, y: 110, z: -10 }, { x: -10, y: 90, z: 30 }]), edges = $state<Edge[]>([[0, 1], [1, 2], [2, 3], [3, 0]]), curves = $state<Curve[]>([]), surfaces = $state<SurfaceFace[]>([]);
let csys = $state<DatumCsys[]>([{ name: 'Global', origin: { x: 0, y: 0, z: 0 }, xAxis: { x: 1, y: 0, z: 0 }, yAxis: { x: 0, y: 1, z: 0 }, zAxis: { x: 0, y: 0, z: 1 } }]), planes = $state<DatumPlane[]>([]);
let activeEdgeIdx = $state<number | null>(0), activeCurveIdx = $state<number | null>(null), pendingPointIdx = $state<number | null>(null), loftA = $state<number | null>(null), loftB = $state<number | null>(null);
let loftErr = $state<string | null>(null), loftSegments = $state<{ a: Point3D; b: Point3D }[]>([]);
let samplerAppend = $state<boolean>(true), samplerMode = $state<'quad' | 'edges'>('quad'), samplerNu = $state<number>(12), samplerNv = $state<number>(12), samplerEdgeSegs = $state<number>(8), samplerErr = $state<string | null>(null);
let selectionMode = $state<SelectionMode>('none'), selectionProfile = $state<SelectionProfile>('precision'), toolCursor = $state<ToolCursorMode>('select'), selectedPointIds = $state<number[]>([]);
let selectedLineIds = $state<number[]>([]);
let selectedSet = $derived.by(() => new Set(selectedPointIds)), selectedLineSet = $derived.by(() => new Set(selectedLineIds)), pointBaseRadius = $derived(selectionProfile === 'assisted' ? 6 : 5), edgeHitWidth = $derived(selectionProfile === 'assisted' ? 12 : 9), pointPriorityPx = $derived(selectionProfile === 'assisted' ? 18 : 14);
let selectedEntityCount = $derived(selectedPointIds.length + selectedLineIds.length);
let selecting = $state(false), selStart = $state<{ x: number; y: number } | null>(null), selRect = $state<{ x0: number; y0: number; x1: number; y1: number } | null>(null), lasso = $state<{ x: number; y: number }[]>([]);
let snapEndpoints = $state(true), snapMidpoints = $state(false), snapCurveNearest = $state(false), snapSurfaceProjection = $state(false), snapThresholdPx = $state(16);
let activeSnap = $state<SnapCandidate | null>(null), hoverTooltip = $state<HoverTooltip | null>(null), hoverRaf = 0, hoverQueued = $state<{ x: number; y: number } | null>(null);
let lastHoverPos = $state<{ x: number; y: number }>({ x: Number.NaN, y: Number.NaN }), lastHoverModeKey = $state(''), lastSnapSig = $state('none');
let lastHoverProcessTs = 0;
let undoStack = $state<Snapshot[]>([]), redoStack = $state<Snapshot[]>([]), canUndo = $derived(canHistoryUndo({ undoStack, redoStack })), canRedo = $derived(canHistoryRedo({ undoStack, redoStack }));
let createPtX = $state(0), createPtY = $state(0), createPtZ = $state(0), createLineA = $state<number | null>(0), createLineB = $state<number | null>(1);
let surfaceDraft = $state<number[]>([]), surfaceCreateKind = $state<'triangle' | 'quad' | 'contour'>('quad'), createMode = $state<'idle' | 'point' | 'line' | 'surface'>('idle');
let creatorPick = $state<null | { kind: 'line'; slot: 'A' | 'B' } | { kind: 'surface'; slot: number }>(null), datumPick = $state<null | { target: 'csys3' | 'csysPointLine'; slot: 'origin' | 'x' | 'y' | 'line' }>(null), lineInsertPickMode = $state(false);
let selectedEntity = $state<null | { kind: 'point' | 'line' | 'surface' | 'plane' | 'csys'; index: number }>(null), settingsOpen = $state(false), coreMode = $state(true), advancedOpen = $state(false), rightRailCollapsed = $state(true);
let showCoreModePrompt = $state(false), datumsModalOpen = $state(false), createGeometryModalOpen = $state(false), surfaceCurveOpsModalOpen = $state(false), extrudeModalOpen = $state(false), healingModalOpen = $state(false);
let showPointEntities = $state(true), showLineEntities = $state(true), showSurfaceEntities = $state(true), showDatumEntities = $state(true), showSelectionLabels = $state(true);
let interpPct = $state(50), probeOn = $state(false), maxTaperDeg = $state(6), curveMode = $state(false), lineInsertT = $state(0.5);
let csysCreateMode = $state<'global' | 'three_points' | 'point_line' | 'copy'>('global'), csysOriginPoint = $state<number>(0), csysXPoint = $state<number>(1), csysYPoint = $state<number>(2), csysFromLine = $state<number>(0), csysCopyIdx = $state<number>(0);
let csysRelocateIdx = $state<number>(0), csysRelocatePointIdx = $state<number>(0);
let planeCreateMode = $state<'three_points' | 'point_normal' | 'offset_surface' | 'two_lines' | 'point_direction' | 'csys_principal'>('three_points'), planeP0 = $state<number>(0), planeP1 = $state<number>(1), planeP2 = $state<number>(2);
let planeNormalVec = $state<Point3D>({ x: 0, y: 0, z: 1 }), planeOffsetSurface = $state<number>(0), planeOffsetDist = $state<number>(0), planeLineA = $state<number>(0), planeLineB = $state<number>(1), planeDirPoint = $state<number>(0), planeDirVec = $state<Point3D>({ x: 0, y: 0, z: 1 });
let planeCsysIdx = $state<number>(0), planePrincipal = $state<'XY' | 'YZ' | 'ZX'>('XY'), datumsModalPos = $state({ x: 120, y: 120 }), datumsModalDragging = $state(false), datumsModalDragOffset = $state({ x: 0, y: 0 });
let offsetSurfaceIdx = $state<number>(0), offsetSurfaceDist = $state<number>(2), offsetCurveIdx = $state<number>(0), offsetCurveSurfaceIdx = $state<number>(0), offsetCurveDist = $state<number>(2), offsetCurveFlip = $state(false);
let offsetCurveStatus = $state<{ severity: 'info' | 'warning' | 'error' | null; method: 'geodesic' | 'surface_projected' | 'directional_3d' | null; message: string | null; }>({ severity: null, method: null, message: null });
let extrudeTarget = $state<'line' | 'curve'>('line'), extrudeLineIdx = $state<number>(0), extrudeCurveIdx = $state<number>(0), extrudeDirMode = $state<'vector' | 'curve' | 'surfaceNormal'>('vector'), extrudeVector = $state<Point3D>({ x: 0, y: 0, z: 1 }), extrudeSurfaceIdx = $state<number>(0), extrudeFlip = $state(false), extrudeDistance = $state<number>(20);
let healTol = $state<number>(0.5), actionsBarEl = $state<HTMLElement | null>(null), datumsModalPanelEl = $state<HTMLElement | null>(null), createGeomModalPanelEl = $state<HTMLElement | null>(null), surfCurveModalPanelEl = $state<HTMLElement | null>(null), healingModalPanelEl = $state<HTMLElement | null>(null);
let selEdgeA = $state<number | null>(0), selEdgeB = $state<number | null>(1), offsetDist = $state(5), refPointIdx = $state<number>(0), intersection = $state<{ p: Point3D; skew: number } | null>(null), intersectionBusy = $state(false);
let intersectionDiagnostics = $state<IntersectionDiagnostics>({ severity: null, message: null, angleDeg: null, skew: null, recommendations: [] });
let svgEl = $state<SVGSVGElement | null>(null), viewportEl = $state<HTMLDivElement | null>(null), vpMenuOpen = $state(false), vpMenuX = $state(0), vpMenuY = $state(0), w = $state(900), h = $state(600);
let contextTargetKind = $state<'point' | 'line' | 'empty'>('empty'), contextTargetIndex = $state<number | null>(null);
let isolatedPointIds = $state<Set<number> | null>(null), isolatedLineIds = $state<Set<number> | null>(null), contextConnectSourcePointIdx = $state<number | null>(null);
let rot = $state({ alpha: -0.65, beta: 0.35 }), zoomK = $state(1), pan = $state({ x: 0, y: 0 }), rotateAnchor = $state<{ mx: number; my: number; pivot: Point3D } | null>(null);
let probeBoltDia = $state(0.25), probe = $state<{ x: number; y: number; angleDeg: number; ok: boolean } | null>(null);
let evalBusy = $state(false), evalErr = $state<string | null>(null), evalTol = $state(0), evalSigmaMult = $state(3), evalMaxOutliers = $state(50), heatmapOn = $state(false), evalUseSelection = $state(true);
let evalRes = $state<{ centroid: Point3D; normal: Point3D; rms: number; meanAbs: number; maxAbs: number; p95Abs: number; sigma: number; signedDistances: number[]; outlierIndices: number[]; } | null>(null);
let outlierSet = $derived.by(() => new Set(evalRes?.outlierIndices ?? [])), heatScale = $derived.by(() => { const dev = evalRes?.signedDistances; if (!dev?.length) return 1; let mx = 0; for (const d of dev) if (Math.abs(d) > mx) mx = Math.abs(d); return mx || 1; });
let sliceAxis = $state<'x' | 'y' | 'z'>('x'), sliceBins = $state(5), sliceThickness = $state(20), sliceMetric = $state<'p95' | 'rms'>('p95'), sliceBusy = $state(false), sliceRes = $state<any>(null), sliceErr = $state<string | null>(null);
let datumSliceMode = $state<DatumSliceMode>('equidistant'), datumSliceSpacing = $state(10), datumSliceCount = $state(5), datumSlicePlaneIdx = $state<number>(0), datumSliceBusy = $state(false), datumSliceRes = $state<DatumSliceRunResult | null>(null), datumSliceErr = $state<string | null>(null);
let datumSliceThickness = $state(0), datumSliceUseSelection = $state(false), selectedSliceId = $state<number | null>(null), includeOptionalSliceColumns = $state(false), sliceSyncModel = $derived.by(() => buildSliceSyncModel(datumSliceRes, selectedSliceId));
let cylBusy = $state(false), cylErr = $state<string | null>(null), cylRes = $state<any>(null), cylShowAxis = $state(true), cylRefineK = $state(2), cylFitPointIds = $state<number[]>([]), cylOutlierSet = $derived.by(() => new Set<number>(cylRes?.outlierIds ?? [])), cylUseSelection = $state(true);
let recipes = $state<SurfaceRecipe[]>([]), selectedRecipeId = $state<string | null>(null), recipeRun = $state<RecipeRunState | null>(null), recipeTx = $state<RecipeTransaction | null>(null), recipeNameDraft = $state(''), recipeStepConfirmed = $state(true);
let statusWarnings = $state<SurfaceStatusWarning[]>([]), emittedWarningIds = $state<Set<string>>(new Set()), fileNotice = $state<string | null>(null), createPrereqNotice = $state<string | null>(null), topCreateHint = $state<string>('');
let minPointsFor = $state<{ line: number; surface: number }>({ line: 2, surface: 3 });
let rendererMode = $state<RendererMode>('svg'), rendererTheme = $state<RendererTheme>('technical');
let commandPaletteOpen = $state(false);
let performanceMode = $state(false), perfPointBudget = $state(9000), perfEdgeBudget = $state(14000);
let frameMsAvg = $state(0), hitTestMsAvg = $state(0), workerAvailable = $state(false);
let hoverSource = $state<'idle' | 'worker' | 'fallback'>('idle'), workerTimeoutCount = $state(0), autoDegradeLevel = $state(0);
let integrityThreshold = $state(4);
type DeletePreview = {
  pointIds: number[];
  lineIds: number[];
  cascadeLineIds: number[];
  totalLineDeletes: number;
  afterPoints: number;
  afterLines: number;
};
let deletePreviewOpen = $state(false), deletePreview = $state<DeletePreview | null>(null);
let integrityReport = $derived(analyzeSurfaceIntegrity(points, edges, integrityThreshold));
let hoverThrottleMs = $derived.by(() => {
  if (!performanceMode) return 8;
  if (points.length > 80_000) return 28;
  if (points.length > 40_000) return 20;
  if (points.length > 20_000) return 14;
  return 10;
});
let rendererThemeClass = $derived(
  rendererTheme === 'studio'
    ? 'surface-theme-studio'
    : rendererTheme === 'high-contrast'
      ? 'surface-theme-high-contrast'
      : rendererTheme === 'aurora'
        ? 'surface-theme-aurora'
      : 'surface-theme-technical'
);
let projected = $derived.by(() => points.map((p, i) => ({ ...p, ...projectPoint(p, rot, zoomK, w, h, pan), idx: i })));
let surfaceScreenCenters = $derived.by(() => surfaces.map((sf: SurfaceFace) => { const pts = sf.vertexIds.map((i: number) => projected[i]!); return { cx: pts.reduce((s: number, p) => s + p.x, 0) / pts.length, cy: pts.reduce((s: number, p) => s + p.y, 0) / pts.length, cz: pts.reduce((s: number, p) => s + p.z, 0) / pts.length }; }));
let surfaceWorldCenters = $derived.by(() => surfaces.map((sf: SurfaceFace) => { const pts = sf.vertexIds.map((i: number) => points[i]!); return { x: pts.reduce((s: number, p) => s + p.x, 0) / pts.length, y: pts.reduce((s: number, p) => s + p.y, 0) / pts.length, z: pts.reduce((s: number, p) => s + p.z, 0) / pts.length }; }));
let sortedEdges = $derived.by(() => { const proj = projected; return edges.map((e, i) => ({ i, a: e[0], b: e[1], z: (proj[e[0]]!.z + proj[e[1]]!.z) / 2 })).sort((a, b) => a.z - b.z); });
let renderPointIds = $derived.by(() => {
  return computeDecimatedPointIds({
    totalPoints: points.length,
    budget: performanceMode ? perfPointBudget : points.length,
    selectedPointIds,
    pendingPointIdx
  });
});
let renderedEdges = $derived.by(() => {
  return computeDecimatedEdges({
    sortedEdges,
    budget: performanceMode ? perfEdgeBudget : sortedEdges.length,
    selectedLineIds,
    activeEdgeIdx
  });
});
let sortedSurfaces = $derived.by(() => { const centers = surfaceScreenCenters; return surfaces.map((sf: SurfaceFace, i: number) => ({ i, pts: sf.vertexIds, z: centers[i]!.cz, name: sf.name ?? `Surface ${i}` })).sort((a, b) => a.z - b.z); });
let datumPlanePatches = $derived.by(() => planes.map((p: DatumPlane, i: number) => { const xDirVal = p.xDir ?? { x: 1, y: 0, z: 0 }; const { normal } = p; const yDir = vecUnit(vecSub(vecScale(xDirVal, 0), vecScale(normal, 0))); const pts = [vecAdd(p.origin, vecAdd(vecScale(xDirVal, -50), vecScale(yDir, -50))), vecAdd(p.origin, vecAdd(vecScale(xDirVal, 50), vecScale(yDir, -50))), vecAdd(p.origin, vecAdd(vecScale(xDirVal, 50), vecScale(yDir, 50))), vecAdd(p.origin, vecAdd(vecScale(xDirVal, -50), vecScale(yDir, 50)))]; return { i, name: p.name, pts: pts.map((pt: Point3D) => projectPoint(pt, rot, zoomK, w, h, pan)) }; }));
let datumAxisSegments = $derived.by(() => {
  const result: { i: number; csysIdx: number; axis: 'X' | 'Y' | 'Z'; a: Point3D; b: Point3D }[] = [];
  const normalizedAxisLength = 30 / Math.max(0.25, zoomK);
  csys.forEach((cs: DatumCsys, idx: number) => {
    const endX = vecAdd(cs.origin, vecScale(cs.xAxis, normalizedAxisLength));
    const endY = vecAdd(cs.origin, vecScale(cs.yAxis, normalizedAxisLength));
    const endZ = vecAdd(cs.origin, vecScale(cs.zAxis, normalizedAxisLength));
    const origin = projectPoint(cs.origin, rot, zoomK, w, h, pan);
    result.push({ i: result.length, csysIdx: idx, axis: 'X', a: origin, b: projectPoint(endX, rot, zoomK, w, h, pan) });
    result.push({ i: result.length, csysIdx: idx, axis: 'Y', a: origin, b: projectPoint(endY, rot, zoomK, w, h, pan) });
    result.push({ i: result.length, csysIdx: idx, axis: 'Z', a: origin, b: projectPoint(endZ, rot, zoomK, w, h, pan) });
  });
  return result;
});
let zRange = $derived.by(() => { const zs = projected.map((p: Point3D & { z: number }) => p.z); return zs.length ? { min: Math.min(...zs), max: Math.max(...zs) } : { min: 0, max: 1 }; });
let cylAxisSeg = $derived.by(() => cylRes && cylShowAxis ? computeCylinderAxisSegment(points, cylRes, cylShowAxis) : null);
let interpPoint = $derived.by(() => activeEdgeIdx !== null && edges[activeEdgeIdx] ? lerp3(points[edges[activeEdgeIdx]![0]]!, points[edges[activeEdgeIdx]![1]]!, interpPct / 100) : null);
let selectedBadge = $derived.by(() => {
  const entity = selectedEntity;
  if (!entity) return null;

  let label = '';
  if (entity.kind === 'point') label = `Point ${entity.index}`;
  else if (entity.kind === 'line') label = `Line ${entity.index}`;
  else if (entity.kind === 'surface') label = `Surface ${entity.index}`;
  else if (entity.kind === 'plane') label = planes[entity.index]?.name ?? `Plane ${entity.index}`;
  else if (entity.kind === 'csys') label = csys[entity.index]?.name ?? `Csys ${entity.index}`;
  if (!label) return null;

  let worldPos: Point3D = { x: 0, y: 0, z: 0 };
  if (entity.kind === 'point') {
    const point = points[entity.index];
    if (!point) return null;
    worldPos = point;
  } else if (entity.kind === 'line') {
    const edge = edges[entity.index];
    if (!edge || !points[edge[0]] || !points[edge[1]]) return null;
    worldPos = lerp3(points[edge[0]]!, points[edge[1]]!, 0.5);
  }

  const screenPos = projectPoint(worldPos, rot, zoomK, w, h, pan);
  return { x: screenPos.x, y: screenPos.y, label };
});
let creatorHint = $derived.by(() => Logic.getCreatorHint({ toolCursor, creatorPick, surfaceCreateKind, surfaceDraft, datumPick }));
let surfaceDraftRequired = $derived(surfaceCreateKind === 'triangle' ? 3 : surfaceCreateKind === 'quad' ? 4 : 3);
let surfaceDraftRemaining = $derived(Math.max(0, surfaceDraftRequired - surfaceDraft.length));
let surfaceFlowHint = $derived.by(() => Logic.getSurfaceFlowHint({ toolCursor, creatorPick, surfaceCreateKind, surfaceDraft, datumPick }));
let datumPickHint = $derived.by(() => Logic.getDatumPickHint({ toolCursor, creatorPick, surfaceCreateKind, surfaceDraft, datumPick }));
let datumPlaneChoices = $derived.by(() => planes.length > 0 ? planes : [{ name: 'Global XY', origin: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 0, z: 1 }, xDir: { x: 1, y: 0, z: 0 }, source: 'default' }]);
let canDeleteSelection = $derived(selectedPointIds.length > 0 || selectedLineIds.length > 0 || (selectedEntity?.kind === 'line' && !!edges[selectedEntity.index]));
const snap = (): Snapshot => createSnapshot(points, edges, curves, surfaces, csys, planes, activeEdgeIdx);
const pushUndo = () => { const stacks = pushHistoryUndo({ undoStack, redoStack }, snap()); undoStack = stacks.undoStack; redoStack = stacks.redoStack; };
const applySnap = (s: Snapshot) => { const m = materializeSnapshot(s); points = m.points; edges = m.edges; curves = m.curves; surfaces = m.surfaces; csys = m.csys; planes = m.planes; activeEdgeIdx = m.activeEdgeIdx; };
const undo = () => { const res = popHistoryUndo({ undoStack, redoStack }, snap()); if (!res.snapshot) return; undoStack = res.stacks.undoStack; redoStack = res.stacks.redoStack; applySnap(res.snapshot); };
const redo = () => { const res = popHistoryRedo({ undoStack, redoStack }, snap()); if (!res.snapshot) return; undoStack = res.stacks.undoStack; redoStack = res.stacks.redoStack; applySnap(res.snapshot); };
const clearSelection = () => {
  selectedPointIds = [];
  selectedLineIds = [];
};
const invertSelection = () => {
  selectedPointIds = Logic.invertSelection(points, selectedPointIds);
  const current = new Set(selectedLineIds);
  const next: number[] = [];
  for (let i = 0; i < edges.length; i++) {
    if (!current.has(i)) next.push(i);
  }
  selectedLineIds = next;
};
let hitWorker: Worker | null = null;
let workerReqId = 1;
const workerPending = new Map<number, (payload: any) => void>();
const runHitTest = <T>(producer: (reqId: number) => void, fallback: () => T): Promise<T> => {
  if (!performanceMode || !workerAvailable || !hitWorker) {
    hoverSource = 'fallback';
    return Promise.resolve(fallback());
  }
  const reqId = workerReqId++;
  const started = performance.now();
  return new Promise<T>((resolve) => {
    workerPending.set(reqId, (payload: T) => {
      const elapsed = performance.now() - started;
      hitTestMsAvg = hitTestMsAvg ? hitTestMsAvg * 0.82 + elapsed * 0.18 : elapsed;
      hoverSource = 'worker';
      workerTimeoutCount = 0;
      resolve(payload);
    });
    producer(reqId);
    setTimeout(() => {
      if (!workerPending.has(reqId)) return;
      workerPending.delete(reqId);
      workerTimeoutCount += 1;
      hoverSource = 'fallback';
      if (workerTimeoutCount >= 3) workerAvailable = false;
      resolve(fallback());
    }, 50);
  });
};
const requestNearestPoint = async (x: number, y: number, radius: number) => runHitTest<number | null>(
  (reqId) => hitWorker?.postMessage({ type: 'nearest', reqId, x, y, radius }),
  () => nearestPointIndex(projected, x, y, radius)
);
const requestNearestEdge = async (x: number, y: number, radius: number) => runHitTest<{ edgeIdx: number; t: number; d: number } | null>(
  (reqId) => hitWorker?.postMessage({ type: 'nearestEdge', reqId, x, y, radius }),
  () => nearestEdgeHit(x, y)
);
const requestRectHits = async (x0: number, y0: number, x1: number, y1: number) => runHitTest<number[]>(
  (reqId) => hitWorker?.postMessage({ type: 'rect', reqId, x0, y0, x1, y1 }),
  () => hitsInRect(projected, { x0, y0, x1, y1 })
);
const requestLassoHits = async (shape: { x: number; y: number }[]) => runHitTest<number[]>(
  (reqId) => hitWorker?.postMessage({ type: 'lasso', reqId, lasso: shape }),
  () => hitsInLasso(projected, shape)
);
const clearIsolation = () => {
  isolatedPointIds = null;
  isolatedLineIds = null;
};
const openViewportMenu = async (e: MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  const rect = viewportEl?.getBoundingClientRect();
  const x = rect ? e.clientX - rect.left : e.clientX;
  const y = rect ? e.clientY - rect.top : e.clientY;
  const pointHitIdx = await requestNearestPoint(x, y, pointPriorityPx);
  const edgeHit = await requestNearestEdge(x, y, edgeHitWidth + 8);
  if (pointHitIdx !== null && projected[pointHitIdx] && Math.hypot(projected[pointHitIdx]!.x - x, projected[pointHitIdx]!.y - y) <= pointPriorityPx) {
    contextTargetKind = 'point';
    contextTargetIndex = pointHitIdx;
  } else if (edgeHit && edgeHit.d <= edgeHitWidth + 8) {
    contextTargetKind = 'line';
    contextTargetIndex = edgeHit.edgeIdx;
  } else {
    contextTargetKind = 'empty';
    contextTargetIndex = null;
  }
  vpMenuOpen = true;
  vpMenuX = x;
  vpMenuY = y;
};
const closeViewportMenu = () => {
  vpMenuOpen = false;
  contextTargetKind = 'empty';
  contextTargetIndex = null;
};
const connectFromPointContext = (idx: number) => {
  if (!points[idx]) return;
  contextConnectSourcePointIdx = idx;
  pendingPointIdx = idx;
  toast.info(`Select target point to connect from P${idx + 1}`);
};
const connectToPointContext = (idx: number) => {
  if (!points[idx]) return;
  if (contextConnectSourcePointIdx === null) {
    contextConnectSourcePointIdx = idx;
    pendingPointIdx = idx;
    toast.info(`Source set to P${idx + 1}; choose destination point`);
    return;
  }
  if (contextConnectSourcePointIdx === idx) {
    toast.warning('Choose a different destination point');
    return;
  }
  connectPointsByIndex(contextConnectSourcePointIdx, idx);
  contextConnectSourcePointIdx = null;
  pendingPointIdx = null;
};
const isolateFromPointContext = (idx: number) => {
  if (!points[idx]) return;
  const lineIds = new Set<number>();
  const pointIds = new Set<number>([idx]);
  edges.forEach((edge, edgeIdx) => {
    if (edge[0] === idx || edge[1] === idx) {
      lineIds.add(edgeIdx);
      pointIds.add(edge[0]);
      pointIds.add(edge[1]);
    }
  });
  isolatedLineIds = lineIds;
  isolatedPointIds = pointIds;
};
const isolateFromLineContext = (idx: number) => {
  const edge = edges[idx];
  if (!edge) return;
  const [a, b] = edge;
  const lineIds = new Set<number>();
  const pointIds = new Set<number>([a, b]);
  edges.forEach((candidate, edgeIdx) => {
    if (candidate[0] === a || candidate[1] === a || candidate[0] === b || candidate[1] === b) {
      lineIds.add(edgeIdx);
      pointIds.add(candidate[0]);
      pointIds.add(candidate[1]);
    }
  });
  isolatedLineIds = lineIds;
  isolatedPointIds = pointIds;
};
const resetView = () => { rot = { alpha: -0.65, beta: 0.35 }; zoomK = 1; pan = { x: 0, y: 0 }; };
const fitToScreen = () => { const fitted = viewportFitToScreen(points, rot, w, h); if (!fitted) return; zoomK = fitted.zoomK; pan = fitted.pan; };
const panBy = (dx: number, dy: number) => { pan = { x: pan.x + dx, y: pan.y + dy }; };
const rotateBy = (dx: number, dy: number) => { rot = { alpha: rot.alpha + dx * 0.12, beta: rot.beta + dy * 0.12 }; };
const zoomBy = (factor: number) => {
  const next = clamp(zoomK * factor, 0.15, 12);
  zoomK = Number.isFinite(next) ? next : zoomK;
};
const svgCoordsFromEvent = (ev: PointerEvent | MouseEvent) => Logic.svgCoordsFromEvent(ev, svgEl);
const applySelectionFromHits = (hits: number[], ev: PointerEvent | MouseEvent) => { selectedPointIds = Logic.applySelectionFromHits(hits, selectedPointIds, { shiftKey: ev.shiftKey, altKey: ev.altKey }); };
const exportCSV = () => { const csv = buildSurfaceCsv(points, edges); triggerCsvDownload(csv, 'surface-data.csv'); };
const exportSTEP = () => { toast.info('STEP export not yet implemented'); };
const createPoint = () => { pushUndo(); points = [...points, { x: createPtX, y: createPtY, z: createPtZ }]; toast.success(`Created point ${points.length - 1}`); };
const addPointsBatch = (batch: Point3D[]) => {
  if (!batch.length) return;
  pushUndo();
  points = [...points, ...batch];
  const lastPoint = batch[batch.length - 1]!;
  createPtX = lastPoint.x;
  createPtY = lastPoint.y;
  createPtZ = lastPoint.z;
  toast.success(`Added ${batch.length} point${batch.length === 1 ? '' : 's'}`);
};
const generateSamplerPoints = async () => { setLastAction('samplerGenerate'); const result = Logic.generateSamplerPoints({ points, samplerMode, samplerNu, samplerNv, samplerEdgeSegs, samplerAppend }); samplerErr = result.error; if (!result.success || !result.newPoints) return; pushUndo(); if (samplerAppend) points = [...points, ...result.newPoints]; else { points = result.newPoints; edges = []; curves = []; surfaces = []; planes = []; csys = [csys[0]]; activeCurveIdx = null; loftA = null; loftB = null; loftSegments = []; activeEdgeIdx = null; pendingPointIdx = null; selectedPointIds = []; selectedLineIds = []; } };
const setSelectionMode = (m: SelectionMode) => { const next = nextSelectionModeState({ nextMode: m, curveMode, createMode, pendingPointIdx }); selectionMode = next.selectionMode; curveMode = next.curveMode; createMode = next.createMode; pendingPointIdx = next.pendingPointIdx; if (m !== 'none') toolCursor = 'select'; }, setCreateMode = (m: 'idle' | 'point' | 'line' | 'surface') => { const next = nextCreateModeState({ nextMode: m, selectionMode, curveMode, pendingPointIdx, creatorPick, surfaceDraft }); createMode = next.createMode; selectionMode = next.selectionMode; curveMode = next.curveMode; pendingPointIdx = next.pendingPointIdx; creatorPick = next.creatorPick; surfaceDraft = next.surfaceDraft; if (m === 'line') toolCursor = 'line'; else if (m === 'surface') toolCursor = 'surface'; else if (toolCursor === 'line' || toolCursor === 'surface') toolCursor = 'select'; }, requirePointPrereq = (m: string) => { if (points.length < 2) { toast.warning(`Need at least 2 points for ${m} mode`); return false; } return true; }, beginLinePick = (slot: 'A' | 'B') => { if (!requirePointPrereq('line')) return; if (slot === 'A') { setToolCursor('line'); return; } const next = linePickState(slot); createMode = next.createMode; selectionMode = next.selectionMode; curveMode = next.curveMode; pendingPointIdx = next.pendingPointIdx; creatorPick = next.creatorPick; surfaceDraft = []; }, beginSurfacePick = (slot: number) => { if (!requirePointPrereq('surface')) return; if (slot === 0) { setToolCursor('surface'); return; } const next = surfacePickState(slot); createMode = next.createMode; selectionMode = next.selectionMode; curveMode = next.curveMode; pendingPointIdx = next.pendingPointIdx; creatorPick = next.creatorPick; }, setToolCursor = (mode: ToolCursorMode) => { if (mode === 'line' && !requirePointPrereq('line')) mode = 'select'; if (mode === 'surface' && !requirePointPrereq('surface')) mode = 'select'; const next = transitionToolCursor({ mode, surfaceDraft }); toolCursor = next.toolCursor; selectionMode = next.selectionMode; createMode = next.createMode; curveMode = next.curveMode; lineInsertPickMode = next.lineInsertPickMode; creatorPick = next.creatorPick; pendingPointIdx = next.pendingPointIdx; surfaceDraft = next.surfaceDraft; };
const openDatumsModal = () => { datumsModalOpen = true; const ww = typeof window !== 'undefined' ? window.innerWidth : 1200, wh = typeof window !== 'undefined' ? window.innerHeight : 800; if (!datumsModalDragging) datumsModalPos = centeredModalPos({ windowWidth: ww, windowHeight: wh, panelWidth: 760, panelHeight: 440, margin: 20 }); }, startDatumsModalDrag = (ev: PointerEvent) => { ev.stopPropagation(); datumsModalDragging = true; datumsModalDragOffset = dragOffsetFromPointer(ev.clientX, ev.clientY, datumsModalPos); const onMove = (e: PointerEvent) => { if (!datumsModalDragging) return; datumsModalPos = draggedModalPos(e.clientX, e.clientY, datumsModalDragOffset, 12); }, onUp = () => { datumsModalDragging = false; document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp); }; document.addEventListener('pointermove', onMove); document.addEventListener('pointerup', onUp); };
const onSvgPointerDown = async (ev: PointerEvent) => {
  if (toolCursor !== 'select') return;
  const coords = svgCoordsFromEvent(ev);
  if (!coords) return;
  const hitRadius = pointPriorityPx / 2;
  const nearest = await requestNearestPoint(coords.x, coords.y, hitRadius);
  if (nearest !== null) {
    applySelectionFromHits([nearest], ev);
    return;
  }
  selecting = true;
  selStart = coords;
  selRect = null;
  lasso = [];
};
const onSvgPointerMove = (ev: PointerEvent) => {
  const coords = svgCoordsFromEvent(ev);
  if (!coords) return;
  if (selecting && selStart) {
    if (selectionMode === 'box') selRect = { x0: Math.min(selStart.x, coords.x), y0: Math.min(selStart.y, coords.y), x1: Math.max(selStart.x, coords.x), y1: Math.max(selStart.y, coords.y) };
    else if (selectionMode === 'lasso') {
      const next = [...lasso, coords];
      lasso = next.length > 3000 ? next.filter((_, idx) => idx % 2 === 0) : next;
    }
    return;
  }
  // Do not run hover sampling while dragging to keep geometry updates in lockstep.
  if ((ev.buttons & 1) === 1 && selectionMode === 'none') return;
  const now = performance.now();
  if (now - lastHoverProcessTs < hoverThrottleMs) return;
  lastHoverProcessTs = now;
  hoverQueued = coords;
  if (hoverRaf) return;
  hoverRaf = requestAnimationFrame(async () => {
    hoverRaf = 0;
    const queued = hoverQueued;
    if (!queued) return;
    const nearest = await requestNearestPoint(queued.x, queued.y, snapThresholdPx);
    if (nearest === null || !projected[nearest]) {
      activeSnap = null;
      hoverTooltip = null;
      return;
    }
    activeSnap = {
      kind: 'endpoint',
      distancePx: Math.hypot(projected[nearest]!.x - queued.x, projected[nearest]!.y - queued.y),
      screen: { x: projected[nearest]!.x, y: projected[nearest]!.y },
      world: points[nearest]!,
      pointIdx: nearest
    };
    hoverTooltip = {
      x: queued.x,
      y: queued.y,
      title: `P${nearest + 1}`,
      lines: [`(${points[nearest]!.x}, ${points[nearest]!.y}, ${points[nearest]!.z})`]
    };
  });
};
const onSvgPointerUp = async (ev: PointerEvent) => {
  if (!selecting) return;
  selecting = false;
  if (selectionMode === 'box' && selRect) {
    const ids = await requestRectHits(selRect.x0, selRect.y0, selRect.x1, selRect.y1);
    applySelectionFromHits(ids, ev);
  } else if (selectionMode === 'lasso' && lasso.length) {
    const ids = await requestLassoHits(lasso);
    applySelectionFromHits(ids, ev);
  }
  selStart = null;
  selRect = null;
  lasso = [];
};
const updateProbeFromEvent = async (ev: MouseEvent) => {
  if (!probeOn) return;
  const coords = svgCoordsFromEvent(ev);
  if (!coords) return;
  const nearest = await requestNearestPoint(coords.x, coords.y, 22);
  if (nearest === null) return;
  const angle = Logic.estimateTaperAngleAtPoint(nearest, edges, points);
  probe = { x: coords.x, y: coords.y, angleDeg: angle, ok: angle <= maxTaperDeg };
};
const handleLoadedFile = async (file: File) => {
  fileNotice = `Loading ${file.name}...`;
  try {
    let loaded: { points: Point3D[]; edges: Edge[] };
    if (file.name.endsWith('.csv')) loaded = await readSurfaceCsvFile(file);
    else if (file.name.endsWith('.step') || file.name.endsWith('.stp')) loaded = await readSurfaceStepFile(file);
    else throw new Error('Unsupported file type');
    pushUndo();
    points = loaded.points;
    edges = loaded.edges ?? [];
    fileNotice = `Loaded ${points.length} points`;
    setTimeout(() => { fileNotice = null; }, 3000);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    fileNotice = `Error: ${errMsg}`;
    setTimeout(() => { fileNotice = null; }, 5000);
  }
};
const createLine = () => {
  if (createLineA === null || createLineB === null) return;
  const result = Logic.createLineFromPair({ aRaw: createLineA, bRaw: createLineB, points, edges });
  if (!result.success || result.newEdgeIdx === null) {
    toast.error('Failed to create line');
    return;
  }
  pushUndo();
  edges = [...edges, [createLineA, createLineB] as Edge];
  clearIsolation();
  toast.success('Created line');
};
const connectPointsByIndex = (a: number, b: number) => {
  createLineA = a;
  createLineB = b;
  createLine();
};
const selectedLineIdsForDelete = () => {
  const ids = new Set<number>(selectedLineIds.filter((idx) => !!edges[idx]));
  if (selectedEntity?.kind === 'line' && edges[selectedEntity.index]) ids.add(selectedEntity.index);
  return [...ids].sort((a, b) => a - b);
};
const buildDeletePreview = (): DeletePreview | null => {
  const pointIds = [...new Set(selectedPointIds)].filter((idx) => idx >= 0 && idx < points.length).sort((a, b) => a - b);
  const lineIds = selectedLineIdsForDelete().filter((idx) => idx >= 0 && idx < edges.length).sort((a, b) => a - b);
  if (!pointIds.length && !lineIds.length) return null;
  const pointSet = new Set(pointIds);
  const cascadeLineIds = edges
    .map((edge, edgeIdx) => (pointSet.has(edge[0]) || pointSet.has(edge[1]) ? edgeIdx : null))
    .filter((idx): idx is number => idx !== null);
  const totalLineDeletes = new Set([...lineIds, ...cascadeLineIds]).size;
  return {
    pointIds,
    lineIds,
    cascadeLineIds,
    totalLineDeletes,
    afterPoints: Math.max(0, points.length - pointIds.length),
    afterLines: Math.max(0, edges.length - totalLineDeletes)
  };
};
const openDeletePreviewFromSelection = () => {
  const preview = buildDeletePreview();
  if (!preview) {
    toast.info('No selected points or lines to delete');
    return;
  }
  deletePreview = preview;
  deletePreviewOpen = true;
};
const applyDeletePreview = () => {
  if (!deletePreview) return;
  pushUndo();
  let nextPoints = [...points];
  let nextEdges = [...edges];
  let nextCurves = [...curves];
  let nextSurfaces = [...surfaces];

  const selectedLineIdsDesc = [...deletePreview.lineIds].sort((a, b) => b - a);
  for (const lineIdx of selectedLineIdsDesc) {
    if (!nextEdges[lineIdx]) continue;
    nextEdges = nextEdges.filter((_, i) => i !== lineIdx);
  }

  const selectedPointIdsDesc = [...deletePreview.pointIds].sort((a, b) => b - a);
  for (const pointIdx of selectedPointIdsDesc) {
    if (!nextPoints[pointIdx]) continue;
    const result = Logic.deletePoint({
      idx: pointIdx,
      points: nextPoints,
      edges: nextEdges,
      curves: nextCurves,
      surfaces: nextSurfaces
    });
    nextPoints = result.points;
    nextEdges = result.edges;
    nextCurves = result.curves;
    nextSurfaces = result.surfaces;
  }

  points = nextPoints;
  edges = nextEdges;
  curves = nextCurves;
  surfaces = nextSurfaces;

  selectedPointIds = [];
  selectedLineIds = [];
  pendingPointIdx = null;
  selectedEntity = null;
  contextConnectSourcePointIdx = null;
  activeEdgeIdx = nextEdges.length ? Math.min(activeEdgeIdx ?? 0, nextEdges.length - 1) : null;
  activeCurveIdx = nextCurves.length ? Math.min(activeCurveIdx ?? 0, nextCurves.length - 1) : null;
  loftA = loftA !== null && nextCurves[loftA] ? loftA : null;
  loftB = loftB !== null && nextCurves[loftB] ? loftB : null;
  clearIsolation();
  intersection = null;
  deletePreviewOpen = false;
  deletePreview = null;
  toast.success('Deleted selected geometry');
};
const closeDeletePreview = () => {
  deletePreviewOpen = false;
  deletePreview = null;
};
const applyEdgeDeletionSet = (deleteSet: Set<number>) => {
  if (!deleteSet.size) return;
  const oldEdges = edges;
  const remap: number[] = new Array(oldEdges.length).fill(-1);
  let nextIdx = 0;
  for (let i = 0; i < oldEdges.length; i++) {
    if (!deleteSet.has(i)) {
      remap[i] = nextIdx;
      nextIdx += 1;
    }
  }
  edges = oldEdges.filter((_, i) => !deleteSet.has(i));
  const remapEdgeIndex = (value: number | null): number | null => {
    if (value === null) return null;
    const mapped = remap[value];
    return mapped >= 0 ? mapped : null;
  };

  activeEdgeIdx = remapEdgeIndex(activeEdgeIdx);
  selectedLineIds = selectedLineIds.map((idx) => remapEdgeIndex(idx)).filter((idx): idx is number => idx !== null);
  selEdgeA = remapEdgeIndex(selEdgeA);
  selEdgeB = remapEdgeIndex(selEdgeB);
  planeLineA = remapEdgeIndex(planeLineA) ?? 0;
  planeLineB = remapEdgeIndex(planeLineB) ?? 0;
  csysFromLine = remapEdgeIndex(csysFromLine) ?? 0;
  if (selectedEntity?.kind === 'line') {
    const mapped = remapEdgeIndex(selectedEntity.index);
    selectedEntity = mapped === null ? null : { kind: 'line', index: mapped };
  }
};
const removeOrphanPoints = () => {
  const orphanIds = [...integrityReport.orphanPointIds].sort((a, b) => b - a);
  if (!orphanIds.length) {
    toast.info('No orphan points detected');
    return;
  }
  pushUndo();
  let nextPoints = [...points];
  let nextEdges = [...edges];
  let nextCurves = [...curves];
  let nextSurfaces = [...surfaces];
  for (const pointIdx of orphanIds) {
    if (!nextPoints[pointIdx]) continue;
    const result = Logic.deletePoint({
      idx: pointIdx,
      points: nextPoints,
      edges: nextEdges,
      curves: nextCurves,
      surfaces: nextSurfaces
    });
    nextPoints = result.points;
    nextEdges = result.edges;
    nextCurves = result.curves;
    nextSurfaces = result.surfaces;
  }
  points = nextPoints;
  edges = nextEdges;
  curves = nextCurves;
  surfaces = nextSurfaces;
  clearSelection();
  selectedEntity = null;
  clearIsolation();
  intersection = null;
  toast.success(`Removed ${orphanIds.length} orphan point${orphanIds.length === 1 ? '' : 's'}`);
};
const removeDuplicateLines = () => {
  const deleteSet = new Set<number>();
  integrityReport.duplicateLineGroups.forEach((group) => {
    group.lineIds.slice(1).forEach((idx) => deleteSet.add(idx));
  });
  if (!deleteSet.size) {
    toast.info('No duplicate lines detected');
    return;
  }
  pushUndo();
  applyEdgeDeletionSet(deleteSet);
  clearIsolation();
  intersection = null;
  toast.success(`Removed ${deleteSet.size} duplicate line${deleteSet.size === 1 ? '' : 's'}`);
};
const deleteLineOnly = (idx: number) => {
  if (!edges[idx]) return;
  deleteEdge(idx);
};
const deletePointCascade = (idx: number) => {
  if (!points[idx]) return;
  const next = Logic.deletePoint({ idx, points, edges, curves, surfaces });
  pushUndo();
  points = next.points;
  edges = next.edges;
  curves = next.curves;
  surfaces = next.surfaces;
  clearIsolation();

  const remapPointIndex = (value: number | null) => {
    if (value === null) return null;
    if (value === idx) return null;
    return value > idx ? value - 1 : value;
  };
  const remapPointList = (ids: number[]) =>
    ids.map((value) => remapPointIndex(value)).filter((value): value is number => value !== null);

  pendingPointIdx = remapPointIndex(pendingPointIdx);
  createLineA = remapPointIndex(createLineA);
  createLineB = remapPointIndex(createLineB);
  selectedPointIds = remapPointList(selectedPointIds);
  selectedLineIds = [];
  cylFitPointIds = remapPointList(cylFitPointIds);
  planeP0 = remapPointIndex(planeP0) ?? 0;
  planeP1 = remapPointIndex(planeP1) ?? 0;
  planeP2 = remapPointIndex(planeP2) ?? 0;
  planeDirPoint = remapPointIndex(planeDirPoint) ?? 0;
  refPointIdx = remapPointIndex(refPointIdx) ?? 0;
  csysOriginPoint = remapPointIndex(csysOriginPoint) ?? 0;
  csysXPoint = remapPointIndex(csysXPoint) ?? 0;
  csysYPoint = remapPointIndex(csysYPoint) ?? 0;
  csysRelocatePointIdx = remapPointIndex(csysRelocatePointIdx) ?? 0;
  surfaceDraft = remapPointList(surfaceDraft);

  if (selectedEntity?.kind === 'point') {
    selectedEntity = remapPointIndex(selectedEntity.index) === null ? null : { kind: 'point', index: remapPointIndex(selectedEntity.index)! };
  }
  if (selectedEntity?.kind === 'line') {
    const stillExists = edges[selectedEntity.index];
    if (!stillExists) selectedEntity = null;
  }
  if (activeEdgeIdx !== null && !edges[activeEdgeIdx]) activeEdgeIdx = null;
  if (selEdgeA !== null && !edges[selEdgeA]) selEdgeA = edges[0] ? 0 : null;
  if (selEdgeB !== null && !edges[selEdgeB]) selEdgeB = edges[1] ? 1 : edges[0] ? 0 : null;
  if (planeLineA !== null && !edges[planeLineA]) planeLineA = edges[0] ? 0 : 0;
  if (planeLineB !== null && !edges[planeLineB]) planeLineB = edges[1] ? 1 : edges[0] ? 0 : 0;
  if (csysFromLine !== null && !edges[csysFromLine]) csysFromLine = edges[0] ? 0 : 0;
  if (activeCurveIdx !== null && !curves[activeCurveIdx]) activeCurveIdx = null;
  loftA = loftA !== null && curves[loftA] ? loftA : null;
  loftB = loftB !== null && curves[loftB] ? loftB : null;
  intersection = null;
  toast.success('Deleted point and dependent lines');
};
const createSurface = () => {
  if (surfaceDraft.length < 3) {
    toast.warning('Need at least 3 points for a surface');
    return;
  }
  const result = Logic.createSurfaceFromIndices({ idsRaw: surfaceDraft, points, surfaces });
  if (!result.success || result.newSurfaceIdx === null) {
    toast.error('Failed to create surface');
    return;
  }
  pushUndo();
  const newSurface: SurfaceFace = {
    name: `Surface ${surfaces.length}`,
    pts: surfaceDraft,
    vertexIds: surfaceDraft
  };
  surfaces = [...surfaces, newSurface];
  surfaceDraft = [];
  toast.success('Created surface');
};
const createSurfaceFromDraft = () => {
  const result = Logic.createSurfaceFromIndices({ idsRaw: surfaceDraft, points, surfaces });
  if (!result.success || result.newSurfaceIdx === null) {
    toast.error('Failed to create surface');
    return;
  }
  pushUndo();
  const newSurface: SurfaceFace = {
    name: `Surface ${surfaces.length}`,
    pts: surfaceDraft,
    vertexIds: surfaceDraft
  };
  surfaces = [...surfaces, newSurface];
  surfaceDraft = [];
  creatorPick = null;
  toast.success('Created surface');
};
const toggleSurfaceDraftPoint = (idx: number) => {
  if (!points[idx]) return;
  const exists = surfaceDraft.includes(idx);
  if (exists) {
    surfaceDraft = surfaceDraft.filter((p) => p !== idx);
    return;
  }
  if (surfaceCreateKind !== 'contour' && surfaceDraft.length >= surfaceDraftRequired) return;
  surfaceDraft = [...surfaceDraft, idx];
};
const addSurfaceDraftFromLine = (lineIdx: number) => {
  const edge = edges[lineIdx];
  if (!edge) return;
  const [a, b] = edge;
  if (!surfaceDraft.includes(a)) toggleSurfaceDraftPoint(a);
  if (!surfaceDraft.includes(b)) toggleSurfaceDraftPoint(b);
};
const createDatumCsys = () => {
  const result = Logic.addDatumCsys({
    mode: csysCreateMode,
    points,
    edges,
    csys,
    name: `Csys ${csys.length}`,
    originPointIdx: csysOriginPoint,
    xPointIdx: csysXPoint,
    yPointIdx: csysYPoint,
    fromLineIdx: csysFromLine,
    copyIdx: csysCopyIdx
  });
  if (!result) {
    toast.error('Failed to create csys');
    return;
  }
  pushUndo();
  csys = [...csys, result];
  toast.success(`Created csys: ${result.name}`);
};
const relocateCsysToPoint = () => {
  const targetCsys = csys[csysRelocateIdx];
  const targetPoint = points[csysRelocatePointIdx];
  if (!targetCsys || !targetPoint) {
    toast.error('Invalid CSYS or point index');
    return;
  }
  pushUndo();
  csys = csys.map((entry, index) => (
    index === csysRelocateIdx
      ? { ...entry, origin: { ...targetPoint } }
      : entry
  ));
  toast.success(`Relocated CSYS ${csysRelocateIdx + 1} to P${csysRelocatePointIdx + 1}`);
};
const createDatumPlane = () => {
  const result = Logic.addDatumPlane({
    mode: planeCreateMode,
    points,
    edges,
    surfaces,
    csys,
    name: `Plane ${planes.length}`,
    p0Idx: planeP0,
    p1Idx: planeP1,
    p2Idx: planeP2,
    normalVec: planeNormalVec,
    offsetSurfaceIdx: planeOffsetSurface,
    offsetDistance: planeOffsetDist,
    lineAIdx: planeLineA,
    lineBIdx: planeLineB,
    directionPointIdx: planeDirPoint,
    directionVec: planeDirVec,
    csysIdx: planeCsysIdx,
    principal: planePrincipal
  });
  if (!result) {
    toast.error('Failed to create plane');
    return;
  }
  pushUndo();
  planes = [...planes, result];
  toast.success(`Created plane: ${result.name}`);
};
// Evaluation
const cylUiCtx = () => ({ getPoints: () => points, getSelectedPointIds: () => selectedPointIds, setSelectedPointIds: (v: number[]) => { selectedPointIds = v; }, getEvalUseSelection: () => evalUseSelection, getEvalTol: () => evalTol, getEvalSigmaMult: () => evalSigmaMult, getEvalMaxOutliers: () => evalMaxOutliers, getCylRes: () => cylRes, getCylRefineK: () => cylRefineK, getCylFitPointIds: () => cylFitPointIds, setCylErr: (v: string | null) => { cylErr = v; }, setCylBusy: (v: boolean) => { cylBusy = v; }, setCylFitPointIds: (v: number[]) => { cylFitPointIds = v; }, setCylRes: (v: typeof cylRes) => { cylRes = v; }, setEvalErr: (v: string | null) => { evalErr = v; }, setEvalBusy: (v: boolean) => { evalBusy = v; }, setEvalRes: (v: typeof evalRes) => { evalRes = v; }, getSliceAxis: () => sliceAxis, getSliceBins: () => sliceBins, getSliceThickness: () => sliceThickness, setSliceErr: (v: string | null) => { sliceErr = v; }, setSliceBusy: (v: boolean) => { sliceBusy = v; }, setSliceRes: (v: typeof sliceRes) => { sliceRes = v; }, getDatumPlaneChoices: () => datumPlaneChoices, getDatumSlicePlaneIdx: () => datumSlicePlaneIdx, getDatumSliceMode: () => datumSliceMode, getDatumSliceSpacing: () => datumSliceSpacing, getDatumSliceCount: () => datumSliceCount, getDatumSliceThickness: () => datumSliceThickness, getDatumSliceUseSelection: () => datumSliceUseSelection, setDatumSliceErr: (v: string | null) => { datumSliceErr = v; }, setDatumSliceBusy: (v: boolean) => { datumSliceBusy = v; }, setDatumSliceRes: (v: DatumSliceRunResult | null) => { datumSliceRes = v; }, getDatumSliceRes: () => datumSliceRes, setSelectedSliceId: (v: number | null) => { selectedSliceId = v; }, getIncludeOptionalSliceColumns: () => includeOptionalSliceColumns, getStatusWarnings: () => statusWarnings, setStatusWarnings: (v: SurfaceStatusWarning[]) => { statusWarnings = v; }, getEmittedWarningIds: () => emittedWarningIds, toast }), evaluationUiCtx = cylUiCtx;
const computeSurfaceEval = async () => { await computeSurfaceEvalUi(evaluationUiCtx()); }, computeSectionSlices = async () => { await computeSectionSlicesUi(evaluationUiCtx()); }, computeDatumSlices = async () => { await computeDatumSlicesUi(evaluationUiCtx()); };
const exportDatumSliceCombined = () => { exportDatumSliceCombinedUi(evaluationUiCtx()); }, emitStatusWarnings = (incoming: SurfaceStatusWarning[]) => { emitStatusWarningsUi(evaluationUiCtx(), incoming); };
const computeCylinderFit = async () => { await computeCylinderFitUi(cylUiCtx()); }, cylKeepInliers = () => { cylKeepInliersController(cylUiCtx()); }, cylSelectOutliers = () => { cylSelectOutliersController(cylUiCtx()); }, cylRemoveOutliers = () => { cylRemoveOutliersController(cylUiCtx()); };
const recipeUiCtx = () => ({ getSelEdgeA: () => selEdgeA, getSelEdgeB: () => selEdgeB, getOffsetDist: () => offsetDist, getRefPointIdx: () => refPointIdx, getDatumSlicePlaneIdx: () => datumSlicePlaneIdx, getDatumSliceMode: () => datumSliceMode, getDatumSliceSpacing: () => datumSliceSpacing, getDatumSliceCount: () => datumSliceCount, getDatumSliceThickness: () => datumSliceThickness, getDatumSliceUseSelection: () => datumSliceUseSelection, getIncludeOptionalSliceColumns: () => includeOptionalSliceColumns, setRecipeNameDraft: (v: string) => { recipeNameDraft = v; }, getRecipeNameDraft: () => recipeNameDraft, getRecipes: () => recipes, setRecipes: (v: SurfaceRecipe[]) => { recipes = v; }, getSelectedRecipeId: () => selectedRecipeId, setSelectedRecipeId: (v: string | null) => { selectedRecipeId = v; }, getRecipeRun: () => recipeRun, setRecipeRun: (v: RecipeRunState | null) => { recipeRun = v; }, getSelectedRecipe: () => selectedRecipe(), getRecipeStepConfirmed: () => recipeStepConfirmed, getRecipeTx: () => recipeTx, setRecipeTx: (v: RecipeTransaction | null) => { recipeTx = v; }, beginRecipeTransaction, getCurrentSnapshot: () => createSnapshot(points, edges, curves, surfaces, csys, planes, activeEdgeIdx), applySnapshot: (s: any) => { const m = materializeSnapshot(s); points = m.points; edges = m.edges; curves = m.curves; surfaces = m.surfaces; csys = m.csys; planes = m.planes; activeEdgeIdx = m.activeEdgeIdx; }, getUndoRedoStacks: () => ({ undoStack, redoStack }), setUndoRedoStacks: (v: { undoStack: any[]; redoStack: any[] }) => { undoStack = v.undoStack; redoStack = v.redoStack; }, applyRecipeConfig: (cfg: any) => applyRecipeConfig(cfg), calcOffsetIntersection, computeDatumSlices, exportDatumSliceCombined, getDatumSliceRes: () => datumSliceRes, getIntersectionDiagnostics: () => intersectionDiagnostics, emitStatusWarnings, getDatumSliceErr: () => datumSliceErr, setSelEdgeA: (v: number | null) => { selEdgeA = v; }, setSelEdgeB: (v: number | null) => { selEdgeB = v; }, setOffsetDist: (v: number) => { offsetDist = v; }, setRefPointIdx: (v: number) => { refPointIdx = v; }, setDatumSlicePlaneIdx: (v: number) => { datumSlicePlaneIdx = v; }, setDatumSliceMode: (v: DatumSliceMode) => { datumSliceMode = v; }, setDatumSliceSpacing: (v: number) => { datumSliceSpacing = v; }, setDatumSliceCount: (v: number) => { datumSliceCount = v; }, setDatumSliceThickness: (v: number) => { datumSliceThickness = v; }, setDatumSliceUseSelection: (v: boolean) => { datumSliceUseSelection = v; }, setIncludeOptionalSliceColumns: (v: boolean) => { includeOptionalSliceColumns = v; } });
const snapshotRecipeConfig = (): SurfaceRecipeConfig => snapshotRecipeConfigController(recipeUiCtx()), applyRecipeConfig = (cfg: SurfaceRecipeConfig) => { applyRecipeConfigController(recipeUiCtx(), cfg); };
const selectedRecipe = () => selectedRecipeController(recipes, selectedRecipeId), selectRecipe = (id: string | null) => { if (id !== null) selectRecipeController(recipeUiCtx(), id); };
const saveCurrentRecipe = () => { saveCurrentRecipeController(recipeUiCtx()); saveWorkspaceRecipes('surface', recipes); }, deleteSelectedRecipe = () => { deleteSelectedRecipeController(recipeUiCtx()); saveWorkspaceRecipes('surface', recipes); };
const toggleSelectedRecipeStep = (step: SurfaceRecipeStep, enabled: boolean) => { toggleSelectedRecipeStepController(recipeUiCtx(), step, enabled); };
const handlePointClick = (idx: number, ev?: MouseEvent) => {
  const result = Logic.handlePointClick(
    idx,
    ev as PointerEvent,
    toolCursor,
    surfaceCreateKind,
    creatorPick,
    surfaceDraft,
    datumPick,
    lineInsertPickMode,
    createLineA,
    createLineB,
    points,
    csys,
    edges,
    curves
  );
  pendingPointIdx = result.pendingPointIdx;
  creatorPick = result.creatorPick;
  surfaceDraft = result.surfaceDraft;
  datumPick = result.datumPick;
  lineInsertPickMode = result.lineInsertPickMode;
  if (result.createLineA !== undefined) createLineA = result.createLineA;
  if (result.createLineB !== undefined) createLineB = result.createLineB;
  if (result.createLineNow && createLineA !== null && createLineB !== null) createLine();
  if (result.createSurfaceNow) createSurfaceFromDraft();
};
const onEdgeClick = (idx: number, ev?: MouseEvent) => {
  if (!edges[idx]) return;
  const add = !!ev?.shiftKey;
  const subtract = !!ev?.altKey;
  const current = new Set(selectedLineIds);
  if (add) current.add(idx);
  else if (subtract) current.delete(idx);
  else {
    current.clear();
    current.add(idx);
  }
  selectedLineIds = [...current].sort((a, b) => a - b);
  selectedEntity = current.has(idx) ? { kind: 'line', index: idx } : null;
  activeEdgeIdx = current.has(idx) ? idx : activeEdgeIdx;
};
const onSurfaceClick = (idx: number) => { selectedEntity = { kind: 'surface', index: idx }; }, onPlaneClick = (idx: number) => { selectedEntity = { kind: 'plane', index: idx }; }, onCsysClick = (idx: number) => { selectedEntity = { kind: 'csys', index: idx }; csysRelocateIdx = idx; };
const armDatumPick = (target: 'csys3' | 'csysPointLine', slot: 'origin' | 'x' | 'y' | 'line') => { datumPick = { target, slot }; toast.info(`Click a point to select ${slot}`); };
const addDatumCsys = () => createDatumCsys(), addDatumPlane = () => createDatumPlane(), addPoint = () => createPoint(), finishContourSurface = () => createSurface();
const insertPointOnEdge = () => {
  if (activeEdgeIdx === null) {
    toast.error('No edge selected');
    return;
  }
  const result = Logic.insertPointOnEdge({
    edgeIdx: activeEdgeIdx,
    t: lineInsertT,
    points,
    edges
  });
  if (!result) {
    toast.error('Failed to insert point');
    return;
  }
  pushUndo();
  points = [...points, result.newPoint];
  edges = edges.filter((_: Edge, i: number) => !result.edgesToRemove.includes(i)).concat(result.edgesToAdd);
  activeEdgeIdx = result.newActiveEdgeIdx;
  toast.success('Inserted point on line');
};
const offsetSurfaceCreate = () => {
  const result = Logic.offsetSurface({
    surfaceIdx: offsetSurfaceIdx,
    offsetDist: offsetSurfaceDist,
    surfaces,
    points
  });
  if (!result) {
    toast.error('Failed to create offset surface');
    return;
  }
  pushUndo();
  points = [...points, ...result.newPoints];
  surfaces = [...surfaces, result.newSurface];
  toast.success('Created offset surface');
};
const offsetCurveOnSurfaceCreate = () => {
  const result = computeCurveOffsetBestEffort({
    points,
    curve: curves[offsetCurveIdx]!,
    surface: surfaces[offsetCurveSurfaceIdx]!,
    distance: offsetCurveFlip ? -offsetCurveDist : offsetCurveDist
  });
  offsetCurveStatus = {
    severity: result.severity,
    method: result.method,
    message: result.message
  };
  if (result.severity === 'error' || result.points.length === 0) {
    if (result.message) toast.error(result.message);
    return;
  }
  pushUndo();
  const newCurve: Curve = {
    name: `Curve ${curves.length}`,
    pts: result.points.map((p: Point3D, i: number) => {
      points.push(p);
      return points.length - 1;
    })
  };
  curves = [...curves, newCurve];
  toast.success(`Created offset curve via ${result.method}`);
};
const extrudeLineOrCurve = () => {
  const result = Logic.extrudeLineOrCurve({
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
  });
  if (!result) {
    toast.error('Failed to extrude');
    return;
  }
  pushUndo();
  points = [...points, ...result.newPoints];
  surfaces = [...surfaces, ...result.newSurfaces];
  edges = [...edges, ...result.newEdges];
  toast.success('Created extruded surface');
};
const runTopologyHealing = () => {
  const result = Logic.runTopologyHealing({
    points,
    edges,
    curves,
    surfaces,
    tolerance: healTol
  });
  pushUndo();
  points = result.points;
  edges = result.edges;
  curves = result.curves;
  surfaces = result.surfaces;
  const merged = points.length - result.points.length;
  toast.success(`Healed: ${merged} points merged`);
};
const deleteEdge = (idx: number) => {
  if (!edges[idx]) return;
  pushUndo();
  edges = edges.filter((_, i) => i !== idx);
  clearIsolation();
  const remapEdgeIndex = (value: number | null) => {
    if (value === null) return null;
    if (value === idx) return null;
    return value > idx ? value - 1 : value;
  };

  activeEdgeIdx = remapEdgeIndex(activeEdgeIdx);
  selectedLineIds = selectedLineIds
    .map((lineIdx) => remapEdgeIndex(lineIdx))
    .filter((lineIdx): lineIdx is number => lineIdx !== null);
  selEdgeA = remapEdgeIndex(selEdgeA);
  selEdgeB = remapEdgeIndex(selEdgeB);
  planeLineA = remapEdgeIndex(planeLineA) ?? 0;
  planeLineB = remapEdgeIndex(planeLineB) ?? 0;
  csysFromLine = remapEdgeIndex(csysFromLine) ?? 0;
  if (selectedEntity?.kind === 'line') {
    const mapped = remapEdgeIndex(selectedEntity.index);
    selectedEntity = mapped === null ? null : { kind: 'line', index: mapped };
  }
  intersection = null;
  toast.success('Deleted line');
};
const deleteSurfaceOnly = (idx: number) => {
  if (!surfaces[idx]) return;
  pushUndo();
  surfaces = surfaces.filter((_, i) => i !== idx);
  if (selectedEntity?.kind === 'surface') {
    if (selectedEntity.index === idx) selectedEntity = null;
    else if (selectedEntity.index > idx) selectedEntity = { kind: 'surface', index: selectedEntity.index - 1 };
  }
  intersection = null;
  toast.success('Deleted surface');
};
const deleteCurve = (idx: number) => { pushUndo(); curves = curves.filter((_, i) => i !== idx); if (activeCurveIdx === idx) activeCurveIdx = null; toast.success('Deleted curve'); };
const createCurve = () => { if (activeEdgeIdx === null) return; const result = Logic.convertEdgeToCurve({ edgeIdx: activeEdgeIdx, edges, curves, points }); if (!result.success || !result.curves) { toast.error(result.error ?? 'Failed to create curve'); return; } pushUndo(); curves = result.curves; activeCurveIdx = curves.length - 1; toast.success('Created curve from line'); };
const rebuildLoftSegments = () => { if (loftA !== null && loftB !== null) { const result = buildLoftSegments(curves, points, loftA, loftB); loftSegments = result.segments; loftErr = result.error; } };
const calcOffsetIntersection = async () => { if (selEdgeA === null || selEdgeB === null || refPointIdx === null) return; intersectionBusy = true; const check = precheckIntersectionInputs({ selEdgeA, selEdgeB, edges, points }); intersectionDiagnostics = check.diagnostics; if (!check.ok) { intersectionBusy = false; return; } const ea = edges[selEdgeA]; const eb = edges[selEdgeB]; const result = await calcOffsetIntersectionApi({ p1A: points[ea[0]], p1B: points[ea[1]], p2A: points[eb[0]], p2B: points[eb[1]], offsetDist, directionRef: points[refPointIdx] }); intersection = result.intersection; intersectionDiagnostics = diagnoseIntersectionResult({ skew: result.skew, offsetDistance: offsetDist, angleDeg: check.diagnostics.angleDeg, existing: check.diagnostics }); intersectionBusy = false; };
const startRecipeRun = () => startRecipeRunUi(recipeUiCtx() as any), runRecipeNextStep = () => runRecipeNextStepUi(recipeUiCtx() as any), cancelRecipeRun = () => cancelRecipeRunUi(recipeUiCtx() as any);
const chooseCoreMode = (mode: boolean) => { coreMode = mode; showCoreModePrompt = false; persistCoreMode(mode); markCoreModePromptSeen(); };
const setRightRailCollapsed = (val: boolean) => { rightRailCollapsed = val; persistRightRailCollapsed(val); };
const depthOpacity = (z: number) => depthOpacityUi(z, zRange), pointDepthOpacity = (z: number) => depthOpacityUi(z, zRange), surfaceDepthOpacity = (z: number) => surfaceDepthOpacityUi(z, zRange);
const keyActivate = (e: KeyboardEvent, fn: () => void) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } }, project = (p: Point3D) => projectPoint(p, rot, zoomK, w, h, pan), heatColor = (d: number, scale: number) => { const low = -scale; const high = scale; if (d <= low) return '#3b82f6'; if (d >= high) return '#ef4444'; const t = (d - low) / (high - low); return t < 0.5 ? `rgb(${Math.round(59 + (255 - 59) * (t * 2))}, ${Math.round(130 + (255 - 130) * (t * 2))}, ${Math.round(246 + (255 - 246) * (t * 2))})` : `rgb(${Math.round(255 - (255 - 239) * ((t - 0.5) * 2))}, ${Math.round(255 - (255 - 68) * ((t - 0.5) * 2))}, ${Math.round(255 - (255 - 68) * ((t - 0.5) * 2))})`; };
const nearestEdgeHit = (mx: number, my: number) => nearestEdgeHitProjected({ mx, my, edges, projected }), cylThresholdAbs = () => cylThresholdAbsController(cylUiCtx());
const currentActiveFitPointIds = () => activeFitPointIds(cylUseSelection, selectedPointIds, points);
const setRendererMode = (mode: RendererMode) => {
  rendererMode = 'svg';
};
const setRendererTheme = async (theme: RendererTheme) => {
  rendererTheme = theme;
};
const togglePerformanceMode = () => {
  performanceMode = !performanceMode;
};
const surfaceCommands = $derived([
  { id: 'create-point', label: 'Create Geometry', keywords: 'point line surface create', run: () => { createGeometryModalOpen = true; } },
  { id: 'open-datums', label: 'Open Datums', keywords: 'csys plane datums', run: () => { openDatumsModal(); } },
  { id: 'toggle-renderer', label: 'Use D3/SVG Renderer', keywords: 'renderer d3 svg', run: () => { setRendererMode('svg'); } },
  { id: 'theme-tech', label: 'Theme: Technical', keywords: 'theme technical visual', run: () => { void setRendererTheme('technical'); } },
  { id: 'theme-studio', label: 'Theme: Studio', keywords: 'theme studio visual', run: () => { void setRendererTheme('studio'); } },
  { id: 'theme-contrast', label: 'Theme: High Contrast', keywords: 'theme contrast visual', run: () => { void setRendererTheme('high-contrast'); } },
  { id: 'theme-aurora', label: 'Theme: Aurora', keywords: 'theme aurora visual', run: () => { void setRendererTheme('aurora'); } },
  { id: 'performance-toggle', label: 'Toggle Performance Mode', keywords: 'performance decimation worker telemetry', run: () => { togglePerformanceMode(); } },
  { id: 'fit-view', label: 'Fit To Screen', keywords: 'viewport fit', run: () => { fitToScreen(); } },
  { id: 'reset-view', label: 'Reset View', keywords: 'viewport reset camera', run: () => { resetView(); } },
  { id: 'clear-isolation', label: 'Clear Isolation', keywords: 'isolation show all geometry', run: () => { clearIsolation(); } },
  { id: 'delete-selection', label: 'Delete Selection', keywords: 'delete selected cascade', run: () => { openDeletePreviewFromSelection(); } },
  { id: 'integrity-remove-orphans', label: 'Integrity: Remove Orphans', keywords: 'integrity orphan points cleanup', run: () => { removeOrphanPoints(); } },
  { id: 'integrity-deduplicate-lines', label: 'Integrity: Deduplicate Lines', keywords: 'integrity duplicate lines cleanup', run: () => { removeDuplicateLines(); } },
  { id: 'undo', label: 'Undo', keywords: 'history undo', run: () => { undo(); } },
  { id: 'redo', label: 'Redo', keywords: 'history redo', run: () => { redo(); } }
]);
$effect(() => {
  if (loftA !== null && loftB !== null) {
    const result = buildLoftSegments(curves, points, loftA, loftB);
    loftSegments = result.segments;
    loftErr = result.error;
  } else {
    loftSegments = [];
    loftErr = null;
  }
});
$effect(() => {
  const maxIdx = Math.max(0, datumPlaneChoices.length - 1);
  datumSlicePlaneIdx = clamp(datumSlicePlaneIdx, 0, maxIdx);
});
$effect(() => {
  if (!workerAvailable || !hitWorker) return;
  hitWorker.postMessage({
    type: 'setGeometry',
    points: projected.map((point) => ({ x: point.x, y: point.y })),
    edges
  });
});
$effect(() => {
  if (!performanceMode) {
    autoDegradeLevel = 0;
    perfPointBudget = 9000;
    perfEdgeBudget = 14000;
    return;
  }
  if (frameMsAvg > 30 && autoDegradeLevel < 2) {
    autoDegradeLevel += 1;
  } else if (frameMsAvg < 18 && autoDegradeLevel > 0) {
    autoDegradeLevel -= 1;
  }
  if (autoDegradeLevel === 0) {
    perfPointBudget = 9000;
    perfEdgeBudget = 14000;
  } else if (autoDegradeLevel === 1) {
    perfPointBudget = 6500;
    perfEdgeBudget = 10000;
  } else {
    perfPointBudget = 4500;
    perfEdgeBudget = 7000;
  }
});
$effect(() => {
  writeWorkspaceUiState('surface', {
    coreMode,
    advancedOpen,
    rightRailCollapsed,
    zoomK,
    pan,
    rot,
    rendererMode,
    rendererTheme,
    performanceMode
  });
});
onMount(() => {
  if (typeof window !== 'undefined') {
    const mode = readPersistedCoreMode();
    if (mode !== null) coreMode = mode;
    const col = readPersistedRightRailCollapsed();
    if (col !== null) rightRailCollapsed = col;
    showCoreModePrompt = !hasSeenCoreModePrompt();
    const ui = readWorkspaceUiState('surface');
    if (ui) {
      if (ui.zoomK !== undefined) zoomK = ui.zoomK;
      if (ui.pan) pan = ui.pan;
      if (ui.rot) rot = ui.rot;
      if (ui.rendererMode === 'svg') rendererMode = ui.rendererMode;
      if (ui.rendererTheme === 'technical' || ui.rendererTheme === 'studio' || ui.rendererTheme === 'high-contrast' || ui.rendererTheme === 'aurora') rendererTheme = ui.rendererTheme;
      if (typeof ui.performanceMode === 'boolean') performanceMode = ui.performanceMode;
    }
    const loaded = loadWorkspaceRecipes('surface');
    recipes = Array.isArray(loaded) ? loaded : loaded.recipes;
  }

  if (actionsBarEl) autoAnimate(actionsBarEl);

  let rafId = 0;
  let lastFrameTs = 0;
  const frameLoop = (ts: number) => {
    if (lastFrameTs > 0) {
      const delta = ts - lastFrameTs;
      frameMsAvg = frameMsAvg ? frameMsAvg * 0.9 + delta * 0.1 : delta;
    }
    lastFrameTs = ts;
    rafId = requestAnimationFrame(frameLoop);
  };
  rafId = requestAnimationFrame(frameLoop);

  try {
    hitWorker = new Worker(new URL('./workers/surfaceHitTestWorker.ts', import.meta.url), { type: 'module' });
    workerAvailable = true;
    hitWorker.onmessage = (event: MessageEvent<{ type: 'nearest' | 'nearestEdge' | 'hits'; reqId: number; idx?: number | null; ids?: number[]; edgeIdx?: number | null; t?: number; d?: number }>) => {
      const payload = event.data;
      const resolve = workerPending.get(payload.reqId);
      if (!resolve) return;
      workerPending.delete(payload.reqId);
      if (payload.type === 'nearest') resolve((payload.idx ?? null) as any);
      else if (payload.type === 'nearestEdge') {
        resolve((payload.edgeIdx === null || payload.edgeIdx === undefined
          ? null
          : { edgeIdx: payload.edgeIdx, t: payload.t ?? 0, d: payload.d ?? 0 }) as any);
      }
      else resolve((payload.ids ?? []) as any);
    };
  } catch {
    hitWorker = null;
    workerAvailable = false;
  }

  if (!viewportEl) {
    registerContextMenu(buildSurfaceNavMenu({ canUndo, canRedo, coreMode, rightRailCollapsed }));
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (hitWorker) hitWorker.terminate();
      hitWorker = null;
      workerAvailable = false;
      workerPending.clear();
    };
  }

  const unsub1 = mountSurfaceGlobalHandlers({
    getLastAction: () => lastAction,
    undo,
    redo,
    canUndo,
    canRedo,
    coreMode,
    rightRailCollapsed,
    openCreateGeometry: () => { createGeometryModalOpen = true; },
    openSurfaceCurveOps: () => { surfaceCurveOpsModalOpen = true; },
    openExtrude: () => { extrudeModalOpen = true; },
    openDatums: openDatumsModal,
    openSettings: () => { settingsOpen = true; },
    clearPicks: () => { pendingPointIdx = null; intersection = null; },
    fitToScreen,
    resetView,
    toggleCoreMode: () => { coreMode = !coreMode; persistCoreMode(coreMode); },
    toggleRightRail: () => { rightRailCollapsed = !rightRailCollapsed; persistRightRailCollapsed(rightRailCollapsed); },
    exportCsv: exportCSV,
    exportStep: exportSTEP
  });
  const unsub2 = mountSurfaceViewportInteraction({
    viewportEl,
    svgEl,
    getSelectionMode: () => selectionMode,
    getZoomK: () => zoomK,
    setZoomK: (v) => { zoomK = v; },
    getPan: () => pan,
    setPan: (v) => { pan = v; },
    getRot: () => rot,
    setRot: (v) => { rot = v; },
    getW: () => w,
    getH: () => h,
    setW: (v) => { w = v; },
    setH: (v) => { h = v; },
    getRotateAnchor: () => rotateAnchor,
    setRotateAnchor: (v) => { rotateAnchor = v; },
    pickOrbitPivot: (mx, my) => {
      const np = nearestPointIndex(projected, mx, my, 18);
      if (np != null && projected[np] && Math.hypot(projected[np].x - mx, projected[np].y - my) < 20) return points[np];
      return points[0] ?? { x: 0, y: 0, z: 0 };
    },
    rotateForView: (p, r) => rotateForViewUi(p, r)
  });
  const handleGlobalKeys = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    const isTextInput = !!target?.closest('input, textarea, select, [contenteditable="true"]');
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      commandPaletteOpen = true;
      return;
    }
    if (!isTextInput && event.key === 'Delete' && !deletePreviewOpen) {
      event.preventDefault();
      openDeletePreviewFromSelection();
    }
    if (!isTextInput && event.key === 'Escape' && deletePreviewOpen) {
      event.preventDefault();
      closeDeletePreview();
    }
    if (!isTextInput && event.key === 'Enter' && deletePreviewOpen) {
      event.preventDefault();
      applyDeletePreview();
    }
    if (isTextInput) return;
    if (event.key === 'f' || event.key === 'F') {
      event.preventDefault();
      fitToScreen();
    } else if (event.key === 'r' || event.key === 'R') {
      event.preventDefault();
      resetView();
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      zoomBy(1.12);
    } else if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      zoomBy(1 / 1.12);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      panBy(0, -18);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      panBy(0, 18);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      panBy(-18, 0);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      panBy(18, 0);
    } else if (event.key === 'q' || event.key === 'Q') {
      event.preventDefault();
      rotateBy(-1, 0);
    } else if (event.key === 'e' || event.key === 'E') {
      event.preventDefault();
      rotateBy(1, 0);
    }
  };
  window.addEventListener('keydown', handleGlobalKeys);
  registerContextMenu(buildSurfaceNavMenu({ canUndo, canRedo, coreMode, rightRailCollapsed }));
  return () => {
    unsub1();
    unsub2();
    window.removeEventListener('keydown', handleGlobalKeys);
    if (rafId) cancelAnimationFrame(rafId);
    if (hitWorker) hitWorker.terminate();
    hitWorker = null;
    workerAvailable = false;
    workerPending.clear();
  };
});
</script>
<div class={`space-y-4 surface-lab surface-reveal ${rendererThemeClass}`} style={`--surface-motion-ease:${SURFACE_MOTION_SPEC.easing};`}>
  <div class="space-y-3">
    <div>
      <div class="text-sm font-semibold surface-accent-rule inline-block">3D Surface Builder</div>
      <div class="text-[11px] text-white/50">
        Create in order: Point -> Line -> Surface. Drag to rotate, wheel to zoom, Shift to pan. Shortcuts: F fit, R reset, arrows pan, +/- zoom, Q/E rotate.
      </div>
    </div>

    <div class="text-[11px] text-white/55">
      Renderer: <span class="text-cyan-200/90 font-mono">d3/svg</span>
      <span class="text-white/40"> • theme {rendererTheme}</span>
    </div>

    <SurfaceActionBar
      bind:actionsBarEl
      {coreMode}
      {toolCursor}
      {createGeometryModalOpen}
      {probeOn}
      bind:maxTaperDeg
      {selectionMode}
      {curveMode}
      selectedCount={selectedEntityCount}
      {selectionProfile}
      {createPrereqNotice}
      {topCreateHint}
      bind:fileNotice
      {canUndo}
      {canRedo}
      {canDeleteSelection}
      {minPointsFor}
      pointsCount={points.length}
      {rendererTheme}
      {performanceMode}
      onToggleCoreMode={() => {
        coreMode = !coreMode;
        if (coreMode) advancedOpen = false;
        persistCoreMode(coreMode);
        markCoreModePromptSeen();
      }}
      onSetToolCursor={setToolCursor}
      onSetSelectionMode={setSelectionMode}
      onToggleProbe={() => {
        probeOn = !probeOn;
        probe = null;
      }}
      onSetSelectionProfile={(mode) => (selectionProfile = mode)}
      onClearSelection={clearSelection}
      onInvertSelection={invertSelection}
      onLoadFile={handleLoadedFile}
      onExportCSV={exportCSV}
      onExportSTEP={exportSTEP}
      onOpenDatums={openDatumsModal}
      onOpenCreateGeometry={() => (createGeometryModalOpen = true)}
      onOpenSurfaceCurveOps={() => (surfaceCurveOpsModalOpen = true)}
      onOpenExtrude={() => (extrudeModalOpen = true)}
      onOpenHealing={() => (healingModalOpen = true)}
      onOpenSettings={() => (settingsOpen = true)}
      onUndo={undo}
      onRedo={redo}
      onOpenDeletePreview={openDeletePreviewFromSelection}
      onSetRendererTheme={setRendererTheme}
      onTogglePerformanceMode={togglePerformanceMode}
    />
  </div>

  <div class={`grid grid-cols-1 ${rightRailCollapsed ? 'lg:grid-cols-[1fr_56px]' : 'lg:grid-cols-[1fr_380px]'} gap-6`}>
    <div class="glass-panel rounded-2xl p-3 overflow-hidden h-[82vh] relative">
      <SurfaceCanvas
        bind:viewportEl
        bind:svgEl
        {w}
        {h}
        {selectionMode}
        {probeOn}
        {selecting}
        {selRect}
        {lasso}
        {openViewportMenu}
        {closeViewportMenu}
        {contextTargetKind}
        {contextTargetIndex}
        {updateProbeFromEvent}
        onViewportMouseLeave={() => {
          if (hoverRaf) cancelAnimationFrame(hoverRaf);
          hoverRaf = 0;
          hoverQueued = null;
          activeSnap = null;
          hoverTooltip = null;
          probe = null;
          lastSnapSig = 'none';
        }}
        {onSvgPointerDown}
        {onSvgPointerMove}
        {onSvgPointerUp}
        {sortedSurfaces}
        sortedEdges={renderedEdges}
        pointRenderIds={renderPointIds}
        {datumPlanePatches}
        {datumAxisSegments}
        {projected}
        {pointBaseRadius}
        {edgeHitWidth}
        {activeEdgeIdx}
        {selectedLineSet}
        setActiveEdgeIdx={(i) => (activeEdgeIdx = i)}
        {onEdgeClick}
        {onSurfaceClick}
        {onPlaneClick}
        {onCsysClick}
        {depthOpacity}
        {pointDepthOpacity}
        {surfaceDepthOpacity}
        {keyActivate}
        {loftSegments}
        {project}
        {cylAxisSeg}
        {intersection}
        {interpPoint}
        {activeSnap}
        {hoverTooltip}
        {evalRes}
        {heatmapOn}
        {heatScale}
        {heatColor}
        {pendingPointIdx}
        {selectedSet}
        {cylOutlierSet}
        {outlierSet}
        {isolatedPointIds}
        {isolatedLineIds}
        {handlePointClick}
        {points}
        {probe}
        {probeBoltDia}
        {zoomK}
        {maxTaperDeg}
        showPoints={showPointEntities}
        showEdges={showLineEntities}
        showSurfaces={showSurfaceEntities}
        showDatums={showDatumEntities}
        showLabels={showSelectionLabels}
        cullMargin={0}
        vpMenuOpen={vpMenuOpen}
        vpMenuX={vpMenuX}
        vpMenuY={vpMenuY}
        {fitToScreen}
        {resetView}
        {selectedBadge}
        onDeletePointCascade={deletePointCascade}
        onDeleteLineOnly={deleteLineOnly}
        onConnectFromPoint={connectFromPointContext}
        onConnectToPoint={connectToPointContext}
        onIsolateFromPoint={isolateFromPointContext}
        onIsolateFromLine={isolateFromLineContext}
        onClearIsolation={clearIsolation}
        onPanBy={panBy}
        onRotateBy={rotateBy}
        onZoomBy={zoomBy}
      />
    </div>

    <SurfaceRightRail bind:rightRailCollapsed {coreMode} bind:advancedOpen {datumSliceBusy} pointsCount={points.length} edgesCount={edges.length} surfacesCount={surfaces.length} {statusWarnings} {SURFACE_ANALYTICS_ENABLED} bind:interpPct {interpPoint} {edges} {points} bind:selEdgeA bind:selEdgeB bind:offsetDist bind:refPointIdx {intersection} {intersectionBusy} {intersectionDiagnostics} bind:evalUseSelection bind:heatmapOn bind:evalTol bind:evalSigmaMult {evalBusy} {evalErr} {evalRes} bind:pendingPointIdx bind:cylUseSelection bind:cylShowAxis {cylBusy} {cylErr} {cylRes} bind:cylRefineK {cylThresholdAbs} {currentActiveFitPointIds} {selectedPointIds} {cylFitPointIds} bind:sliceAxis bind:sliceBins bind:sliceThickness bind:sliceMetric {sliceBusy} {sliceErr} {sliceRes} {datumPlaneChoices} bind:datumSlicePlaneIdx bind:datumSliceMode bind:datumSliceSpacing bind:datumSliceCount bind:datumSliceThickness bind:datumSliceUseSelection bind:includeOptionalSliceColumns {datumSliceErr} {datumSliceRes} {sliceSyncModel} bind:selectedSliceId {recipes} bind:selectedRecipeId bind:recipeNameDraft bind:recipeStepConfirmed {recipeRun} {activeEdgeIdx} setActiveEdgeIdx={(i) => (activeEdgeIdx = i)} {curves} {activeCurveIdx} setActiveCurveIdx={(i) => (activeCurveIdx = i)} {curveMode} {loftA} {loftB} setLoftA={(v) => (loftA = v)} setLoftB={(v) => (loftB = v)} loftSegmentsCount={loftSegments.length} {loftErr} {toolCursor} bind:samplerAppend bind:samplerMode bind:samplerNu bind:samplerNv bind:samplerEdgeSegs bind:samplerErr onSetRightRailCollapsed={setRightRailCollapsed} onOpenCreateGeometry={() => (createGeometryModalOpen = true)} onOpenDatums={openDatumsModal} onOpenSettings={() => (settingsOpen = true)} onClearPicks={() => { pendingPointIdx = null; intersection = null; }} onToggleAdvancedOpen={() => (advancedOpen = !advancedOpen)} onClearWarnings={() => { statusWarnings = []; emittedWarningIds.clear(); }} {computeSurfaceEval} {computeCylinderFit} {cylSelectOutliers} {cylKeepInliers} {cylRemoveOutliers} {computeSectionSlices} computeDatumSlices={computeDatumSlices} {exportDatumSliceCombined} {calcOffsetIntersection} {saveCurrentRecipe} {deleteSelectedRecipe} {selectRecipe} {toggleSelectedRecipeStep} {startRecipeRun} {runRecipeNextStep} {cancelRecipeRun} {deleteEdge} {deleteCurve} {createCurve} {rebuildLoftSegments} {setToolCursor} {generateSamplerPoints} />
  </div>

  <SurfaceIntegrityPanel
    report={integrityReport}
    nonManifoldThreshold={integrityThreshold}
    onSetNonManifoldThreshold={(value) => (integrityThreshold = Number.isFinite(value) ? value : integrityThreshold)}
    onFixOrphans={removeOrphanPoints}
    onFixDuplicateLines={removeDuplicateLines}
  />

  {#if showCoreModePrompt}
    <div class="fixed inset-0 z-[360] flex items-center justify-center bg-black/60 backdrop-blur-[1px]">
      <div class="w-[460px] max-w-[92vw] rounded-2xl border border-white/15 bg-slate-950/95 shadow-2xl p-5 space-y-4">
        <div class="text-sm font-semibold tracking-wide text-white/90">Choose Surface Mode</div>
        <div class="text-[12px] text-white/65">
          Core Mode keeps the toolbox lean and focused. You can switch anytime.
        </div>
        <div class="grid grid-cols-1 gap-2">
          <button class="btn btn-sm variant-soft" onclick={() => chooseCoreMode(true)}>
            Use Core Mode (Recommended)
          </button>
          <button class="btn btn-sm variant-soft opacity-80" onclick={() => chooseCoreMode(false)}>
            Start in Advanced Mode
          </button>
        </div>
      </div>
    </div>
  {/if}

  <SurfaceModalsWrapper
    bind:datumsModalOpen bind:datumsModalPos bind:datumsModalPanelEl bind:datumPick
    bind:csysCreateMode bind:csysOriginPoint bind:csysXPoint bind:csysYPoint bind:csysFromLine bind:csysCopyIdx bind:csysRelocateIdx bind:csysRelocatePointIdx
    bind:planeCreateMode bind:planeP0 bind:planeP1 bind:planeP2 bind:planeNormalVec bind:planeOffsetSurface bind:planeOffsetDist bind:planeLineA bind:planeLineB bind:planeDirPoint bind:planeDirVec bind:planeCsysIdx bind:planePrincipal
    {datumPickHint} {startDatumsModalDrag} {armDatumPick} {addDatumCsys} {relocateCsysToPoint} {addDatumPlane} {csys} {planes}
    bind:createGeometryModalOpen bind:createGeomModalPanelEl pointsCount={points.length} minLinePoints={minPointsFor.line} minSurfacePoints={minPointsFor.surface}
    {creatorHint} {surfaceFlowHint} bind:surfaceDraft {surfaceDraftRequired} bind:surfaceCreateKind bind:creatorPick {points} {edges}
    {beginSurfacePick} {createSurfaceFromDraft} addPointsBatch={addPointsBatch} connectPointsByIndex={connectPointsByIndex} deletePointCascade={deletePointCascade} deleteLineOnly={deleteLineOnly} deleteSurfaceOnly={deleteSurfaceOnly} toggleSurfaceDraftPoint={toggleSurfaceDraftPoint} addSurfaceDraftFromLine={addSurfaceDraftFromLine} {finishContourSurface}
    bind:surfaceCurveOpsModalOpen bind:surfCurveModalPanelEl bind:selectedEntity bind:lineInsertT bind:lineInsertPickMode bind:toolCursor
    bind:offsetSurfaceIdx bind:offsetSurfaceDist bind:offsetCurveIdx bind:offsetCurveSurfaceIdx bind:offsetCurveDist bind:offsetCurveFlip bind:offsetCurveStatus
    {insertPointOnEdge} {setToolCursor} {offsetSurfaceCreate} {offsetCurveOnSurfaceCreate}
    bind:extrudeModalOpen bind:extrudeTarget bind:extrudeLineIdx bind:extrudeCurveIdx bind:extrudeDirMode bind:extrudeDistance bind:extrudeVector bind:extrudeSurfaceIdx bind:extrudeFlip {extrudeLineOrCurve}
    bind:healingModalOpen bind:healingModalPanelEl bind:healTol {runTopologyHealing}
    bind:settingsOpen bind:showSelectionLabels bind:showPointEntities bind:showLineEntities bind:showSurfaceEntities bind:showDatumEntities
    bind:snapEndpoints bind:snapMidpoints bind:snapCurveNearest bind:snapSurfaceProjection bind:snapThresholdPx
  />

  {#if deletePreviewOpen && deletePreview}
    <div class="fixed inset-0 z-[355] flex items-center justify-center bg-black/55 backdrop-blur-[1px]">
      <div class="w-[520px] max-w-[92vw] rounded-2xl border border-white/15 bg-slate-950/95 shadow-2xl p-5 space-y-4">
        <div class="text-sm font-semibold tracking-wide text-white/90">Delete Selection</div>
        <div class="text-[12px] text-white/65">
          This action removes selected geometry and dependent lines from point cascade.
        </div>
        <div class="grid grid-cols-3 gap-2 text-[12px]">
          <div class="rounded-lg border border-white/10 bg-white/5 p-2">
            <div class="text-white/50 uppercase tracking-widest text-[10px]">Points</div>
            <div class="text-white/90 font-semibold">{deletePreview.pointIds.length}</div>
          </div>
          <div class="rounded-lg border border-white/10 bg-white/5 p-2">
            <div class="text-white/50 uppercase tracking-widest text-[10px]">Lines</div>
            <div class="text-white/90 font-semibold">{deletePreview.lineIds.length}</div>
          </div>
          <div class="rounded-lg border border-white/10 bg-white/5 p-2">
            <div class="text-white/50 uppercase tracking-widest text-[10px]">Cascade Lines</div>
            <div class="text-amber-200 font-semibold">{deletePreview.cascadeLineIds.length}</div>
          </div>
        </div>
        <div class="rounded-lg border border-white/10 bg-black/20 p-3 text-[12px] text-white/75">
          Post-delete: {deletePreview.afterPoints} points, {deletePreview.afterLines} lines.
          Total line deletions: {deletePreview.totalLineDeletes}.
        </div>
        <div class="flex justify-end gap-2">
          <button class="btn btn-sm variant-soft" onclick={closeDeletePreview}>Cancel</button>
          <button class="btn btn-sm variant-soft bg-rose-500/20 border-rose-400/40 text-rose-100" onclick={applyDeletePreview}>
            Confirm Delete
          </button>
        </div>
      </div>
    </div>
  {/if}

  <SurfaceCommandPalette
    open={commandPaletteOpen}
    commands={surfaceCommands}
    onClose={() => (commandPaletteOpen = false)}
  />
</div>
<style>
  .surface-theme-technical {
    --surface-theme-accent: rgba(103, 232, 249, 0.45);
    --surface-theme-ring: rgba(56, 189, 248, 0.2);
    --surface-theme-bg: radial-gradient(circle at 12% 20%, rgba(45, 212, 191, 0.12), transparent 42%);
  }

  .surface-theme-studio {
    --surface-theme-accent: rgba(244, 114, 182, 0.42);
    --surface-theme-ring: rgba(236, 72, 153, 0.24);
    --surface-theme-bg: radial-gradient(circle at 16% 24%, rgba(236, 72, 153, 0.16), transparent 44%),
      radial-gradient(circle at 82% 12%, rgba(14, 165, 233, 0.12), transparent 36%);
  }

  .surface-theme-high-contrast {
    --surface-theme-accent: rgba(250, 204, 21, 0.52);
    --surface-theme-ring: rgba(251, 191, 36, 0.28);
    --surface-theme-bg: radial-gradient(circle at 10% 18%, rgba(250, 204, 21, 0.14), transparent 38%);
  }

  .surface-theme-aurora {
    --surface-theme-accent: rgba(110, 231, 183, 0.5);
    --surface-theme-ring: rgba(52, 211, 153, 0.24);
    --surface-theme-bg: radial-gradient(circle at 14% 20%, rgba(56, 189, 248, 0.16), transparent 40%),
      radial-gradient(circle at 82% 14%, rgba(52, 211, 153, 0.16), transparent 36%);
  }

  .surface-lab.surface-theme-technical,
  .surface-lab.surface-theme-studio,
  .surface-lab.surface-theme-high-contrast,
  .surface-lab.surface-theme-aurora {
    background-image: var(--surface-theme-bg);
    border-radius: 16px;
    padding: 12px;
  }

  .surface-lab.surface-theme-technical .glass-panel,
  .surface-lab.surface-theme-studio .glass-panel,
  .surface-lab.surface-theme-high-contrast .glass-panel,
  .surface-lab.surface-theme-aurora .glass-panel {
    border-color: var(--surface-theme-ring);
    box-shadow: inset 0 0 0 1px var(--surface-theme-ring), 0 6px 24px rgba(2, 6, 23, 0.22);
  }

  .surface-lab.surface-theme-technical .surface-accent-rule,
  .surface-lab.surface-theme-studio .surface-accent-rule,
  .surface-lab.surface-theme-high-contrast .surface-accent-rule,
  .surface-lab.surface-theme-aurora .surface-accent-rule {
    color: color-mix(in srgb, white 65%, var(--surface-theme-accent));
  }
</style>
