export {
  computeCylinderEvaluation,
  computePlaneEvaluation,
  computeSectionSliceEvaluation
} from './controllers/SurfaceEvalController';
export {
  buildSurfaceCsv,
  readSurfaceCsvFile,
  readSurfaceStepFile,
  triggerCsvDownload,
  triggerJsonDownload
} from './controllers/SurfaceIoController';
export {
  buildCombinedSliceCsv,
  buildSliceMetadataSidecar,
  computeDatumPlaneSlices
} from './controllers/SurfaceSlicingExportController';
export type { DatumSliceMode, DatumSliceRunResult } from './controllers/SurfaceSlicingExportController';
export { buildSliceSyncModel } from './controllers/SurfaceSlicingInsightsController';
export {
  toStatusFromIntersection,
  toStatusFromSliceWarnings
} from './controllers/SurfaceWarningsController';
export type { SurfaceStatusWarning } from './controllers/SurfaceWarningsController';
export {
  buildSlicingRuntimeWarning,
  dispatchWarningToasts,
  mergeWarningsUntracked
} from './controllers/SurfaceWarningDispatchController';
export {
  createRecipeRun,
  loadWorkspaceRecipes,
  recipeStepLabel,
  saveWorkspaceRecipes
} from './controllers/SurfaceRecipesController';
export type { RecipeRunState, SurfaceRecipe, SurfaceRecipeConfig, SurfaceRecipeStep } from './controllers/SurfaceRecipesController';
export { advanceRecipeRunUntilPause, findRecipeForRun } from './controllers/SurfaceRecipeRunController';
export {
  beginRecipeTransaction,
  finalizeRecipeTransaction,
  rollbackRecipeTransaction
} from './controllers/SurfaceRecipeTransactionController';
export type { RecipeTransaction } from './controllers/SurfaceRecipeTransactionController';
export { SURFACE_MOTION_SPEC, motionMs } from './controllers/SurfaceThemeController';
export {
  linePickState,
  nextCreateModeState,
  nextSelectionModeState,
  surfacePickState
} from './controllers/SurfaceToolsController';
export { transitionToolCursor } from './controllers/SurfaceCursorController';
export type { ToolCursorMode } from './controllers/SurfaceCursorController';
export { findBestSnapCandidate } from './controllers/SurfaceSnapController';
export type { SnapCandidate } from './controllers/SurfaceSnapController';
export {
  makeHoverModeKey,
  nearestPointIndex,
  shouldProcessHover,
  shouldRecomputeHover,
  snapCandidateSignature
} from './controllers/SurfaceInteractionController';
export {
  centeredModalPos,
  draggedModalPos,
  dragOffsetFromPointer
} from './controllers/SurfaceModalController';
export {
  createDatumCsys,
  createDatumPlane,
  planeBasis,
  surfaceNormal,
  vecAdd,
  vecScale,
  vecUnit
} from './controllers/SurfaceDatumController';
export {
  diagnoseIntersectionResult,
  precheckIntersectionInputs
} from './controllers/SurfaceIntersectionController';
export type { IntersectionDiagnostics } from './controllers/SurfaceIntersectionController';
export { buildHoverTooltip } from './controllers/SurfaceHoverController';
export type { HoverTooltip } from './controllers/SurfaceHoverController';
export { computeCurveOffsetBestEffort } from './controllers/SurfaceGeodesicOffsetController';
export {
  hasSeenCoreModePrompt,
  markCoreModePromptSeen,
  persistCoreMode,
  persistRightRailCollapsed,
  readPersistedCoreMode,
  readPersistedRightRailCollapsed,
  readWorkspaceUiState,
  writeWorkspaceUiState
} from './controllers/SurfaceUiStateController';
export { buildSurfaceNavMenu } from './controllers/SurfaceNavMenuController';
export { mountSurfaceGlobalHandlers } from './controllers/SurfaceLifecycleController';
export { mountSurfaceViewportInteraction } from './controllers/SurfaceViewportMountController';
export {
  cylKeepInliers as cylKeepInliersController,
  cylRemoveOutliers as cylRemoveOutliersController,
  cylSelectOutliers as cylSelectOutliersController,
  cylThresholdAbs as cylThresholdAbsController
} from './controllers/SurfaceCylinderUiController';
export {
  deleteSelectedRecipe as deleteSelectedRecipeController,
  saveCurrentRecipe as saveCurrentRecipeController,
  selectRecipe as selectRecipeController,
  selectedRecipe as selectedRecipeController,
  snapshotRecipeConfig as snapshotRecipeConfigController,
  toggleSelectedRecipeStep as toggleSelectedRecipeStepController,
  applyRecipeConfig as applyRecipeConfigController
} from './controllers/SurfaceRecipeUiController';
export type { Curve, DatumCsys, DatumPlane, Edge, Point3D, SurfaceFace } from '../../surface/types';
export type { SelectionMode, SelectionProfile } from './SurfaceTypes';
export { bilerp, clamp, deg, lerp3, vecNorm, vecSub } from '../../surface/geom/points';
export { edgeExists } from '../../surface/geom/edges';
export { buildLoftSegments } from '../../surface/geom/curves';
export { activeFitPointIds } from '../../surface/geom/indexing';
export { calcOffsetIntersectionApi } from '../../surface/api/surfaceApi';
export {
  computeCylinderAxisSegment,
  depthOpacity as viewportDepthOpacity,
  fitToScreen as viewportFitToScreen,
  projectPoint
} from '../../surface/viewport/SurfaceViewport';
export {
  applySelectionFromHits as applySelectionHits,
  hitsInLasso,
  hitsInRect
} from './SelectionEngine';
export { createSnapshot, materializeSnapshot } from '../../surface/state/SurfaceStore';
export type { Snapshot } from '../../surface/state/SurfaceStore';
export {
  canHistoryRedo,
  canHistoryUndo,
  popHistoryRedo,
  popHistoryUndo,
  pushHistoryUndo
} from '../../surface/state/SurfaceHistoryController';
export { registerContextMenu } from '$lib/navigation/contextualMenu';
