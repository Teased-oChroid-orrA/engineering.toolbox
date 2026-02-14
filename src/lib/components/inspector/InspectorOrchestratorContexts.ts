import type { IFilterSet } from '@svar-ui/svelte-filter';
import type { GenTab, MultiQueryClause, Recipe, RecipeState } from '$lib/components/inspector/InspectorOrchestratorDeps';
import type { SchemaColStat } from '$lib/components/inspector/InspectorOrchestratorSchemaInsightsController';

type ColType = 'numeric' | 'date' | 'string';
type MatchMode = 'fuzzy' | 'regex' | 'exact';

type NumericFilterState = {
  enabled: boolean;
  colIdx: number | null;
  minText: string;
  maxText: string;
  error: string | null;
};

type DateFilterState = {
  enabled: boolean;
  colIdx: number | null;
  minIso: string;
  maxIso: string;
  error: string | null;
};

type CategoryFilterState = {
  enabled: boolean;
  colIdx: number | null;
  selected: Set<string>;
};

type DatasetSource =
  | { kind: 'text'; text: string }
  | { kind: 'path'; path: string };

type WorkspaceDataset = {
  id: string;
  label: string;
  hasHeaders: boolean;
  source: DatasetSource;
};

type DialogMod = typeof import('@tauri-apps/plugin-dialog');

export function filterControllerCtx(state: {
  FILTER_DEBOUNCE_MS: number;
  buildFilterSpecFromState: any;
  invoke: any;
  escapeRegExp: any;
  queueDebug: any;
  queueDebugRate: any;
  recordPerf: any;
  runCrossDatasetQuery: any;
  fetchVisibleSlice: any;
  loadState: any;  // Add loadState parameter
  headers: string[];
  hasLoaded: boolean;
  suspendReactiveFiltering: boolean;
  crossQueryBusy: boolean;
  queryScope: 'current' | 'all' | 'ask';
  isMergedView: boolean;
  loadedDatasets: WorkspaceDataset[];
  filterPending: boolean;
  filterInFlight: boolean;
  filterGate: any;
  filterLastReason: string;
  filterTimer: ReturnType<typeof setTimeout> | null;
  crossQueryTimer: ReturnType<typeof setTimeout> | null;
  query: string;
  multiQueryEnabled: boolean;
  multiQueryExpanded: boolean;
  multiQueryClauses: MultiQueryClause[];
  targetColIdx: number | null;
  matchMode: MatchMode;
  numericF: NumericFilterState;
  dateF: DateFilterState;
  catF: CategoryFilterState;
  maxRowsScanText: string;
  totalRowCount: number;
  totalFilteredCount: number;
  visibleColIdxs: number[];
  queryError: string | null;
  loadError: string | null;
  lastCrossReactiveSig: string;
  crossQueryResults: { datasetId: string; label: string; filtered: number; total: number }[];
  preMergedHeaders: string[];
  preMergedColTypes: ColType[];
  preMergedTotalRowCount: number;
  preMergedTotalFilteredCount: number;
  colTypes: ColType[];
  svarFilterSet: IFilterSet;
  showSvarBuilder: boolean;
  svarNotice: string | null;
}) {
  return {
    FILTER_DEBOUNCE_MS: state.FILTER_DEBOUNCE_MS,
    buildFilterSpecFromState: state.buildFilterSpecFromState,
    invoke: state.invoke,
    escapeRegExp: state.escapeRegExp,
    queueDebug: state.queueDebug,
    queueDebugRate: state.queueDebugRate,
    recordPerf: state.recordPerf,
    runCrossDatasetQuery: state.runCrossDatasetQuery,
    fetchVisibleSlice: state.fetchVisibleSlice,
    loadState: state.loadState,  // Return loadState by reference
    get headers() { return state.headers; },
    get hasLoaded() { return state.hasLoaded; },
    get suspendReactiveFiltering() { return state.suspendReactiveFiltering; },
    get crossQueryBusy() { return state.crossQueryBusy; },
    get queryScope() { return state.queryScope; },
    get isMergedView() { return state.loadState.isMergedView; },
    set isMergedView(v: boolean) { state.loadState.isMergedView = v; },
    get loadedDatasets() { return state.loadedDatasets; },
    get filterPending() { return state.filterPending; },
    set filterPending(v: boolean) { state.filterPending = v; },
    get filterInFlight() { return state.filterInFlight; },
    set filterInFlight(v: boolean) { state.filterInFlight = v; },
    get filterGate() { return state.filterGate; },
    get filterLastReason() { return state.filterLastReason; },
    set filterLastReason(v: string) { state.filterLastReason = v; },
    get filterTimer() { return state.filterTimer; },
    set filterTimer(v: ReturnType<typeof setTimeout> | null) { state.filterTimer = v; },
    get crossQueryTimer() { return state.crossQueryTimer; },
    set crossQueryTimer(v: ReturnType<typeof setTimeout> | null) { state.crossQueryTimer = v; },
    get query() { return state.query; },
    set query(v: string) { state.query = v; },
    get multiQueryEnabled() { return state.multiQueryEnabled; },
    set multiQueryEnabled(v: boolean) { state.multiQueryEnabled = v; },
    get multiQueryExpanded() { return state.multiQueryExpanded; },
    set multiQueryExpanded(v: boolean) { state.multiQueryExpanded = v; },
    get multiQueryClauses() { return state.multiQueryClauses; },
    set multiQueryClauses(v: MultiQueryClause[]) { state.multiQueryClauses = v; },
    get targetColIdx() { return state.targetColIdx; },
    set targetColIdx(v: number | null) { state.targetColIdx = v; },
    get matchMode() { return state.matchMode; },
    set matchMode(v: 'fuzzy' | 'regex' | 'exact') { state.matchMode = v; },
    get numericF() { return state.numericF; },
    set numericF(v: typeof state.numericF) { state.numericF = v; },
    get dateF() { return state.dateF; },
    set dateF(v: typeof state.dateF) { state.dateF = v; },
    get catF() { return state.catF; },
    set catF(v: typeof state.catF) { state.catF = v; },
    get maxRowsScanText() { return state.maxRowsScanText; },
    get totalRowCount() { return state.totalRowCount; },
    set totalRowCount(v: number) { state.totalRowCount = v; },
    get totalFilteredCount() { return state.totalFilteredCount; },
    set totalFilteredCount(v: number) { state.totalFilteredCount = v; },
    get visibleColIdxs() { return state.visibleColIdxs; },
    get queryError() { return state.queryError; },
    set queryError(v: string | null) { state.queryError = v; },
    get loadError() { return state.loadError; },
    set loadError(v: string | null) { state.loadError = v; },
    get lastCrossReactiveSig() { return state.lastCrossReactiveSig; },
    set lastCrossReactiveSig(v: string) { state.lastCrossReactiveSig = v; },
    get crossQueryResults() { return state.crossQueryResults; },
    set crossQueryResults(v: typeof state.crossQueryResults) { state.crossQueryResults = v; },
    get preMergedHeaders() { return state.preMergedHeaders; },
    get preMergedColTypes() { return state.preMergedColTypes; },
    get preMergedTotalRowCount() { return state.preMergedTotalRowCount; },
    get preMergedTotalFilteredCount() { return state.preMergedTotalFilteredCount; },
    get colTypes() { return state.colTypes; },
    set colTypes(v: ColType[]) { state.colTypes = v; },
    get svarFilterSet() { return state.svarFilterSet; },
    get showSvarBuilder() { return state.showSvarBuilder; },
    set showSvarBuilder(v: boolean) { state.showSvarBuilder = v; },
    get svarNotice() { return state.svarNotice; },
    set svarNotice(v: string | null) { state.svarNotice = v; },
    set headers(v: string[]) { state.headers = v; }
  };
}

