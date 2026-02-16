import type { IFilter, IFilterSet } from '@svar-ui/svelte-filter';
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

export function resetBrowserModeOriginalRows() {
  browserModeOriginalRows = null;
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
    
    // No filters - restore all data
    if (!spec || spec.empty) {
      ctx.loadState.mergedRowsAll = [...allRows];
      devLog('FILTER', 'No filter: restored all', allRows.length, 'rows');
      return ctx.loadState.totalRowCount ?? allRows.length;
    }
    
    // Apply client-side filtering logic
    const headers = ctx.loadState.headers ?? [];
    let filteredRows = allRows;
    
    // Helper: match row against query
    const matchesQuery = (row: string[], query: string, columnIdx: number | null, matchMode: string): boolean => {
      if (!query) return true;
      
      const searchIn = columnIdx !== null && columnIdx >= 0 && columnIdx < row.length
        ? [row[columnIdx] ?? '']
        : row;
      
      const lowerQuery = query.toLowerCase();
      
      for (const cell of searchIn) {
        const cellLower = (cell ?? '').toLowerCase();
        
        if (matchMode === 'fuzzy') {
          if (cellLower.includes(lowerQuery)) return true;
        } else if (matchMode === 'exact') {
          if (cellLower === lowerQuery) return true;
        } else if (matchMode === 'regex') {
          try {
            const regex = new RegExp(query, 'i');
            if (regex.test(cell)) return true;
          } catch {
            return false;
          }
        }
      }
      
      return false;
    };
    
    // Apply main query filter
    if (spec.query && spec.query.trim()) {
      filteredRows = filteredRows.filter(row => 
        matchesQuery(row, spec.query, spec.columnIdx, spec.matchMode)
      );
      devLog('FILTER', 'After query filter:', filteredRows.length, 'rows');
    }
    
    // Apply multi-query clauses (if enabled)
    if (spec.multiQueryEnabled && spec.multiQueryClauses && spec.multiQueryClauses.length > 0) {
      for (const clause of spec.multiQueryClauses) {
        if (!clause.query || !clause.query.trim()) continue;
        
        if (clause.logicalOp === 'OR') {
          // Union: add rows from allRows that match this clause and aren't already included
          // Use Set to track row content (join cells with delimiter) to avoid duplicates
          const existingRowsSet = new Set(filteredRows.map(row => row.join('\x00')));
          for (const row of allRows) {
            const rowKey = row.join('\x00');
            if (!existingRowsSet.has(rowKey) && matchesQuery(row, clause.query, clause.targetColIdx ?? null, clause.mode ?? 'fuzzy')) {
              filteredRows.push(row);
              existingRowsSet.add(rowKey);
            }
          }
        } else {
          // AND (default): intersect with existing results
          filteredRows = filteredRows.filter(row =>
            matchesQuery(row, clause.query, clause.targetColIdx ?? null, clause.mode ?? 'fuzzy')
          );
        }
      }
      devLog('FILTER', 'After multi-query:', filteredRows.length, 'rows');
    }
    
    // Apply numeric filter
    if (spec.numericFilter && spec.numericFilter.enabled && spec.numericFilter.colIdx !== null) {
      const colIdx = spec.numericFilter.colIdx;
      const min = spec.numericFilter.min ?? -1e308;
      const max = spec.numericFilter.max ?? 1e308;
      
      filteredRows = filteredRows.filter(row => {
        const cell = row[colIdx] ?? '';
        const num = Number(cell);
        return Number.isFinite(num) && num >= min && num <= max;
      });
      devLog('FILTER', 'After numeric filter:', filteredRows.length, 'rows');
    }
    
    // Apply date filter
    if (spec.dateFilter && spec.dateFilter.enabled && spec.dateFilter.colIdx !== null) {
      const colIdx = spec.dateFilter.colIdx;
      const minIso = spec.dateFilter.minIso || '1900-01-01';
      const maxIso = spec.dateFilter.maxIso || '3000-01-01';
      
      filteredRows = filteredRows.filter(row => {
        const cell = (row[colIdx] ?? '').trim();
        if (!cell) return false;
        
        // Parse date (support ISO format and common formats)
        let dateStr = cell;
        if (cell.includes('/')) {
          // Convert MM/DD/YYYY to YYYY-MM-DD
          const parts = cell.split('/');
          if (parts.length === 3) {
            dateStr = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
          }
        }
        
        return dateStr >= minIso && dateStr <= maxIso;
      });
      devLog('FILTER', 'After date filter:', filteredRows.length, 'rows');
    }
    
    // Apply category filter
    if (spec.categoryFilter && spec.categoryFilter.enabled && spec.categoryFilter.colIdx !== null) {
      const colIdx = spec.categoryFilter.colIdx;
      const selectedSet = new Set(spec.categoryFilter.selected ?? []);
      
      if (selectedSet.size > 0) {
        filteredRows = filteredRows.filter(row => {
          const cell = (row[colIdx] ?? '').trim();
          return selectedSet.has(cell);
        });
        devLog('FILTER', 'After category filter:', filteredRows.length, 'rows');
      }
    }
    
    // Apply max rows scan limit
    if (spec.maxRowsScan && spec.maxRowsScan > 0 && filteredRows.length > spec.maxRowsScan) {
      filteredRows = filteredRows.slice(0, spec.maxRowsScan);
      devLog('FILTER', 'After max scan limit:', filteredRows.length, 'rows');
    }
    
    const count = filteredRows.length;
    
    // CRITICAL: Update mergedRowsAll with filtered results
    // fetchVisibleSlice will slice from this array
    ctx.loadState.mergedRowsAll = [...filteredRows];
    
    devLog('FILTER', 'Browser mode: filtered', count, 'of', allRows.length, 'rows');
    
    return count;
  }
  
  // Tauri mode: use backend
  const resp = (await ctx.invoke('inspector_filter', { spec })) as number | { filteredCount: number };
  return typeof resp === 'number' ? resp : (resp?.filteredCount ?? ctx.totalRowCount);
}

export async function runFilterNow(ctx: FilterControllerContext, forceCurrent = false) {
  console.error('★★★ RUN FILTER NOW CALLED ★★★');
  console.error('[FILTER NOW] loadState._id:', (ctx as any).loadState?._id);
  console.error('[FILTER NOW] loadState.hasLoaded:', (ctx as any).loadState?.hasLoaded);
  console.error('[FILTER NOW] ctx.hasLoaded:', ctx.hasLoaded);
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
    console.error('★★★ EARLY EXIT 1 ★★★ hasLoaded:', ctx.hasLoaded, 'suspended:', ctx.suspendReactiveFiltering);
    devLog('FILTER NOW', 'Early exit: hasLoaded:', ctx.hasLoaded, 'suspended:', ctx.suspendReactiveFiltering);
    return;
  }
  
  devLog('FILTER NOW', 'Passed early checks');
  
  if (ctx.crossQueryBusy) {
    console.error('★★★ EARLY EXIT 2 ★★★ crossQueryBusy:', ctx.crossQueryBusy);
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
  console.error('★★★ DRAIN FILTER QUEUE CALLED ★★★');
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
    console.error('[FILTER PASS ERROR]', err);
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
  ctx.filterTimer = setTimeout(() => {
    ctx.filterPending = true;
    void drainFilterQueue(ctx);
  }, ctx.FILTER_DEBOUNCE_MS);
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
