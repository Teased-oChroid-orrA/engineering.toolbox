import type {
  Point3D,
  Edge,
  Curve,
  SurfaceFace,
  DatumCsys,
  DatumPlane,
  SnapCandidate,
  HoverTooltip,
  IntersectionDiagnostics,
  SurfaceRecipe,
  RecipeRunState,
  RecipeTransaction,
  DatumSliceRunResult,
  SurfaceStatusWarning,
  Snapshot,
  ToolCursorMode,
  DatumSliceMode,
  SelectionMode,
  SelectionProfile
} from './SurfaceOrchestratorDeps';

export interface SurfaceState {
  lastAction: string;
  
  // Geometry
  points: Point3D[];
  edges: Edge[];
  curves: Curve[];
  surfaces: SurfaceFace[];
  csys: DatumCsys[];
  planes: DatumPlane[];
  
  // Point Cloud Sampler
  samplerAppend: boolean;
  samplerMode: 'quad' | 'edges';
  samplerNu: number;
  samplerNv: number;
  samplerEdgeSegs: number;
  samplerErr: string | null;
  
  // Point Selection
  pendingPointIdx: number | null;
  selectionMode: SelectionMode;
  selectionProfile: SelectionProfile;
  toolCursor: ToolCursorMode;
  selectedPointIds: number[];
  snapEndpoints: boolean;
  snapMidpoints: boolean;
  snapCurveNearest: boolean;
  snapSurfaceProjection: boolean;
  snapThresholdPx: number;
  activeSnap: SnapCandidate | null;
  hoverTooltip: HoverTooltip | null;
  hoverRaf: number;
  hoverQueued: { x: number; y: number } | null;
  lastHoverPos: { x: number; y: number };
  lastHoverModeKey: string;
  lastSnapSig: string;
  
  // Active drag selection
  selecting: boolean;
  selStart: { x: number; y: number } | null;
  selRect: { x0: number; y0: number; x1: number; y1: number } | null;
  lasso: { x: number; y: number }[];
  
  // Curves and lofting
  activeCurveIdx: number | null;
  curveMode: boolean;
  loftA: number | null;
  loftB: number | null;
  loftErr: string | null;
  loftSegments: { a: Point3D; b: Point3D }[];
  
  // Undo/Redo
  undoStack: Snapshot[];
  redoStack: Snapshot[];
  
  // Active edge for interpolation
  activeEdgeIdx: number | null;
  interpPct: number;
  
  // In-app geometry creation
  createPtX: number;
  createPtY: number;
  createPtZ: number;
  createLineA: number | null;
  createLineB: number | null;
  surfaceDraft: number[];
  surfaceCreateKind: 'triangle' | 'quad' | 'contour';
  createMode: 'idle' | 'point' | 'line' | 'surface';
  creatorPick: null | { kind: 'line'; slot: 'A' | 'B' } | { kind: 'surface'; slot: number };
  selectedEntity: null | { kind: 'point' | 'line' | 'surface' | 'plane' | 'csys'; index: number };
  
  // UI State
  settingsOpen: boolean;
  coreMode: boolean;
  advancedOpen: boolean;
  rightRailCollapsed: boolean;
  showCoreModePrompt: boolean;
  datumsModalOpen: boolean;
  createGeometryModalOpen: boolean;
  surfaceCurveOpsModalOpen: boolean;
  extrudeModalOpen: boolean;
  healingModalOpen: boolean;
  showPointEntities: boolean;
  showLineEntities: boolean;
  showSurfaceEntities: boolean;
  showDatumEntities: boolean;
  showSelectionLabels: boolean;
  
  // Line insertion
  lineInsertT: number;
  lineInsertPickMode: boolean;
  
