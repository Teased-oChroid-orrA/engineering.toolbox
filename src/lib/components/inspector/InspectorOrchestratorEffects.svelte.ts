/**
 * InspectorOrchestratorEffects.svelte.ts
 * 
 * Core data operation $effect blocks from InspectorOrchestrator.svelte.
 * Handles data loading, filtering, cross-query, and state persistence.
 * UI-specific effects are in InspectorOrchestratorEffectsUi.svelte.ts.
 */

import type { RecipeState } from '$lib/components/inspector/InspectorOrchestratorDeps';
import { devLog } from '$lib/utils/devLog';
import type { NumericFilter, DateFilter, CategoryFilter } from './InspectorOrchestratorEffectsTypes';
// ========================= Effect 1: showDataControls =========================
export function setupShowDataControlsEffect(deps: {
  hasLoadedDatasetSignals: (params: {
    hasLoaded: boolean;
    loadedDatasetsLength: number;
    activeDatasetId: string;
    datasetId: string;
    headersLength: number;
    totalRowCount: number;
  }) => boolean;
  hasLoaded: () => boolean;
  loadedDatasetsLength: () => number;
  activeDatasetId: () => string | null;
  datasetId: () => string;
  headersLength: () => number;
  totalRowCount: () => number;
}, setShowDataControls: (value: boolean) => void) {
  $effect(() => {
    const hasSignals = deps.hasLoadedDatasetSignals({
      hasLoaded: deps.hasLoaded(),
      loadedDatasetsLength: deps.loadedDatasetsLength(),
      activeDatasetId: deps.activeDatasetId() ?? '',
      datasetId: deps.datasetId(),
      headersLength: deps.headersLength(),
      totalRowCount: deps.totalRowCount()
    });
    setShowDataControls(hasSignals);
  });
}

// ========================= Effect 2: scheduleSliceFetch =========================
export function setupSliceFetchEffect(deps: {
  hasLoaded: () => boolean;
  suspendReactiveFiltering: () => boolean;
  isMergedView: () => boolean;
  startIdx: () => number;
  endIdx: () => number;
  totalFilteredCount: () => number;
  visibleColIdxsLength: () => number;
  datasetId: () => string;  // Bug 3 fix: Add datasetId to prevent stale fetch key
}, callbacks: {
  scheduleSliceFetch: () => void;
}) {
  let lastFetchKey = '';
  
  $effect(() => {
    const loaded = deps.hasLoaded();
    const suspended = deps.suspendReactiveFiltering();
    if (!loaded || suspended) return;
    
    const start = deps.startIdx();
    const end = deps.endIdx();
    const count = deps.totalFilteredCount();
    const colsLen = deps.visibleColIdxsLength();
    const dsId = deps.datasetId();  // Bug 3 fix: Include datasetId
    
    // Bug 3 fix: Include datasetId to prevent stale key from skipping fetch on reload
    const fetchKey = `${dsId}|${start}|${end}|${count}|${colsLen}`;
    if (fetchKey === lastFetchKey) {
      devLog('[SLICE FETCH EFFECT] Skipped - params unchanged:', fetchKey);
      return;
    }
    
    lastFetchKey = fetchKey;
    devLog('[SLICE FETCH EFFECT] Triggered - start:', start, 'end:', end, 'count:', count, 'colsLen:', colsLen, 'dsId:', dsId);
    callbacks.scheduleSliceFetch();
  });
}

// ========================= Effect 3: reactive filter (scheduleFilter) =========================
export function setupReactiveFilterEffect(deps: {
  hasLoaded: () => boolean;
  suspendReactiveFiltering: () => boolean;
  queryScope: () => string;
  query: () => string;
  matchMode: () => string;
  targetColIdx: () => number | null;
  maxRowsScanText: () => string;
  numericF: () => NumericFilter;
  dateF: () => DateFilter;
  catF: () => CategoryFilter;
  lastFilterReactiveSig: () => string;
}, callbacks: {
  scheduleFilter: (source?: string) => void;
  setLastFilterReactiveSig: (sig: string) => void;
}) {
  $effect(() => {
    if (!deps.hasLoaded() || deps.suspendReactiveFiltering() || deps.queryScope() !== 'current') return;
    
    // Create signature to detect actual changes and prevent redundant filters
    const nf = deps.numericF();
    const df = deps.dateF();
    const cf = deps.catF();
    const catSelected = [...(cf.selected ?? new Set())].sort();
    
    const sig = JSON.stringify({
      q: deps.query() ?? '',
      mm: deps.matchMode(),
      tc: deps.targetColIdx(),
      mrs: deps.maxRowsScanText() ?? '',
      n: {
        e: nf.enabled,
        c: nf.colIdx,
        min: nf.minText ?? '',
        max: nf.maxText ?? ''
      },
      d: {
        e: df.enabled,
        c: df.colIdx,
        min: df.minIso ?? '',
        max: df.maxIso ?? ''
      },
      c: {
        e: cf.enabled,
        c: cf.colIdx,
        s: catSelected
      }
    });
    
    // Skip if filter parameters haven't actually changed
    if (sig === deps.lastFilterReactiveSig()) return;
    callbacks.setLastFilterReactiveSig(sig);
    
    callbacks.scheduleFilter('reactive-input');
  });
}

