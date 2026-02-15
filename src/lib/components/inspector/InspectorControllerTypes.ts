/**
 * InspectorControllerTypes.ts
 * 
 * Type definitions for Inspector controller contexts.
 * Extracted from InspectorControllerContext.ts to maintain size policy compliance.
 * 
 * This file contains the main InspectorControllerContext interface
 * and related type definitions for controller contexts.
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
  RecipeState,
  MultiQueryClause,
  GenTab,
  PerfMetric,
  GateToken,
  DialogMod,
} from './InspectorStateTypes';
import type { Recipe } from './InspectorRecipesController';

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
  hiddenColumns: number[];
  columnWidths: Record<number, number>;
  pinnedLeft: number[];
  pinnedRight: number[];
  showColumnPicker: boolean;
  columnPickerNotice: string | null;

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
  recipes: Recipe[];
  recipeNotice: string | null;
  recipeName: string;
  recipeTags: string;
  autoRestoreEnabled: boolean;

  // ============================================================================
  // SVAR Filter Builder
  // ============================================================================
  svarFilterSet: IFilterSet;
  showSvarBuilder: boolean;
  svarNotice: string | null;

  // ============================================================================
  // Row Drawer State
  // ============================================================================
  showRowDrawer: boolean;
  drawerVisualIdx: number | null;
  drawerKVs: Array<{ key: string; value: string }>;
  drawerLoading: boolean;
  drawerError: string | null;
  drawerExplain: string | null;
  drawerSearch: string;
  tier2Open: boolean;
  tier2Tab: "numeric" | "date" | "category";

  // ============================================================================
  // Schema Modal State
  // ============================================================================
  schemaLoading: boolean;
  schemaError: string | null;
  schemaCache: Map<string, any>;
  schemaDriftBaseline: SchemaColStat[] | null;
  schemaSampleN: number;
  schemaSampleTier: 'fast' | 'balanced' | 'full';
  schemaScopeLabel: string;
  showSchemaModal: boolean;
  
  // Category Values State
  catAvailLoading: boolean;
  catAvailError: string | null;
  catAvailItems: Array<{ value: string; count: number }>;
  catAvailSearch: string;
  catAvailLimit: number;
  catAvailOffset: number;
  catAvailDistinctTotal: number;
  catAvailTotalRowsInView: number;
  catAvailRowsScanned: number;
  catAvailPartial: boolean;
  catAvailTimer: ReturnType<typeof setTimeout> | null;
  categoryGate: GateToken;

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
  | 'visibleRows'
  | 'totalRowCount'
  | 'totalFilteredCount'
  | 'headers'
  | 'visibleColIdxs'
  | 'queryError'
  | 'loadError'
  | 'escapeRegExp'
  | 'buildFilterSpecFromState'
  | 'invoke'
  | 'queueDebug'
  | 'queueDebugRate'
  | 'recordPerf'
  | 'runCrossDatasetQuery'
  | 'fetchVisibleSlice'
  | 'svarFilterSet'
  | 'showSvarBuilder'
  | 'svarNotice'
  | 'FILTER_DEBOUNCE_MS'
  | 'crossQueryTimer'
>;
