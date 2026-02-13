<script lang="ts">
  import SurfaceModalStack from './SurfaceModalStack.svelte';
  import type { DatumCsys, DatumPlane, Point3D } from './SurfaceOrchestratorDeps';

  // Bind props for modals
  let {
    datumsModalOpen = $bindable(),
    datumsModalPos = $bindable(),
    datumsModalPanelEl = $bindable(),
    datumPick = $bindable(),
    csysCreateMode = $bindable(),
    csysOriginPoint = $bindable(),
    csysXPoint = $bindable(),
    csysYPoint = $bindable(),
    csysFromLine = $bindable(),
    csysCopyIdx = $bindable(),
    planeCreateMode = $bindable(),
    planeP0 = $bindable(),
    planeP1 = $bindable(),
    planeP2 = $bindable(),
    planeNormalVec = $bindable(),
    planeOffsetSurface = $bindable(),
    planeOffsetDist = $bindable(),
    planeLineA = $bindable(),
    planeLineB = $bindable(),
    planeDirPoint = $bindable(),
    planeDirVec = $bindable(),
    planeCsysIdx = $bindable(),
    planePrincipal = $bindable(),
    datumPickHint,
    startDatumsModalDrag,
    armDatumPick,
    addDatumCsys,
    addDatumPlane,
    csys,
    planes,
    createGeometryModalOpen = $bindable(),
    createGeomModalPanelEl = $bindable(),
    pointsCount,
    minLinePoints,
    minSurfacePoints,
    creatorHint,
    surfaceFlowHint,
    surfaceDraft = $bindable(),
    surfaceDraftRequired,
    surfaceCreateKind = $bindable(),
    creatorPick = $bindable(),
    createLineA = $bindable(),
    createLineB = $bindable(),
    createPtX = $bindable(),
    createPtY = $bindable(),
    createPtZ = $bindable(),
    beginLinePick,
    beginSurfacePick,
    addPoint,
    finishContourSurface,
    surfaceCurveOpsModalOpen = $bindable(),
    surfCurveModalPanelEl = $bindable(),
    selectedEntity = $bindable(),
    lineInsertT = $bindable(),
    lineInsertPickMode = $bindable(),
    toolCursor = $bindable(),
    offsetSurfaceIdx = $bindable(),
    offsetSurfaceDist = $bindable(),
    offsetCurveIdx = $bindable(),
    offsetCurveSurfaceIdx = $bindable(),
    offsetCurveDist = $bindable(),
    offsetCurveFlip = $bindable(),
    offsetCurveStatus = $bindable(),
    insertPointOnEdge,
    setToolCursor,
    offsetSurfaceCreate,
    offsetCurveOnSurfaceCreate,
    extrudeModalOpen = $bindable(),
    extrudeTarget = $bindable(),
    extrudeLineIdx = $bindable(),
    extrudeCurveIdx = $bindable(),
    extrudeDirMode = $bindable(),
    extrudeDistance = $bindable(),
    extrudeVector = $bindable(),
    extrudeSurfaceIdx = $bindable(),
    extrudeFlip = $bindable(),
    extrudeLineOrCurve,
    healingModalOpen = $bindable(),
    healingModalPanelEl = $bindable(),
    healTol = $bindable(),
    runTopologyHealing,
    settingsOpen = $bindable(),
    showSelectionLabels = $bindable(),
    showPointEntities = $bindable(),
    showLineEntities = $bindable(),
    showSurfaceEntities = $bindable(),
    showDatumEntities = $bindable(),
    snapEndpoints = $bindable(),
    snapMidpoints = $bindable(),
    snapCurveNearest = $bindable(),
    snapSurfaceProjection = $bindable(),
    snapThresholdPx = $bindable()
  }: any = $props();
</script>

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
  {pointsCount}
  {minLinePoints}
  {minSurfacePoints}
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
