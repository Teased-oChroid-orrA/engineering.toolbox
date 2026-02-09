<script lang="ts">
  import { onMount } from 'svelte';
  import { slide } from 'svelte/transition';
  import { safeAutoAnimate, isWebKitRuntime } from '$lib/utils/safeAutoAnimate';
  import { invoke } from '@tauri-apps/api/core';
  import NumberFlow from '@number-flow/svelte';
  import { type IFilterSet } from '@svar-ui/svelte-filter';
  import InspectorVirtualGrid from '$lib/components/inspector/InspectorVirtualGrid.svelte';
  import InspectorTopControls from '$lib/components/inspector/InspectorTopControls.svelte';
  import InspectorToolbar from '$lib/components/inspector/InspectorToolbar.svelte';
  import InspectorLoadedFilesBar from '$lib/components/inspector/InspectorLoadedFilesBar.svelte';
  import InspectorMetricsBar from '$lib/components/inspector/InspectorMetricsBar.svelte';
  import InspectorTier2Panel from '$lib/components/inspector/InspectorTier2Panel.svelte';
  import InspectorRowDrawer from '$lib/components/inspector/InspectorRowDrawer.svelte';
  import InspectorHeaderPromptModal from '$lib/components/inspector/InspectorHeaderPromptModal.svelte';
  import InspectorColumnPickerModal from '$lib/components/inspector/InspectorColumnPickerModal.svelte';
  import InspectorShortcutsModal from '$lib/components/inspector/InspectorShortcutsModal.svelte';
  import InspectorRecipesModal from '$lib/components/inspector/InspectorRecipesModal.svelte';
  import InspectorSchemaModal from '$lib/components/inspector/InspectorSchemaModal.svelte';
  import InspectorSvarBuilderModal from '$lib/components/inspector/InspectorSvarBuilderModal.svelte';
  import InspectorRegexGeneratorModal from '$lib/components/inspector/InspectorRegexGeneratorModal.svelte';
  import InspectorMergedGrid from '$lib/components/inspector/InspectorMergedGrid.svelte';
  import { INSPECTOR_THEME } from '$lib/components/inspector/InspectorThemeTokens';
  import {
    buildRegexCore,
    computeRegexTestMatches,
    genFlagsString,
    getRegexWarnings,
    newClause,
    regexTemplates,
    removeClause as removeRegexClause,
    moveClause as moveRegexClause,
    addClause as addRegexClause,
    validateRegexPattern,
    type BuildMode,
    type Clause,
    type ClauseKind,
    type GenTab
  } from '$lib/components/inspector/InspectorRegexController';
  import {
    fmtDate,
    parseDateRelaxed,
    parseF64Relaxed,
    profileSchemaFromRows
  } from '$lib/components/inspector/InspectorSchemaController';
  import {
    PerfRecorder,
    createRequestGate,
    type RecipeStateV3
  } from '$lib/components/inspector/InspectorDataStore';
  import {
    computeDatasetIdentity,
    hasLoadedDatasetSignals,
    heuristicHasHeaders,
    upsertWorkspaceDataset as upsertWorkspaceDatasetInList
  } from '$lib/components/inspector/InspectorLoadController';
  import { buildFilterSpec as buildFilterSpecFromState, parseMaxRowsScanText } from '$lib/components/inspector/InspectorQueryController';
  import {
    applySvarBuilderToFilters as applySvarBuilderToFiltersController,
    buildFilterSpec as buildFilterSpecController,
    clearAllFilters as clearAllFiltersController,
    drainFilterQueue as drainFilterQueueController,
    onQueryScopeChange as onQueryScopeChangeController,
    runFilterNow as runFilterNowController,
    scheduleCrossQuery as scheduleCrossQueryController,
    scheduleFilter as scheduleFilterController
  } from '$lib/components/inspector/InspectorOrchestratorFilterController';
  import {
    activateWorkspaceDataset as activateWorkspaceDatasetController,
    loadCsvFromPath as loadCsvFromPathController,
    loadCsvFromText as loadCsvFromTextController,
    openFallbackLoadFromMenu as openFallbackLoadFromMenuController,
    openStreamLoadFromMenu as openStreamLoadFromMenuController,
    runCrossDatasetQuery as runCrossDatasetQueryController,
    unloadWorkspaceDataset as unloadWorkspaceDatasetController,
    upsertWorkspaceDataset as upsertWorkspaceDatasetController
  } from '$lib/components/inspector/InspectorOrchestratorLoadController';
  import {
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
  import {
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
  import {
    closeRowDrawer as closeRowDrawerController2,
    copyDrawerAsJson as copyDrawerAsJsonController3,
    drawerApplyCategory as drawerApplyCategoryController2,
    drawerApplyDateExact as drawerApplyDateExactController3,
    drawerApplyNumericExact as drawerApplyNumericExactController3,
    drawerApplyTarget as drawerApplyTargetController2,
    navRow as navRowController2,
    openRowDrawer as openRowDrawerController3
  } from '$lib/components/inspector/InspectorOrchestratorRowDrawerController';
  import {
    computeSchemaStats as computeSchemaStatsController2,
    fetchCategoryValues as fetchCategoryValuesController2,
    openSchema as openSchemaController2,
    scheduleFetchCategory as scheduleFetchCategoryController2,
    setSchemaDriftBaseline as setSchemaDriftBaselineController2
  } from '$lib/components/inspector/InspectorOrchestratorSchemaController';
  import {
    applyState as applyStateController2,
    captureState as captureStateController2
  } from '$lib/components/inspector/InspectorOrchestratorStateController';
  import {
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
    toCsvText,
    type Recipe,
    type RecipeState
  } from '$lib/components/inspector/InspectorRecipesController';
  import { beginDragModalState, floatingStyleForKey, resetModalPosForKey } from '$lib/components/inspector/InspectorUiState';
  import {
    applyDrawerDateExact,
    applyDrawerNumericExact,
    copyDrawerAsJson as copyDrawerAsJsonController,
    loadRowDrawerData
  } from '$lib/components/inspector/InspectorRowDrawerController';
  import { createInspectorDebugLogger } from '$lib/components/inspector/InspectorDebugState';
  import {
    analyzeRegex,
    computeActiveFilterHash,
    escapeHtml,
    escapeRegExp,
    fnv1a32
  } from '$lib/components/inspector/InspectorUtilsController';
  // AutoAnimate Svelte action (used as: use:aa)
  function aa(node: HTMLElement, opts?: { duration?: number }) {
    try {
      if (isWebKitRuntime()) return {} as any;
    } catch {
      if (isWebKitRuntime()) return {} as any;
    }

    const ctl = safeAutoAnimate(node, {
      duration: opts?.duration ?? autoAnimateDuration
    });
    return {
      destroy() {
        try { (ctl as any)?.disable?.(); } catch {}
      }
    };
  }

  function withViewTransition(fn: () => void) {
    try {
      const d = document as any;
      if (typeof d?.startViewTransition === 'function') {
        d.startViewTransition(() => fn());
      } else fn();
    } catch {
      fn();
    }
  }


  type DialogMod = typeof import('@tauri-apps/plugin-dialog');

  const ROW_HEIGHT = INSPECTOR_THEME.grid.rowHeight;
  const OVERSCAN = INSPECTOR_THEME.grid.overscan;
  const MAX_WINDOW_ABS = INSPECTOR_THEME.grid.maxWindowAbs; // DOM cap
  let uiAnimDur = $state(160);
  const UI_ANIM_EASE = (t: number) => 1 - Math.pow(1 - t, 3);
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const perf = new PerfRecorder();
  const SLO_P95_MS = {
    filter: 180,
    slice: 60,
    sort: 250,
    schema: 350,
    category: 120,
    row_drawer: 180
  } as const;
  const filterGate = createRequestGate();
  const sliceGate = createRequestGate();
  const sortGate = createRequestGate();
  const categoryGate = createRequestGate();

  type ColType = 'numeric' | 'date' | 'string';

  type LoadResp = { headers: string[]; rowCount: number; colTypes?: ColType[]; filteredCount?: number };
  type SliceResp = { rows: string[][] } | string[][];
  type DatasetSource =
    | { kind: 'text'; text: string }
    | { kind: 'path'; path: string };
  type WorkspaceDataset = {
    id: string;
    label: string;
    hasHeaders: boolean;
    source: DatasetSource;
  };

  // -------------------- Data state --------------------
  let headers = $state<string[]>([]);
  let totalRowCount = $state(0);
  let totalFilteredCount = $state(0);
  let visibleRows = $state<string[][]>([]);

  // ---- Schema / dataset identity ----
  let colTypes = $state<ColType[]>([]);
  let datasetId = $state<string>('');
  let datasetLabel = $state<string>('(none)');
  let loadedDatasets = $state<WorkspaceDataset[]>([]);
  let activeDatasetId = $state<string>('');
  let activeDatasetLabel = $derived.by(() => {
    const active = (loadedDatasets ?? []).find((d) => d.id === activeDatasetId);
    const label = active?.label || datasetLabel || '(active dataset)';
    return (label ?? '').trim() || '(active dataset)';
  });
  let queryScope = $state<'current' | 'all' | 'ask'>('current');
  let crossQueryBusy = $state(false);
  let crossQueryResults = $state<{ datasetId: string; label: string; filtered: number; total: number }[]>([]);
  let mergedHeaders = $state<string[]>([]);
  let mergedRowsAll = $state<string[][]>([]);
  let isMergedView = $state(false);
  let preMergedHeaders = $state<string[]>([]);
  let preMergedColTypes = $state<ColType[]>([]);
  let preMergedTotalRowCount = $state(0);
  let preMergedTotalFilteredCount = $state(0);
  let hiddenUploadInput = $state<HTMLInputElement | null>(null);
  let suspendReactiveFiltering = $state(false);

  // Map header -> column index (for drawer actions)
  let headerIndexMap = $derived.by(() => {
    const m = new Map<string, number>();
    for (let i = 0; i < (headers ?? []).length; i++) m.set(headers[i], i);
    return m;
  });

  // ---- Schema stats (client-side profiled sample) ----
  type SchemaColStat = {
    idx: number;
    name: string;
    type: ColType;

    // Completeness
    empty: number;
    nonEmpty: number;
    emptyPct: number;

    // Type quality
    typeConfidence: number;        // 0..1 confidence in declared type
    numericParseRate: number;      // 0..1 among non-empty values
    dateParseRate: number;         // 0..1 among non-empty values

    // Cardinality / distribution (sampled)
    distinctSample: number;
    distinctRatio: number;         // distinctSample / max(1, nonEmpty)
    entropyNorm: number;           // 0..1 normalized entropy using sampled frequency map
    topSample: { v: string; n: number }[];

    // Range (best-effort if numeric/date)
    min?: string;
    max?: string;
  };
  let showSchemaModal = $state(false);
  let schemaLoading = $state(false);
  let schemaError = $state<string | null>(null);
  let schemaSearch = $state('');
  let schemaSampleN = $state(2000);
  let schemaSampleTier = $state<'fast' | 'balanced' | 'full'>('balanced');
  let schemaStats = $state<SchemaColStat[]>([]);
  let schemaScopeLabel = $state<'full' | 'filtered'>('full');
  const schemaCache = new Map<string, SchemaColStat[]>();

  // Derived schema search + filtered stats (avoid {@const} in <tbody>)
  let schemaSearchQ = $derived.by(() => (schemaSearch ?? '').toLowerCase().trim());
  let schemaFiltered = $derived.by(() => {
    const q = schemaSearchQ;
    const base = schemaStats ?? [];
    if (!q) return base;
    return base.filter((s) => (`${s.idx} ${s.name} ${s.type}`).toLowerCase().includes(q));
  });

  // Suggested “good filter” columns (entropy/distinctness-based)
  type SuggestedCol = { idx: number; name: string; kind: 'categorical'|'numeric'|'date'|'identifier'; score: number; reason: string };

  function scoreMid(x: number, mid: number, width: number): number {
    // 1 at mid, falls linearly to 0 at +/- width
    const d = Math.abs(x - mid);
    return clamp(1 - d / Math.max(1e-6, width), 0, 1);
  }

  let schemaSuggested = $derived.by(() => {
    const base = schemaStats ?? [];
    const out: SuggestedCol[] = [];

    for (const s of base) {
      if ((s.nonEmpty ?? 0) < 25) continue;
      if ((s.emptyPct ?? 100) > 60) continue;

      // Identifier: almost all values unique
      if (s.distinctRatio >= 0.9 && s.entropyNorm >= 0.9) {
        out.push({
          idx: s.idx,
          name: s.name,
          kind: 'identifier',
          score: (1 - s.emptyPct / 100) * s.distinctRatio,
          reason: `High uniqueness (${(s.distinctRatio * 100).toFixed(0)}% distinct)`
        });
        continue;
      }

      // Categorical: low-ish cardinality, not too skewed, not too unique
      const isCat = s.distinctSample >= 2 && s.distinctSample <= 30 && s.distinctRatio <= 0.35;
      if (isCat) {
        const skewOk = scoreMid(s.entropyNorm, 0.7, 0.5);
        const score = (1 - s.emptyPct / 100) * (1 - s.distinctRatio) * skewOk * Math.log(1 + s.distinctSample);
        out.push({
          idx: s.idx,
          name: s.name,
          kind: 'categorical',
          score,
          reason: `Low card (${s.distinctSample}) • entropy ${(s.entropyNorm * 100).toFixed(0)}%`
        });
      }

      // Numeric/date: good parse rate even if backend typed string
      if (s.numericParseRate >= 0.95) {
        out.push({
          idx: s.idx,
          name: s.name,
          kind: 'numeric',
          score: (1 - s.emptyPct / 100) * s.numericParseRate * scoreMid(s.distinctRatio, 0.6, 0.5),
          reason: `Numeric parse ${(s.numericParseRate * 100).toFixed(0)}%`
        });
      }
      if (s.dateParseRate >= 0.9) {
        out.push({
          idx: s.idx,
          name: s.name,
          kind: 'date',
          score: (1 - s.emptyPct / 100) * s.dateParseRate,
          reason: `Date parse ${(s.dateParseRate * 100).toFixed(0)}%`
        });
      }
    }

    // Keep best per kind
    const pick = (kind: SuggestedCol['kind'], n: number) =>
      out.filter((x) => x.kind === kind).sort((a, b) => b.score - a.score).slice(0, n);

    return {
      categorical: pick('categorical', 8),
      numeric: pick('numeric', 6),
      date: pick('date', 6),
      identifier: pick('identifier', 6),
    };
  });

  type OutlierHint = { idx: number; name: string; zHint: number; reason: string };
  let schemaOutliers = $derived.by(() => {
    const out: OutlierHint[] = [];
    for (const s of schemaStats ?? []) {
      if (s.type !== 'numeric') continue;
      const ratio = s.distinctRatio ?? 0;
      const entropy = s.entropyNorm ?? 0;
      const parse = s.numericParseRate ?? 0;
      // Proxy score for outlier-prone numeric columns.
      const zHint = clamp((ratio * 0.8 + entropy * 0.4 + parse * 0.3) * 3.2, 0, 5);
      if (zHint < 2.2) continue;
      out.push({
        idx: s.idx,
        name: s.name,
        zHint: Number(zHint.toFixed(2)),
        reason: `High spread signature (distinct ${(ratio * 100).toFixed(0)}%, entropy ${(entropy * 100).toFixed(0)}%).`
      });
    }
    return out.sort((a, b) => b.zHint - a.zHint).slice(0, 8);
  });

  type RelHint = { a: number; b: number; score: number; reason: string };
  let schemaRelationshipHints = $derived.by(() => {
    const hs = schemaStats ?? [];
    const out: RelHint[] = [];
    for (let i = 0; i < hs.length; i++) {
      for (let j = i + 1; j < hs.length; j++) {
        const a = hs[i];
        const b = hs[j];
        if (!a || !b) continue;
        if (a.type !== b.type) continue;
        const cardProx = 1 - Math.abs((a.distinctRatio ?? 0) - (b.distinctRatio ?? 0));
        const emptyProx = 1 - Math.abs((a.emptyPct ?? 0) - (b.emptyPct ?? 0)) / 100;
        const score = clamp(cardProx * 0.7 + emptyProx * 0.3, 0, 1);
        if (score < 0.86) continue;
        out.push({
          a: a.idx,
          b: b.idx,
          score: Number(score.toFixed(2)),
          reason: `${a.name} ↔ ${b.name} show similar cardinality/completeness.`
        });
      }
    }
    return out.sort((x, y) => y.score - x.score).slice(0, 8);
  });

  let schemaDriftBaseline = $state<SchemaColStat[] | null>(null);
  let schemaDrift = $derived.by(() => {
    if (!schemaDriftBaseline?.length || !(schemaStats?.length ?? 0)) return [];
    const base = new Map<number, SchemaColStat>();
    for (const s of schemaDriftBaseline) base.set(s.idx, s);
    const out: { idx: number; name: string; drift: number; reason: string }[] = [];
    for (const s of schemaStats ?? []) {
      const b = base.get(s.idx);
      if (!b) continue;
      const dEmpty = Math.abs((s.emptyPct ?? 0) - (b.emptyPct ?? 0)) / 100;
      const dDistinct = Math.abs((s.distinctRatio ?? 0) - (b.distinctRatio ?? 0));
      const dType = s.type === b.type ? 0 : 0.5;
      const drift = clamp(dEmpty * 0.35 + dDistinct * 0.45 + dType * 0.2, 0, 1);
      if (drift < 0.15) continue;
      out.push({
        idx: s.idx,
        name: s.name,
        drift: Number(drift.toFixed(2)),
        reason: `empty ${(b.emptyPct ?? 0).toFixed(1)}%→${(s.emptyPct ?? 0).toFixed(1)}%, distinct ${(b.distinctRatio ?? 0).toFixed(2)}→${(s.distinctRatio ?? 0).toFixed(2)}`
      });
    }
    return out.sort((a, b) => b.drift - a.drift).slice(0, 10);
  });

  function applySuggestedColumn(idx: number) {
    // Set target column and focus search; keep schema modal open
    targetColIdx = idx;
  }

  function schemaActionTarget(idx: number) {
    targetColIdx = idx;
  }

  function schemaActionCategory(idx: number, autoSelectTop = true) {
    tier2Open = true;
    tier2Tab = 'category';
    catF.enabled = true;
    catF.colIdx = idx;
    // Auto-select top values when we have them (best for quick filtering)
    if (autoSelectTop) {
      const st = (schemaStats ?? []).find((s) => s.idx === idx);
      const top = (st?.topSample ?? []).slice(0, 6).map((x) => x.v).filter((v) => (v ?? '').trim().length > 0);
      catF.selected = new Set<string>(top);
    }
    void runFilterNow();
  }

  function schemaActionNumericRange(idx: number, useMinMax = true) {
    tier2Open = true;
    tier2Tab = 'numeric';
    numericF.enabled = true;
    numericF.colIdx = idx;
    const st = (schemaStats ?? []).find((s) => s.idx === idx);
    if (useMinMax && st?.min != null && st?.max != null) {
      numericF.minText = st.min;
      numericF.maxText = st.max;
    }
    void runFilterNow();
  }

  function schemaActionDateRange(idx: number, useMinMax = true) {
    tier2Open = true;
    tier2Tab = 'date';
    dateF.enabled = true;
    dateF.colIdx = idx;
    const st = (schemaStats ?? []).find((s) => s.idx === idx);
    if (useMinMax && st?.min != null && st?.max != null) {
      dateF.minIso = st.min;
      dateF.maxIso = st.max;
    }
    void runFilterNow();
  }


  // -------------------- Sort state (server-side) --------------------
  let sortColIdx = $state<number | null>(null);
  let sortDir = $state<'asc' | 'desc'>('asc');
  let sortSpecs = $state<{ colIdx: number; dir: 'asc' | 'desc' }[]>([]);
  let sortPriority = $derived.by(() => {
    const out: Record<number, number> = {};
    for (let i = 0; i < (sortSpecs ?? []).length; i++) out[sortSpecs[i].colIdx] = i;
    return out;
  });

  // Grid layout controls
  let pinnedLeft = $state<number[]>([]);
  let pinnedRight = $state<number[]>([]);
  let hiddenColumns = $state<number[]>([]);
  let columnWidths = $state<Record<number, number>>({});

  // Command/shortcuts overlay
  let showShortcuts = $state(false);
  let quietBackendLogs = $state(true);
  let showInspectorMenu = $state(false);
  let modalPos = $state<Record<string, { x: number; y: number }>>({
    recipes: { x: 0, y: 0 },
    schema: { x: 0, y: 0 },
    shortcuts: { x: 0, y: 0 },
    svar: { x: 0, y: 0 }
  });
  let dragState = $state<{ key: string; sx: number; sy: number; ox: number; oy: number } | null>(null);

  // -------------------- Search/filter state --------------------
  type MatchMode = 'fuzzy' | 'exact' | 'regex';
  let query = $state('');
  let matchMode = $state<MatchMode>('fuzzy');
  // null => all columns
  let targetColIdx = $state<number | null>(null);
  // string input; blank => backend default
  let maxRowsScanText = $state<string>('');
  let queryError = $state<string | null>(null);

  // -------------------- Tier-2 filters (numeric/date/category) --------------------
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
  let tier2Tab = $state<'numeric' | 'date' | 'category'>('numeric');

  let numericF = $state<NumericFilterState>({ enabled: false, colIdx: null, minText: '', maxText: '', error: null });
  let dateF = $state<DateFilterState>({ enabled: false, colIdx: null, minIso: '', maxIso: '', error: null });
  let catF = $state<CategoryFilterState>({ enabled: false, colIdx: null, selected: new Set() });

  let catSearch = $state('');
  let catAvailSearch = $state('');
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

  // Debounce for filter calls
  let filterTimer: any = null;
  let crossQueryTimer: any = null;
  let sliceTimer: any = null;
  const FILTER_DEBOUNCE_MS = 120;
  let filterInFlight = $state(false);
  let filterPending = false;
  let filterLastReason = 'unknown';

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
    sliceLabel: 'Slice: 0-0'
  });

  function recordPerf(
    op: 'filter' | 'slice' | 'sort' | 'schema' | 'category' | 'row_drawer',
    started: number,
    meta?: Record<string, unknown>
  ) {
    const ms = performance.now() - started;
    perf.record({ op, ms, ts: Date.now(), meta });
    const p95 = perf.summary(op).p95;
    const slo = SLO_P95_MS[op];
    const status = p95 <= slo ? 'ok' : 'slo_violation';
    console.log('[SC][Inspector][perf]', { op, ms: Number(ms.toFixed(1)), p95: Number(p95.toFixed(1)), slo, status, ...(meta ?? {}) });
  }

  function emitBaselineReportToConsole() {
    console.log('[SC][Inspector][baseline]\\n' + perf.baselineReport(SLO_P95_MS as any));
  }

  // -------------------- UI/virtualization state --------------------
  let hasLoaded = $state(false);
  let showDataControls = $state(false);
  let showControlsDebug = $state(true); // temporary runtime probe
  let isLoading = $state(false);
  let loadError = $state<string | null>(null);

  // Header handling
  type HeaderMode = 'auto' | 'yes' | 'no';
  let headerMode = $state<HeaderMode>('auto');
  let hasHeaders = $state(true); // resolved boolean sent to backend
  let showHeaderPrompt = $state(false);
  let headerHeuristicReason = $state('');
  let pendingText: string | null = null;
  let pendingPath: string | null = null;

  // Column picker
  let showColumnPicker = $state(false);
  let visibleColumns = $state<Set<number>>(new Set()); // if empty => auto/all
  let columnPickerNotice = $state<string | null>(null);

  // Row detail drawer (full schema, ignores column picker)
  type KeyValue = { key: string; value: string; idx: number | null; type: ColType | null };
  let showRowDrawer = $state(false);
  let drawerLoading = $state(false);
  let drawerError = $state<string | null>(null);
  let drawerVisualIdx = $state<number | null>(null);
  let drawerKVs = $state<KeyValue[]>([]);
  let drawerSearch = $state('');
  let drawerExplain = $state<{ passes: boolean; reasons: string[]; sourceRowIdx: number } | null>(null);
  let drawerNeedle = $derived.by(() => (drawerSearch ?? '').toLowerCase().trim());
  let drawerList = $derived.by(() => {
    const needle = drawerNeedle;
    const base = drawerKVs ?? [];
    if (!needle) return base;
    return base.filter((kv) =>
      (kv.key ?? '').toLowerCase().includes(needle) || (kv.value ?? '').toLowerCase().includes(needle)
    );
  });

  // Persisted filter / regex “recipes”

  const RECIPES_STORE_KEY = 'inspector.recipes.store.v3';
  const LAST_STATE_STORE_KEY = 'inspector.last_state.store.v3';
  const LEGACY_RECIPES_STORE_KEYS = ['inspector.recipes.store.v2'];
  const LEGACY_LAST_STATE_KEYS = ['inspector.last_state.store.v2'];
  let autoRestoreEnabled = $state(true);
  let recipes = $state<Recipe[]>([]);
  let showRecipeModal = $state(false);
  let recipeName = $state('');
  let recipeTags = $state('');
  let recipeNotice = $state<string | null>(null);
  let importMode = $state<'current' | 'file'>('current');
  let pendingRestore: RecipeState | null = null;

  // Regex performance hints
  let regexHints = $derived.by(() => (matchMode === 'regex' ? analyzeRegex(query) : []));
  let regexDanger = $derived.by(() => regexHints.some((h) => h.level === 'danger'));

  // Regex help/generator
  let showRegexHelp = $state(false);
  let showRegexGenerator = $state(false);
  let showSvarBuilder = $state(false);
  let svarFilterSet = $state<IFilterSet>({ glue: 'and', rules: [] });
  let svarNotice = $state<string | null>(null);
  let debugLogEnabled = $state(true);
  let debugLogPath = $state<string>('');
  let lastGridWindowSig = $state('');
  let lastCrossReactiveSig = $state('');

  // Tauri path-open support (plugin-dialog)
  let isTauri = $state(false);
  let canOpenPath = $state(false);
  let dialogMod = $state<DialogMod | null>(null);
  let prefersReducedMotion = $state(false);
  let mergedRowFxEnabled = $derived.by(
    () => !prefersReducedMotion && !crossQueryBusy && (visibleRows?.length ?? 0) <= 260
  );
  let autoAnimateDuration = $derived.by(() => {
    if (prefersReducedMotion) return 0;
    if (crossQueryBusy || totalFilteredCount > 200_000) return 90;
    if (totalFilteredCount > 50_000) return 120;
    if (totalFilteredCount > 10_000) return 145;
    return 180;
  });

  let topControlSpans = $derived.by(() => {
    if (showDataControls) return {};
    return {
      headers: 'col-span-6 md:col-span-3 md:row-start-1',
      target: 'col-span-6 md:col-span-3 md:row-start-1',
      match: 'col-span-12 md:col-span-2 md:row-start-1',
      scope: 'col-span-12 md:col-span-2 md:row-start-1',
      maxScan: 'col-span-12 md:col-span-2 md:row-start-1',
      query: 'hidden',
      options: 'hidden',
    } as const;
  });

  let startIdx = $derived.by(() => gridWindow.startIdx ?? 0);
  let endIdx = $derived.by(() => gridWindow.endIdx ?? 0);
  let renderedCount = $derived.by(() => gridWindow.renderedCount ?? 0);
  let maxWindow = $derived.by(() => gridWindow.maxWindow ?? 0);
  let translateY = $derived.by(() => gridWindow.translateY ?? 0);
  let phantomHeight = $derived.by(() => gridWindow.phantomHeight ?? 0);
  let sliceLabel = $derived.by(() => gridWindow.sliceLabel ?? 'Slice: 0-0');

  $effect(() => {
    const hasSignals = hasLoadedDatasetSignals({
      hasLoaded,
      loadedDatasetsLength: loadedDatasets?.length ?? 0,
      activeDatasetId,
      datasetId,
      headersLength: headers?.length ?? 0,
      totalRowCount
    });
    showDataControls = hasSignals;
  });

  // Visible column list used for rendering
  let visibleColIdxs = $derived.by(() => {
    const n = headers.length;
    if (!n) return [];
    const sourceIdx = headers.indexOf('_source_file');
    const defaultCols = () => {
      if (n > 50) {
        const set = new Set<number>();
        set.add(0);
        for (let i = 0; i < Math.min(n, 12); i++) set.add(i);
        return [...set].filter((i) => i !== sourceIdx).sort((a, b) => a - b);
      }
      return Array.from({ length: n }, (_, i) => i).filter((i) => i !== sourceIdx);
    };
    // If user picked columns, honor it
    if (visibleColumns && visibleColumns.size > 0) {
      const picked = [...visibleColumns]
        .filter((i) => i >= 0 && i < n && i !== sourceIdx)
        .sort((a, b) => a - b);
      // Guard: avoid rendering a blank table when persisted picks don't exist in this dataset.
      return picked.length > 0 ? picked : defaultCols();
    }
    // Default: if many columns, pick first ~12 + col0
    return defaultCols();
  });

  let mergedSourceIdx = $derived.by(() => (isMergedView ? headers.indexOf('_source_file') : -1));
  let mergedDisplayHeaders = $derived.by(() => {
    if (!isMergedView) return headers;
    if (mergedSourceIdx < 0) return headers;
    return headers.filter((_, i) => i !== mergedSourceIdx);
  });
  let mergedGroupedRows = $derived.by(() => {
    if (!isMergedView) return [] as { source: string; rows: string[][] }[];
    const srcIdx = mergedSourceIdx;
    const groups: { source: string; rows: string[][] }[] = [];
    let lastSource = '';
    for (const rawRow of visibleRows ?? []) {
      const source = srcIdx >= 0 ? (rawRow?.[srcIdx] ?? 'Unknown source') : 'Merged results';
      const row = srcIdx >= 0 ? rawRow.filter((_, i) => i !== srcIdx) : rawRow;
      if (!groups.length || source !== lastSource) {
        groups.push({ source, rows: [row] });
        lastSource = source;
      } else {
        groups[groups.length - 1].rows.push(row);
      }
    }
    return groups;
  });

  let parseDiagnostics = $derived.by(() => {
    const out: { idx: number; name: string; numericFail: number; dateFail: number }[] = [];
    if (!(visibleRows?.length ?? 0)) return out;
    for (let i = 0; i < headers.length; i++) {
      const t = colTypes?.[i] ?? 'string';
      if (t !== 'numeric' && t !== 'date') continue;
      let nFail = 0;
      let dFail = 0;
      for (const row of visibleRows ?? []) {
        const raw = (row?.[i] ?? '').trim();
        if (!raw) continue;
        if (t === 'numeric' && parseF64Relaxed(raw) == null) nFail++;
        if (t === 'date' && parseDateRelaxed(raw) == null) dFail++;
      }
      if (nFail > 0 || dFail > 0) out.push({ idx: i, name: headers[i] ?? String(i), numericFail: nFail, dateFail: dFail });
    }
    return out.slice(0, 8);
  });

  const svarFieldType = (t: ColType | undefined): 'text' | 'number' | 'date' => {
    if (t === 'numeric') return 'number';
    if (t === 'date') return 'date';
    return 'text';
  };

  let svarFields = $derived.by(() =>
    (headers ?? []).map((h, i) => ({
      id: String(i),
      label: h,
      type: svarFieldType(colTypes?.[i])
    }))
  );

  let svarOptions = $derived.by(() => {
    const out: Record<string, (string | number | Date)[]> = {};
    for (const s of schemaStats ?? []) {
      const top = (s.topSample ?? []).slice(0, 10).map((x) => x.v).filter((v) => v.length > 0);
      if (top.length) out[String(s.idx)] = top;
    }
    return out;
  });

  // -------------------- Header heuristic --------------------
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

  // -------------------- Filtering --------------------
  function filterControllerCtx() {
    return {
      FILTER_DEBOUNCE_MS,
      buildFilterSpecFromState,
      invoke,
      escapeRegExp,
      queueDebug,
      queueDebugRate,
      recordPerf,
      runCrossDatasetQuery,
      fetchVisibleSlice,
      get headers() { return headers; },
      get hasLoaded() { return hasLoaded; },
      get suspendReactiveFiltering() { return suspendReactiveFiltering; },
      get crossQueryBusy() { return crossQueryBusy; },
      get queryScope() { return queryScope; },
      get isMergedView() { return isMergedView; },
      set isMergedView(v: boolean) { isMergedView = v; },
      get loadedDatasets() { return loadedDatasets; },
      get filterPending() { return filterPending; },
      set filterPending(v: boolean) { filterPending = v; },
      get filterInFlight() { return filterInFlight; },
      set filterInFlight(v: boolean) { filterInFlight = v; },
      get filterGate() { return filterGate; },
      get filterLastReason() { return filterLastReason; },
      set filterLastReason(v: string) { filterLastReason = v; },
      get filterTimer() { return filterTimer; },
      set filterTimer(v: ReturnType<typeof setTimeout> | null) { filterTimer = v; },
      get crossQueryTimer() { return crossQueryTimer; },
      set crossQueryTimer(v: ReturnType<typeof setTimeout> | null) { crossQueryTimer = v; },
      get query() { return query; },
      set query(v: string) { query = v; },
      get targetColIdx() { return targetColIdx; },
      set targetColIdx(v: number | null) { targetColIdx = v; },
      get matchMode() { return matchMode; },
      set matchMode(v: 'fuzzy' | 'regex' | 'exact') { matchMode = v; },
      get numericF() { return numericF; },
      set numericF(v: typeof numericF) { numericF = v; },
      get dateF() { return dateF; },
      set dateF(v: typeof dateF) { dateF = v; },
      get catF() { return catF; },
      set catF(v: typeof catF) { catF = v; },
      get maxRowsScanText() { return maxRowsScanText; },
      get totalRowCount() { return totalRowCount; },
      set totalRowCount(v: number) { totalRowCount = v; },
      get totalFilteredCount() { return totalFilteredCount; },
      set totalFilteredCount(v: number) { totalFilteredCount = v; },
      get visibleColIdxs() { return visibleColIdxs; },
      get queryError() { return queryError; },
      set queryError(v: string | null) { queryError = v; },
      get loadError() { return loadError; },
      set loadError(v: string | null) { loadError = v; },
      get lastCrossReactiveSig() { return lastCrossReactiveSig; },
      set lastCrossReactiveSig(v: string) { lastCrossReactiveSig = v; },
      get crossQueryResults() { return crossQueryResults; },
      set crossQueryResults(v: typeof crossQueryResults) { crossQueryResults = v; },
      get preMergedHeaders() { return preMergedHeaders; },
      get preMergedColTypes() { return preMergedColTypes; },
      get preMergedTotalRowCount() { return preMergedTotalRowCount; },
      get preMergedTotalFilteredCount() { return preMergedTotalFilteredCount; },
      get colTypes() { return colTypes; },
      set colTypes(v: ColType[]) { colTypes = v; },
      get svarFilterSet() { return svarFilterSet; },
      get showSvarBuilder() { return showSvarBuilder; },
      set showSvarBuilder(v: boolean) { showSvarBuilder = v; },
      get svarNotice() { return svarNotice; },
      set svarNotice(v: string | null) { svarNotice = v; },
      set headers(v: string[]) { headers = v; }
    };
  }

  function buildFilterSpec() {
    return buildFilterSpecController(filterControllerCtx());
  }

  async function applyFilterSpec(spec: any): Promise<number> {
    const resp = (await invoke('inspector_filter', { spec })) as number | { filteredCount: number };
    return typeof resp === 'number' ? resp : (resp?.filteredCount ?? totalRowCount);
  }

  async function runFilterNow(forceCurrent = false) {
    await runFilterNowController(filterControllerCtx(), forceCurrent);
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

      // Drop stale responses when a newer request exists.
      if (!filterGate.isLatest(token)) return;
      totalFilteredCount = count;
      recordPerf('filter', t0, {
        reason: filterLastReason,
        filteredRows: totalFilteredCount,
        totalRows: totalRowCount,
        visibleCols: visibleColIdxs.length
      });

      // When filter changes, keep scroll position but refresh slice
      await fetchVisibleSlice();
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      if (matchMode === 'regex') queryError = msg;
      else loadError = msg;
    }
  }

  function scheduleFilter(reason = 'debounced-input') {
    scheduleFilterController(filterControllerCtx(), reason);
  }

  function scheduleCrossQuery(reason = 'debounced-cross-input') {
    scheduleCrossQueryController(filterControllerCtx(), reason);
  }

  function clearAllFilters() {
    clearAllFiltersController(filterControllerCtx());
  }

  function onQueryScopeChange() {
    onQueryScopeChangeController(filterControllerCtx());
  }

  function applySvarBuilderToFilters() {
    applySvarBuilderToFiltersController(filterControllerCtx());
  }

  function loadControllerCtx() {
    return {
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
      get hiddenUploadInput() { return hiddenUploadInput; },
      get isLoading() { return isLoading; },
      set isLoading(v: boolean) { isLoading = v; },
      get isMergedView() { return isMergedView; },
      set isMergedView(v: boolean) { isMergedView = v; },
      get loadError() { return loadError; },
      set loadError(v: string | null) { loadError = v; },
      get hasHeaders() { return hasHeaders; },
      set hasHeaders(v: boolean) { hasHeaders = v; },
      get headerMode() { return headerMode; },
      get headerHeuristicReason() { return headerHeuristicReason; },
      set headerHeuristicReason(v: string) { headerHeuristicReason = v; },
      get pendingText() { return pendingText; },
      set pendingText(v: string | null) { pendingText = v; },
      get pendingPath() { return pendingPath; },
      set pendingPath(v: string | null) { pendingPath = v; },
      get showHeaderPrompt() { return showHeaderPrompt; },
      set showHeaderPrompt(v: boolean) { showHeaderPrompt = v; },
      get headers() { return headers; },
      set headers(v: string[]) { headers = v; },
      get totalRowCount() { return totalRowCount; },
      set totalRowCount(v: number) { totalRowCount = v; },
      get totalFilteredCount() { return totalFilteredCount; },
      set totalFilteredCount(v: number) { totalFilteredCount = v; },
      get visibleRows() { return visibleRows; },
      set visibleRows(v: string[][]) { visibleRows = v; },
      get colTypes() { return colTypes; },
      set colTypes(v: ColType[]) { colTypes = v; },
      get datasetId() { return datasetId; },
      set datasetId(v: string) { datasetId = v; },
      get datasetLabel() { return datasetLabel; },
      set datasetLabel(v: string) { datasetLabel = v; },
      get recipes() { return recipes; },
      set recipes(v: Recipe[]) { recipes = v; },
      get pendingRestore() { return pendingRestore; },
      set pendingRestore(v: RecipeState | null) { pendingRestore = v; },
      get hasLoaded() { return hasLoaded; },
      set hasLoaded(v: boolean) { hasLoaded = v; },
      get showDataControls() { return showDataControls; },
      set showDataControls(v: boolean) { showDataControls = v; },
      get activeDatasetId() { return activeDatasetId; },
      set activeDatasetId(v: string) { activeDatasetId = v; },
      get loadedDatasets() { return loadedDatasets; },
      set loadedDatasets(v: WorkspaceDataset[]) { loadedDatasets = v; },
      get query() { return query; },
      get matchMode() { return matchMode; },
      get targetColIdx() { return targetColIdx; },
      set targetColIdx(v: number | null) { targetColIdx = v; },
      get numericF() { return numericF; },
      set numericF(v: typeof numericF) { numericF = v; },
      get dateF() { return dateF; },
      set dateF(v: typeof dateF) { dateF = v; },
      get catF() { return catF; },
      set catF(v: typeof catF) { catF = v; },
      get suspendReactiveFiltering() { return suspendReactiveFiltering; },
      set suspendReactiveFiltering(v: boolean) { suspendReactiveFiltering = v; },
      get sortColIdx() { return sortColIdx; },
      set sortColIdx(v: number | null) { sortColIdx = v; },
      get sortDir() { return sortDir; },
      set sortDir(v: 'asc' | 'desc') { sortDir = v; },
      get sortSpecs() { return sortSpecs; },
      set sortSpecs(v: typeof sortSpecs) { sortSpecs = v; },
      get visibleColumns() { return visibleColumns; },
      set visibleColumns(v: Set<number>) { visibleColumns = v; },
      get pinnedLeft() { return pinnedLeft; },
      set pinnedLeft(v: number[]) { pinnedLeft = v; },
      get pinnedRight() { return pinnedRight; },
      set pinnedRight(v: number[]) { pinnedRight = v; },
      get hiddenColumns() { return hiddenColumns; },
      set hiddenColumns(v: number[]) { hiddenColumns = v; },
      get columnWidths() { return columnWidths; },
      set columnWidths(v: Record<number, number>) { columnWidths = v; },
      get crossQueryBusy() { return crossQueryBusy; },
      set crossQueryBusy(v: boolean) { crossQueryBusy = v; },
      get queryScope() { return queryScope; },
      get crossQueryResults() { return crossQueryResults; },
      set crossQueryResults(v: typeof crossQueryResults) { crossQueryResults = v; },
      get mergedHeaders() { return mergedHeaders; },
      set mergedHeaders(v: string[]) { mergedHeaders = v; },
      get mergedRowsAll() { return mergedRowsAll; },
      set mergedRowsAll(v: string[][]) { mergedRowsAll = v; },
      get preMergedHeaders() { return preMergedHeaders; },
      set preMergedHeaders(v: string[]) { preMergedHeaders = v; },
      get preMergedColTypes() { return preMergedColTypes; },
      set preMergedColTypes(v: ColType[]) { preMergedColTypes = v; },
      get preMergedTotalRowCount() { return preMergedTotalRowCount; },
      set preMergedTotalRowCount(v: number) { preMergedTotalRowCount = v; },
      get preMergedTotalFilteredCount() { return preMergedTotalFilteredCount; },
      set preMergedTotalFilteredCount(v: number) { preMergedTotalFilteredCount = v; },
      activateWorkspaceDataset
    };
  }

  // -------------------- Load CSV (text) --------------------
  async function loadCsvFromText(
    text: string,
    hasHeadersOverride?: boolean,
    trackWorkspace = true,
    forcedLabel?: string,
    applyInitialFilter = true
  ) {
    await loadCsvFromTextController(loadControllerCtx(), text, hasHeadersOverride, trackWorkspace, forcedLabel, applyInitialFilter);
  }

  // -------------------- Load CSV (path/stream) --------------------
  async function loadCsvFromPath(
    path: string,
    hasHeadersOverride?: boolean,
    trackWorkspace = true,
    forcedLabel?: string,
    applyInitialFilter = true
  ) {
    await loadCsvFromPathController(loadControllerCtx(), path, hasHeadersOverride, trackWorkspace, forcedLabel, applyInitialFilter);
  }

  function gridControllerCtx() {
    return {
      invoke,
      recordPerf,
      get hasLoaded() { return hasLoaded; },
      get sliceGate() { return sliceGate; },
      get startIdx() { return startIdx; },
      get endIdx() { return endIdx; },
      get visibleColIdxs() { return visibleColIdxs; },
      get isMergedView() { return isMergedView; },
      get mergedRowsAll() { return mergedRowsAll; },
      set mergedRowsAll(v: string[][]) { mergedRowsAll = v; },
      get visibleRows() { return visibleRows; },
      set visibleRows(v: string[][]) { visibleRows = v; },
      get loadError() { return loadError; },
      set loadError(v: string | null) { loadError = v; },
      get totalFilteredCount() { return totalFilteredCount; },
      get sliceTimer() { return sliceTimer; },
      set sliceTimer(v: ReturnType<typeof setTimeout> | null) { sliceTimer = v; },
      get headers() { return headers; },
      get sortGate() { return sortGate; },
      get sortColIdx() { return sortColIdx; },
      set sortColIdx(v: number | null) { sortColIdx = v; },
      get sortDir() { return sortDir; },
      set sortDir(v: 'asc' | 'desc') { sortDir = v; },
      get sortSpecs() { return sortSpecs; },
      set sortSpecs(v: typeof sortSpecs) { sortSpecs = v; },
      get visibleColumns() { return visibleColumns; },
      set visibleColumns(v: Set<number>) { visibleColumns = v; },
      get columnPickerNotice() { return columnPickerNotice; },
      set columnPickerNotice(v: string | null) { columnPickerNotice = v; },
      get showColumnPicker() { return showColumnPicker; },
      set showColumnPicker(v: boolean) { showColumnPicker = v; },
      get hiddenColumns() { return hiddenColumns; },
      set hiddenColumns(v: number[]) { hiddenColumns = v; },
      get pinnedLeft() { return pinnedLeft; },
      set pinnedLeft(v: number[]) { pinnedLeft = v; },
      get pinnedRight() { return pinnedRight; },
      set pinnedRight(v: number[]) { pinnedRight = v; },
      get columnWidths() { return columnWidths; },
      set columnWidths(v: Record<number, number>) { columnWidths = v; }
    };
  }

  // -------------------- Virtual slice fetch --------------------
  async function fetchVisibleSlice() {
    await fetchVisibleSliceController(gridControllerCtx());
  }

  function scheduleSliceFetch() {
    scheduleSliceFetchController(gridControllerCtx());
  }

  // -------------------- Sorting --------------------
  async function requestSort(colIdx: number, opts?: { multi?: boolean }) {
    await requestSortController(gridControllerCtx(), colIdx, opts);
  }

  // -------------------- Column picker helpers --------------------
  function smartSelectColumns() {
    smartSelectColumnsController(gridControllerCtx());
  }

  function openColumnPicker() {
    openColumnPickerController(gridControllerCtx());
  }

  function toggleVisibleCol(i: number) {
    toggleVisibleColController(gridControllerCtx(), i);
  }

  function selectAllColumns() {
    selectAllColumnsController(gridControllerCtx());
  }

  function clearColumnSelection() {
    clearColumnSelectionController(gridControllerCtx());
  }

  function hideColumn(idx: number) {
    hideColumnController(gridControllerCtx(), idx);
  }

  function togglePinLeft(idx: number) {
    togglePinLeftController(gridControllerCtx(), idx);
  }

  function togglePinRight(idx: number) {
    togglePinRightController(gridControllerCtx(), idx);
  }

  function onColumnResize(idx: number, width: number) {
    onColumnResizeController(gridControllerCtx(), idx, width);
  }

  // -------------------- Highlighting --------------------
  function activeFilterHash(): string {
    return computeActiveFilterHash({
      query,
      matchMode,
      targetColIdx,
      numericF,
      dateF,
      catF
    });
  }

  function upsertWorkspaceDataset(ds: WorkspaceDataset) {
    upsertWorkspaceDatasetController(loadControllerCtx(), ds);
  }

  async function unloadWorkspaceDataset(id: string) {
    await unloadWorkspaceDatasetController(loadControllerCtx(), id);
  }

  async function openStreamLoadFromMenu() {
    await openStreamLoadFromMenuController(loadControllerCtx());
  }

  function openFallbackLoadFromMenu() {
    openFallbackLoadFromMenuController(loadControllerCtx());
  }

  async function activateWorkspaceDataset(datasetIdToActivate: string, internal = false) {
    await activateWorkspaceDatasetController(loadControllerCtx(), datasetIdToActivate, internal);
  }

  async function runCrossDatasetQuery() {
    await runCrossDatasetQueryController(loadControllerCtx());
  }

  function recipesControllerCtx() {
    return {
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
      get autoRestoreEnabled() { return autoRestoreEnabled; },
      set autoRestoreEnabled(v: boolean) { autoRestoreEnabled = v; },
      get datasetId() { return datasetId; },
      get datasetLabel() { return datasetLabel; },
      get recipes() { return recipes; },
      set recipes(v: Recipe[]) { recipes = v; },
      get recipeNotice() { return recipeNotice; },
      set recipeNotice(v: string | null) { recipeNotice = v; },
      get hasLoaded() { return hasLoaded; },
      get headers() { return headers; },
      get visibleRows() { return visibleRows; },
      get visibleColIdxs() { return visibleColIdxs; },
      get totalFilteredCount() { return totalFilteredCount; },
      activeFilterHash,
      get schemaStats() { return schemaStats; },
      get perf() { return perf; },
      get invoke() { return invoke; },
      get recipeName() { return recipeName; },
      set recipeName(v: string) { recipeName = v; },
      get recipeTags() { return recipeTags; },
      set recipeTags(v: string) { recipeTags = v; }
    };
  }

  function loadRecipesForDataset(dsId: string): Recipe[] {
    return loadRecipesForDatasetController2(recipesControllerCtx(), dsId);
  }

  function persistRecipesForDataset(dsId: string, label: string, rs: Recipe[]) {
    persistRecipesForDatasetController2(recipesControllerCtx(), dsId, label, rs);
  }

  function loadLastStateForDataset(dsId: string): RecipeState | null {
    return loadLastStateForDatasetController2(recipesControllerCtx(), dsId);
  }

  function persistLastStateForDataset(dsId: string, st: RecipeState) {
    persistLastStateForDatasetController2(recipesControllerCtx(), dsId, st);
  }

  async function exportRecipesCurrent() {
    await exportRecipesCurrentController(recipesControllerCtx());
  }

  async function importRecipesFile(file: File, mode: 'current' | 'file') {
    await importRecipesFileController2(recipesControllerCtx(), file, mode);
  }

  async function exportCsvPreset(mode: 'current_view' | 'filtered_rows' | 'selected_columns') {
    await exportCsvPresetController(recipesControllerCtx(), mode);
  }

  function exportAnalysisBundle() {
    exportAnalysisBundleController(recipesControllerCtx());
  }

  function stateControllerCtx() {
    return {
      captureRecipeState,
      migrateAndNormalizeRecipeState,
      invoke,
      runFilterNow,
      get autoRestoreEnabled() { return autoRestoreEnabled; },
      set autoRestoreEnabled(v: boolean) { autoRestoreEnabled = v; },
      get query() { return query; },
      set query(v: string) { query = v; },
      get matchMode() { return matchMode; },
      set matchMode(v: 'fuzzy' | 'regex' | 'exact') { matchMode = v; },
      get targetColIdx() { return targetColIdx; },
      set targetColIdx(v: number | null) { targetColIdx = v; },
      get maxRowsScanText() { return maxRowsScanText; },
      set maxRowsScanText(v: string) { maxRowsScanText = v; },
      get numericF() { return numericF; },
      set numericF(v: typeof numericF) { numericF = v; },
      get dateF() { return dateF; },
      set dateF(v: typeof dateF) { dateF = v; },
      get catF() { return catF; },
      set catF(v: typeof catF) { catF = v; },
      get sortColIdx() { return sortColIdx; },
      set sortColIdx(v: number | null) { sortColIdx = v; },
      get sortDir() { return sortDir; },
      set sortDir(v: 'asc' | 'desc') { sortDir = v; },
      get sortSpecs() { return sortSpecs; },
      set sortSpecs(v: typeof sortSpecs) { sortSpecs = v; },
      get visibleColumns() { return visibleColumns; },
      set visibleColumns(v: Set<number>) { visibleColumns = v; },
      get pinnedLeft() { return pinnedLeft; },
      set pinnedLeft(v: number[]) { pinnedLeft = v; },
      get pinnedRight() { return pinnedRight; },
      set pinnedRight(v: number[]) { pinnedRight = v; },
      get hiddenColumns() { return hiddenColumns; },
      set hiddenColumns(v: number[]) { hiddenColumns = v; },
      get columnWidths() { return columnWidths; },
      set columnWidths(v: Record<number, number>) { columnWidths = v; },
      get headers() { return headers; }
    };
  }

  function captureState(): RecipeState {
    return captureStateController2(stateControllerCtx()) as RecipeState;
  }

  async function applyState(st: RecipeState) {
    await applyStateController2(stateControllerCtx(), st as unknown as RecipeStateV3);
  }


  function highlightCell(cell: string) {
    const raw = cell ?? '';
    const q = (query ?? '').trim();
    if (!q) return escapeHtml(raw);

    // Only highlight for fuzzy/exact, and best-effort for regex
    try {
      let re: RegExp | null = null;
      if (matchMode === 'regex') {
        re = new RegExp(q, 'gi');
      } else {
        re = new RegExp(escapeRegExp(q), 'gi');
      }

      const html = escapeHtml(raw).replace(re, (m) => `<mark class="ins-mark">${escapeHtml(m)}</mark>`);
      return html;
    } catch {
      return escapeHtml(raw);
    }
  }

  // -------------------- Row drawer --------------------
  function rowDrawerControllerCtx() {
    return {
      invoke: invoke as any,
      loadRowDrawerData,
      withViewTransition,
      recordPerf,
      clamp,
      scheduleFilter,
      runFilterNow,
      applyDrawerNumericExact,
      applyDrawerDateExact,
      copyDrawerAsJsonController,
      get hasLoaded() { return hasLoaded; },
      get headers() { return headers; },
      get colTypes() { return colTypes; },
      get totalFilteredCount() { return totalFilteredCount; },
      get showRowDrawer() { return showRowDrawer; },
      set showRowDrawer(v: boolean) { showRowDrawer = v; },
      get drawerLoading() { return drawerLoading; },
      set drawerLoading(v: boolean) { drawerLoading = v; },
      get drawerError() { return drawerError; },
      set drawerError(v: string | null) { drawerError = v; },
      get drawerVisualIdx() { return drawerVisualIdx; },
      set drawerVisualIdx(v: number | null) { drawerVisualIdx = v; },
      get drawerKVs() { return drawerKVs; },
      set drawerKVs(v: any[]) { drawerKVs = v as any; },
      get drawerSearch() { return drawerSearch; },
      set drawerSearch(v: string) { drawerSearch = v; },
      get drawerExplain() { return drawerExplain; },
      set drawerExplain(v: any) { drawerExplain = v; },
      get recipeNotice() { return recipeNotice; },
      set recipeNotice(v: string | null) { recipeNotice = v; },
      get targetColIdx() { return targetColIdx; },
      set targetColIdx(v: number | null) { targetColIdx = v; },
      get tier2Open() { return tier2Open; },
      set tier2Open(v: boolean) { tier2Open = v; },
      get tier2Tab() { return tier2Tab; },
      set tier2Tab(v: 'numeric' | 'date' | 'category') { tier2Tab = v; },
      get catF() { return catF; },
      set catF(v: typeof catF) { catF = v; },
      get numericF() { return numericF; },
      set numericF(v: typeof numericF) { numericF = v; },
      get dateF() { return dateF; },
      set dateF(v: typeof dateF) { dateF = v; }
    };
  }

  async function openRowDrawer(visualIdx: number) {
    await openRowDrawerController3(rowDrawerControllerCtx(), visualIdx);
  }

  function closeRowDrawer() {
    closeRowDrawerController2(rowDrawerControllerCtx());
  }

  async function copyDrawerAsJson() {
    await copyDrawerAsJsonController3(rowDrawerControllerCtx());
  }

  function navRow(delta: number) {
    navRowController2(rowDrawerControllerCtx(), delta);
  }

  function drawerApplyTarget(idx: number) {
    drawerApplyTargetController2(rowDrawerControllerCtx(), idx);
  }

  function drawerApplyCategory(idx: number, value: string) {
    drawerApplyCategoryController2(rowDrawerControllerCtx(), idx, value);
  }

  function drawerApplyNumericExact(idx: number, value: string) {
    drawerApplyNumericExactController3(rowDrawerControllerCtx(), idx, value);
  }

  function drawerApplyDateExact(idx: number, value: string) {
    drawerApplyDateExactController3(rowDrawerControllerCtx(), idx, value);
  }

  function openRecipes() {
    recipeNotice = null;
    withViewTransition(() => { showRecipeModal = true; });
  }

  function floatingStyle(key: string): string {
    return floatingStyleForKey(modalPos, key);
  }

  function beginDragModal(key: string, e: MouseEvent) {
    beginDragModalState({
      key,
      event: e,
      modalPos,
      setModalPos: (next) => {
        modalPos = next;
      },
      setDragState: (next) => {
        dragState = next;
      },
      getDragState: () => dragState
    });
  }

  function resetModalPos(key: string) {
    modalPos = resetModalPosForKey(modalPos, key);
  }

  function onGridWindowChange(w: GridWindow) {
    const sig = `${w.startIdx}:${w.endIdx}:${w.renderedCount}:${w.maxWindow}:${w.translateY}:${w.phantomHeight}`;
    if (sig === lastGridWindowSig) return;
    lastGridWindowSig = sig;
    gridWindow = w;
    queueDebugRate('gridWindow', 500, 'gridWindow', {
      start: w.startIdx,
      end: w.endIdx,
      rendered: w.renderedCount,
      maxWindow: w.maxWindow
    });
  }

  function saveCurrentAsRecipe() {
    saveCurrentAsRecipeController2(recipesControllerCtx());
  }

  async function applyRecipe(r: Recipe) {
    await applyRecipeController2(recipesControllerCtx(), r);
  }

  function deleteRecipe(id: string) {
    deleteRecipeController2(recipesControllerCtx(), id);
  }

  function toggleRecipeFavorite(id: string) {
    toggleRecipeFavoriteController2(recipesControllerCtx(), id);
  }

  // -------------------- Schema stats --------------------
  function schemaControllerCtx() {
    return {
      invoke,
      withViewTransition,
      profileSchemaFromRows,
      parseMaxRowsScanText,
      recordPerf,
      activeFilterHash,
      get hasLoaded() { return hasLoaded; },
      get headers() { return headers; },
      get query() { return query; },
      get matchMode() { return matchMode; },
      get targetColIdx() { return targetColIdx; },
      get schemaLoading() { return schemaLoading; },
      set schemaLoading(v: boolean) { schemaLoading = v; },
      get schemaError() { return schemaError; },
      set schemaError(v: string | null) { schemaError = v; },
      get schemaScopeLabel() { return schemaScopeLabel; },
      set schemaScopeLabel(v: 'full' | 'filtered') { schemaScopeLabel = v; },
      get schemaSampleTier() { return schemaSampleTier; },
      get schemaSampleN() { return schemaSampleN; },
      get totalFilteredCount() { return totalFilteredCount; },
      get totalRowCount() { return totalRowCount; },
      get datasetId() { return datasetId; },
      get schemaCache() { return schemaCache; },
      get schemaStats() { return schemaStats; },
      set schemaStats(v: SchemaColStat[]) { schemaStats = v; },
      get colTypes() { return colTypes; },
      get showSchemaModal() { return showSchemaModal; },
      set showSchemaModal(v: boolean) { showSchemaModal = v; },
      get schemaDriftBaseline() { return schemaDriftBaseline; },
      set schemaDriftBaseline(v: SchemaColStat[] | null) { schemaDriftBaseline = v; },
      get recipeNotice() { return recipeNotice; },
      set recipeNotice(v: string | null) { recipeNotice = v; },
      get categoryGate() { return categoryGate; },
      get catF() { return catF; },
      get catAvailItems() { return catAvailItems; },
      set catAvailItems(v: { value: string; count: number }[]) { catAvailItems = v; },
      get catAvailOffset() { return catAvailOffset; },
      set catAvailOffset(v: number) { catAvailOffset = v; },
      get catAvailDistinctTotal() { return catAvailDistinctTotal; },
      set catAvailDistinctTotal(v: number) { catAvailDistinctTotal = v; },
      get catAvailRowsScanned() { return catAvailRowsScanned; },
      set catAvailRowsScanned(v: number) { catAvailRowsScanned = v; },
      get catAvailTotalRowsInView() { return catAvailTotalRowsInView; },
      set catAvailTotalRowsInView(v: number) { catAvailTotalRowsInView = v; },
      get catAvailPartial() { return catAvailPartial; },
      set catAvailPartial(v: boolean) { catAvailPartial = v; },
      get catAvailError() { return catAvailError; },
      set catAvailError(v: string | null) { catAvailError = v; },
      get catAvailLoading() { return catAvailLoading; },
      set catAvailLoading(v: boolean) { catAvailLoading = v; },
      get catAvailSearch() { return catAvailSearch; },
      get catAvailLimit() { return catAvailLimit; },
      get maxRowsScanText() { return maxRowsScanText; },
      get catAvailTimer() { return catAvailTimer; },
      set catAvailTimer(v: ReturnType<typeof setTimeout> | null) { catAvailTimer = v; }
    };
  }

  async function computeSchemaStats() {
    await computeSchemaStatsController2(schemaControllerCtx());
  }

  function openSchema() {
    openSchemaController2(schemaControllerCtx());
  }

  function setSchemaDriftBaseline() {
    setSchemaDriftBaselineController2(schemaControllerCtx());
  }

  const debugLogger = createInspectorDebugLogger({
    enabled: () => debugLogEnabled,
    writeBatch: async (lines) => (await invoke('inspector_debug_log_batch', { lines })) as string,
    onPath: (path) => {
      if (!debugLogPath) debugLogPath = path;
    }
  });
  const queueDebug = (event: string, data?: Record<string, unknown>) => debugLogger.enqueue(event, data);
  const queueDebugRate = (key: string, minMs: number, event: string, data?: Record<string, unknown>) =>
    debugLogger.enqueueRate(key, minMs, event, data);
  onMount(() => {
    void invoke('inspector_debug_log_clear')
      .then((p) => {
        debugLogPath = String(p ?? '');
        queueDebug('sessionStart', { debugLogPath, ts: Date.now() });
      })
      .catch(() => {});

    // Silence benign ResizeObserver loop noise (can occur with virtualization + AutoAnimate)
    const __roErr = (e: any) => {
      try {
        const msg = String(e?.message ?? '');
        if (msg.includes('ResizeObserver loop')) {
          e?.stopImmediatePropagation?.();
          e?.preventDefault?.();
          return false;
        }
      } catch {}
    };
    window.addEventListener('error', __roErr);
    const __unhandledRejection = (e: PromiseRejectionEvent) => {
      queueDebug('unhandledrejection', {
        reason: String((e as any)?.reason ?? 'unknown')
      });
    };
    window.addEventListener('unhandledrejection', __unhandledRejection);

    try {
      isTauri = typeof window !== 'undefined' && (!!(window as any).__TAURI__ || !!(window as any).__TAURI_INTERNALS__);
    } catch {
      isTauri = false;
    }
    try {
      prefersReducedMotion =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        !!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      prefersReducedMotion = false;
    }
    uiAnimDur = prefersReducedMotion ? 0 : 160;

    (async () => {
      try {
        const mod = await import(/* @vite-ignore */ '@tauri-apps/plugin-dialog');
        dialogMod = mod as DialogMod;
        canOpenPath = isTauri;
      } catch {
        canOpenPath = false;
        dialogMod = null;
      }
    })();

    // Quiet backend logs by default (can be toggled from UI).
    void invoke('inspector_set_quiet_logs', { quiet: !!quietBackendLogs }).catch(() => {});

    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && k === 'k') {
        e.preventDefault();
        showShortcuts = !showShortcuts;
        return;
      }
      if ((e.metaKey || e.ctrlKey) && k === 'f') {
        e.preventDefault();
        const el = document.querySelector<HTMLInputElement>('input[placeholder=\"Type to filter…\"], input[placeholder=\"Regex pattern…\"]');
        el?.focus();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && k === 's') {
        e.preventDefault();
        openSchema();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && k === 'r') {
        e.preventDefault();
        openRecipes();
        return;
      }
      if (e.key === 'Escape') {
        if (showRowDrawer) {
          e.preventDefault();
          closeRowDrawer();
          return;
        }
        if (showShortcuts) {
          e.preventDefault();
          showShortcuts = false;
        }
      }
    };
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('error', __roErr);
      window.removeEventListener('unhandledrejection', __unhandledRejection);
      window.removeEventListener('keydown', onKey);
      void debugLogger.flush();
    };
});

  // Fetch slices when window changes
  $effect(() => {
    if (!hasLoaded || suspendReactiveFiltering) return;
    if (isMergedView) return;
    startIdx; endIdx; totalFilteredCount; visibleColIdxs.length;
    scheduleSliceFetch();
  });

  // Debounced filter on input changes
  $effect(() => {
    if (!hasLoaded || suspendReactiveFiltering || queryScope !== 'current') return;
    query; matchMode; targetColIdx; maxRowsScanText;
    numericF.enabled; numericF.colIdx; numericF.minText; numericF.maxText;
    dateF.enabled; dateF.colIdx; dateF.minIso; dateF.maxIso;
    catF.enabled; catF.colIdx; (catF.selected?.size ?? 0);
    scheduleFilter('reactive-input');
  });

  // In cross-file mode, avoid depending on suspendReactiveFiltering to prevent
  // self-trigger loops when runCrossDatasetQuery toggles the guard.
  $effect(() => {
    if (!hasLoaded || queryScope === 'current') return;

    const catSelected = [...(catF.selected ?? new Set())].sort();
    const dsSig = (loadedDatasets ?? []).map((d) => d.id).sort().join('|');
    const sig = JSON.stringify({
      scope: queryScope,
      dsSig,
      q: query ?? '',
      mm: matchMode,
      tc: targetColIdx,
      mrs: maxRowsScanText ?? '',
      n: {
        e: numericF.enabled,
        c: numericF.colIdx,
        min: numericF.minText ?? '',
        max: numericF.maxText ?? ''
      },
      d: {
        e: dateF.enabled,
        c: dateF.colIdx,
        min: dateF.minIso ?? '',
        max: dateF.maxIso ?? ''
      },
      c: {
        e: catF.enabled,
        c: catF.colIdx,
        s: catSelected
      }
    });
    if (sig === lastCrossReactiveSig) return;
    lastCrossReactiveSig = sig;
    scheduleCrossQuery('reactive-cross-input');
  });

  // Persist last-used view (auto-restore after next load)
  $effect(() => {
    if (!hasLoaded || !datasetId) return;
    // dependencies
    query; matchMode; targetColIdx; maxRowsScanText;
    numericF.enabled; numericF.colIdx; numericF.minText; numericF.maxText;
    dateF.enabled; dateF.colIdx; dateF.minIso; dateF.maxIso;
    catF.enabled; catF.colIdx; (catF.selected?.size ?? 0);
    sortColIdx; sortDir; sortSpecs; visibleColumns;
    pinnedLeft; pinnedRight; hiddenColumns; columnWidths;
    const st = captureState();
    persistLastStateForDataset(datasetId, st);
  });

  $effect(() => {
    prefersReducedMotion;
    crossQueryBusy;
    totalFilteredCount;
    if (prefersReducedMotion) {
      uiAnimDur = 0;
      return;
    }
    if (crossQueryBusy || totalFilteredCount > 200_000) {
      uiAnimDur = 90;
      return;
    }
    if (totalFilteredCount > 50_000) {
      uiAnimDur = 120;
      return;
    }
    if (totalFilteredCount > 10_000) {
      uiAnimDur = 145;
      return;
    }
    uiAnimDur = 170;
  });

  $effect(() => {
    quietBackendLogs;
    void invoke('inspector_set_quiet_logs', { quiet: !!quietBackendLogs }).catch(() => {});
  });

  // Query scope changes are handled explicitly via select onchange to avoid effect feedback loops.

  $effect(() => {
    showInspectorMenu;
    if (!showInspectorMenu) return;
    const onPointerDown = (ev: PointerEvent) => {
      const target = ev.target as Node | null;
      if (!target) return;
      const el = target as HTMLElement;
      if (el?.closest?.('[data-inspector-menu-root]')) return;
      showInspectorMenu = false;
    };
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') showInspectorMenu = false;
    };
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  });

  async function fetchCategoryValues(reset = false) {
    await fetchCategoryValuesController2(schemaControllerCtx(), reset);
  }

  function scheduleFetchCategory(reset: boolean) {
    scheduleFetchCategoryController2(schemaControllerCtx(), reset);
  }

  $effect(() => {
    if (!hasLoaded) return;
    // When column changes, reset paging.
    catF.colIdx;
    scheduleFetchCategory(true);
  });

  $effect(() => {
    if (!hasLoaded) return;
    // Search within available values should reset paging.
    catAvailSearch;
    scheduleFetchCategory(true);
  });

  // -------------------- Regex generator --------------------
  let genTab = $state<GenTab>('builder');
  let genBuildMode = $state<BuildMode>('inOrder');
  let genFlagI = $state(true);   // ignore case
  let genFlagM = $state(false);  // multiline
  let genFlagS = $state(false);  // dotAll

  let genClauses = $state<Clause[]>([
    newClause('prefix', 'AN')
  ]);

  let genAddKind = $state<ClauseKind>('contains');

  function moveClause(idx: number, dir: -1 | 1) {
    genClauses = moveRegexClause(genClauses, idx, dir);
  }

  function removeClause(idx: number) {
    genClauses = removeRegexClause(genClauses, idx);
  }

  function addClause(kind: ClauseKind) {
    genClauses = addRegexClause(genClauses, kind);
  }

  let genBuilt = $derived.by(() => buildRegexCore(genClauses ?? [], genBuildMode));

  let genOut = $derived.by(() => (genBuilt?.pattern ?? '').trim());
  let genOutWarnExtra = $derived.by(() => genBuilt?.warn ?? null);

  let genErr = $derived.by(() => {
    return validateRegexPattern(genOut, genFlagsString({ i: genFlagI, m: genFlagM, s: genFlagS }));
  });

  let genWarn = $derived.by(() => {
    return getRegexWarnings(genOut, genBuildMode, genOutWarnExtra);
  });

  let testText = $state('');
  let testMatches = $derived.by(() => {
    if (genErr) return { count: 0, sample: [] as string[] };
    return computeRegexTestMatches(genOut, genFlagsString({ i: genFlagI, m: genFlagM, s: genFlagS }), testText ?? '');
  });
  function applyGeneratedRegex(pat: string) {
    query = pat;
    matchMode = 'regex';
    showRegexGenerator = false;
    showRegexHelp = false;
  }