export function loadControllerCtxCore(state: {
  invoke: any;
  debugLogger: any;
  dialogMod: DialogMod | null;
  fnv1a32: any;
  heuristicHasHeaders: any;
  computeDatasetIdentity: any;
  upsertWorkspaceDatasetInList: any;
  loadRecipesForDataset: any;
  loadLastStateForDataset: any;
  applyState: any;
  runFilterNow: any;
  buildFilterSpec: any;
  queueDebug: any;
  activateWorkspaceDataset: any;
}) {
  return {
    invoke: state.invoke,
    debugLogger: state.debugLogger,
    dialogMod: state.dialogMod,
    fnv1a32: state.fnv1a32,
    heuristicHasHeaders: state.heuristicHasHeaders,
    computeDatasetIdentity: state.computeDatasetIdentity,
    upsertWorkspaceDatasetInList: state.upsertWorkspaceDatasetInList,
    loadRecipesForDataset: state.loadRecipesForDataset,
    loadLastStateForDataset: state.loadLastStateForDataset,
    applyState: state.applyState,
    runFilterNow: state.runFilterNow,
    buildFilterSpec: state.buildFilterSpec,
    queueDebug: state.queueDebug,
    activateWorkspaceDataset: state.activateWorkspaceDataset
  };
}

export function loadControllerCtxStateMain(state: {
  loadState: {
    headers: string[];
    totalRowCount: number;
    colTypes: ColType[];
    datasetId: string;
    datasetLabel: string;
    hasLoaded: boolean;
    isMergedView: boolean;
    mergedRowsAll: string[][];
    visibleRows: string[][];  // Add visibleRows to type
    totalFilteredCount: number;
  };
  hiddenUploadInput: HTMLInputElement | null;
  isLoading: boolean;
  loadError: string | null;
  hasHeaders: boolean;
  headerMode: 'auto' | 'yes' | 'no';
  headerHeuristicReason: string;
  pendingText: string | null;
  pendingPath: string | null;
  showHeaderPrompt: boolean;
  // Backward compatibility - these read from derived values
  headers: string[];
  totalRowCount: number;
  totalFilteredCount: number;
  visibleRows: string[][];
  colTypes: ColType[];
  datasetId: string;
  datasetLabel: string;
  recipes: Recipe[];
  pendingRestore: RecipeState | null;
  hasLoaded: boolean;  // Derived from loadState
  showDataControls: boolean;
  activeDatasetId: string;
  mergedRowsAll: string[][];  // Derived from loadState
}) {
  return {
    get hiddenUploadInput() { return state.hiddenUploadInput; },
    get isLoading() { return state.isLoading; },
    set isLoading(v: boolean) { state.isLoading = v; },
    get isMergedView() { return state.loadState.isMergedView; },
    set isMergedView(v: boolean) { state.loadState.isMergedView = v; },
    get loadError() { return state.loadError; },
    set loadError(v: string | null) { state.loadError = v; },
    get hasHeaders() { return state.hasHeaders; },
    set hasHeaders(v: boolean) { state.hasHeaders = v; },
    get headerMode() { return state.headerMode; },
    get headerHeuristicReason() { return state.headerHeuristicReason; },
    set headerHeuristicReason(v: string) { state.headerHeuristicReason = v; },
    get pendingText() { return state.pendingText; },
    set pendingText(v: string | null) { state.pendingText = v; },
    get pendingPath() { return state.pendingPath; },
    set pendingPath(v: string | null) { state.pendingPath = v; },
    get showHeaderPrompt() { return state.showHeaderPrompt; },
    set showHeaderPrompt(v: boolean) { state.showHeaderPrompt = v; },
    get headers() { return state.loadState.headers; },
    set headers(v: string[]) { state.loadState.headers = v; },
    get totalRowCount() { return state.loadState.totalRowCount; },
    set totalRowCount(v: number) { state.loadState.totalRowCount = v; },
    get totalFilteredCount() { return state.totalFilteredCount; },
    set totalFilteredCount(v: number) { state.totalFilteredCount = v; },
    get visibleRows() { return state.loadState.visibleRows; },
    set visibleRows(v: string[][]) { state.loadState.visibleRows = v; },
    get colTypes() { return state.loadState.colTypes; },
    set colTypes(v: ColType[]) { state.loadState.colTypes = v; },
    get datasetId() { return state.loadState.datasetId; },
    set datasetId(v: string) { state.loadState.datasetId = v; },
    get datasetLabel() { return state.loadState.datasetLabel; },
    set datasetLabel(v: string) { state.loadState.datasetLabel = v; },
    get recipes() { return state.recipes; },
    set recipes(v: Recipe[]) { state.recipes = v; },
    get pendingRestore() { return state.pendingRestore; },
    set pendingRestore(v: RecipeState | null) { state.pendingRestore = v; },
    get hasLoaded() { return state.loadState.hasLoaded; },
    set hasLoaded(v: boolean) { state.loadState.hasLoaded = v; },
    get showDataControls() { return state.showDataControls; },
    set showDataControls(v: boolean) { state.showDataControls = v; },
    get activeDatasetId() { return state.activeDatasetId; },
    set activeDatasetId(v: string) { state.activeDatasetId = v; },
    get mergedRowsAll() { return state.loadState.mergedRowsAll; },
    set mergedRowsAll(v: string[][]) { state.loadState.mergedRowsAll = v; }
  };
}

