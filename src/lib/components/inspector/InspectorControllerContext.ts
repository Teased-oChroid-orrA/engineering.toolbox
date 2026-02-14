/**
 * InspectorControllerContext.ts
 * 
 * Typed context interface for Inspector controllers.
 * Replaces unsafe `ctx: any` pattern with strongly-typed interface.
 * 
 * This interface defines the complete controller context API,
 * providing type safety and IDE autocomplete for all controller functions.
 */

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
  Recipe,
  RecipeState,
  MultiQueryClause,
  GenTab,
  PerfMetric,
  GateToken,
  DialogMod,
} from './InspectorStateTypes';

/**
 * Core controller context interface.
 * All Inspector controllers accept a context object conforming to this shape.
 * 
 * This replaces the previous `ctx: any` pattern for type safety.
 */
export interface InspectorControllerContext {
  // ============================================================================
  // Core Load State (Reactive)
  // ============================================================================
  loadState: LoadState;

  // ============================================================================
  // Derived/Backward Compatibility Properties
  // ============================================================================
  headers: string[];
  totalRowCount: number;
  colTypes: ColType[];
  datasetId: string | null;
  datasetLabel: string;
  hasLoaded: boolean;
  isMergedView: boolean;
  mergedRowsAll: string[][];
  totalFilteredCount: number;
  visibleRows: string[][];

  // ============================================================================
  // Grid State
  // ============================================================================
  startIdx: number;
  endIdx: number;
  visibleColIdxs: number[];
  sortColIdx: number | null;
  sortDir: SortDirection;
  sortSpecs: SortSpec[];

  // ============================================================================
  // Query and Filter State
  // ============================================================================
  query: string;
  matchMode: MatchMode;
  targetColIdx: number | null;
  queryScope: QueryScope;
  maxRowsScanText: string;

  // Advanced filters
  numericF: NumericFilterState;
  dateF: DateFilterState;
  catF: CategoryFilterState;

  // Multi-query
  multiQueryEnabled: boolean;
  multiQueryExpanded: boolean;
  multiQueryClauses: MultiQueryClause[];

  // ============================================================================
  // Header & CSV Loading State
  // ============================================================================
  hasHeaders: boolean;
  headerMode: 'yes' | 'no' | 'auto';
  pendingText: string | null;
  pendingPath: string | null;
  showHeaderPrompt: boolean;
  headerHeuristicReason: string;

  // ============================================================================
  // Column Management
  // ============================================================================
  visibleColumns: Set<number>;
  hiddenColumns: Set<number>;
  columnWidths: Record<number, number>;
  pinnedLeft: Set<number>;
  pinnedRight: Set<number>;
  showColumnPicker: boolean;
  columnPickerNotice: string | null;

  // ============================================================================
  // Recipes
  // ============================================================================
  recipes: Recipe[];

  // ============================================================================
  // Workspace State
  // ============================================================================
  activeDatasetId: string | null;
  pendingRestore: any;
  hiddenUploadInput: any;
  debugLogger: any;
  dialogMod: DialogMod | null;

  // ============================================================================
  // UI State
  // ============================================================================
  isLoading: boolean;
  loadError: string | null;
  queryError: string | null;

  showDataControls: boolean;
  showOverlay: boolean;
  hideOverlayNow: boolean;
  uiAnimDur: number;

  // ============================================================================
  // Workspace and Cross-Query
  // ============================================================================
  loadedDatasets: WorkspaceDataset[];
  crossQueryBusy: boolean;
  crossQueryResults: CrossQueryResult[];
  lastCrossReactiveSig: string;

  // Pre-merged state (for cross-query restoration)
  preMergedHeaders: string[];
  preMergedColTypes: ColType[];
  preMergedTotalRowCount: number;
  preMergedTotalFilteredCount: number;

  // ============================================================================
  // Filter and Slice Control
  // ============================================================================
  suspendReactiveFiltering: boolean;
  filterPending: boolean;
  filterInFlight: boolean;
  filterLastReason: string;
  filterTimer: ReturnType<typeof setTimeout> | null;
  sliceTimer: ReturnType<typeof setTimeout> | null;
  crossQueryTimer: ReturnType<typeof setTimeout> | null;

  // Gates (cancellation tokens)
  filterGate: GateToken;
  sliceGate: GateToken;
  sortGate: GateToken;