// ========================= Effect 4: cross-query effect (scheduleCrossQuery) =========================
export function setupCrossQueryEffect(deps: {
  hasLoaded: () => boolean;
  queryScope: () => string;
  loadedDatasets: () => Array<{ id: string }>;
  query: () => string;
  matchMode: () => string;
  targetColIdx: () => number | null;
  maxRowsScanText: () => string;
  numericF: () => NumericFilter;
  dateF: () => DateFilter;
  catF: () => CategoryFilter;
  multiQueryEnabled: () => boolean;
  multiQueryClauses: () => Array<any>;
  lastCrossReactiveSig: () => string;
}, callbacks: {
  scheduleCrossQuery: (source?: string) => void;
  setLastCrossReactiveSig: (sig: string) => void;
}) {
  $effect(() => {
    if (!deps.hasLoaded() || deps.queryScope() === 'current') return;

    const cf = deps.catF();
    const catSelected = [...(cf.selected ?? new Set())].sort();
    const dsSig = (deps.loadedDatasets() ?? []).map((d) => d.id).sort().join('|');
    const nf = deps.numericF();
    const df = deps.dateF();
    const sig = JSON.stringify({
      scope: deps.queryScope(),
      dsSig,
      q: deps.query() ?? '',
      mm: deps.matchMode(),
      tc: deps.targetColIdx(),
      mrs: deps.maxRowsScanText() ?? '',
      n: {
        e: nf.enabled,
        c: nf.colIdx,
        min: nf.minText ?? '',
        max: nf.maxText ?? ''
      },
      d: {
        e: df.enabled,
        c: df.colIdx,
        min: df.minIso ?? '',
        max: df.maxIso ?? ''
      },
      c: {
        e: cf.enabled,
        c: cf.colIdx,
        s: catSelected
      }
    });
    if (sig === deps.lastCrossReactiveSig()) return;
    callbacks.setLastCrossReactiveSig(sig);
    callbacks.scheduleCrossQuery('reactive-cross-input');
  });
}

// ========================= Effect 5: persist state effect =========================
export function setupPersistStateEffect(deps: {
  hasLoaded: () => boolean;
  datasetId: () => string | null;
  query: () => string;
  matchMode: () => string;
  targetColIdx: () => number | null;
  maxRowsScanText: () => string;
  numericF: () => NumericFilter;
  dateF: () => DateFilter;
  catF: () => CategoryFilter;
  sortColIdx: () => number | null;
  sortDir: () => string;
  sortSpecs: () => Array<any>;
  visibleColumns: () => Set<number> | null;
  pinnedLeft: () => number[];
  pinnedRight: () => number[];
  hiddenColumns: () => number[];
  columnWidths: () => Record<number, number>;
  captureState: () => RecipeState;
}, callbacks: {
  persistLastStateForDataset: (datasetId: string, state: RecipeState) => void;
}) {
  $effect(() => {
    if (!deps.hasLoaded() || !deps.datasetId()) return;
    // dependencies
    deps.query(); 
    deps.matchMode(); 
    deps.targetColIdx(); 
    deps.maxRowsScanText();
    const nf = deps.numericF();
    nf.enabled; nf.colIdx; nf.minText; nf.maxText;
    const df = deps.dateF();
    df.enabled; df.colIdx; df.minIso; df.maxIso;
    const cf = deps.catF();
    cf.enabled; cf.colIdx; (cf.selected?.size ?? 0);
    deps.sortColIdx(); 
    deps.sortDir(); 
    deps.sortSpecs(); 
    deps.visibleColumns();
    deps.pinnedLeft(); 
    deps.pinnedRight(); 
    deps.hiddenColumns(); 
    deps.columnWidths();
    const st = deps.captureState();
    callbacks.persistLastStateForDataset(deps.datasetId()!, st);
  });
}