export function loadControllerCtxStateQueryAndGrid(state: {
  loadState: any;  // Required: loadState for mutable properties
  loadedDatasets: WorkspaceDataset[];
  query: string;
  matchMode: MatchMode;
  targetColIdx: number | null;
  numericF: NumericFilterState;
  dateF: DateFilterState;
  catF: CategoryFilterState;
  suspendReactiveFiltering: boolean;
  sortColIdx: number | null;
  sortDir: 'asc' | 'desc';
  sortSpecs: { colIdx: number; dir: 'asc' | 'desc' }[];
  visibleColumns: Set<number>;
  pinnedLeft: number[];
  pinnedRight: number[];
  hiddenColumns: number[];
  columnWidths: Record<number, number>;
  crossQueryBusy: boolean;
  queryScope: 'current' | 'all' | 'ask';
  crossQueryResults: { datasetId: string; label: string; filtered: number; total: number }[];
  mergedHeaders: string[];
  mergedRowsAll: string[][];
  preMergedHeaders: string[];
  preMergedColTypes: ColType[];
  preMergedTotalRowCount: number;
  preMergedTotalFilteredCount: number;
}) {
  return {
    get loadedDatasets() { return state.loadedDatasets; },
    set loadedDatasets(v: WorkspaceDataset[]) { state.loadedDatasets = v; },
    get query() { return state.query; },
    get matchMode() { return state.matchMode; },
    get targetColIdx() { return state.targetColIdx; },
    set targetColIdx(v: number | null) { state.targetColIdx = v; },
    get numericF() { return state.numericF; },
    set numericF(v: typeof state.numericF) { state.numericF = v; },
    get dateF() { return state.dateF; },
    set dateF(v: typeof state.dateF) { state.dateF = v; },
    get catF() { return state.catF; },
    set catF(v: typeof state.catF) { state.catF = v; },
    get suspendReactiveFiltering() { return state.suspendReactiveFiltering; },
    set suspendReactiveFiltering(v: boolean) { state.suspendReactiveFiltering = v; },
    get sortColIdx() { return state.sortColIdx; },
    set sortColIdx(v: number | null) { state.sortColIdx = v; },
    get sortDir() { return state.sortDir; },
    set sortDir(v: 'asc' | 'desc') { state.sortDir = v; },
    get sortSpecs() { return state.sortSpecs; },
    set sortSpecs(v: typeof state.sortSpecs) { state.sortSpecs = v; },
    get visibleColumns() { return state.visibleColumns; },
    set visibleColumns(v: Set<number>) { state.visibleColumns = v; },
    get pinnedLeft() { return state.pinnedLeft; },
    set pinnedLeft(v: number[]) { state.pinnedLeft = v; },
    get pinnedRight() { return state.pinnedRight; },
    set pinnedRight(v: number[]) { state.pinnedRight = v; },
    get hiddenColumns() { return state.hiddenColumns; },
    set hiddenColumns(v: number[]) { state.hiddenColumns = v; },
    get columnWidths() { return state.columnWidths; },
    set columnWidths(v: Record<number, number>) { state.columnWidths = v; },
    get crossQueryBusy() { return state.crossQueryBusy; },
    set crossQueryBusy(v: boolean) { state.crossQueryBusy = v; },
    get queryScope() { return state.queryScope; },
    get crossQueryResults() { return state.crossQueryResults; },
    set crossQueryResults(v: typeof state.crossQueryResults) { state.crossQueryResults = v; },
    get mergedHeaders() { return state.mergedHeaders; },
    set mergedHeaders(v: string[]) { state.mergedHeaders = v; },
    get mergedRowsAll() { return state.loadState.mergedRowsAll; },
    set mergedRowsAll(v: string[][]) { state.loadState.mergedRowsAll = v; },
    get preMergedHeaders() { return state.preMergedHeaders; },
    set preMergedHeaders(v: string[]) { state.preMergedHeaders = v; },
    get preMergedColTypes() { return state.preMergedColTypes; },
    set preMergedColTypes(v: ColType[]) { state.preMergedColTypes = v; },
    get preMergedTotalRowCount() { return state.preMergedTotalRowCount; },
    set preMergedTotalRowCount(v: number) { state.preMergedTotalRowCount = v; },
    get preMergedTotalFilteredCount() { return state.preMergedTotalFilteredCount; },
    set preMergedTotalFilteredCount(v: number) { state.preMergedTotalFilteredCount = v; }
  };
}

