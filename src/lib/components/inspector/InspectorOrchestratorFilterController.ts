import type { IFilter, IFilterSet } from '@svar-ui/svelte-filter';
import { devLog } from '$lib/utils/devLog';
import type { FilterControllerContext } from './InspectorControllerContext';

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

export async function applyFilterSpec(ctx: FilterControllerContext, spec: any): Promise<number> {
  // Browser mode: filter client-side if we have mergedRowsAll
  if (ctx.loadState.isMergedView && ctx.loadState.mergedRowsAll) {
    if (typeof window !== 'undefined' && window.location.hostname === '127.0.0.1') {
      console.log('[FILTER] Browser mode client-side filtering, mergedRowsAll.length:', ctx.loadState.mergedRowsAll.length);
    }
    
    // Simple client-side filtering
    if (!spec || spec.empty) {
      return ctx.loadState.totalRowCount ?? ctx.loadState.mergedRowsAll.length;
    }
    
    // For now, return all rows (no actual filtering implemented)
    // TODO: Implement client-side filtering logic
    const count = ctx.loadState.mergedRowsAll.length;
    
    devLog('FILTER', 'Browser mode: returning', count, 'rows (no filtering applied)');
    
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
        ctx.filterPending = true;
        await drainFilterQueue(ctx);
        return;
      }
    }
    if (ctx.queryScope === 'all' || ctx.queryScope === 'ask') {
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

    devLog('FILTER PASS', 'About to call fetchVisibleSlice, totalFilteredCount:', ctx.loadState.totalFilteredCount);
    await ctx.fetchVisibleSlice();
    devLog('FILTER PASS', 'After fetchVisibleSlice, visibleRows.length:', ctx.visibleRows?.length);
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

function applySvarTextRule(ctx: FilterControllerContext, idx: number, filter: string, cleanVal: string): boolean {
  ctx.targetColIdx = idx;
  if (filter === 'equal') {
    ctx.matchMode = 'exact';
    ctx.query = cleanVal;
    return true;
  }
  if (filter === 'contains') {
    ctx.matchMode = 'fuzzy';
    ctx.query = cleanVal;
    return true;
  }
  if (filter === 'beginsWith') {
    ctx.matchMode = 'regex';
    ctx.query = `^${ctx.escapeRegExp(cleanVal)}`;
    return true;
  }
  if (filter === 'endsWith') {
    ctx.matchMode = 'regex';
    ctx.query = `${ctx.escapeRegExp(cleanVal)}$`;
    return true;
  }
  return false;
}

function applySvarNumberRule(ctx: FilterControllerContext, idx: number, filter: string, rule: any, cleanVal: string): boolean {
  ctx.numericF.enabled = true;
  ctx.numericF.colIdx = idx;
  if (filter === 'between' && typeof rule.value === 'object' && rule.value != null) {
    const v = rule.value as { start?: unknown; end?: unknown };
    ctx.numericF.minText = v.start == null ? '' : String(v.start);
    ctx.numericF.maxText = v.end == null ? '' : String(v.end);
    return true;
  }
  if (filter === 'greater' || filter === 'greaterOrEqual') {
    ctx.numericF.minText = cleanVal;
    ctx.numericF.maxText = '';
    return true;
  }
  if (filter === 'less' || filter === 'lessOrEqual') {
    ctx.numericF.minText = '';
    ctx.numericF.maxText = cleanVal;
    return true;
  }
  if (filter === 'equal') {
    ctx.numericF.minText = cleanVal;
    ctx.numericF.maxText = cleanVal;
    return true;
  }
  return false;
}

function applySvarDateRule(ctx: FilterControllerContext, idx: number, filter: string, rule: any): boolean {
  ctx.dateF.enabled = true;
  ctx.dateF.colIdx = idx;
  if (filter === 'between' && typeof rule.value === 'object' && rule.value != null) {
    const v = rule.value as { start?: unknown; end?: unknown };
    ctx.dateF.minIso = v.start == null ? '' : String(v.start).slice(0, 10);
    ctx.dateF.maxIso = v.end == null ? '' : String(v.end).slice(0, 10);
    return true;
  }
  if (filter === 'greater' || filter === 'greaterOrEqual') {
    ctx.dateF.minIso = String(rule.value ?? '').slice(0, 10);
    ctx.dateF.maxIso = '';
    return true;
  }
  if (filter === 'less' || filter === 'lessOrEqual') {
    ctx.dateF.minIso = '';
    ctx.dateF.maxIso = String(rule.value ?? '').slice(0, 10);
    return true;
  }
  if (filter === 'equal') {
    const iso = String(rule.value ?? '').slice(0, 10);
    ctx.dateF.minIso = iso;
    ctx.dateF.maxIso = iso;
    return true;
  }
  return false;
}

function applySvarCategoryRule(ctx: FilterControllerContext, idx: number, rule: any): boolean {
  if (!Array.isArray(rule.includes) || rule.includes.length === 0) return false;
  ctx.catF.enabled = true;
  ctx.catF.colIdx = idx;
  ctx.catF.selected = new Set(rule.includes.map((v: unknown) => String(v)));
  return true;
}

function applySingleSvarRule(ctx: FilterControllerContext, state: SvarApplyState, rule: IFilter) {
  const idx = toColIdx(rule.field, ctx.headers.length);
  if (idx == null) {
    state.unsupported++;
    return;
  }
  const rawVal = rule.value == null ? '' : String(rule.value);
  const cleanVal = rawVal.trim();
  const filter = rule.filter ?? 'contains';
  const typ = (rule.type ?? 'text') as 'text' | 'number' | 'date' | 'tuple';

  if (!state.textApplied && typ === 'text') {
    state.textApplied = applySvarTextRule(ctx, idx, filter, cleanVal);
    if (!state.textApplied) state.unsupported++;
    return;
  }
  if (!state.numericApplied && typ === 'number') {
    state.numericApplied = applySvarNumberRule(ctx, idx, filter, rule, cleanVal);
    if (!state.numericApplied) state.unsupported++;
    return;
  }
  if (!state.dateApplied && typ === 'date') {
    state.dateApplied = applySvarDateRule(ctx, idx, filter, rule);
    if (!state.dateApplied) state.unsupported++;
    return;
  }
  if (!state.catApplied && applySvarCategoryRule(ctx, idx, rule)) {
    state.catApplied = true;
    return;
  }
  state.unsupported++;
}

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
  for (const rule of rules) applySingleSvarRule(ctx, state, rule);

  ctx.showSvarBuilder = false;
  if (state.unsupported > 0) {
    ctx.svarNotice = `Applied supported clauses. ${state.unsupported} unsupported clause(s) were skipped.`;
  } else {
    ctx.svarNotice = 'Applied filter builder clauses.';
  }
  setTimeout(() => (ctx.svarNotice = null), 2200);
  void runFilterNow(ctx);
}
