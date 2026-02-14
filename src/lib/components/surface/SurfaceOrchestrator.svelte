<script lang="ts">
import { onMount } from 'svelte';
import autoAnimate from '@formkit/auto-animate';
import SurfaceActionBar from './SurfaceActionBar.svelte';
import SurfaceRightRail from './SurfaceRightRail.svelte';
import SurfaceCanvas from './SurfaceCanvas.svelte';
import SurfaceModalsWrapper from './SurfaceModalsWrapper.svelte';
import { toast } from '../../ui/toast';
import { SURFACE_MOTION_SPEC, linePickState, nextCreateModeState, nextSelectionModeState, surfacePickState, transitionToolCursor, centeredModalPos, draggedModalPos, dragOffsetFromPointer, registerContextMenu, buildSurfaceNavMenu, mountSurfaceGlobalHandlers, mountSurfaceViewportInteraction, readPersistedCoreMode, readPersistedRightRailCollapsed, readWorkspaceUiState, writeWorkspaceUiState, hasSeenCoreModePrompt, markCoreModePromptSeen, persistCoreMode, persistRightRailCollapsed, loadWorkspaceRecipes, saveWorkspaceRecipes, createSnapshot, materializeSnapshot, canHistoryRedo, canHistoryUndo, popHistoryRedo, popHistoryUndo, pushHistoryUndo, buildLoftSegments, projectPoint, viewportFitToScreen, applySelectionHits, hitsInRect, hitsInLasso, buildSliceSyncModel, buildSurfaceCsv, readSurfaceCsvFile, readSurfaceStepFile, triggerCsvDownload, triggerJsonDownload, buildCombinedSliceCsv, buildSliceMetadataSidecar, computeDatumPlaneSlices, toStatusFromIntersection, toStatusFromSliceWarnings, buildSlicingRuntimeWarning, dispatchWarningToasts, mergeWarningsUntracked, createRecipeRun, recipeStepLabel, advanceRecipeRunUntilPause, findRecipeForRun, beginRecipeTransaction, finalizeRecipeTransaction, rollbackRecipeTransaction, motionMs, findBestSnapCandidate, makeHoverModeKey, nearestPointIndex, shouldProcessHover, shouldRecomputeHover, snapCandidateSignature, createDatumCsys as createDatumCsysDep, createDatumPlane as createDatumPlaneDep, planeBasis, surfaceNormal, vecAdd, vecScale, vecUnit, diagnoseIntersectionResult, precheckIntersectionInputs, buildHoverTooltip, computeCurveOffsetBestEffort, cylKeepInliersController, cylRemoveOutliersController, cylSelectOutliersController, cylThresholdAbsController, deleteSelectedRecipeController, saveCurrentRecipeController, selectRecipeController, selectedRecipeController, snapshotRecipeConfigController, toggleSelectedRecipeStepController, applyRecipeConfigController, bilerp, clamp, deg, lerp3, vecNorm, vecSub, edgeExists, activeFitPointIds, calcOffsetIntersectionApi, computeCylinderAxisSegment, computeCylinderEvaluation, computePlaneEvaluation, computeSectionSliceEvaluation } from './SurfaceOrchestratorDeps';
import { cancelRecipeRunUi, runRecipeNextStepUi, runRecipeUntilPauseUi, startRecipeRunUi } from './controllers/SurfaceRecipeRunUiController';
import { computeCylinderFitUi, computeDatumSlicesUi, computeSectionSlicesUi, computeSurfaceEvalUi, emitStatusWarningsUi, exportDatumSliceCombinedUi } from './controllers/SurfaceEvaluationUiController';
import { depthOpacityUi, nearestEdgeHitUi, pickOrbitPivotUi, pointDepthOpacityUi, rotateForViewUi, surfaceDepthOpacityUi } from './controllers/SurfaceViewportMathController';
import type { DatumSliceMode, DatumSliceRunResult, SurfaceStatusWarning, RecipeRunState, SurfaceRecipe, SurfaceRecipeConfig, SurfaceRecipeStep, RecipeTransaction, ToolCursorMode, SnapCandidate, IntersectionDiagnostics, HoverTooltip, Curve, DatumCsys, DatumPlane, Edge, Point3D, SurfaceFace, Snapshot } from './SurfaceOrchestratorDeps';
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
let selectedSet = $derived.by(() => new Set(selectedPointIds)), pointBaseRadius = $derived(selectionProfile === 'assisted' ? 6 : 5), edgeHitWidth = $derived(selectionProfile === 'assisted' ? 12 : 9), pointPriorityPx = $derived(selectionProfile === 'assisted' ? 18 : 14);
let selecting = $state(false), selStart = $state<{ x: number; y: number } | null>(null), selRect = $state<{ x0: number; y0: number; x1: number; y1: number } | null>(null), lasso = $state<{ x: number; y: number }[]>([]);
let snapEndpoints = $state(true), snapMidpoints = $state(false), snapCurveNearest = $state(false), snapSurfaceProjection = $state(false), snapThresholdPx = $state(16);
let activeSnap = $state<SnapCandidate | null>(null), hoverTooltip = $state<HoverTooltip | null>(null), hoverRaf = 0, hoverQueued = $state<{ x: number; y: number } | null>(null);
let lastHoverPos = $state<{ x: number; y: number }>({ x: Number.NaN, y: Number.NaN }), lastHoverModeKey = $state(''), lastSnapSig = $state('none');
let undoStack = $state<Snapshot[]>([]), redoStack = $state<Snapshot[]>([]), canUndo = $derived(canHistoryUndo({ undoStack, redoStack })), canRedo = $derived(canHistoryRedo({ undoStack, redoStack }));
let createPtX = $state(0), createPtY = $state(0), createPtZ = $state(0), createLineA = $state<number | null>(0), createLineB = $state<number | null>(1);
let surfaceDraft = $state<number[]>([]), surfaceCreateKind = $state<'triangle' | 'quad' | 'contour'>('quad'), createMode = $state<'idle' | 'point' | 'line' | 'surface'>('idle');
let creatorPick = $state<null | { kind: 'line'; slot: 'A' | 'B' } | { kind: 'surface'; slot: number }>(null), datumPick = $state<null | { target: 'csys3' | 'csysPointLine'; slot: 'origin' | 'x' | 'y' | 'line' }>(null), lineInsertPickMode = $state(false);
let selectedEntity = $state<null | { kind: 'point' | 'line' | 'surface' | 'plane' | 'csys'; index: number }>(null), settingsOpen = $state(false), coreMode = $state(true), advancedOpen = $state(false), rightRailCollapsed = $state(false);
let showCoreModePrompt = $state(false), datumsModalOpen = $state(false), createGeometryModalOpen = $state(false), surfaceCurveOpsModalOpen = $state(false), extrudeModalOpen = $state(false), healingModalOpen = $state(false);
let showPointEntities = $state(true), showLineEntities = $state(true), showSurfaceEntities = $state(true), showDatumEntities = $state(true), showSelectionLabels = $state(true);
let interpPct = $state(50), probeOn = $state(false), maxTaperDeg = $state(6), curveMode = $state(false), lineInsertT = $state(0.5);
let csysCreateMode = $state<'global' | 'three_points' | 'point_line' | 'copy'>('global'), csysOriginPoint = $state<number>(0), csysXPoint = $state<number>(1), csysYPoint = $state<number>(2), csysFromLine = $state<number>(0), csysCopyIdx = $state<number>(0);
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
let projected = $derived.by(() => points.map((p, i) => ({ ...p, ...projectPoint(p, rot, zoomK, w, h, pan), idx: i })));
let surfaceScreenCenters = $derived.by(() => surfaces.map((sf: SurfaceFace) => { const pts = sf.vertexIds.map((i: number) => projected[i]!); return { cx: pts.reduce((s: number, p) => s + p.x, 0) / pts.length, cy: pts.reduce((s: number, p) => s + p.y, 0) / pts.length, cz: pts.reduce((s: number, p) => s + p.z, 0) / pts.length }; }));
let surfaceWorldCenters = $derived.by(() => surfaces.map((sf: SurfaceFace) => { const pts = sf.vertexIds.map((i: number) => points[i]!); return { x: pts.reduce((s: number, p) => s + p.x, 0) / pts.length, y: pts.reduce((s: number, p) => s + p.y, 0) / pts.length, z: pts.reduce((s: number, p) => s + p.z, 0) / pts.length }; }));
let sortedEdges = $derived.by(() => { const proj = projected; return edges.map((e, i) => ({ i, a: e[0], b: e[1], z: (proj[e[0]]!.z + proj[e[1]]!.z) / 2 })).sort((a, b) => a.z - b.z); });
let sortedSurfaces = $derived.by(() => { const centers = surfaceScreenCenters; return surfaces.map((sf: SurfaceFace, i: number) => ({ i, pts: sf.vertexIds, z: centers[i]!.cz, name: sf.name ?? `Surface ${i}` })).sort((a, b) => a.z - b.z); });
let datumPlanePatches = $derived.by(() => planes.map((p: DatumPlane, i: number) => { const xDirVal = p.xDir ?? { x: 1, y: 0, z: 0 }; const { normal } = p; const yDir = vecUnit(vecSub(vecScale(xDirVal, 0), vecScale(normal, 0))); const pts = [vecAdd(p.origin, vecAdd(vecScale(xDirVal, -50), vecScale(yDir, -50))), vecAdd(p.origin, vecAdd(vecScale(xDirVal, 50), vecScale(yDir, -50))), vecAdd(p.origin, vecAdd(vecScale(xDirVal, 50), vecScale(yDir, 50))), vecAdd(p.origin, vecAdd(vecScale(xDirVal, -50), vecScale(yDir, 50)))]; return { i, name: p.name, pts: pts.map((pt: Point3D) => projectPoint(pt, rot, zoomK, w, h, pan)) }; }));
let datumAxisSegments = $derived.by(() => { const result: { i: number; csysIdx: number; axis: 'X' | 'Y' | 'Z'; a: Point3D; b: Point3D }[] = []; csys.forEach((cs: DatumCsys, idx: number) => { const endX = vecAdd(cs.origin, vecScale(cs.xAxis, 30)); const endY = vecAdd(cs.origin, vecScale(cs.yAxis, 30)); const endZ = vecAdd(cs.origin, vecScale(cs.zAxis, 30)); const origin = projectPoint(cs.origin, rot, zoomK, w, h, pan); result.push({ i: result.length, csysIdx: idx, axis: 'X', a: origin, b: projectPoint(endX, rot, zoomK, w, h, pan) }); result.push({ i: result.length, csysIdx: idx, axis: 'Y', a: origin, b: projectPoint(endY, rot, zoomK, w, h, pan) }); result.push({ i: result.length, csysIdx: idx, axis: 'Z', a: origin, b: projectPoint(endZ, rot, zoomK, w, h, pan) }); }); return result; });
let zRange = $derived.by(() => { const zs = projected.map((p: Point3D & { z: number }) => p.z); return zs.length ? { min: Math.min(...zs), max: Math.max(...zs) } : { min: 0, max: 1 }; });
let cylAxisSeg = $derived.by(() => cylRes && cylShowAxis ? computeCylinderAxisSegment(points, cylRes, cylShowAxis) : null);
let interpPoint = $derived.by(() => activeEdgeIdx !== null && edges[activeEdgeIdx] ? lerp3(points[edges[activeEdgeIdx]![0]]!, points[edges[activeEdgeIdx]![1]]!, interpPct / 100) : null);
let selectedBadge = $derived.by(() => { const entity = selectedEntity; if (!entity) return null; let label = ''; if (entity.kind === 'point') label = `Point ${entity.index}`; else if (entity.kind === 'line') label = `Line ${entity.index}`; else if (entity.kind === 'surface') label = `Surface ${entity.index}`; else if (entity.kind === 'plane') label = planes[entity.index]?.name ?? `Plane ${entity.index}`; else if (entity.kind === 'csys') label = csys[entity.index]?.name ?? `Csys ${entity.index}`; if (!label) return null; const worldPos = entity.kind === 'point' ? points[entity.index] : entity.kind === 'line' ? lerp3(points[edges[entity.index]![0]]!, points[edges[entity.index]![1]]!, 0.5) : { x: 0, y: 0, z: 0 }; const screenPos = projectPoint(worldPos, rot, zoomK, w, h, pan); return { x: screenPos.x, y: screenPos.y, label }; });
let creatorHint = $derived.by(() => Logic.getCreatorHint({ toolCursor, creatorPick, surfaceCreateKind, surfaceDraft, datumPick }));
let surfaceDraftRequired = $derived(surfaceCreateKind === 'triangle' ? 3 : surfaceCreateKind === 'quad' ? 4 : 3);
let surfaceDraftRemaining = $derived(Math.max(0, surfaceDraftRequired - surfaceDraft.length));
let surfaceFlowHint = $derived.by(() => Logic.getSurfaceFlowHint({ toolCursor, creatorPick, surfaceCreateKind, surfaceDraft, datumPick }));
let datumPickHint = $derived.by(() => Logic.getDatumPickHint({ toolCursor, creatorPick, surfaceCreateKind, surfaceDraft, datumPick }));
let datumPlaneChoices = $derived.by(() => planes.length > 0 ? planes : [{ name: 'Global XY', origin: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 0, z: 1 }, xDir: { x: 1, y: 0, z: 0 }, source: 'default' }]);
const snap = (): Snapshot => createSnapshot(points, edges, curves, surfaces, csys, planes, activeEdgeIdx);
const pushUndo = () => { const stacks = pushHistoryUndo({ undoStack, redoStack }, snap()); undoStack = stacks.undoStack; redoStack = stacks.redoStack; };
const applySnap = (s: Snapshot) => { const m = materializeSnapshot(s); points = m.points; edges = m.edges; curves = m.curves; surfaces = m.surfaces; csys = m.csys; planes = m.planes; activeEdgeIdx = m.activeEdgeIdx; };
const undo = () => { const res = popHistoryUndo({ undoStack, redoStack }, snap()); if (!res.snapshot) return; undoStack = res.stacks.undoStack; redoStack = res.stacks.redoStack; applySnap(res.snapshot); };
const redo = () => { const res = popHistoryRedo({ undoStack, redoStack }, snap()); if (!res.snapshot) return; undoStack = res.stacks.undoStack; redoStack = res.stacks.redoStack; applySnap(res.snapshot); };
const clearSelection = () => (selectedPointIds = []);
const invertSelection = () => (selectedPointIds = Logic.invertSelection(points, selectedPointIds));
const openViewportMenu = (e: MouseEvent) => { e.preventDefault(); e.stopPropagation(); const rect = viewportEl?.getBoundingClientRect(); vpMenuOpen = true; vpMenuX = rect ? e.clientX - rect.left : e.clientX; vpMenuY = rect ? e.clientY - rect.top : e.clientY; };
const closeViewportMenu = () => { vpMenuOpen = false; };
const resetView = () => { rot = { alpha: -0.65, beta: 0.35 }; zoomK = 1; pan = { x: 0, y: 0 }; };
const fitToScreen = () => { const fitted = viewportFitToScreen(points, rot, w, h); if (!fitted) return; zoomK = fitted.zoomK; pan = fitted.pan; };
const svgCoordsFromEvent = (ev: PointerEvent | MouseEvent) => Logic.svgCoordsFromEvent(ev, svgEl);
const applySelectionFromHits = (hits: number[], ev: PointerEvent | MouseEvent) => { selectedPointIds = Logic.applySelectionFromHits(hits, selectedPointIds, { shiftKey: ev.shiftKey, altKey: ev.altKey }); };
const exportCSV = () => { const csv = buildSurfaceCsv(points, edges); triggerCsvDownload(csv, 'surface-data.csv'); };
const exportSTEP = () => { toast.info('STEP export not yet implemented'); };
const createPoint = () => { pushUndo(); points = [...points, { x: createPtX, y: createPtY, z: createPtZ }]; toast.success(`Created point ${points.length - 1}`); };
const generateSamplerPoints = async () => { setLastAction('samplerGenerate'); const result = Logic.generateSamplerPoints({ points, samplerMode, samplerNu, samplerNv, samplerEdgeSegs, samplerAppend }); samplerErr = result.error; if (!result.success || !result.newPoints) return; pushUndo(); if (samplerAppend) points = [...points, ...result.newPoints]; else { points = result.newPoints; edges = []; curves = []; surfaces = []; planes = []; csys = [csys[0]]; activeCurveIdx = null; loftA = null; loftB = null; loftSegments = []; activeEdgeIdx = null; pendingPointIdx = null; selectedPointIds = []; } };
const setSelectionMode = (m: SelectionMode) => { const next = nextSelectionModeState({ nextMode: m, curveMode, createMode, pendingPointIdx }); selectionMode = next.selectionMode; curveMode = next.curveMode; createMode = next.createMode; pendingPointIdx = next.pendingPointIdx; if (m !== 'none') toolCursor = 'select'; }, setCreateMode = (m: 'idle' | 'point' | 'line' | 'surface') => { const next = nextCreateModeState({ nextMode: m, selectionMode, curveMode, pendingPointIdx, creatorPick, surfaceDraft }); createMode = next.createMode; selectionMode = next.selectionMode; curveMode = next.curveMode; pendingPointIdx = next.pendingPointIdx; creatorPick = next.creatorPick; surfaceDraft = next.surfaceDraft; if (m === 'line') toolCursor = 'line'; else if (m === 'surface') toolCursor = 'surface'; else if (toolCursor === 'line' || toolCursor === 'surface') toolCursor = 'select'; }, requirePointPrereq = (m: string) => { if (points.length < 2) { toast.warning(`Need at least 2 points for ${m} mode`); return false; } return true; }, beginLinePick = (slot: 'A' | 'B') => { if (!requirePointPrereq('line')) return; if (slot === 'A') { setToolCursor('line'); return; } const next = linePickState(slot); createMode = next.createMode; selectionMode = next.selectionMode; curveMode = next.curveMode; pendingPointIdx = next.pendingPointIdx; creatorPick = next.creatorPick; surfaceDraft = []; }, beginSurfacePick = (slot: number) => { if (!requirePointPrereq('surface')) return; if (slot === 0) { setToolCursor('surface'); return; } const next = surfacePickState(slot); createMode = next.createMode; selectionMode = next.selectionMode; curveMode = next.curveMode; pendingPointIdx = next.pendingPointIdx; creatorPick = next.creatorPick; }, setToolCursor = (mode: ToolCursorMode) => { if (mode === 'line' && !requirePointPrereq('line')) mode = 'select'; if (mode === 'surface' && !requirePointPrereq('surface')) mode = 'select'; const next = transitionToolCursor({ mode, surfaceDraft }); toolCursor = next.toolCursor; selectionMode = next.selectionMode; createMode = next.createMode; curveMode = next.curveMode; lineInsertPickMode = next.lineInsertPickMode; creatorPick = next.creatorPick; pendingPointIdx = next.pendingPointIdx; surfaceDraft = next.surfaceDraft; };
const openDatumsModal = () => { datumsModalOpen = true; const ww = typeof window !== 'undefined' ? window.innerWidth : 1200, wh = typeof window !== 'undefined' ? window.innerHeight : 800; if (!datumsModalDragging) datumsModalPos = centeredModalPos({ windowWidth: ww, windowHeight: wh, panelWidth: 760, panelHeight: 440, margin: 20 }); }, startDatumsModalDrag = (ev: PointerEvent) => { ev.stopPropagation(); datumsModalDragging = true; datumsModalDragOffset = dragOffsetFromPointer(ev.clientX, ev.clientY, datumsModalPos); const onMove = (e: PointerEvent) => { if (!datumsModalDragging) return; datumsModalPos = draggedModalPos(e.clientX, e.clientY, datumsModalDragOffset, 12); }, onUp = () => { datumsModalDragging = false; document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp); }; document.addEventListener('pointermove', onMove); document.addEventListener('pointerup', onUp); };
const onSvgPointerDown = (ev: PointerEvent) => { const coords = svgCoordsFromEvent(ev); if (!coords) return; const hits = hitsInRect(projected, { x0: coords.x - pointPriorityPx / 2, y0: coords.y - pointPriorityPx / 2, x1: coords.x + pointPriorityPx / 2, y1: coords.y + pointPriorityPx / 2 }); if (hits.length) applySelectionFromHits(hits, ev); else { selecting = true; selStart = coords; selRect = null; lasso = []; } };
const onSvgPointerMove = (ev: PointerEvent) => { if (!selecting || !selStart) return; const coords = svgCoordsFromEvent(ev); if (!coords) return; if (selectionMode === 'box') selRect = { x0: Math.min(selStart.x, coords.x), y0: Math.min(selStart.y, coords.y), x1: Math.max(selStart.x, coords.x), y1: Math.max(selStart.y, coords.y) }; else if (selectionMode === 'lasso') lasso = [...lasso, coords]; };
const onSvgPointerUp = (ev: PointerEvent) => { if (!selecting) return; selecting = false; if (selectionMode === 'box' && selRect) applySelectionFromHits(hitsInRect(projected, selRect), ev); else if (selectionMode === 'lasso' && lasso.length) applySelectionFromHits(hitsInLasso(projected, lasso), ev); selStart = null; selRect = null; lasso = []; };
const updateProbeFromEvent = (ev: MouseEvent) => { if (!probeOn) return; const coords = svgCoordsFromEvent(ev); if (!coords) return; const nearest = Logic.nearestPoint(coords.x, coords.y, projected); if (nearest === null) return; const angle = Logic.estimateTaperAngleAtPoint(nearest, edges, points); probe = { x: coords.x, y: coords.y, angleDeg: angle, ok: angle <= maxTaperDeg }; };
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
  toast.success('Created line');
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
const handlePointClick = (idx: number, ev?: MouseEvent) => { const result = Logic.handlePointClick(idx, ev as PointerEvent, creatorPick, surfaceDraft, datumPick, lineInsertPickMode, createLineA, createLineB, points, csys, edges, curves); pendingPointIdx = result.pendingPointIdx; creatorPick = result.creatorPick; surfaceDraft = result.surfaceDraft; datumPick = result.datumPick; lineInsertPickMode = result.lineInsertPickMode; if (result.createLineA !== undefined) createLineA = result.createLineA; if (result.createLineB !== undefined) createLineB = result.createLineB; };
const onEdgeClick = (idx: number) => { selectedEntity = { kind: 'line', index: idx }; }, onSurfaceClick = (idx: number) => { selectedEntity = { kind: 'surface', index: idx }; }, onPlaneClick = (idx: number) => { selectedEntity = { kind: 'plane', index: idx }; }, onCsysClick = (idx: number) => { selectedEntity = { kind: 'csys', index: idx }; };
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
const deleteEdge = (idx: number) => { pushUndo(); edges = edges.filter((_, i) => i !== idx); if (activeEdgeIdx === idx) activeEdgeIdx = null; toast.success('Deleted line'); };
const deleteCurve = (idx: number) => { pushUndo(); curves = curves.filter((_, i) => i !== idx); if (activeCurveIdx === idx) activeCurveIdx = null; toast.success('Deleted curve'); };
const createCurve = () => { if (activeEdgeIdx === null) return; const result = Logic.convertEdgeToCurve({ edgeIdx: activeEdgeIdx, edges, curves, points }); if (!result.success || !result.curves) { toast.error(result.error ?? 'Failed to create curve'); return; } pushUndo(); curves = result.curves; activeCurveIdx = curves.length - 1; toast.success('Created curve from line'); };
const rebuildLoftSegments = () => { if (loftA !== null && loftB !== null) { const result = buildLoftSegments(curves, points, loftA, loftB); loftSegments = result.segments; loftErr = result.error; } };
const calcOffsetIntersection = async () => { if (selEdgeA === null || selEdgeB === null || refPointIdx === null) return; intersectionBusy = true; const check = precheckIntersectionInputs({ selEdgeA, selEdgeB, edges, points }); intersectionDiagnostics = check.diagnostics; if (!check.ok) { intersectionBusy = false; return; } const ea = edges[selEdgeA]; const eb = edges[selEdgeB]; const result = await calcOffsetIntersectionApi({ p1A: points[ea[0]], p1B: points[ea[1]], p2A: points[eb[0]], p2B: points[eb[1]], offsetDist, directionRef: points[refPointIdx] }); intersection = result.intersection; intersectionDiagnostics = diagnoseIntersectionResult({ skew: result.skew, offsetDistance: offsetDist, angleDeg: check.diagnostics.angleDeg, existing: check.diagnostics }); intersectionBusy = false; };
const startRecipeRun = () => startRecipeRunUi(recipeUiCtx() as any), runRecipeNextStep = () => runRecipeNextStepUi(recipeUiCtx() as any), cancelRecipeRun = () => cancelRecipeRunUi(recipeUiCtx() as any);
const chooseCoreMode = (mode: boolean) => { coreMode = mode; showCoreModePrompt = false; persistCoreMode(mode); markCoreModePromptSeen(); };
const setRightRailCollapsed = (val: boolean) => { rightRailCollapsed = val; persistRightRailCollapsed(val); };
const depthOpacity = (z: number) => depthOpacityUi(z, zRange), pointDepthOpacity = (z: number) => depthOpacityUi(z, zRange), surfaceDepthOpacity = (z: number) => surfaceDepthOpacityUi(z, zRange);
const keyActivate = (e: KeyboardEvent, fn: () => void) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } }, project = (p: Point3D) => projectPoint(p, rot, zoomK, w, h, pan), heatColor = (d: number, scale: number) => { const low = -scale; const high = scale; if (d <= low) return '#3b82f6'; if (d >= high) return '#ef4444'; const t = (d - low) / (high - low); return t < 0.5 ? `rgb(${Math.round(59 + (255 - 59) * (t * 2))}, ${Math.round(130 + (255 - 130) * (t * 2))}, ${Math.round(246 + (255 - 246) * (t * 2))})` : `rgb(${Math.round(255 - (255 - 239) * ((t - 0.5) * 2))}, ${Math.round(255 - (255 - 68) * ((t - 0.5) * 2))}, ${Math.round(255 - (255 - 68) * ((t - 0.5) * 2))})`; };
const nearestEdgeHit = (mx: number, my: number) => nearestEdgeHitUi(mx, my, edges, projected), cylThresholdAbs = () => cylThresholdAbsController(cylUiCtx());
const currentActiveFitPointIds = () => activeFitPointIds(cylUseSelection, selectedPointIds, points);
$effect(() => { if (loftA !== null && loftB !== null) { const result = buildLoftSegments(curves, points, loftA, loftB); loftSegments = result.segments; loftErr = result.error; } else { loftSegments = []; loftErr = null; } }); $effect(() => { const maxIdx = Math.max(0, datumPlaneChoices.length - 1); datumSlicePlaneIdx = clamp(datumSlicePlaneIdx, 0, maxIdx); });
onMount(() => { if (typeof window !== 'undefined') { const mode = readPersistedCoreMode(); if (mode !== null) coreMode = mode; const col = readPersistedRightRailCollapsed(); if (col !== null) rightRailCollapsed = col; showCoreModePrompt = !hasSeenCoreModePrompt(); const ui = readWorkspaceUiState('surface'); if (ui) { if (ui.zoomK !== undefined) zoomK = ui.zoomK; if (ui.pan) pan = ui.pan; if (ui.rot) rot = ui.rot; } const loaded = loadWorkspaceRecipes('surface'); recipes = Array.isArray(loaded) ? loaded : loaded.recipes; } if (actionsBarEl) autoAnimate(actionsBarEl); if (viewportEl) { const unsub1 = mountSurfaceGlobalHandlers({ getLastAction: () => lastAction, undo, redo, canUndo, canRedo, coreMode, rightRailCollapsed, openCreateGeometry: () => { createGeometryModalOpen = true; }, openSurfaceCurveOps: () => { surfaceCurveOpsModalOpen = true; }, openExtrude: () => { extrudeModalOpen = true; }, openDatums: openDatumsModal, openSettings: () => { settingsOpen = true; }, clearPicks: () => { pendingPointIdx = null; intersection = null; }, fitToScreen, resetView, toggleCoreMode: () => { coreMode = !coreMode; persistCoreMode(coreMode); }, toggleRightRail: () => { rightRailCollapsed = !rightRailCollapsed; persistRightRailCollapsed(rightRailCollapsed); }, exportCsv: exportCSV, exportStep: exportSTEP }); const unsub2 = mountSurfaceViewportInteraction({ viewportEl, svgEl, getSelectionMode: () => selectionMode, getZoomK: () => zoomK, setZoomK: (v) => { zoomK = v; }, getPan: () => pan, setPan: (v) => { pan = v; }, getRot: () => rot, setRot: (v) => { rot = v; }, getW: () => w, getH: () => h, setW: (v) => { w = v; }, setH: (v) => { h = v; }, getRotateAnchor: () => rotateAnchor, setRotateAnchor: (v) => { rotateAnchor = v; }, pickOrbitPivot: (mx, my) => { const np = nearestPointIndex(projected, mx, my, 18); if (np != null && projected[np] && Math.hypot(projected[np].x - mx, projected[np].y - my) < 20) return points[np]; return points[0] ?? { x: 0, y: 0, z: 0 }; }, rotateForView: (p, r) => rotateForViewUi(p, r) }); return () => { unsub1(); unsub2(); }; } registerContextMenu(buildSurfaceNavMenu({ canUndo, canRedo, coreMode, rightRailCollapsed })); });
</script>
<div class="space-y-6 surface-lab surface-reveal" style={`--surface-motion-ease:${SURFACE_MOTION_SPEC.easing};`}>
  <div class="flex items-center justify-between">
    <div>
      <div class="text-sm font-semibold surface-accent-rule inline-block">3D Surface Builder</div>
      <div class="text-[11px] text-white/50">
        Create in order: Point -> Line -> Surface. Drag to rotate, wheel to zoom, Shift to pan.
      </div>
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
      selectedCount={selectedPointIds.length}
      {selectionProfile}
      {createPrereqNotice}
      {topCreateHint}
      bind:fileNotice
      {canUndo}
      {canRedo}
      {minPointsFor}
      pointsCount={points.length}
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
    />
  </div>

  <div class={`grid grid-cols-1 ${rightRailCollapsed ? 'lg:grid-cols-[1fr_56px]' : 'lg:grid-cols-[1fr_380px]'} gap-6`}>
    <div class="glass-panel rounded-2xl p-3 overflow-hidden h-[82vh]">
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
        {sortedEdges}
        {datumPlanePatches}
        {datumAxisSegments}
        {projected}
        {pointBaseRadius}
        {edgeHitWidth}
        {activeEdgeIdx}
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
        cullMargin={120}
        vpMenuOpen={vpMenuOpen}
        vpMenuX={vpMenuX}
        vpMenuY={vpMenuY}
        {fitToScreen}
        {resetView}
        {selectedBadge}
      />
    </div>

    <SurfaceRightRail bind:rightRailCollapsed {coreMode} bind:advancedOpen {datumSliceBusy} pointsCount={points.length} edgesCount={edges.length} surfacesCount={surfaces.length} {statusWarnings} {SURFACE_ANALYTICS_ENABLED} bind:interpPct {interpPoint} {edges} {points} bind:selEdgeA bind:selEdgeB bind:offsetDist bind:refPointIdx {intersection} {intersectionBusy} {intersectionDiagnostics} bind:evalUseSelection bind:heatmapOn bind:evalTol bind:evalSigmaMult {evalBusy} {evalErr} {evalRes} bind:pendingPointIdx bind:cylUseSelection bind:cylShowAxis {cylBusy} {cylErr} {cylRes} bind:cylRefineK {cylThresholdAbs} {currentActiveFitPointIds} {selectedPointIds} {cylFitPointIds} bind:sliceAxis bind:sliceBins bind:sliceThickness bind:sliceMetric {sliceBusy} {sliceErr} {sliceRes} {datumPlaneChoices} bind:datumSlicePlaneIdx bind:datumSliceMode bind:datumSliceSpacing bind:datumSliceCount bind:datumSliceThickness bind:datumSliceUseSelection bind:includeOptionalSliceColumns {datumSliceErr} {datumSliceRes} {sliceSyncModel} bind:selectedSliceId {recipes} bind:selectedRecipeId bind:recipeNameDraft bind:recipeStepConfirmed {recipeRun} {activeEdgeIdx} setActiveEdgeIdx={(i) => (activeEdgeIdx = i)} {curves} {activeCurveIdx} setActiveCurveIdx={(i) => (activeCurveIdx = i)} {curveMode} {loftA} {loftB} setLoftA={(v) => (loftA = v)} setLoftB={(v) => (loftB = v)} loftSegmentsCount={loftSegments.length} {loftErr} {toolCursor} bind:samplerAppend bind:samplerMode bind:samplerNu bind:samplerNv bind:samplerEdgeSegs bind:samplerErr onSetRightRailCollapsed={setRightRailCollapsed} onOpenCreateGeometry={() => (createGeometryModalOpen = true)} onOpenDatums={openDatumsModal} onOpenSettings={() => (settingsOpen = true)} onClearPicks={() => { pendingPointIdx = null; intersection = null; }} onToggleAdvancedOpen={() => (advancedOpen = !advancedOpen)} onClearWarnings={() => { statusWarnings = []; emittedWarningIds.clear(); }} {computeSurfaceEval} {computeCylinderFit} {cylSelectOutliers} {cylKeepInliers} {cylRemoveOutliers} {computeSectionSlices} computeDatumSlices={computeDatumSlices} {exportDatumSliceCombined} {calcOffsetIntersection} {saveCurrentRecipe} {deleteSelectedRecipe} {selectRecipe} {toggleSelectedRecipeStep} {startRecipeRun} {runRecipeNextStep} {cancelRecipeRun} {deleteEdge} {deleteCurve} {createCurve} {rebuildLoftSegments} {setToolCursor} {generateSamplerPoints} />
  </div>

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
    bind:csysCreateMode bind:csysOriginPoint bind:csysXPoint bind:csysYPoint bind:csysFromLine bind:csysCopyIdx
    bind:planeCreateMode bind:planeP0 bind:planeP1 bind:planeP2 bind:planeNormalVec bind:planeOffsetSurface bind:planeOffsetDist bind:planeLineA bind:planeLineB bind:planeDirPoint bind:planeDirVec bind:planeCsysIdx bind:planePrincipal
    {datumPickHint} {startDatumsModalDrag} {armDatumPick} {addDatumCsys} {addDatumPlane} {csys} {planes}
    bind:createGeometryModalOpen bind:createGeomModalPanelEl pointsCount={points.length} minLinePoints={minPointsFor.line} minSurfacePoints={minPointsFor.surface}
    {creatorHint} {surfaceFlowHint} bind:surfaceDraft {surfaceDraftRequired} bind:surfaceCreateKind bind:creatorPick bind:createLineA bind:createLineB bind:createPtX bind:createPtY bind:createPtZ
    {beginLinePick} {beginSurfacePick} {addPoint} {finishContourSurface}
    bind:surfaceCurveOpsModalOpen bind:surfCurveModalPanelEl bind:selectedEntity bind:lineInsertT bind:lineInsertPickMode bind:toolCursor
    bind:offsetSurfaceIdx bind:offsetSurfaceDist bind:offsetCurveIdx bind:offsetCurveSurfaceIdx bind:offsetCurveDist bind:offsetCurveFlip bind:offsetCurveStatus
    {insertPointOnEdge} {setToolCursor} {offsetSurfaceCreate} {offsetCurveOnSurfaceCreate}
    bind:extrudeModalOpen bind:extrudeTarget bind:extrudeLineIdx bind:extrudeCurveIdx bind:extrudeDirMode bind:extrudeDistance bind:extrudeVector bind:extrudeSurfaceIdx bind:extrudeFlip {extrudeLineOrCurve}
    bind:healingModalOpen bind:healingModalPanelEl bind:healTol {runTopologyHealing}
    bind:settingsOpen bind:showSelectionLabels bind:showPointEntities bind:showLineEntities bind:showSurfaceEntities bind:showDatumEntities
    bind:snapEndpoints bind:snapMidpoints bind:snapCurveNearest bind:snapSurfaceProjection bind:snapThresholdPx
  />
</div>