export function loadControllerCtx(state: {
  loadState: {
    headers: string[];
    totalRowCount: number;
    colTypes: ColType[];
    datasetId: string;
    datasetLabel: string;
    hasLoaded: boolean;
    isMergedView: boolean;
    mergedRowsAll: string[][];
    visibleRows: string[][];
    totalFilteredCount: number;
  };
  invoke: any;
  debugLogger: any;
  dialogMod: DialogMod | null;
  fnv1a32: any;
  heuristicHasHeaders: any;
  computeDatasetIdentity: any;
  upsertWorkspaceDatasetInList: any;
  loadRecipesForDataset: any;
  loadLastStateForDataset: any;
  applyState: any;
  runFilterNow: any;
  buildFilterSpec: any;
  queueDebug: any;
  activateWorkspaceDataset: any;
  hiddenUploadInput: HTMLInputElement | null;
  isLoading: boolean;
  isMergedView: boolean;
  loadError: string | null;
  hasHeaders: boolean;
  headerMode: 'auto' | 'yes' | 'no';
  headerHeuristicReason: string;
  pendingText: string | null;
  pendingPath: string | null;
  showHeaderPrompt: boolean;
  headers: string[];
  totalRowCount: number;
  totalFilteredCount: number;
  visibleRows: string[][];
  colTypes: ColType[];
  datasetId: string;
  datasetLabel: string;
  recipes: Recipe[];
  pendingRestore: RecipeState | null;
  hasLoaded: boolean;
  showDataControls: boolean;
  activeDatasetId: string;
  loadedDatasets: WorkspaceDataset[];
  query: string;
  matchMode: MatchMode;
  targetColIdx: number | null;
  numericF: NumericFilterState;
  dateF: DateFilterState;
  catF: CategoryFilterState;
  suspendReactiveFiltering: boolean;
  sortColIdx: number | null;
  sortDir: 'asc' | 'desc';
  sortSpecs: { colIdx: number; dir: 'asc' | 'desc' }[];
  visibleColumns: Set<number>;
  pinnedLeft: number[];
  pinnedRight: number[];
  hiddenColumns: number[];
  columnWidths: Record<number, number>;
  crossQueryBusy: boolean;
  queryScope: 'current' | 'all' | 'ask';
  crossQueryResults: { datasetId: string; label: string; filtered: number; total: number }[];
  mergedHeaders: string[];
  mergedRowsAll: string[][];
  preMergedHeaders: string[];
  preMergedColTypes: ColType[];
  preMergedTotalRowCount: number;
  preMergedTotalFilteredCount: number;
}) {
  return {
    ...loadControllerCtxCore(state),
    ...loadControllerCtxStateMain(state),
    ...loadControllerCtxStateQueryAndGrid(state)
  };
}

