import type { IFilter, IFilterSet } from '@svar-ui/svelte-filter';
import { inspectorLogger } from '$lib/utils/loggers';
import { devLog } from '$lib/utils/devLog';
import type { FilterControllerContext } from './InspectorControllerContext';
import {
  applySvarTextRule,
  applySvarNumberRule,
  applySvarDateRule,
  applySvarCategoryRule,
  applySingleSvarRule as applySingleSvarRuleHelper
} from './InspectorFilterHelpers';

export function flattenSvarRules(set?: IFilterSet): IFilter[] {
  const out: IFilter[] = [];
  const visit = (node: IFilterSet | IFilter | undefined) => {
    if (!node) return;
    if ((node as IFilterSet).rules) {
      for (const r of (node as IFilterSet).rules ?? []) visit(r as any);
      return;
    }
    out.push(node as IFilter);
  };
  visit(set);
  return out;
}

export function toColIdx(field: unknown, headerCount: number): number | null {
  const n = Number(field);
  if (!Number.isFinite(n)) return null;
  const idx = Math.floor(n);
  return idx >= 0 && idx < headerCount ? idx : null;
}

export function buildFilterSpec(ctx: FilterControllerContext) {
  ctx.queryError = null;
  ctx.loadError = null;
  ctx.numericF.error = null;
  ctx.dateF.error = null;
  const out = ctx.buildFilterSpecFromState({
    query: ctx.query,
    targetColIdx: ctx.targetColIdx,
    matchMode: ctx.matchMode,
    multiQueryEnabled: ctx.multiQueryEnabled,
    multiQueryClauses: ctx.multiQueryClauses,
    escapeRegExp: ctx.escapeRegExp,
    numericF: ctx.numericF,
    dateF: ctx.dateF,
    catF: ctx.catF,
    maxRowsScanText: ctx.maxRowsScanText
  });
  if (!out.spec) {
    if (out.queryError) ctx.queryError = out.queryError;
    if (out.numericError) ctx.numericF.error = out.numericError;
    if (out.dateError) ctx.dateF.error = out.dateError;
    return null;
  }
  return out.spec;
}

// Store the original unfiltered rows for browser mode
let browserModeOriginalRows: string[][] | null = null;
let lastBrowserFilterSig = '';
let lastBrowserFilteredRows: string[][] | null = null;

export function resetBrowserModeOriginalRows() {
  browserModeOriginalRows = null;
  lastBrowserFilterSig = '';
  lastBrowserFilteredRows = null;
}

