<script lang="ts">
  import { onMount } from "svelte";
  import { invoke } from "@tauri-apps/api/core";
  import NumberFlow from "@number-flow/svelte";
  import { type IFilterSet } from "@svar-ui/svelte-filter";
  import { devLog } from "$lib/utils/devLog";
  import InspectorTopControlsPanel from "$lib/components/inspector/InspectorTopControlsPanel.svelte";
  import InspectorMainGridPanel from "$lib/components/inspector/InspectorMainGridPanel.svelte";
  import InspectorFooterBars from "$lib/components/inspector/InspectorFooterBars.svelte";
  import InspectorOverlayPanel from "$lib/components/inspector/InspectorOverlayPanel.svelte";
  import {
    aa,
    withViewTransition,
    recordPerf as recordPerfUtil,
    clamp,
  } from "$lib/components/inspector/InspectorOrchestratorUtils";
  import {
    INSPECTOR_THEME,
    regexTemplates,
    fmtDate,
    parseDateRelaxed,
    parseF64Relaxed,
    profileSchemaFromRows,
    PerfRecorder,
    createRequestGate,
    computeDatasetIdentity,
    hasLoadedDatasetSignals,
    heuristicHasHeaders,
    upsertWorkspaceDatasetInList,
    buildFilterSpecFromState,
    parseMaxRowsScanText,
    applySvarBuilderToFiltersController,
    buildFilterSpecController,
    clearAllFiltersController,
    drainFilterQueueController,
    onQueryScopeChangeController,
    runFilterNowController,
    scheduleCrossQueryController,
    scheduleFilterController,
    activateWorkspaceDatasetController,
    loadCsvFromPathController,
    loadCsvFromTextController,
    openFallbackLoadFromMenuController,
    openStreamLoadFromMenuController,
    runCrossDatasetQueryController,
    unloadWorkspaceDatasetController,
    upsertWorkspaceDatasetController,
    clearColumnSelectionController,
    fetchVisibleSliceController,
    hideColumnController,
    onColumnResizeController,
    openColumnPickerController,
    requestSortController,
    scheduleSliceFetchController,
    selectAllColumnsController,
    smartSelectColumnsController,
    togglePinLeftController,
    togglePinRightController,
    toggleVisibleColController,
    applyRecipeController2,
    deleteRecipeController2,
    exportAnalysisBundleController,
    exportCsvPresetController,
    exportRecipesCurrentController,
    importRecipesFileController2,
    loadLastStateForDatasetController2,
    loadRecipesForDatasetController2,
    persistLastStateForDatasetController2,
    persistRecipesForDatasetController2,
    saveCurrentAsRecipeController2,
    toggleRecipeFavoriteController2,
    closeRowDrawerController2,
    copyDrawerAsJsonController3,
    drawerApplyCategoryController2,
    drawerApplyDateExactController3,
    drawerApplyNumericExactController3,
    drawerApplyTargetController2,
    navRowController2,
    openRowDrawerController3,
    computeSchemaStatsController2,
    fetchCategoryValuesController2,
    openSchemaController2,
    scheduleFetchCategoryController2,
    setSchemaDriftBaselineController2,
    computeSchemaDrift,
    computeSchemaOutliers,
    computeSchemaRelationshipHints,
    computeSchemaSuggested,
    schemaActionCategoryController,
    schemaActionDateRangeController,
    schemaActionNumericRangeController,
    schemaActionTargetController,
    applyStateController2,
    captureStateController2,
    buildRecipeExportBlob,
    captureRecipeState,
    downloadText,
    loadLastStateForDatasetFromStore,
    loadRecipesForDatasetFromStore,
    mergeImportedRecipes,
    migrateAndNormalizeRecipeState,
    newRecipeId,
    persistLastStateForDatasetToStore,
    persistRecipesForDatasetToStore,
    toCsvText,
    applyDrawerDateExact,
    applyDrawerNumericExact,
    copyDrawerAsJsonController,
    loadRowDrawerData,
    createInspectorDebugLogger,
    mountInspectorLifecycle,
    analyzeRegex,
    computeActiveFilterHash,
    escapeHtml,
    escapeRegExp,
    fnv1a32,
    multiQueryHighlightRegexes,
    newMultiQueryClause,
    registerContextMenu,
  } from "$lib/components/inspector/InspectorOrchestratorDeps";
  import type {
    BuildMode,
    Clause,
    ClauseKind,
    GenTab,
    RecipeStateV3,
    Recipe,
    RecipeState,
    MultiQueryClause,
    LoadControllerContext,
  } from "$lib/components/inspector/InspectorOrchestratorDeps";
  import {
    beginModalDrag,
    floatingModalStyle,
    openRecipesModal,
    openRegexGeneratorModal,
    openShortcutsModal,
    openSvarBuilderModal,
    resetModalPosition,
  } from "$lib/components/inspector/InspectorModalUiController";
  import {
    addMultiQueryClause,
    removeMultiQueryClause,
    setMultiQueryEnabled,
    setMultiQueryExpanded,
    updateMultiQueryClause,
  } from "$lib/components/inspector/InspectorMultiQueryUiController";
  import {
    addRegexGeneratorClause,
    applyGeneratedRegexUi,
    buildRegexGeneratorOutput,
    defaultRegexClauses,
    moveRegexGeneratorClause,
    regexGeneratorMatches,
    regexGeneratorWarnings,
    removeRegexGeneratorClause,
    validateRegexGenerator,
  } from "$lib/components/inspector/InspectorRegexGeneratorUiController";
  import { buildInspectorContextMenu } from "$lib/components/inspector/InspectorMenuController";
  import { highlightCell as highlightCellCore } from "$lib/components/inspector/InspectorOrchestratorHighlight";
  import {
    setupShowDataControlsEffect,
    setupSliceFetchEffect,
    setupReactiveFilterEffect,
    setupCrossQueryEffect,
    setupPersistStateEffect,
  } from "$lib/components/inspector/InspectorOrchestratorEffects.svelte";
  import {
    setupUiAnimDurEffect,
    setupQuietBackendLogsEffect,
    setupContextMenuEffect,
    setupCategoryColumnChangeEffect,
    setupCategorySearchEffect,
    setupGridWindowInitEffect,
  } from "$lib/components/inspector/InspectorOrchestratorEffectsUi.svelte";
  import {
    filterControllerCtx as buildFilterControllerCtx,
    loadControllerCtxCore as buildLoadControllerCtxCore,
    loadControllerCtxStateMain as buildLoadControllerCtxStateMain,
    loadControllerCtxStateQueryAndGrid as buildLoadControllerCtxStateQueryAndGrid,
    loadControllerCtx as buildLoadControllerCtx,
    gridControllerCtx as buildGridControllerCtx,
    rowDrawerControllerCtx as buildRowDrawerControllerCtx,
    modalUiCtx as buildModalUiCtx,
    recipesControllerCtx as buildRecipesControllerCtx,
    schemaControllerCtx as buildSchemaControllerCtx,
    schemaInsightsCtx as buildSchemaInsightsCtx,
    stateControllerCtx as buildStateControllerCtx,
  } from "$lib/components/inspector/InspectorOrchestratorContexts";
  type DialogMod = typeof import("@tauri-apps/plugin-dialog");
  type ColType = "numeric" | "date" | "string";
  type LoadResp = {
    headers: string[];
    rowCount: number;
    colTypes?: ColType[];
    filteredCount?: number;
  };
  type SliceResp = { rows: string[][] } | string[][];
  type DatasetSource =
    | { kind: "text"; text: string }
    | { kind: "path"; path: string };
  type WorkspaceDataset = {
    id: string;
    label: string;
    hasHeaders: boolean;
    source: DatasetSource;
  };
  const ROW_HEIGHT = INSPECTOR_THEME.grid.rowHeight;
  const OVERSCAN = INSPECTOR_THEME.grid.overscan;
  const MAX_WINDOW_ABS = INSPECTOR_THEME.grid.maxWindowAbs;
  let uiAnimDur = $state(160);
  const perf = new PerfRecorder();
  const SLO_P95_MS = {
    filter: 180,
    slice: 60,
    sort: 250,
    schema: 350,
    category: 120,
    row_drawer: 180,
  } as const;
  const recordPerf = (
    op: "filter" | "slice" | "sort" | "schema" | "category" | "row_drawer",
    started: number,
    meta?: Record<string, unknown>,
  ) => recordPerfUtil(perf, SLO_P95_MS, op, started, meta);
  const filterGate = createRequestGate();
  const sliceGate = createRequestGate();
  const sortGate = createRequestGate();
  const categoryGate = createRequestGate();
  
  // Create a state object that controllers can mutate
  const loadStateId = Math.random().toString(36);  // Unique ID for debugging
  const loadState = $state({
    _id: loadStateId,  // Debug: track which loadState object this is
    headers: [] as string[],
    totalRowCount: 0,
    colTypes: [] as ColType[],
    datasetId: "",
    datasetLabel: "(none)",
    hasLoaded: false,
    isMergedView: false,
    mergedRowsAll: [] as string[][],
    totalFilteredCount: 0,
    visibleRows: [] as string[][],  // Add visibleRows to loadState for mutability
  });
  
  // Function to update visibleRows that triggers reactivity
  function updateVisibleRows(rows: string[][]) {
    loadState.visibleRows = rows;
  }
  
  // Create derived variables for backward compatibility
  let headers = $derived(loadState.headers);
  let totalRowCount = $derived(loadState.totalRowCount);
  let colTypes = $derived(loadState.colTypes);
  let datasetId = $derived(loadState.datasetId);
  let datasetLabel = $derived(loadState.datasetLabel);
  let hasLoaded = $derived(loadState.hasLoaded);
  let isMergedView = $derived(loadState.isMergedView);
  let mergedRowsAll = $derived(loadState.mergedRowsAll);
  let totalFilteredCount = $derived(loadState.totalFilteredCount);
  let visibleRows = $derived(loadState.visibleRows);
  
  let loadedDatasets = $state<WorkspaceDataset[]>([]);
  let activeDatasetId = $state<string>("");
  let activeDatasetLabel = $derived.by(() => {
    const active = (loadedDatasets ?? []).find((d) => d.id === activeDatasetId);
    return (
      ((active?.label || datasetLabel || "(active dataset)") ?? "").trim() ||
      "(active dataset)"
    );
  });
  let queryScope = $state<"current" | "all" | "ask">("current");
  let crossQueryBusy = $state(false);
  let crossQueryResults = $state<
    { datasetId: string; label: string; filtered: number; total: number }[]
  >([]);
  let mergedHeaders = $state<string[]>([]);
  // isMergedView and mergedRowsAll now in loadState
  let preMergedHeaders = $state<string[]>([]);
  let preMergedColTypes = $state<ColType[]>([]);
  let preMergedTotalRowCount = $state(0);
  let preMergedTotalFilteredCount = $state(0);
  let hiddenUploadInput = $state<HTMLInputElement | null>(null);
  let suspendReactiveFiltering = $state(false);
  let headerIndexMap = $derived.by(() => {
    const m = new Map<string, number>();
    for (let i = 0; i < (headers ?? []).length; i++) m.set(headers[i], i);
    return m;
  });
  type SchemaColStat = {
    idx: number;
    name: string;
    type: ColType;
    empty: number;
    nonEmpty: number;
    emptyPct: number;
    typeConfidence: number;
    numericParseRate: number;
    dateParseRate: number;
    distinctSample: number;
    distinctRatio: number;
    entropyNorm: number;
    topSample: { v: string; n: number }[];
    min?: string;
    max?: string;
  };
  let showSchemaModal = $state(false);
  let schemaLoading = $state(false);
  let schemaError = $state<string | null>(null);
  let schemaSearch = $state("");
  let schemaSampleN = $state(2000);
  let schemaSampleTier = $state<"fast" | "balanced" | "full">("balanced");
  let schemaStats = $state<SchemaColStat[]>([]);
  let schemaScopeLabel = $state<"full" | "filtered">("full");
  const schemaCache = new Map<string, SchemaColStat[]>();
  let schemaSearchQ = $derived.by(() =>
    (schemaSearch ?? "").toLowerCase().trim(),
  );
  let schemaFiltered = $derived.by(() => {
    const q = schemaSearchQ;
    const base = schemaStats ?? [];
    if (!q) return base;
    return base.filter((s) =>
      `${s.idx} ${s.name} ${s.type}`.toLowerCase().includes(q),
    );
  });
  let schemaSuggested = $derived.by(() =>
    computeSchemaSuggested(schemaStats ?? []),
  );
  let schemaOutliers = $derived.by(() =>
    computeSchemaOutliers(schemaStats ?? []),
  );
  let schemaRelationshipHints = $derived.by(() =>
    computeSchemaRelationshipHints(schemaStats ?? []),
  );
  let schemaDriftBaseline = $state<SchemaColStat[] | null>(null);
  let schemaDrift = $derived.by(() =>
    computeSchemaDrift(schemaStats ?? [], schemaDriftBaseline ?? null),
  );
  let sortColIdx = $state<number | null>(null);
  let sortDir = $state<"asc" | "desc">("asc");
  let sortSpecs = $state<{ colIdx: number; dir: "asc" | "desc" }[]>([]);
  let sortPriority = $derived.by(() => {
    const out: Record<number, number> = {};
    for (let i = 0; i < (sortSpecs ?? []).length; i++)
      out[sortSpecs[i].colIdx] = i;
    return out;
  });
  let pinnedLeft = $state<number[]>([]);
  let pinnedRight = $state<number[]>([]);
  let hiddenColumns = $state<number[]>([]);
  let columnWidths = $state<Record<number, number>>({});
  let showShortcuts = $state(false);
  let quietBackendLogs = $state(true);
  let modalPos = $state<Record<string, { x: number; y: number }>>({
    recipes: { x: 0, y: 0 },
    schema: { x: 0, y: 0 },
    shortcuts: { x: 0, y: 0 },
    svar: { x: 0, y: 0 },
  });
  let dragState = $state<{
    key: string;
    sx: number;
    sy: number;
    ox: number;
    oy: number;
  } | null>(null);
  type MatchMode = "fuzzy" | "exact" | "regex";
  let query = $state("");
  let matchMode = $state<MatchMode>("fuzzy");
  let multiQueryEnabled = $state(false);
  let multiQueryExpanded = $state(false);
  let multiQueryClauses = $state<MultiQueryClause[]>([newMultiQueryClause(0)]);
  let targetColIdx = $state<number | null>(null);
  let maxRowsScanText = $state<string>("");
  let queryError = $state<string | null>(null);
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
  let tier2Open = $state(false);
  let tier2Tab = $state<"numeric" | "date" | "category">("numeric");
  let numericF = $state<NumericFilterState>({
    enabled: false,
    colIdx: null,
    minText: "",
    maxText: "",
    error: null,
  });
  let dateF = $state<DateFilterState>({
    enabled: false,
    colIdx: null,
    minIso: "",
    maxIso: "",
    error: null,
  });
  let catF = $state<CategoryFilterState>({
    enabled: false,
    colIdx: null,
    selected: new Set(),
  });
  let catSearch = $state("");
  let catAvailSearch = $state("");
  type CatAvailItem = { value: string; count: number };
  let catAvailItems = $state<CatAvailItem[]>([]);
  let catAvailOffset = $state(0);
  let catAvailLimit = $state(200);
  let catAvailDistinctTotal = $state(0);
  let catAvailRowsScanned = $state(0);
  let catAvailTotalRowsInView = $state(0);
  let catAvailPartial = $state(false);
  let catAvailLoading = $state(false);
  let catAvailError = $state<string | null>(null);
  let catAvailTimer: any = null;
  let filterTimer: any = null;
  let crossQueryTimer: any = null;
  let sliceTimer: any = null;
  const FILTER_DEBOUNCE_MS = 120;
  let filterInFlight = $state(false);
  let filterPending = false;
  let filterLastReason = "unknown";
  type GridWindow = {
    startIdx: number;
    endIdx: number;
    renderedCount: number;
    translateY: number;
    phantomHeight: number;
    maxWindow: number;
    sliceLabel: string;
  };
  let gridWindow = $state<GridWindow>({
    startIdx: 0,
    endIdx: 0,
    renderedCount: 0,
    translateY: 0,
    phantomHeight: 0,
    maxWindow: 0,
    sliceLabel: "Slice: 0-0",
  });
  // hasLoaded is now in loadState
  let showDataControls = $state(true);  // Always show menu (contains file upload, shortcuts, etc.)
  let showControlsDebug = $state(false);
  let isLoading = $state(false);
  let loadError = $state<string | null>(null);
  type HeaderMode = "auto" | "yes" | "no";
  let headerMode = $state<HeaderMode>("auto");
  let hasHeaders = $state(true);
  let showHeaderPrompt = $state(false);
  let headerHeuristicReason = $state("");
  let pendingText: string | null = null;
  let pendingPath: string | null = null;
  let showColumnPicker = $state(false);
  let visibleColumns = $state<Set<number>>(new Set());
  let columnPickerNotice = $state<string | null>(null);
  type KeyValue = {
    key: string;
    value: string;
    idx: number | null;
    type: ColType | null;
  };
  let showRowDrawer = $state(false);
  let drawerLoading = $state(false);
  let drawerError = $state<string | null>(null);
  let drawerVisualIdx = $state<number | null>(null);
  let drawerKVs = $state<KeyValue[]>([]);
  let drawerSearch = $state("");
  let drawerExplain = $state<{
    passes: boolean;
    reasons: string[];
    sourceRowIdx: number;
  } | null>(null);
  let drawerNeedle = $derived.by(() =>
    (drawerSearch ?? "").toLowerCase().trim(),
  );
  let drawerList = $derived.by(() => {
    const needle = drawerNeedle;
    const base = drawerKVs ?? [];
    if (!needle) return base;
    return base.filter(
      (kv) =>
        (kv.key ?? "").toLowerCase().includes(needle) ||
        (kv.value ?? "").toLowerCase().includes(needle),
    );
  });
  const RECIPES_STORE_KEY = "inspector.recipes.store.v3";
  const LAST_STATE_STORE_KEY = "inspector.last_state.store.v3";
  const LEGACY_RECIPES_STORE_KEYS = ["inspector.recipes.store.v2"];
  const LEGACY_LAST_STATE_KEYS = ["inspector.last_state.store.v2"];
  let autoRestoreEnabled = $state(true);
  let recipes = $state<Recipe[]>([]);
  let showRecipeModal = $state(false);
  let recipeName = $state("");
  let recipeTags = $state("");
  let recipeNotice = $state<string | null>(null);
  let importMode = $state<"current" | "file">("current");
  let pendingRestore: RecipeState | null = null;
  let regexHints = $derived.by(() =>
    matchMode === "regex" ? analyzeRegex(query) : [],
  );
  let regexDanger = $derived.by(() =>
    regexHints.some((h) => h.level === "danger"),
  );
  let showRegexHelp = $state(false);
  let showRegexGenerator = $state(false);
  let showSvarBuilder = $state(false);
  let svarFilterSet = $state<IFilterSet>({ glue: "and", rules: [] });
  let svarNotice = $state<string | null>(null);
  let debugLogEnabled = $state(true);
  let debugLogPath = $state<string>("");
  let lastGridWindowSig = $state("");
  let lastCrossReactiveSig = $state("");
  let isTauri = $state(false);
  let canOpenPath = $state(false);
  let dialogMod = $state<DialogMod | null>(null);
  let prefersReducedMotion = $state(false);
  let mergedRowFxEnabled = $derived.by(
    () =>
      !prefersReducedMotion &&
      !crossQueryBusy &&
      (visibleRows?.length ?? 0) <= 260,
  );
  let autoAnimateDuration = $derived.by(() => {
    if (prefersReducedMotion) return 0;
    if (crossQueryBusy || totalFilteredCount > 200_000) return 90;
    if (totalFilteredCount > 50_000) return 120;
    if (totalFilteredCount > 10_000) return 145;
    return 180;
  });
  const topControlSpans = {
    headers: "col-span-12 md:col-span-6 lg:col-span-3 md:row-start-1",
    target: "col-span-12 md:col-span-6 lg:col-span-3 md:row-start-1",
    match: "hidden",
    scope: "hidden",
    query: "hidden",
    options: "col-span-12 md:col-span-8 lg:col-span-4 md:row-start-1",
    maxScan: "col-span-12 md:col-span-4 lg:col-span-2 md:row-start-1",
  } as Record<string, string>;
  let visibleColIdxs = $derived.by(() => {
    const n = headers.length;
    if (!n) return [];
    const sourceIdx = headers.indexOf("_source_file");
    const defaultCols = () => {
      if (n > 50) {
        const set = new Set<number>();
        set.add(0);
        for (let i = 0; i < Math.min(n, 12); i++) set.add(i);
        return [...set].filter((i) => i !== sourceIdx).sort((a, b) => a - b);
      }
      return Array.from({ length: n }, (_, i) => i).filter(
        (i) => i !== sourceIdx,
      );
    };
    if (visibleColumns && visibleColumns.size > 0) {
      const picked = [...visibleColumns]
        .filter((i) => i >= 0 && i < n && i !== sourceIdx)
        .sort((a, b) => a - b);
      return picked.length > 0 ? picked : defaultCols();
    }
    return defaultCols();
  });
  let mergedSourceIdx = $derived.by(() =>
    isMergedView ? headers.indexOf("_source_file") : -1,
  );
  let mergedDisplayHeaders = $derived.by(() => {
    if (!isMergedView) return headers;
    if (mergedSourceIdx < 0) return headers;
    return headers.filter((_, i) => i !== mergedSourceIdx);
  });
  let mergedGroupedRows = $derived.by(() => {
    if (!isMergedView) return [] as { source: string; rows: string[][] }[];
    const srcIdx = mergedSourceIdx;
    const groups: { source: string; rows: string[][] }[] = [];
    let lastSource = "";
    devLog('MERGED GROUPED', 'Computing - visibleRows.length:', visibleRows?.length, 'srcIdx:', srcIdx);
    for (const rawRow of visibleRows ?? []) {
      const source =
        srcIdx >= 0 ? (rawRow?.[srcIdx] ?? "Unknown source") : "Merged results";
      const row = srcIdx >= 0 ? rawRow.filter((_, i) => i !== srcIdx) : rawRow;
      if (!groups.length || source !== lastSource) {
        groups.push({ source, rows: [row] });
        lastSource = source;
      } else {
        groups[groups.length - 1].rows.push(row);
      }
    }
    devLog('MERGED GROUPED', 'Computed groups:', groups.length, 'total rows:', groups.reduce((acc, g) => acc + g.rows.length, 0));
    return groups;
  });
  let parseDiagnostics = $derived.by(() => {
    const out: {
      idx: number;
      name: string;
      numericFail: number;
      dateFail: number;
    }[] = [];
    if (!(visibleRows?.length ?? 0)) return out;
    for (let i = 0; i < headers.length; i++) {
      const t = colTypes?.[i] ?? "string";
      if (t !== "numeric" && t !== "date") continue;
      let nFail = 0,
        dFail = 0;
      for (const row of visibleRows ?? []) {
        const raw = (row?.[i] ?? "").trim();
        if (!raw) continue;
        if (t === "numeric" && parseF64Relaxed(raw) == null) nFail++;
        if (t === "date" && parseDateRelaxed(raw) == null) dFail++;
      }
      if (nFail > 0 || dFail > 0)
        out.push({
          idx: i,
          name: headers[i] ?? String(i),
          numericFail: nFail,
          dateFail: dFail,
        });
    }
    return out.slice(0, 8);
  });
  const svarFieldType = (
    t: ColType | undefined,
  ): "text" | "number" | "date" => {
    if (t === "numeric") return "number";
    if (t === "date") return "date";
    return "text";
  };
  let svarFields = $derived.by(() =>
    (headers ?? []).map((h, i) => ({
      id: String(i),
      label: h,
      type: svarFieldType(colTypes?.[i]),
    })),
  );
  let svarOptions = $derived.by(() => {
    const out: Record<string, (string | number | Date)[]> = {};
    for (const s of schemaStats ?? []) {
      const top = (s.topSample ?? [])
        .slice(0, 10)
        .map((x) => x.v)
        .filter((v) => v.length > 0);
      if (top.length) out[String(s.idx)] = top;
    }
    return out;
  });
  async function applyHeaderChoice(choice: boolean) {
    showHeaderPrompt = false;
    const t = pendingText;
    const p = pendingPath;
    pendingText = null;
    pendingPath = null;
    if (t != null) {
      await loadCsvFromText(t, choice);
    } else if (p != null) {
      await loadCsvFromPath(p, choice);
    }
  }
  function cancelHeaderPrompt() {
    showHeaderPrompt = false;
    pendingText = null;
    pendingPath = null;
    isLoading = false;
  }
  function filterControllerCtx() {
    return buildFilterControllerCtx({
      FILTER_DEBOUNCE_MS,
      buildFilterSpecFromState,
      invoke,
      escapeRegExp,
      queueDebug,
      queueDebugRate,
      recordPerf,
      runCrossDatasetQuery,
      fetchVisibleSlice,
      loadState,  // Add loadState for reactive filter properties
      headers,
      hasLoaded,
      suspendReactiveFiltering,
      crossQueryBusy,
      queryScope,
      isMergedView,
      loadedDatasets,
      filterPending,
      filterInFlight,
      filterGate,
      filterLastReason,
      filterTimer,
      crossQueryTimer,
      query,
      multiQueryEnabled,
      multiQueryExpanded,
      multiQueryClauses,
      targetColIdx,
      matchMode,
      numericF,
      dateF,
      catF,
      maxRowsScanText,
      totalRowCount,
      totalFilteredCount,
      visibleColIdxs,
      queryError,
      loadError,
      lastCrossReactiveSig,
      crossQueryResults,
      preMergedHeaders,
      preMergedColTypes,
      preMergedTotalRowCount,
      preMergedTotalFilteredCount,
      colTypes,
      svarFilterSet,
      showSvarBuilder,
      svarNotice,
      mergedRowsAll,
      visibleRows,
    });
  }
  function buildFilterSpec() {
    return buildFilterSpecController(filterControllerCtx());
  }
  async function applyFilterSpec(spec: any): Promise<number> {
    const resp = (await invoke("inspector_filter", { spec })) as
      | number
      | { filteredCount: number };
    return typeof resp === "number"
      ? resp
      : (resp?.filteredCount ?? totalRowCount);
  }
  async function runFilterNow(forceCurrent = false) {
    devLog('ORCHESTRATOR runFilterNow', 'Called with forceCurrent:', forceCurrent);
    await runFilterNowController(filterControllerCtx(), forceCurrent);
    devLog('ORCHESTRATOR runFilterNow', 'Completed');
  }
  async function drainFilterQueue() {
    await drainFilterQueueController(filterControllerCtx());
  }
  async function runFilterPass() {
    const t0 = performance.now();
    const token = filterGate.nextToken();
    const spec = buildFilterSpec();
    if (!spec) return;
    try {
      const count = await applyFilterSpec(spec);
      if (!filterGate.isLatest(token)) return;
      totalFilteredCount = count;
      recordPerf("filter", t0, {
        reason: filterLastReason,
        filteredRows: totalFilteredCount,
        totalRows: totalRowCount,
        visibleCols: visibleColIdxs.length,
      });
      await fetchVisibleSlice();
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      if (matchMode === "regex") queryError = msg;
      else loadError = msg;
    }
  }
  function loadControllerCtxCore() {
    return buildLoadControllerCtxCore({
      invoke,
      debugLogger,
      dialogMod,
      fnv1a32,
      heuristicHasHeaders,
      computeDatasetIdentity,
      upsertWorkspaceDatasetInList,
      loadRecipesForDataset,
      loadLastStateForDataset,
      applyState,
      runFilterNow,
      buildFilterSpec,
      queueDebug,
      queueDebugRate,
      recordPerf,
      runCrossDatasetQuery,
      activateWorkspaceDataset,
    });
  }
  function loadControllerCtxStateMain() {
    return buildLoadControllerCtxStateMain({
      loadState,  // Pass the mutable state object (contains headers, totalRowCount, colTypes, datasetId, datasetLabel, hasLoaded, isMergedView, mergedRowsAll)
      hiddenUploadInput,
      isLoading,
      // isMergedView is now in loadState - don't pass separately
      loadError,
      hasHeaders,
      headerMode,
      headerHeuristicReason,
      pendingText,
      pendingPath,
      showHeaderPrompt,
      // These are for backward compatibility but read from loadState
      headers,
      totalRowCount,
      totalFilteredCount,
      visibleRows,
      colTypes,
      datasetId,
      datasetLabel,
      recipes,
      pendingRestore,
      hasLoaded,  // For backward compat, but read from loadState
      showDataControls,
      activeDatasetId,
      mergedRowsAll,  // For backward compat, but read from loadState
    });
  }
  function loadControllerCtxStateQueryAndGrid() {
    return buildLoadControllerCtxStateQueryAndGrid({
      loadState,  // Pass loadState by reference
      loadedDatasets,
      query,
      matchMode,
      targetColIdx,
      numericF,
      dateF,
      catF,
      suspendReactiveFiltering,
      sortColIdx,
      sortDir,
      sortSpecs,
      visibleColumns,
      pinnedLeft,
      pinnedRight,
      hiddenColumns,
      columnWidths,
      crossQueryBusy,
      queryScope,
      crossQueryResults,
      mergedHeaders,
      mergedRowsAll,
      preMergedHeaders,
      preMergedColTypes,
      preMergedTotalRowCount,
      preMergedTotalFilteredCount,
    });
  }
  function loadControllerCtx(): LoadControllerContext {
    return buildLoadControllerCtx({
      loadState,
      invoke,
      debugLogger,
      dialogMod,
      fnv1a32,
      heuristicHasHeaders,
      computeDatasetIdentity,
      upsertWorkspaceDatasetInList,
      loadRecipesForDataset,
      loadLastStateForDataset,
      applyState,
      runFilterNow,
      buildFilterSpec,
      queueDebug,
      queueDebugRate,
      recordPerf,
      runCrossDatasetQuery,
      activateWorkspaceDataset,
      hiddenUploadInput,
      isLoading,
      isMergedView,
      loadError,
      hasHeaders,
      headerMode,
      headerHeuristicReason,
      pendingText,
      pendingPath,
      showHeaderPrompt,
      headers,
      totalRowCount,
      totalFilteredCount,
      visibleRows,
      colTypes,
      datasetId,
      datasetLabel,
      recipes,
      pendingRestore,
      hasLoaded,
      showDataControls,
      activeDatasetId,
      mergedRowsAll,
      loadedDatasets,
      query,
      matchMode,
      targetColIdx,
      numericF,
      dateF,
      catF,
      suspendReactiveFiltering,
      sortColIdx,
      sortDir,
      sortSpecs,
      visibleColumns,
      pinnedLeft,
      pinnedRight,
      hiddenColumns,
      columnWidths,
      crossQueryBusy,
      queryScope,
      crossQueryResults,
      mergedHeaders,
      preMergedHeaders,
      preMergedColTypes,
      preMergedTotalRowCount,
      preMergedTotalFilteredCount,
    }) as unknown as LoadControllerContext;
  }
  async function loadCsvFromText(
    text: string,
    hasHeadersOverride?: boolean,
    trackWorkspace = true,
    forcedLabel?: string,
    applyInitialFilter = true,
  ) {
    try {
      console.log('[WRAPPER] loadCsvFromText called, building context...');
      const ctx = loadControllerCtx();
      console.log('[WRAPPER] Context built, calling controller...');
      await loadCsvFromTextController(
        ctx,
        text,
        hasHeadersOverride,
        trackWorkspace,
        forcedLabel,
        applyInitialFilter,
      );
      console.log('[WRAPPER] Controller returned successfully');
    } catch (err) {
      console.error('[WRAPPER] Error in loadCsvFromText:', err);
      throw err;
    }
  }
  async function loadCsvFromPath(
    path: string,
    hasHeadersOverride?: boolean,
    trackWorkspace = true,
    forcedLabel?: string,
    applyInitialFilter = true,
  ) {
    await loadCsvFromPathController(
      loadControllerCtx(),
      path,
      hasHeadersOverride,
      trackWorkspace,
      forcedLabel,
      applyInitialFilter,
    );
  }
  function gridControllerCtx() {
    console.log('[GRID CTX WRAPPER] Building context...');
    return buildGridControllerCtx({
      invoke,
      recordPerf,
      queueDebug,
      loadState,  // Add loadState so grid can access reactive data
      updateVisibleRows,  // Add callback for reactive updates
      hasLoaded,
      sliceGate,
      startIdx: gridWindow.startIdx,
      endIdx: gridWindow.endIdx,
      visibleColIdxs,
      isMergedView,
      mergedRowsAll,
      visibleRows: [],  // Don't pass derived value - use loadState.visibleRows instead
      loadError,
      totalFilteredCount,
      sliceTimer,
      headers,
      sortGate,
      sortColIdx,
      sortDir,
      sortSpecs,
      visibleColumns,
      columnPickerNotice,
      showColumnPicker,
      hiddenColumns,
      pinnedLeft,
      pinnedRight,
      columnWidths,
    });
  }
  async function fetchVisibleSlice() {
    console.error('★★★ WRAPPER fetchVisibleSlice called ★★★');
    console.log('[WRAPPER] fetchVisibleSlice called, hasLoaded:', hasLoaded, 'loadState.hasLoaded:', loadState.hasLoaded);
    try {
      const ctx = gridControllerCtx();
      console.error('★★★ About to call controller ★★★');
      await fetchVisibleSliceController(ctx);
      console.error('★★★ Controller returned ★★★');
      console.log('[WRAPPER] Controller returned, loadState.visibleRows.length:', loadState.visibleRows?.length);
    } catch (err) {
      console.error('[WRAPPER] fetchVisibleSlice error:', err);
    }
  }
  async function requestSort(colIdx: number, opts?: { multi?: boolean }) {
    await requestSortController(gridControllerCtx(), colIdx, opts);
  }
  function activeFilterHash(): string {
    return computeActiveFilterHash({
      query,
      matchMode,
      targetColIdx,
      numericF,
      dateF,
      catF,
    });
  }
  async function activateWorkspaceDataset(
    datasetIdToActivate: string,
    internal = false,
  ) {
    await activateWorkspaceDatasetController(
      loadControllerCtx(),
      datasetIdToActivate,
      internal,
    );
  }
  async function runCrossDatasetQuery() {
    await runCrossDatasetQueryController(loadControllerCtx());
  }
  function recipesControllerCtx() {
    return buildRecipesControllerCtx({
      RECIPES_STORE_KEY,
      LEGACY_RECIPES_STORE_KEYS,
      LAST_STATE_STORE_KEY,
      LEGACY_LAST_STATE_KEYS,
      loadRecipesForDatasetFromStore,
      persistRecipesForDatasetToStore,
      loadLastStateForDatasetFromStore,
      persistLastStateForDatasetToStore,
      buildRecipeExportBlob,
      mergeImportedRecipes,
      toCsvText,
      downloadText,
      newRecipeId,
      captureState,
      applyState,
      persistRecipesForDataset,
      autoRestoreEnabled,
      datasetId,
      datasetLabel,
      recipes,
      recipeNotice,
      hasLoaded,
      headers,
      totalRowCount,
      visibleRows,
      visibleColIdxs,
      totalFilteredCount,
      activeFilterHash,
      schemaStats,
      perf,
      invoke,
      recipeName,
      recipeTags,
    });
  }
  function loadRecipesForDataset(dsId: string): Recipe[] {
    return loadRecipesForDatasetController2(recipesControllerCtx(), dsId);
  }
  function persistRecipesForDataset(dsId: string, label: string, rs: Recipe[]) {
    persistRecipesForDatasetController2(
      recipesControllerCtx(),
      dsId,
      label,
      rs,
    );
  }
  function loadLastStateForDataset(dsId: string): RecipeState | null {
    return loadLastStateForDatasetController2(recipesControllerCtx(), dsId);
  }
  function persistLastStateForDataset(dsId: string, st: RecipeState) {
    persistLastStateForDatasetController2(recipesControllerCtx(), dsId, st);
  }
  async function exportCsvPreset(
    mode: "current_view" | "filtered_rows" | "selected_columns",
  ) {
    await exportCsvPresetController(recipesControllerCtx(), mode);
  }
  function stateControllerCtx() {
    return buildStateControllerCtx({
      captureRecipeState,
      migrateAndNormalizeRecipeState,
      invoke,
      runFilterNow,
      autoRestoreEnabled,
      query,
      multiQueryEnabled,
      multiQueryExpanded,
      multiQueryClauses,
      matchMode,
      targetColIdx,
      maxRowsScanText,
      numericF,
      dateF,
      catF,
      sortColIdx,
      sortDir,
      sortSpecs,
      visibleColumns,
      pinnedLeft,
      pinnedRight,
      hiddenColumns,
      columnWidths,
      headers,
    });
  }
  function captureState(): RecipeState {
    return captureStateController2(stateControllerCtx()) as RecipeState;
  }
  async function applyState(st: RecipeState) {
    await applyStateController2(
      stateControllerCtx(),
      st as unknown as RecipeStateV3,
    );
  }
  function highlightCell(cell: string) {
    return highlightCellCore(
      cell,
      query,
      matchMode,
      multiQueryEnabled,
      multiQueryClauses,
      escapeRegExp,
      escapeHtml,
      multiQueryHighlightRegexes,
    );
  }
  function rowDrawerControllerCtx() {
    return buildRowDrawerControllerCtx({
      invoke: invoke as any,
      loadRowDrawerData,
      withViewTransition,
      recordPerf,
      clamp,
      scheduleFilter: (reason = "debounced-input") =>
        scheduleFilterController(filterControllerCtx(), reason),
      runFilterNow,
      applyDrawerNumericExact,
      applyDrawerDateExact,
      copyDrawerAsJsonController,
      hasLoaded,
      headers,
      colTypes,
      totalFilteredCount,
      showRowDrawer,
      drawerLoading,
      drawerError,
      drawerVisualIdx,
      drawerKVs,
      drawerSearch,
      drawerExplain,
      recipeNotice,
      targetColIdx,
      tier2Open,
      tier2Tab,
      catF,
      numericF,
      dateF,
    });
  }
  async function openRowDrawer(visualIdx: number) {
    await openRowDrawerController3(rowDrawerControllerCtx(), visualIdx);
  }
  function modalUiCtx() {
    return buildModalUiCtx({
      withViewTransition,
      modalPos,
      dragState,
      recipeNotice,
      showRecipeModal,
      showShortcuts,
      showSvarBuilder,
      showRegexGenerator,
      genTab,
    });
  }
  function floatingStyle(key: string): string {
    return floatingModalStyle(modalPos, key);
  }
  function beginDragModal(key: string, e: MouseEvent) {
    beginModalDrag(modalUiCtx(), key, e);
  }
  function resetModalPos(key: string) {
    modalPos = resetModalPosition(modalPos, key);
  }
  function onGridWindowChange(w: GridWindow) {
    const sig = `${w.startIdx}:${w.endIdx}:${w.renderedCount}:${w.maxWindow}:${w.translateY}:${w.phantomHeight}`;
    if (sig === lastGridWindowSig) return;
    lastGridWindowSig = sig;
    gridWindow = w;
    queueDebugRate("gridWindow", 500, "gridWindow", {
      start: w.startIdx,
      end: w.endIdx,
      rendered: w.renderedCount,
      maxWindow: w.maxWindow,
    });
  }
  function onGridScrollTrace(info: {
    scrollTop: number;
    dy: number;
    dtMs: number;
    velocity: number;
    fastScroll: boolean;
  }) {
    queueDebugRate("gridScrollTrace", 150, "gridScrollTrace", {
      scrollTop: Math.round(info.scrollTop),
      dy: Math.round(info.dy),
      dtMs: Math.round(info.dtMs),
      velocity: Number(info.velocity.toFixed(3)),
      fast: info.fastScroll,
    });
  }
  async function applyRecipe(r: Recipe) {
    await applyRecipeController2(recipesControllerCtx(), r);
  }
  function schemaControllerCtx() {
    return buildSchemaControllerCtx({
      invoke,
      withViewTransition,
      profileSchemaFromRows,
      parseMaxRowsScanText,
      recordPerf,
      activeFilterHash,
      hasLoaded,
      headers,
      query,
      matchMode,
      targetColIdx,
      schemaLoading,
      schemaError,
      schemaScopeLabel,
      schemaSampleTier,
      schemaSampleN,
      totalFilteredCount,
      totalRowCount,
      datasetId,
      schemaCache,
      schemaStats,
      colTypes,
      showSchemaModal,
      schemaDriftBaseline,
      recipeNotice,
      categoryGate,
      catF,
      catAvailItems,
      catAvailOffset,
      catAvailDistinctTotal,
      catAvailRowsScanned,
      catAvailTotalRowsInView,
      catAvailPartial,
      catAvailError,
      catAvailLoading,
      catAvailSearch,
      catAvailLimit,
      maxRowsScanText,
      catAvailTimer,
    });
  }
  async function computeSchemaStats() {
    await computeSchemaStatsController2(schemaControllerCtx());
  }
  function openSchema() {
    resetModalPos("schema");
    openSchemaController2(schemaControllerCtx());
  }
  function schemaInsightsCtx() {
    return buildSchemaInsightsCtx({
      targetColIdx,
      tier2Open,
      tier2Tab,
      catF,
      numericF,
      dateF,
      schemaStats,
      runFilterNow,
    });
  }
  async function fetchCategoryValues(reset = false) {
    await fetchCategoryValuesController2(schemaControllerCtx(), reset);
  }
  function moveClause(idx: number, dir: -1 | 1) {
    genClauses = moveRegexGeneratorClause(genClauses, idx, dir);
  }
  function removeClause(idx: number) {
    genClauses = removeRegexGeneratorClause(genClauses, idx);
  }
  function addClause(kind: ClauseKind) {
    genClauses = addRegexGeneratorClause(genClauses, kind);
  }
  function applyGeneratedRegex(pat: string) {
    applyGeneratedRegexUi(
      {
        setQuery: (v) => {
          query = v;
        },
        setMatchMode: (v) => {
          matchMode = v as typeof matchMode;
        },
        setShowRegexGenerator: (v) => {
          showRegexGenerator = v;
        },
        setShowRegexHelp: (v) => {
          showRegexHelp = v;
        },
      },
      pat,
    );
  }
  function multiQueryCtx() {
    return {
      clauses: multiQueryClauses,
      setClauses: (next: MultiQueryClause[]) => {
        multiQueryClauses = next;
      },
      setExpanded: (v: boolean) => {
        multiQueryExpanded = v;
      },
      setEnabled: (v: boolean) => {
        multiQueryEnabled = v;
      },
      scheduleFilter: (reason = "debounced-input") =>
        scheduleFilterController(filterControllerCtx(), reason),
    };
  }
  function onAddMultiQueryClause() {
    addMultiQueryClause(multiQueryCtx());
  }
  function onRemoveMultiQueryClause(id: string) {
    removeMultiQueryClause(multiQueryCtx(), id);
  }
  function onUpdateMultiQueryClause(
    id: string,
    patch: Partial<MultiQueryClause>,
  ) {
    updateMultiQueryClause(multiQueryCtx(), id, patch);
  }
  function onMultiQueryEnabledChange(enabled: boolean) {
    setMultiQueryEnabled(multiQueryCtx(), enabled);
  }
  function onMultiQueryExpandedChange(expanded: boolean) {
    setMultiQueryExpanded(multiQueryCtx(), expanded);
  }
  const debugLogger = createInspectorDebugLogger({
    enabled: () =>
      debugLogEnabled &&
      typeof window !== "undefined" &&
      !!(window as any).__TAURI_INTERNALS__,
    writeBatch: async (lines) => {
      try {
        return (await invoke("inspector_debug_log_batch", { lines })) as string;
      } catch (e) {
        // Tauri not available in browser mode - this is expected
        return undefined;
      }
    },
    onPath: (path) => {
      if (!debugLogPath) debugLogPath = path;
    },
  });
  const queueDebug = (event: string, data?: Record<string, unknown>) =>
    debugLogger.enqueue(event, data);
  const queueDebugRate = (
    key: string,
    minMs: number,
    event: string,
    data?: Record<string, unknown>,
  ) => debugLogger.enqueueRate(key, minMs, event, data);
  onMount(() => {
    mountInspectorLifecycle({
      invoke: (cmd, args) => invoke(cmd, args as any),
      queueDebug,
      debugLogger,
      setDebugLogPath: (path) => {
        debugLogPath = path;
      },
      setIsTauri: (v) => {
        isTauri = v;
      },
      setPrefersReducedMotion: (v) => {
        prefersReducedMotion = v;
      },
      setUiAnimDur: (v) => {
        uiAnimDur = v;
      },
      setDialogModule: (mod) => {
        dialogMod = mod as DialogMod;
      },
      setCanOpenPath: (v) => {
        canOpenPath = v;
      },
      getQuietBackendLogs: () => quietBackendLogs,
      getShowShortcuts: () => showShortcuts,
      setShowShortcuts: (v) => {
        showShortcuts = v;
      },
      getShowRowDrawer: () => showRowDrawer,
      closeRowDrawer: () => closeRowDrawerController2(rowDrawerControllerCtx()),
      openShortcuts: () => openShortcutsModal(modalUiCtx()),
      openSchema,
      openRecipes: () => openRecipesModal(modalUiCtx()),
      openRegexGenerator: () => openRegexGeneratorModal(modalUiCtx()),
      openBuilder: () => openSvarBuilderModal(modalUiCtx()),
      openColumnPicker: () => openColumnPickerController(gridControllerCtx()),
      openStreamLoadFromMenu: async () =>
        await openStreamLoadFromMenuController(loadControllerCtx()),
      openFallbackLoadFromMenu: () =>
        openFallbackLoadFromMenuController(loadControllerCtx()),
      clearAllFilters: () => clearAllFiltersController(filterControllerCtx()),
      computeSchemaStats,
      exportAnalysisBundle: () =>
        exportAnalysisBundleController(recipesControllerCtx()),
      exportCsvPreset,
      toggleRegexHelp: () => {
        showRegexHelp = !showRegexHelp;
      },
      toggleQuietBackendLogs: () => {
        quietBackendLogs = !quietBackendLogs;
      },
      toggleAutoRestoreEnabled: () => {
        autoRestoreEnabled = !autoRestoreEnabled;
      },
      focusQueryInput: () => {
        const el = document.querySelector<HTMLInputElement>(
          '[data-inspector-query-input="true"], input[placeholder="Type to filter…"], input[placeholder="Regex pattern…"]',
        );
        el?.focus();
      },
    });

    // Firefox Fix: Register menu immediately after lifecycle setup
    // This ensures the menu is registered AFTER event listeners are attached
    console.log('[Inspector Mount] Registering context menu immediately after lifecycle setup');
    const menu = buildInspectorContextMenu({
      canOpenPath,
      hasLoaded,
      schemaLoading,
      showRegexHelp,
      quietBackendLogs,
      autoRestoreEnabled,
    });
    registerContextMenu(menu);
    console.log('[Inspector Mount] Initial menu registration complete');

    // ⚠️ DISABLED: Menu should always be visible, not controlled by data load state
    // setupShowDataControlsEffect(
    // {
    //   hasLoadedDatasetSignals,
    //   hasLoaded: () => hasLoaded,
    //   loadedDatasetsLength: () => loadedDatasets?.length ?? 0,
    //   activeDatasetId: () => activeDatasetId,
    //   datasetId: () => datasetId,
    //   headersLength: () => headers?.length ?? 0,
    //   totalRowCount: () => totalRowCount,
    // },
    // (value) => {
    //   showDataControls = value;
    // },
    // );
  setupSliceFetchEffect(
    {
      hasLoaded: () => hasLoaded,
      suspendReactiveFiltering: () => suspendReactiveFiltering,
      isMergedView: () => isMergedView,
      startIdx: () => gridWindow.startIdx,
      endIdx: () => gridWindow.endIdx,
      totalFilteredCount: () => totalFilteredCount,
      visibleColIdxsLength: () => visibleColIdxs.length,
    },
    {
      scheduleSliceFetch: () =>
        scheduleSliceFetchController(gridControllerCtx()),
    },
  );
  setupReactiveFilterEffect(
    {
      hasLoaded: () => hasLoaded,
      suspendReactiveFiltering: () => suspendReactiveFiltering,
      queryScope: () => queryScope,
      query: () => query,
      matchMode: () => matchMode,
      targetColIdx: () => targetColIdx,
      maxRowsScanText: () => maxRowsScanText,
      numericF: () => numericF,
      dateF: () => dateF,
      catF: () => catF,
    },
    {
      scheduleFilter: (reason = "debounced-input") =>
        scheduleFilterController(filterControllerCtx(), reason),
    },
  );
  setupCrossQueryEffect(
    {
      hasLoaded: () => hasLoaded,
      queryScope: () => queryScope,
      loadedDatasets: () => loadedDatasets,
      query: () => query,
      matchMode: () => matchMode,
      targetColIdx: () => targetColIdx,
      maxRowsScanText: () => maxRowsScanText,
      numericF: () => numericF,
      dateF: () => dateF,
      catF: () => catF,
      multiQueryEnabled: () => multiQueryEnabled,
      multiQueryClauses: () => multiQueryClauses,
      lastCrossReactiveSig: () => lastCrossReactiveSig,
    },
    {
      scheduleCrossQuery: (reason = "debounced-cross-input") =>
        scheduleCrossQueryController(filterControllerCtx(), reason),
      setLastCrossReactiveSig: (sig) => {
        lastCrossReactiveSig = sig;
      },
    },
  );
  setupPersistStateEffect(
    {
      hasLoaded: () => hasLoaded,
      datasetId: () => datasetId,
      query: () => query,
      matchMode: () => matchMode,
      targetColIdx: () => targetColIdx,
      maxRowsScanText: () => maxRowsScanText,
      numericF: () => numericF,
      dateF: () => dateF,
      catF: () => catF,
      sortColIdx: () => sortColIdx,
      sortDir: () => sortDir,
      sortSpecs: () => sortSpecs,
      visibleColumns: () => visibleColumns,
      pinnedLeft: () => pinnedLeft,
      pinnedRight: () => pinnedRight,
      hiddenColumns: () => hiddenColumns,
      columnWidths: () => columnWidths,
      captureState,
    },
    { persistLastStateForDataset },
  );
  setupUiAnimDurEffect(
    {
      prefersReducedMotion: () => prefersReducedMotion,
      crossQueryBusy: () => crossQueryBusy,
      totalFilteredCount: () => totalFilteredCount,
    },
    (value) => {
      uiAnimDur = value;
    },
  );
  setupQuietBackendLogsEffect({ quietBackendLogs: () => quietBackendLogs });
  setupContextMenuEffect(
    {
      buildInspectorContextMenu,
      canOpenPath: () => canOpenPath,
      hasLoaded: () => hasLoaded,
      schemaLoading: () => schemaLoading,
      showRegexHelp: () => showRegexHelp,
      quietBackendLogs: () => quietBackendLogs,
      autoRestoreEnabled: () => autoRestoreEnabled,
    },
    { registerContextMenu },
  );
  setupCategoryColumnChangeEffect(
    { hasLoaded: () => hasLoaded, catFColIdx: () => catF.colIdx },
    {
      scheduleFetchCategory: (reset: boolean) =>
        scheduleFetchCategoryController2(schemaControllerCtx(), reset),
    },
  );
  setupCategorySearchEffect(
    { hasLoaded: () => hasLoaded, catAvailSearch: () => catAvailSearch },
    {
      scheduleFetchCategory: (reset: boolean) =>
        scheduleFetchCategoryController2(schemaControllerCtx(), reset),
    },
  );
  setupGridWindowInitEffect(
    {
      hasLoaded: () => hasLoaded,
      totalFilteredCount: () => totalFilteredCount,
      gridWindowEndIdx: () => gridWindow.endIdx,
      mergedRowsAllLength: () => mergedRowsAll.length,
      isMergedView: () => isMergedView,
    },
    {
      initializeGridWindow: (endIdx: number) => {
        gridWindow = {
          ...gridWindow,
          endIdx,
          renderedCount: endIdx,
        };
        // CRITICAL FIX: Manually trigger slice fetch after grid window init
        // The reactive effect is disabled for merged view, so we need explicit call
        if (isMergedView) {
          devLog('GRID INIT', 'Merged view detected, manually calling fetchVisibleSlice');
          fetchVisibleSlice();
        }
      },
    },
  );
  });
  let genTab = $state<GenTab>("builder");
  let genBuildMode = $state<BuildMode>("inOrder");
  let genFlagI = $state(true);
  let genFlagM = $state(false);
  let genFlagS = $state(false);
  let genClauses = $state<Clause[]>(defaultRegexClauses());
  let genAddKind = $state<ClauseKind>("contains");
  let genOutView = $derived.by(() =>
    buildRegexGeneratorOutput(genClauses ?? [], genBuildMode),
  );
  let genOut = $derived.by(() => genOutView.pattern);
  let genOutWarnExtra = $derived.by(() => genOutView.warnExtra);
  let genErr = $derived.by(() =>
    validateRegexGenerator(genOut, { i: genFlagI, m: genFlagM, s: genFlagS }),
  );
  let genWarn = $derived.by(() =>
    regexGeneratorWarnings(genOut, genBuildMode, genOutWarnExtra),
  );
  let testText = $state("");
  let testMatches = $derived.by(() =>
    regexGeneratorMatches(
      genOut,
      { i: genFlagI, m: genFlagM, s: genFlagS },
      testText ?? "",
      !!genErr,
    ),
  );