export function gridControllerCtx(state: {
  invoke: any;
  recordPerf: any;
  loadState: any;  // Added: Pass loadState by reference
  hasLoaded: boolean;
  sliceGate: any;
  startIdx: number;
  endIdx: number;
  visibleColIdxs: number[];
  isMergedView: boolean;
  mergedRowsAll: string[][];
  visibleRows: string[][];
  loadError: string | null;
  totalFilteredCount: number;
  sliceTimer: ReturnType<typeof setTimeout> | null;
  headers: string[];
  sortGate: any;
  sortColIdx: number | null;
  sortDir: 'asc' | 'desc';
  sortSpecs: { colIdx: number; dir: 'asc' | 'desc' }[];
  visibleColumns: Set<number>;
  columnPickerNotice: string | null;
  showColumnPicker: boolean;
  hiddenColumns: number[];
  pinnedLeft: number[];
  pinnedRight: number[];
  columnWidths: Record<number, number>;
}) {
  return {
    invoke: state.invoke,
    recordPerf: state.recordPerf,
    loadState: state.loadState,  // Added: Return loadState by reference
    get hasLoaded() { return state.hasLoaded; },
    get sliceGate() { return state.sliceGate; },
    get startIdx() { return state.startIdx; },
    get endIdx() { return state.endIdx; },
    get visibleColIdxs() { return state.visibleColIdxs; },
    get isMergedView() { return state.loadState.isMergedView; },
    get mergedRowsAll() { return state.loadState.mergedRowsAll; },
    set mergedRowsAll(v: string[][]) { state.loadState.mergedRowsAll = v; },
    get visibleRows() { return state.loadState.visibleRows; },
    set visibleRows(v: string[][]) { state.loadState.visibleRows = v; },
    get loadError() { return state.loadError; },
    set loadError(v: string | null) { state.loadError = v; },
    get totalFilteredCount() { return state.totalFilteredCount; },
    get sliceTimer() { return state.sliceTimer; },
    set sliceTimer(v: ReturnType<typeof setTimeout> | null) { state.sliceTimer = v; },
    get headers() { return state.headers; },
    get sortGate() { return state.sortGate; },
    get sortColIdx() { return state.sortColIdx; },
    set sortColIdx(v: number | null) { state.sortColIdx = v; },
    get sortDir() { return state.sortDir; },
    set sortDir(v: 'asc' | 'desc') { state.sortDir = v; },
    get sortSpecs() { return state.sortSpecs; },
    set sortSpecs(v: typeof state.sortSpecs) { state.sortSpecs = v; },
    get visibleColumns() { return state.visibleColumns; },
    set visibleColumns(v: Set<number>) { state.visibleColumns = v; },
    get columnPickerNotice() { return state.columnPickerNotice; },
    set columnPickerNotice(v: string | null) { state.columnPickerNotice = v; },
    get showColumnPicker() { return state.showColumnPicker; },
    set showColumnPicker(v: boolean) { state.showColumnPicker = v; },
    get hiddenColumns() { return state.hiddenColumns; },
    set hiddenColumns(v: number[]) { state.hiddenColumns = v; },
    get pinnedLeft() { return state.pinnedLeft; },
    set pinnedLeft(v: number[]) { state.pinnedLeft = v; },
    get pinnedRight() { return state.pinnedRight; },
    set pinnedRight(v: number[]) { state.pinnedRight = v; },
    get columnWidths() { return state.columnWidths; },
    set columnWidths(v: Record<number, number>) { state.columnWidths = v; }
  };
}

export function rowDrawerControllerCtx(state: {
  invoke: any;
  loadRowDrawerData: any;
  withViewTransition: any;
  recordPerf: any;
  clamp: any;
  scheduleFilter: any;
  runFilterNow: any;
  applyDrawerNumericExact: any;
  applyDrawerDateExact: any;
  copyDrawerAsJsonController: any;
  hasLoaded: boolean;
  headers: string[];
  colTypes: ColType[];
  totalFilteredCount: number;
  showRowDrawer: boolean;
  drawerLoading: boolean;
  drawerError: string | null;
  drawerVisualIdx: number | null;
  drawerKVs: any[];
  drawerSearch: string;
  drawerExplain: any;
  recipeNotice: string | null;
  targetColIdx: number | null;
  tier2Open: boolean;
  tier2Tab: 'numeric' | 'date' | 'category';
  catF: CategoryFilterState;
  numericF: NumericFilterState;
  dateF: DateFilterState;
}) {
  return {
    invoke: state.invoke as any,
    loadRowDrawerData: state.loadRowDrawerData,
    withViewTransition: state.withViewTransition,
    recordPerf: state.recordPerf,
    clamp: state.clamp,
    scheduleFilter: state.scheduleFilter,
    runFilterNow: state.runFilterNow,
    applyDrawerNumericExact: state.applyDrawerNumericExact,
    applyDrawerDateExact: state.applyDrawerDateExact,
    copyDrawerAsJsonController: state.copyDrawerAsJsonController,
    get hasLoaded() { return state.hasLoaded; },
    get headers() { return state.headers; },
    get colTypes() { return state.colTypes; },
    get totalFilteredCount() { return state.totalFilteredCount; },
    get showRowDrawer() { return state.showRowDrawer; },
    set showRowDrawer(v: boolean) { state.showRowDrawer = v; },
    get drawerLoading() { return state.drawerLoading; },
    set drawerLoading(v: boolean) { state.drawerLoading = v; },
    get drawerError() { return state.drawerError; },
    set drawerError(v: string | null) { state.drawerError = v; },
    get drawerVisualIdx() { return state.drawerVisualIdx; },
    set drawerVisualIdx(v: number | null) { state.drawerVisualIdx = v; },
    get drawerKVs() { return state.drawerKVs; },
    set drawerKVs(v: any[]) { state.drawerKVs = v as any; },
    get drawerSearch() { return state.drawerSearch; },
    set drawerSearch(v: string) { state.drawerSearch = v; },
    get drawerExplain() { return state.drawerExplain; },
    set drawerExplain(v: any) { state.drawerExplain = v; },
    get recipeNotice() { return state.recipeNotice; },
    set recipeNotice(v: string | null) { state.recipeNotice = v; },
    get targetColIdx() { return state.targetColIdx; },
    set targetColIdx(v: number | null) { state.targetColIdx = v; },
    get tier2Open() { return state.tier2Open; },
    set tier2Open(v: boolean) { state.tier2Open = v; },
    get tier2Tab() { return state.tier2Tab; },
    set tier2Tab(v: 'numeric' | 'date' | 'category') { state.tier2Tab = v; },
    get catF() { return state.catF; },
    set catF(v: typeof state.catF) { state.catF = v; },
    get numericF() { return state.numericF; },
    set numericF(v: typeof state.numericF) { state.numericF = v; },
    get dateF() { return state.dateF; },
    set dateF(v: typeof state.dateF) { state.dateF = v; }
  };
}