export async function applyFilterSpec(ctx: FilterControllerContext, spec: any): Promise<number> {
  // Browser mode: filter client-side if we have mergedRowsAll
  if (ctx.loadState.isMergedView && ctx.loadState.mergedRowsAll) {
    devLog('FILTER', 'Browser mode client-side, rows:', ctx.loadState.mergedRowsAll.length);
    
    // Store original rows on first filter (if not already stored)
    if (!browserModeOriginalRows) {
      browserModeOriginalRows = [...ctx.loadState.mergedRowsAll];
      devLog('FILTER', 'Stored original rows:', browserModeOriginalRows.length);
    }
    
    const allRows = browserModeOriginalRows;
    
    const hasPrimaryQuery = String(spec?.query ?? '').trim().length > 0;
    const hasMultiQuery = !!(spec?.multiQueryEnabled && Array.isArray(spec?.multiQueryClauses) && spec.multiQueryClauses.some((c: any) => String(c?.query ?? '').trim().length > 0));
    const hasNumeric = !!spec?.numericFilter?.enabled;
    const hasDate = !!spec?.dateFilter?.enabled;
    const hasCategory = !!spec?.categoryFilter?.enabled;
    const hasActiveFilter = hasPrimaryQuery || hasMultiQuery || hasNumeric || hasDate || hasCategory;

    // No active filters - restore all data regardless of maxRowsScan cap.
    if (!spec || spec.empty || !hasActiveFilter) {
      ctx.loadState.mergedRowsAll = allRows;
      lastBrowserFilterSig = '';
      lastBrowserFilteredRows = allRows;
      devLog('FILTER', 'No filter: restored all', allRows.length, 'rows');
      return ctx.loadState.totalRowCount ?? allRows.length;
    }

    const specSig = JSON.stringify({
      q: spec.query ?? '',
      c: spec.columnIdx ?? null,
      m: spec.matchMode ?? 'fuzzy',
      mq: spec.multiQueryEnabled ? (spec.multiQueryClauses ?? []) : [],
      nf: spec.numericFilter ?? null,
      df: spec.dateFilter ?? null,
      cf: spec.categoryFilter ?? null,
      scan: spec.maxRowsScan ?? 0
    });
    
    // Build optimized matchers once per filter pass to keep large-dataset
    // query interaction responsive in browser mode.
    const buildQueryMatcher = (query: string, columnIdx: number | null, mode: string) => {
      const q = (query ?? '').trim();
      if (!q) return () => true;
      const safeMode = mode ?? 'fuzzy';
      const lowerQ = q.toLowerCase();
      const regex = safeMode === 'regex' ? new RegExp(q, 'i') : null;
      return (row: string[]) => {
        const cells = columnIdx != null && columnIdx >= 0 && columnIdx < row.length
          ? [row[columnIdx] ?? '']
          : row;
        for (const cell of cells) {
          const raw = String(cell ?? '');
          if (safeMode === 'fuzzy') {
            if (raw.toLowerCase().includes(lowerQ)) return true;
          } else if (safeMode === 'exact') {
            if (raw.toLowerCase() === lowerQ) return true;
          } else if (regex && regex.test(raw)) {
            return true;
          }
        }
        return false;
      };
    };

    const mainMatcher = buildQueryMatcher(spec.query ?? '', spec.columnIdx ?? null, spec.matchMode ?? 'fuzzy');
    const clauseMatchers = (spec.multiQueryEnabled && spec.multiQueryClauses?.length > 0)
      ? spec.multiQueryClauses
          .filter((clause: any) => (clause?.query ?? '').trim().length > 0)
          .map((clause: any) => ({
            logicalOp: clause.logicalOp === 'OR' ? 'OR' : 'AND',
            test: buildQueryMatcher(clause.query ?? '', clause.targetColIdx ?? null, clause.mode ?? 'fuzzy')
          }))
      : [];

    const numericEnabled = !!(spec.numericFilter?.enabled && spec.numericFilter?.colIdx != null);
    const numericCol = Number(spec.numericFilter?.colIdx ?? -1);
    const numericMin = Number(spec.numericFilter?.min ?? -1e308);
    const numericMax = Number(spec.numericFilter?.max ?? 1e308);

    const dateEnabled = !!(spec.dateFilter?.enabled && spec.dateFilter?.colIdx != null);
    const dateCol = Number(spec.dateFilter?.colIdx ?? -1);
    const minIso = String(spec.dateFilter?.minIso || '1900-01-01');
    const maxIso = String(spec.dateFilter?.maxIso || '3000-01-01');

    const categoryEnabled = !!(spec.categoryFilter?.enabled && spec.categoryFilter?.colIdx != null);
    const categoryCol = Number(spec.categoryFilter?.colIdx ?? -1);
    const selectedSet = new Set<string>(spec.categoryFilter?.selected ?? []);

    const previousSig = lastBrowserFilterSig;
    const scanLimit = Number(spec.maxRowsScan ?? 0);
    const canNarrowFromPrevious =
      !!lastBrowserFilteredRows &&
      !spec.multiQueryEnabled &&
      !(spec.numericFilter?.enabled) &&
      !(spec.dateFilter?.enabled) &&
      !(spec.categoryFilter?.enabled) &&
      (spec.matchMode === 'fuzzy' || spec.matchMode === 'exact') &&
      (() => {
        try {
          const prev = previousSig ? JSON.parse(previousSig) : null;
          if (!prev) return false;
          const sameColumn = (prev.c ?? null) === (spec.columnIdx ?? null);
          const sameMode = (prev.m ?? 'fuzzy') === (spec.matchMode ?? 'fuzzy');
          const prevQ = String(prev.q ?? '');
          const nextQ = String(spec.query ?? '');
          return sameColumn && sameMode && prevQ.length > 0 && nextQ.startsWith(prevQ);
        } catch {
          return false;
        }
      })();

    const sourceRows = canNarrowFromPrevious ? (lastBrowserFilteredRows as string[][]) : allRows;
    const filteredRows: string[][] = [];
    const yieldEvery = sourceRows.length > 500_000 ? 1200 : sourceRows.length > 100_000 ? 2500 : 8000;
    let nextYield = yieldEvery;

    for (let i = 0; i < sourceRows.length; i++) {
      const row = sourceRows[i];
      let include = mainMatcher(row);

      for (const clause of clauseMatchers) {
        const matched = clause.test(row);
        include = clause.logicalOp === 'OR' ? (include || matched) : (include && matched);
      }
      if (!include) {
        if (i >= nextYield) {
          nextYield += yieldEvery;
          await new Promise((r) => setTimeout(r, 0));
        }
        continue;
      }

      if (numericEnabled) {
        const n = Number(row?.[numericCol] ?? '');
        if (!(Number.isFinite(n) && n >= numericMin && n <= numericMax)) {
          if (i >= nextYield) {
            nextYield += yieldEvery;
            await new Promise((r) => setTimeout(r, 0));
          }
          continue;
        }
      }

      if (dateEnabled) {
        const cell = String(row?.[dateCol] ?? '').trim();
        if (!cell) {
          if (i >= nextYield) {
            nextYield += yieldEvery;
            await new Promise((r) => setTimeout(r, 0));
          }
          continue;
        }
        let dateStr = cell;
        if (cell.includes('/')) {
          const parts = cell.split('/');
          if (parts.length === 3) dateStr = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
        }
        if (!(dateStr >= minIso && dateStr <= maxIso)) {
          if (i >= nextYield) {
            nextYield += yieldEvery;
            await new Promise((r) => setTimeout(r, 0));
          }
          continue;
        }
      }

      if (categoryEnabled && selectedSet.size > 0) {
        const cell = String(row?.[categoryCol] ?? '').trim();
        if (!selectedSet.has(cell)) {
          if (i >= nextYield) {
            nextYield += yieldEvery;
            await new Promise((r) => setTimeout(r, 0));
          }
          continue;
        }
      }

      filteredRows.push(row);
      if (scanLimit > 0 && filteredRows.length >= scanLimit) break;
      if (i >= nextYield) {
        nextYield += yieldEvery;
        await new Promise((r) => setTimeout(r, 0));
      }
    }
    
    const count = filteredRows.length;
    
    // CRITICAL: Update mergedRowsAll with filtered results
    // fetchVisibleSlice will slice from this array
    ctx.loadState.mergedRowsAll = filteredRows;
    lastBrowserFilterSig = specSig;
    lastBrowserFilteredRows = filteredRows;
    
    devLog('FILTER', 'Browser mode: filtered', count, 'of', allRows.length, 'rows');
    
    return count;
  }
  
  // Tauri mode: use backend
  const resp = (await ctx.invoke('inspector_filter', { spec })) as number | { filteredCount: number };
  return typeof resp === 'number' ? resp : (resp?.filteredCount ?? ctx.totalRowCount);
}

