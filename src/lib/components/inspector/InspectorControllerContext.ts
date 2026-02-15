/**
 * InspectorControllerContext.ts
 * 
 * Typed context interface for Inspector controllers.
 * Replaces unsafe `ctx: any` pattern with strongly-typed interface.
 * 
 * This file re-exports types from InspectorControllerTypes.ts and adds
 * additional specialized context types for specific controllers.
 */

// Re-export main interface from types file
export type {
  InspectorControllerContext,
  FilterControllerContext
} from './InspectorControllerTypes';

import type {
  InspectorControllerContext,
} from './InspectorControllerTypes';

import type { IFilterSet } from '@svar-ui/svelte-filter';
import type {
  ColType,
  MatchMode,
  SortDirection,
  QueryScope,
  NumericFilterState,
  DateFilterState,
  CategoryFilterState,
  WorkspaceDataset,
  LoadState,
  GridWindow,
  SortSpec,
  CrossQueryResult,
  SchemaColStat,
  RecipeState,
  MultiQueryClause,
  GenTab,
  PerfMetric,
  GateToken,
  DialogMod,
} from './InspectorStateTypes';
import type { Recipe } from './InspectorRecipesController';

/**
 * Specialized context types for specific controller domains.
 * These extend or pick specific properties from the main InspectorControllerContext.
 */

export type LoadControllerContext = Omit<Pick<
  InspectorControllerContext,
  | 'loadState'
  | 'isLoading'
  | 'loadError'
  | 'showDataControls'
  | 'suspendReactiveFiltering'
  | 'isMergedView'
  | 'mergedRowsAll'
  | 'mergedHeaders'
  | 'loadedDatasets'
  | 'datasetId'
  | 'datasetLabel'
  | 'headers'
  | 'colTypes'
  | 'totalRowCount'
  | 'totalFilteredCount'
  | 'visibleRows'
  | 'hasLoaded'
  | 'crossQueryBusy'
  | 'crossQueryResults'
  | 'query'
  | 'matchMode'
  | 'targetColIdx'
  | 'numericF'
  | 'dateF'
  | 'catF'
  | 'queryScope'
  | 'sortColIdx'
  | 'sortDir'
  | 'sortSpecs'
  | 'preMergedHeaders'
  | 'preMergedTotalRowCount'
  | 'preMergedTotalFilteredCount'
  | 'preMergedColTypes'
  | 'hasHeaders'
  | 'headerMode'
  | 'pendingText'
  | 'pendingPath'
  | 'showHeaderPrompt'
  | 'headerHeuristicReason'
  | 'columnWidths'
  | 'recipes'
  | 'activeDatasetId'
  | 'pendingRestore'
  | 'hiddenUploadInput'
  | 'debugLogger'
  | 'dialogMod'
  | 'invoke'
  | 'queueDebug'
  | 'queueDebugRate'
  | 'recordPerf'
  | 'runFilterNow'
  | 'runCrossDatasetQuery'
  | 'fnv1a32'
  | 'heuristicHasHeaders'
  | 'computeDatasetIdentity'
  | 'upsertWorkspaceDatasetInList'
  | 'loadRecipesForDataset'
  | 'loadLastStateForDataset'
  | 'applyState'
  | 'buildFilterSpec'
  | 'activateWorkspaceDataset'
>, 'visibleColumns' | 'hiddenColumns' | 'pinnedLeft' | 'pinnedRight'> & {
  visibleColumns: Set<number>;
  hiddenColumns: number[];
  pinnedLeft: number[];
  pinnedRight: number[];
};

export type RecipesControllerContext = Pick<
  InspectorControllerContext,
  | 'datasetId'
  | 'datasetLabel'
  | 'recipes'
  | 'recipeNotice'
  | 'recipeName'
  | 'recipeTags'
  | 'autoRestoreEnabled'
  | 'hasLoaded'
  | 'headers'
  | 'totalRowCount'
  | 'totalFilteredCount'
  | 'visibleRows'
  | 'visibleColIdxs'
  | 'schemaStats'
  | 'invoke'
> & {
  RECIPES_STORE_KEY: string;
  LEGACY_RECIPES_STORE_KEYS: string[];
  LAST_STATE_STORE_KEY: string;
  LEGACY_LAST_STATE_KEYS: string[];
  loadRecipesForDatasetFromStore: (key: string, legacyKeys: string[], dsId: string) => Recipe[];
  persistRecipesForDatasetToStore: (key: string, legacyKeys: string[], dsId: string, label: string, recipes: Recipe[]) => void;
  loadLastStateForDatasetFromStore: (key: string, legacyKeys: string[], dsId: string) => { state: any; autoRestore: boolean };
  persistLastStateForDatasetToStore: (key: string, legacyKeys: string[], dsId: string, state: any, autoRestore: boolean) => void;
  buildRecipeExportBlob: (data: { datasetId: string; datasetLabel: string; recipes: Recipe[] }) => any;
  mergeImportedRecipes: (existing: Recipe[], imported: Recipe[]) => Recipe[];
  newRecipeId: () => string;
  captureState: () => any;
  applyState: (state: any) => Promise<void>;
  activeFilterHash: () => string;
  toCsvText: (headers: string[], rows: string[][]) => string;
  downloadText: (text: string, filename: string, mimeType: string) => void;
  perf: { lastByOp: () => any };
  persistRecipesForDataset: (dsId: string | null, label: string, recipes: Recipe[]) => void;
};