export function modalUiCtx(state: {
  withViewTransition: any;
  modalPos: Record<string, { x: number; y: number }>;
  dragState: { key: string; sx: number; sy: number; ox: number; oy: number } | null;
  recipeNotice: string | null;
  showRecipeModal: boolean;
  showShortcuts: boolean;
  showSvarBuilder: boolean;
  showRegexGenerator: boolean;
  genTab: GenTab;
}) {
  return {
    withViewTransition: state.withViewTransition,
    modalPos: state.modalPos,
    setModalPos: (next: typeof state.modalPos) => {
      state.modalPos = next;
    },
    dragState: state.dragState,
    setDragState: (next: typeof state.dragState) => {
      state.dragState = next;
    },
    setRecipeNotice: (v: string | null) => {
      state.recipeNotice = v;
    },
    setShowRecipeModal: (v: boolean) => {
      state.showRecipeModal = v;
    },
    setShowShortcuts: (v: boolean) => {
      state.showShortcuts = v;
    },
    setShowSvarBuilder: (v: boolean) => {
      state.showSvarBuilder = v;
    },
    setShowRegexGenerator: (v: boolean) => {
      state.showRegexGenerator = v;
    },
    setGenTab: (v: typeof state.genTab) => {
      state.genTab = v;
    }
  };
}

export function recipesControllerCtx(state: {
  RECIPES_STORE_KEY: string;
  LEGACY_RECIPES_STORE_KEYS: string[];
  LAST_STATE_STORE_KEY: string;
  LEGACY_LAST_STATE_KEYS: string[];
  loadRecipesForDatasetFromStore: any;
  persistRecipesForDatasetToStore: any;
  loadLastStateForDatasetFromStore: any;
  persistLastStateForDatasetToStore: any;
  buildRecipeExportBlob: any;
  mergeImportedRecipes: any;
  toCsvText: any;
  downloadText: any;
  newRecipeId: any;
  captureState: any;
  applyState: any;
  persistRecipesForDataset: any;
  autoRestoreEnabled: boolean;
  datasetId: string;
  datasetLabel: string;
  recipes: Recipe[];
  recipeNotice: string | null;
  hasLoaded: boolean;
  headers: string[];
  visibleRows: string[][];
  visibleColIdxs: number[];
  totalFilteredCount: number;
  activeFilterHash: any;
  schemaStats: SchemaColStat[];
  perf: any;
  invoke: any;
  recipeName: string;
  recipeTags: string;
}) {
  return {
    RECIPES_STORE_KEY: state.RECIPES_STORE_KEY,
    LEGACY_RECIPES_STORE_KEYS: state.LEGACY_RECIPES_STORE_KEYS,
    LAST_STATE_STORE_KEY: state.LAST_STATE_STORE_KEY,
    LEGACY_LAST_STATE_KEYS: state.LEGACY_LAST_STATE_KEYS,
    loadRecipesForDatasetFromStore: state.loadRecipesForDatasetFromStore,
    persistRecipesForDatasetToStore: state.persistRecipesForDatasetToStore,
    loadLastStateForDatasetFromStore: state.loadLastStateForDatasetFromStore,
    persistLastStateForDatasetToStore: state.persistLastStateForDatasetToStore,
    buildRecipeExportBlob: state.buildRecipeExportBlob,
    mergeImportedRecipes: state.mergeImportedRecipes,
    toCsvText: state.toCsvText,
    downloadText: state.downloadText,
    newRecipeId: state.newRecipeId,
    captureState: state.captureState,
    applyState: state.applyState,
    persistRecipesForDataset: state.persistRecipesForDataset,
    get autoRestoreEnabled() { return state.autoRestoreEnabled; },
    set autoRestoreEnabled(v: boolean) { state.autoRestoreEnabled = v; },
    get datasetId() { return state.datasetId; },
    get datasetLabel() { return state.datasetLabel; },
    get recipes() { return state.recipes; },
    set recipes(v: Recipe[]) { state.recipes = v; },
    get recipeNotice() { return state.recipeNotice; },
    set recipeNotice(v: string | null) { state.recipeNotice = v; },
    get hasLoaded() { return state.hasLoaded; },
    get headers() { return state.headers; },
    get visibleRows() { return state.visibleRows; },
    get visibleColIdxs() { return state.visibleColIdxs; },
    get totalFilteredCount() { return state.totalFilteredCount; },
    activeFilterHash: state.activeFilterHash,
    get schemaStats() { return state.schemaStats; },
    get perf() { return state.perf; },
    get invoke() { return state.invoke; },
    get recipeName() { return state.recipeName; },
    set recipeName(v: string) { state.recipeName = v; },
    get recipeTags() { return state.recipeTags; },
    set recipeTags(v: string) { state.recipeTags = v; }
  };
}

