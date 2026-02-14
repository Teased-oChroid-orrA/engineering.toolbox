export { INSPECTOR_THEME } from '$lib/components/inspector/InspectorThemeTokens';
export {
  buildRegexCore,
  computeRegexTestMatches,
  genFlagsString,
  getRegexWarnings,
  newClause,
  regexTemplates,
  removeClause as removeRegexClause,
  moveClause as moveRegexClause,
  addClause as addRegexClause,
  validateRegexPattern
} from '$lib/components/inspector/InspectorRegexController';
export type { BuildMode, Clause, ClauseKind, GenTab } from '$lib/components/inspector/InspectorRegexController';
export {
  fmtDate,
  parseDateRelaxed,
  parseF64Relaxed,
  profileSchemaFromRows
} from '$lib/components/inspector/InspectorSchemaController';
export { PerfRecorder, createRequestGate } from '$lib/components/inspector/InspectorDataStore';
export type { RecipeStateV3 } from '$lib/components/inspector/InspectorDataStore';
export {
  computeDatasetIdentity,
  hasLoadedDatasetSignals,
  heuristicHasHeaders,
  upsertWorkspaceDataset as upsertWorkspaceDatasetInList
} from '$lib/components/inspector/InspectorLoadController';
export { buildFilterSpec as buildFilterSpecFromState, parseMaxRowsScanText } from '$lib/components/inspector/InspectorQueryController';
export {
  applySvarBuilderToFilters as applySvarBuilderToFiltersController,
  buildFilterSpec as buildFilterSpecController,
  clearAllFilters as clearAllFiltersController,
  drainFilterQueue as drainFilterQueueController,
  onQueryScopeChange as onQueryScopeChangeController,
  runFilterNow as runFilterNowController,
  scheduleCrossQuery as scheduleCrossQueryController,
  scheduleFilter as scheduleFilterController
} from '$lib/components/inspector/InspectorOrchestratorFilterController';
export {
  activateWorkspaceDataset as activateWorkspaceDatasetController,
  loadCsvFromPath as loadCsvFromPathController,
  loadCsvFromText as loadCsvFromTextController,
  openFallbackLoadFromMenu as openFallbackLoadFromMenuController,
  openStreamLoadFromMenu as openStreamLoadFromMenuController,
  runCrossDatasetQuery as runCrossDatasetQueryController,
  unloadWorkspaceDataset as unloadWorkspaceDatasetController,
  upsertWorkspaceDataset as upsertWorkspaceDatasetController
} from '$lib/components/inspector/InspectorOrchestratorLoadController';
export {
  clearColumnSelection as clearColumnSelectionController,
  fetchVisibleSlice as fetchVisibleSliceController,
  hideColumn as hideColumnController,
  onColumnResize as onColumnResizeController,
  openColumnPicker as openColumnPickerController,
  requestSort as requestSortController,
  scheduleSliceFetch as scheduleSliceFetchController,
  selectAllColumns as selectAllColumnsController,
  smartSelectColumns as smartSelectColumnsController,
  togglePinLeft as togglePinLeftController,
  togglePinRight as togglePinRightController,
  toggleVisibleCol as toggleVisibleColController
} from '$lib/components/inspector/InspectorOrchestratorGridController';
export {
  applyRecipe as applyRecipeController2,
  deleteRecipe as deleteRecipeController2,
  exportAnalysisBundle as exportAnalysisBundleController,
  exportCsvPreset as exportCsvPresetController,
  exportRecipesCurrent as exportRecipesCurrentController,
  importRecipesFile as importRecipesFileController2,
  loadLastStateForDataset as loadLastStateForDatasetController2,
  loadRecipesForDataset as loadRecipesForDatasetController2,
  persistLastStateForDataset as persistLastStateForDatasetController2,
  persistRecipesForDataset as persistRecipesForDatasetController2,
  saveCurrentAsRecipe as saveCurrentAsRecipeController2,
  toggleRecipeFavorite as toggleRecipeFavoriteController2
} from '$lib/components/inspector/InspectorOrchestratorRecipesController';
export {
  closeRowDrawer as closeRowDrawerController2,
  copyDrawerAsJson as copyDrawerAsJsonController3,
  drawerApplyCategory as drawerApplyCategoryController2,
  drawerApplyDateExact as drawerApplyDateExactController3,
  drawerApplyNumericExact as drawerApplyNumericExactController3,
  drawerApplyTarget as drawerApplyTargetController2,
  navRow as navRowController2,
  openRowDrawer as openRowDrawerController3
} from '$lib/components/inspector/InspectorOrchestratorRowDrawerController';
export {
  computeSchemaStats as computeSchemaStatsController2,
  fetchCategoryValues as fetchCategoryValuesController2,
  openSchema as openSchemaController2,
  scheduleFetchCategory as scheduleFetchCategoryController2,
  setSchemaDriftBaseline as setSchemaDriftBaselineController2
} from '$lib/components/inspector/InspectorOrchestratorSchemaController';
export {
  computeSchemaDrift,
  computeSchemaOutliers,
  computeSchemaRelationshipHints,
  computeSchemaSuggested,
  schemaActionCategory as schemaActionCategoryController,
  schemaActionDateRange as schemaActionDateRangeController,
  schemaActionNumericRange as schemaActionNumericRangeController,
  schemaActionTarget as schemaActionTargetController
} from '$lib/components/inspector/InspectorOrchestratorSchemaInsightsController';
export {
  applyState as applyStateController2,
  captureState as captureStateController2
} from '$lib/components/inspector/InspectorOrchestratorStateController';
export {
  buildRecipeExportBlob,
  captureRecipeState,
  downloadText,
  loadLastStateForDataset as loadLastStateForDatasetFromStore,
  loadRecipesForDataset as loadRecipesForDatasetFromStore,
  mergeImportedRecipes,
  migrateAndNormalizeRecipeState,
  newRecipeId,
  persistLastStateForDataset as persistLastStateForDatasetToStore,
  persistRecipesForDataset as persistRecipesForDatasetToStore,
  toCsvText
} from '$lib/components/inspector/InspectorRecipesController';
export type { Recipe, RecipeState } from '$lib/components/inspector/InspectorRecipesController';
export {
  applyDrawerDateExact,
  applyDrawerNumericExact,
  copyDrawerAsJson as copyDrawerAsJsonController,
  loadRowDrawerData
} from '$lib/components/inspector/InspectorRowDrawerController';
export { createInspectorDebugLogger } from '$lib/components/inspector/InspectorDebugState';
export { mountInspectorLifecycle } from '$lib/components/inspector/InspectorLifecycleController';
export {
  analyzeRegex,
  computeActiveFilterHash,
  escapeHtml,
  escapeRegExp,
  fnv1a32
} from '$lib/components/inspector/InspectorUtilsController';
export {
  multiQueryHighlightRegexes,
  newMultiQueryClause
} from '$lib/components/inspector/InspectorMultiQueryController';
export type { MultiQueryClause } from '$lib/components/inspector/InspectorStateTypes';
export { registerContextMenu } from '$lib/navigation/contextualMenu';