  // Datum creation
  csysCreateMode: 'global' | 'three_points' | 'point_line' | 'copy';
  csysOriginPoint: number;
  csysXPoint: number;
  csysYPoint: number;
  csysFromLine: number;
  csysCopyIdx: number;
  planeCreateMode: 'three_points' | 'point_normal' | 'offset_surface' | 'two_lines' | 'point_direction' | 'csys_principal';
  planeP0: number;
  planeP1: number;
  planeP2: number;
  planeNormalVec: Point3D;
  planeOffsetSurface: number;
  planeOffsetDist: number;
  planeLineA: number;
  planeLineB: number;
  planeDirPoint: number;
  planeDirVec: Point3D;
  planeCsysIdx: number;
  planePrincipal: 'XY' | 'YZ' | 'ZX';
  datumPick: null | { target: 'csys3' | 'csysPointLine'; slot: 'origin' | 'x' | 'y' | 'line' };
  datumsModalPos: { x: number; y: number };
  datumsModalDragging: boolean;
  datumsModalDragOffset: { x: number; y: number };
  
  // Offset/Curve operations
  offsetSurfaceIdx: number;
  offsetSurfaceDist: number;
  offsetCurveIdx: number;
  offsetCurveSurfaceIdx: number;
  offsetCurveDist: number;
  offsetCurveFlip: boolean;
  offsetCurveStatus: {
    severity: 'info' | 'warning' | 'error' | null;
    method: 'geodesic' | 'surface_projected' | 'directional_3d' | null;
    message: string | null;
  };
  
  // Extrude
  extrudeTarget: 'line' | 'curve';
  extrudeLineIdx: number;
  extrudeCurveIdx: number;
  extrudeDirMode: 'vector' | 'curve' | 'surfaceNormal';
  extrudeVector: Point3D;
  extrudeSurfaceIdx: number;
  extrudeFlip: boolean;
  extrudeDistance: number;
  
  // Healing
  healTol: number;
  
  // Element refs
  actionsBarEl: HTMLElement | null;
  datumsModalPanelEl: HTMLElement | null;
  createGeomModalPanelEl: HTMLElement | null;
  surfCurveModalPanelEl: HTMLElement | null;
  healingModalPanelEl: HTMLElement | null;
  
  // Two-edge selection for offset/intersection
  selEdgeA: number | null;
  selEdgeB: number | null;
  offsetDist: number;
  refPointIdx: number;
  intersection: { p: Point3D; skew: number } | null;
  intersectionBusy: boolean;
  intersectionDiagnostics: IntersectionDiagnostics;
  
  // View/Camera state
  svgEl: SVGSVGElement | null;
  viewportEl: HTMLDivElement | null;
  vpMenuOpen: boolean;
  vpMenuX: number;
  vpMenuY: number;
  w: number;
  h: number;
  rot: { alpha: number; beta: number };
  zoomK: number;
  pan: { x: number; y: number };
  rotateAnchor: { mx: number; my: number; pivot: Point3D } | null;
  
  // Probe overlay
  probeOn: boolean;
  probeBoltDia: number;
  probe: { x: number; y: number; angleDeg: number; ok: boolean } | null;
  maxTaperDeg: number;
  
  // Surface Evaluation (plane fit)
  evalBusy: boolean;
  evalErr: string | null;
  evalTol: number;
  evalSigmaMult: number;
  evalMaxOutliers: number;
  evalRes: {
    centroid: Point3D;
    normal: Point3D;
    rms: number;
    meanAbs: number;
    maxAbs: number;
    p95Abs: number;
    sigma: number;
    signedDistances: number[];
    outlierIndices: number[];
  } | null;
  heatmapOn: boolean;
  evalUseSelection: boolean;
  
  // Surface Evaluation (section slicing)
  sliceAxis: 'x' | 'y' | 'z';
  sliceBins: number;
  sliceThickness: number;
  sliceMetric: 'p95' | 'rms';
  sliceBusy: boolean;
  sliceErr: string | null;
  sliceRes: {
    axis: 'x' | 'y' | 'z';
    min: number;
    max: number;
    slices: { station: number; n: number; rms: number; p95Abs: number; maxAbs: number }[];
  } | null;
  