</script>

<div class="flex flex-col gap-3 inspector-lab inspector-reveal">
  <input
    class="hidden"
    type="file"
    multiple
    accept=".csv,text/csv"
    bind:this={hiddenUploadInput}
    onchange={async (e) => {
      console.log('[FILE INPUT] onchange triggered');
      const target = e.currentTarget as HTMLInputElement;
      const files = Array.from(target.files ?? []);
      console.log('[FILE INPUT] files:', files.length);
      if (!files.length) return;
      for (const f of files) {
        console.log('[FILE INPUT] Processing file:', f.name);
        const text = await f.text();
        console.log('[FILE INPUT] File text length:', text.length);
        console.log('[FILE INPUT] Calling loadCsvFromText...');
        await loadCsvFromText(text, undefined, true, f.name);
        console.log('[FILE INPUT] loadCsvFromText complete');
      }
      target.value = "";
    }}
  />
  <InspectorTopControlsPanel
    topControlSpans={topControlSpans as Record<string, string>}
    {headerMode}
    {hasLoaded}
    {isLoading}
    {headers}
    {targetColIdx}
    {matchMode}
    {queryScope}
    {query}
    {multiQueryEnabled}
    {multiQueryExpanded}
    {multiQueryClauses}
    {maxRowsScanText}
    {tier2Open}
    visibleColCount={visibleColIdxs.length}
    {queryError}
    {showControlsDebug}
    {showDataControls}
    loadedDatasets={loadedDatasets.length}
    {activeDatasetId}
    {datasetId}
    {totalRowCount}
    {canOpenPath}
    {showRegexHelp}
    {uiAnimDur}
    {tier2Tab}
    {numericF}
    {dateF}
    {catF}
    {catSearch}
    {catAvailSearch}
    {catAvailItems}
    {catAvailDistinctTotal}
    {catAvailRowsScanned}
    {catAvailTotalRowsInView}
    {catAvailPartial}
    {catAvailLoading}
    {catAvailError}
    onHeaderModeChange={(value: "auto" | "yes" | "no") => {
      headerMode = value;
    }}
    onTargetColChange={(value: number | null) => {
      targetColIdx = value;
      scheduleFilterController(filterControllerCtx());
    }}
    onMatchModeChange={(value: "fuzzy" | "exact" | "regex") => {
      matchMode = value;
    }}
    onQueryScopeChange={(value: "current" | "all" | "ask") => {
      queryScope = value;
      onQueryScopeChangeController(filterControllerCtx());
    }}
    onQueryChange={(value: string) => {
      query = value;
    }}
    onMaxRowsScanTextChange={(value: string) => {
      maxRowsScanText = value;
    }}
    onTier2Toggle={(value: boolean) => {
      tier2Open = value;
    }}
    onOpenColumnPicker={() => openColumnPickerController(gridControllerCtx())}
    onOpenBuilder={() => openSvarBuilderModal(modalUiCtx())}
    onSetRegexMode={() => {
      matchMode = "regex";
    }}
    onOpenHelp={() => {
      showRegexHelp = true;
    }}
    onOpenGenerator={() => openRegexGeneratorModal(modalUiCtx())}
    onOpenRecipes={() => openRecipesModal(modalUiCtx())}
    {onMultiQueryEnabledChange}
    {onMultiQueryExpandedChange}
    {onAddMultiQueryClause}
    {onRemoveMultiQueryClause}
    {onUpdateMultiQueryClause}
    onSetTier2Tab={(tab) => (tier2Tab = tab)}
    scheduleFilter={(reason = "debounced-input") =>
      scheduleFilterController(filterControllerCtx(), reason)}
    {runFilterNow}
    {fetchCategoryValues}
  />
  <InspectorFooterBars
    {loadedDatasets}
    {activeDatasetId}
    {crossQueryBusy}
    {isMergedView}
    mergedRowsCount={mergedRowsAll.length}
    columns={headers.length}
    rows={totalRowCount}
    filtered={totalFilteredCount}
    rendered={gridWindow.renderedCount}
    startIdx={gridWindow.startIdx}
    endIdx={gridWindow.endIdx}
    overscan={OVERSCAN}
    maxWindow={gridWindow.maxWindow}
    {parseDiagnostics}
    onActivateDataset={(id) => void activateWorkspaceDataset(id)}
    onUnloadDataset={async (id) =>
      await unloadWorkspaceDatasetController(loadControllerCtx(), id)}
  />
  <InspectorMainGridPanel
    {hasLoaded}
    {matchMode}
    {queryScope}
    {query}
    {queryError}
    {multiQueryEnabled}
    {multiQueryExpanded}
    {multiQueryClauses}
    {isMergedView}
    {mergedDisplayHeaders}
    {mergedGroupedRows}
    {mergedRowFxEnabled}
    {uiAnimDur}
    {headers}
    {visibleRows}
    {visibleColIdxs}
    {totalFilteredCount}
    {ROW_HEIGHT}
    {OVERSCAN}
    {MAX_WINDOW_ABS}
    {sortColIdx}
    {sortDir}
    {sortPriority}
    {pinnedLeft}
    {pinnedRight}
    {hiddenColumns}
    {columnWidths}
    {activeDatasetLabel}
    onMatchModeChange={(value: "fuzzy" | "exact" | "regex") => {
      matchMode = value;
    }}
    onQueryScopeChange={(value: "current" | "all" | "ask") => {
      queryScope = value;
      onQueryScopeChangeController(filterControllerCtx());
    }}
    onQueryChange={(value: string) => {
      query = value;
    }}
    onOpenBuilder={() => openSvarBuilderModal(modalUiCtx())}
    onSetRegexMode={() => {
      matchMode = "regex";
    }}
    onOpenHelp={() => {
      showRegexHelp = true;
    }}
    onOpenGenerator={() => openRegexGeneratorModal(modalUiCtx())}
    onOpenRecipes={() => openRecipesModal(modalUiCtx())}
    {onMultiQueryEnabledChange}
    {onMultiQueryExpandedChange}
    {onAddMultiQueryClause}
    {onRemoveMultiQueryClause}
    {onUpdateMultiQueryClause}
    onRequestSort={requestSort}
    onOpenRow={openRowDrawer}
    onColumnResize={(idx: number, width: number) =>
      onColumnResizeController(gridControllerCtx(), idx, width)}
    {highlightCell}
    {onGridWindowChange}
    {onGridScrollTrace}
  />
  <InspectorOverlayPanel
    bind:showRecipeModal
    bind:showSchemaModal
    bind:showRowDrawer
    bind:showHeaderPrompt
    bind:showColumnPicker
    bind:showSvarBuilder
    bind:showRegexGenerator
    bind:showShortcuts
    {uiAnimDur}
    {hasLoaded}
    bind:recipeNotice
    bind:recipeName
    bind:recipeTags
    bind:importMode
    {recipes}
    {datasetLabel}
    bind:schemaSampleN
    {totalFilteredCount}
    {totalRowCount}
    {schemaScopeLabel}
    {schemaError}
    {schemaLoading}
    bind:schemaSampleTier
    bind:schemaSearch
    {schemaSuggested}
    {schemaOutliers}
    {schemaRelationshipHints}
    {schemaDrift}
    {colTypes}
    {headers}
    {schemaFiltered}
    bind:catF
    {drawerVisualIdx}
    bind:drawerSearch
    {drawerLoading}
    {drawerError}
    {drawerList}
    {drawerExplain}
    {headerHeuristicReason}
    {visibleColumns}
    {columnPickerNotice}
    {svarFields}
    {svarOptions}
    bind:svarFilterSet
    bind:genTab
    bind:genFlagI
    bind:genFlagM
    bind:genFlagS
    {genOut}
    {genErr}
    {genWarn}
    {regexTemplates}
    bind:testText
    {testMatches}
    bind:genBuildMode
    bind:genClauses
    {genAddKind}
    {floatingStyle}
    {resetModalPos}
    {beginDragModal}
    {computeSchemaStats}
    {runFilterNow}
    closeRowDrawer={() => closeRowDrawerController2(rowDrawerControllerCtx())}
    navRow={(delta: number) =>
      navRowController2(rowDrawerControllerCtx(), delta)}
    copyDrawerAsJson={async () =>
      await copyDrawerAsJsonController3(rowDrawerControllerCtx())}
    {applyHeaderChoice}
    {cancelHeaderPrompt}
    smartSelectColumns={() => smartSelectColumnsController(gridControllerCtx())}
    selectAllColumns={() => selectAllColumnsController(gridControllerCtx())}
    clearColumnSelection={() =>
      clearColumnSelectionController(gridControllerCtx())}
    toggleVisibleCol={(i: number) =>
      toggleVisibleColController(gridControllerCtx(), i)}
    saveCurrentAsRecipe={() =>
      saveCurrentAsRecipeController2(recipesControllerCtx())}
    exportRecipesCurrent={async () =>
      await exportRecipesCurrentController(recipesControllerCtx())}
    importRecipesFile={async (file: File, mode: "current" | "file") =>
      await importRecipesFileController2(recipesControllerCtx(), file, mode)}
    toggleRecipeFavorite={(id: string) =>
      toggleRecipeFavoriteController2(recipesControllerCtx(), id)}
    {applyRecipe}
    deleteRecipe={(id: string) =>
      deleteRecipeController2(recipesControllerCtx(), id)}
    setSchemaDriftBaseline={() =>
      setSchemaDriftBaselineController2(schemaControllerCtx())}
    schemaActionTarget={(idx: number) =>
      schemaActionTargetController(schemaInsightsCtx(), idx)}
    schemaActionCategory={(idx: number, autoSelectTop = true) =>
      schemaActionCategoryController(schemaInsightsCtx(), idx, autoSelectTop)}
    schemaActionNumericRange={(idx: number, useMinMax = true) =>
      schemaActionNumericRangeController(schemaInsightsCtx(), idx, useMinMax)}
    schemaActionDateRange={(idx: number, useMinMax = true) =>
      schemaActionDateRangeController(schemaInsightsCtx(), idx, useMinMax)}
    drawerApplyTarget={(idx: number) =>
      drawerApplyTargetController2(rowDrawerControllerCtx(), idx)}
    drawerApplyCategory={(idx: number, value: string) =>
      drawerApplyCategoryController2(rowDrawerControllerCtx(), idx, value)}
    drawerApplyNumericExact={(idx: number, value: string) =>
      drawerApplyNumericExactController3(rowDrawerControllerCtx(), idx, value)}
    drawerApplyDateExact={(idx: number, value: string) =>
      drawerApplyDateExactController3(rowDrawerControllerCtx(), idx, value)}
    applySvarBuilderToFilters={() =>
      applySvarBuilderToFiltersController(filterControllerCtx())}
    {applyGeneratedRegex}
    {moveClause}
    {removeClause}
    {addClause}
  />
</div>
