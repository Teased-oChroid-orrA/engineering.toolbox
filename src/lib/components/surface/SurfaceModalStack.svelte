<script lang="ts">
  import SurfaceDatumsModal from './SurfaceDatumsModal.svelte';
  import SurfaceCreateGeometryModal from './SurfaceCreateGeometryModal.svelte';
  import SurfaceCurveOpsModal from './SurfaceCurveOpsModal.svelte';
  import SurfaceExtrudeModal from './SurfaceExtrudeModal.svelte';
  import SurfaceHealingModal from './SurfaceHealingModal.svelte';
  import SurfaceViewportSettingsModal from './SurfaceViewportSettingsModal.svelte';

  export let datumsModalOpen = false;
  export let datumsModalPos = { x: 0, y: 0 };
  export let datumsModalPanelEl: HTMLElement | null = null;
  export let datumPick: any = null;
  export let csysCreateMode: any = 'global';
  export let csysOriginPoint = 0;
  export let csysXPoint = 1;
  export let csysYPoint = 2;
  export let csysFromLine = 0;
  export let csysCopyIdx = 0;
  export let planeCreateMode: any = 'three_points';
  export let planeP0 = 0;
  export let planeP1 = 1;
  export let planeP2 = 2;
  export let planeNormalVec: any = { x: 0, y: 0, z: 1 };
  export let planeOffsetSurface = 0;
  export let planeOffsetDist = 0;
  export let planeLineA = 0;
  export let planeLineB = 1;
  export let planeDirPoint = 0;
  export let planeDirVec: any = { x: 0, y: 0, z: 1 };
  export let planeCsysIdx = 0;
  export let planePrincipal: any = 'XY';
  export let datumPickHint = '';
  export let csys: any[] = [];
  export let planes: any[] = [];
  export let startDatumsModalDrag: (ev: PointerEvent) => void = () => {};
  export let armDatumPick: (...args: any[]) => void = () => {};
  export let addDatumCsys: () => void = () => {};
  export let addDatumPlane: () => void = () => {};

  export let createGeometryModalOpen = false;
  export let createGeomModalPanelEl: HTMLElement | null = null;
  export let pointsCount = 0;
  export let minLinePoints = 2;
  export let minSurfacePoints = 3;
  export let creatorHint = '';
  export let surfaceFlowHint = '';
  export let surfaceDraft: number[] = [];
  export let surfaceDraftRequired = 3;
  export let surfaceCreateKind: any = 'quad';
  export let creatorPick: any = null;
  export let createLineA: number | null = 0;
  export let createLineB: number | null = 1;
  export let createPtX = 0;
  export let createPtY = 0;
  export let createPtZ = 0;
  export let beginLinePick: (...args: any[]) => void = () => {};
  export let beginSurfacePick: (...args: any[]) => void = () => {};
  export let addPoint: () => void = () => {};
  export let finishContourSurface: () => void = () => {};

  export let surfaceCurveOpsModalOpen = false;
  export let surfCurveModalPanelEl: HTMLElement | null = null;
  export let selectedEntity: any = null;
  export let lineInsertT = 0.5;
  export let lineInsertPickMode = false;
  export let toolCursor: any = 'select';
  export let offsetSurfaceIdx = 0;
  export let offsetSurfaceDist = 0;
  export let offsetCurveIdx = 0;
  export let offsetCurveSurfaceIdx = 0;
  export let offsetCurveDist = 0;
  export let offsetCurveFlip = false;
  export let offsetCurveStatus: any = null;
  export let insertPointOnEdge: (...args: any[]) => void = () => {};
  export let setToolCursor: (...args: any[]) => void = () => {};
  export let offsetSurfaceCreate: () => void = () => {};
  export let offsetCurveOnSurfaceCreate: () => void = () => {};

  export let extrudeModalOpen = false;
  export let extrudeTarget: any = 'line';
  export let extrudeLineIdx = 0;
  export let extrudeCurveIdx = 0;
  export let extrudeDirMode: any = 'vector';
  export let extrudeDistance = 0;
  export let extrudeVector: any = { x: 0, y: 0, z: 1 };
  export let extrudeSurfaceIdx = 0;
  export let extrudeFlip = false;
  export let extrudeLineOrCurve: () => void = () => {};

  export let healingModalOpen = false;
  export let healingModalPanelEl: HTMLElement | null = null;
  export let healTol = 0.5;
  export let runTopologyHealing: () => void = () => {};

  export let settingsOpen = false;
  export let showSelectionLabels = true;
  export let showPointEntities = true;
  export let showLineEntities = true;
  export let showSurfaceEntities = true;
  export let showDatumEntities = true;
  export let snapEndpoints = true;
  export let snapMidpoints = false;
  export let snapCurveNearest = false;
  export let snapSurfaceProjection = false;
  export let snapThresholdPx = 16;
</script>

<SurfaceDatumsModal
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
/>

<SurfaceCreateGeometryModal
  open={createGeometryModalOpen}
  bind:panelEl={createGeomModalPanelEl}
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
  onClose={() => (createGeometryModalOpen = false)}
  {beginLinePick}
  {beginSurfacePick}
  {addPoint}
  {finishContourSurface}
/>

<SurfaceCurveOpsModal
  open={surfaceCurveOpsModalOpen}
  bind:panelEl={surfCurveModalPanelEl}
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
  onClose={() => (surfaceCurveOpsModalOpen = false)}
  {insertPointOnEdge}
  {setToolCursor}
  {offsetSurfaceCreate}
  {offsetCurveOnSurfaceCreate}
/>

<SurfaceExtrudeModal
  open={extrudeModalOpen}
  onClose={() => (extrudeModalOpen = false)}
  bind:extrudeTarget
  bind:extrudeLineIdx
  bind:extrudeCurveIdx
  bind:extrudeDirMode
  bind:extrudeDistance
  bind:extrudeVector
  bind:extrudeSurfaceIdx
  bind:extrudeFlip
  onExtrudePath={extrudeLineOrCurve}
/>

<SurfaceHealingModal
  open={healingModalOpen}
  bind:panelEl={healingModalPanelEl}
  bind:healTol
  onClose={() => (healingModalOpen = false)}
  {runTopologyHealing}
/>

<SurfaceViewportSettingsModal
  open={settingsOpen}
  onClose={() => (settingsOpen = false)}
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