export type RowDrawerControllerContext = Pick<
  InspectorControllerContext,
  | 'showRowDrawer'
  | 'drawerVisualIdx'
  | 'drawerKVs'
  | 'drawerLoading'
  | 'drawerError'
  | 'drawerExplain'
  | 'drawerSearch'
  | 'hasLoaded'
  | 'headers'
  | 'colTypes'
  | 'totalFilteredCount'
  | 'targetColIdx'
  | 'catF'
  | 'numericF'
  | 'dateF'
  | 'tier2Open'
  | 'tier2Tab'
  | 'recipeNotice'
  | 'invoke'
  | 'recordPerf'
> & {
  loadRowDrawerData: (args: { invoke: any; visualIdx: number; headers: string[]; colTypes: any[] }) => Promise<{ drawerKVs: any; drawerExplain: any }>;
  copyDrawerAsJsonController: (drawerKVs: any) => Promise<void>;
  runFilterNow: () => Promise<void>;
  scheduleFilter: (reason?: string) => void;
  withViewTransition: (fn: () => void) => void;
  clamp: (n: number, min: number, max: number) => number;
  applyDrawerNumericExact: (value: string) => void;
  applyDrawerDateExact: (value: string) => void;
};

export type SchemaControllerContext = Pick<
  InspectorControllerContext,
  | 'hasLoaded'
  | 'headers'
  | 'colTypes'
  | 'totalRowCount'
  | 'totalFilteredCount'
  | 'datasetId'
  | 'query'
  | 'matchMode'
  | 'targetColIdx'
  | 'catF'
  | 'maxRowsScanText'
  | 'schemaLoading'
  | 'schemaError'
  | 'schemaStats'
  | 'schemaCache'
  | 'schemaDriftBaseline'
  | 'schemaSampleN'
  | 'schemaSampleTier'
  | 'schemaScopeLabel'
  | 'showSchemaModal'
  | 'catAvailLoading'
  | 'catAvailError'
  | 'catAvailItems'
  | 'catAvailSearch'
  | 'catAvailLimit'
  | 'catAvailOffset'
  | 'catAvailDistinctTotal'
  | 'catAvailTotalRowsInView'
  | 'catAvailRowsScanned'
  | 'catAvailPartial'
  | 'catAvailTimer'
  | 'categoryGate'
  | 'recipeNotice'
  | 'invoke'
  | 'recordPerf'
> & {
  profileSchemaFromRows: (rows: string[][], headers: string[], colTypes: ColType[]) => any;
  parseMaxRowsScanText: (text: string) => number;
  activeFilterHash: () => string;
  withViewTransition: (fn: () => void) => void;
};

export type StateControllerContext = Pick<
  InspectorControllerContext,
  | 'query'
  | 'matchMode'
  | 'targetColIdx'
  | 'numericF'
  | 'dateF'
  | 'catF'
  | 'multiQueryEnabled'
  | 'multiQueryExpanded'
  | 'multiQueryClauses'
  | 'sortColIdx'
  | 'sortDir'
  | 'sortSpecs'
  | 'visibleColumns'
  | 'hiddenColumns'
  | 'pinnedLeft'
  | 'pinnedRight'
  | 'columnWidths'
  | 'maxRowsScanText'
  | 'autoRestoreEnabled'
  | 'headers'
  | 'invoke'
> & {
  captureRecipeState: (state: any) => any;
  migrateAndNormalizeRecipeState: (state: any) => any;
  runFilterNow: () => Promise<void>;
};

export type GridControllerContext = Omit<Pick<
  InspectorControllerContext,
  | 'loadState'
  | 'hasLoaded'
  | 'isMergedView'
  | 'mergedRowsAll'
  | 'startIdx'
  | 'endIdx'
  | 'visibleColIdxs'
  | 'visibleRows'
  | 'sortColIdx'
  | 'sortDir'
  | 'sortSpecs'
  | 'sortGate'
  | 'sliceGate'
  | 'sliceTimer'
  | 'loadError'
  | 'headers'
  | 'totalFilteredCount'
  | 'visibleColumns'
  | 'hiddenColumns'
  | 'columnWidths'
  | 'pinnedLeft'
  | 'pinnedRight'
  | 'showColumnPicker'
  | 'columnPickerNotice'
  | 'invoke'
  | 'queueDebug'
  | 'recordPerf'
>, 'hiddenColumns' | 'pinnedLeft' | 'pinnedRight'> & {
  hiddenColumns: Set<number>;
  pinnedLeft: Set<number>;
  pinnedRight: Set<number>;
  updateVisibleRows?: (rows: string[][]) => void;
};
