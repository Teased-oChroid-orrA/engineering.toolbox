<script lang="ts">
import { onMount } from 'svelte';
  // @formkit/auto-animate exports a default function (not a named export)
  import autoAnimate from '@formkit/auto-animate';

  import SurfaceActionBar from './SurfaceActionBar.svelte';
  import SurfaceRightRail from './SurfaceRightRail.svelte';
  import SurfaceCanvas from './SurfaceCanvas.svelte';
  import SurfaceModalStack from './SurfaceModalStack.svelte';
  import { toast } from '../../ui/toast';
  import {
    computeCylinderEvaluation,
    computePlaneEvaluation,
    computeSectionSliceEvaluation,
    buildSurfaceCsv,
    readSurfaceCsvFile,
    readSurfaceStepFile,
    triggerCsvDownload,
    triggerJsonDownload,
    buildCombinedSliceCsv,
    buildSliceMetadataSidecar,
    computeDatumPlaneSlices,
    buildSliceSyncModel,
    toStatusFromIntersection,
    toStatusFromSliceWarnings,
    buildSlicingRuntimeWarning,
    dispatchWarningToasts,
    mergeWarningsUntracked,
    createRecipeRun,
    loadWorkspaceRecipes,
    recipeStepLabel,
    saveWorkspaceRecipes,
    advanceRecipeRunUntilPause,
    findRecipeForRun,
    beginRecipeTransaction,
    finalizeRecipeTransaction,
    rollbackRecipeTransaction,
    SURFACE_MOTION_SPEC,
    motionMs,
    linePickState,
    nextCreateModeState,
    nextSelectionModeState,
    surfacePickState,
    transitionToolCursor,
    findBestSnapCandidate,
    makeHoverModeKey,
    nearestPointIndex,
    shouldProcessHover,
    shouldRecomputeHover,
    snapCandidateSignature,
    centeredModalPos,
    draggedModalPos,
    dragOffsetFromPointer,
    createDatumCsys,
    createDatumPlane,
    planeBasis,
    surfaceNormal,
    vecAdd,
    vecScale,
    vecUnit,
    diagnoseIntersectionResult,
    precheckIntersectionInputs,
    buildHoverTooltip,
    computeCurveOffsetBestEffort,
    hasSeenCoreModePrompt,
    markCoreModePromptSeen,
    persistCoreMode,
    persistRightRailCollapsed,
    readPersistedCoreMode,
    readPersistedRightRailCollapsed,
    readWorkspaceUiState,
    writeWorkspaceUiState,
    registerContextMenu,
    buildSurfaceNavMenu,
    mountSurfaceGlobalHandlers,
    mountSurfaceViewportInteraction,
    cylKeepInliersController,
    cylRemoveOutliersController,
    cylSelectOutliersController,
    cylThresholdAbsController,
    deleteSelectedRecipeController,
    saveCurrentRecipeController,
    selectRecipeController,
    selectedRecipeController,
    snapshotRecipeConfigController,
    toggleSelectedRecipeStepController,
    applyRecipeConfigController,
    bilerp,
    clamp,
    deg,
    lerp3,
    vecNorm,
    vecSub,
    edgeExists,
    buildLoftSegments,
    activeFitPointIds,
    calcOffsetIntersectionApi,
    computeCylinderAxisSegment,
    viewportFitToScreen,
    projectPoint,
    applySelectionHits,
    hitsInLasso,
    hitsInRect,
    createSnapshot,
    materializeSnapshot,
    canHistoryRedo,
    canHistoryUndo,
    popHistoryRedo,
    popHistoryUndo,
    pushHistoryUndo
  } from './SurfaceOrchestratorDeps';
  import {
    cancelRecipeRunUi,
    runRecipeNextStepUi,
    runRecipeUntilPauseUi,
    startRecipeRunUi
  } from './controllers/SurfaceRecipeRunUiController';
  import {
    computeCylinderFitUi,
    computeDatumSlicesUi,
    computeSectionSlicesUi,
    computeSurfaceEvalUi,
    emitStatusWarningsUi,
    exportDatumSliceCombinedUi
  } from './controllers/SurfaceEvaluationUiController';
  import {
    depthOpacityUi,
    nearestEdgeHitUi,
    pickOrbitPivotUi,
    pointDepthOpacityUi,
    rotateForViewUi,
    surfaceDepthOpacityUi
  } from './controllers/SurfaceViewportMathController';
  import type {
    DatumSliceMode,
    DatumSliceRunResult,
    SurfaceStatusWarning,
    RecipeRunState,
    SurfaceRecipe,
    SurfaceRecipeConfig,
    SurfaceRecipeStep,
    RecipeTransaction,
    ToolCursorMode,
    SnapCandidate,
    IntersectionDiagnostics,
    HoverTooltip,
    Curve,
    DatumCsys,
    DatumPlane,
    Edge,
    Point3D,
    SurfaceFace,
    Snapshot
  } from './SurfaceOrchestratorDeps';

  // --- Dev-only diagnostics ---
  // Track the last UI action so runtime errors are attributable.
  let lastAction = $state<string>('init');
  const setLastAction = (a: string) => {
    lastAction = a;
  };

  const SURFACE_ANALYTICS_ENABLED = false;

  // --- Geometry state ---
  let points = $state<Point3D[]>([
    { x: 0, y: 0, z: 0 },
    { x: 120, y: -10, z: 5 },
    { x: 100, y: 110, z: -10 },
    { x: -10, y: 90, z: 30 }
  ]);
  let edges = $state<Edge[]>([
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0]
  ]);

  // --- Point Cloud Sampler (densify points for fits/slicing) ---
  let samplerAppend = $state<boolean>(true);
  let samplerMode = $state<'quad' | 'edges'>('quad');
  let samplerNu = $state<number>(12);
  let samplerNv = $state<number>(12);
  let samplerEdgeSegs = $state<number>(8);
  let samplerErr = $state<string | null>(null);

  const generateSamplerPoints = async () => {
    setLastAction('samplerGenerate');
    samplerErr = null;

    if (points.length < 4) {
      samplerErr = 'Need at least 4 points (P0–P3) to sample.';
      return;
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
      samplerErr = 'No points generated.';
      return;
    }

    pushUndo();

    if (samplerAppend) {
      points = [...points, ...newPts];
    } else {
      // Replacing points invalidates indices in edges/curves; clear dependent geometry.
      points = newPts;
      edges = [];
      curves = [];
      surfaces = [];
      planes = [];
      csys = [csys[0] ?? { name: 'Global', origin: { x: 0, y: 0, z: 0 }, xAxis: { x: 1, y: 0, z: 0 }, yAxis: { x: 0, y: 1, z: 0 }, zAxis: { x: 0, y: 0, z: 1 } }];
      activeCurveIdx = null;
      loftA = null;
      loftB = null;
      loftSegments = [];
      activeEdgeIdx = null;
      pendingPointIdx = null;
      selectedPointIds = [];
    }
  };

  // Point selection → edge creation
  let pendingPointIdx = $state<number | null>(null);

  // --- Point Selection (Box / Lasso) ---
  type SelectionMode = 'none' | 'box' | 'lasso';
  type SelectionProfile = 'precision' | 'assisted';
  let selectionMode = $state<SelectionMode>('none');
  let selectionProfile = $state<SelectionProfile>('precision');
  let toolCursor = $state<ToolCursorMode>('select');
  let selectedPointIds = $state<number[]>([]); // stable serialization (avoid Set reactivity gotchas)
  let selectedSet = $derived.by(() => new Set(selectedPointIds));
  let pointBaseRadius = $derived(selectionProfile === 'assisted' ? 6 : 5);
  let edgeHitWidth = $derived(selectionProfile === 'assisted' ? 12 : 9);
  let pointPriorityPx = $derived(selectionProfile === 'assisted' ? 18 : 14);
  let snapEndpoints = $state(true);
  let snapMidpoints = $state(false);
  let snapCurveNearest = $state(false);
  let snapSurfaceProjection = $state(false);
  let snapThresholdPx = $state(16);
  let activeSnap = $state<SnapCandidate | null>(null);
  let hoverTooltip = $state<HoverTooltip | null>(null);
  let hoverRaf = 0;
  let hoverQueued = $state<{ x: number; y: number } | null>(null);
  let lastHoverPos = $state<{ x: number; y: number }>({ x: Number.NaN, y: Number.NaN });
  let lastHoverModeKey = $state('');
  let lastSnapSig = $state('none');

  // Active drag selection overlay
  let selecting = $state(false);
  let selStart = $state<{ x: number; y: number } | null>(null);
  let selRect = $state<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  let lasso = $state<{ x: number; y: number }[]>([]);

  const clearSelection = () => (selectedPointIds = []);
  const invertSelection = () => {
    const cur = new Set(selectedPointIds);
    const next: number[] = [];
    for (let i = 0; i < points.length; i++) if (!cur.has(i)) next.push(i);
    selectedPointIds = next;
  };

  function setSelectionMode(m: SelectionMode) {
    const next = nextSelectionModeState({
      nextMode: m,
      curveMode,
      createMode,
      pendingPointIdx
    });
    selectionMode = next.selectionMode;
    curveMode = next.curveMode;
    createMode = next.createMode;
    pendingPointIdx = next.pendingPointIdx;
    if (m !== 'none') toolCursor = 'select';
  }

  function setCreateMode(m: 'idle' | 'point' | 'line' | 'surface') {
    const next = nextCreateModeState({
      nextMode: m,
      selectionMode,
      curveMode,
      pendingPointIdx,
      creatorPick,
      surfaceDraft
    });
    createMode = next.createMode;
    selectionMode = next.selectionMode;
    curveMode = next.curveMode;
    pendingPointIdx = next.pendingPointIdx;
    creatorPick = next.creatorPick;
    surfaceDraft = next.surfaceDraft;
    if (m === 'line') toolCursor = 'line';
    else if (m === 'surface') toolCursor = 'surface';
    else if (toolCursor === 'line' || toolCursor === 'surface') toolCursor = 'select';
  }

  function beginLinePick(slot: 'A' | 'B') {
    if (!requirePointPrereq('line')) return;
    if (slot === 'A') {
      setToolCursor('line');
      return;
    }
    const next = linePickState(slot);
    createMode = next.createMode;
    selectionMode = next.selectionMode;
    curveMode = next.curveMode;
    pendingPointIdx = next.pendingPointIdx;
    creatorPick = next.creatorPick;
    surfaceDraft = [];
  }

  function beginSurfacePick(slot: number) {
    if (!requirePointPrereq('surface')) return;
    if (slot === 0) {
      setToolCursor('surface');
      return;
    }
    const next = surfacePickState(slot);
    createMode = next.createMode;
    selectionMode = next.selectionMode;
    curveMode = next.curveMode;
    pendingPointIdx = next.pendingPointIdx;
    creatorPick = next.creatorPick;
  }

  function setToolCursor(mode: ToolCursorMode) {
    if (mode === 'line' && !requirePointPrereq('line')) mode = 'select';
    if (mode === 'surface' && !requirePointPrereq('surface')) mode = 'select';
    const next = transitionToolCursor({
      mode,
      surfaceDraft
    });
    toolCursor = next.toolCursor;
    selectionMode = next.selectionMode;
    createMode = next.createMode;
    curveMode = next.curveMode;
    lineInsertPickMode = next.lineInsertPickMode;
    creatorPick = next.creatorPick;
    pendingPointIdx = next.pendingPointIdx;
    surfaceDraft = next.surfaceDraft;
  }

  function openDatumsModal() {
    datumsModalOpen = true;
    const ww = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const wh = typeof window !== 'undefined' ? window.innerHeight : 800;
    if (!datumsModalDragging) {
      datumsModalPos = centeredModalPos({
        windowWidth: ww,
        windowHeight: wh,
        panelWidth: 760,
        panelHeight: 440,
        margin: 20
      });
    }
  }

  function startDatumsModalDrag(ev: PointerEvent) {
    ev.stopPropagation();
    datumsModalDragging = true;
    datumsModalDragOffset = dragOffsetFromPointer(ev.clientX, ev.clientY, datumsModalPos);
    const onMove = (e: PointerEvent) => {
      if (!datumsModalDragging) return;
      datumsModalPos = draggedModalPos(e.clientX, e.clientY, datumsModalDragOffset, 12);
    };
    const onUp = () => {
      datumsModalDragging = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  function svgCoordsFromEvent(ev: PointerEvent | MouseEvent) {
    const r = svgEl?.getBoundingClientRect();
    if (!r) return { x: 0, y: 0 };
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  }

  function applySelectionFromHits(hits: number[], ev: PointerEvent | MouseEvent) {
    const add = (ev as any).shiftKey;
    const sub = (ev as any).altKey;
    selectedPointIds = applySelectionHits({
      current: selectedPointIds,
      hits,
      add,
      subtract: sub
    });
  }

  function onSvgPointerDown(ev: PointerEvent) {
    if (selectionMode === 'none') return;
    ev.preventDefault();
    ev.stopPropagation();
    selecting = true;
    const pt = svgCoordsFromEvent(ev);
    selStart = pt;
    selRect = selectionMode === 'box' ? { x0: pt.x, y0: pt.y, x1: pt.x, y1: pt.y } : null;
    lasso = selectionMode === 'lasso' ? [pt] : [];
    (ev.currentTarget as Element)?.setPointerCapture?.(ev.pointerId);
  }

  function onSvgPointerMove(ev: PointerEvent) {
    if (!selecting || selectionMode === 'none') return;
    ev.preventDefault();
    ev.stopPropagation();
    const pt = svgCoordsFromEvent(ev);
    if (selectionMode === 'box' && selStart) {
      selRect = { x0: selStart.x, y0: selStart.y, x1: pt.x, y1: pt.y };
    } else if (selectionMode === 'lasso') {
      const last = lasso[lasso.length - 1];
      if (!last || Math.hypot(pt.x - last.x, pt.y - last.y) > 2.5) lasso = [...lasso, pt];
    }
  }

  function onSvgPointerUp(ev: PointerEvent) {
    if (!selecting || selectionMode === 'none') return;
    ev.preventDefault();
    ev.stopPropagation();
    selecting = false;

    let hits: number[] = [];
    if (selectionMode === 'box' && selRect) hits = hitsInRect(projected, selRect);
    if (selectionMode === 'lasso' && lasso.length >= 3) hits = hitsInLasso(projected, lasso);

    applySelectionFromHits(hits, ev);

    selStart = null;
    selRect = null;
    lasso = [];
    try { (ev.currentTarget as Element)?.releasePointerCapture?.(ev.pointerId); } catch {}
  }

  // Curves (for lofting) — each curve is an ordered list of point indices
  let curves = $state<Curve[]>([]);
  let surfaces = $state<SurfaceFace[]>([]);
  let csys = $state<DatumCsys[]>([
    {
      name: 'Global',
      origin: { x: 0, y: 0, z: 0 },
      xAxis: { x: 1, y: 0, z: 0 },
      yAxis: { x: 0, y: 1, z: 0 },
      zAxis: { x: 0, y: 0, z: 1 }
    }
  ]);
  let planes = $state<DatumPlane[]>([]);
  let activeCurveIdx = $state<number | null>(null);
  let curveMode = $state(false);
  let loftA = $state<number | null>(null);
  let loftB = $state<number | null>(null);
  let loftErr = $state<string | null>(null);
  let loftSegments = $state<{ a: Point3D; b: Point3D }[]>([]);

  // Undo/Redo snapshots (points + edges + curves)
  let undoStack = $state<Snapshot[]>([]);
  let redoStack = $state<Snapshot[]>([]);
  let canUndo = $derived(canHistoryUndo({ undoStack, redoStack }));
  let canRedo = $derived(canHistoryRedo({ undoStack, redoStack }));

  const snap = (): Snapshot => createSnapshot(points, edges, curves, surfaces, csys, planes, activeEdgeIdx);
  const pushUndo = () => {
    const next = pushHistoryUndo({ undoStack, redoStack }, snap(), 100);
    undoStack = next.undoStack;
    redoStack = next.redoStack;
  };
  const applySnap = (s: Snapshot) => {
    const x = materializeSnapshot(s);
    points = x.points;
    edges = x.edges;
    curves = x.curves;
    surfaces = x.surfaces;
    csys = x.csys;
    planes = x.planes;
    activeEdgeIdx = x.activeEdgeIdx;
    pendingPointIdx = null;
    rebuildLoftSegments();
  };
  const undo = () => {
    const out = popHistoryUndo({ undoStack, redoStack }, snap());
    undoStack = out.stacks.undoStack;
    redoStack = out.stacks.redoStack;
    if (out.snapshot) applySnap(out.snapshot);
  };
  const redo = () => {
    const out = popHistoryRedo({ undoStack, redoStack }, snap());
    undoStack = out.stacks.undoStack;
    redoStack = out.stacks.redoStack;
    if (out.snapshot) applySnap(out.snapshot);
  };

  // Active edge for interpolation
  let activeEdgeIdx = $state<number | null>(0);
  let interpPct = $state(50);

  // In-app geometry creation
  let createPtX = $state(0);
  let createPtY = $state(0);
  let createPtZ = $state(0);
  let createLineA = $state<number | null>(0);
  let createLineB = $state<number | null>(1);
  let surfaceDraft = $state<number[]>([]);
  let surfaceCreateKind = $state<'triangle' | 'quad' | 'contour'>('quad');
  let createMode = $state<'idle' | 'point' | 'line' | 'surface'>('idle');
  let creatorPick = $state<
    | null
    | { kind: 'line'; slot: 'A' | 'B' }
    | { kind: 'surface'; slot: number }
  >(null);
  let selectedEntity = $state<null | { kind: 'point' | 'line' | 'surface' | 'plane' | 'csys'; index: number }>(null);
  let settingsOpen = $state(false);
  let coreMode = $state(true);
  let advancedOpen = $state(false);
  let rightRailCollapsed = $state(false);
  let showCoreModePrompt = $state(false);
  let datumsModalOpen = $state(false);
  let createGeometryModalOpen = $state(false);
  let surfaceCurveOpsModalOpen = $state(false);
  let extrudeModalOpen = $state(false);
  let healingModalOpen = $state(false);
  let showPointEntities = $state(true);
  let showLineEntities = $state(true);
  let showSurfaceEntities = $state(true);
  let showDatumEntities = $state(true);
  let showSelectionLabels = $state(true);
  let lineInsertT = $state(0.5);
  let lineInsertPickMode = $state(false);
  let csysCreateMode = $state<'global' | 'three_points' | 'point_line' | 'copy'>('global');
  let csysOriginPoint = $state<number>(0);
  let csysXPoint = $state<number>(1);
  let csysYPoint = $state<number>(2);
  let csysFromLine = $state<number>(0);
  let csysCopyIdx = $state<number>(0);
  let planeCreateMode = $state<'three_points' | 'point_normal' | 'offset_surface' | 'two_lines' | 'point_direction' | 'csys_principal'>('three_points');
  let planeP0 = $state<number>(0);
  let planeP1 = $state<number>(1);
  let planeP2 = $state<number>(2);
  let planeNormalVec = $state<Point3D>({ x: 0, y: 0, z: 1 });
  let planeOffsetSurface = $state<number>(0);
  let planeOffsetDist = $state<number>(0);
  let planeLineA = $state<number>(0);
  let planeLineB = $state<number>(1);
  let planeDirPoint = $state<number>(0);
  let planeDirVec = $state<Point3D>({ x: 0, y: 0, z: 1 });
  let planeCsysIdx = $state<number>(0);
  let planePrincipal = $state<'XY' | 'YZ' | 'ZX'>('XY');
  let datumPick = $state<null | { target: 'csys3' | 'csysPointLine'; slot: 'origin' | 'x' | 'y' | 'line' }>(null);
  let datumsModalPos = $state({ x: 120, y: 120 });
  let datumsModalDragging = $state(false);
  let datumsModalDragOffset = $state({ x: 0, y: 0 });
  let offsetSurfaceIdx = $state<number>(0);
  let offsetSurfaceDist = $state<number>(2);
  let offsetCurveIdx = $state<number>(0);
  let offsetCurveSurfaceIdx = $state<number>(0);
  let offsetCurveDist = $state<number>(2);
  let offsetCurveFlip = $state(false);
  let offsetCurveStatus = $state<{
    severity: 'info' | 'warning' | 'error' | null;
    method: 'geodesic' | 'surface_projected' | 'directional_3d' | null;
    message: string | null;
  }>({ severity: null, method: null, message: null });
  let extrudeTarget = $state<'line' | 'curve'>('line');
  let extrudeLineIdx = $state<number>(0);
  let extrudeCurveIdx = $state<number>(0);
  let extrudeDirMode = $state<'vector' | 'curve' | 'surfaceNormal'>('vector');
  let extrudeVector = $state<Point3D>({ x: 0, y: 0, z: 1 });
  let extrudeSurfaceIdx = $state<number>(0);
  let extrudeFlip = $state(false);
  let extrudeDistance = $state<number>(20);
  let healTol = $state<number>(0.5);
  let actionsBarEl = $state<HTMLElement | null>(null);
  let datumsModalPanelEl = $state<HTMLElement | null>(null);
  let createGeomModalPanelEl = $state<HTMLElement | null>(null);
  let surfCurveModalPanelEl = $state<HTMLElement | null>(null);
  let healingModalPanelEl = $state<HTMLElement | null>(null);

  // Two-edge selection for offset/intersection
  let selEdgeA = $state<number | null>(0);
  let selEdgeB = $state<number | null>(1);
  let offsetDist = $state(5);
  let refPointIdx = $state<number>(0);
  let intersection = $state<{ p: Point3D; skew: number } | null>(null);
  let intersectionBusy = $state(false);
  let intersectionDiagnostics = $state<IntersectionDiagnostics>({
    severity: null,
    message: null,
    angleDeg: null,
    skew: null,
    recommendations: []
  });

  // --- View / Camera state ---
  let svgEl = $state<SVGSVGElement | null>(null);
  let viewportEl = $state<HTMLDivElement | null>(null);

  // Viewport right-click menu (UI rendered in SurfaceViewportContextMenu)
  let vpMenuOpen = $state(false);
  let vpMenuX = $state(0);
  let vpMenuY = $state(0);

  function openViewportMenu(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const rect = viewportEl?.getBoundingClientRect();
    vpMenuOpen = true;
    vpMenuX = rect ? e.clientX - rect.left : e.clientX;
    vpMenuY = rect ? e.clientY - rect.top : e.clientY;
  }

  function closeViewportMenu() {
    vpMenuOpen = false;
  }

  // Accessibility helper: allow SVG shapes with role="button" to activate via keyboard
  function keyActivate(e: KeyboardEvent, fn: () => void) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fn();
    }
  }
  let w = $state(900);
  let h = $state(600);

  // virtual camera: yaw (alpha) + pitch (beta)
  let rot = $state({ alpha: -0.65, beta: 0.35 });
  let zoomK = $state(1);
  let pan = $state({ x: 0, y: 0 });
  let rotateAnchor = $state<{ mx: number; my: number; pivot: Point3D } | null>(null);
  function resetView() {
    rot = { alpha: -0.65, beta: 0.35 };
    zoomK = 1;
    pan = { x: 0, y: 0 };
  }

  function fitToScreen() {
    const fitted = viewportFitToScreen(points, rot, w, h);
    if (!fitted) return;
    zoomK = fitted.zoomK;
    pan = fitted.pan;
  }

  // Probe overlay (toggle-able)
  let probeOn = $state(false);
  let probeBoltDia = $state(0.25);
  let probe = $state<{ x: number; y: number; angleDeg: number; ok: boolean } | null>(null);
  let maxTaperDeg = $state(6);

  // --- Surface Evaluation (best-fit plane + residuals) ---
  let evalBusy = $state(false);
  let evalErr = $state<string | null>(null);
  let evalTol = $state(0); // if 0, use sigma_mult * sigma
  let evalSigmaMult = $state(3);
  let evalMaxOutliers = $state(50);
  let evalRes = $state<{
    centroid: Point3D;
    normal: Point3D;
    rms: number;
    meanAbs: number;
    maxAbs: number;
    p95Abs: number;
    sigma: number;
    signedDistances: number[];
    outlierIndices: number[];
  } | null>(null);
  let heatmapOn = $state(false);
  let evalUseSelection = $state(true);

  let outlierSet = $derived.by(() => new Set(evalRes?.outlierIndices ?? []));
  let heatScale = $derived.by(() => {
    const s = evalRes ? (evalRes.p95Abs > 0 ? evalRes.p95Abs : evalRes.maxAbs) : 0;
    return s > 0 ? s : 1;
  });

  // --- Surface Evaluation (section slicing + deviation plot) ---
  let sliceAxis = $state<'x' | 'y' | 'z'>('x');
  let sliceBins = $state(24);          // number of stations
  let sliceThickness = $state(0);      // 0 => auto (bin width * 0.35)
  let sliceMetric = $state<'p95' | 'rms'>('p95');
  let sliceBusy = $state(false);
  let sliceErr = $state<string | null>(null);
  let sliceRes = $state<{
    axis: 'x' | 'y' | 'z';
    min: number;
    max: number;
    slices: { station: number; n: number; rms: number; p95Abs: number; maxAbs: number }[];
  } | null>(null);

  // --- Datum-plane slicing + canonical export ---
  let datumSlicePlaneIdx = $state(0);
  let datumSliceMode = $state<DatumSliceMode>('fixed_spacing');
  let datumSliceSpacing = $state(5);
  let datumSliceCount = $state(24);
  let datumSliceThickness = $state(0);
  let datumSliceUseSelection = $state(true);
  let includeOptionalSliceColumns = $state(false);
  let datumSliceBusy = $state(false);
  let datumSliceErr = $state<string | null>(null);
  let datumSliceRes = $state<DatumSliceRunResult | null>(null);
  let selectedSliceId = $state<number | null>(null);
  let statusWarnings = $state<SurfaceStatusWarning[]>([]);
  const emittedWarningIds = new Set<string>();

  // --- Workspace recipes (auto-saved, versioned store) ---
  let recipes = $state<SurfaceRecipe[]>([]);
  let selectedRecipeId = $state<string | null>(null);
  let recipeNameDraft = $state('');
  let recipeStepConfirmed = $state(true);
  let recipeRun = $state<RecipeRunState | null>(null);
  let recipeTx = $state<RecipeTransaction | null>(null);

  // --- Surface Evaluation (best-fit cylinder + residuals) ---
  let cylBusy = $state(false);
  let cylErr = $state<string | null>(null);
  let cylRes = $state<{
    axisPoint: Point3D;
    axisDir: Point3D;
    radius: number;
    rms: number;
    meanAbs: number;
    maxAbs: number;
    p95Abs: number;
    sigma: number;
    absDistances: number[];
    outlierIndices: number[];
  } | null>(null);
  let cylShowAxis = $state(true);
  let cylUseSelection = $state(true);

  // When we fit using a selection subset, backend indices are subset-relative.
  // Keep the mapping back to the global point IDs so highlighting/refinement is correct.
  let cylFitPointIds = $state<number[]>([]);
  let cylRefineK = $state(2.0);

  function currentActiveFitPointIds() {
    return activeFitPointIds(cylUseSelection, selectedPointIds, points);
  }

  let cylOutlierSet = $derived.by(() => new Set(cylRes?.outlierIndices ?? []));

  async function computeCylinderFit() {
    await computeCylinderFitUi(evaluationUiCtx());
  }

  function cylUiCtx() {
    return {
      getCylRes: () => cylRes ? { rms: cylRes.rms, absDistances: cylRes.absDistances } : null,
      getCylRefineK: () => cylRefineK,
      getCylFitPointIds: () => cylFitPointIds,
      getSelectedPointIds: () => selectedPointIds,
      setSelectedPointIds: (next: number[]) => {
        selectedPointIds = next;
      }
    };
  }

  function cylThresholdAbs() {
    return cylThresholdAbsController(cylUiCtx());
  }

  function cylSelectOutliers() {
    cylSelectOutliersController(cylUiCtx());
  }

  function cylKeepInliers() {
    cylKeepInliersController(cylUiCtx());
  }

  function cylRemoveOutliers() {
    cylRemoveOutliersController(cylUiCtx());
  }

  function heatColor(absd: number, scale: number) {
    // 0 => green-ish, 1 => red-ish
    const t = clamp(absd / Math.max(1e-12, scale), 0, 1);
    // simple gradient: green -> yellow -> red
    const r = Math.round(60 + 195 * t);
    const g = Math.round(220 - 150 * t);
    const b = Math.round(90 - 70 * t);
    return `rgba(${r},${g},${b},0.80)`;
  }

  function evaluationUiCtx() {
    return {
      getPoints: () => points,
      getSelectedPointIds: () => selectedPointIds,
      getEvalUseSelection: () => evalUseSelection,
      getEvalTol: () => evalTol,
      getEvalSigmaMult: () => evalSigmaMult,
      getEvalMaxOutliers: () => evalMaxOutliers,
      setCylErr: (v: string | null) => {
        cylErr = v;
      },
      setCylBusy: (v: boolean) => {
        cylBusy = v;
      },
      setCylFitPointIds: (v: number[]) => {
        cylFitPointIds = v;
      },
      setCylRes: (v: typeof cylRes) => {
        cylRes = v;
      },
      setEvalErr: (v: string | null) => {
        evalErr = v;
      },
      setEvalBusy: (v: boolean) => {
        evalBusy = v;
      },
      setEvalRes: (v: typeof evalRes) => {
        evalRes = v;
      },
      getSliceAxis: () => sliceAxis,
      getSliceBins: () => sliceBins,
      getSliceThickness: () => sliceThickness,
      setSliceErr: (v: string | null) => {
        sliceErr = v;
      },
      setSliceBusy: (v: boolean) => {
        sliceBusy = v;
      },
      setSliceRes: (v: typeof sliceRes) => {
        sliceRes = v;
      },
      getDatumPlaneChoices: () => datumPlaneChoices,
      getDatumSlicePlaneIdx: () => datumSlicePlaneIdx,
      getDatumSliceMode: () => datumSliceMode,
      getDatumSliceSpacing: () => datumSliceSpacing,
      getDatumSliceCount: () => datumSliceCount,
      getDatumSliceThickness: () => datumSliceThickness,
      getDatumSliceUseSelection: () => datumSliceUseSelection,
      setDatumSliceErr: (v: string | null) => {
        datumSliceErr = v;
      },
      setDatumSliceBusy: (v: boolean) => {
        datumSliceBusy = v;
      },
      setDatumSliceRes: (v: DatumSliceRunResult | null) => {
        datumSliceRes = v;
      },
      getDatumSliceRes: () => datumSliceRes,
      setSelectedSliceId: (v: number | null) => {
        selectedSliceId = v;
      },
      getIncludeOptionalSliceColumns: () => includeOptionalSliceColumns,
      getStatusWarnings: () => statusWarnings,
      setStatusWarnings: (v: SurfaceStatusWarning[]) => {
        statusWarnings = v;
      },
      getEmittedWarningIds: () => emittedWarningIds,
      toast
    };
  }

  async function computeSurfaceEval() {
    await computeSurfaceEvalUi(evaluationUiCtx());
  }

  async function computeSectionSlices() {
    await computeSectionSlicesUi(evaluationUiCtx());
  }

  let datumPlaneChoices = $derived.by<DatumPlane[]>(() => {
    if (planes.length > 0) return planes;
    return [
      {
        name: 'Global XY',
        origin: { x: 0, y: 0, z: 0 },
        normal: { x: 0, y: 0, z: 1 },
        xDir: { x: 1, y: 0, z: 0 },
        source: 'default'
      }
    ];
  });

  $effect(() => {
    const maxIdx = Math.max(0, datumPlaneChoices.length - 1);
    datumSlicePlaneIdx = clamp(datumSlicePlaneIdx, 0, maxIdx);
  });

  let sliceSyncModel = $derived.by(() => buildSliceSyncModel(datumSliceRes, selectedSliceId));

  async function computeDatumSlices() {
    await computeDatumSlicesUi(evaluationUiCtx());
  }

  function exportDatumSliceCombined() {
    exportDatumSliceCombinedUi(evaluationUiCtx());
  }

  function emitStatusWarnings(incoming: SurfaceStatusWarning[]) {
    emitStatusWarningsUi(evaluationUiCtx(), incoming);
  }

  function recipeUiCtx() {
    return {
      getSelEdgeA: () => selEdgeA,
      getSelEdgeB: () => selEdgeB,
      getOffsetDist: () => offsetDist,
      getRefPointIdx: () => refPointIdx,
      getDatumSlicePlaneIdx: () => datumSlicePlaneIdx,
      getDatumSliceMode: () => datumSliceMode,
      getDatumSliceSpacing: () => datumSliceSpacing,
      getDatumSliceCount: () => datumSliceCount,
      getDatumSliceThickness: () => datumSliceThickness,
      getDatumSliceUseSelection: () => datumSliceUseSelection,
      getIncludeOptionalSliceColumns: () => includeOptionalSliceColumns,
      setRecipeNameDraft: (v: string) => {
        recipeNameDraft = v;
      },
      getRecipeNameDraft: () => recipeNameDraft,
      getRecipes: () => recipes,
      setRecipes: (v: SurfaceRecipe[]) => {
        recipes = v;
      },
      getSelectedRecipeId: () => selectedRecipeId,
      setSelectedRecipeId: (v: string | null) => {
        selectedRecipeId = v;
      },
      setRecipeRun: (v: RecipeRunState | null) => {
        recipeRun = v;
      },
      setSelEdgeA: (v: number | null) => {
        selEdgeA = v;
      },
      setSelEdgeB: (v: number | null) => {
        selEdgeB = v;
      },
      setOffsetDist: (v: number) => {
        offsetDist = v;
      },
      setRefPointIdx: (v: number) => {
        refPointIdx = v;
      },
      setDatumSlicePlaneIdx: (v: number) => {
        datumSlicePlaneIdx = v;
      },
      setDatumSliceMode: (v: DatumSliceMode) => {
        datumSliceMode = v;
      },
      setDatumSliceSpacing: (v: number) => {
        datumSliceSpacing = v;
      },
      setDatumSliceCount: (v: number) => {
        datumSliceCount = v;
      },
      setDatumSliceThickness: (v: number) => {
        datumSliceThickness = v;
      },
      setDatumSliceUseSelection: (v: boolean) => {
        datumSliceUseSelection = v;
      },
      setIncludeOptionalSliceColumns: (v: boolean) => {
        includeOptionalSliceColumns = v;
      }
    };
  }

  function snapshotRecipeConfig(): SurfaceRecipeConfig {
    return snapshotRecipeConfigController(recipeUiCtx());
  }

  function applyRecipeConfig(cfg: SurfaceRecipeConfig) {
    applyRecipeConfigController(recipeUiCtx(), cfg);
  }

  function selectedRecipe() {
    return selectedRecipeController(recipes, selectedRecipeId);
  }

  function saveCurrentRecipe() {
    saveCurrentRecipeController(recipeUiCtx());
  }

  function deleteSelectedRecipe() {
    deleteSelectedRecipeController(recipeUiCtx());
  }

  function selectRecipe(id: string) {
    selectRecipeController(recipeUiCtx(), id);
  }

  function toggleSelectedRecipeStep(step: SurfaceRecipeStep, enabled: boolean) {
    toggleSelectedRecipeStepController(recipeUiCtx(), step, enabled);
  }

  async function runRecipeUntilPause() {
    await runRecipeUntilPauseUi(recipeRunUiCtx());
  }

  async function startRecipeRun() {
    await startRecipeRunUi(recipeRunUiCtx());
  }

  async function runRecipeNextStep() {
    await runRecipeNextStepUi(recipeRunUiCtx());
  }

  function cancelRecipeRun() {
    cancelRecipeRunUi(recipeRunUiCtx());
  }

  function recipeRunUiCtx() {
    return {
      getRecipeRun: () => recipeRun,
      setRecipeRun: (v: RecipeRunState | null) => {
        recipeRun = v;
      },
      getRecipes: () => recipes,
      getSelectedRecipe: () => selectedRecipe(),
      getRecipeStepConfirmed: () => recipeStepConfirmed,
      getRecipeTx: () => recipeTx,
      setRecipeTx: (v: RecipeTransaction | null) => {
        recipeTx = v;
      },
      beginRecipeTransaction: () => beginRecipeTransaction(snap()),
      getCurrentSnapshot: () => snap(),
      applySnapshot: applySnap,
      getUndoRedoStacks: () => ({ undoStack, redoStack }),
      setUndoRedoStacks: (v: { undoStack: Snapshot[]; redoStack: Snapshot[] }) => {
        undoStack = v.undoStack;
        redoStack = v.redoStack;
      },
      applyRecipeConfig,
      calcOffsetIntersection,
      computeDatumSlices,
      exportDatumSliceCombined,
      getDatumSliceRes: () => datumSliceRes,
      getIntersectionDiagnostics: () => intersectionDiagnostics,
      emitStatusWarnings,
      getDatumSliceErr: () => datumSliceErr
    };
  }

  $effect(() => {
    if (actionsBarEl) autoAnimate(actionsBarEl, { duration: motionMs('fast') });
  });
  $effect(() => {
    if (datumsModalPanelEl) autoAnimate(datumsModalPanelEl, { duration: motionMs('standard') });
  });
  $effect(() => {
  });
  $effect(() => {
    if (createGeomModalPanelEl) autoAnimate(createGeomModalPanelEl, { duration: motionMs('standard') });
  });
  $effect(() => {
    if (surfCurveModalPanelEl) autoAnimate(surfCurveModalPanelEl, { duration: motionMs('standard') });
  });
  $effect(() => {
  });
  $effect(() => {
    if (healingModalPanelEl) autoAnimate(healingModalPanelEl, { duration: motionMs('standard') });
  });

  // Auto-animate hooks are bound via panel refs.

  // Rotation then projection into SVG coords.
  function rotateForView(p: Point3D, r = rot) {
    return rotateForViewUi(p, r);
  }

  function nearestEdgeHit(mx: number, my: number) {
    return nearestEdgeHitUi(mx, my, edges, projected);
  }

  function pickOrbitPivot(mx: number, my: number): Point3D {
    return pickOrbitPivotUi(mx, my, {
      nearestPoint,
      projected,
      points,
      edges,
      surfaces
    });
  }

  function project(p: Point3D) {
    return projectPoint(p, rot, zoomK, w, h, pan);
  }

  let projected = $derived(points.map(project));
  let surfaceScreenCenters = $derived.by(() =>
    surfaces.map((s) => {
      if (!s.pts.length) return null;
      let cx = 0;
      let cy = 0;
      let n = 0;
      for (const pi of s.pts) {
        const p = projected[pi];
        if (!p) continue;
        cx += p.x;
        cy += p.y;
        n++;
      }
      if (n < 3) return null;
      return { x: cx / n, y: cy / n };
    })
  );
  let surfaceWorldCenters = $derived.by(() =>
    surfaces.map((s) => {
      if (!s.pts.length) return null;
      let x = 0;
      let y = 0;
      let z = 0;
      let n = 0;
      for (const pi of s.pts) {
        const p = points[pi];
        if (!p) continue;
        x += p.x;
        y += p.y;
        z += p.z;
        n++;
      }
      if (n < 3) return null;
      return { x: x / n, y: y / n, z: z / n };
    })
  );

  // depth sorting (Painter's Algorithm)
  let sortedEdges = $derived.by(() => {
    const arr = edges.map(([a, b], i) => {
      const za = projected[a]?.z ?? 0;
      const zb = projected[b]?.z ?? 0;
      return { i, a, b, z: (za + zb) / 2 };
    });
    arr.sort((u, v) => u.z - v.z);
    return arr;
  });

  let sortedSurfaces = $derived.by(() => {
    const arr = surfaces
      .map((s, i) => {
        const zs = s.pts.map((pi) => projected[pi]?.z ?? 0);
        const z = zs.reduce((acc, v) => acc + v, 0) / Math.max(1, zs.length);
        return { i, pts: s.pts, z, name: s.name };
      })
      .filter((s) => s.pts.every((pi) => projected[pi] != null));
    arr.sort((a, b) => a.z - b.z);
    return arr;
  });

  let datumPlanePatches = $derived.by(() => {
    const patchSize = 36;
    return planes.map((pl, i) => {
      const b = planeBasis(pl);
      return {
        i,
        name: pl.name,
        pts: [
          vecAdd(vecAdd(pl.origin, vecScale(b.u, -patchSize)), vecScale(b.v, -patchSize)),
          vecAdd(vecAdd(pl.origin, vecScale(b.u, patchSize)), vecScale(b.v, -patchSize)),
          vecAdd(vecAdd(pl.origin, vecScale(b.u, patchSize)), vecScale(b.v, patchSize)),
          vecAdd(vecAdd(pl.origin, vecScale(b.u, -patchSize)), vecScale(b.v, patchSize))
        ]
      };
    });
  });

  let datumAxisSegments = $derived.by(() => {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y; if (p.z < minZ) minZ = p.z;
      if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y; if (p.z > maxZ) maxZ = p.z;
    }
    const diag = isFinite(minX) ? Math.hypot(maxX - minX, maxY - minY, maxZ - minZ) : 100;
    const axisSize = clamp(diag * 0.08, 2, 14);
    const out: { i: number; csysIdx: number; axis: 'X' | 'Y' | 'Z'; a: Point3D; b: Point3D }[] = [];
    for (let i = 0; i < csys.length; i++) {
      const c = csys[i];
      out.push({ i: i * 3, csysIdx: i, axis: 'X', a: c.origin, b: vecAdd(c.origin, vecScale(vecUnit(c.xAxis), axisSize)) });
      out.push({ i: i * 3 + 1, csysIdx: i, axis: 'Y', a: c.origin, b: vecAdd(c.origin, vecScale(vecUnit(c.yAxis), axisSize)) });
      out.push({ i: i * 3 + 2, csysIdx: i, axis: 'Z', a: c.origin, b: vecAdd(c.origin, vecScale(vecUnit(c.zAxis), axisSize)) });
    }
    return out;
  });

  let zRange = $derived.by(() => {
    const zs = projected.map((p) => p.z);
    let min = Infinity;
    let max = -Infinity;
    for (const z of zs) {
      if (z < min) min = z;
      if (z > max) max = z;
    }
    if (!isFinite(min) || !isFinite(max) || Math.abs(max - min) < 1e-9) return { min: 0, max: 1 };
    return { min, max };
  });

  function depthOpacity(z: number) {
    return depthOpacityUi(z, zRange);
  }

  function pointDepthOpacity(z: number) {
    return pointDepthOpacityUi(z, zRange);
  }

  function surfaceDepthOpacity(z: number) {
    return surfaceDepthOpacityUi(z, zRange);
  }

  // interpolated point along active edge
  let cylAxisSeg = $derived.by(() => {
    return computeCylinderAxisSegment(points, cylRes, cylShowAxis);
  });

  let interpPoint = $derived.by(() => {
    if (activeEdgeIdx == null) return null;
    const e = edges[activeEdgeIdx];
    if (!e) return null;
    const [i0, i1] = e;
    const p0 = points[i0];
    const p1 = points[i1];
    if (!p0 || !p1) return null;
    const t = clamp(interpPct / 100, 0, 1);
    return {
      x: p0.x + t * (p1.x - p0.x),
      y: p0.y + t * (p1.y - p0.y),
      z: p0.z + t * (p1.z - p0.z)
    };
  });

  let selectedBadge = $derived.by(() => {
    if (!selectedEntity) return null;
    if (selectedEntity.kind === 'point') {
      const p = projected[selectedEntity.index];
      if (!p) return null;
      return { x: p.x, y: p.y, label: `P${selectedEntity.index + 1}` };
    }
    if (selectedEntity.kind === 'line') {
      const e = edges[selectedEntity.index];
      if (!e) return null;
      const a = projected[e[0]];
      const b = projected[e[1]];
      if (!a || !b) return null;
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, label: `L${selectedEntity.index + 1}` };
    }
      const s = surfaces[selectedEntity.index];
    if (selectedEntity.kind === 'surface') {
      if (!s) return null;
      const pts = s.pts.map((i) => projected[i]).filter(Boolean);
      if (pts.length < 3) return null;
      const cx = pts.reduce((acc, p) => acc + p.x, 0) / pts.length;
      const cy = pts.reduce((acc, p) => acc + p.y, 0) / pts.length;
      return { x: cx, y: cy, label: `S${selectedEntity.index + 1}` };
    }
    if (selectedEntity.kind === 'plane') {
      const pl = planes[selectedEntity.index];
      if (!pl) return null;
      const p = project(pl.origin);
      return { x: p.x, y: p.y, label: `PL${selectedEntity.index + 1}` };
    }
    if (selectedEntity.kind === 'csys') {
      const c = csys[selectedEntity.index];
      if (!c) return null;
      const p = project(c.origin);
      return { x: p.x, y: p.y, label: `CS${selectedEntity.index + 1}` };
    }
    return null;
  });

  let creatorHint = $derived.by(() => {
    if (toolCursor === 'line') return 'Line tool active: click Point A then Point B repeatedly to create chained lines.';
    if (toolCursor === 'surface') return 'Surface tool active: click points in order to create triangle/quad/contour surfaces.';
    if (toolCursor === 'curve') return 'Curve tool active: click points to append to the active curve.';
    if (toolCursor === 'insert') return 'Insert tool active: click a selected line to insert at cursor position.';
    if (!creatorPick) return 'Tip: click Pick to arm line/surface creation. Line creates at B. Triangle/Quad auto-create on final point.';
    if (creatorPick.kind === 'line') return `Pick Line ${creatorPick.slot}: click a viewport point (auto-advances to next slot).`;
    return `Pick Surface P${creatorPick.slot + 1}: click viewport points in order.`;
  });
  let createPrereqNotice = $state<string | null>(null);
  let createNoticeTimer: ReturnType<typeof setTimeout> | null = null;
  const minPointsFor = { line: 2, surface: 3 } as const;
  const setCreatePrereqNotice = (msg: string) => {
    createPrereqNotice = msg;
    if (createNoticeTimer) clearTimeout(createNoticeTimer);
    createNoticeTimer = setTimeout(() => {
      createPrereqNotice = null;
    }, 2400);
  };
  const requirePointPrereq = (kind: 'line' | 'surface'): boolean => {
    const min = minPointsFor[kind];
    if (points.length >= min) return true;
    setCreatePrereqNotice(
      kind === 'line'
        ? `Line requires at least ${min} existing points. Add points first.`
        : `Surface requires at least ${min} existing points. Add points first.`
    );
    return false;
  };
  let topCreateHint = $derived.by(() => {
    if (createPrereqNotice) return createPrereqNotice;
    if (toolCursor === 'line') return 'Line mode: click Point A then Point B in the viewport. It chains after each segment.';
    if (toolCursor === 'surface') return 'Surface mode: click points in order to create triangle, quad, or contour surfaces.';
    if (createGeometryModalOpen) return 'Point mode: use Create Geometry to add exact XYZ points.';
    return 'Mouse-first core tools: Select, Point, Line, Surface.';
  });
  let surfaceDraftRequired = $derived.by(() => {
    if (surfaceCreateKind === 'triangle') return 3;
    if (surfaceCreateKind === 'quad') return 4;
    return 3; // contour minimum
  });
  let surfaceDraftRemaining = $derived.by(() => Math.max(0, surfaceDraftRequired - surfaceDraft.length));
  let surfaceFlowHint = $derived.by(() => {
    if (surfaceCreateKind === 'contour') {
      if (surfaceDraft.length < 3) return `Contour: pick ${3 - surfaceDraft.length} more point(s), then Finish contour.`;
      return 'Contour: continue picking points, or click Finish contour now.';
    }
    if (surfaceDraft.length === 0) return `${surfaceCreateKind === 'triangle' ? 'Triangle' : 'Quad'}: pick point 1 of ${surfaceDraftRequired}.`;
    if (surfaceDraft.length < surfaceDraftRequired) return `Pick point ${surfaceDraft.length + 1} of ${surfaceDraftRequired}.`;
    return 'Ready: next point creates the surface.';
  });
  let datumPickHint = $derived.by(() => {
    if (!datumPick) return 'Use Pick buttons to select points/lines directly from the model.';
    if (datumPick.target === 'csys3') return `Pick CSYS 3-Points: ${datumPick.slot.toUpperCase()} from model.`;
    return datumPick.slot === 'line' ? 'Pick CSYS line from model.' : 'Pick CSYS origin point from model.';
  });

  function armDatumPick(target: 'csys3' | 'csysPointLine', slot: 'origin' | 'x' | 'y' | 'line') {
    toolCursor = 'select';
    creatorPick = null;
    createMode = 'idle';
    lineInsertPickMode = false;
    datumPick = { target, slot };
  }

  function addDatumCsys() {
    setLastAction('createCSYS');
    const next = createDatumCsys({
      mode: csysCreateMode,
      points,
      edges,
      csys,
      name: `CSYS ${csys.length + 1}`,
      originPointIdx: csysOriginPoint,
      xPointIdx: csysXPoint,
      yPointIdx: csysYPoint,
      fromLineIdx: csysFromLine,
      copyIdx: csysCopyIdx
    });
    if (!next) return;
    pushUndo();
    csys = [...csys, next];
    selectedEntity = { kind: 'csys', index: csys.length - 1 };
  }

  function addDatumPlane() {
    setLastAction('createPlane');
    const next = createDatumPlane({
      mode: planeCreateMode,
      points,
      edges,
      surfaces,
      csys,
      name: `Plane ${planes.length + 1}`,
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
    if (!next) return;
    pushUndo();
    planes = [...planes, next];
    selectedEntity = { kind: 'plane', index: planes.length - 1 };
  }

  function offsetSurfaceCreate() {
    const s = surfaces[offsetSurfaceIdx];
    if (!s) return;
    const n = surfaceNormal(s, points);
    const dist = Number(offsetSurfaceDist) || 0;
    setLastAction('offsetSurface');
    pushUndo();
    const newIdxMap = new Map<number, number>();
    for (const pi of s.pts) {
      const np = vecAdd(points[pi], vecScale(n, dist));
      points = [...points, np];
      newIdxMap.set(pi, points.length - 1);
    }
    const newPts = s.pts.map((pi) => newIdxMap.get(pi) as number);
    surfaces = [...surfaces, { name: `Surface ${surfaces.length + 1}`, pts: newPts }];
  }

  function offsetCurveOnSurfaceCreate() {
    const c = curves[offsetCurveIdx];
    const s = surfaces[offsetCurveSurfaceIdx];
    if (!c || !s || c.pts.length < 2) return;
    const d = (Number(offsetCurveDist) || 0) * (offsetCurveFlip ? -1 : 1);
    setLastAction('offsetCurveOnSurface');
    pushUndo();
    const result = computeCurveOffsetBestEffort({
      points,
      curve: c,
      surface: s,
      distance: d
    });
    offsetCurveStatus = {
      severity: result.severity,
      method: result.method,
      message: result.message
    };
    if (result.message) fileNotice = result.message;
    const newPts: number[] = [];
    for (const p of result.points) {
      points = [...points, p];
      newPts.push(points.length - 1);
    }
    curves = [...curves, { name: `Curve ${curves.length + 1}`, pts: newPts }];
    rebuildLoftSegments();
  }

  function extrusionDirection(pathPts: number[]): Point3D {
    if (extrudeDirMode === 'vector') return vecUnit(extrudeVector);
    if (extrudeDirMode === 'curve') {
      if (pathPts.length < 2) return { x: 0, y: 0, z: 1 };
      const t = vecUnit(vecSub(points[pathPts[pathPts.length - 1]], points[pathPts[0]]));
      return t;
    }
    const s = surfaces[extrudeSurfaceIdx];
    return s ? surfaceNormal(s, points) : { x: 0, y: 0, z: 1 };
  }

  function extrudeLineOrCurve() {
    const pathPts =
      extrudeTarget === 'line'
        ? (edges[extrudeLineIdx] ? [edges[extrudeLineIdx][0], edges[extrudeLineIdx][1]] : [])
        : (curves[extrudeCurveIdx]?.pts ?? []);
    if (pathPts.length < 2) return;
    let dir = extrusionDirection(pathPts);
    if (extrudeFlip) dir = vecScale(dir, -1);
    const dist = Number(extrudeDistance) || 0;
    setLastAction('extrudePath');
    pushUndo();
    const topIdx = pathPts.map((pi) => {
      points = [...points, vecAdd(points[pi], vecScale(dir, dist))];
      return points.length - 1;
    });
    for (let i = 0; i < pathPts.length - 1; i++) {
      const a = pathPts[i], b0 = pathPts[i + 1], c = topIdx[i + 1], d = topIdx[i];
      surfaces = [...surfaces, { name: `Surface ${surfaces.length + 1}`, pts: [a, b0, c, d] }];
      if (!edgeExists(edges, a, b0)) edges = [...edges, [a, b0]];
      if (!edgeExists(edges, b0, c)) edges = [...edges, [b0, c]];
      if (!edgeExists(edges, c, d)) edges = [...edges, [c, d]];
      if (!edgeExists(edges, d, a)) edges = [...edges, [d, a]];
    }
  }

  function runTopologyHealing() {
    const tol = Math.max(1e-9, Number(healTol) || 1e-6);
    setLastAction('topologyHeal');
    pushUndo();
    const reps: Point3D[] = [];
    const map: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      let found = -1;
      for (let j = 0; j < reps.length; j++) {
        const q = reps[j];
        if (Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z) <= tol) { found = j; break; }
      }
      if (found >= 0) map[i] = found;
      else {
        map[i] = reps.length;
        reps.push({ ...p });
      }
    }
    points = reps;
    const edgeKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);
    const seenEdges = new Set<string>();
    edges = edges
      .map(([a, b]) => [map[a], map[b]] as Edge)
      .filter(([a, b]) => a !== b)
      .filter(([a, b]) => {
        const k = edgeKey(a, b);
        if (seenEdges.has(k)) return false;
        seenEdges.add(k);
        return true;
      });
    curves = curves
      .map((c) => {
        const out: number[] = [];
        for (const pi of c.pts.map((pi) => map[pi])) {
          if (out.length === 0 || out[out.length - 1] !== pi) out.push(pi);
        }
        return { ...c, pts: out };
      })
      .filter((c) => c.pts.length >= 2);
    surfaces = surfaces
      .map((s) => {
        const out: number[] = [];
        for (const pi of s.pts.map((pi) => map[pi])) if (!out.includes(pi)) out.push(pi);
        return { ...s, pts: out };
      })
      .filter((s) => s.pts.length >= 3);
    rebuildLoftSegments();
  }

  function createLineFromPair(aRaw: number | null, bRaw: number | null): boolean {
    if (aRaw == null || bRaw == null) return false;
    const a = Number(aRaw);
    const b = Number(bRaw);
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || a >= points.length || b >= points.length || a === b) return false;
    if (edgeExists(edges, a, b)) return false;
    setLastAction('createLine');
    pushUndo();
    const newIdx = edges.length;
    edges = [...edges, [a, b]];
    activeEdgeIdx = newIdx;
    selectedEntity = { kind: 'line', index: newIdx };
    return true;
  }

  function createSurfaceFromIndices(idsRaw: number[]): boolean {
    if (idsRaw.length < 3) return false;
    const ids = idsRaw.map((v) => Number(v));
    if (ids.some((i) => !Number.isInteger(i) || i < 0 || i >= points.length)) return false;
    if (new Set(ids).size !== ids.length) return false;
    setLastAction('createSurface');
    pushUndo();
    const newIdx = surfaces.length;
    surfaces = [...surfaces, { name: `Surface ${newIdx + 1}`, pts: [...ids] }];
    selectedEntity = { kind: 'surface', index: newIdx };
    return true;
  }

  function finishContourSurface() {
    createSurfaceFromIndices(surfaceDraft);
    surfaceDraft = [];
    creatorPick = toolCursor === 'surface' ? { kind: 'surface', slot: 0 } : null;
  }

  function insertPointOnEdge(edgeIdx: number, tRaw: number) {
    const e = edges[edgeIdx];
    if (!e) return;
    const [a, b] = e;
    const t = clamp(tRaw, 0, 1);
    const np = lerp3(points[a], points[b], t);
    setLastAction('insertPointOnLine');
    pushUndo();
    const ni = points.length;
    points = [...points, np];
    const next = [...edges];
    next.splice(edgeIdx, 1, [a, ni], [ni, b]);
    edges = next;
    activeEdgeIdx = edgeIdx + 1;
    selectedEntity = { kind: 'point', index: ni };
    pendingPointIdx = ni;
  }

  function tryInsertPointOnSelectedLineAtClick(ev: MouseEvent) {
    if (!lineInsertPickMode || selectedEntity?.kind !== 'line' || !svgEl) return false;
    const idx = selectedEntity.index;
    const e = edges[idx];
    if (!e) return false;
    const rect = svgEl.getBoundingClientRect();
    const mx = ev.clientX - rect.left;
    const my = ev.clientY - rect.top;
    const a = projected[e[0]];
    const b = projected[e[1]];
    if (!a || !b) return false;
    const vx = b.x - a.x;
    const vy = b.y - a.y;
    const len2 = vx * vx + vy * vy;
    if (len2 < 1e-9) return false;
    const t = ((mx - a.x) * vx + (my - a.y) * vy) / len2;
    insertPointOnEdge(idx, t);
    lineInsertPickMode = false;
    return true;
  }

  function handleDatumPickClick(i: number): boolean {
    if (!datumPick) return false;
    if (datumPick.target === 'csys3') {
      if (datumPick.slot === 'origin') {
        csysOriginPoint = i;
        datumPick = { target: 'csys3', slot: 'x' };
      } else if (datumPick.slot === 'x') {
        csysXPoint = i;
        datumPick = { target: 'csys3', slot: 'y' };
      } else {
        csysYPoint = i;
        datumPick = null;
      }
    } else if (datumPick.slot === 'origin') {
      csysOriginPoint = i;
      datumPick = { target: 'csysPointLine', slot: 'line' };
    }
    selectedEntity = { kind: 'point', index: i };
    return true;
  }

  function handleCreatorPickClick(i: number): boolean {
    if (!creatorPick) return false;
    let created = false;
    if (creatorPick.kind === 'line') {
      if (creatorPick.slot === 'A') {
        createLineA = i;
        creatorPick = { kind: 'line', slot: 'B' };
      } else {
        createLineB = i;
        created = createLineFromPair(createLineA, createLineB);
        if (toolCursor === 'line') {
          createLineA = i;
          createLineB = null;
          creatorPick = { kind: 'line', slot: 'B' };
        } else {
          creatorPick = null;
        }
      }
    } else {
      if (!surfaceDraft.includes(i)) surfaceDraft = [...surfaceDraft, i];
      const req = surfaceCreateKind === 'triangle' ? 3 : surfaceCreateKind === 'quad' ? 4 : Number.POSITIVE_INFINITY;
      if (surfaceDraft.length >= req) {
        created = createSurfaceFromIndices(surfaceDraft);
        if (toolCursor === 'surface') {
          surfaceDraft = [];
          creatorPick = { kind: 'surface', slot: 0 };
        } else {
          surfaceDraft = [];
          creatorPick = null;
        }
      } else {
        creatorPick = { kind: 'surface', slot: surfaceDraft.length };
      }
    }
    if (!created) selectedEntity = { kind: 'point', index: i };
    return true;
  }

  function handlePointClick(i: number, ev?: MouseEvent) {
    if (handleDatumPickClick(i)) return;
    if (handleCreatorPickClick(i)) return;

    if (createMode === 'line') {
      if (createLineA == null || createLineA === i) createLineA = i;
      else createLineB = i;
      selectedEntity = { kind: 'point', index: i };
      return;
    }
    if (createMode === 'point') {
      pendingPointIdx = i;
      selectedEntity = { kind: 'point', index: i };
      return;
    }

    if (selectionMode !== 'none') {
      // Click-to-toggle selection (box/lasso also supported via drag)
      applySelectionFromHits([i], (ev ?? ({} as any)));
      return;
    }

    // Curve capture mode
    if ((toolCursor === 'curve' || curveMode) && activeCurveIdx != null) {
      setLastAction('curveAppendPoint');
      pushUndo();
      const c = curves[activeCurveIdx];
      if (!c.pts.includes(i)) {
        c.pts = [...c.pts, i];
        curves = curves.map((cc, idx) => (idx === activeCurveIdx ? c : cc));
        rebuildLoftSegments();
      }
      return;
    }

    if (pendingPointIdx == null) {
      pendingPointIdx = i;
      return;
    }
    if (pendingPointIdx === i) {
      pendingPointIdx = null;
      return;
    }
    if (!edgeExists(edges, pendingPointIdx, i)) {
      setLastAction('addEdge');
      pushUndo();
      edges = [...edges, [pendingPointIdx, i]];
      if (activeEdgeIdx == null) activeEdgeIdx = edges.length - 1;
    }
    pendingPointIdx = null;
    selectedEntity = { kind: 'point', index: i };

  }

  function addPoint() {
    setLastAction('createPoint');
    pushUndo();
    points = [...points, { x: Number(createPtX), y: Number(createPtY), z: Number(createPtZ) }];
    const ni = points.length - 1;
    pendingPointIdx = ni;
    if (createLineA == null) createLineA = ni;
    if (createLineB == null) createLineB = ni;
  }

  function applyPointPriorityFromEvent(ev?: MouseEvent) {
    if (!ev || !svgEl) return false;
    const rect = svgEl.getBoundingClientRect();
    const mx = ev.clientX - rect.left;
    const my = ev.clientY - rect.top;
    updateSnapFromMouse(mx, my);
    if (activeSnap?.kind === 'endpoint' && activeSnap.pointIdx != null) {
      handlePointClick(activeSnap.pointIdx, ev);
      return true;
    }
    const pIdx = nearestPoint(mx, my);
    if (pIdx == null || !projected[pIdx]) return false;
    const d = Math.hypot(projected[pIdx].x - mx, projected[pIdx].y - my);
    if (d > pointPriorityPx) return false;
    handlePointClick(pIdx, ev);
    return true;
  }

  function onEdgeClick(idx: number, ev?: MouseEvent) {
    if (applyPointPriorityFromEvent(ev)) return;
    if (datumPick?.target === 'csysPointLine' && datumPick.slot === 'line') {
      csysFromLine = idx;
      datumPick = null;
    }
    activeEdgeIdx = idx;
    selectedEntity = { kind: 'line', index: idx };
    if (ev) tryInsertPointOnSelectedLineAtClick(ev);
  }

  function deleteSurface(idx: number) {
    setLastAction('deleteSurface');
    pushUndo();
    surfaces = surfaces.filter((_, i) => i !== idx);
    if (selectedEntity?.kind === 'surface') {
      if (selectedEntity.index === idx) selectedEntity = null;
      else if (selectedEntity.index > idx) selectedEntity = { kind: 'surface', index: selectedEntity.index - 1 };
    }
  }

  function onSurfaceClick(idx: number, ev?: MouseEvent) {
    if (applyPointPriorityFromEvent(ev)) return;
    selectedEntity = { kind: 'surface', index: idx };
  }

  function onPlaneClick(idx: number) {
    selectedEntity = { kind: 'plane', index: idx };
  }

  function onCsysClick(idx: number) {
    selectedEntity = { kind: 'csys', index: idx };
  }

  function createCurve() {
    setLastAction('createCurve');
    pushUndo();
    const name = `Curve ${curves.length + 1}`;
    curves = [...curves, { name, pts: [] }];
    activeCurveIdx = curves.length - 1;
    if (loftA == null) loftA = activeCurveIdx;
    else if (loftB == null) loftB = activeCurveIdx;
    rebuildLoftSegments();
  }

  function deleteCurve(idx: number) {
    setLastAction('deleteCurve');
    pushUndo();
    curves = curves.filter((_, i) => i !== idx);
    if (activeCurveIdx === idx) activeCurveIdx = null;
    loftA = loftA === idx ? null : loftA != null && loftA > idx ? loftA - 1 : loftA;
    loftB = loftB === idx ? null : loftB != null && loftB > idx ? loftB - 1 : loftB;
    rebuildLoftSegments();
  }

  function rebuildLoftSegments() {
    const out = buildLoftSegments(curves, points, loftA, loftB);
    loftErr = out.error;
    loftSegments = out.segments;
  }

  function deletePoint(idx: number) {
    pushUndo();
    points = points.filter((_, i) => i !== idx);
    // remap edges
    edges = edges
      .filter(([a, b]) => a !== idx && b !== idx)
      .map(([a, b]) => [a > idx ? a - 1 : a, b > idx ? b - 1 : b]);
    // remap curves
    curves = curves.map((c) => ({
      ...c,
      pts: c.pts
        .filter((p) => p !== idx)
        .map((p) => (p > idx ? p - 1 : p))
    }));
    surfaces = surfaces
      .map((s) => ({
        ...s,
        pts: s.pts
          .filter((p) => p !== idx)
          .map((p) => (p > idx ? p - 1 : p))
      }))
      .filter((s) => s.pts.length >= 3)
    ;
    pendingPointIdx = null;
    if (selectedEntity?.kind === 'point') {
      if (selectedEntity.index === idx) selectedEntity = null;
      else if (selectedEntity.index > idx) selectedEntity = { kind: 'point', index: selectedEntity.index - 1 };
    }
    if (activeEdgeIdx != null && activeEdgeIdx >= edges.length) activeEdgeIdx = edges.length ? 0 : null;
    rebuildLoftSegments();
  }

  function deleteEdge(idx: number) {
    pushUndo();
    edges = edges.filter((_, i) => i !== idx);
    if (selectedEntity?.kind === 'line') {
      if (selectedEntity.index === idx) selectedEntity = null;
      else if (selectedEntity.index > idx) selectedEntity = { kind: 'line', index: selectedEntity.index - 1 };
    }
    if (activeEdgeIdx === idx) activeEdgeIdx = edges.length ? 0 : null;
    if (activeEdgeIdx != null && activeEdgeIdx > idx) activeEdgeIdx -= 1;
  }

  function nearestPoint(mx: number, my: number) {
    return nearestPointIndex(projected, mx, my, 22);
  }

  function updateSnapFromMouse(mx: number, my: number) {
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
        endpoints: snapEndpoints,
        midpoints: snapMidpoints,
        curveNearest: snapCurveNearest,
        surfaceProjection: snapSurfaceProjection,
        thresholdPx: Number(snapThresholdPx) || 16
      }
    });
    const nextSig = snapCandidateSignature(nextSnap);
    if (nextSig !== lastSnapSig) {
      activeSnap = nextSnap;
      hoverTooltip = buildHoverTooltip(nextSnap, toolCursor);
      lastSnapSig = nextSig;
    }
  }

  function estimateTaperAngleAtPoint(idx: number) {
    // Lightweight estimator: average edge direction around the point,
    // then angle of that direction vs the XY plane (|dz| vs dxy).
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

  function processHoverAt(mx: number, my: number) {
    const modeKey = makeHoverModeKey({
      toolCursor,
      probeOn,
      snapEndpoints,
      snapMidpoints,
      snapCurveNearest,
      snapSurfaceProjection,
      snapThresholdPx,
      creatorPickActive: creatorPick != null,
      datumPickActive: datumPick != null,
      lineInsertPickMode
    });
    const needsHover = shouldProcessHover({
      probeOn,
      toolCursor,
      creatorPickActive: creatorPick != null,
      datumPickActive: datumPick != null,
      lineInsertPickMode
    });

    if (!needsHover) {
      if (activeSnap != null || hoverTooltip != null) {
        activeSnap = null;
        hoverTooltip = null;
        lastSnapSig = 'none';
      }
      if (probe != null) probe = null;
      lastHoverModeKey = modeKey;
      lastHoverPos = { x: mx, y: my };
      return;
    }

    if (!shouldRecomputeHover({
      lastX: lastHoverPos.x,
      lastY: lastHoverPos.y,
      x: mx,
      y: my,
      lastModeKey: lastHoverModeKey,
      modeKey,
      minDeltaPx: 0.75
    })) {
      return;
    }
    lastHoverPos = { x: mx, y: my };
    lastHoverModeKey = modeKey;

    updateSnapFromMouse(mx, my);
    if (!probeOn) {
      if (probe != null) probe = null;
      return;
    }
    const idx = nearestPoint(mx, my);
    if (idx == null) {
      if (probe != null) probe = null;
      return;
    }
    const angleDeg = estimateTaperAngleAtPoint(idx);
    const np = { x: projected[idx].x, y: projected[idx].y, angleDeg, ok: angleDeg <= maxTaperDeg };
    if (
      !probe ||
      probe.x !== np.x ||
      probe.y !== np.y ||
      Math.abs(probe.angleDeg - np.angleDeg) > 1e-6 ||
      probe.ok !== np.ok
    ) {
      probe = np;
    }
  }

  function updateProbeFromEvent(e: MouseEvent) {
    if (!svgEl) return;
    const rect = svgEl.getBoundingClientRect();
    hoverQueued = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (hoverRaf) return;
    hoverRaf = requestAnimationFrame(() => {
      hoverRaf = 0;
      if (!hoverQueued) return;
      const { x, y } = hoverQueued;
      hoverQueued = null;
      processHoverAt(x, y);
    });
  }

  async function calcOffsetIntersection() {
    intersectionBusy = true;
    const pre = precheckIntersectionInputs({
      selEdgeA,
      selEdgeB,
      edges,
      points
    });
    intersectionDiagnostics = pre.diagnostics;
    if (!pre.ok) {
      intersection = null;
      intersectionBusy = false;
      return;
    }
    const ea = edges[selEdgeA as number];
    const eb = edges[selEdgeB as number];
    const [a0, a1] = ea;
    const [b0, b1] = eb;
    const ref = points[clamp(refPointIdx, 0, points.length - 1)];
    try {
      const res = await calcOffsetIntersectionApi({
        p1A: points[a0],
        p1B: points[a1],
        p2A: points[b0],
        p2B: points[b1],
        offsetDist: Number(offsetDist),
        directionRef: ref
      });
      const skewVal = (res?.skewDistance ?? res?.skew_distance ?? res?.skew ?? null);
      const skew = (typeof skewVal === 'number' ? skewVal : Number(skewVal));
      intersection = { p: res.point, skew };
      intersectionDiagnostics = diagnoseIntersectionResult({
        skew,
        offsetDistance: Number(offsetDist),
        angleDeg: pre.diagnostics.angleDeg,
        existing: pre.diagnostics
      });
    } catch (e: any) {
      intersection = null;
      intersectionDiagnostics = {
        severity: 'error',
        message: e?.message ? String(e.message) : String(e),
        angleDeg: pre.diagnostics.angleDeg,
        skew: null,
        recommendations: [
          {
            label: 'Adjust edge pair or offset',
            confidence: 0.88,
            rationale: 'Backend solve failed; improving geometry conditioning usually resolves this.'
          }
        ]
      };
    } finally {
      intersectionBusy = false;
    }
  }

  // CSV format: Type,P/L in col0; for P: x,y,z; for L: i0,i1
  async function importCSV(file: File) {
    const { points: pts, edges: eds } = await readSurfaceCsvFile(file);
    if (pts.length) points = pts;
    if (eds.length) edges = eds;
    surfaces = [];
    planes = [];
    csys = [csys[0] ?? { name: 'Global', origin: { x: 0, y: 0, z: 0 }, xAxis: { x: 1, y: 0, z: 0 }, yAxis: { x: 0, y: 1, z: 0 }, zAxis: { x: 0, y: 0, z: 1 } }];
    pendingPointIdx = null;
    activeEdgeIdx = edges.length ? 0 : null;
    selEdgeA = edges.length ? 0 : null;
    selEdgeB = edges.length > 1 ? 1 : null;
    intersection = null;
    intersectionDiagnostics = { severity: null, message: null, angleDeg: null, skew: null, recommendations: [] };
    datumSliceRes = null;
    datumSliceErr = null;
    datumSlicePlaneIdx = 0;
    selectedSliceId = null;
  }

  // File menu notice text (shown inside the dropdown)
  let fileNotice = $state<string | null>(null);

  async function importSTEP(file: File) {
    setLastAction('fileLoadSTEP');
    const { points: norm, edges: parsedEdges, warnings } = await readSurfaceStepFile(file, 200_000);
    points = norm;
    edges = parsedEdges;
    surfaces = [];
    planes = [];
    csys = [csys[0] ?? { name: 'Global', origin: { x: 0, y: 0, z: 0 }, xAxis: { x: 1, y: 0, z: 0 }, yAxis: { x: 0, y: 1, z: 0 }, zAxis: { x: 0, y: 0, z: 1 } }];
    if (warnings?.length) fileNotice = warnings.join(' ');
    pendingPointIdx = null;
    activeEdgeIdx = edges.length ? 0 : null;
    selEdgeA = edges.length ? 0 : null;
    selEdgeB = edges.length > 1 ? 1 : null;
    intersection = null;
    intersectionDiagnostics = { severity: null, message: null, angleDeg: null, skew: null, recommendations: [] };
    datumSliceRes = null;
    datumSliceErr = null;
    datumSlicePlaneIdx = 0;
    selectedSliceId = null;
  }

  async function handleLoadedFile(file: File) {
    fileNotice = null;
    const name = (file.name || '').toLowerCase();
    if (name.endsWith('.csv')) {
      await importCSV(file);
      fitToScreen();
      return;
    }
    if (name.endsWith('.stp') || name.endsWith('.step')) {
      await importSTEP(file);
      fitToScreen();
      return;
    }
    throw new Error('Unsupported file type');
  }

  function exportSTEP() {
    // Placeholder until topology/edges export is defined.
    fileNotice = 'STEP export not implemented yet.';
  }

  function exportCSV() {
    triggerCsvDownload(buildSurfaceCsv(points, edges));
  }

  const surfaceWorkspaceKey = 'surface.main';
  const chooseCoreMode = (v: boolean) => {
    coreMode = v;
    if (v) advancedOpen = false;
    showCoreModePrompt = false;
    persistCoreMode(v);
    markCoreModePromptSeen();
  };

  const setRightRailCollapsed = (v: boolean) => {
    rightRailCollapsed = v;
    persistRightRailCollapsed(v);
  };

  onMount(() => {
    const sessionUi = readWorkspaceUiState(surfaceWorkspaceKey);
    const persistedRail = readPersistedRightRailCollapsed();
    if (sessionUi) {
      coreMode = sessionUi.coreMode;
      advancedOpen = sessionUi.coreMode ? false : sessionUi.advancedOpen;
      if (typeof sessionUi.rightRailCollapsed === 'boolean') rightRailCollapsed = sessionUi.rightRailCollapsed;
      else if (persistedRail != null) rightRailCollapsed = persistedRail;
    } else {
      const persistedCoreMode = readPersistedCoreMode();
      if (persistedCoreMode == null) {
        coreMode = true;
        advancedOpen = false;
        showCoreModePrompt = !hasSeenCoreModePrompt();
      } else {
        coreMode = persistedCoreMode;
        advancedOpen = false;
      }
      if (persistedRail != null) rightRailCollapsed = persistedRail;
    }

    const loaded = loadWorkspaceRecipes(surfaceWorkspaceKey);
    recipes = loaded.recipes;
    if (recipes.length > 0 && !selectedRecipeId) {
      selectedRecipeId = recipes[0].id;
      recipeNameDraft = recipes[0].name;
    }
    if (loaded.migrated) toast.info('Surface recipes migrated', 'Upgraded recipe store to v2 format.');

    const cleanupGlobalHandlers = mountSurfaceGlobalHandlers({
      getLastAction: () => lastAction,
      get canUndo() { return canUndo; },
      get canRedo() { return canRedo; },
      get coreMode() { return coreMode; },
      get rightRailCollapsed() { return rightRailCollapsed; },
      openCreateGeometry: () => {
        createGeometryModalOpen = true;
      },
      openSurfaceCurveOps: () => {
        surfaceCurveOpsModalOpen = true;
      },
      openExtrude: () => {
        extrudeModalOpen = true;
      },
      openDatums: openDatumsModal,
      openSettings: () => {
        settingsOpen = true;
      },
      undo,
      redo,
      clearPicks: () => {
        pendingPointIdx = null;
        intersection = null;
      },
      fitToScreen,
      resetView,
      toggleCoreMode: () => {
        coreMode = !coreMode;
        if (coreMode) advancedOpen = false;
        persistCoreMode(coreMode);
      },
      toggleRightRail: () => {
        setRightRailCollapsed(!rightRailCollapsed);
      },
      exportCsv: exportCSV,
      exportStep: exportSTEP
    });

    const cleanupViewportMount = mountSurfaceViewportInteraction({
      viewportEl,
      svgEl,
      getSelectionMode: () => selectionMode,
      getZoomK: () => zoomK,
      setZoomK: (v) => (zoomK = v),
      getPan: () => pan,
      setPan: (v) => (pan = v),
      getRot: () => rot,
      setRot: (v) => (rot = v),
      getW: () => w,
      getH: () => h,
      setW: (v) => (w = v),
      setH: (v) => (h = v),
      getRotateAnchor: () => rotateAnchor,
      setRotateAnchor: (v) => (rotateAnchor = v),
      pickOrbitPivot,
      rotateForView
    });

    return () => {
      cleanupGlobalHandlers();
      cleanupViewportMount();
      if (createNoticeTimer) clearTimeout(createNoticeTimer);
    };
  });

  $effect(() => {
    writeWorkspaceUiState(surfaceWorkspaceKey, {
      coreMode,
      advancedOpen: coreMode ? false : advancedOpen,
      rightRailCollapsed
    });
  });

  $effect(() => {
    saveWorkspaceRecipes(surfaceWorkspaceKey, recipes);
  });

  $effect(() => {
    emitStatusWarnings(toStatusFromIntersection(intersectionDiagnostics));
  });

  $effect(() => {
    if (!datumSliceRes) return;
    emitStatusWarnings(toStatusFromSliceWarnings(datumSliceRes.warnings));
  });

  $effect(() => {
    if (datumSliceErr) {
      emitStatusWarnings([buildSlicingRuntimeWarning(datumSliceErr)]);
    }
  });

  $effect(() => {
    registerContextMenu(
      buildSurfaceNavMenu({
        canUndo,
        canRedo,
        coreMode,
        rightRailCollapsed
      })
    );
  });
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

    <SurfaceRightRail
      bind:rightRailCollapsed
      {coreMode}
      bind:advancedOpen
      {datumSliceBusy}
      pointsCount={points.length}
      edgesCount={edges.length}
      surfacesCount={surfaces.length}
      {statusWarnings}
      {SURFACE_ANALYTICS_ENABLED}
      bind:interpPct
      {interpPoint}
      {edges}
      {points}
      bind:selEdgeA
      bind:selEdgeB
      bind:offsetDist
      bind:refPointIdx
      {intersection}
      {intersectionBusy}
      {intersectionDiagnostics}
      bind:evalUseSelection
      bind:heatmapOn
      bind:evalTol
      bind:evalSigmaMult
      {evalBusy}
      {evalErr}
      {evalRes}
      bind:pendingPointIdx
      bind:cylUseSelection
      bind:cylShowAxis
      {cylBusy}
      {cylErr}
      {cylRes}
      bind:cylRefineK
      {cylThresholdAbs}
      {currentActiveFitPointIds}
      {selectedPointIds}
      {cylFitPointIds}
      bind:sliceAxis
      bind:sliceBins
      bind:sliceThickness
      bind:sliceMetric
      {sliceBusy}
      {sliceErr}
      {sliceRes}
      {datumPlaneChoices}
      bind:datumSlicePlaneIdx
      bind:datumSliceMode
      bind:datumSliceSpacing
      bind:datumSliceCount
      bind:datumSliceThickness
      bind:datumSliceUseSelection
      bind:includeOptionalSliceColumns
      {datumSliceErr}
      {datumSliceRes}
      {sliceSyncModel}
      bind:selectedSliceId
      {recipes}
      bind:selectedRecipeId
      bind:recipeNameDraft
      bind:recipeStepConfirmed
      {recipeRun}
      {activeEdgeIdx}
      setActiveEdgeIdx={(i) => (activeEdgeIdx = i)}
      {curves}
      {activeCurveIdx}
      setActiveCurveIdx={(i) => (activeCurveIdx = i)}
      {curveMode}
      {loftA}
      {loftB}
      setLoftA={(v) => (loftA = v)}
      setLoftB={(v) => (loftB = v)}
      loftSegmentsCount={loftSegments.length}
      {loftErr}
      {toolCursor}
      bind:samplerAppend
      bind:samplerMode
      bind:samplerNu
      bind:samplerNv
      bind:samplerEdgeSegs
      bind:samplerErr
      onSetRightRailCollapsed={setRightRailCollapsed}
      onOpenCreateGeometry={() => (createGeometryModalOpen = true)}
      onOpenDatums={openDatumsModal}
      onOpenSettings={() => (settingsOpen = true)}
      onClearPicks={() => {
        pendingPointIdx = null;
        intersection = null;
      }}
      onToggleAdvancedOpen={() => (advancedOpen = !advancedOpen)}
      onClearWarnings={() => {
        statusWarnings = [];
        emittedWarningIds.clear();
      }}
      {computeSurfaceEval}
      {computeCylinderFit}
      {cylSelectOutliers}
      {cylKeepInliers}
      {cylRemoveOutliers}
      {computeSectionSlices}
      computeDatumSlices={computeDatumSlices}
      {exportDatumSliceCombined}
      {calcOffsetIntersection}
      {saveCurrentRecipe}
      {deleteSelectedRecipe}
      {selectRecipe}
      {toggleSelectedRecipeStep}
      {startRecipeRun}
      {runRecipeNextStep}
      {cancelRecipeRun}
      {deleteEdge}
      {deleteCurve}
      {createCurve}
      {rebuildLoftSegments}
      {setToolCursor}
      {generateSamplerPoints}
    />
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

  <SurfaceModalStack
    bind:datumsModalOpen
    bind:datumsModalPos
    bind:datumsModalPanelEl
    bind:datumPick
    bind:csysCreateMode
    bind:csysOriginPoint
    bind:csysXPoint
    bind:csysYPoint
    bind:csysFromLine
    bind:csysCopyIdx
    bind:planeCreateMode
    bind:planeP0
    bind:planeP1
    bind:planeP2
    bind:planeNormalVec
    bind:planeOffsetSurface
    bind:planeOffsetDist
    bind:planeLineA
    bind:planeLineB
    bind:planeDirPoint
    bind:planeDirVec
    bind:planeCsysIdx
    bind:planePrincipal
    {datumPickHint}
    {startDatumsModalDrag}
    {armDatumPick}
    {addDatumCsys}
    {addDatumPlane}
    {csys}
    {planes}
    bind:createGeometryModalOpen
    bind:createGeomModalPanelEl
    pointsCount={points.length}
    minLinePoints={minPointsFor.line}
    minSurfacePoints={minPointsFor.surface}
    {creatorHint}
    {surfaceFlowHint}
    bind:surfaceDraft
    {surfaceDraftRequired}
    bind:surfaceCreateKind
    bind:creatorPick
    bind:createLineA
    bind:createLineB
    bind:createPtX
    bind:createPtY
    bind:createPtZ
    {beginLinePick}
    {beginSurfacePick}
    {addPoint}
    {finishContourSurface}
    bind:surfaceCurveOpsModalOpen
    bind:surfCurveModalPanelEl
    bind:selectedEntity
    bind:lineInsertT
    bind:lineInsertPickMode
    bind:toolCursor
    bind:offsetSurfaceIdx
    bind:offsetSurfaceDist
    bind:offsetCurveIdx
    bind:offsetCurveSurfaceIdx
    bind:offsetCurveDist
    bind:offsetCurveFlip
    bind:offsetCurveStatus
    {insertPointOnEdge}
    {setToolCursor}
    {offsetSurfaceCreate}
    {offsetCurveOnSurfaceCreate}
    bind:extrudeModalOpen
    bind:extrudeTarget
    bind:extrudeLineIdx
    bind:extrudeCurveIdx
    bind:extrudeDirMode
    bind:extrudeDistance
    bind:extrudeVector
    bind:extrudeSurfaceIdx
    bind:extrudeFlip
    {extrudeLineOrCurve}
    bind:healingModalOpen
    bind:healingModalPanelEl
    bind:healTol
    {runTopologyHealing}
    bind:settingsOpen
    bind:showSelectionLabels
    bind:showPointEntities
    bind:showLineEntities
    bind:showSurfaceEntities
    bind:showDatumEntities
    bind:snapEndpoints
    bind:snapMidpoints
    bind:snapCurveNearest
    bind:snapSurfaceProjection
    bind:snapThresholdPx
  />
</div>