export async function runFilterNow(ctx: FilterControllerContext, forceCurrent = false) {
  inspectorLogger.debug('[FILTER NOW] triggered', {
    forceCurrent,
    hasLoaded: ctx.hasLoaded,
    isMergedView: ctx.isMergedView
  });
  devLog('FILTER NOW CONTROLLER', 'Entry - hasLoaded:', ctx.hasLoaded, 'isMergedView:', ctx.isMergedView);
  
  ctx.queueDebugRate('runFilterNow', 150, 'runFilterNow', {
    forceCurrent,
    queryScope: ctx.queryScope,
    crossQueryBusy: ctx.crossQueryBusy,
    hasLoaded: ctx.hasLoaded,
    merged: ctx.isMergedView,
    loadedDatasets: ctx.loadedDatasets.length
  });
  
  if (!ctx.hasLoaded || ctx.suspendReactiveFiltering) {
    inspectorLogger.debug('[FILTER NOW] skipped (not loaded or suspended)', {
      hasLoaded: ctx.hasLoaded,
      suspended: ctx.suspendReactiveFiltering
    });
    devLog('FILTER NOW', 'Early exit: hasLoaded:', ctx.hasLoaded, 'suspended:', ctx.suspendReactiveFiltering);
    return;
  }
  
  devLog('FILTER NOW', 'Passed early checks');
  
  if (ctx.crossQueryBusy) {
    inspectorLogger.debug('[FILTER NOW] skipped (crossQueryBusy)');
    return;
  }
  if (!forceCurrent && ctx.loadedDatasets.length > 1 && ctx.queryScope !== 'current') {
    if (ctx.queryScope === 'ask') {
      const doAll = window.confirm('Run this query across all loaded files?');
      if (!doAll) {
        // User cancelled - just run current dataset filter without setting pending flag
        // to avoid potential infinite loop if state isn't fully initialized
        devLog('FILTER NOW', 'User cancelled cross-query, running current dataset only');
        // Don't set filterPending or call drainFilterQueue here - fall through to normal flow
      } else {
        await ctx.runCrossDatasetQuery();
        return;
      }
    } else if (ctx.queryScope === 'all') {
      await ctx.runCrossDatasetQuery();
      return;
    }
  }
  // Don't reset isMergedView - it's set during CSV load in browser mode
  
  devLog('FILTER NOW', 'Setting filterPending, calling drainFilterQueue');
  
  ctx.filterPending = true;
  await drainFilterQueue(ctx);
}