  // ============================================================================
  // Schema and Insights
  // ============================================================================
  schemaStats: SchemaColStat[];
  schemaStatsLoading: boolean;

  // ============================================================================
  // Recipes
  // ============================================================================
  recipeState: RecipeState;

  // ============================================================================
  // SVAR Filter Builder
  // ============================================================================
  svarFilterSet: IFilterSet;
  showSvarBuilder: boolean;
  svarNotice: string | null;

  // ============================================================================
  // Constants
  // ============================================================================
  FILTER_DEBOUNCE_MS: number;
  CROSS_QUERY_DEBOUNCE_MS: number;

  // ============================================================================
  // Utility Functions
  // ============================================================================
  invoke: (cmd: string, args?: any) => Promise<any>;
  escapeRegExp: (str: string) => string;
  queueDebug: (label: string, data?: any) => void;
  queueDebugRate: (key: string, rateMs: number, label: string, data?: any) => void;
  recordPerf: (op: string, startTime: number, details?: any) => void;

  // ============================================================================
  // Controller Action Functions
  // ============================================================================
  // These are functions that controllers can call
  buildFilterSpecFromState: (ctx: any) => { spec: IFilterSet | null; queryError?: string; numericError?: string; dateError?: string };
  buildFilterSpec: () => any;
  fetchVisibleSlice: () => Promise<void>;
  runFilterNow: (forceCurrent?: boolean) => Promise<void>;
  runCrossDatasetQuery: () => Promise<void>;
  applyRecipe: (recipeId: string) => Promise<void>;
  loadSchemaStats: () => Promise<void>;
  activateWorkspaceDataset: (id: string, internal?: boolean) => Promise<void>;
  
  // Helper functions
  fnv1a32: (str: string) => number;
  heuristicHasHeaders: (first: string[], second: string[]) => { value: boolean; decided: boolean; reason: string };
  computeDatasetIdentity: (source: string, hdrs: string[], rowCount: number, hashFn: (s: string) => number) => { id: string; label: string };
  upsertWorkspaceDatasetInList: (list: WorkspaceDataset[], ds: WorkspaceDataset) => WorkspaceDataset[];
  loadRecipesForDataset: (datasetId: string) => Promise<Recipe[]>;
  loadLastStateForDataset: (datasetId: string) => Promise<any>;
  applyState: (state: any) => void;

  // ============================================================================
  // Merged Headers (for cross-query mode)
  // ============================================================================
  mergedHeaders: string[];
}

/**
 * Partial context for specific controller types.
 * Controllers can accept a subset of the full context if they only need certain properties.
 */

export type FilterControllerContext = Pick<
  InspectorControllerContext,
  | 'loadState'
  | 'hasLoaded'
  | 'isMergedView'
  | 'suspendReactiveFiltering'
  | 'filterPending'
  | 'filterInFlight'
  | 'filterLastReason'
  | 'filterTimer'
  | 'filterGate'
  | 'query'
  | 'matchMode'
  | 'targetColIdx'
  | 'queryScope'
  | 'maxRowsScanText'
  | 'numericF'
  | 'dateF'
  | 'catF'
  | 'multiQueryEnabled'
  | 'multiQueryClauses'
  | 'crossQueryBusy'
  | 'crossQueryResults'
  | 'lastCrossReactiveSig'
  | 'preMergedHeaders'
  | 'preMergedColTypes'
  | 'preMergedTotalRowCount'
  | 'preMergedTotalFilteredCount'
  | 'loadedDatasets'
  | 'mergedRowsAll'
  | 'queryError'
  | 'loadError'
  | 'visibleColIdxs'
  | 'totalRowCount'
  | 'visibleRows'
  | 'crossQueryTimer'
  | 'headers'
  | 'svarFilterSet'
  | 'svarNotice'
  | 'showSvarBuilder'
  | 'FILTER_DEBOUNCE_MS'
  | 'invoke'
  | 'escapeRegExp'
  | 'queueDebug'
  | 'queueDebugRate'
  | 'recordPerf'
  | 'buildFilterSpecFromState'
  | 'fetchVisibleSlice'
  | 'runCrossDatasetQuery'
>;

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
  persistRecipesForDataset: (dsId: string, label: string, recipes: Recipe[]) => void;
};

export type GridControllerContext = Pick<
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
>;
