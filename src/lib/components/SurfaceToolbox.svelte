<script lang="ts">
  import * as d3 from 'd3';
  import { onMount } from 'svelte';
  // @formkit/auto-animate exports a default function (not a named export)
  import autoAnimate from '@formkit/auto-animate';

  import SurfaceSelectionControls from './surface/SurfaceSelectionControls.svelte';
  import SurfaceInterpolationPanel from './surface/SurfaceInterpolationPanel.svelte';
  import SurfaceSamplerPanel from './surface/SurfaceSamplerPanel.svelte';
  import SurfaceCanvas from './surface/SurfaceCanvas.svelte';
  import SurfaceFileMenu from './surface/SurfaceFileMenu.svelte';
  import CurveEdgesLoftPanel from './surface/CurveEdgesLoftPanel.svelte';
  import SurfaceFitPanel from './surface/SurfaceFitPanel.svelte';
  import SurfaceOffsetIntersectionPanel from './surface/SurfaceOffsetIntersectionPanel.svelte';
  import { parseStepPointsAndEdges } from './surface/SurfaceCommands';
  import type { Curve, DatumCsys, DatumPlane, Edge, Point3D, SurfaceFace } from '../surface/types';
  import { bilerp, clamp, deg, lerp3, vecNorm, vecSub } from '../surface/geom/points';
  import { edgeExists } from '../surface/geom/edges';
  import { buildLoftSegments } from '../surface/geom/curves';
  import { activeFitPointIds } from '../surface/geom/indexing';
  import { runBestFitCylinder, runBestFitPlane, runSectionSlices } from '../surface/eval/SurfaceEvaluation';
  import { calcOffsetIntersectionApi, importStepText } from '../surface/api/surfaceApi';
  import {
    computeCylinderAxisSegment,
    depthOpacity as viewportDepthOpacity,
    fitToScreen as viewportFitToScreen,
    projectPoint
  } from '../surface/viewport/SurfaceViewport';
  import {
    applySelectionFromHits as applySelectionHits,
    hitsInLasso,
    hitsInRect
  } from './surface/SelectionEngine';
  import { createSnapshot, materializeSnapshot, type Snapshot } from '../surface/state/SurfaceStore';

  // --- Dev-only diagnostics ---
  // Track the last UI action so runtime errors are attributable.
  let lastAction = $state<string>('init');
  const setLastAction = (a: string) => {
    lastAction = a;
  };

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
  let selectionMode = $state<SelectionMode>('none');
  let selectedPointIds = $state<number[]>([]); // stable serialization (avoid Set reactivity gotchas)
  let selectedSet = $derived.by(() => new Set(selectedPointIds));

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
    // Selection conflicts with curve capture + edge chaining; make the state explicit.
    selectionMode = m;
    if (m !== 'none') {
      curveMode = false;
      createMode = 'idle';
      pendingPointIdx = null;
    }
  }

  function setCreateMode(m: 'idle' | 'point' | 'line' | 'surface') {
    createMode = m;
    if (m !== 'idle') {
      selectionMode = 'none';
      curveMode = false;
      pendingPointIdx = null;
    }
    if (m === 'idle' || m === 'point') creatorPick = null;
    if (m !== 'surface') surfaceDraft = [];
  }

  function beginLinePick(slot: 'A' | 'B') {
    setCreateMode('line');
    creatorPick = { kind: 'line', slot };
  }

  function beginSurfacePick(slot: number) {
    setCreateMode('surface');
    creatorPick = { kind: 'surface', slot };
  }

  function openDatumsModal() {
    datumsModalOpen = true;
    const ww = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const wh = typeof window !== 'undefined' ? window.innerHeight : 800;
    if (!datumsModalDragging) {
      datumsModalPos = { x: Math.max(20, ww * 0.5 - 380), y: Math.max(20, wh * 0.5 - 220) };
    }
  }

  function startDatumsModalDrag(ev: PointerEvent) {
    ev.stopPropagation();
    datumsModalDragging = true;
    datumsModalDragOffset = { x: ev.clientX - datumsModalPos.x, y: ev.clientY - datumsModalPos.y };
    const onMove = (e: PointerEvent) => {
      if (!datumsModalDragging) return;
      datumsModalPos = {
        x: Math.max(12, e.clientX - datumsModalDragOffset.x),
        y: Math.max(12, e.clientY - datumsModalDragOffset.y)
      };
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

  const snap = (): Snapshot => createSnapshot(points, edges, curves, surfaces, csys, planes, activeEdgeIdx);
  const pushUndo = () => {
    undoStack = [...undoStack, snap()];
    if (undoStack.length > 100) undoStack = undoStack.slice(undoStack.length - 100);
    redoStack = [];
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
    if (undoStack.length === 0) return;
    const cur = snap();
    const prev = undoStack[undoStack.length - 1];
    undoStack = undoStack.slice(0, -1);
    redoStack = [...redoStack, cur];
    applySnap(prev);
  };
  const redo = () => {
    if (redoStack.length === 0) return;
    const cur = snap();
    const next = redoStack[redoStack.length - 1];
    redoStack = redoStack.slice(0, -1);
    undoStack = [...undoStack, cur];
    applySnap(next);
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
  let datumsModalOpen = $state(false);
  let draftingModalOpen = $state(false);
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
  let extrudeTarget = $state<'line' | 'curve'>('line');
  let extrudeLineIdx = $state<number>(0);
  let extrudeCurveIdx = $state<number>(0);
  let extrudeDirMode = $state<'vector' | 'curve' | 'surfaceNormal'>('vector');
  let extrudeVector = $state<Point3D>({ x: 0, y: 0, z: 1 });
  let extrudeSurfaceIdx = $state<number>(0);
  let extrudeFlip = $state(false);
  let extrudeDistance = $state<number>(20);
  let healTol = $state<number>(0.5);
  let actionsBarEl: HTMLElement | null = null;
  let datumsModalPanelEl = $state<HTMLElement | null>(null);
  let draftingModalPanelEl = $state<HTMLElement | null>(null);
  let createGeomModalPanelEl = $state<HTMLElement | null>(null);
  let surfCurveModalPanelEl = $state<HTMLElement | null>(null);
  let extrudeModalPanelEl = $state<HTMLElement | null>(null);
  let healingModalPanelEl = $state<HTMLElement | null>(null);

  // Minimal 2D drafting model
  type SketchPoint2D = { x: number; y: number };
  type SketchEdge2D = [number, number];
  type SketchConstraint = { kind: 'horizontal' | 'vertical' | 'length'; edgeIdx: number; value?: number };
  let sketchPlaneIdx = $state<number>(0);
  let sketchPts2D = $state<SketchPoint2D[]>([]);
  let sketchEdges2D = $state<SketchEdge2D[]>([]);
  let sketchConstraints = $state<SketchConstraint[]>([]);
  let sketchDraftX = $state<number>(0);
  let sketchDraftY = $state<number>(0);
  let sketchPendingIdx = $state<number | null>(null);

  // Two-edge selection for offset/intersection
  let selEdgeA = $state<number | null>(0);
  let selEdgeB = $state<number | null>(1);
  let offsetDist = $state(5);
  let refPointIdx = $state<number>(0);
  let intersection = $state<{ p: Point3D; skew: number } | null>(null);

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
  let svgSelection: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
  let zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null;

  function syncD3ZoomTransform(k: number, x: number, y: number) {
    if (!svgSelection || !zoomBehavior) return;
    const t = d3.zoomIdentity.translate(x, y).scale(k);
    svgSelection.call((zoomBehavior as any).transform, t);
  }

  function resetView() {
    rot = { alpha: -0.65, beta: 0.35 };
    zoomK = 1;
    pan = { x: 0, y: 0 };
    syncD3ZoomTransform(1, 0, 0);
  }

  function fitToScreen() {
    const fitted = viewportFitToScreen(points, rot, w, h);
    if (!fitted) return;
    zoomK = fitted.zoomK;
    pan = fitted.pan;
    syncD3ZoomTransform(fitted.zoomK, fitted.pan.x, fitted.pan.y);
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
    cylErr = null;
    cylBusy = true;
    try {
      const r = await runBestFitCylinder(points, selectedPointIds, cylUseSelection, {
        evalTol,
        evalSigmaMult,
        evalMaxOutliers
      });
      cylFitPointIds = r.fitPointIds;
      cylRes = r.res;
    } catch (e: any) {
      cylErr = e?.message ? String(e.message) : String(e);
      cylRes = null;
    } finally {
      cylBusy = false;
    }
  }


  function cylThresholdAbs() {
    if (!cylRes) return 0;
    const k = Number.isFinite(cylRefineK) ? Math.abs(cylRefineK) : 2;
    return k * (cylRes.rms ?? 0);
  }

  function cylIdsByThreshold(outliers: boolean) {
    if (!cylRes) return [];
    const thr = cylThresholdAbs();
    const ids: number[] = [];
    for (let j = 0; j < (cylRes.absDistances?.length ?? 0); j++) {
      const d = Math.abs(cylRes.absDistances[j] ?? 0);
      if (outliers ? (d > thr) : (d <= thr)) ids.push(cylFitPointIds[j]);
    }
    return ids.filter((v) => Number.isFinite(v));
  }

  function cylSelectOutliers() {
    const ids = cylIdsByThreshold(true);
    selectedPointIds = Array.from(new Set(ids)).sort((a, b) => a - b);
  }

  function cylKeepInliers() {
    const ids = cylIdsByThreshold(false);
    selectedPointIds = Array.from(new Set(ids)).sort((a, b) => a - b);
  }

  function cylRemoveOutliers() {
    const toRemove = new Set(cylIdsByThreshold(true));
    const cur = new Set(selectedPointIds);
    for (const id of toRemove) cur.delete(id);
    selectedPointIds = Array.from(cur).sort((a, b) => a - b);
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

  async function computeSurfaceEval() {
    evalErr = null;
    evalBusy = true;
    try {
      evalRes = await runBestFitPlane(points, selectedPointIds, evalUseSelection, {
        evalTol,
        evalSigmaMult,
        evalMaxOutliers
      });
    } catch (e: any) {
      evalErr = e?.message ? String(e.message) : String(e);
      evalRes = null;
    } finally {
      evalBusy = false;
    }
  }

  async function computeSectionSlices() {
    sliceErr = null;
    sliceBusy = true;
    try {
      const res = await runSectionSlices(
        points,
        selectedPointIds,
        evalUseSelection,
        sliceAxis,
        sliceBins,
        sliceThickness
      );
      sliceRes = {
        axis: (res?.axis ?? sliceAxis) as any,
        min: Number(res?.min ?? res?.tMin ?? 0),
        max: Number(res?.max ?? res?.tMax ?? 0),
        slices: Array.isArray(res?.slices) ? res.slices : [],
      };
    } catch (e: any) {
      sliceErr = e?.message ? String(e.message) : String(e);
      sliceRes = null;
    } finally {
      sliceBusy = false;
    }
  }

  $effect(() => {
    if (actionsBarEl) autoAnimate(actionsBarEl, { duration: 160 });
  });
  $effect(() => {
    if (datumsModalPanelEl) autoAnimate(datumsModalPanelEl, { duration: 180 });
  });
  $effect(() => {
    if (draftingModalPanelEl) autoAnimate(draftingModalPanelEl, { duration: 180 });
  });
  $effect(() => {
    if (createGeomModalPanelEl) autoAnimate(createGeomModalPanelEl, { duration: 180 });
  });
  $effect(() => {
    if (surfCurveModalPanelEl) autoAnimate(surfCurveModalPanelEl, { duration: 180 });
  });
  $effect(() => {
    if (extrudeModalPanelEl) autoAnimate(extrudeModalPanelEl, { duration: 180 });
  });
  $effect(() => {
    if (healingModalPanelEl) autoAnimate(healingModalPanelEl, { duration: 180 });
  });



  // Auto-animate hooks are bound via panel refs.

  // Rotation then projection into SVG coords.
  function rotateForView(p: Point3D, r = rot) {
    const ca = Math.cos(r.alpha);
    const sa = Math.sin(r.alpha);
    const cb = Math.cos(r.beta);
    const sb = Math.sin(r.beta);
    const x = p.x * ca - p.z * sa;
    const z0 = p.x * sa + p.z * ca;
    const y = p.y * cb - z0 * sb;
    const z = p.y * sb + z0 * cb;
    return { x, y, z };
  }

  function nearestEdgeHit(mx: number, my: number) {
    let best: { edgeIdx: number; t: number; d: number } | null = null;
    for (let ei = 0; ei < edges.length; ei++) {
      const [a, b] = edges[ei];
      const p0 = projected[a];
      const p1 = projected[b];
      if (!p0 || !p1) continue;
      const vx = p1.x - p0.x;
      const vy = p1.y - p0.y;
      const len2 = vx * vx + vy * vy;
      if (len2 < 1e-9) continue;
      const t = clamp(((mx - p0.x) * vx + (my - p0.y) * vy) / len2, 0, 1);
      const cx = p0.x + t * vx;
      const cy = p0.y + t * vy;
      const d = Math.hypot(mx - cx, my - cy);
      if (!best || d < best.d) best = { edgeIdx: ei, t, d };
    }
    if (!best || best.d > 24) return null;
    return best;
  }

  function pickOrbitPivot(mx: number, my: number): Point3D {
    const pIdx = nearestPoint(mx, my);
    if (pIdx != null && projected[pIdx] && Math.hypot(projected[pIdx].x - mx, projected[pIdx].y - my) < 20) return points[pIdx];

    const eh = nearestEdgeHit(mx, my);
    if (eh) {
      const [a, b] = edges[eh.edgeIdx];
      return lerp3(points[a], points[b], eh.t);
    }

    let bestSurf: { i: number; d: number } | null = null;
    for (let i = 0; i < surfaces.length; i++) {
      const pp = surfaces[i].pts.map((idx) => projected[idx]).filter(Boolean);
      if (pp.length < 3) continue;
      const cx = pp.reduce((acc, p) => acc + p.x, 0) / pp.length;
      const cy = pp.reduce((acc, p) => acc + p.y, 0) / pp.length;
      const d = Math.hypot(mx - cx, my - cy);
      if (!bestSurf || d < bestSurf.d) bestSurf = { i, d };
    }
    if (bestSurf && bestSurf.d < 36) {
      const s = surfaces[bestSurf.i];
      const centroid = s.pts.reduce((acc, idx) => ({
        x: acc.x + points[idx].x,
        y: acc.y + points[idx].y,
        z: acc.z + points[idx].z
      }), { x: 0, y: 0, z: 0 });
      return { x: centroid.x / s.pts.length, y: centroid.y / s.pts.length, z: centroid.z / s.pts.length };
    }

    if (points.length) {
      const c = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y, z: acc.z + p.z }), { x: 0, y: 0, z: 0 });
      return { x: c.x / points.length, y: c.y / points.length, z: c.z / points.length };
    }
    return { x: 0, y: 0, z: 0 };
  }

  function project(p: Point3D) {
    return projectPoint(p, rot, zoomK, w, h, pan);
  }

  let projected = $derived(points.map(project));

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
      const n = vUnit(pl.normal);
      let u = pl.xDir ? vUnit(pl.xDir) : vUnit(vCross(Math.abs(n.z) > 0.9 ? { x: 0, y: 1, z: 0 } : { x: 0, y: 0, z: 1 }, n));
      if (vLen(u) < 1e-9) u = { x: 1, y: 0, z: 0 };
      const v = vUnit(vCross(n, u));
      return {
        i,
        name: pl.name,
        pts: [
          vAdd(vAdd(pl.origin, vMul(u, -patchSize)), vMul(v, -patchSize)),
          vAdd(vAdd(pl.origin, vMul(u, patchSize)), vMul(v, -patchSize)),
          vAdd(vAdd(pl.origin, vMul(u, patchSize)), vMul(v, patchSize)),
          vAdd(vAdd(pl.origin, vMul(u, -patchSize)), vMul(v, patchSize))
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
      out.push({ i: i * 3, csysIdx: i, axis: 'X', a: c.origin, b: vAdd(c.origin, vMul(vUnit(c.xAxis), axisSize)) });
      out.push({ i: i * 3 + 1, csysIdx: i, axis: 'Y', a: c.origin, b: vAdd(c.origin, vMul(vUnit(c.yAxis), axisSize)) });
      out.push({ i: i * 3 + 2, csysIdx: i, axis: 'Z', a: c.origin, b: vAdd(c.origin, vMul(vUnit(c.zAxis), axisSize)) });
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
    const base = viewportDepthOpacity(z, zRange);
    return 0.08 + 0.92 * Math.pow(base, 1.35);
  }

  function pointDepthOpacity(z: number) {
    const d = depthOpacity(z);
    return 0.25 + 0.75 * d;
  }

  function surfaceDepthOpacity(z: number) {
    const d = depthOpacity(z);
    return 0.15 + 0.85 * d;
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
    if (!creatorPick) return 'Tip: click Pick to arm line/surface creation. Line creates at B. Triangle/Quad auto-create on final point.';
    if (creatorPick.kind === 'line') return `Pick Line ${creatorPick.slot}: click a viewport point (auto-advances to next slot).`;
    return `Pick Surface P${creatorPick.slot + 1}: click viewport points in order.`;
  });
  let datumPickHint = $derived.by(() => {
    if (!datumPick) return 'Use Pick buttons to select points/lines directly from the model.';
    if (datumPick.target === 'csys3') return `Pick CSYS 3-Points: ${datumPick.slot.toUpperCase()} from model.`;
    return datumPick.slot === 'line' ? 'Pick CSYS line from model.' : 'Pick CSYS origin point from model.';
  });

  function armDatumPick(target: 'csys3' | 'csysPointLine', slot: 'origin' | 'x' | 'y' | 'line') {
    creatorPick = null;
    createMode = 'idle';
    lineInsertPickMode = false;
    datumPick = { target, slot };
  }

  const vAdd = (a: Point3D, b: Point3D): Point3D => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
  const vMul = (a: Point3D, k: number): Point3D => ({ x: a.x * k, y: a.y * k, z: a.z * k });
  const vCross = (a: Point3D, b: Point3D): Point3D => ({
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  });
  const vLen = (v: Point3D) => Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  const vUnit = (v: Point3D): Point3D => {
    const l = vLen(v);
    if (l < 1e-9) return { x: 1, y: 0, z: 0 };
    return { x: v.x / l, y: v.y / l, z: v.z / l };
  };

  function addDatumCsys() {
    setLastAction('createCSYS');
    let next: DatumCsys | null = null;
    if (csysCreateMode === 'global') {
      next = {
        name: `CSYS ${csys.length + 1}`,
        origin: { x: 0, y: 0, z: 0 },
        xAxis: { x: 1, y: 0, z: 0 },
        yAxis: { x: 0, y: 1, z: 0 },
        zAxis: { x: 0, y: 0, z: 1 }
      };
    } else if (csysCreateMode === 'three_points') {
      const o = points[csysOriginPoint];
      const px = points[csysXPoint];
      const py = points[csysYPoint];
      if (!o || !px || !py) return;
      const x = vUnit(vecSub(px, o));
      const v = vecSub(py, o);
      const z = vUnit(vCross(x, v));
      const y = vUnit(vCross(z, x));
      next = { name: `CSYS ${csys.length + 1}`, origin: { ...o }, xAxis: x, yAxis: y, zAxis: z };
    } else if (csysCreateMode === 'point_line') {
      const o = points[csysOriginPoint];
      const ln = edges[csysFromLine];
      if (!o || !ln) return;
      const x = vUnit(vecSub(points[ln[1]], points[ln[0]]));
      const up = Math.abs(x.z) > 0.9 ? { x: 0, y: 1, z: 0 } : { x: 0, y: 0, z: 1 };
      const y = vUnit(vCross(up, x));
      const z = vUnit(vCross(x, y));
      next = { name: `CSYS ${csys.length + 1}`, origin: { ...o }, xAxis: x, yAxis: y, zAxis: z };
    } else {
      const src = csys[csysCopyIdx];
      if (!src) return;
      next = { ...src, name: `CSYS ${csys.length + 1}`, origin: { ...src.origin }, xAxis: { ...src.xAxis }, yAxis: { ...src.yAxis }, zAxis: { ...src.zAxis } };
    }
    if (!next) return;
    pushUndo();
    csys = [...csys, next];
    selectedEntity = { kind: 'csys', index: csys.length - 1 };
  }

  function surfaceCentroid(face: SurfaceFace): Point3D {
    const c = face.pts.reduce((acc, idx) => vAdd(acc, points[idx]), { x: 0, y: 0, z: 0 });
    return vMul(c, 1 / Math.max(1, face.pts.length));
  }

  function surfaceNormal(face: SurfaceFace): Point3D {
    if (face.pts.length < 3) return { x: 0, y: 0, z: 1 };
    const p0 = points[face.pts[0]];
    const p1 = points[face.pts[1]];
    const p2 = points[face.pts[2]];
    return vUnit(vCross(vecSub(p1, p0), vecSub(p2, p0)));
  }

  function addDatumPlane() {
    setLastAction('createPlane');
    let origin: Point3D | null = null;
    let normal: Point3D | null = null;
    let xDir: Point3D | undefined;
    let source = planeCreateMode;

    if (planeCreateMode === 'three_points') {
      const p0 = points[planeP0];
      const p1 = points[planeP1];
      const p2 = points[planeP2];
      if (!p0 || !p1 || !p2) return;
      origin = { ...p0 };
      xDir = vUnit(vecSub(p1, p0));
      normal = vUnit(vCross(vecSub(p1, p0), vecSub(p2, p0)));
    } else if (planeCreateMode === 'point_normal') {
      const p0 = points[planeP0];
      if (!p0) return;
      origin = { ...p0 };
      normal = vUnit(planeNormalVec);
    } else if (planeCreateMode === 'offset_surface') {
      const s = surfaces[planeOffsetSurface];
      if (!s) return;
      const c = surfaceCentroid(s);
      const n = surfaceNormal(s);
      origin = vAdd(c, vMul(n, Number(planeOffsetDist) || 0));
      normal = n;
    } else if (planeCreateMode === 'two_lines') {
      const la = edges[planeLineA];
      const lb = edges[planeLineB];
      if (!la || !lb) return;
      const aDir = vUnit(vecSub(points[la[1]], points[la[0]]));
      const bDir = vUnit(vecSub(points[lb[1]], points[lb[0]]));
      normal = vUnit(vCross(aDir, bDir));
      origin = { ...points[la[0]] };
      xDir = aDir;
    } else if (planeCreateMode === 'point_direction') {
      const p0 = points[planeDirPoint];
      if (!p0) return;
      origin = { ...p0 };
      normal = vUnit(planeDirVec);
    } else {
      const c = csys[planeCsysIdx];
      if (!c) return;
      origin = { ...c.origin };
      if (planePrincipal === 'XY') { normal = { ...c.zAxis }; xDir = { ...c.xAxis }; }
      else if (planePrincipal === 'YZ') { normal = { ...c.xAxis }; xDir = { ...c.yAxis }; }
      else { normal = { ...c.yAxis }; xDir = { ...c.zAxis }; }
    }

    if (!origin || !normal) return;
    const next: DatumPlane = { name: `Plane ${planes.length + 1}`, origin, normal, xDir, source };
    pushUndo();
    planes = [...planes, next];
    selectedEntity = { kind: 'plane', index: planes.length - 1 };
  }

  function planeBasis(pl: DatumPlane) {
    const n = vUnit(pl.normal);
    let u = pl.xDir ? vUnit(pl.xDir) : vUnit(vCross(Math.abs(n.z) > 0.9 ? { x: 0, y: 1, z: 0 } : { x: 0, y: 0, z: 1 }, n));
    if (vLen(u) < 1e-9) u = { x: 1, y: 0, z: 0 };
    const v = vUnit(vCross(n, u));
    return { o: pl.origin, u, v, n };
  }

  function applySketchConstraints() {
    let pts = sketchPts2D.map((p) => ({ ...p }));
    for (const c of sketchConstraints) {
      const e = sketchEdges2D[c.edgeIdx];
      if (!e) continue;
      const [a, b] = e;
      if (!pts[a] || !pts[b]) continue;
      if (c.kind === 'horizontal') pts[b].y = pts[a].y;
      if (c.kind === 'vertical') pts[b].x = pts[a].x;
      if (c.kind === 'length') {
        const t = c.value ?? 10;
        const d = { x: pts[b].x - pts[a].x, y: pts[b].y - pts[a].y };
        const l = Math.hypot(d.x, d.y) || 1;
        pts[b] = { x: pts[a].x + (d.x / l) * t, y: pts[a].y + (d.y / l) * t };
      }
    }
    sketchPts2D = pts;
  }

  function addSketchPoint() {
    sketchPts2D = [...sketchPts2D, { x: Number(sketchDraftX), y: Number(sketchDraftY) }];
  }

  function addSketchLineFromPoint(idx: number) {
    if (sketchPendingIdx == null) {
      sketchPendingIdx = idx;
      return;
    }
    if (sketchPendingIdx === idx) {
      sketchPendingIdx = null;
      return;
    }
    sketchEdges2D = [...sketchEdges2D, [sketchPendingIdx, idx]];
    sketchPendingIdx = idx;
    applySketchConstraints();
  }

  function addSketchConstraint(kind: SketchConstraint['kind']) {
    if (!sketchEdges2D.length) return;
    const edgeIdx = sketchEdges2D.length - 1;
    const v = kind === 'length' ? 20 : undefined;
    sketchConstraints = [...sketchConstraints, { kind, edgeIdx, value: v }];
    applySketchConstraints();
  }

  function sketchTo3D(pl: DatumPlane, p: SketchPoint2D): Point3D {
    const b = planeBasis(pl);
    return vAdd(vAdd(b.o, vMul(b.u, p.x)), vMul(b.v, p.y));
  }

  function extrudeSketchProfile() {
    const pl = planes[sketchPlaneIdx];
    if (!pl || sketchPts2D.length < 2) return;
    const b = planeBasis(pl);
    const dist = Number(extrudeDistance) || 0;
    const dir = vMul(vUnit(b.n), extrudeFlip ? -dist : dist);
    setLastAction('extrudeSketch');
    pushUndo();
    const baseIdx = sketchPts2D.map((p) => {
      points = [...points, sketchTo3D(pl, p)];
      return points.length - 1;
    });
    const topIdx = baseIdx.map((bi) => {
      points = [...points, vAdd(points[bi], dir)];
      return points.length - 1;
    });
    for (let i = 0; i < baseIdx.length - 1; i++) {
      const a = baseIdx[i], b0 = baseIdx[i + 1], c = topIdx[i + 1], d = topIdx[i];
      surfaces = [...surfaces, { name: `Surface ${surfaces.length + 1}`, pts: [a, b0, c, d] }];
      if (!edgeExists(edges, a, b0)) edges = [...edges, [a, b0]];
      if (!edgeExists(edges, b0, c)) edges = [...edges, [b0, c]];
      if (!edgeExists(edges, c, d)) edges = [...edges, [c, d]];
      if (!edgeExists(edges, d, a)) edges = [...edges, [d, a]];
    }
  }

  function offsetSurfaceCreate() {
    const s = surfaces[offsetSurfaceIdx];
    if (!s) return;
    const n = surfaceNormal(s);
    const dist = Number(offsetSurfaceDist) || 0;
    setLastAction('offsetSurface');
    pushUndo();
    const newIdxMap = new Map<number, number>();
    for (const pi of s.pts) {
      const np = vAdd(points[pi], vMul(n, dist));
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
    const n = surfaceNormal(s);
    const d = (Number(offsetCurveDist) || 0) * (offsetCurveFlip ? -1 : 1);
    setLastAction('offsetCurveOnSurface');
    pushUndo();
    const newPts: number[] = [];
    for (let i = 0; i < c.pts.length; i++) {
      const cur = points[c.pts[i]];
      const prev = points[c.pts[Math.max(0, i - 1)]];
      const next = points[c.pts[Math.min(c.pts.length - 1, i + 1)]];
      const tan = vUnit(vecSub(next, prev));
      const side = vUnit(vCross(n, tan));
      points = [...points, vAdd(cur, vMul(side, d))];
      newPts.push(points.length - 1);
    }
    curves = [...curves, { name: `Curve ${curves.length + 1}`, pts: newPts }];
    rebuildLoftSegments();
  }

  function extrusionDirection(pathPts: number[]): Point3D {
    if (extrudeDirMode === 'vector') return vUnit(extrudeVector);
    if (extrudeDirMode === 'curve') {
      if (pathPts.length < 2) return { x: 0, y: 0, z: 1 };
      const t = vUnit(vecSub(points[pathPts[pathPts.length - 1]], points[pathPts[0]]));
      return t;
    }
    const s = surfaces[extrudeSurfaceIdx];
    return s ? surfaceNormal(s) : { x: 0, y: 0, z: 1 };
  }

  function extrudeLineOrCurve() {
    const pathPts =
      extrudeTarget === 'line'
        ? (edges[extrudeLineIdx] ? [edges[extrudeLineIdx][0], edges[extrudeLineIdx][1]] : [])
        : (curves[extrudeCurveIdx]?.pts ?? []);
    if (pathPts.length < 2) return;
    let dir = extrusionDirection(pathPts);
    if (extrudeFlip) dir = vMul(dir, -1);
    const dist = Number(extrudeDistance) || 0;
    setLastAction('extrudePath');
    pushUndo();
    const topIdx = pathPts.map((pi) => {
      points = [...points, vAdd(points[pi], vMul(dir, dist))];
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
    creatorPick = null;
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

  function handlePointClick(i: number, ev?: MouseEvent) {
    if (datumPick) {
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
      return;
    }

    if (creatorPick) {
      let created = false;
      if (creatorPick.kind === 'line') {
        if (creatorPick.slot === 'A') {
          createLineA = i;
          creatorPick = { kind: 'line', slot: 'B' };
        } else {
          createLineB = i;
          creatorPick = null;
          created = createLineFromPair(createLineA, createLineB);
        }
      } else {
        if (!surfaceDraft.includes(i)) surfaceDraft = [...surfaceDraft, i];
        const req = surfaceCreateKind === 'triangle' ? 3 : surfaceCreateKind === 'quad' ? 4 : Number.POSITIVE_INFINITY;
        if (surfaceDraft.length >= req) {
          created = createSurfaceFromIndices(surfaceDraft);
          surfaceDraft = [];
          creatorPick = null;
        } else {
          creatorPick = { kind: 'surface', slot: surfaceDraft.length };
        }
      }
      if (!created) selectedEntity = { kind: 'point', index: i };
      return;
    }

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
    if (curveMode && activeCurveIdx != null) {
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

  function onEdgeClick(idx: number, ev?: MouseEvent) {
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

  function onSurfaceClick(idx: number) {
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
    let best: { idx: number; d: number } | null = null;
    for (let i = 0; i < projected.length; i++) {
      const p = projected[i];
      const d = Math.hypot(p.x - mx, p.y - my);
      if (!best || d < best.d) best = { idx: i, d };
    }
    if (!best || best.d > 22) return null;
    return best.idx;
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

  function updateProbeFromEvent(e: MouseEvent) {
    if (!probeOn || !svgEl) return;
    const rect = svgEl.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const idx = nearestPoint(mx, my);
    if (idx == null) {
      probe = null;
      return;
    }
    const angleDeg = estimateTaperAngleAtPoint(idx);
    probe = { x: projected[idx].x, y: projected[idx].y, angleDeg, ok: angleDeg <= maxTaperDeg };
  }

  async function calcOffsetIntersection() {
    if (selEdgeA == null || selEdgeB == null) return;
    const ea = edges[selEdgeA];
    const eb = edges[selEdgeB];
    if (!ea || !eb) return;
    const [a0, a1] = ea;
    const [b0, b1] = eb;
    const ref = points[clamp(refPointIdx, 0, points.length - 1)];
    const res = await calcOffsetIntersectionApi({
      p1A: points[a0],
      p1B: points[a1],
      p2A: points[b0],
      p2B: points[b1],
      offsetDist: Number(offsetDist),
      directionRef: ref
    });
    const skewVal = (res?.skewDistance ?? res?.skew_distance ?? res?.skew ?? null);
    intersection = { p: res.point, skew: (typeof skewVal === 'number' ? skewVal : Number(skewVal)) };
  }

  // CSV format: Type,P/L in col0; for P: x,y,z; for L: i0,i1
  async function importCSV(file: File) {
    const text = await file.text();
    const rows = text
      .split(/\r?\n/)
      .map((r) => r.trim())
      .filter((r) => r && !r.startsWith('#'));

    const pts: Point3D[] = [];
    const eds: Edge[] = [];
    for (const row of rows) {
      const cols = row.split(',').map((s) => s.trim());
      if (cols.length < 2) continue;
      const t = cols[0].toUpperCase();
      if (t === 'P') {
        if (cols.length < 4) continue;
        const x = Number(cols[1]);
        const y = Number(cols[2]);
        const z = Number(cols[3]);
        if ([x, y, z].some((v) => !Number.isFinite(v))) continue;
        pts.push({ x, y, z });
      } else if (t === 'L') {
        if (cols.length < 3) continue;
        const a = Number(cols[1]);
        const b = Number(cols[2]);
        if (!Number.isInteger(a) || !Number.isInteger(b)) continue;
        eds.push([a, b]);
      }
    }
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
  }

  // File menu notice text (shown inside the dropdown)
  let fileNotice = $state<string | null>(null);

  async function importSTEP(file: File) {
    setLastAction('fileLoadSTEP');
    const stepText = await file.text();
    // Keep this conservative to avoid UI lockups; can be made user-configurable later.
    const maxPoints = 200_000;
    // Parse connectivity (POLYLINE/LINE) in JS so we can render wire edges.
    // We still call the backend importer (when available) for robustness, but
    // edges require STEP entity-id mapping which we derive from the text.
    const parsed = parseStepPointsAndEdges(stepText, maxPoints);

    // Prefer backend points if it returns more than our JS parse (some exporters omit ids we understand).
    let backendPts: any = null;
    try {
      backendPts = await importStepText({ stepText, maxPoints });
    } catch {
      backendPts = null;
    }

    const pts = (backendPts?.points ?? backendPts?.pts ?? backendPts) as any;
    let norm: Point3D[] = parsed.points as any;
    if (Array.isArray(pts) && pts.length) {
      const b = pts
        .map((p: any) => ({ x: Number(p.x), y: Number(p.y), z: Number(p.z) }))
        .filter((p: any) => [p.x, p.y, p.z].every((v: any) => Number.isFinite(v)));
      if (b.length > norm.length) norm = b;
    }

    if (!norm.length) throw new Error('STEP import returned no points');

    points = norm;
    // If we used backend points (no id mapping), edges may not align. Only apply edges when counts match.
    edges = norm.length === parsed.points.length ? (parsed.edges as any) : [];
    surfaces = [];
    planes = [];
    csys = [csys[0] ?? { name: 'Global', origin: { x: 0, y: 0, z: 0 }, xAxis: { x: 1, y: 0, z: 0 }, yAxis: { x: 0, y: 1, z: 0 }, zAxis: { x: 0, y: 0, z: 1 } }];
    if (parsed.warnings?.length) fileNotice = parsed.warnings.join(' ');
    pendingPointIdx = null;
    activeEdgeIdx = edges.length ? 0 : null;
    selEdgeA = edges.length ? 0 : null;
    selEdgeB = edges.length > 1 ? 1 : null;
    intersection = null;
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
    const lines: string[] = [];
    lines.push('# Type,V1,V2,V3');
    for (const p of points) lines.push(`P,${p.x},${p.y},${p.z}`);
    for (const [a, b] of edges) lines.push(`L,${a},${b}`);
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `surface_mesh_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  onMount(() => {
    // Dev-only global error logger with last-action tagging.
    // Helps pinpoint "which click" triggered an exception.
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      const w = window as any;
      if (!w.__scSurfaceErrLoggerPatched) {
        w.__scSurfaceErrLoggerPatched = true;

        const safeLog = (...args: any[]) => {
          try {
            // eslint-disable-next-line no-console
            console.error(...args);
          } catch {
            /* no-op */
          }
        };

        window.addEventListener('error', (ev: ErrorEvent) => {
          safeLog(
            '[SC][SurfaceToolbox][error]',
            { file: ev.filename, line: ev.lineno, col: ev.colno },
            'lastAction=', lastAction
          );
          if (ev.error?.stack) safeLog(ev.error.stack);
        });

        window.addEventListener('unhandledrejection', (ev: PromiseRejectionEvent) => {
          const r: any = (ev as any).reason;
          safeLog('[SC][SurfaceToolbox][unhandledrejection]', 'lastAction=', lastAction);
          if (r?.stack) safeLog(r.stack);
          else safeLog(r);
        });
      }
    }
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      } else if (key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);



    // Viewport sizing: use ResizeObserver.contentRect, rAF-throttled, and only commit when changed
    let roRAF = 0;
    const ro = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (!entry) return;
    const cr = entry.contentRect;
    // Ignore transient zero/near-zero layout passes that collapse the viewport to min clamp.
    if (cr.width < 32 || cr.height < 32) return;

    const nextW = Math.max(320, Math.floor(cr.width));
    const nextH = Math.max(240, Math.floor(cr.height));

    if (roRAF) cancelAnimationFrame(roRAF);
    roRAF = requestAnimationFrame(() => {
    if (nextW !== w) w = nextW;
    if (nextH !== h) h = nextH;
    });
    });

    if (viewportEl) ro.observe(viewportEl);

    if (!svgEl) return;

    const svg = d3.select(svgEl);
    svgSelection = svg;

    // Zoom / pan: wheel+drag (hold Shift to pan-drag; drag otherwise rotates)
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 12])
      .filter((event: any) => {
        if (selectionMode !== 'none') return false;
        if (event.type === 'wheel') return true;
        if (event.type === 'touchstart') return true;
        if (event.type === 'mousedown') return !!event.shiftKey;
        return true;
      })
      .on('zoom', (event) => {
        const src = event.sourceEvent as WheelEvent | MouseEvent | null;
        // Use d3's transform for pan/zoom; keep rotation separate.
        zoomK = event.transform.k;
        pan = { x: event.transform.x, y: event.transform.y };
        // Prevent the page from scrolling when wheel zooming.
        if (src && 'preventDefault' in src) (src as any).preventDefault?.();
      });

    zoomBehavior = zoom;
    svg.call(zoom as any);
    syncD3ZoomTransform(zoomK, pan.x, pan.y);

    const drag = d3
      .drag<SVGSVGElement, unknown>()
      .filter((event: any) => {
        if (selectionMode !== 'none') return false;
        if (event.type === 'mousedown') return !event.shiftKey;
        return true;
      })
      .on('start', (event) => {
        const src = event.sourceEvent as MouseEvent | null;
        if (!src || !svgEl) return;
        const rect = svgEl.getBoundingClientRect();
        const mx = src.clientX - rect.left;
        const my = src.clientY - rect.top;
        rotateAnchor = { mx, my, pivot: pickOrbitPivot(mx, my) };
      })
      .on('drag', (event) => {
        const src = event.sourceEvent as MouseEvent | null;
        if (src?.shiftKey) return;
        rot = { alpha: rot.alpha + event.dx * 0.01, beta: rot.beta + event.dy * 0.01 };
        if (rotateAnchor) {
          const r = rotateForView(rotateAnchor.pivot, rot);
          pan = { x: rotateAnchor.mx - (r.x * zoomK + w / 2), y: rotateAnchor.my - (r.y * zoomK + h / 2) };
          syncD3ZoomTransform(zoomK, pan.x, pan.y);
        }
      })
      .on('end', () => {
        rotateAnchor = null;
      });
    svg.call(drag as any);

    return () => {
      window.removeEventListener('keydown', onKey);
      ro.disconnect();
      if (roRAF) cancelAnimationFrame(roRAF);
      svgSelection = null;
      zoomBehavior = null;
    };
  });
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <div class="text-sm font-semibold">3D Surface Evaluation & Lofting</div>
      <div class="text-[11px] text-white/50">
        D3 wireframe • click two points to add dotted edges • drag to rotate • wheel to zoom • hold Shift for pan
      </div>
    </div>

    <div class="flex items-center gap-2" bind:this={actionsBarEl}>
      <div class="glass-panel rounded-xl px-3 py-2 flex items-center gap-3">
        <div class="text-[11px] text-white/60 uppercase tracking-widest">Probe</div>
        <button
          class={probeOn
            ? 'px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs'
            : 'px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 text-xs'}
          onclick={() => {
            probeOn = !probeOn;
            probe = null;
          }}
          title="Toggle fastener Go/No-Go overlay"
        >
          {probeOn ? 'On' : 'Off'}
        </button>
        {#if probeOn}
          <div class="flex items-center gap-2 border-l border-white/10 pl-3">
            <div class="text-[10px] text-white/50">Max</div>
            <input
              type="number"
              min="0"
              step="0.5"
              class="input input-sm w-16 bg-black/20 border border-white/10"
              bind:value={maxTaperDeg}
              title="Max taper angle (deg)"
            />
            <div class="text-[10px] text-white/50">°</div>
          </div>
        {/if}
      </div>

      <SurfaceSelectionControls
        selectionMode={selectionMode}
        curveMode={curveMode}
        selectedCount={selectedPointIds.length}
        setSelectionMode={setSelectionMode}
        clearSelection={clearSelection}
        invertSelection={invertSelection}
      />

      <SurfaceFileMenu
        onLoadFile={handleLoadedFile}
        onExportCSV={exportCSV}
        onExportSTEP={exportSTEP}
        onOpenDatums={openDatumsModal}
        onOpenDrafting={() => (draftingModalOpen = true)}
        onOpenCreateGeometry={() => (createGeometryModalOpen = true)}
        onOpenSurfaceCurveOps={() => (surfaceCurveOpsModalOpen = true)}
        onOpenExtrude={() => (extrudeModalOpen = true)}
        onOpenHealing={() => (healingModalOpen = true)}
        onOpenSettings={() => (settingsOpen = true)}
        canExportSTEP={false}
        bind:fileNotice
      />

      <div class="glass-panel rounded-xl px-2 py-2 flex items-center gap-2">
        <button class="btn btn-sm variant-soft" onclick={undo} disabled={undoStack.length === 0} title="Undo (Ctrl/Cmd+Z)">Undo</button>
        <button class="btn btn-sm variant-soft" onclick={redo} disabled={redoStack.length === 0} title="Redo (Ctrl/Cmd+Shift+Z)">Redo</button>
      </div>

    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
    <div class="glass-panel rounded-2xl p-3 overflow-hidden">
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
        {onSvgPointerDown}
        {onSvgPointerMove}
        {onSvgPointerUp}
        {sortedSurfaces}
        {sortedEdges}
        {datumPlanePatches}
        {datumAxisSegments}
        {projected}
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

    <aside class="glass-panel rounded-2xl p-5 space-y-5">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-xs font-semibold uppercase tracking-widest text-white/60">Geometry</div>
          <div class="text-[11px] text-white/40">Points: {points.length} • Edges: {edges.length} • Surfaces: {surfaces.length}</div>
        </div>
	        <button
	          class="btn btn-sm variant-soft"
	          onclick={() => {
            pendingPointIdx = null;
            intersection = null;
          }}
        >
          Clear picks
        </button>
      </div>

      <div class="rounded-2xl border border-white/10 bg-white/5 p-4 text-[11px] text-white/55">
        Modeling tools were moved to `File -> Modeling`.
      </div>

      <CurveEdgesLoftPanel
        {edges}
        {activeEdgeIdx}
        setActiveEdgeIdx={(i) => (activeEdgeIdx = i)}
        {deleteEdge}
        {curves}
        {activeCurveIdx}
        setActiveCurveIdx={(i) => (activeCurveIdx = i)}
        {deleteCurve}
        {createCurve}
        {curveMode}
        toggleCurveMode={() => {
          curveMode = !curveMode;
          if (curveMode) {
            selectionMode = 'none';
            createMode = 'idle';
            pendingPointIdx = null;
          }
        }}
        {loftA}
        {loftB}
        setLoftA={(v) => (loftA = v)}
        setLoftB={(v) => (loftB = v)}
        {rebuildLoftSegments}
        loftSegmentsCount={loftSegments.length}
        {loftErr}
      />

      <SurfaceSamplerPanel
        bind:samplerAppend
        bind:samplerMode
        bind:samplerNu
        bind:samplerNv
        bind:samplerEdgeSegs
        bind:samplerErr
        onGenerate={generateSamplerPoints}
      />

      <SurfaceFitPanel
        bind:evalUseSelection
        bind:heatmapOn
        bind:evalTol
        bind:evalSigmaMult
        {computeSurfaceEval}
        {evalBusy}
        {evalErr}
        {evalRes}
        bind:pendingPointIdx
        bind:cylUseSelection
        bind:cylShowAxis
        {computeCylinderFit}
        {cylBusy}
        {cylErr}
        {cylRes}
        bind:cylRefineK
        {cylSelectOutliers}
        {cylKeepInliers}
        {cylRemoveOutliers}
        {cylThresholdAbs}
        activeFitPointIds={currentActiveFitPointIds}
        {selectedPointIds}
        {cylFitPointIds}
        bind:sliceAxis
        bind:sliceBins
        bind:sliceThickness
        bind:sliceMetric
        {computeSectionSlices}
        {sliceBusy}
        {sliceErr}
        {sliceRes}
        pointsCount={points.length}
      />

      <SurfaceInterpolationPanel bind:interpPct {interpPoint} />

      <SurfaceOffsetIntersectionPanel
        {edges}
        {points}
        bind:selEdgeA
        bind:selEdgeB
        bind:offsetDist
        bind:refPointIdx
        {intersection}
        {calcOffsetIntersection}
      />
    </aside>
  </div>

  {#if datumsModalOpen}
    <div class="fixed inset-0 z-[300] pointer-events-none">
      <div
        class="absolute pointer-events-auto w-[760px] max-w-[95vw] rounded-2xl border border-white/15 bg-slate-950/95 shadow-2xl p-4 space-y-4"
        style={`left:${datumsModalPos.x}px; top:${datumsModalPos.y}px;`}
        bind:this={datumsModalPanelEl}
      >
        <div
          class="flex items-center justify-between cursor-move"
          role="button"
          tabindex="0"
          onpointerdown={startDatumsModalDrag}
          onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.preventDefault(); }}
        >
          <div class="text-sm font-semibold tracking-wide text-white/90">Datums (CSYS & Planes)</div>
          <button class="btn btn-xs variant-soft" onclick={() => { datumsModalOpen = false; datumPick = null; }}>Close</button>
        </div>
        <div class="text-[11px] rounded-lg border border-white/10 bg-black/20 px-2 py-1 font-mono text-white/65">{datumPickHint}</div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div class="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
            <div class="text-[11px] text-white/50 uppercase tracking-widest">Create CSYS</div>
            <select class="select select-xs glass-input w-full" bind:value={csysCreateMode}>
              <option value="global">Global</option>
              <option value="three_points">3 Points</option>
              <option value="point_line">Point + Line</option>
              <option value="copy">Copy Existing</option>
            </select>
            {#if csysCreateMode === 'three_points'}
              <div class="grid grid-cols-3 gap-1 text-[10px]">
                <button class={datumPick?.target === 'csys3' && datumPick.slot === 'origin' ? 'btn btn-xs variant-soft' : 'btn btn-xs variant-soft opacity-80'} onclick={() => armDatumPick('csys3', 'origin')}>Origin ({`P${csysOriginPoint + 1}`})</button>
                <button class={datumPick?.target === 'csys3' && datumPick.slot === 'x' ? 'btn btn-xs variant-soft' : 'btn btn-xs variant-soft opacity-80'} onclick={() => armDatumPick('csys3', 'x')}>X Ref ({`P${csysXPoint + 1}`})</button>
                <button class={datumPick?.target === 'csys3' && datumPick.slot === 'y' ? 'btn btn-xs variant-soft' : 'btn btn-xs variant-soft opacity-80'} onclick={() => armDatumPick('csys3', 'y')}>Y Ref ({`P${csysYPoint + 1}`})</button>
              </div>
            {:else if csysCreateMode === 'point_line'}
              <div class="grid grid-cols-2 gap-1 text-[10px]">
                <button class={datumPick?.target === 'csysPointLine' && datumPick.slot === 'origin' ? 'btn btn-xs variant-soft' : 'btn btn-xs variant-soft opacity-80'} onclick={() => armDatumPick('csysPointLine', 'origin')}>Origin ({`P${csysOriginPoint + 1}`})</button>
                <button class={datumPick?.target === 'csysPointLine' && datumPick.slot === 'line' ? 'btn btn-xs variant-soft' : 'btn btn-xs variant-soft opacity-80'} onclick={() => armDatumPick('csysPointLine', 'line')}>Line ({`L${csysFromLine + 1}`})</button>
              </div>
            {:else if csysCreateMode === 'copy'}
              <input class="input input-xs glass-input w-full" type="number" min="0" bind:value={csysCopyIdx} title="Source CSYS index" />
            {/if}
            <button class="btn btn-xs variant-soft w-full" onclick={addDatumCsys}>+ Add CSYS</button>
          </div>
          <div class="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
            <div class="text-[11px] text-white/50 uppercase tracking-widest">Create Plane</div>
            <select class="select select-xs glass-input w-full" bind:value={planeCreateMode}>
              <option value="three_points">3 Points</option>
              <option value="point_normal">Point + Normal</option>
              <option value="offset_surface">Offset Surface</option>
              <option value="two_lines">2 Lines</option>
              <option value="point_direction">Point + Direction</option>
              <option value="csys_principal">CSYS Principal</option>
            </select>
            {#if planeCreateMode === 'three_points'}
              <div class="grid grid-cols-3 gap-1 text-[10px]">
                <input class="input input-xs glass-input" type="number" min="0" bind:value={planeP0} />
                <input class="input input-xs glass-input" type="number" min="0" bind:value={planeP1} />
                <input class="input input-xs glass-input" type="number" min="0" bind:value={planeP2} />
              </div>
            {:else if planeCreateMode === 'point_normal'}
              <div class="grid grid-cols-4 gap-1 text-[10px]">
                <input class="input input-xs glass-input" type="number" min="0" bind:value={planeP0} />
                <input class="input input-xs glass-input" type="number" step="0.1" bind:value={planeNormalVec.x} />
                <input class="input input-xs glass-input" type="number" step="0.1" bind:value={planeNormalVec.y} />
                <input class="input input-xs glass-input" type="number" step="0.1" bind:value={planeNormalVec.z} />
              </div>
            {:else if planeCreateMode === 'offset_surface'}
              <div class="grid grid-cols-2 gap-1 text-[10px]">
                <input class="input input-xs glass-input" type="number" min="0" bind:value={planeOffsetSurface} />
                <input class="input input-xs glass-input" type="number" step="0.1" bind:value={planeOffsetDist} />
              </div>
            {:else if planeCreateMode === 'two_lines'}
              <div class="grid grid-cols-2 gap-1 text-[10px]">
                <input class="input input-xs glass-input" type="number" min="0" bind:value={planeLineA} />
                <input class="input input-xs glass-input" type="number" min="0" bind:value={planeLineB} />
              </div>
            {:else if planeCreateMode === 'point_direction'}
              <div class="grid grid-cols-4 gap-1 text-[10px]">
                <input class="input input-xs glass-input" type="number" min="0" bind:value={planeDirPoint} />
                <input class="input input-xs glass-input" type="number" step="0.1" bind:value={planeDirVec.x} />
                <input class="input input-xs glass-input" type="number" step="0.1" bind:value={planeDirVec.y} />
                <input class="input input-xs glass-input" type="number" step="0.1" bind:value={planeDirVec.z} />
              </div>
            {:else}
              <div class="grid grid-cols-2 gap-1 text-[10px]">
                <input class="input input-xs glass-input" type="number" min="0" bind:value={planeCsysIdx} />
                <select class="select select-xs glass-input" bind:value={planePrincipal}>
                  <option value="XY">XY</option>
                  <option value="YZ">YZ</option>
                  <option value="ZX">ZX</option>
                </select>
              </div>
            {/if}
            <button class="btn btn-xs variant-soft w-full" onclick={addDatumPlane}>+ Add Plane</button>
          </div>
        </div>
        <div class="max-h-28 overflow-auto custom-scrollbar pr-1 text-[11px] text-white/60 rounded-xl border border-white/10 bg-black/20 p-2">
          {#if csys.length > 0}<div>CSYS: {csys.map((c, i) => `CS${i + 1}:${c.name}`).join(' • ')}</div>{/if}
          {#if planes.length > 0}<div>Planes: {planes.map((p, i) => `PL${i + 1}:${p.name}`).join(' • ')}</div>{/if}
        </div>
      </div>
    </div>
  {/if}

  {#if draftingModalOpen}
    <div
      class="fixed inset-0 z-[300] flex items-center justify-center bg-black/55 backdrop-blur-[1px]"
      role="button"
      tabindex="0"
      onpointerdown={(e) => { if (e.target === e.currentTarget) draftingModalOpen = false; }}
      onkeydown={(e) => { if (e.key === 'Escape') draftingModalOpen = false; }}
    >
      <div class="w-[760px] max-w-[95vw] rounded-2xl border border-white/15 bg-slate-950/95 shadow-2xl p-4 space-y-4" bind:this={draftingModalPanelEl}>
        <div class="flex items-center justify-between">
          <div class="text-sm font-semibold tracking-wide text-white/90">2D Drafting (Constrained Profiles)</div>
          <button class="btn btn-xs variant-soft" onclick={() => (draftingModalOpen = false)}>Close</button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div class="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
            <div class="text-[11px] text-white/50 uppercase tracking-widest">Sketch Plane</div>
            <input class="input input-xs glass-input w-full" type="number" min="0" bind:value={sketchPlaneIdx} />
            <div class="grid grid-cols-2 gap-2">
              <input class="input input-xs glass-input" type="number" step="0.1" bind:value={sketchDraftX} placeholder="X" />
              <input class="input input-xs glass-input" type="number" step="0.1" bind:value={sketchDraftY} placeholder="Y" />
            </div>
            <button class="btn btn-xs variant-soft w-full" onclick={addSketchPoint}>+ Add Sketch Point</button>
            <div class="text-[11px] text-white/45">Use point index buttons below to create profile edges.</div>
            <div class="flex flex-wrap gap-1">
              {#each sketchPts2D as p, i (i)}
                <button class={sketchPendingIdx === i ? 'btn btn-xs variant-soft' : 'btn btn-xs variant-soft opacity-80'} onclick={() => addSketchLineFromPoint(i)}>SP{i + 1}</button>
              {/each}
            </div>
          </div>
          <div class="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
            <div class="text-[11px] text-white/50 uppercase tracking-widest">Constraints</div>
            <div class="flex items-center gap-2">
              <button class="btn btn-xs variant-soft" onclick={() => addSketchConstraint('horizontal')}>Horizontal</button>
              <button class="btn btn-xs variant-soft" onclick={() => addSketchConstraint('vertical')}>Vertical</button>
              <button class="btn btn-xs variant-soft" onclick={() => addSketchConstraint('length')}>Length</button>
            </div>
            <div class="text-[11px] text-white/60">Edges: {sketchEdges2D.length} • Constraints: {sketchConstraints.length}</div>
            <div class="max-h-24 overflow-auto custom-scrollbar rounded-lg border border-white/10 bg-black/20 p-2 text-[11px] font-mono text-white/70">
              {#each sketchEdges2D as e, i (i)}
                <div>E{i + 1}: SP{e[0] + 1} -> SP{e[1] + 1}</div>
              {/each}
            </div>
            <button class="btn btn-xs variant-soft w-full" onclick={extrudeSketchProfile} disabled={planes.length === 0 || sketchPts2D.length < 2}>Send to 3D (Extrude)</button>
          </div>
        </div>
      </div>
    </div>
  {/if}

  {#if createGeometryModalOpen}
    <div
      class="fixed inset-0 z-[300] flex items-center justify-center bg-black/55 backdrop-blur-[1px]"
      role="button"
      tabindex="0"
      onpointerdown={(e) => { if (e.target === e.currentTarget) createGeometryModalOpen = false; }}
      onkeydown={(e) => { if (e.key === 'Escape') createGeometryModalOpen = false; }}
    >
      <div class="w-[620px] max-w-[94vw] rounded-2xl border border-white/15 bg-slate-950/95 shadow-2xl p-4 space-y-4" bind:this={createGeomModalPanelEl}>
        <div class="flex items-center justify-between">
          <div class="text-sm font-semibold tracking-wide text-white/90">Create Geometry</div>
          <button class="btn btn-xs variant-soft" onclick={() => (createGeometryModalOpen = false)}>Close</button>
        </div>
        <div class="text-[11px] text-white/45">{creatorHint}</div>
        <div class="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
          <div class="text-[11px] text-white/50 uppercase tracking-widest">Point</div>
          <div class="grid grid-cols-3 gap-2">
            <input type="number" step="0.1" class="input input-sm glass-input" bind:value={createPtX} placeholder="X" />
            <input type="number" step="0.1" class="input input-sm glass-input" bind:value={createPtY} placeholder="Y" />
            <input type="number" step="0.1" class="input input-sm glass-input" bind:value={createPtZ} placeholder="Z" />
          </div>
          <button class="btn btn-sm variant-soft w-full" onclick={addPoint}>+ Add point</button>
        </div>
        <div class="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
          <div class="text-[11px] text-white/50 uppercase tracking-widest">Line</div>
          <div class="grid grid-cols-2 gap-2">
            <button class={creatorPick?.kind === 'line' && creatorPick.slot === 'A' ? 'btn btn-xs variant-soft' : 'btn btn-xs variant-soft opacity-70'} onclick={() => beginLinePick('A')}>Pick A ({createLineA == null ? '-' : `P${createLineA + 1}`})</button>
            <button class={creatorPick?.kind === 'line' && creatorPick.slot === 'B' ? 'btn btn-xs variant-soft' : 'btn btn-xs variant-soft opacity-70'} onclick={() => beginLinePick('B')}>Pick B ({createLineB == null ? '-' : `P${createLineB + 1}`})</button>
          </div>
        </div>
        <div class="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
          <div class="flex items-center justify-between">
            <div class="text-[11px] text-white/50 uppercase tracking-widest">Surface</div>
            <select class="select select-xs glass-input w-28" bind:value={surfaceCreateKind}>
              <option value="triangle">Triangle</option>
              <option value="quad">Quad</option>
              <option value="contour">Contour</option>
            </select>
          </div>
          <div class="flex items-center gap-2">
            <button class={creatorPick?.kind === 'surface' ? 'btn btn-xs variant-soft' : 'btn btn-xs variant-soft opacity-70'} onclick={() => beginSurfacePick(surfaceDraft.length)}>Pick sequence</button>
            <button class="btn btn-xs variant-soft opacity-80" onclick={() => { surfaceDraft = []; creatorPick = null; }}>Reset</button>
            <button class="btn btn-xs variant-soft opacity-80" disabled={surfaceCreateKind !== 'contour' || surfaceDraft.length < 3} onclick={finishContourSurface}>Finish contour</button>
          </div>
          <div class="text-[11px] font-mono text-white/65">Draft: {surfaceDraft.length === 0 ? 'none' : surfaceDraft.map((p) => `P${p + 1}`).join(' -> ')}</div>
        </div>
      </div>
    </div>
  {/if}

  {#if surfaceCurveOpsModalOpen}
    <div
      class="fixed inset-0 z-[300] flex items-center justify-center bg-black/55 backdrop-blur-[1px]"
      role="button"
      tabindex="0"
      onpointerdown={(e) => { if (e.target === e.currentTarget) surfaceCurveOpsModalOpen = false; }}
      onkeydown={(e) => { if (e.key === 'Escape') surfaceCurveOpsModalOpen = false; }}
    >
      <div class="w-[620px] max-w-[94vw] rounded-2xl border border-white/15 bg-slate-950/95 shadow-2xl p-4 space-y-4" bind:this={surfCurveModalPanelEl}>
        <div class="flex items-center justify-between">
          <div class="text-sm font-semibold tracking-wide text-white/90">Surface / Curve Operations</div>
          <button class="btn btn-xs variant-soft" onclick={() => (surfaceCurveOpsModalOpen = false)}>Close</button>
        </div>
        <div class="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
          <div class="text-[11px] text-white/50 uppercase tracking-widest">Selected Line Actions</div>
          <div class="text-[11px] text-white/45">{selectedEntity?.kind === 'line' ? `L${selectedEntity.index + 1}` : 'No line selected'}</div>
          <div class="grid grid-cols-[1fr_auto] gap-2 items-center">
            <input type="range" min="0" max="1" step="0.01" bind:value={lineInsertT} />
            <div class="text-[11px] font-mono text-white/70">{(lineInsertT * 100).toFixed(0)}%</div>
          </div>
          <div class="flex items-center gap-2">
            <button class="btn btn-xs variant-soft" disabled={selectedEntity?.kind !== 'line'} onclick={() => selectedEntity?.kind === 'line' && insertPointOnEdge(selectedEntity.index, 0.5)}>Insert midpoint</button>
            <button class="btn btn-xs variant-soft" disabled={selectedEntity?.kind !== 'line'} onclick={() => selectedEntity?.kind === 'line' && insertPointOnEdge(selectedEntity.index, lineInsertT)}>Insert at %</button>
            <button class={lineInsertPickMode ? 'btn btn-xs variant-soft' : 'btn btn-xs variant-soft opacity-70'} onclick={() => (lineInsertPickMode = !lineInsertPickMode)}>Insert from click</button>
          </div>
        </div>
        <div class="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
          <div class="text-[11px] text-white/50 uppercase tracking-widest">Offset Surface</div>
          <div class="grid grid-cols-2 gap-2">
            <input class="input input-xs glass-input" type="number" min="0" bind:value={offsetSurfaceIdx} title="Surface index" />
            <input class="input input-xs glass-input" type="number" step="0.1" bind:value={offsetSurfaceDist} title="Offset distance" />
          </div>
          <button class="btn btn-xs variant-soft w-full" onclick={offsetSurfaceCreate}>Create Offset Surface</button>
        </div>
        <div class="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
          <div class="text-[11px] text-white/50 uppercase tracking-widest">Offset Curve On Surface</div>
          <div class="grid grid-cols-3 gap-2">
            <input class="input input-xs glass-input" type="number" min="0" bind:value={offsetCurveIdx} title="Curve index" />
            <input class="input input-xs glass-input" type="number" min="0" bind:value={offsetCurveSurfaceIdx} title="Surface index" />
            <input class="input input-xs glass-input" type="number" step="0.1" bind:value={offsetCurveDist} title="Offset distance" />
          </div>
          <label class="flex items-center justify-between text-[11px] text-white/60"><span>Flip</span><input type="checkbox" class="checkbox checkbox-xs" bind:checked={offsetCurveFlip} /></label>
          <button class="btn btn-xs variant-soft w-full" onclick={offsetCurveOnSurfaceCreate}>Create Offset Curve</button>
        </div>
      </div>
    </div>
  {/if}

  {#if extrudeModalOpen}
    <div
      class="fixed inset-0 z-[300] flex items-center justify-center bg-black/55 backdrop-blur-[1px]"
      role="button"
      tabindex="0"
      onpointerdown={(e) => { if (e.target === e.currentTarget) extrudeModalOpen = false; }}
      onkeydown={(e) => { if (e.key === 'Escape') extrudeModalOpen = false; }}
    >
      <div class="w-[560px] max-w-[92vw] rounded-2xl border border-white/15 bg-slate-950/95 shadow-2xl p-4 space-y-4" bind:this={extrudeModalPanelEl}>
        <div class="flex items-center justify-between">
          <div class="text-sm font-semibold tracking-wide text-white/90">Extrude</div>
          <button class="btn btn-xs variant-soft" onclick={() => (extrudeModalOpen = false)}>Close</button>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <select class="select select-xs glass-input" bind:value={extrudeTarget}>
            <option value="line">Line</option>
            <option value="curve">Curve</option>
          </select>
          {#if extrudeTarget === 'line'}
            <input class="input input-xs glass-input" type="number" min="0" bind:value={extrudeLineIdx} title="Line index" />
          {:else}
            <input class="input input-xs glass-input" type="number" min="0" bind:value={extrudeCurveIdx} title="Curve index" />
          {/if}
        </div>
        <div class="grid grid-cols-2 gap-2">
          <select class="select select-xs glass-input" bind:value={extrudeDirMode}>
            <option value="vector">Vector</option>
            <option value="curve">Along Curve</option>
            <option value="surfaceNormal">Surface Normal</option>
          </select>
          <input class="input input-xs glass-input" type="number" step="0.1" bind:value={extrudeDistance} title="Distance" />
        </div>
        {#if extrudeDirMode === 'vector'}
          <div class="grid grid-cols-3 gap-2">
            <input class="input input-xs glass-input" type="number" step="0.1" bind:value={extrudeVector.x} title="Vx" />
            <input class="input input-xs glass-input" type="number" step="0.1" bind:value={extrudeVector.y} title="Vy" />
            <input class="input input-xs glass-input" type="number" step="0.1" bind:value={extrudeVector.z} title="Vz" />
          </div>
        {:else if extrudeDirMode === 'surfaceNormal'}
          <input class="input input-xs glass-input w-full" type="number" min="0" bind:value={extrudeSurfaceIdx} title="Surface index" />
        {/if}
        <label class="flex items-center justify-between text-[11px] text-white/60"><span>Flip Direction</span><input type="checkbox" class="checkbox checkbox-xs" bind:checked={extrudeFlip} /></label>
        <button class="btn btn-xs variant-soft w-full" onclick={extrudeLineOrCurve}>Extrude Path</button>
        <button class="btn btn-xs variant-soft w-full opacity-85" onclick={extrudeSketchProfile} disabled={planes.length === 0 || sketchPts2D.length < 2}>Extrude Sketch Profile</button>
      </div>
    </div>
  {/if}

  {#if healingModalOpen}
    <div
      class="fixed inset-0 z-[300] flex items-center justify-center bg-black/55 backdrop-blur-[1px]"
      role="button"
      tabindex="0"
      onpointerdown={(e) => { if (e.target === e.currentTarget) healingModalOpen = false; }}
      onkeydown={(e) => { if (e.key === 'Escape') healingModalOpen = false; }}
    >
      <div class="w-[420px] max-w-[92vw] rounded-2xl border border-white/15 bg-slate-950/95 shadow-2xl p-4 space-y-4" bind:this={healingModalPanelEl}>
        <div class="flex items-center justify-between">
          <div class="text-sm font-semibold tracking-wide text-white/90">Topology Healing</div>
          <button class="btn btn-xs variant-soft" onclick={() => (healingModalOpen = false)}>Close</button>
        </div>
        <div class="grid grid-cols-2 gap-2 items-center">
          <div class="text-[11px] text-white/60">Tolerance</div>
          <input class="input input-xs glass-input" type="number" step="0.01" min="0" bind:value={healTol} />
        </div>
        <button class="btn btn-xs variant-soft w-full" onclick={runTopologyHealing}>Run Healing</button>
      </div>
    </div>
  {/if}

  {#if settingsOpen}
    <div
      class="fixed inset-0 z-[300] flex items-center justify-center bg-black/55 backdrop-blur-[1px]"
      role="button"
      tabindex="0"
      onpointerdown={(e) => { if (e.target === e.currentTarget) settingsOpen = false; }}
      onkeydown={(e) => { if (e.key === 'Escape') settingsOpen = false; }}
    >
      <div class="w-[420px] max-w-[92vw] rounded-2xl border border-white/15 bg-slate-950/95 shadow-2xl p-4 space-y-4">
        <div class="flex items-center justify-between">
          <div class="text-sm font-semibold tracking-wide text-white/90">Viewport Settings</div>
          <button class="btn btn-xs variant-soft" onclick={() => (settingsOpen = false)}>Close</button>
        </div>
        <div class="space-y-2">
          <div class="text-[11px] uppercase tracking-widest text-white/45">Labels</div>
          <label class="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
            <span>Show Selection Labels (P/L/S)</span>
            <input type="checkbox" class="checkbox checkbox-sm" bind:checked={showSelectionLabels} />
          </label>
        </div>
        <div class="space-y-2">
          <div class="text-[11px] uppercase tracking-widest text-white/45">Visibility</div>
          <label class="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
            <span>Show Points</span>
            <input type="checkbox" class="checkbox checkbox-sm" bind:checked={showPointEntities} />
          </label>
          <label class="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
            <span>Show Lines</span>
            <input type="checkbox" class="checkbox checkbox-sm" bind:checked={showLineEntities} />
          </label>
          <label class="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
            <span>Show Surfaces</span>
            <input type="checkbox" class="checkbox checkbox-sm" bind:checked={showSurfaceEntities} />
          </label>
          <label class="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
            <span>Show Datums (CSYS/Planes)</span>
            <input type="checkbox" class="checkbox checkbox-sm" bind:checked={showDatumEntities} />
          </label>
        </div>
      </div>
    </div>
  {/if}
</div>