export async function drainFilterQueue(ctx: FilterControllerContext) {
  inspectorLogger.debug('[FILTER QUEUE] drain requested');
  devLog('DRAIN FILTER QUEUE', 'Called - filterInFlight:', ctx.filterInFlight, 'hasLoaded:', ctx.hasLoaded);
  if (ctx.filterInFlight || !ctx.hasLoaded) {
    devLog('DRAIN FILTER QUEUE', 'Early exit - filterInFlight:', ctx.filterInFlight, 'hasLoaded:', ctx.hasLoaded);
    return;
  }
  ctx.filterInFlight = true;
  try {
    while (ctx.filterPending) {
      ctx.filterPending = false;
      devLog('DRAIN FILTER QUEUE', 'Calling runFilterPass');
      await runFilterPass(ctx);
    }
  } finally {
    ctx.filterInFlight = false;
  }
}

export async function runFilterPass(ctx: FilterControllerContext) {
  const t0 = performance.now();
  const token = ctx.filterGate.nextToken();
  const spec = buildFilterSpec(ctx);
  if (!spec) return;

  try {
    const count = await applyFilterSpec(ctx, spec);

    if (!ctx.filterGate.isLatest(token)) return;
    ctx.loadState.totalFilteredCount = count;
    if ((ctx.loadedDatasets?.length ?? 0) > 0 && ctx.activeDatasetId) {
      const idx = ctx.loadedDatasets.findIndex((d: any) => d.id === ctx.activeDatasetId);
      if (idx >= 0) {
        const current = ctx.loadedDatasets[idx] as any;
        const next = { ...current, filteredCount: count, rowCount: ctx.totalRowCount, colCount: ctx.headers.length };
        ctx.loadedDatasets.splice(idx, 1, next);
      }
    }
    
    devLog('FILTER PASS', 'Set totalFilteredCount to', count, 'on loadState');
    
    ctx.recordPerf('filter', t0, {
      reason: ctx.filterLastReason,
      filteredRows: ctx.loadState.totalFilteredCount,
      totalRows: ctx.loadState.totalRowCount,
      visibleCols: ctx.visibleColIdxs.length
    });

    // CRITICAL FIX: Don't call fetchVisibleSlice manually here - it causes infinite loop
    // The slice fetch effect (setupSliceFetchEffect) will automatically trigger when
    // totalFilteredCount changes, and it will use the proper grid window indices
    // This fix prevents the infinite loop: runFilterPass → fetchVisibleSlice → updates visibleRows → triggers effect → runFilterPass
    devLog('FILTER PASS', 'Filter complete. Slice fetch effect will handle fetching with proper grid indices.');
  } catch (err: any) {
    inspectorLogger.error('[FILTER PASS ERROR]', err);
    const msg = err?.message ?? String(err);
    if (ctx.matchMode === 'regex') ctx.queryError = msg;
    else ctx.loadError = msg;
  }
}

export function scheduleFilter(ctx: FilterControllerContext, reason = 'debounced-input') {
  if (!ctx.hasLoaded || ctx.suspendReactiveFiltering) return;
  ctx.queueDebugRate(`schedule:${reason}`, 250, 'scheduleFilter', {
    reason,
    queryScope: ctx.queryScope,
    loadedDatasets: ctx.loadedDatasets.length
  });
  ctx.filterLastReason = reason;
  if (ctx.filterTimer) clearTimeout(ctx.filterTimer);
  const totalRows = Number(ctx.totalRowCount ?? 0);
  const debounceMs = totalRows >= 500_000 ? 600 : totalRows >= 100_000 ? 360 : ctx.FILTER_DEBOUNCE_MS;
  ctx.filterTimer = setTimeout(() => {
    ctx.filterPending = true;
    void drainFilterQueue(ctx);
  }, debounceMs);
}