export function schemaControllerCtx(state: {
  invoke: any;
  withViewTransition: any;
  profileSchemaFromRows: any;
  parseMaxRowsScanText: any;
  recordPerf: any;
  activeFilterHash: any;
  hasLoaded: boolean;
  headers: string[];
  query: string;
  matchMode: MatchMode;
  targetColIdx: number | null;
  schemaLoading: boolean;
  schemaError: string | null;
  schemaScopeLabel: 'full' | 'filtered';
  schemaSampleTier: 'fast' | 'balanced' | 'full';
  schemaSampleN: number;
  totalFilteredCount: number;
  totalRowCount: number;
  datasetId: string;
  schemaCache: Map<string, SchemaColStat[]>;
  schemaStats: SchemaColStat[];
  colTypes: ColType[];
  showSchemaModal: boolean;
  schemaDriftBaseline: SchemaColStat[] | null;
  recipeNotice: string | null;
  categoryGate: any;
  catF: CategoryFilterState;
  catAvailItems: { value: string; count: number }[];
  catAvailOffset: number;
  catAvailDistinctTotal: number;
  catAvailRowsScanned: number;
  catAvailTotalRowsInView: number;
  catAvailPartial: boolean;
  catAvailError: string | null;
  catAvailLoading: boolean;
  catAvailSearch: string;
  catAvailLimit: number;
  maxRowsScanText: string;
  catAvailTimer: ReturnType<typeof setTimeout> | null;
}) {
  return {
    invoke: state.invoke,
    withViewTransition: state.withViewTransition,
    profileSchemaFromRows: state.profileSchemaFromRows,
    parseMaxRowsScanText: state.parseMaxRowsScanText,
    recordPerf: state.recordPerf,
    activeFilterHash: state.activeFilterHash,
    get hasLoaded() { return state.hasLoaded; },
    get headers() { return state.headers; },
    get query() { return state.query; },
    get matchMode() { return state.matchMode; },
    get targetColIdx() { return state.targetColIdx; },
    get schemaLoading() { return state.schemaLoading; },
    set schemaLoading(v: boolean) { state.schemaLoading = v; },
    get schemaError() { return state.schemaError; },
    set schemaError(v: string | null) { state.schemaError = v; },
    get schemaScopeLabel() { return state.schemaScopeLabel; },
    set schemaScopeLabel(v: 'full' | 'filtered') { state.schemaScopeLabel = v; },
    get schemaSampleTier() { return state.schemaSampleTier; },
    get schemaSampleN() { return state.schemaSampleN; },
    get totalFilteredCount() { return state.totalFilteredCount; },
    get totalRowCount() { return state.totalRowCount; },
    get datasetId() { return state.datasetId; },
    get schemaCache() { return state.schemaCache; },
    get schemaStats() { return state.schemaStats; },
    set schemaStats(v: SchemaColStat[]) { state.schemaStats = v; },
    get colTypes() { return state.colTypes; },
    get showSchemaModal() { return state.showSchemaModal; },
    set showSchemaModal(v: boolean) { state.showSchemaModal = v; },
    get schemaDriftBaseline() { return state.schemaDriftBaseline; },
    set schemaDriftBaseline(v: SchemaColStat[] | null) { state.schemaDriftBaseline = v; },
    get recipeNotice() { return state.recipeNotice; },
    set recipeNotice(v: string | null) { state.recipeNotice = v; },
    get categoryGate() { return state.categoryGate; },
    get catF() { return state.catF; },
    get catAvailItems() { return state.catAvailItems; },
    set catAvailItems(v: { value: string; count: number }[]) { state.catAvailItems = v; },
    get catAvailOffset() { return state.catAvailOffset; },
    set catAvailOffset(v: number) { state.catAvailOffset = v; },
    get catAvailDistinctTotal() { return state.catAvailDistinctTotal; },
    set catAvailDistinctTotal(v: number) { state.catAvailDistinctTotal = v; },
    get catAvailRowsScanned() { return state.catAvailRowsScanned; },
    set catAvailRowsScanned(v: number) { state.catAvailRowsScanned = v; },
    get catAvailTotalRowsInView() { return state.catAvailTotalRowsInView; },
    set catAvailTotalRowsInView(v: number) { state.catAvailTotalRowsInView = v; },
    get catAvailPartial() { return state.catAvailPartial; },
    set catAvailPartial(v: boolean) { state.catAvailPartial = v; },
    get catAvailError() { return state.catAvailError; },
    set catAvailError(v: string | null) { state.catAvailError = v; },
    get catAvailLoading() { return state.catAvailLoading; },
    set catAvailLoading(v: boolean) { state.catAvailLoading = v; },
    get catAvailSearch() { return state.catAvailSearch; },
    get catAvailLimit() { return state.catAvailLimit; },
    get maxRowsScanText() { return state.maxRowsScanText; },
    get catAvailTimer() { return state.catAvailTimer; },
    set catAvailTimer(v: ReturnType<typeof setTimeout> | null) { state.catAvailTimer = v; }
  };
}

