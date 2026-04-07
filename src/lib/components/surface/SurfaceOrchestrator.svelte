<script lang="ts">
import { onMount } from 'svelte';
import autoAnimate from '@formkit/auto-animate';
import SurfaceActionBar from './SurfaceActionBar.svelte';
import SurfaceRightRail from './SurfaceRightRail.svelte';
import SurfaceCanvas from './SurfaceCanvas.svelte';
import { themeStore } from '$lib/stores/themeStore';
import { toast } from '../../ui/toast';
import { analyzeSurfaceIntegrity } from './SurfaceIntegrityAnalyzer';
import { computeDecimatedEdges, computeDecimatedPointIds, nearestEdgeHitProjected } from './SurfacePerformance';
import { SURFACE_MOTION_SPEC, linePickState, nextCreateModeState, nextSelectionModeState, surfacePickState, transitionToolCursor, centeredModalPos, draggedModalPos, dragOffsetFromPointer, registerContextMenu, buildSurfaceNavMenu, mountSurfaceGlobalHandlers, mountSurfaceViewportInteraction, readPersistedCoreMode, readPersistedRightRailCollapsed, readWorkspaceUiState, writeWorkspaceUiState, hasSeenCoreModePrompt, markCoreModePromptSeen, persistCoreMode, persistRightRailCollapsed, loadWorkspaceRecipes, saveWorkspaceRecipes, createSnapshot, materializeSnapshot, canHistoryRedo, canHistoryUndo, popHistoryRedo, popHistoryUndo, pushHistoryUndo, buildLoftSegments, projectPoint, viewportFitToScreen, applySelectionHits, hitsInRect, hitsInLasso, buildSliceSyncModel, buildSurfaceCsv, readSurfaceCsvFile, readSurfaceStepFile, triggerCsvDownload, triggerJsonDownload, buildCombinedSliceCsv, buildSliceMetadataSidecar, computeDatumPlaneSlices, toStatusFromIntersection, toStatusFromSliceWarnings, buildSlicingRuntimeWarning, dispatchWarningToasts, mergeWarningsUntracked, createRecipeRun, recipeStepLabel, advanceRecipeRunUntilPause, findRecipeForRun, beginRecipeTransaction, finalizeRecipeTransaction, rollbackRecipeTransaction, motionMs, findBestSnapCandidate, makeHoverModeKey, nearestPointIndex, shouldProcessHover, shouldRecomputeHover, snapCandidateSignature, createDatumCsys as createDatumCsysDep, createDatumPlane as createDatumPlaneDep, planeBasis, surfaceNormal, vecAdd, vecScale, vecUnit, buildHoverTooltip, computeCurveOffsetBestEffort, cylKeepInliersController, cylRemoveOutliersController, cylSelectOutliersController, cylThresholdAbsController, deleteSelectedRecipeController, saveCurrentRecipeController, selectRecipeController, selectedRecipeController, snapshotRecipeConfigController, toggleSelectedRecipeStepController, applyRecipeConfigController, bilerp, clamp, deg, lerp3, vecNorm, vecSub, edgeExists, activeFitPointIds, computeCylinderAxisSegment, computeCylinderEvaluation, computePlaneEvaluation, computeSectionSliceEvaluation } from './SurfaceOrchestratorDeps';
import { cancelRecipeRunUi, runRecipeNextStepUi, runRecipeUntilPauseUi, startRecipeRunUi } from './controllers/SurfaceRecipeRunUiController';
import { computeCylinderFitUi, computeDatumSlicesUi, computeSectionSlicesUi, computeSurfaceEvalUi, emitStatusWarningsUi, exportDatumSliceCombinedUi } from './controllers/SurfaceEvaluationUiController';
import { depthOpacityUi, pickOrbitPivotUi, pointDepthOpacityUi, rotateForViewUi, surfaceDepthOpacityUi } from './controllers/SurfaceViewportMathController';
import type { DatumSliceMode, DatumSliceRunResult, SurfaceStatusWarning, RecipeRunState, SurfaceRecipe, SurfaceRecipeConfig, SurfaceRecipeStep, RecipeTransaction, ToolCursorMode, SnapCandidate, IntersectionDiagnostics, HoverTooltip, Curve, DatumCsys, DatumPlane, Edge, Point3D, SurfaceFace, Snapshot } from './SurfaceOrchestratorDeps';
import type { RendererMode } from '$lib/surface/renderer/types';
import * as Logic from './SurfaceOrchestratorLogic.svelte';
let lastAction = $state<string>('init');
const setLastAction = (a: string) => { lastAction = a; }, SURFACE_ANALYTICS_ENABLED = false;
type SelectionMode = 'none' | 'box' | 'lasso'; type SelectionProfile = 'precision' | 'assisted';
type SurfaceUxLevel = 'beginner' | 'expert';
type OffsetPreviewSegment = { a: Point3D; b: Point3D };
type OffsetPreviewState = {
  edgeIdx: number | null;
  surfaceIdx: number | null;
  distance: number;
  flip: boolean;
};
type OffsetGuidanceMode = 'manual' | 'single_click_guided';
type OffsetWorkflowPickMode = null | 'lineA' | 'surfaceA' | 'lineB' | 'surfaceB';
type OffsetWizardStage = 'lineA' | 'surfaceA' | 'lineB' | 'surfaceB' | 'ready';
type OffsetToastKey = 'surfaceA' | 'lineB' | 'surfaceB' | 'ready' | null;
const DEFAULT_STARTUP_POINTS: Point3D[] = [
  { x: 0, y: 0, z: 0 },
  { x: 5, y: 0, z: 0 },
  { x: 5, y: 10, z: 0 },
  { x: 0, y: 10, z: 0 }
];
const DEFAULT_STARTUP_EDGES: Edge[] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0]
];
const DEFAULT_STARTUP_SURFACES: SurfaceFace[] = [
  { name: 'Rectangle 5x10', pts: [0, 1, 2, 3], vertexIds: [0, 1, 2, 3] }
];
let points = $state<Point3D[]>(DEFAULT_STARTUP_POINTS), edges = $state<Edge[]>(DEFAULT_STARTUP_EDGES), curves = $state<Curve[]>([]), surfaces = $state<SurfaceFace[]>(DEFAULT_STARTUP_SURFACES);
let csys = $state<DatumCsys[]>([{ name: 'Global', origin: { x: 0, y: 0, z: 0 }, xAxis: { x: 1, y: 0, z: 0 }, yAxis: { x: 0, y: 1, z: 0 }, zAxis: { x: 0, y: 0, z: 1 } }]), planes = $state<DatumPlane[]>([]);
let activeEdgeIdx = $state<number | null>(0), activeCurveIdx = $state<number | null>(null), pendingPointIdx = $state<number | null>(null), loftA = $state<number | null>(null), loftB = $state<number | null>(null);
let loftErr = $state<string | null>(null), loftSegments = $state<{ a: Point3D; b: Point3D }[]>([]);
let samplerAppend = $state<boolean>(true), samplerMode = $state<'quad' | 'edges'>('quad'), samplerNu = $state<number>(12), samplerNv = $state<number>(12), samplerEdgeSegs = $state<number>(8), samplerErr = $state<string | null>(null);
let selectionMode = $state<SelectionMode>('none'), selectionProfile = $state<SelectionProfile>('precision'), toolCursor = $state<ToolCursorMode>('select'), selectedPointIds = $state<number[]>([]);
let selectedLineIds = $state<number[]>([]);
let exactSelectionPointIds = $state<number[]>([]);
let selectedSet = $derived.by(() => new Set(selectedPointIds)), selectedLineSet = $derived.by(() => new Set(selectedLineIds)), pointBaseRadius = $derived(selectionProfile === 'assisted' ? 6 : 5), edgeHitWidth = $derived(selectionProfile === 'assisted' ? 12 : 9), pointPriorityPx = $derived(selectionProfile === 'assisted' ? 18 : 14);
let selectedEntityCount = $derived(selectedPointIds.length + selectedLineIds.length);
let selecting = $state(false), selStart = $state<{ x: number; y: number } | null>(null), selRect = $state<{ x0: number; y0: number; x1: number; y1: number } | null>(null), lasso = $state<{ x: number; y: number }[]>([]);
let snapEndpoints = $state(true), snapMidpoints = $state(false), snapCurveNearest = $state(false), snapSurfaceProjection = $state(false), snapThresholdPx = $state(16);
let transformDx = $state(0), transformDy = $state(0), transformDz = $state(0);
let transformLockX = $state(false), transformLockY = $state(false), transformLockZ = $state(false);
let transformRotateDeg = $state(0), transformAnchorMode = $state<Logic.TransformAnchorMode>('centroid');
let activeSnap = $state<SnapCandidate | null>(null), hoverTooltip = $state<HoverTooltip | null>(null), hoverRaf = 0, hoverQueued = $state<{ x: number; y: number } | null>(null), draftCursor = $state<{ x: number; y: number } | null>(null);
let surfacePointPreview = $state<{ screen: { x: number; y: number }; world: Point3D; surfaceIdx: number } | null>(null);
let lastHoverPos = $state<{ x: number; y: number }>({ x: Number.NaN, y: Number.NaN }), lastHoverModeKey = $state(''), lastSnapSig = $state('none');
let lastHoverProcessTs = 0;
let undoStack = $state<Snapshot[]>([]), redoStack = $state<Snapshot[]>([]), canUndo = $derived(canHistoryUndo({ undoStack, redoStack })), canRedo = $derived(canHistoryRedo({ undoStack, redoStack }));
let createPtX = $state(0), createPtY = $state(0), createPtZ = $state(0), createLineA = $state<number | null>(null), createLineB = $state<number | null>(null);
let surfaceDraft = $state<number[]>([]), surfaceCreateKind = $state<'triangle' | 'quad' | 'contour'>('quad'), createMode = $state<'idle' | 'point' | 'line' | 'surface'>('idle');
let lineDaisyChainMode = $state(false);
let viewportHudExpanded = $state(false), viewportHudTab = $state<'build' | 'offset' | 'precision'>('build'), viewportHudDock = $state<'left' | 'right'>('left');
let creatorPick = $state<null | { kind: 'line'; slot: 'A' | 'B' } | { kind: 'surface'; slot: number }>(null), datumPick = $state<null | { target: 'csys3' | 'csysPointLine'; slot: 'origin' | 'x' | 'y' | 'line' }>(null), lineInsertPickMode = $state(false);
let selectedEntity = $state<null | { kind: 'point' | 'line' | 'surface' | 'plane' | 'csys'; index: number }>(null), settingsOpen = $state(false), coreMode = $state(true), advancedOpen = $state(false), rightRailCollapsed = $state(true);
let uxLevel = $state<SurfaceUxLevel>('beginner');
let uiStateHydrated = $state(false);
let showCoreModePrompt = $state(false), datumsModalOpen = $state(false), createGeometryModalOpen = $state(false), surfaceCurveOpsModalOpen = $state(false), extrudeModalOpen = $state(false), healingModalOpen = $state(false);
let manualPointModalOpen = $state(false);
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
let selEdgeA = $state<number | null>(0), selEdgeB = $state<number | null>(3), offsetDist = $state(5), refPointIdx = $state<number>(0), intersection = $state<{ p: Point3D; skew: number } | null>(null), intersectionBusy = $state(false);
let intersectionDiagnostics = $state<IntersectionDiagnostics>({ severity: null, message: null, angleDeg: null, skew: null, recommendations: [] });
let offsetLineA = $state<OffsetPreviewState>({ edgeIdx: null, surfaceIdx: null, distance: 5, flip: false });
let offsetLineB = $state<OffsetPreviewState>({ edgeIdx: null, surfaceIdx: null, distance: 2.5, flip: false });
let offsetWorkflowPickMode = $state<OffsetWorkflowPickMode>(null);
let svgEl = $state<SVGSVGElement | null>(null), viewportEl = $state<HTMLDivElement | null>(null), vpMenuOpen = $state(false), vpMenuX = $state(0), vpMenuY = $state(0), w = $state(900), h = $state(600);
let contextTargetKind = $state<'point' | 'line' | 'surface' | 'empty'>('empty'), contextTargetIndex = $state<number | null>(null);
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
let rendererMode = $state<RendererMode>('svg');
let commandPaletteOpen = $state(false);
let performanceMode = $state(false), perfPointBudget = $state(9000), perfEdgeBudget = $state(14000);
let frameMsAvg = $state(0), hitTestMsAvg = $state(0), workerAvailable = $state(false);
let hoverSource = $state<'idle' | 'worker' | 'fallback'>('idle'), workerTimeoutCount = $state(0), autoDegradeLevel = $state(0);
let integrityThreshold = $state(4);
let lastHandledPointClick = $state<{ idx: number; ts: number; modeKey: string } | null>(null);
let offsetWizardStage = $state<OffsetWizardStage>('lineA');
let offsetGuidanceMode = $state<OffsetGuidanceMode>('single_click_guided');
let offsetToastKey = $state<OffsetToastKey>(null);
let hasSeenOffsetGuidanceHint = $state(false);
let offsetToastTimer = 0;
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
let rendererTheme = $derived($themeStore);
let rendererThemeClass = $derived(
  $themeStore === 'studio'
    ? 'surface-theme-studio'
    : $themeStore === 'high-contrast'
      ? 'surface-theme-high-contrast'
      : $themeStore === 'aurora'
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
let selectionInspector = $derived.by(() => {
  const entity = selectedEntity;
  if (!entity) return null;
  if (entity.kind === 'point') {
    const p = points[entity.index];
    if (!p) return null;
    return {
      title: `Point P${entity.index + 1}`,
      detail: `(${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)})`
    };
  }
  if (entity.kind === 'line') {
    const edge = edges[entity.index];
    if (!edge || !points[edge[0]] || !points[edge[1]]) return null;
    const a = points[edge[0]]!;
    const b = points[edge[1]]!;
    const len = vecLen3(vecSub(b, a));
    return {
      title: `Line L${entity.index + 1}`,
      detail: `P${edge[0] + 1} -> P${edge[1] + 1} • len ${len.toFixed(2)}`
    };
  }
  if (entity.kind === 'surface') {
    const sf = surfaces[entity.index];
    if (!sf) return null;
    return {
      title: sf.name ?? `Surface S${entity.index + 1}`,
      detail: `${sf.vertexIds.length} vertices • ${sf.vertexIds.map((idx) => `P${idx + 1}`).join(', ')}`
    };
  }
  if (entity.kind === 'plane') {
    return {
      title: planes[entity.index]?.name ?? `Plane PL${entity.index + 1}`,
      detail: 'Datum plane selected'
    };
  }
  return {
    title: csys[entity.index]?.name ?? `Csys CS${entity.index + 1}`,
    detail: 'Datum coordinate system selected'
  };
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
  exactSelectionPointIds = [];
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
const pointInPolygon2d = (x: number, y: number, pts: { x: number; y: number }[]) => {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i]!.x;
    const yi = pts[i]!.y;
    const xj = pts[j]!.x;
    const yj = pts[j]!.y;
    const intersects = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-9) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
};
const findSurfaceAtScreen = (x: number, y: number) => {
  for (const item of [...sortedSurfaces].reverse()) {
    const pts = item.pts.map((idx) => projected[idx]).filter(Boolean);
    if (pts.length >= 3 && pointInPolygon2d(x, y, pts)) return item.i;
  }
  return null;
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
    const surfaceHitIdx = findSurfaceAtScreen(x, y);
    if (surfaceHitIdx !== null) {
      contextTargetKind = 'surface';
      contextTargetIndex = surfaceHitIdx;
    } else {
      contextTargetKind = 'empty';
      contextTargetIndex = null;
    }
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
const setOffsetSurfaceAContext = (idx: number) => {
  if (!surfaces[idx]) return;
  offsetLineA = { ...offsetLineA, surfaceIdx: idx };
};
const setOffsetSurfaceBContext = (idx: number) => {
  if (!surfaces[idx]) return;
  offsetLineB = { ...offsetLineB, surfaceIdx: idx };
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
const setViewPreset = (preset: 'iso' | 'top' | 'front' | 'right') => {
  if (preset === 'top') rot = { alpha: 0, beta: 1.5702 };
  else if (preset === 'front') rot = { alpha: 0, beta: 0 };
  else if (preset === 'right') rot = { alpha: 1.5708, beta: 0 };
  else rot = { alpha: -0.65, beta: 0.35 };
  fitToScreen();
};
const fitToScreen = () => { const fitted = viewportFitToScreen(points, rot, w, h); if (!fitted) return; zoomK = fitted.zoomK; pan = fitted.pan; };
const panBy = (dx: number, dy: number) => { pan = { x: pan.x + dx, y: pan.y + dy }; };
const rotateBy = (dx: number, dy: number) => { rot = { alpha: rot.alpha + dx * 0.12, beta: rot.beta + dy * 0.12 }; };
const zoomBy = (factor: number) => {
  const next = clamp(zoomK * factor, 0.15, 12);
  zoomK = Number.isFinite(next) ? next : zoomK;
};
const svgCoordsFromEvent = (ev: PointerEvent | MouseEvent) => Logic.svgCoordsFromEvent(ev, svgEl);
const roundCoord = (value: number) => Math.round(value * 1000) / 1000;
const screenToWorldBuildPlane = (x: number, y: number): Point3D | null => {
  const ca = Math.cos(rot.alpha);
  const sa = Math.sin(rot.alpha);
  const cb = Math.cos(rot.beta);
  const sb = Math.sin(rot.beta);
  if (Math.abs(ca) < 1e-4 || Math.abs(cb) < 1e-4) return null;
  const sx = (x - w / 2 - pan.x) / Math.max(1e-9, zoomK);
  const sy = (y - h / 2 - pan.y) / Math.max(1e-9, zoomK);
  const px = sx / ca;
  const py = (sy + px * sa * sb) / cb;
  return { x: roundCoord(px), y: roundCoord(py), z: 0 };
};
const addPointAtWorld = (point: Point3D, toastMessage: string | null = null) => {
  pushUndo();
  const nextIdx = points.length;
  points = [...points, point];
  pendingPointIdx = nextIdx;
  selectedPointIds = [nextIdx];
  selectedEntity = { kind: 'point', index: nextIdx };
  clearIsolation();
  if (toastMessage) toast.success(toastMessage);
  return nextIdx;
};
const addPointFromViewport = (coords: { x: number; y: number }, toastMessage: string | null = null) => {
  const world = screenToWorldBuildPlane(coords.x, coords.y);
  if (!world) {
    toast.warning('Cannot place a point from this camera angle on the build plane. Rotate slightly or refit.');
    return null;
  }
  return addPointAtWorld(world, toastMessage);
};
const barycentricWeights2d = (
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number }
) => {
  const denom = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
  if (Math.abs(denom) < 1e-8) return null;
  const w1 = ((b.y - c.y) * (p.x - c.x) + (c.x - b.x) * (p.y - c.y)) / denom;
  const w2 = ((c.y - a.y) * (p.x - c.x) + (a.x - c.x) * (p.y - c.y)) / denom;
  const w3 = 1 - w1 - w2;
  return { w1, w2, w3 };
};
const surfacePointAtScreen = (x: number, y: number) => {
  const target = { x, y };
  const ordered = [...sortedSurfaces].reverse();
  for (const item of ordered) {
    const surface = surfaces[item.i];
    if (!surface || surface.vertexIds.length < 3) continue;
    const worldPts = surface.vertexIds.map((idx) => points[idx]).filter(Boolean);
    const screenPts = surface.vertexIds.map((idx) => projected[idx]).filter(Boolean);
    if (worldPts.length !== surface.vertexIds.length || screenPts.length !== surface.vertexIds.length) continue;
    for (let i = 1; i < screenPts.length - 1; i++) {
      const sw0 = screenPts[0]!;
      const sw1 = screenPts[i]!;
      const sw2 = screenPts[i + 1]!;
      const weights = barycentricWeights2d(target, sw0, sw1, sw2);
      if (!weights) continue;
      const epsilon = -0.0025;
      if (weights.w1 < epsilon || weights.w2 < epsilon || weights.w3 < epsilon) continue;
      const pw0 = worldPts[0]!;
      const pw1 = worldPts[i]!;
      const pw2 = worldPts[i + 1]!;
      return {
        surfaceIdx: item.i,
        screen: target,
        world: {
          x: pw0.x * weights.w1 + pw1.x * weights.w2 + pw2.x * weights.w3,
          y: pw0.y * weights.w1 + pw1.y * weights.w2 + pw2.y * weights.w3,
          z: pw0.z * weights.w1 + pw1.z * weights.w2 + pw2.z * weights.w3
        }
      };
    }
  }
  return null;
};
const openManualPointModal = (coords?: { x: number; y: number }) => {
  const seed = coords ? screenToWorldBuildPlane(coords.x, coords.y) : null;
  if (seed) {
    createPtX = Number(seed.x.toFixed(3));
    createPtY = Number(seed.y.toFixed(3));
    createPtZ = Number(seed.z.toFixed(3));
  }
  manualPointModalOpen = true;
};
const submitManualPoint = () => {
  createPoint();
  manualPointModalOpen = false;
};
const clearCreationDrafts = () => {
  surfaceDraft = [];
  creatorPick = null;
  createLineA = null;
  createLineB = null;
  pendingPointIdx = null;
  draftCursor = null;
  surfacePointPreview = null;
};
const vecDot3 = (a: Point3D, b: Point3D) => a.x * b.x + a.y * b.y + a.z * b.z;
const vecLen3 = (v: Point3D) => Math.sqrt(vecDot3(v, v));
const vecCross3 = (a: Point3D, b: Point3D): Point3D => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x
});
const midpoint3 = (a: Point3D, b: Point3D): Point3D => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 });
const computeOffsetPreviewSegment = (state: OffsetPreviewState): OffsetPreviewSegment | null => {
  if (state.edgeIdx === null || state.surfaceIdx === null) return null;
  const edge = edges[state.edgeIdx];
  const surface = surfaces[state.surfaceIdx];
  if (!edge || !surface) return null;
  const p0 = points[edge[0]];
  const p1 = points[edge[1]];
  if (!p0 || !p1) return null;
  const lineDir = vecUnit(vecSub(p1, p0));
  const unitNormal = vecUnit(surfaceNormal(surface, points));
  const unit = vecUnit(vecCross3(unitNormal, lineDir));
  if (vecLen3(lineDir) < 1e-8 || vecLen3(unitNormal) < 1e-8 || vecLen3(unit) < 1e-8) return null;
  const signed = Math.abs(state.distance) * (state.flip ? -1 : 1);
  const delta = vecScale(unit, signed);
  return {
    a: vecAdd(p0, delta),
    b: vecAdd(p1, delta)
  };
};
const solveOffsetPreviewIntersection = (aSeg: OffsetPreviewSegment | null, bSeg: OffsetPreviewSegment | null) => {
  if (!aSeg || !bSeg) return null;
  const da = vecSub(aSeg.b, aSeg.a);
  const db = vecSub(bSeg.b, bSeg.a);
  const r = vecSub(aSeg.a, bSeg.a);
  const aa = vecDot3(da, da);
  const bb = vecDot3(db, db);
  const ab = vecDot3(da, db);
  const ar = vecDot3(da, r);
  const br = vecDot3(db, r);
  const denom = aa * bb - ab * ab;
  if (!Number.isFinite(denom) || Math.abs(denom) < 1e-9) return null;
  const ta = (ab * br - bb * ar) / denom;
  const tb = (aa * br - ab * ar) / denom;
  const pa = vecAdd(aSeg.a, vecScale(da, ta));
  const pb = vecAdd(bSeg.a, vecScale(db, tb));
  return {
    p: midpoint3(pa, pb),
    skew: vecLen3(vecSub(pa, pb))
  };
};
const clearOffsetToast = () => {
  offsetToastKey = null;
  if (offsetToastTimer) {
    clearTimeout(offsetToastTimer);
    offsetToastTimer = 0;
  }
};
const emitOffsetToast = (key: OffsetToastKey, title: string) => {
  clearOffsetToast();
  offsetToastKey = key;
  hasSeenOffsetGuidanceHint = true;
  toast.info(title);
  offsetToastTimer = window.setTimeout(() => {
    if (offsetToastKey === key) offsetToastKey = null;
    offsetToastTimer = 0;
  }, 2200);
};
const setOffsetPickMode = (mode: OffsetWorkflowPickMode) => {
  offsetWorkflowPickMode = mode;
  if (mode === 'lineA') offsetWizardStage = 'lineA';
  if (mode === 'surfaceA') offsetWizardStage = 'surfaceA';
  if (mode === 'lineB') offsetWizardStage = 'lineB';
  if (mode === 'surfaceB') offsetWizardStage = 'surfaceB';
  if (mode) toolCursor = 'select';
};
const advanceOffsetWizard = (stage: OffsetWizardStage, autoArm = true) => {
  offsetWizardStage = stage;
  if (!autoArm) {
    offsetWorkflowPickMode = null;
    return;
  }
  if (stage === 'lineA') setOffsetPickMode('lineA');
  else if (stage === 'surfaceA') setOffsetPickMode('surfaceA');
  else if (stage === 'lineB') setOffsetPickMode('lineB');
  else if (stage === 'surfaceB') setOffsetPickMode('surfaceB');
  else offsetWorkflowPickMode = null;
};
const advanceOffsetWizardWithGuidance = (
  stage: OffsetWizardStage,
  options?: { toastKey?: OffsetToastKey; toastTitle?: string; skipToast?: boolean }
) => {
  const guided = offsetGuidanceMode === 'single_click_guided';
  advanceOffsetWizard(stage, guided);
  if (guided && !options?.skipToast && options?.toastKey && options.toastTitle) {
    emitOffsetToast(options.toastKey, options.toastTitle);
  }
};
const clearOffsetWorkflow = () => {
  clearOffsetToast();
  offsetWorkflowPickMode = null;
  offsetWizardStage = 'lineA';
  offsetLineA = { ...offsetLineA, edgeIdx: null, surfaceIdx: null };
  offsetLineB = { ...offsetLineB, edgeIdx: null, surfaceIdx: null };
  intersection = null;
  intersectionDiagnostics = { severity: null, message: null, angleDeg: null, skew: null, recommendations: [] };
};
let viewportFlowHint = $derived.by(() => {
  if (createMode === 'point') {
    if (surfacePointPreview) return `Click to place on surface S${surfacePointPreview.surfaceIdx + 1}. Click off-surface to type X, Y, Z.`;
    return 'Hover a surface to snap a point. Click off-surface to enter X, Y, Z manually.';
  }
  if (offsetWorkflowPickMode === 'lineA') return 'Offset step 1: click the first source line.';
  if (offsetWorkflowPickMode === 'surfaceA') return 'Offset step 2: click the support surface for line A.';
  if (offsetWorkflowPickMode === 'lineB') return 'Offset step 3: click the second source line.';
  if (offsetWorkflowPickMode === 'surfaceB') return 'Offset step 4: click the support surface for line B.';
  if (toolCursor === 'line' && createLineA !== null) return 'Click another point or empty canvas to finish the line';
  if (toolCursor === 'line') return 'Click a point or empty canvas to start a line';
  if (toolCursor === 'surface' && surfaceCreateKind === 'contour' && surfaceDraft.length >= 3) return 'Click the first point again or press Enter to close the contour';
  if (toolCursor === 'surface') return 'Click points or empty canvas to chain the surface boundary';
  return 'Viewport-first flow: click directly in the canvas to build geometry';
});
let offsetPreviewA = $derived.by(() => computeOffsetPreviewSegment(offsetLineA));
let offsetPreviewB = $derived.by(() => computeOffsetPreviewSegment(offsetLineB));
let offsetPreviewIntersection = $derived.by(() => solveOffsetPreviewIntersection(offsetPreviewA, offsetPreviewB));
let displayIntersection = $derived.by(() => offsetPreviewIntersection ?? intersection);
let offsetWorkflowStatus = $derived.by(() => {
  if (offsetLineA.edgeIdx === null || offsetLineA.surfaceIdx === null) {
    return { severity: 'info', label: 'Set line A and surface A' as string };
  }
  if (offsetLineB.edgeIdx === null || offsetLineB.surfaceIdx === null) {
    return { severity: 'info', label: 'Set line B and surface B' as string };
  }
  if (!offsetPreviewA || !offsetPreviewB) {
    return { severity: 'warning', label: 'Offset preview is invalid' as string };
  }
  if (!offsetPreviewIntersection) {
    return { severity: 'error', label: 'Offset lines are parallel / no crossing' as string };
  }
  if (offsetPreviewIntersection.skew > 1e-3) {
    return { severity: 'warning', label: `Crossing ready (skew ${offsetPreviewIntersection.skew.toExponential(2)})` as string };
  }
  return { severity: 'success', label: 'Crossing ready' as string };
});
let offsetLineSummary = $derived.by(() => {
  const a = offsetLineA.edgeIdx !== null && edges[offsetLineA.edgeIdx] ? `L${offsetLineA.edgeIdx + 1}` : 'Line A: pick';
  const sa = offsetLineA.surfaceIdx !== null && surfaces[offsetLineA.surfaceIdx] ? `S${offsetLineA.surfaceIdx + 1}` : 'surface?';
  const b = offsetLineB.edgeIdx !== null && edges[offsetLineB.edgeIdx] ? `L${offsetLineB.edgeIdx + 1}` : 'Line B: pick';
  const sb = offsetLineB.surfaceIdx !== null && surfaces[offsetLineB.surfaceIdx] ? `S${offsetLineB.surfaceIdx + 1}` : 'surface?';
  return `${a} on ${sa} • ${b} on ${sb}`;
});
let offsetIntersectionSummary = $derived.by(() => {
  if (!offsetPreviewIntersection) return 'Crossing pending';
  const { p } = offsetPreviewIntersection;
  return `P = (${p.x.toFixed(3)}, ${p.y.toFixed(3)}, ${p.z.toFixed(3)})`;
});
let offsetInteractionHint = $derived.by(() => {
  if (offsetWorkflowPickMode === 'lineA') return 'Pick the first line to offset.';
  if (offsetWorkflowPickMode === 'surfaceA') return 'Pick the surface that controls line A direction.';
  if (offsetWorkflowPickMode === 'lineB') return 'Pick the second line to offset.';
  if (offsetWorkflowPickMode === 'surfaceB') return 'Pick the surface that controls line B direction.';
  if (offsetPreviewIntersection) return `Preview crossing ready (skew ${offsetPreviewIntersection.skew.toExponential(2)}). Place it when ready.`;
  return 'Offset two lines independently along chosen surfaces, then place the crossing point.';
});
let offsetWizardTitle = $derived.by(() => {
  if (offsetWizardStage === 'lineA') return 'Step 1: Pick Line A';
  if (offsetWizardStage === 'surfaceA') return 'Step 2: Pick Surface A';
  if (offsetWizardStage === 'lineB') return 'Step 3: Pick Line B';
  if (offsetWizardStage === 'surfaceB') return 'Step 4: Pick Surface B';
  return 'Step 5: Place Crossing Point';
});
let offsetWizardHint = $derived.by(() => {
  if (offsetWizardStage === 'lineA') return 'Click the first source line in the viewport.';
  if (offsetWizardStage === 'surfaceA') return 'Click the surface that defines the offset direction for line A.';
  if (offsetWizardStage === 'lineB') return 'Click the second source line in the viewport.';
  if (offsetWizardStage === 'surfaceB') return 'Click the surface that defines the offset direction for line B.';
  if (offsetPreviewIntersection) return 'Review the preview crossing, then place the point.';
  return 'The two offset lines do not cross yet. Re-pick a line or surface if needed.';
});
let offsetWizardBreadcrumb = $derived.by(() => {
  const items = [
    { key: 'lineA', label: 'A line' },
    { key: 'surfaceA', label: 'A surface' },
    { key: 'lineB', label: 'B line' },
    { key: 'surfaceB', label: 'B surface' },
    { key: 'ready', label: 'place point' }
  ];
  return items;
});
let offsetWizardStepIndex = $derived.by(() => {
  const idx = offsetWizardBreadcrumb.findIndex((crumb) => crumb.key === offsetWizardStage);
  return idx < 0 ? 0 : idx;
});
let offsetGuidanceToastMessage = $derived.by(() => {
  if (offsetToastKey === 'surfaceA') return 'Now pick Surface A';
  if (offsetToastKey === 'lineB') return 'Now pick Line B';
  if (offsetToastKey === 'surfaceB') return 'Now pick Surface B';
  if (offsetToastKey === 'ready') return 'Offset previews ready. Place the crossing point.';
  return null;
});
let builderModeBadge = $derived.by(() => {
  if (offsetWorkflowPickMode || offsetLineA.edgeIdx !== null || offsetLineB.edgeIdx !== null) return 'Offset Builder';
  if (createMode === 'point') return 'Point Builder';
  if (toolCursor === 'line') return 'Line Builder';
  if (toolCursor === 'surface') return 'Surface Builder';
  return 'Navigate';
});
let builderStepBadge = $derived.by(() => {
  if (offsetBuilderOpen) {
    if (offsetWizardStage === 'lineA') return 'Step 1 of 5';
    if (offsetWizardStage === 'surfaceA') return 'Step 2 of 5';
    if (offsetWizardStage === 'lineB') return 'Step 3 of 5';
    if (offsetWizardStage === 'surfaceB') return 'Step 4 of 5';
    if (offsetWizardStage === 'ready') return 'Step 5 of 5';
  }
  if (toolCursor === 'line' && createLineA !== null) return 'Step 2 of 2';
  if (toolCursor === 'line') return 'Step 1 of 2';
  if (toolCursor === 'surface') return `Boundary ${surfaceDraft.length + 1}`;
  if (createMode === 'point') return 'Step 1 of 1';
  return 'Ready';
});
let builderPrimaryAction = $derived.by(() => {
  if (offsetWorkflowPickMode === 'lineA') return 'Pick the first source line';
  if (offsetWorkflowPickMode === 'surfaceA') return 'Pick the surface that offsets line A';
  if (offsetWorkflowPickMode === 'lineB') return 'Pick the second source line';
  if (offsetWorkflowPickMode === 'surfaceB') return 'Pick the surface that offsets line B';
  if (createMode === 'point') {
    return surfacePointPreview
      ? `Click to place on surface S${surfacePointPreview.surfaceIdx + 1}`
      : 'Hover a surface, then click to place a point';
  }
  if (toolCursor === 'line' && createLineA !== null) return 'Pick the second point to finish the line';
  if (toolCursor === 'line') return 'Pick the first point to start the line';
  if (toolCursor === 'surface' && surfaceCreateKind === 'contour' && surfaceDraft.length >= 3) return 'Pick the first point again, or click Finish Surface';
  if (toolCursor === 'surface') return 'Pick boundary points in order around the surface';
  return 'Rotate, pan, or choose a build mode';
});
let offsetBuilderOpen = $derived.by(() =>
  offsetWorkflowPickMode !== null ||
  offsetLineA.edgeIdx !== null ||
  offsetLineA.surfaceIdx !== null ||
  offsetLineB.edgeIdx !== null ||
  offsetLineB.surfaceIdx !== null
);
let snapControlsVisible = $derived.by(() =>
  createMode === 'point' || toolCursor === 'line' || toolCursor === 'surface'
);
let selectedPointSequence = $derived.by(() =>
  [...new Set((exactSelectionPointIds.length ? exactSelectionPointIds : selectedPointIds))].filter((idx) => idx >= 0 && idx < points.length)
);
let selectedSurfaceCopyIds = $derived.by(() => {
  if (selectedEntity?.kind === 'surface' && surfaces[selectedEntity.index]) return [selectedEntity.index];
  return [];
});
let exactGeometryHint = $derived.by(() => {
  if (selectedPointSequence.length === 0) return 'Select points to unlock exact line and surface creation.';
  if (selectedPointSequence.length === 1) return `P${selectedPointSequence[0] + 1} selected. Pick one more point for an exact line.`;
  if (selectedPointSequence.length === 2) return `P${selectedPointSequence[0] + 1} -> P${selectedPointSequence[1] + 1} ready for an exact line.`;
  if (selectedPointSequence.length === 3) return '3 points selected. Exact triangle surface is ready.';
  if (selectedPointSequence.length === 4) return '4 points selected. Exact quad surface is ready.';
  return `${selectedPointSequence.length} points selected. Exact contour surface is ready.`;
});
let transformHint = $derived.by(() => {
  if (selectedPointSequence.length === 0) return 'Select points to move or copy them by an exact vector.';
  const plural = selectedPointSequence.length === 1 ? '' : 's';
  const activeLocks = [
    transformLockX ? 'X' : null,
    transformLockY ? 'Y' : null,
    transformLockZ ? 'Z' : null
  ].filter(Boolean);
  const lockHint = activeLocks.length ? ` Locks: ${activeLocks.join('/')}.` : '';
  return `${selectedPointSequence.length} point${plural} ready for Move / Copy by (${transformDx}, ${transformDy}, ${transformDz}).${lockHint}`;
});
let geometryMoveHint = $derived.by(() => {
  const selectedLines = selectedLineIds.length;
  const selectedSurfaces = selectedSurfaceCopyIds.length;
  if (selectedPointSequence.length === 0 && selectedLines === 0 && selectedSurfaces === 0) {
    return 'Select points, lines, or one surface to move linked geometry by an exact vector.';
  }
  const activeLocks = [
    transformLockX ? 'X' : null,
    transformLockY ? 'Y' : null,
    transformLockZ ? 'Z' : null
  ].filter(Boolean);
  const lockHint = activeLocks.length ? ` Axis locks: ${activeLocks.join('/')}.` : '';
  return `${selectedPointSequence.length} point${selectedPointSequence.length === 1 ? '' : 's'}, ${selectedLines} line${selectedLines === 1 ? '' : 's'}, ${selectedSurfaces} surface${selectedSurfaces === 1 ? '' : 's'} queued for Move Geometry.${lockHint}`;
});
let geometryCopyHint = $derived.by(() => {
  const selectedLines = selectedLineIds.length;
  const selectedSurfaces = selectedSurfaceCopyIds.length;
  if (selectedPointSequence.length === 0 && selectedLines === 0 && selectedSurfaces === 0) {
    return 'Select points, lines, or one surface to duplicate topology by an exact vector.';
  }
  const activeLocks = [
    transformLockX ? 'X' : null,
    transformLockY ? 'Y' : null,
    transformLockZ ? 'Z' : null
  ].filter(Boolean);
  const lockHint = activeLocks.length ? ` Axis locks: ${activeLocks.join('/')}.` : '';
  return `${selectedPointSequence.length} point${selectedPointSequence.length === 1 ? '' : 's'}, ${selectedLines} line${selectedLines === 1 ? '' : 's'}, ${selectedSurfaces} surface${selectedSurfaces === 1 ? '' : 's'} queued for Copy Geometry.${lockHint}`;
});
let rotationHint = $derived.by(() => {
  const selectedLines = selectedLineIds.length;
  const selectedSurfaces = selectedSurfaceCopyIds.length;
  const hasSelection = selectedPointSequence.length > 0 || selectedLines > 0 || selectedSurfaces > 0;
  if (!hasSelection) return 'Select points, lines, or one surface to rotate around an anchor.';
  return `Rotate ${transformRotateDeg}° around ${transformAnchorMode} anchor.`;
});
let mirrorHint = $derived.by(() => {
  const selectedLines = selectedLineIds.length;
  const selectedSurfaces = selectedSurfaceCopyIds.length;
  const hasSelection = selectedPointSequence.length > 0 || selectedLines > 0 || selectedSurfaces > 0;
  if (!hasSelection) return 'Select points, lines, or one surface to mirror around an anchor axis.';
  return `Mirror around the ${transformAnchorMode} anchor using anchored X or Y axis.`;
});
let mirrorCopyHint = $derived.by(() => {
  const selectedLines = selectedLineIds.length;
  const selectedSurfaces = selectedSurfaceCopyIds.length;
  const hasSelection = selectedPointSequence.length > 0 || selectedLines > 0 || selectedSurfaces > 0;
  if (!hasSelection) return 'Select points, lines, or one surface to create a mirrored copy.';
  return `Duplicate selection as a mirrored copy around the ${transformAnchorMode} anchor.`;
});
let rotationCopyHint = $derived.by(() => {
  const selectedLines = selectedLineIds.length;
  const selectedSurfaces = selectedSurfaceCopyIds.length;
  const hasSelection = selectedPointSequence.length > 0 || selectedLines > 0 || selectedSurfaces > 0;
  if (!hasSelection) return 'Select points, lines, or one surface to duplicate as a rotated copy.';
  return `Duplicate selection as a ${transformRotateDeg}° rotated copy around ${transformAnchorMode}.`;
});
let buildPrereqHint = $derived.by(() => {
  if (points.length === 0) return 'Start by placing points on a surface, or click off-surface to enter exact coordinates.';
  if (points.length < 2) return 'Need 2 points before line creation becomes available.';
  if (points.length < 3) return 'Need 3 points before surface creation becomes available.';
  if (toolCursor === 'line' && createLineA !== null) return 'Pick one more point to finish the line.';
  if (toolCursor === 'surface' && surfaceDraft.length > 0) return `Surface draft has ${surfaceDraft.length} point${surfaceDraft.length === 1 ? '' : 's'} in order.`;
  return 'Choose a build mode, then click directly in the viewport.';
});
let effectiveShowSelectionLabels = $derived.by(() => {
  if (!showSelectionLabels) return false;
  if (uxLevel === 'expert') return true;
  return !!selectedBadge;
});
const applySelectionFromHits = (hits: number[], ev: PointerEvent | MouseEvent) => { selectedPointIds = Logic.applySelectionFromHits(hits, selectedPointIds, { shiftKey: ev.shiftKey, altKey: ev.altKey }); };
const exportCSV = () => { const csv = buildSurfaceCsv(points, edges); triggerCsvDownload(csv, 'surface-data.csv'); };
const exportSTEP = () => { toast.info('STEP export not yet implemented'); };
const createPoint = () => { pushUndo(); points = [...points, { x: createPtX, y: createPtY, z: createPtZ }]; toast.success(`Created point ${points.length - 1}`); };
const createLineFromSelection = () => {
  if (selectedPointSequence.length !== 2) {
    toast.info('Select exactly 2 points to create an exact line.');
    return;
  }
  const [a, b] = selectedPointSequence;
  connectPointsByIndex(a, b);
};
const createSurfaceFromSelection = () => {
  if (selectedPointSequence.length < 3) {
    toast.info('Select at least 3 points to create an exact surface.');
    return;
  }
  const nextKind =
    selectedPointSequence.length === 3
      ? 'triangle'
      : selectedPointSequence.length === 4
        ? 'quad'
        : 'contour';
  surfaceCreateKind = nextKind;
  surfaceDraft = [...selectedPointSequence];
  createSurfaceFromDraft();
};
const exactTransformDelta = () =>
  Logic.applyAxisLocksToDelta(
    { x: Number(transformDx) || 0, y: Number(transformDy) || 0, z: Number(transformDz) || 0 },
    { x: transformLockX, y: transformLockY, z: transformLockZ }
  );