export function scheduleCrossQuery(ctx: FilterControllerContext, reason = 'debounced-cross-input') {
  if (!ctx.hasLoaded || ctx.crossQueryBusy) return;
  if (ctx.queryScope === 'current') return;
  ctx.queueDebugRate(`scheduleCross:${reason}`, 250, 'scheduleCrossQuery', {
    reason,
    queryScope: ctx.queryScope,
    loadedDatasets: ctx.loadedDatasets.length
  });
  ctx.filterLastReason = reason;
  if (ctx.crossQueryTimer) clearTimeout(ctx.crossQueryTimer);
  ctx.crossQueryTimer = setTimeout(() => {
    void ctx.runCrossDatasetQuery();
  }, ctx.FILTER_DEBOUNCE_MS);
}

export function clearAllFilters(ctx: FilterControllerContext) {
  ctx.query = '';
  ctx.matchMode = 'fuzzy';
  if ('multiQueryEnabled' in ctx) ctx.multiQueryEnabled = false;
  if ('multiQueryExpanded' in ctx) ctx.multiQueryExpanded = false;
  if ('multiQueryClauses' in ctx) {
    ctx.multiQueryClauses = [{
      id: `mq_${Date.now()}_0`,
      query: '',
      matchMode: 'fuzzy',
      targetColIdx: null,
      logicalOp: 'AND',
      mode: 'fuzzy'
    }];
  }
  ctx.targetColIdx = null;
  ctx.numericF = { enabled: false, colIdx: null, minText: '', maxText: '', error: null };
  ctx.dateF = { enabled: false, colIdx: null, minIso: '', maxIso: '', error: null };
  ctx.catF = { enabled: false, colIdx: null, selected: new Set() };
  void runFilterNow(ctx);
}

export function onQueryScopeChange(ctx: FilterControllerContext) {
  ctx.queueDebug('queryScopeChange', {
    queryScope: ctx.queryScope,
    hasLoaded: ctx.hasLoaded,
    suspendReactiveFiltering: ctx.suspendReactiveFiltering,
    crossQueryBusy: ctx.crossQueryBusy
  });
  if (!ctx.hasLoaded || ctx.suspendReactiveFiltering || ctx.crossQueryBusy) return;
  if (ctx.queryScope === 'current') {
    ctx.lastCrossReactiveSig = '';
    ctx.crossQueryResults = [];
    
    // Only reset isMergedView if we were in cross-query mode (multiple datasets merged)
    // Don't reset if we're in browser mode (single CSV, all data in memory)
    // Check: if preMergedHeaders exists, we were in cross-query mode
    const wasInCrossQueryMode = ctx.preMergedHeaders && ctx.preMergedHeaders.length > 0;
    
    if (wasInCrossQueryMode) {
      ctx.loadState.isMergedView = false;
      ctx.loadState.headers = [...ctx.preMergedHeaders];
      if (ctx.preMergedColTypes.length > 0) ctx.loadState.colTypes = [...ctx.preMergedColTypes];
      if (ctx.preMergedTotalRowCount > 0) ctx.loadState.totalRowCount = ctx.preMergedTotalRowCount;
      ctx.loadState.totalFilteredCount = ctx.preMergedTotalFilteredCount > 0 ? ctx.preMergedTotalFilteredCount : ctx.loadState.totalFilteredCount;
    }
    // If not in cross-query mode, keep current isMergedView state (browser mode)
    
    void runFilterNow(ctx, true);
    return;
  }
  ctx.lastCrossReactiveSig = '';
  void runFilterNow(ctx);
}

type SvarApplyState = {
  unsupported: number;
  textApplied: boolean;
  numericApplied: boolean;
  dateApplied: boolean;
  catApplied: boolean;
};

export function applySvarBuilderToFilters(ctx: FilterControllerContext) {
  const rules = flattenSvarRules(ctx.svarFilterSet);
  if (!rules.length) {
    ctx.svarNotice = 'No rules to apply.';
    return;
  }

  const state: SvarApplyState = {
    unsupported: 0,
    textApplied: false,
    numericApplied: false,
    dateApplied: false,
    catApplied: false
  };
  for (const rule of rules) applySingleSvarRuleHelper(ctx, state, rule, toColIdx);

  ctx.showSvarBuilder = false;
  if (state.unsupported > 0) {
    ctx.svarNotice = `Applied supported clauses. ${state.unsupported} unsupported clause(s) were skipped.`;
  } else {
    ctx.svarNotice = 'Applied filter builder clauses.';
  }
  setTimeout(() => (ctx.svarNotice = null), 2200);
  void runFilterNow(ctx);
}