  // Datum-plane slicing
  datumSlicePlaneIdx: number;
  datumSliceMode: DatumSliceMode;
  datumSliceSpacing: number;
  datumSliceCount: number;
  datumSliceThickness: number;
  datumSliceUseSelection: boolean;
  includeOptionalSliceColumns: boolean;
  datumSliceBusy: boolean;
  datumSliceErr: string | null;
  datumSliceRes: DatumSliceRunResult | null;
  selectedSliceId: number | null;
  statusWarnings: SurfaceStatusWarning[];
  
  // Workspace recipes
  recipes: SurfaceRecipe[];
  selectedRecipeId: string | null;
  recipeNameDraft: string;
  recipeStepConfirmed: boolean;
  recipeRun: RecipeRunState | null;
  recipeTx: RecipeTransaction | null;
  
  // Cylinder fit
  cylBusy: boolean;
  cylErr: string | null;
  cylRes: {
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
  } | null;
  cylShowAxis: boolean;
  cylUseSelection: boolean;
  cylFitPointIds: number[];
  cylRefineK: number;
  
  // File operations
  fileNotice: string | null;
  createNoticeTimer: any;
}

export function createInitialState(): SurfaceState {
  return {
    lastAction: 'init',
    
    points: [
      { x: 0, y: 0, z: 0 },
      { x: 120, y: -10, z: 5 },
      { x: 100, y: 110, z: -10 },
      { x: -10, y: 90, z: 30 }
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0]
    ],
    curves: [],
    surfaces: [],
    csys: [{
      name: 'Global',
      origin: { x: 0, y: 0, z: 0 },
      xAxis: { x: 1, y: 0, z: 0 },
      yAxis: { x: 0, y: 1, z: 0 },
      zAxis: { x: 0, y: 0, z: 1 }
    }],
    planes: [],
    
    samplerAppend: true,
    samplerMode: 'quad',
    samplerNu: 12,
    samplerNv: 12,
    samplerEdgeSegs: 8,
    samplerErr: null,
    
    pendingPointIdx: null,
    selectionMode: 'none',
    selectionProfile: 'precision',
    toolCursor: 'select',
    selectedPointIds: [],
    snapEndpoints: true,
    snapMidpoints: false,
    snapCurveNearest: false,
    snapSurfaceProjection: false,
    snapThresholdPx: 16,
    activeSnap: null,
    hoverTooltip: null,
    hoverRaf: 0,
    hoverQueued: null,
    lastHoverPos: { x: Number.NaN, y: Number.NaN },
    lastHoverModeKey: '',
    lastSnapSig: 'none',
    
    selecting: false,
    selStart: null,
    selRect: null,
    lasso: [],
    
    activeCurveIdx: null,
    curveMode: false,
    loftA: null,
    loftB: null,
    loftErr: null,
    loftSegments: [],
    
    undoStack: [],
    redoStack: [],
    
    activeEdgeIdx: 0,
    interpPct: 50,
    
    createPtX: 0,
    createPtY: 0,
    createPtZ: 0,
    createLineA: 0,
    createLineB: 1,
    surfaceDraft: [],
    surfaceCreateKind: 'quad',
    createMode: 'idle',
    creatorPick: null,
    selectedEntity: null,
    
    settingsOpen: false,
    coreMode: true,
    advancedOpen: false,
    rightRailCollapsed: false,
    showCoreModePrompt: false,
    datumsModalOpen: false,
    createGeometryModalOpen: false,
    surfaceCurveOpsModalOpen: false,
    extrudeModalOpen: false,
    healingModalOpen: false,
    showPointEntities: true,
    showLineEntities: true,
    showSurfaceEntities: true,
    showDatumEntities: true,
    showSelectionLabels: true,
    
    lineInsertT: 0.5,
    lineInsertPickMode: false,
    
    csysCreateMode: 'global',
    csysOriginPoint: 0,
    csysXPoint: 1,
    csysYPoint: 2,
    csysFromLine: 0,
    csysCopyIdx: 0,
    planeCreateMode: 'three_points',
    planeP0: 0,
    planeP1: 1,
    planeP2: 2,
    planeNormalVec: { x: 0, y: 0, z: 1 },
    planeOffsetSurface: 0,
    planeOffsetDist: 0,
    planeLineA: 0,
    planeLineB: 1,
    planeDirPoint: 0,
    planeDirVec: { x: 0, y: 0, z: 1 },
    planeCsysIdx: 0,
    planePrincipal: 'XY',
    datumPick: null,
    datumsModalPos: { x: 120, y: 120 },
    datumsModalDragging: false,
    datumsModalDragOffset: { x: 0, y: 0 },
    
    offsetSurfaceIdx: 0,
    offsetSurfaceDist: 2,
    offsetCurveIdx: 0,
    offsetCurveSurfaceIdx: 0,
    offsetCurveDist: 2,
    offsetCurveFlip: false,
    offsetCurveStatus: { severity: null, method: null, message: null },
    
    extrudeTarget: 'line',
    extrudeLineIdx: 0,
    extrudeCurveIdx: 0,
    extrudeDirMode: 'vector',
    extrudeVector: { x: 0, y: 0, z: 1 },
    extrudeSurfaceIdx: 0,
    extrudeFlip: false,
    extrudeDistance: 20,
    
    healTol: 0.5,
    
    actionsBarEl: null,
    datumsModalPanelEl: null,
    createGeomModalPanelEl: null,
    surfCurveModalPanelEl: null,
    healingModalPanelEl: null,
    
    selEdgeA: 0,
    selEdgeB: 1,
    offsetDist: 5,
    refPointIdx: 0,
    intersection: null,
    intersectionBusy: false,
    intersectionDiagnostics: {
      severity: null,
      message: null,
      angleDeg: null,
      skew: null,
      recommendations: []
    },
    
    svgEl: null,
    viewportEl: null,
    vpMenuOpen: false,
    vpMenuX: 0,
    vpMenuY: 0,
    w: 900,
    h: 600,
    rot: { alpha: -0.65, beta: 0.35 },
    zoomK: 1,
    pan: { x: 0, y: 0 },
    rotateAnchor: null,
    
    probeOn: false,
    probeBoltDia: 0.25,
    probe: null,
    maxTaperDeg: 6,
    
    evalBusy: false,
    evalErr: null,
    evalTol: 0,
    evalSigmaMult: 3,
    evalMaxOutliers: 50,
    evalRes: null,
    heatmapOn: false,
    evalUseSelection: true,
    
    sliceAxis: 'x',
    sliceBins: 24,
    sliceThickness: 0,
    sliceMetric: 'p95',
    sliceBusy: false,
    sliceErr: null,
    sliceRes: null,
    
    datumSlicePlaneIdx: 0,
    datumSliceMode: 'fixed_spacing',
    datumSliceSpacing: 5,
    datumSliceCount: 24,
    datumSliceThickness: 0,
    datumSliceUseSelection: true,
    includeOptionalSliceColumns: false,
    datumSliceBusy: false,
    datumSliceErr: null,
    datumSliceRes: null,
    selectedSliceId: null,
    statusWarnings: [],
    
    recipes: [],
    selectedRecipeId: null,
    recipeNameDraft: '',
    recipeStepConfirmed: true,
    recipeRun: null,
    recipeTx: null,
    
    cylBusy: false,
    cylErr: null,
    cylRes: null,
    cylShowAxis: true,
    cylUseSelection: true,
    cylFitPointIds: [],
    cylRefineK: 2.0,
    
    fileNotice: null,
    createNoticeTimer: null
  };
}