const exactTransformAnchor = () =>
  Logic.resolveTransformAnchor({
    points,
    pointIds: [
      ...selectedPointSequence,
      ...selectedLineIds.flatMap((lineIdx) => edges[lineIdx] ? [edges[lineIdx]![0], edges[lineIdx]![1]] : []),
      ...selectedSurfaceCopyIds.flatMap((surfaceIdx) => surfaces[surfaceIdx]?.vertexIds ?? [])
    ],
    mode: transformAnchorMode,
    lastSelectedPointId: selectedPointSequence[selectedPointSequence.length - 1] ?? pendingPointIdx
  });
const moveSelectedPointsByVector = () => {
  if (!selectedPointSequence.length) {
    toast.info('Select at least one point to move.');
    return;
  }
  const delta = exactTransformDelta();
  if (delta.x === 0 && delta.y === 0 && delta.z === 0) {
    toast.info('Set a non-zero move vector.');
    return;
  }
  const selectedSetLocal = new Set(selectedPointSequence);
  pushUndo();
  points = points.map((point, idx) => (
    selectedSetLocal.has(idx)
      ? { x: point.x + delta.x, y: point.y + delta.y, z: point.z + delta.z }
      : point
  ));
  pendingPointIdx = selectedPointSequence[selectedPointSequence.length - 1] ?? null;
  selectedEntity = pendingPointIdx === null ? selectedEntity : { kind: 'point', index: pendingPointIdx };
  toast.success(`Moved ${selectedPointSequence.length} point${selectedPointSequence.length === 1 ? '' : 's'}.`);
};
const copySelectedPointsByVector = () => {
  if (!selectedPointSequence.length) {
    toast.info('Select at least one point to copy.');
    return;
  }
  const delta = exactTransformDelta();
  if (delta.x === 0 && delta.y === 0 && delta.z === 0) {
    toast.info('Set a non-zero copy vector.');
    return;
  }
  const clones = selectedPointSequence.map((idx) => {
    const point = points[idx]!;
    return { x: point.x + delta.x, y: point.y + delta.y, z: point.z + delta.z };
  });
  pushUndo();
  const startIdx = points.length;
  points = [...points, ...clones];
  const newIds = clones.map((_, offset) => startIdx + offset);
  selectedPointIds = newIds;
  exactSelectionPointIds = newIds;
  pendingPointIdx = newIds[newIds.length - 1] ?? null;
  selectedEntity = pendingPointIdx === null ? selectedEntity : { kind: 'point', index: pendingPointIdx };
  clearIsolation();
  toast.success(`Copied ${clones.length} point${clones.length === 1 ? '' : 's'}.`);
};
const moveSelectedGeometryByVector = () => {
  const delta = exactTransformDelta();
  if (delta.x === 0 && delta.y === 0 && delta.z === 0) {
    toast.info('Set a non-zero move vector.');
    return;
  }
  const result = Logic.moveSelectionByVector({
    points,
    edges,
    surfaces,
    selectedPointIds: selectedPointSequence,
    selectedLineIds,
    selectedSurfaceIds: selectedSurfaceCopyIds,
    delta
  });
  if (!result) {
    toast.info('Select points, lines, or a surface to move.');
    return;
  }
  pushUndo();
  points = result.nextPoints;
  selectedPointIds = result.movedPointIds;
  exactSelectionPointIds = result.movedPointIds;
  pendingPointIdx = result.movedPointIds[result.movedPointIds.length - 1] ?? null;
  if (selectedSurfaceCopyIds.length) selectedEntity = { kind: 'surface', index: selectedSurfaceCopyIds[selectedSurfaceCopyIds.length - 1]! };
  else if (selectedLineIds.length) selectedEntity = { kind: 'line', index: selectedLineIds[selectedLineIds.length - 1]! };
  else if (pendingPointIdx !== null) selectedEntity = { kind: 'point', index: pendingPointIdx };
  clearIsolation();
  toast.success(`Moved ${result.movedPointIds.length} point${result.movedPointIds.length === 1 ? '' : 's'} with linked topology.`);
};
const rotateSelectedPointsAroundAnchor = () => {
  if (!selectedPointSequence.length) {
    toast.info('Select at least one point to rotate.');
    return;
  }
  const angleDeg = Number(transformRotateDeg) || 0;
  if (angleDeg === 0) {
    toast.info('Set a non-zero rotation angle.');
    return;
  }
  const result = Logic.rotateSelectionAroundZ({
    points,
    edges,
    surfaces,
    selectedPointIds: selectedPointSequence,
    selectedLineIds: [],
    selectedSurfaceIds: [],
    angleDeg,
    anchor: exactTransformAnchor()
  });
  if (!result) {
    toast.info('Select at least one point to rotate.');
    return;
  }
  pushUndo();
  points = result.nextPoints;
  selectedPointIds = result.rotatedPointIds;
  exactSelectionPointIds = result.rotatedPointIds;
  pendingPointIdx = result.rotatedPointIds[result.rotatedPointIds.length - 1] ?? null;
  selectedEntity = pendingPointIdx === null ? selectedEntity : { kind: 'point', index: pendingPointIdx };
  clearIsolation();
  toast.success(`Rotated ${result.rotatedPointIds.length} point${result.rotatedPointIds.length === 1 ? '' : 's'} around ${transformAnchorMode}.`);
};
const copySelectedGeometryByVector = () => {
  const delta = exactTransformDelta();
  if (delta.x === 0 && delta.y === 0 && delta.z === 0) {
    toast.info('Set a non-zero copy vector.');
    return;
  }
  const result = Logic.duplicateSelectionByVector({
    points,
    edges,
    surfaces,
    selectedPointIds: selectedPointSequence,
    selectedLineIds,
    selectedSurfaceIds: selectedSurfaceCopyIds,
    delta
  });
  if (!result) {
    toast.info('Select points, lines, or a surface to copy.');
    return;
  }
  pushUndo();
  points = [...points, ...result.newPoints];
  edges = [...edges, ...result.newEdges];
  surfaces = [...surfaces, ...result.newSurfaces];
  selectedPointIds = result.pointIds;
  exactSelectionPointIds = result.pointIds;
  selectedLineIds = result.lineIds;
  pendingPointIdx = result.pointIds[result.pointIds.length - 1] ?? null;
  if (result.surfaceIds.length) selectedEntity = { kind: 'surface', index: result.surfaceIds[result.surfaceIds.length - 1]! };
  else if (result.lineIds.length) selectedEntity = { kind: 'line', index: result.lineIds[result.lineIds.length - 1]! };
  else if (pendingPointIdx !== null) selectedEntity = { kind: 'point', index: pendingPointIdx };
  clearIsolation();
  toast.success(`Copied ${result.pointIds.length} point${result.pointIds.length === 1 ? '' : 's'} with linked topology.`);
};
const rotateSelectedGeometryAroundAnchor = () => {
  const angleDeg = Number(transformRotateDeg) || 0;
  if (angleDeg === 0) {
    toast.info('Set a non-zero rotation angle.');
    return;
  }
  const result = Logic.rotateSelectionAroundZ({
    points,
    edges,
    surfaces,
    selectedPointIds: selectedPointSequence,
    selectedLineIds,
    selectedSurfaceIds: selectedSurfaceCopyIds,
    angleDeg,
    anchor: exactTransformAnchor()
  });
  if (!result) {
    toast.info('Select points, lines, or a surface to rotate.');
    return;
  }
  pushUndo();
  points = result.nextPoints;
  selectedPointIds = result.rotatedPointIds;
  exactSelectionPointIds = result.rotatedPointIds;
  pendingPointIdx = result.rotatedPointIds[result.rotatedPointIds.length - 1] ?? null;
  if (selectedSurfaceCopyIds.length) selectedEntity = { kind: 'surface', index: selectedSurfaceCopyIds[selectedSurfaceCopyIds.length - 1]! };
  else if (selectedLineIds.length) selectedEntity = { kind: 'line', index: selectedLineIds[selectedLineIds.length - 1]! };
  else if (pendingPointIdx !== null) selectedEntity = { kind: 'point', index: pendingPointIdx };
  clearIsolation();
  toast.success(`Rotated ${result.rotatedPointIds.length} point${result.rotatedPointIds.length === 1 ? '' : 's'} with linked topology.`);
};
const copySelectionByRotationAroundAnchor = () => {
  const angleDeg = Number(transformRotateDeg) || 0;
  if (angleDeg === 0) {
    toast.info('Set a non-zero rotation angle.');
    return;
  }
  const result = Logic.duplicateSelectionByZRotation({
    points,
    edges,
    surfaces,
    selectedPointIds: selectedPointSequence,
    selectedLineIds,
    selectedSurfaceIds: selectedSurfaceCopyIds,
    angleDeg,
    anchor: exactTransformAnchor()
  });
  if (!result) {
    toast.info('Select points, lines, or a surface to create a rotated copy.');
    return;
  }
  pushUndo();
  points = [...points, ...result.newPoints];
  edges = [...edges, ...result.newEdges];
  surfaces = [...surfaces, ...result.newSurfaces];
  selectedPointIds = result.pointIds;
  exactSelectionPointIds = result.pointIds;
  selectedLineIds = result.lineIds;
  pendingPointIdx = result.pointIds[result.pointIds.length - 1] ?? null;
  if (result.surfaceIds.length) selectedEntity = { kind: 'surface', index: result.surfaceIds[result.surfaceIds.length - 1]! };
  else if (result.lineIds.length) selectedEntity = { kind: 'line', index: result.lineIds[result.lineIds.length - 1]! };
  else if (pendingPointIdx !== null) selectedEntity = { kind: 'point', index: pendingPointIdx };
  clearIsolation();
  toast.success(`Created rotated copy of ${result.pointIds.length} point${result.pointIds.length === 1 ? '' : 's'}.`);
};
const copySelectionByMirrorAroundAnchor = (axis: 'x' | 'y') => {
  const result = Logic.duplicateSelectionByMirrorAxis({
    points,
    edges,
    surfaces,
    selectedPointIds: selectedPointSequence,
    selectedLineIds,
    selectedSurfaceIds: selectedSurfaceCopyIds,
    axis,
    anchor: exactTransformAnchor()
  });
  if (!result) {
    toast.info('Select points, lines, or a surface to create a mirrored copy.');
    return;
  }
  pushUndo();
  points = [...points, ...result.newPoints];
  edges = [...edges, ...result.newEdges];
  surfaces = [...surfaces, ...result.newSurfaces];
  selectedPointIds = result.pointIds;
  exactSelectionPointIds = result.pointIds;
  selectedLineIds = result.lineIds;
  pendingPointIdx = result.pointIds[result.pointIds.length - 1] ?? null;
  if (result.surfaceIds.length) selectedEntity = { kind: 'surface', index: result.surfaceIds[result.surfaceIds.length - 1]! };
  else if (result.lineIds.length) selectedEntity = { kind: 'line', index: result.lineIds[result.lineIds.length - 1]! };
  else if (pendingPointIdx !== null) selectedEntity = { kind: 'point', index: pendingPointIdx };
  clearIsolation();
  toast.success(`Created mirrored copy of ${result.pointIds.length} point${result.pointIds.length === 1 ? '' : 's'} across ${axis.toUpperCase()}.`);
};
const mirrorSelectionAcrossAnchorAxis = (axis: 'x' | 'y', pointsOnly = false) => {
  const result = Logic.mirrorSelectionAcrossAxis({
    points,
    edges,
    surfaces,
    selectedPointIds: selectedPointSequence,
    selectedLineIds: pointsOnly ? [] : selectedLineIds,
    selectedSurfaceIds: pointsOnly ? [] : selectedSurfaceCopyIds,
    axis,
    anchor: exactTransformAnchor()
  });
  if (!result) {
    toast.info(pointsOnly ? 'Select points to mirror.' : 'Select points, lines, or a surface to mirror.');
    return;
  }
  pushUndo();
  points = result.nextPoints;
  selectedPointIds = result.mirroredPointIds;
  exactSelectionPointIds = result.mirroredPointIds;
  pendingPointIdx = result.mirroredPointIds[result.mirroredPointIds.length - 1] ?? null;
  if (!pointsOnly && selectedSurfaceCopyIds.length) selectedEntity = { kind: 'surface', index: selectedSurfaceCopyIds[selectedSurfaceCopyIds.length - 1]! };
  else if (!pointsOnly && selectedLineIds.length) selectedEntity = { kind: 'line', index: selectedLineIds[selectedLineIds.length - 1]! };
  else if (pendingPointIdx !== null) selectedEntity = { kind: 'point', index: pendingPointIdx };
  clearIsolation();
  toast.success(`Mirrored ${result.mirroredPointIds.length} point${result.mirroredPointIds.length === 1 ? '' : 's'} across ${axis.toUpperCase()}.`);
};
const placeOffsetCrossingPoint = () => {
  if (!offsetPreviewIntersection) {
    toast.warning('Complete both offset line previews first.');
    return;
  }
  pushUndo();
  points = [...points, offsetPreviewIntersection.p];
  const newIdx = points.length - 1;
  pendingPointIdx = newIdx;
  selectedPointIds = [newIdx];
  selectedEntity = { kind: 'point', index: newIdx };
  intersection = offsetPreviewIntersection;
  toast.success('Placed offset crossing point');
};
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
const setSelectionMode = (m: SelectionMode) => { const next = nextSelectionModeState({ nextMode: m, curveMode, createMode, pendingPointIdx }); selectionMode = next.selectionMode; curveMode = next.curveMode; createMode = next.createMode; pendingPointIdx = next.pendingPointIdx; if (m !== 'none') toolCursor = 'select'; if (m !== 'none') surfacePointPreview = null; }, setCreateMode = (m: 'idle' | 'point' | 'line' | 'surface') => { const next = nextCreateModeState({ nextMode: m, selectionMode, curveMode, pendingPointIdx, creatorPick, surfaceDraft }); createMode = next.createMode; selectionMode = next.selectionMode; curveMode = next.curveMode; pendingPointIdx = next.pendingPointIdx; creatorPick = next.creatorPick; surfaceDraft = next.surfaceDraft; if (m === 'line') toolCursor = 'line'; else if (m === 'surface') toolCursor = 'surface'; else if (toolCursor === 'line' || toolCursor === 'surface') toolCursor = 'select'; if (m === 'point' || m === 'idle') { createLineA = null; createLineB = null; } if (m !== 'point') surfacePointPreview = null; }, requirePointPrereq = (m: string) => { if (points.length < 2) { toast.warning(`Need at least 2 points for ${m} mode`); return false; } return true; }, beginLinePick = (slot: 'A' | 'B') => { if (!requirePointPrereq('line')) return; if (slot === 'A') { setToolCursor('line'); return; } const next = linePickState(slot); createMode = next.createMode; selectionMode = next.selectionMode; curveMode = next.curveMode; pendingPointIdx = next.pendingPointIdx; creatorPick = next.creatorPick; surfaceDraft = []; createLineA = null; createLineB = null; surfacePointPreview = null; }, beginSurfacePick = (slot: number) => { if (!requirePointPrereq('surface')) return; if (slot === 0) { setToolCursor('surface'); return; } const next = surfacePickState(slot); createMode = next.createMode; selectionMode = next.selectionMode; curveMode = next.curveMode; pendingPointIdx = next.pendingPointIdx; creatorPick = next.creatorPick; surfacePointPreview = null; }, setToolCursor = (mode: ToolCursorMode) => { if (mode === 'line' && !requirePointPrereq('line')) mode = 'select'; if (mode === 'surface' && !requirePointPrereq('surface')) mode = 'select'; const next = transitionToolCursor({ mode, surfaceDraft }); toolCursor = next.toolCursor; selectionMode = next.selectionMode; createMode = next.createMode; curveMode = next.curveMode; lineInsertPickMode = next.lineInsertPickMode; creatorPick = next.creatorPick; pendingPointIdx = next.pendingPointIdx; surfaceDraft = next.surfaceDraft; if (mode === 'line') { createLineA = null; createLineB = null; } if (mode === 'surface') { createLineA = null; createLineB = null; } surfacePointPreview = null; };
const openDatumsModal = () => { datumsModalOpen = true; const ww = typeof window !== 'undefined' ? window.innerWidth : 1200, wh = typeof window !== 'undefined' ? window.innerHeight : 800; if (!datumsModalDragging) datumsModalPos = centeredModalPos({ windowWidth: ww, windowHeight: wh, panelWidth: 760, panelHeight: 440, margin: 20 }); }, startDatumsModalDrag = (ev: PointerEvent) => { ev.stopPropagation(); datumsModalDragging = true; datumsModalDragOffset = dragOffsetFromPointer(ev.clientX, ev.clientY, datumsModalPos); const onMove = (e: PointerEvent) => { if (!datumsModalDragging) return; datumsModalPos = draggedModalPos(e.clientX, e.clientY, datumsModalDragOffset, 12); }, onUp = () => { datumsModalDragging = false; document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp); }; document.addEventListener('pointermove', onMove); document.addEventListener('pointerup', onUp); };
const onSvgPointerDown = async (ev: PointerEvent) => {
  const coords = svgCoordsFromEvent(ev);
  if (!coords) return;
  draftCursor = coords;
  if (createMode === 'point') {
    const surfaceHit = surfacePointAtScreen(coords.x, coords.y);
    if (surfaceHit) {
      pushUndo();
      points = [...points, surfaceHit.world];
      const pointIdx = points.length - 1;
      pendingPointIdx = pointIdx;
      selectedPointIds = [pointIdx];
      selectedEntity = { kind: 'point', index: pointIdx };
      surfacePointPreview = {
        ...surfaceHit,
        screen: { x: coords.x, y: coords.y }
      };
      toast.success(`Placed point on surface S${surfaceHit.surfaceIdx + 1}`);
      return;
    }
    openManualPointModal(coords);
    return;
  }
  if (toolCursor === 'line' || toolCursor === 'surface') {
    const nearestPoint = await requestNearestPoint(coords.x, coords.y, snapThresholdPx);
    const targetIdx = nearestPoint ?? addPointFromViewport(coords);
    if (targetIdx !== null) handlePointClick(targetIdx, ev as unknown as MouseEvent);
    return;
  }
  if (toolCursor !== 'select') return;
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
const activatePointBuild = () => {
  setCreateMode('point');
  viewportHudExpanded = false;
};
const activateLineBuild = () => {
  setToolCursor('line');
  viewportHudExpanded = false;
};
const activateSurfaceBuild = () => {
  setToolCursor('surface');
  viewportHudExpanded = false;
};
const selectSurfaceBuildKind = (kind: 'triangle' | 'quad' | 'contour') => {
  surfaceCreateKind = kind;
  if (toolCursor !== 'surface') setToolCursor('surface');
};
const onSvgPointerMove = (ev: PointerEvent) => {
  const coords = svgCoordsFromEvent(ev);
  if (!coords) return;
  draftCursor = coords;
  if (createMode === 'point') {
    const surfaceHit = surfacePointAtScreen(coords.x, coords.y);
    surfacePointPreview = surfaceHit;
    activeSnap = null;
    hoverTooltip = surfaceHit
      ? {
          x: coords.x,
          y: coords.y,
          title: `Surface S${surfaceHit.surfaceIdx + 1}`,
          lines: [
            `(${surfaceHit.world.x.toFixed(2)}, ${surfaceHit.world.y.toFixed(2)}, ${surfaceHit.world.z.toFixed(2)})`,
            'Click to place point on surface'
          ]
        }
      : null;
    return;
  }
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
    clearOffsetWorkflow();
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
  const startIdx = createLineA;
  const endIdx = createLineB;
  const result = Logic.createLineFromPair({ aRaw: createLineA, bRaw: createLineB, points, edges });
  if (!result.success || result.newEdgeIdx === null) {
    toast.error('Failed to create line');
    return;
  }
  pushUndo();
  edges = [...edges, [startIdx, endIdx] as Edge];
  clearIsolation();
  selectedLineIds = [];
  selectedEntity = { kind: 'line', index: edges.length - 1 };
  activeEdgeIdx = edges.length - 1;
  if (lineDaisyChainMode) {
    createLineA = endIdx;
    createLineB = null;
    pendingPointIdx = endIdx;
    selectedPointIds = [endIdx];
    exactSelectionPointIds = [endIdx];
  } else {
    createLineA = null;
    createLineB = null;
    pendingPointIdx = null;
    selectedPointIds = [];
    exactSelectionPointIds = [];
  }
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
  offsetLineA = { ...offsetLineA, edgeIdx: remapEdgeIndex(offsetLineA.edgeIdx) };
  offsetLineB = { ...offsetLineB, edgeIdx: remapEdgeIndex(offsetLineB.edgeIdx) };
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
  if (offsetLineA.edgeIdx !== null && !edges[offsetLineA.edgeIdx]) offsetLineA = { ...offsetLineA, edgeIdx: edges[0] ? 0 : null };
  if (offsetLineB.edgeIdx !== null && !edges[offsetLineB.edgeIdx]) offsetLineB = { ...offsetLineB, edgeIdx: edges[1] ? 1 : edges[0] ? 0 : null };
  if (offsetLineA.surfaceIdx !== null && !surfaces[offsetLineA.surfaceIdx]) offsetLineA = { ...offsetLineA, surfaceIdx: surfaces[0] ? 0 : null };
  if (offsetLineB.surfaceIdx !== null && !surfaces[offsetLineB.surfaceIdx]) offsetLineB = { ...offsetLineB, surfaceIdx: surfaces[0] ? 0 : null };
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
  exactSelectionPointIds = [];
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
const recipeUiCtx = () => ({ getSelEdgeA: () => offsetLineA.edgeIdx, getSelEdgeB: () => offsetLineB.edgeIdx, getOffsetDist: () => offsetLineA.distance, getRefPointIdx: () => refPointIdx, getDatumSlicePlaneIdx: () => datumSlicePlaneIdx, getDatumSliceMode: () => datumSliceMode, getDatumSliceSpacing: () => datumSliceSpacing, getDatumSliceCount: () => datumSliceCount, getDatumSliceThickness: () => datumSliceThickness, getDatumSliceUseSelection: () => datumSliceUseSelection, getIncludeOptionalSliceColumns: () => includeOptionalSliceColumns, setRecipeNameDraft: (v: string) => { recipeNameDraft = v; }, getRecipeNameDraft: () => recipeNameDraft, getRecipes: () => recipes, setRecipes: (v: SurfaceRecipe[]) => { recipes = v; }, getSelectedRecipeId: () => selectedRecipeId, setSelectedRecipeId: (v: string | null) => { selectedRecipeId = v; }, getRecipeRun: () => recipeRun, setRecipeRun: (v: RecipeRunState | null) => { recipeRun = v; }, getSelectedRecipe: () => selectedRecipe(), getRecipeStepConfirmed: () => recipeStepConfirmed, getRecipeTx: () => recipeTx, setRecipeTx: (v: RecipeTransaction | null) => { recipeTx = v; }, beginRecipeTransaction, getCurrentSnapshot: () => createSnapshot(points, edges, curves, surfaces, csys, planes, activeEdgeIdx), applySnapshot: (s: any) => { const m = materializeSnapshot(s); points = m.points; edges = m.edges; curves = m.curves; surfaces = m.surfaces; csys = m.csys; planes = m.planes; activeEdgeIdx = m.activeEdgeIdx; }, getUndoRedoStacks: () => ({ undoStack, redoStack }), setUndoRedoStacks: (v: { undoStack: any[]; redoStack: any[] }) => { undoStack = v.undoStack; redoStack = v.redoStack; }, applyRecipeConfig: (cfg: any) => applyRecipeConfig(cfg), calcOffsetIntersection, computeDatumSlices, exportDatumSliceCombined, getDatumSliceRes: () => datumSliceRes, getIntersectionDiagnostics: () => intersectionDiagnostics, emitStatusWarnings, getDatumSliceErr: () => datumSliceErr, setSelEdgeA: (v: number | null) => { selEdgeA = v; offsetLineA = { ...offsetLineA, edgeIdx: v }; }, setSelEdgeB: (v: number | null) => { selEdgeB = v; offsetLineB = { ...offsetLineB, edgeIdx: v }; }, setOffsetDist: (v: number) => { offsetDist = v; offsetLineA = { ...offsetLineA, distance: v }; }, setRefPointIdx: (v: number) => { refPointIdx = v; }, setDatumSlicePlaneIdx: (v: number) => { datumSlicePlaneIdx = v; }, setDatumSliceMode: (v: DatumSliceMode) => { datumSliceMode = v; }, setDatumSliceSpacing: (v: number) => { datumSliceSpacing = v; }, setDatumSliceCount: (v: number) => { datumSliceCount = v; }, setDatumSliceThickness: (v: number) => { datumSliceThickness = v; }, setDatumSliceUseSelection: (v: boolean) => { datumSliceUseSelection = v; }, setIncludeOptionalSliceColumns: (v: boolean) => { includeOptionalSliceColumns = v; } });
const snapshotRecipeConfig = (): SurfaceRecipeConfig => snapshotRecipeConfigController(recipeUiCtx()), applyRecipeConfig = (cfg: SurfaceRecipeConfig) => { applyRecipeConfigController(recipeUiCtx(), cfg); };
const syncLegacyOffsetState = () => {
  selEdgeA = offsetLineA.edgeIdx;
  selEdgeB = offsetLineB.edgeIdx;
  offsetDist = offsetLineA.distance;
};
const selectedRecipe = () => selectedRecipeController(recipes, selectedRecipeId), selectRecipe = (id: string | null) => { if (id !== null) selectRecipeController(recipeUiCtx(), id); };
const saveCurrentRecipe = () => { saveCurrentRecipeController(recipeUiCtx()); saveWorkspaceRecipes('surface', recipes); }, deleteSelectedRecipe = () => { deleteSelectedRecipeController(recipeUiCtx()); saveWorkspaceRecipes('surface', recipes); };
const toggleSelectedRecipeStep = (step: SurfaceRecipeStep, enabled: boolean) => { toggleSelectedRecipeStepController(recipeUiCtx(), step, enabled); };
$effect(() => {
  syncLegacyOffsetState();
});
const handlePointClick = (idx: number, ev?: MouseEvent) => {
  const evTs = typeof ev?.timeStamp === 'number' ? ev.timeStamp : 0;
  const modeKey = `${toolCursor}:${datumPick ?? 'none'}:${creatorPick?.kind ?? 'none'}:${lineInsertPickMode ?? 'none'}`;
  if (
    lastHandledPointClick &&
    lastHandledPointClick.idx === idx &&
    lastHandledPointClick.modeKey === modeKey &&
    Math.abs(evTs - lastHandledPointClick.ts) < 120
  ) {
    return;
  }
  lastHandledPointClick = { idx, ts: evTs, modeKey };
  if (toolCursor === 'select' && !datumPick && !lineInsertPickMode && !creatorPick) {
    const add = !!ev?.shiftKey;
    const subtract = !!ev?.altKey;
    const current = new Set(selectedPointIds);
    const exactCurrent = new Set(exactSelectionPointIds);
    if (add) current.add(idx);
    else if (subtract) current.delete(idx);
    else {
      current.clear();
      current.add(idx);
    }
    if (add) exactCurrent.add(idx);
    else if (subtract) exactCurrent.delete(idx);
    else {
      exactCurrent.clear();
      exactCurrent.add(idx);
    }
    selectedPointIds = [...current].sort((a, b) => a - b);
    exactSelectionPointIds = [...exactCurrent].sort((a, b) => a - b);
    pendingPointIdx = idx;
    selectedEntity = { kind: 'point', index: idx };
    return;
  }
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
  if (offsetWorkflowPickMode === 'lineA') {
    offsetLineA = { ...offsetLineA, edgeIdx: idx };
    advanceOffsetWizardWithGuidance('surfaceA', { toastKey: 'surfaceA', toastTitle: 'Now pick Surface A' });
    selectedEntity = { kind: 'line', index: idx };
    activeEdgeIdx = idx;
    return;
  }
  if (offsetWorkflowPickMode === 'lineB') {
    offsetLineB = { ...offsetLineB, edgeIdx: idx };
    advanceOffsetWizardWithGuidance('surfaceB', { toastKey: 'surfaceB', toastTitle: 'Now pick Surface B' });
    selectedEntity = { kind: 'line', index: idx };
    activeEdgeIdx = idx;
    return;
  }
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
const onSurfaceClick = (idx: number, ev?: MouseEvent) => {
  if (createMode === 'point' && ev) {
    const coords = svgCoordsFromEvent(ev);
    const previewHit = surfacePointPreview && surfacePointPreview.surfaceIdx === idx ? surfacePointPreview : null;
    let surfaceHit = previewHit ?? (coords ? surfacePointAtScreen(coords.x, coords.y) : null);
    if (!surfaceHit) {
      const face = surfaces[idx];
      const verts = face?.pts.map((pi) => points[pi]).filter(Boolean) as Point3D[] | undefined;
      if (verts && verts.length >= 3) {
        const centroid = verts.reduce((acc, p) => ({
          x: acc.x + p.x / verts.length,
          y: acc.y + p.y / verts.length,
          z: acc.z + p.z / verts.length
        }), { x: 0, y: 0, z: 0 });
        surfaceHit = {
          surfaceIdx: idx,
          world: centroid,
          screen: coords ?? surfacePointPreview?.screen ?? { x: 0, y: 0 }
        };
      }
    }
    if (surfaceHit) {
      pushUndo();
      points = [...points, surfaceHit.world];
      const pointIdx = points.length - 1;
      pendingPointIdx = pointIdx;
      selectedPointIds = [pointIdx];
      exactSelectionPointIds = [pointIdx];
      selectedEntity = { kind: 'point', index: pointIdx };
      surfacePointPreview = {
        ...surfaceHit,
        screen: { x: coords!.x, y: coords!.y }
      };
      toast.success(`Placed point on surface S${surfaceHit.surfaceIdx + 1}`);
      return;
    }
  }
  if (offsetWorkflowPickMode === 'surfaceA') {
    offsetLineA = { ...offsetLineA, surfaceIdx: idx };
    advanceOffsetWizardWithGuidance('lineB', { toastKey: 'lineB', toastTitle: 'Now pick Line B' });
  } else if (offsetWorkflowPickMode === 'surfaceB') {
    offsetLineB = { ...offsetLineB, surfaceIdx: idx };
    advanceOffsetWizardWithGuidance('ready', { toastKey: 'ready', toastTitle: 'Offset previews ready. Place the crossing point.' });
  }
  selectedEntity = { kind: 'surface', index: idx };
}, onPlaneClick = (idx: number) => { selectedEntity = { kind: 'plane', index: idx }; }, onCsysClick = (idx: number) => { selectedEntity = { kind: 'csys', index: idx }; csysRelocateIdx = idx; };
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
  offsetLineA = { ...offsetLineA, edgeIdx: remapEdgeIndex(offsetLineA.edgeIdx) };
  offsetLineB = { ...offsetLineB, edgeIdx: remapEdgeIndex(offsetLineB.edgeIdx) };
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
  if (offsetLineA.surfaceIdx === idx) offsetLineA = { ...offsetLineA, surfaceIdx: null };
  else if (offsetLineA.surfaceIdx !== null && offsetLineA.surfaceIdx > idx) offsetLineA = { ...offsetLineA, surfaceIdx: offsetLineA.surfaceIdx - 1 };
  if (offsetLineB.surfaceIdx === idx) offsetLineB = { ...offsetLineB, surfaceIdx: null };
  else if (offsetLineB.surfaceIdx !== null && offsetLineB.surfaceIdx > idx) offsetLineB = { ...offsetLineB, surfaceIdx: offsetLineB.surfaceIdx - 1 };
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
const calcOffsetIntersection = async () => {
  intersectionBusy = true;
  if (!offsetPreviewA || !offsetPreviewB) {
    intersectionDiagnostics = {
      severity: 'error',
      message: 'Both offset previews must be defined before computing a crossing.',
      angleDeg: null,
      skew: null,
      recommendations: []
    };
    intersectionBusy = false;
    return;
  }
  if (!offsetPreviewIntersection) {
    intersectionDiagnostics = {
      severity: 'error',
      message: 'Offset preview lines are parallel or do not yield a stable crossing.',
      angleDeg: null,
      skew: null,
      recommendations: []
    };
    intersectionBusy = false;
    return;
  }
  intersection = offsetPreviewIntersection;
  intersectionDiagnostics = {
    severity: offsetPreviewIntersection.skew > 1e-3 ? 'warning' : 'info',
    message: offsetPreviewIntersection.skew > 1e-3 ? 'Crossing computed with measurable skew.' : 'Crossing is stable.',
    angleDeg: null,
    skew: offsetPreviewIntersection.skew,
    recommendations: []
  };
  intersectionBusy = false;
};
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
const setRendererTheme = async (theme: typeof $themeStore) => {
  themeStore.set(theme);
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
    edges: edges.map((edge) => [edge[0], edge[1]] as Edge)
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
  if (!uiStateHydrated) return;
  writeWorkspaceUiState('surface', {
    coreMode,
    advancedOpen,
    rightRailCollapsed,
    uxLevel,
    viewportHudDock,
    viewportHudExpanded,
    viewportHudTab,
    zoomK,
    pan,
    rot,
    rendererMode,
    performanceMode,
    offsetGuidanceMode,
    hasSeenOffsetGuidanceHint
  });
});
onMount(() => {
  let restoreViewportState = false;
  if (typeof window !== 'undefined') {
    const mode = readPersistedCoreMode();
    if (mode !== null) coreMode = mode;
    const col = readPersistedRightRailCollapsed();
    if (col !== null) rightRailCollapsed = col;
    showCoreModePrompt = !hasSeenCoreModePrompt();
    const ui = readWorkspaceUiState('surface');
    if (ui) {
      restoreViewportState = ui.zoomK !== undefined || !!ui.pan || !!ui.rot;
      if (ui.zoomK !== undefined) zoomK = ui.zoomK;
      if (ui.pan) pan = ui.pan;
      if (ui.rot) rot = ui.rot;
      if (ui.uxLevel === 'beginner' || ui.uxLevel === 'expert') uxLevel = ui.uxLevel;
      if (ui.viewportHudDock === 'left' || ui.viewportHudDock === 'right') viewportHudDock = ui.viewportHudDock;
      if (typeof ui.viewportHudExpanded === 'boolean') viewportHudExpanded = ui.viewportHudExpanded;
      if (ui.viewportHudTab === 'build' || ui.viewportHudTab === 'offset' || ui.viewportHudTab === 'precision') viewportHudTab = ui.viewportHudTab;
      if (ui.rendererMode === 'svg') rendererMode = ui.rendererMode;
      if (typeof ui.performanceMode === 'boolean') performanceMode = ui.performanceMode;
      if (ui.offsetGuidanceMode === 'manual' || ui.offsetGuidanceMode === 'single_click_guided') offsetGuidanceMode = ui.offsetGuidanceMode;
      if (typeof ui.hasSeenOffsetGuidanceHint === 'boolean') hasSeenOffsetGuidanceHint = ui.hasSeenOffsetGuidanceHint;
    }
    const loaded = loadWorkspaceRecipes('surface');
    recipes = Array.isArray(loaded) ? loaded : loaded.recipes;
    uiStateHydrated = true;
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
      clearOffsetToast();
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
    clearPicks: () => { pendingPointIdx = null; intersection = null; clearOffsetWorkflow(); },
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
  if (!restoreViewportState) {
    requestAnimationFrame(() => fitToScreen());
  }
  const handleGlobalKeys = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    const isTextInput = !!target?.closest('input, textarea, select, [contenteditable="true"]');
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      commandPaletteOpen = true;
      return;
    }
    if (!isTextInput && event.key === 'Delete' && !deletePreviewOpen && !(toolCursor === 'surface' && surfaceDraft.length > 0)) {
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
    if (event.key === 'Escape') {
      event.preventDefault();
      if (offsetWorkflowPickMode) {
        offsetWorkflowPickMode = null;
        clearOffsetToast();
        return;
      }
      if (toolCursor === 'line' || toolCursor === 'surface') {
        clearCreationDrafts();
        return;
      }
    }
    if (event.key === 'Enter' && toolCursor === 'surface' && surfaceDraft.length >= 3) {
      event.preventDefault();
      createSurfaceFromDraft();
      return;
    }
    if ((event.key === 'Backspace' || event.key === 'Delete') && toolCursor === 'surface' && surfaceDraft.length > 0 && !deletePreviewOpen) {
      event.preventDefault();
      surfaceDraft = surfaceDraft.slice(0, -1);
      creatorPick = surfaceDraft.length ? { kind: 'surface', slot: surfaceDraft.length } : null;
      return;
    }
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
    clearOffsetToast();
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
          surfacePointPreview = null;
          hoverTooltip = null;
          probe = null;
          draftCursor = null;
          lastSnapSig = 'none';
        }}
        {onSvgPointerDown}
        {onSvgPointerMove}
        {onSvgPointerUp}
        {sortedSurfaces}
        offsetSourceSurfaceA={offsetLineA.surfaceIdx}
        offsetSourceSurfaceB={offsetLineB.surfaceIdx}
        sortedEdges={renderedEdges}
        offsetSourceLineA={offsetLineA.edgeIdx}
        offsetSourceLineB={offsetLineB.edgeIdx}
        offsetLinePickActive={offsetWorkflowPickMode === 'lineA' || offsetWorkflowPickMode === 'lineB'}
        offsetSurfacePickActive={offsetWorkflowPickMode === 'surfaceA' || offsetWorkflowPickMode === 'surfaceB'}
        pointRenderIds={renderPointIds}
        {datumPlanePatches}
        {datumAxisSegments}
        {projected}
        {draftCursor}
        {surfacePointPreview}
        lineDraftStartIdx={toolCursor === 'line' ? createLineA : null}
        surfaceDraftIds={toolCursor === 'surface' ? surfaceDraft : []}
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
        intersection={displayIntersection}
        offsetPreviewA={offsetPreviewA}
        offsetPreviewB={offsetPreviewB}
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
        showLabels={effectiveShowSelectionLabels}
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
        onSetOffsetSurfaceA={setOffsetSurfaceAContext}
        onSetOffsetSurfaceB={setOffsetSurfaceBContext}
        onDeleteSurfaceOnly={deleteSurfaceOnly}
        onClearIsolation={clearIsolation}
        onPanBy={panBy}
        onRotateBy={rotateBy}
        onZoomBy={zoomBy}
        onSetViewPreset={setViewPreset}
      />
      <div class={`pointer-events-none absolute top-3 z-20 w-[min(420px,calc(100%-84px))] rounded-2xl border border-white/10 bg-slate-950/84 px-3 py-2 backdrop-blur-md ${viewportHudDock === 'left' ? 'left-3' : 'right-3'}`}>
        <div class="pointer-events-auto flex flex-wrap items-center gap-2 text-[11px] text-white/78">
          <span class="rounded-full bg-white/6 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/72">{builderModeBadge}</span>
          <span class="rounded-full bg-cyan-400/12 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-cyan-100">{builderStepBadge}</span>
          <div class="flex items-center gap-1 rounded-full bg-white/5 px-1 py-1 text-[10px] uppercase tracking-[0.14em] text-white/60">
            <button aria-label="Viewport tab Build" class={`rounded-full px-2 py-1 ${viewportHudTab === 'build' ? 'bg-cyan-400/15 text-cyan-100' : 'text-white/60'}`} onclick={() => { viewportHudTab = 'build'; viewportHudExpanded = true; }}>
              Build
            </button>
            <button aria-label="Viewport tab Offset" class={`rounded-full px-2 py-1 ${viewportHudTab === 'offset' ? 'bg-violet-400/15 text-violet-100' : 'text-white/60'}`} onclick={() => { viewportHudTab = 'offset'; viewportHudExpanded = true; }}>
              Offset
            </button>
            <button aria-label="Viewport tab Precision" class={`rounded-full px-2 py-1 ${viewportHudTab === 'precision' ? 'bg-emerald-400/15 text-emerald-100' : 'text-white/60'}`} onclick={() => { viewportHudTab = 'precision'; viewportHudExpanded = true; }}>
              Precision
            </button>
          </div>
          <div class="ml-auto flex items-center gap-1 rounded-full bg-white/5 px-1 py-1 text-[10px] uppercase tracking-[0.14em] text-white/60">
            <button class={`rounded-full px-2 py-1 ${uxLevel === 'beginner' ? 'bg-cyan-400/15 text-cyan-100' : 'text-white/60'}`} onclick={() => (uxLevel = 'beginner')}>Beginner</button>
            <button class={`rounded-full px-2 py-1 ${uxLevel === 'expert' ? 'bg-cyan-400/15 text-cyan-100' : 'text-white/60'}`} onclick={() => (uxLevel = 'expert')}>Expert</button>
          </div>
          <button
            class="rounded-full bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-white/72"
            onclick={() => (viewportHudDock = viewportHudDock === 'left' ? 'right' : 'left')}
            aria-label={viewportHudDock === 'left' ? 'Dock viewport tools right' : 'Dock viewport tools left'}
          >
            {viewportHudDock === 'left' ? 'Dock Right' : 'Dock Left'}
          </button>
          <button
            class="rounded-full bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-white/72"
            onclick={() => (viewportHudExpanded = !viewportHudExpanded)}
            aria-label={viewportHudExpanded ? 'Collapse viewport tools' : 'Open viewport tools'}
          >
            {viewportHudExpanded ? 'Hide' : 'Open'}
          </button>
        </div>
        {#if !viewportHudExpanded}
          <div class="pointer-events-none mt-2 flex flex-wrap items-center gap-2 text-[11px] text-white/72">
            <span class="rounded-full bg-cyan-400/10 px-2.5 py-1 text-cyan-50">{builderPrimaryAction}</span>
            <span class="rounded-full bg-white/5 px-2.5 py-1 text-white/62">{viewportHudTab === 'build' ? buildPrereqHint : viewportHudTab === 'offset' ? offsetWorkflowStatus.label : exactGeometryHint}</span>
          </div>
        {/if}
        {#if viewportHudExpanded && viewportHudTab === 'build'}
        <div class="pointer-events-auto mt-2 flex flex-wrap items-center gap-2 text-[11px] text-white/78">
          <span class="text-[10px] uppercase tracking-[0.18em] text-cyan-200/70">Build</span>
          <button aria-label="Viewport build Point" class={`rounded-full px-2.5 py-1 ${createMode === 'point' ? 'bg-cyan-400/15 text-cyan-100' : 'bg-white/5 text-white/70'}`} onclick={activatePointBuild}>Point</button>
          {#if uxLevel === 'expert' || points.length >= 2}
            <button aria-label="Viewport build Line" class={`rounded-full px-2.5 py-1 ${toolCursor === 'line' ? 'bg-cyan-400/15 text-cyan-100' : 'bg-white/5 text-white/70'}`} onclick={activateLineBuild}>Line</button>
          {/if}
          {#if uxLevel === 'expert' || points.length >= 3}
            <button aria-label="Viewport build Surface" class={`rounded-full px-2.5 py-1 ${toolCursor === 'surface' ? 'bg-emerald-400/15 text-emerald-100' : 'bg-white/5 text-white/70'}`} onclick={activateSurfaceBuild}>Surface</button>
          {/if}
          {#if toolCursor === 'surface'}
            <div class="flex items-center gap-1 rounded-full bg-white/5 px-1 py-1 text-[10px] uppercase tracking-[0.14em] text-white/60">
              <button
                aria-label="Viewport surface kind Triangle"
                class={`rounded-full px-2 py-1 ${surfaceCreateKind === 'triangle' ? 'bg-emerald-400/15 text-emerald-100' : 'text-white/60'}`}
                onclick={() => selectSurfaceBuildKind('triangle')}
              >
                Tri
              </button>
              <button
                aria-label="Viewport surface kind Quad"
                class={`rounded-full px-2 py-1 ${surfaceCreateKind === 'quad' ? 'bg-emerald-400/15 text-emerald-100' : 'text-white/60'}`}
                onclick={() => selectSurfaceBuildKind('quad')}
              >
                Quad
              </button>
              <button
                aria-label="Viewport surface kind Contour"
                class={`rounded-full px-2 py-1 ${surfaceCreateKind === 'contour' ? 'bg-emerald-400/15 text-emerald-100' : 'text-white/60'}`}
                onclick={() => selectSurfaceBuildKind('contour')}
              >
                Contour
              </button>
            </div>
          {/if}
          {#if toolCursor === 'line'}
            <button class={`rounded-full px-2.5 py-1 ${lineDaisyChainMode ? 'bg-amber-300/15 text-amber-100' : 'bg-white/5 text-white/70'}`} onclick={() => (lineDaisyChainMode = !lineDaisyChainMode)}>
              Daisy Chain {lineDaisyChainMode ? 'On' : 'Off'}
            </button>
          {/if}
          {#if toolCursor === 'line' && createLineA !== null}
            <button class="rounded-full bg-white/5 px-2.5 py-1 text-white/72" onclick={() => { createLineA = null; createLineB = null; pendingPointIdx = null; selectedPointIds = []; }}>
              Cancel Line
            </button>
          {/if}
          {#if toolCursor === 'surface' && surfaceDraft.length > 0}
            <button class="rounded-full bg-white/5 px-2.5 py-1 text-white/72" onclick={() => { surfaceDraft = surfaceDraft.slice(0, -1); creatorPick = surfaceDraft.length > 1 ? { kind: 'surface', slot: surfaceDraft.length - 1 } : null; }}>
              Undo Last
            </button>
            <button class="rounded-full bg-white/5 px-2.5 py-1 text-white/72" onclick={() => { surfaceDraft = []; creatorPick = null; }}>
              Cancel Surface
            </button>
            {#if surfaceDraft.length >= 3}
              <button class="rounded-full bg-emerald-400/15 px-2.5 py-1 text-emerald-100" onclick={createSurfaceFromDraft}>
                Finish Surface
              </button>
            {/if}
          {/if}
          <span class="rounded-full bg-cyan-400/10 px-2.5 py-1 text-cyan-50">{builderPrimaryAction}</span>
          {#if uxLevel === 'expert'}
            <span class="rounded-full bg-white/5 px-2.5 py-1 text-white/60">{viewportFlowHint}</span>
          {/if}
          <span class="rounded-full bg-white/5 px-2.5 py-1 text-white/62">{buildPrereqHint}</span>
        </div>
        {/if}
        {#if viewportHudExpanded && viewportHudTab === 'offset'}
        <div class="pointer-events-auto mt-2 flex flex-wrap items-center gap-2 text-[11px] text-white/78">
          <span class="text-[10px] uppercase tracking-[0.18em] text-violet-200/70">Offset</span>
          <button
            aria-label={offsetGuidanceMode === 'single_click_guided' ? 'Switch offset guidance to manual' : 'Switch offset guidance to guided'}
            class={`rounded-full px-2.5 py-1 ${offsetGuidanceMode === 'single_click_guided' ? 'bg-cyan-400/15 text-cyan-100' : 'bg-white/5 text-white/72'}`}
            onclick={() => {
              offsetGuidanceMode = offsetGuidanceMode === 'single_click_guided' ? 'manual' : 'single_click_guided';
              clearOffsetToast();
            }}
          >
            Guided {offsetGuidanceMode === 'single_click_guided' ? 'On' : 'Off'}
          </button>
          {#if !offsetBuilderOpen}
            <button class="rounded-full bg-white/5 px-2.5 py-1 text-white/72" onclick={() => advanceOffsetWizard('lineA')}>Start Offset Builder</button>
            <span class="rounded-full bg-white/5 px-2.5 py-1 text-white/62">{uxLevel === 'beginner' ? 'Pick line A, surface A, line B, surface B, then place the crossing point.' : 'Pick two lines, offset them on surfaces, then place the crossing point.'}</span>
          {:else}
            <span class="rounded-full bg-white/5 px-2.5 py-1 text-white/62">
              {#each offsetWizardBreadcrumb as crumb, idx (crumb.key)}
                <span class={idx < offsetWizardStepIndex ? 'text-emerald-100/70' : crumb.key === offsetWizardStage ? 'text-cyan-100 font-medium' : 'text-white/55'}>{crumb.label}</span>{#if idx < offsetWizardBreadcrumb.length - 1}<span class="px-1 text-white/30">-&gt;</span>{/if}
              {/each}
            </span>
            <span class="rounded-full bg-rose-400/10 px-2 py-1 text-[10px] text-rose-100">lines only</span>
            <span class="rounded-full bg-violet-400/10 px-2.5 py-1 text-violet-100">{offsetWizardTitle}</span>
            {#if offsetGuidanceToastMessage}
              <span class="rounded-full bg-cyan-400/12 px-2.5 py-1 text-cyan-100">{offsetGuidanceToastMessage}</span>
            {/if}
            <span class="rounded-full bg-white/5 px-2.5 py-1 text-white/68">A = {offsetLineA.edgeIdx !== null ? `L${offsetLineA.edgeIdx + 1}` : 'pick'} on {offsetLineA.surfaceIdx !== null ? `S${offsetLineA.surfaceIdx + 1}` : 'pick'}</span>
            <label class="rounded-full bg-white/5 px-2.5 py-1">
              X
              <input class="ml-1.5 w-12 bg-transparent text-right outline-none" type="number" step="0.1" bind:value={offsetLineA.distance} />
            </label>
            <button class={`rounded-full px-2.5 py-1 ${offsetLineA.flip ? 'bg-amber-300/15 text-amber-100' : 'bg-white/5 text-white/70'}`} onclick={() => (offsetLineA = { ...offsetLineA, flip: !offsetLineA.flip })}>Flip A</button>
            <span class="rounded-full bg-white/5 px-2.5 py-1 text-white/68">B = {offsetLineB.edgeIdx !== null ? `L${offsetLineB.edgeIdx + 1}` : 'pick'} on {offsetLineB.surfaceIdx !== null ? `S${offsetLineB.surfaceIdx + 1}` : 'pick'}</span>
            <label class="rounded-full bg-white/5 px-2.5 py-1">
              Y
              <input class="ml-1.5 w-12 bg-transparent text-right outline-none" type="number" step="0.1" bind:value={offsetLineB.distance} />
            </label>
            <button class={`rounded-full px-2.5 py-1 ${offsetLineB.flip ? 'bg-amber-300/15 text-amber-100' : 'bg-white/5 text-white/70'}`} onclick={() => (offsetLineB = { ...offsetLineB, flip: !offsetLineB.flip })}>Flip B</button>
            {#if offsetWizardStage === 'lineA'}
              <button
                aria-label="Offset wizard pick Line A"
                class="rounded-full bg-indigo-400/15 px-2.5 py-1 text-indigo-100"
                onclick={() => advanceOffsetWizard('lineA')}
              >
                Pick Line A
              </button>
            {:else if offsetWizardStage === 'surfaceA'}
              <button
                aria-label="Offset wizard pick Surface A"
                class="rounded-full bg-emerald-400/15 px-2.5 py-1 text-emerald-100"
                onclick={() => advanceOffsetWizard('surfaceA')}
              >
                Pick Surface A
              </button>
            {:else if offsetWizardStage === 'lineB'}
              <button
                aria-label="Offset wizard pick Line B"
                class="rounded-full bg-sky-400/15 px-2.5 py-1 text-sky-100"
                onclick={() => advanceOffsetWizard('lineB')}
              >
                Pick Line B
              </button>
            {:else if offsetWizardStage === 'surfaceB'}
              <button
                aria-label="Offset wizard pick Surface B"
                class="rounded-full bg-teal-400/15 px-2.5 py-1 text-teal-100"
                onclick={() => advanceOffsetWizard('surfaceB')}
              >
                Pick Surface B
              </button>
            {:else}
              <span class="rounded-full bg-white/5 px-2.5 py-1 text-white/68">{offsetLineSummary}</span>
              <span class="rounded-full bg-cyan-400/10 px-2.5 py-1 text-cyan-100">{offsetIntersectionSummary}</span>
              <button
                aria-label="Offset wizard re-pick A"
                class="rounded-full bg-white/5 px-2.5 py-1 text-white/70"
                onclick={() => advanceOffsetWizard('lineA')}
              >
                Re-pick A
              </button>
              <button
                aria-label="Offset wizard re-pick B"
                class="rounded-full bg-white/5 px-2.5 py-1 text-white/70"
                onclick={() => advanceOffsetWizard('lineB')}
              >
                Re-pick B
              </button>
              <button
                aria-label="Offset wizard place crossing"
                class="rounded-full bg-cyan-400/15 px-2.5 py-1 text-cyan-100 disabled:opacity-50"
                onclick={placeOffsetCrossingPoint}
                disabled={!offsetPreviewIntersection}
              >
                Place Crossing Point
              </button>
            {/if}
            <button class="rounded-full bg-white/5 px-2.5 py-1 text-white/70" onclick={clearOffsetWorkflow}>Clear</button>
            <span class={`rounded-full px-2.5 py-1 ${
              offsetWorkflowStatus.severity === 'error'
                ? 'bg-rose-400/12 text-rose-100'
                : offsetWorkflowStatus.severity === 'warning'
                  ? 'bg-amber-300/12 text-amber-100'
                  : offsetWorkflowStatus.severity === 'success'
                    ? 'bg-emerald-400/12 text-emerald-100'
                  : 'bg-white/5 text-white/68'
            }`}>{offsetWorkflowStatus.label}</span>
            <span class="rounded-full bg-white/5 px-2.5 py-1 text-white/62">{offsetWizardHint}</span>
          {/if}
        </div>
        {/if}
        {#if viewportHudExpanded && viewportHudTab === 'precision' && selectionInspector}
          <div class="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-white/75">
            <span class="text-[10px] uppercase tracking-[0.18em] text-white/50">Selection</span>
            <span class="rounded-full bg-white/6 px-2.5 py-1 text-white/88">{selectionInspector.title}</span>
            <span class="rounded-full bg-white/5 px-2.5 py-1 text-white/65">{selectionInspector.detail}</span>
          </div>
        {/if}
        {#if viewportHudExpanded && viewportHudTab === 'precision' && snapControlsVisible}
          <div class="pointer-events-auto mt-2 flex flex-wrap items-center gap-2 text-[11px] text-white/72">
            <span class="text-[10px] uppercase tracking-[0.18em] text-white/50">Snap</span>
            <button class={`rounded-full px-2.5 py-1 ${snapEndpoints ? 'bg-cyan-400/15 text-cyan-100' : 'bg-white/5 text-white/65'}`} onclick={() => (snapEndpoints = !snapEndpoints)}>Endpoints</button>
            <button class={`rounded-full px-2.5 py-1 ${snapMidpoints ? 'bg-cyan-400/15 text-cyan-100' : 'bg-white/5 text-white/65'}`} onclick={() => (snapMidpoints = !snapMidpoints)}>Midpoints</button>
            <button class={`rounded-full px-2.5 py-1 ${snapSurfaceProjection ? 'bg-cyan-400/15 text-cyan-100' : 'bg-white/5 text-white/65'}`} onclick={() => (snapSurfaceProjection = !snapSurfaceProjection)}>Surface</button>
            <div class="flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-white/60">
              <span>Threshold</span>
              <button class="rounded-full bg-white/5 px-1.5 text-white/70" onclick={() => (snapThresholdPx = Math.max(6, snapThresholdPx - 2))}>-</button>
              <span class="min-w-8 text-center">{snapThresholdPx}px</span>
              <button class="rounded-full bg-white/5 px-1.5 text-white/70" onclick={() => (snapThresholdPx = Math.min(40, snapThresholdPx + 2))}>+</button>
            </div>
          </div>
        {/if}
        {#if viewportHudExpanded && viewportHudTab === 'precision'}
        <div class="pointer-events-auto mt-2 flex flex-wrap items-center gap-2 text-[11px] text-white/72">
          <span class="text-[10px] uppercase tracking-[0.18em] text-white/50">Exact</span>
          <button
            class="rounded-full bg-white/5 px-2.5 py-1 text-white/72 disabled:opacity-40"
            onclick={createLineFromSelection}
            disabled={selectedPointSequence.length !== 2}
          >
            Create Line From Selection
          </button>
          <button
            class="rounded-full bg-white/5 px-2.5 py-1 text-white/72 disabled:opacity-40"
            onclick={createSurfaceFromSelection}
            disabled={selectedPointSequence.length < 3}
          >
            Create Surface From Selection
          </button>
          <span class="rounded-full bg-white/5 px-2.5 py-1 text-white/62">{exactGeometryHint}</span>
        </div>
        <div class="pointer-events-auto mt-2 flex flex-wrap items-center gap-2 text-[11px] text-white/72">
          <span class="text-[10px] uppercase tracking-[0.18em] text-white/50">Transform</span>
          <label class="rounded-full bg-white/5 px-2 py-1">
            dX
            <input class="ml-1.5 w-12 bg-transparent text-right outline-none" type="number" step="0.1" bind:value={transformDx} />
          </label>
          <label class="rounded-full bg-white/5 px-2 py-1">
            dY
            <input class="ml-1.5 w-12 bg-transparent text-right outline-none" type="number" step="0.1" bind:value={transformDy} />
          </label>
          <label class="rounded-full bg-white/5 px-2 py-1">
            dZ
            <input class="ml-1.5 w-12 bg-transparent text-right outline-none" type="number" step="0.1" bind:value={transformDz} />
          </label>
          <button
            class={`rounded-full px-2.5 py-1 ${transformLockX ? 'bg-cyan-400/20 text-cyan-200' : 'bg-white/5 text-white/72'}`}
            type="button"
            onclick={() => (transformLockX = !transformLockX)}
            aria-pressed={transformLockX}
          >
            Lock X
          </button>
          <button
            class={`rounded-full px-2.5 py-1 ${transformLockY ? 'bg-cyan-400/20 text-cyan-200' : 'bg-white/5 text-white/72'}`}
            type="button"
            onclick={() => (transformLockY = !transformLockY)}
            aria-pressed={transformLockY}
          >
            Lock Y
          </button>
          <button
            class={`rounded-full px-2.5 py-1 ${transformLockZ ? 'bg-cyan-400/20 text-cyan-200' : 'bg-white/5 text-white/72'}`}
            type="button"
            onclick={() => (transformLockZ = !transformLockZ)}
            aria-pressed={transformLockZ}
          >
            Lock Z
          </button>
          <button
            class="rounded-full bg-white/5 px-2.5 py-1 text-white/72 disabled:opacity-40"
            onclick={moveSelectedPointsByVector}
            disabled={selectedPointSequence.length < 1}
          >
            Move Points
          </button>
          <button
            class="rounded-full bg-white/5 px-2.5 py-1 text-white/72 disabled:opacity-40"
            onclick={copySelectedPointsByVector}
            disabled={selectedPointSequence.length < 1}
          >
            Copy Points
          </button>
          <span class="rounded-full bg-white/5 px-2.5 py-1 text-white/62">{transformHint}</span>
        </div>
        <div class="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-white/72">
          <span class="text-[10px] uppercase tracking-[0.18em] text-white/50">Rotate</span>
          <label class="rounded-full bg-white/5 px-2 py-1">
            Deg
            <input class="ml-1.5 w-12 bg-transparent text-right outline-none" type="number" step="1" bind:value={transformRotateDeg} />
          </label>
          <label class="rounded-full bg-white/5 px-2 py-1">
            Anchor
            <select class="ml-1.5 bg-transparent outline-none" bind:value={transformAnchorMode}>
              <option value="centroid">Centroid</option>
              <option value="last">Last Point</option>
              <option value="origin">Origin</option>
            </select>
          </label>
          <button
            class="rounded-full bg-white/5 px-2.5 py-1 text-white/72 disabled:opacity-40"
            onclick={rotateSelectedPointsAroundAnchor}
            disabled={selectedPointSequence.length < 1}
          >
            Rotate Points
          </button>
          <button
            class="rounded-full bg-white/5 px-2.5 py-1 text-white/72 disabled:opacity-40"
            onclick={rotateSelectedGeometryAroundAnchor}
            disabled={selectedPointSequence.length < 1 && selectedLineIds.length < 1 && selectedSurfaceCopyIds.length < 1}
          >
            Rotate Geometry
          </button>
          <button
            class="rounded-full bg-white/5 px-2.5 py-1 text-white/72 disabled:opacity-40"
            onclick={copySelectionByRotationAroundAnchor}
            disabled={selectedPointSequence.length < 1 && selectedLineIds.length < 1 && selectedSurfaceCopyIds.length < 1}
          >
            Copy Rotated Geometry
          </button>
          <span class="rounded-full bg-white/5 px-2.5 py-1 text-white/62">{rotationHint}</span>
          <span class="rounded-full bg-white/5 px-2.5 py-1 text-white/62">{rotationCopyHint}</span>
        </div>
        <div class="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-white/72">
          <span class="text-[10px] uppercase tracking-[0.18em] text-white/50">Mirror</span>
          <button
            class="rounded-full bg-white/5 px-2.5 py-1 text-white/72 disabled:opacity-40"
            onclick={() => mirrorSelectionAcrossAnchorAxis('x', true)}
            disabled={selectedPointSequence.length < 1}
          >
            Mirror Points X
          </button>
          <button
            class="rounded-full bg-white/5 px-2.5 py-1 text-white/72 disabled:opacity-40"
            onclick={() => mirrorSelectionAcrossAnchorAxis('y', true)}
            disabled={selectedPointSequence.length < 1}
          >
            Mirror Points Y
          </button>
          <button
            class="rounded-full bg-white/5 px-2.5 py-1 text-white/72 disabled:opacity-40"
            onclick={() => mirrorSelectionAcrossAnchorAxis('x')}
            disabled={selectedPointSequence.length < 1 && selectedLineIds.length < 1 && selectedSurfaceCopyIds.length < 1}
          >
            Mirror Geometry X
          </button>
          <button
            class="rounded-full bg-white/5 px-2.5 py-1 text-white/72 disabled:opacity-40"
            onclick={() => mirrorSelectionAcrossAnchorAxis('y')}
            disabled={selectedPointSequence.length < 1 && selectedLineIds.length < 1 && selectedSurfaceCopyIds.length < 1}
          >
            Mirror Geometry Y
          </button>
          <span class="rounded-full bg-white/5 px-2.5 py-1 text-white/62">{mirrorHint}</span>
          <button
            class="rounded-full bg-white/5 px-2.5 py-1 text-white/72 disabled:opacity-40"
            onclick={() => copySelectionByMirrorAroundAnchor('x')}
            disabled={selectedPointSequence.length < 1 && selectedLineIds.length < 1 && selectedSurfaceCopyIds.length < 1}
          >
            Copy Mirrored X
          </button>
          <button
            class="rounded-full bg-white/5 px-2.5 py-1 text-white/72 disabled:opacity-40"
            onclick={() => copySelectionByMirrorAroundAnchor('y')}
            disabled={selectedPointSequence.length < 1 && selectedLineIds.length < 1 && selectedSurfaceCopyIds.length < 1}
          >
            Copy Mirrored Y
          </button>
          <span class="rounded-full bg-white/5 px-2.5 py-1 text-white/62">{mirrorCopyHint}</span>
        </div>
        <div class="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-white/72">
          <span class="text-[10px] uppercase tracking-[0.18em] text-white/50">Topology</span>
          <button
            class="rounded-full bg-white/5 px-2.5 py-1 text-white/72 disabled:opacity-40"
            onclick={moveSelectedGeometryByVector}
            disabled={selectedPointSequence.length < 1 && selectedLineIds.length < 1 && selectedSurfaceCopyIds.length < 1}
          >
            Move Geometry
          </button>
          <button
            class="rounded-full bg-white/5 px-2.5 py-1 text-white/72 disabled:opacity-40"
            onclick={copySelectedGeometryByVector}
            disabled={selectedPointSequence.length < 1 && selectedLineIds.length < 1 && selectedSurfaceCopyIds.length < 1}
          >
            Copy Geometry
          </button>
          <span class="rounded-full bg-white/5 px-2.5 py-1 text-white/62">{geometryMoveHint}</span>
          <span class="rounded-full bg-white/5 px-2.5 py-1 text-white/62">{geometryCopyHint}</span>
        </div>
        {/if}
      </div>
      <div class="pointer-events-none absolute bottom-3 left-3 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-white/8 bg-slate-950/72 px-3 py-2 text-[10px] text-white/58 backdrop-blur-sm">
        <span class="uppercase tracking-[0.16em] text-white/42">Nav</span>
        <span>Drag rotate</span>
        <span>Shift+Drag pan</span>
        <span>Wheel zoom</span>
        <span>F fit</span>
        <span>R reset</span>
      </div>
      {#if manualPointModalOpen}
        <div class="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/45 backdrop-blur-[2px]">
          <div class="w-[min(420px,calc(100%-32px))] rounded-2xl border border-white/12 bg-slate-950/95 p-4 shadow-2xl">
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="text-sm font-semibold text-white/92">Add Point by Coordinates</div>
                <div class="mt-1 text-[11px] text-white/55">You clicked outside a surface. Enter an exact X, Y, Z point.</div>
              </div>
              <button class="rounded-full bg-white/5 px-2 py-1 text-[11px] text-white/70" onclick={() => (manualPointModalOpen = false)}>Close</button>
            </div>
            <form
              class="mt-4 grid gap-3 sm:grid-cols-3"
              onsubmit={(ev) => {
                ev.preventDefault();
                submitManualPoint();
              }}
            >
              <label class="text-[11px] text-white/55">
                X
                <input class="mt-1 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white outline-none" type="number" step="0.1" bind:value={createPtX} />
              </label>
              <label class="text-[11px] text-white/55">
                Y
                <input class="mt-1 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white outline-none" type="number" step="0.1" bind:value={createPtY} />
              </label>
              <label class="text-[11px] text-white/55">
                Z
                <input class="mt-1 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white outline-none" type="number" step="0.1" bind:value={createPtZ} />
              </label>
              <div class="sm:col-span-3 flex items-center justify-end gap-2 pt-1">
                <button type="button" class="rounded-full bg-white/5 px-3 py-1.5 text-[11px] text-white/70" onclick={() => (manualPointModalOpen = false)}>Cancel</button>
                <button type="submit" class="rounded-full bg-cyan-400/15 px-3 py-1.5 text-[11px] text-cyan-100">Place Point</button>
              </div>
            </form>
          </div>
        </div>
      {/if}
    </div>

    <SurfaceRightRail bind:rightRailCollapsed {coreMode} bind:advancedOpen {datumSliceBusy} pointsCount={points.length} edgesCount={edges.length} surfacesCount={surfaces.length} {statusWarnings} {SURFACE_ANALYTICS_ENABLED} bind:interpPct {interpPoint} bind:evalUseSelection bind:heatmapOn bind:evalTol bind:evalSigmaMult {evalBusy} {evalErr} {evalRes} bind:pendingPointIdx bind:cylUseSelection bind:cylShowAxis {cylBusy} {cylErr} {cylRes} bind:cylRefineK {cylThresholdAbs} {currentActiveFitPointIds} {selectedPointIds} {cylFitPointIds} bind:sliceAxis bind:sliceBins bind:sliceThickness bind:sliceMetric {sliceBusy} {sliceErr} {sliceRes} {datumPlaneChoices} bind:datumSlicePlaneIdx bind:datumSliceMode bind:datumSliceSpacing bind:datumSliceCount bind:datumSliceThickness bind:datumSliceUseSelection bind:includeOptionalSliceColumns {datumSliceErr} {datumSliceRes} {sliceSyncModel} bind:selectedSliceId {recipes} bind:selectedRecipeId bind:recipeNameDraft bind:recipeStepConfirmed {recipeRun} {activeEdgeIdx} setActiveEdgeIdx={(i) => (activeEdgeIdx = i)} {curves} {activeCurveIdx} setActiveCurveIdx={(i) => (activeCurveIdx = i)} {curveMode} {loftA} {loftB} setLoftA={(v) => (loftA = v)} setLoftB={(v) => (loftB = v)} loftSegmentsCount={loftSegments.length} {loftErr} {toolCursor} bind:samplerAppend bind:samplerMode bind:samplerNu bind:samplerNv bind:samplerEdgeSegs bind:samplerErr uxLevel={uxLevel} activeWorkflowHint={buildPrereqHint} onSetUxLevel={(level) => (uxLevel = level)} onSetRightRailCollapsed={setRightRailCollapsed} onOpenCreateGeometry={() => (createGeometryModalOpen = true)} onOpenDatums={openDatumsModal} onOpenSettings={() => (settingsOpen = true)} onClearPicks={() => { pendingPointIdx = null; intersection = null; clearOffsetWorkflow(); }} onToggleAdvancedOpen={() => (advancedOpen = !advancedOpen)} onClearWarnings={() => { statusWarnings = []; emittedWarningIds.clear(); }} {computeSurfaceEval} {computeCylinderFit} {cylSelectOutliers} {cylKeepInliers} {cylRemoveOutliers} {computeSectionSlices} computeDatumSlices={computeDatumSlices} {exportDatumSliceCombined} {saveCurrentRecipe} {deleteSelectedRecipe} {selectRecipe} {toggleSelectedRecipeStep} {startRecipeRun} {runRecipeNextStep} {cancelRecipeRun} {deleteEdge} {deleteCurve} {createCurve} {rebuildLoftSegments} {setToolCursor} {generateSamplerPoints} />
  </div>

  {#await import('./SurfaceIntegrityPanel.svelte') then integrityPanel}
    {@const IntegrityPanel = integrityPanel.default}
    <IntegrityPanel
      report={integrityReport}
      nonManifoldThreshold={integrityThreshold}
      onSetNonManifoldThreshold={(value) => (integrityThreshold = Number.isFinite(value) ? value : integrityThreshold)}
      onFixOrphans={removeOrphanPoints}
      onFixDuplicateLines={removeDuplicateLines}
    />
  {/await}

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

  {#await import('./SurfaceModalsWrapper.svelte') then modalsWrapper}
    {@const SurfaceModals = modalsWrapper.default}
    <SurfaceModals
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
  {/await}

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

  {#await import('./SurfaceCommandPalette.svelte') then commandPalette}
    {@const SurfacePalette = commandPalette.default}
    <SurfacePalette
      open={commandPaletteOpen}
      commands={surfaceCommands}
      onClose={() => (commandPaletteOpen = false)}
    />
  {/await}
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