</script>

<div class="flex flex-col gap-3">
  <input
    class="hidden"
    type="file"
    multiple
    accept=".csv,text/csv"
    bind:this={hiddenUploadInput}
    onchange={async (e) => {
      const files = Array.from((e.currentTarget as HTMLInputElement).files ?? []);
      if (!files.length) return;
      for (const f of files) {
        const text = await f.text();
        await loadCsvFromText(text, undefined, true, f.name);
      }
      (e.currentTarget as HTMLInputElement).value = '';
    }}
  />

  <!-- Tier 1: Load + Search Controls -->
  <InspectorTopControls
    topControlSpans={topControlSpans as Record<string, string>}
    {headerMode}
    {hasLoaded}
    {isLoading}
    {headers}
    {targetColIdx}
    {matchMode}
    {queryScope}
    {query}
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
    onHeaderModeChange={(value: 'auto' | 'yes' | 'no') => { headerMode = value; }}
    onTargetColChange={(value: number | null) => { targetColIdx = value; scheduleFilter(); }}
    onMatchModeChange={(value: 'fuzzy' | 'exact' | 'regex') => { matchMode = value; }}
    onQueryScopeChange={(value: 'current' | 'all' | 'ask') => { queryScope = value; onQueryScopeChange(); }}
    onQueryChange={(value: string) => { query = value; }}
    onMaxRowsScanTextChange={(value: string) => { maxRowsScanText = value; }}
    onTier2Toggle={(value: boolean) => { tier2Open = value; }}
    onOpenColumnPicker={openColumnPicker}
    onOpenBuilder={() => { showSvarBuilder = true; }}
    onSetRegexMode={() => { matchMode = 'regex'; }}
    onOpenHelp={() => { showRegexHelp = true; }}
    onOpenGenerator={() => { showRegexGenerator = true; genTab = 'builder'; }}
    onOpenRecipes={openRecipes}
  >

    {#if showRegexHelp}
      <div class="mt-4 border-t border-white/10 pt-4 text-xs text-white/70" transition:slide={{ duration: uiAnimDur, easing: UI_ANIM_EASE }}>
        <div class="font-semibold text-white/85 mb-1">Regex quick help</div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div class="glass-panel rounded-xl border border-white/10 p-3">
            <div class="text-white/80 font-semibold">Common patterns</div>
            <ul class="mt-2 space-y-1 text-white/65">
              <li><span class="font-mono text-white/85">^AN\\d+-.*</span> — starts with AN + digits</li>
              <li><span class="font-mono text-white/85">^(NAS|MS)\\d+.*</span> — NAS or MS family</li>
              <li><span class="font-mono text-white/85">.*-\\d+$</span> — ends with dash number</li>
            </ul>
          </div>
          <div class="glass-panel rounded-xl border border-white/10 p-3">
            <div class="text-white/80 font-semibold">Safety defaults</div>
            <ul class="mt-2 space-y-1 text-white/65">
              <li>Pattern length capped (UI warns at 256 chars).</li>
              <li>Blank Max scan uses backend default cap.</li>
              <li>Invalid regex will not execute; you’ll see an inline error.</li>
            </ul>
          </div>
        </div>
      </div>
    {/if}

    <InspectorTier2Panel
      {tier2Open}
      {tier2Tab}
      {hasLoaded}
      {headers}
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
      {uiAnimDur}
      {scheduleFilter}
      {runFilterNow}
      {fetchCategoryValues}
      onSetTier2Tab={(tab) => (tier2Tab = tab)}
    />
  </InspectorTopControls>

  <InspectorToolbar
    {totalRowCount}
    {totalFilteredCount}
    {headers}
    {sortColIdx}
    {sortDir}
    {query}
    {targetColIdx}
    numericEnabled={numericF.enabled}
    dateEnabled={dateF.enabled}
    categoryEnabled={catF.enabled}
    {isMergedView}
    {hasLoaded}
    {schemaLoading}
    {quietBackendLogs}
    {autoRestoreEnabled}
    {svarNotice}
    {debugLogPath}
    {showInspectorMenu}
    {canOpenPath}
    on:toggleMenu={() => (showInspectorMenu = !showInspectorMenu)}
    on:openStream={() => { void openStreamLoadFromMenu(); showInspectorMenu = false; }}
    on:openFallback={() => { openFallbackLoadFromMenu(); showInspectorMenu = false; }}
    on:openSchema={() => { openSchema(); showInspectorMenu = false; }}
    on:openRecipes={() => { openRecipes(); showInspectorMenu = false; }}
    on:toggleRegexHelp={() => { showRegexHelp = !showRegexHelp; showInspectorMenu = false; }}
    on:openRegexGenerator={() => { showRegexGenerator = true; genTab = 'builder'; showInspectorMenu = false; }}
    on:openBuilder={() => { showSvarBuilder = true; showInspectorMenu = false; }}
    on:openColumnPicker={() => { openColumnPicker(); showInspectorMenu = false; }}
    on:openShortcuts={() => { showShortcuts = true; showInspectorMenu = false; }}
    on:exportAnalysisBundle={() => { exportAnalysisBundle(); showInspectorMenu = false; }}
    on:clearQuery={() => { query = ''; scheduleFilter('chip-clear-query'); }}
    on:clearTarget={() => { targetColIdx = null; scheduleFilter('chip-clear-target'); }}
    on:clearNumeric={() => { numericF.enabled = false; void runFilterNow(); }}
    on:clearDate={() => { dateF.enabled = false; void runFilterNow(); }}
    on:clearCategory={() => { catF.enabled = false; catF.selected = new Set(); void runFilterNow(); }}
    on:clearAllFilters={clearAllFilters}
    on:rerunSchema={() => void computeSchemaStats()}
    on:toggleQuietLogs={(e) => { quietBackendLogs = e.detail.value; }}
    on:toggleAutoRestore={(e) => { autoRestoreEnabled = e.detail.value; }}
    on:exportCurrentView={() => exportCsvPreset('current_view')}
    on:exportFilteredRows={() => exportCsvPreset('filtered_rows')}
    on:exportSelectedColumns={() => exportCsvPreset('selected_columns')}
  />

  <InspectorLoadedFilesBar
    {loadedDatasets}
    {activeDatasetId}
    {crossQueryBusy}
    {isMergedView}
    mergedRowsCount={mergedRowsAll.length}
    on:activate={(e) => void activateWorkspaceDataset(e.detail.id)}
    on:unload={(e) => void unloadWorkspaceDataset(e.detail.id)}
  />

  <InspectorMetricsBar
    columns={headers.length}
    rows={totalRowCount}
    filtered={totalFilteredCount}
    rendered={renderedCount}
    {startIdx}
    {endIdx}
    overscan={OVERSCAN}
    {maxWindow}
    {parseDiagnostics}
    onBaselineReport={emitBaselineReportToConsole}
  />

  <!-- Table -->
  {#if isMergedView}
    <InspectorMergedGrid
      {mergedDisplayHeaders}
      {mergedGroupedRows}
      {mergedRowFxEnabled}
      {uiAnimDur}
    />
  {:else}
    <InspectorVirtualGrid
      {headers}
      {visibleRows}
      {visibleColIdxs}
      {totalFilteredCount}
      rowHeight={ROW_HEIGHT}
      overscan={OVERSCAN}
      maxWindowAbs={MAX_WINDOW_ABS}
      {sortColIdx}
      {sortDir}
      {sortPriority}
      {pinnedLeft}
      {pinnedRight}
      {hiddenColumns}
      {columnWidths}
      onRequestSort={requestSort}
      onOpenRow={openRowDrawer}
      onColumnResize={onColumnResize}
      {highlightCell}
      onWindowChange={onGridWindowChange}
      topBanner={activeDatasetLabel}
    />
  {/if}


  <InspectorRecipesModal
    open={showRecipeModal}
    {uiAnimDur}
    floatingStyle={floatingStyle('recipes')}
    {recipeNotice}
    {recipeName}
    {recipeTags}
    {hasLoaded}
    {importMode}
    {recipes}
    onClose={() => (showRecipeModal = false)}
    onReset={() => resetModalPos('recipes')}
    onBeginDrag={(e: MouseEvent) => beginDragModal('recipes', e)}
    onSetRecipeName={(v: string) => (recipeName = v)}
    onSetRecipeTags={(v: string) => (recipeTags = v)}
    onSave={saveCurrentAsRecipe}
    onExport={exportRecipesCurrent}
    onImport={importRecipesFile}
    onSetImportMode={(v: 'current' | 'file') => (importMode = v)}
    onToggleFavorite={toggleRecipeFavorite}
    onApply={applyRecipe}
    onDelete={deleteRecipe}
  />

  <InspectorSchemaModal
    open={showSchemaModal}
    {uiAnimDur}
    floatingStyle={floatingStyle('schema')}
    {datasetLabel}
    {schemaSampleN}
    {totalFilteredCount}
    {totalRowCount}
    {schemaScopeLabel}
    {schemaError}
    {hasLoaded}
    {schemaLoading}
    {schemaSampleTier}
    {schemaSearch}
    {schemaSuggested}
    {schemaOutliers}
    {schemaRelationshipHints}
    {schemaDrift}
    {colTypes}
    {headers}
    {schemaFiltered}
    catSelected={catF.selected}
    onClose={() => (showSchemaModal = false)}
    onReset={() => resetModalPos('schema')}
    onBeginDrag={(e: MouseEvent) => beginDragModal('schema', e)}
    onRefresh={() => void computeSchemaStats()}
    onSetSampleTier={(v: string) => (schemaSampleTier = v as any)}
    onSetSampleN={(v: number) => (schemaSampleN = v)}
    onSetSearch={(v: string) => (schemaSearch = v)}
    onSetDriftBaseline={setSchemaDriftBaseline}
    onActionTarget={schemaActionTarget}
    onActionCategory={schemaActionCategory}
    onActionNumeric={schemaActionNumericRange}
    onActionDate={schemaActionDateRange}
    onAddTopToCategory={(idx: number, val: string) => {
      schemaActionCategory(idx, false);
      const s2 = new Set(catF.selected);
      s2.add(val);
      catF.selected = s2;
      void runFilterNow();
    }}
  />

  <InspectorRowDrawer
    open={showRowDrawer}
    {uiAnimDur}
    {drawerVisualIdx}
    {totalFilteredCount}
    {drawerSearch}
    {drawerLoading}
    {drawerError}
    drawerList={drawerList as any}
    {drawerExplain}
    onClose={closeRowDrawer}
    onNavRow={navRow}
    onCopyJson={copyDrawerAsJson}
    onSetSearch={(value) => (drawerSearch = value)}
    onApplyTarget={drawerApplyTarget}
    onApplyCategory={drawerApplyCategory}
    onApplyNumeric={drawerApplyNumericExact}
    onApplyDate={drawerApplyDateExact}
  />
  <InspectorHeaderPromptModal
    open={showHeaderPrompt}
    {uiAnimDur}
    {headerHeuristicReason}
    onCancel={cancelHeaderPrompt}
    onChoose={applyHeaderChoice}
  />

  <InspectorColumnPickerModal
    open={showColumnPicker}
    {uiAnimDur}
    {headers}
    {visibleColumns}
    {columnPickerNotice}
    onClose={() => (showColumnPicker = false)}
    onSmartSelect={smartSelectColumns}
    onSelectAll={selectAllColumns}
    onAutoDefault={clearColumnSelection}
    onToggle={toggleVisibleCol}
  />

  <InspectorSvarBuilderModal
    open={showSvarBuilder}
    {uiAnimDur}
    floatingStyle={floatingStyle('svar')}
    {hasLoaded}
    {svarFields}
    {svarOptions}
    svarFilterSet={svarFilterSet}
    onClose={() => (showSvarBuilder = false)}
    onReset={() => resetModalPos('svar')}
    onBeginDrag={(e: MouseEvent) => beginDragModal('svar', e)}
    onApply={applySvarBuilderToFilters}
    onChange={(ev: any) => {
      const next = ev?.value ?? ev?.detail?.value;
      if (next) svarFilterSet = next as IFilterSet;
    }}
  />

  <InspectorRegexGeneratorModal
    open={showRegexGenerator}
    {uiAnimDur}
    {genTab}
    {genFlagI}
    {genFlagM}
    {genFlagS}
    {genOut}
    {genErr}
    {genWarn}
    {regexTemplates}
    {testText}
    {testMatches}
    {genBuildMode}
    {genClauses}
    {genAddKind}
    onClose={() => (showRegexGenerator = false)}
    onSetTab={(v: GenTab) => (genTab = v)}
    onToggleFlag={(k: 'i' | 'm' | 's') => {
      if (k === 'i') genFlagI = !genFlagI;
      if (k === 'm') genFlagM = !genFlagM;
      if (k === 's') genFlagS = !genFlagS;
    }}
    onApplyRegex={applyGeneratedRegex}
    onSetTestText={(v: string) => (testText = v)}
    onSetBuildMode={(v: BuildMode) => (genBuildMode = v)}
    onMoveClause={moveClause}
    onRemoveClause={removeClause}
    onUpdateClauseKind={(idx: number, v: ClauseKind) => (genClauses[idx].kind = v)}
    onUpdateClauseField={(idx: number, key: string, v: any) => ((genClauses[idx] as any)[key] = v)}
    onAddClause={(v: ClauseKind) => addClause(v)}
    onClearClauses={() => {
      genClauses = [newClause('contains', '')];
      testText = '';
    }}
  />

  <InspectorShortcutsModal
    open={showShortcuts}
    {uiAnimDur}
    floatingStyle={floatingStyle('shortcuts')}
    onClose={() => (showShortcuts = false)}
    onReset={() => resetModalPos('shortcuts')}
    onBeginDrag={(e: MouseEvent) => beginDragModal('shortcuts', e)}
  />
</div>