export function schemaInsightsCtx(state: {
  targetColIdx: number | null;
  tier2Open: boolean;
  tier2Tab: 'numeric' | 'date' | 'category';
  catF: CategoryFilterState;
  numericF: NumericFilterState;
  dateF: DateFilterState;
  schemaStats: SchemaColStat[];
  runFilterNow: any;
}) {
  return {
    get targetColIdx() { return state.targetColIdx; },
    set targetColIdx(v: number | null) { state.targetColIdx = v; },
    get tier2Open() { return state.tier2Open; },
    set tier2Open(v: boolean) { state.tier2Open = v; },
    get tier2Tab() { return state.tier2Tab; },
    set tier2Tab(v: 'numeric' | 'date' | 'category') { state.tier2Tab = v; },
    get catF() { return state.catF; },
    set catF(v: typeof state.catF) { state.catF = v; },
    get numericF() { return state.numericF; },
    set numericF(v: typeof state.numericF) { state.numericF = v; },
    get dateF() { return state.dateF; },
    set dateF(v: typeof state.dateF) { state.dateF = v; },
    get schemaStats() { return state.schemaStats; },
    runFilterNow: state.runFilterNow
  };
}

export function stateControllerCtx(state: {
  captureRecipeState: any;
  migrateAndNormalizeRecipeState: any;
  invoke: any;
  runFilterNow: any;
  autoRestoreEnabled: boolean;
  query: string;
  multiQueryEnabled: boolean;
  multiQueryExpanded: boolean;
  multiQueryClauses: MultiQueryClause[];
  matchMode: MatchMode;
  targetColIdx: number | null;
  maxRowsScanText: string;
  numericF: NumericFilterState;
  dateF: DateFilterState;
  catF: CategoryFilterState;
  sortColIdx: number | null;
  sortDir: 'asc' | 'desc';
  sortSpecs: { colIdx: number; dir: 'asc' | 'desc' }[];
  visibleColumns: Set<number>;
  pinnedLeft: number[];
  pinnedRight: number[];
  hiddenColumns: number[];
  columnWidths: Record<number, number>;
  headers: string[];
}) {
  return {
    captureRecipeState: state.captureRecipeState,
    migrateAndNormalizeRecipeState: state.migrateAndNormalizeRecipeState,
    invoke: state.invoke,
    runFilterNow: state.runFilterNow,
    get autoRestoreEnabled() { return state.autoRestoreEnabled; },
    set autoRestoreEnabled(v: boolean) { state.autoRestoreEnabled = v; },
    get query() { return state.query; },
    set query(v: string) { state.query = v; },
    get multiQueryEnabled() { return state.multiQueryEnabled; },
    set multiQueryEnabled(v: boolean) { state.multiQueryEnabled = v; },
    get multiQueryExpanded() { return state.multiQueryExpanded; },
    set multiQueryExpanded(v: boolean) { state.multiQueryExpanded = v; },
    get multiQueryClauses() { return state.multiQueryClauses; },
    set multiQueryClauses(v: MultiQueryClause[]) { state.multiQueryClauses = v; },
    get matchMode() { return state.matchMode; },
    set matchMode(v: 'fuzzy' | 'regex' | 'exact') { state.matchMode = v; },
    get targetColIdx() { return state.targetColIdx; },
    set targetColIdx(v: number | null) { state.targetColIdx = v; },
    get maxRowsScanText() { return state.maxRowsScanText; },
    set maxRowsScanText(v: string) { state.maxRowsScanText = v; },
    get numericF() { return state.numericF; },
    set numericF(v: typeof state.numericF) { state.numericF = v; },
    get dateF() { return state.dateF; },
    set dateF(v: typeof state.dateF) { state.dateF = v; },
    get catF() { return state.catF; },
    set catF(v: typeof state.catF) { state.catF = v; },
    get sortColIdx() { return state.sortColIdx; },
    set sortColIdx(v: number | null) { state.sortColIdx = v; },
    get sortDir() { return state.sortDir; },
    set sortDir(v: 'asc' | 'desc') { state.sortDir = v; },
    get sortSpecs() { return state.sortSpecs; },
    set sortSpecs(v: typeof state.sortSpecs) { state.sortSpecs = v; },
    get visibleColumns() { return state.visibleColumns; },
    set visibleColumns(v: Set<number>) { state.visibleColumns = v; },
    get pinnedLeft() { return state.pinnedLeft; },
    set pinnedLeft(v: number[]) { state.pinnedLeft = v; },
    get pinnedRight() { return state.pinnedRight; },
    set pinnedRight(v: number[]) { state.pinnedRight = v; },
    get hiddenColumns() { return state.hiddenColumns; },
    set hiddenColumns(v: number[]) { state.hiddenColumns = v; },
    get columnWidths() { return state.columnWidths; },
    set columnWidths(v: Record<number, number>) { state.columnWidths = v; },
    get headers() { return state.headers; }
  };
}
