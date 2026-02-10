import type { IFilter, IFilterSet } from '@svar-ui/svelte-filter';

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

export function buildFilterSpec(ctx: any) {
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

export async function applyFilterSpec(ctx: any, spec: any): Promise<number> {
  const resp = (await ctx.invoke('inspector_filter', { spec })) as number | { filteredCount: number };
  return typeof resp === 'number' ? resp : (resp?.filteredCount ?? ctx.totalRowCount);
}

export async function runFilterNow(ctx: any, forceCurrent = false) {
  ctx.queueDebugRate('runFilterNow', 150, 'runFilterNow', {
    forceCurrent,
    queryScope: ctx.queryScope,
    crossQueryBusy: ctx.crossQueryBusy,
    hasLoaded: ctx.hasLoaded,
    merged: ctx.isMergedView,
    loadedDatasets: ctx.loadedDatasets.length
  });
  if (!ctx.hasLoaded || ctx.suspendReactiveFiltering) return;
  if (ctx.crossQueryBusy) return;
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
  ctx.isMergedView = false;
  ctx.filterPending = true;
  await drainFilterQueue(ctx);
}

export async function drainFilterQueue(ctx: any) {
  if (ctx.filterInFlight || !ctx.hasLoaded) return;
  ctx.filterInFlight = true;
  try {
    while (ctx.filterPending) {
      ctx.filterPending = false;
      await runFilterPass(ctx);
    }
  } finally {
    ctx.filterInFlight = false;
  }
}

export async function runFilterPass(ctx: any) {
  const t0 = performance.now();
  const token = ctx.filterGate.nextToken();
  const spec = buildFilterSpec(ctx);
  if (!spec) return;

  try {
    const count = await applyFilterSpec(ctx, spec);

    if (!ctx.filterGate.isLatest(token)) return;
    ctx.totalFilteredCount = count;
    ctx.recordPerf('filter', t0, {
      reason: ctx.filterLastReason,
      filteredRows: ctx.totalFilteredCount,
      totalRows: ctx.totalRowCount,
      visibleCols: ctx.visibleColIdxs.length
    });

    await ctx.fetchVisibleSlice();
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    if (ctx.matchMode === 'regex') ctx.queryError = msg;
    else ctx.loadError = msg;
  }
}

export function scheduleFilter(ctx: any, reason = 'debounced-input') {
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

export function scheduleCrossQuery(ctx: any, reason = 'debounced-cross-input') {
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

export function clearAllFilters(ctx: any) {
  ctx.query = '';
  ctx.matchMode = 'fuzzy';
  ctx.targetColIdx = null;
  ctx.numericF = { enabled: false, colIdx: null, minText: '', maxText: '', error: null };
  ctx.dateF = { enabled: false, colIdx: null, minIso: '', maxIso: '', error: null };
  ctx.catF = { enabled: false, colIdx: null, selected: new Set() };
  void runFilterNow(ctx);
}

export function onQueryScopeChange(ctx: any) {
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
    ctx.isMergedView = false;
    if (ctx.preMergedHeaders.length > 0) ctx.headers = [...ctx.preMergedHeaders];
    if (ctx.preMergedColTypes.length > 0) ctx.colTypes = [...ctx.preMergedColTypes];
    if (ctx.preMergedTotalRowCount > 0) ctx.totalRowCount = ctx.preMergedTotalRowCount;
    ctx.totalFilteredCount = ctx.preMergedTotalFilteredCount > 0 ? ctx.preMergedTotalFilteredCount : ctx.totalFilteredCount;
    void runFilterNow(ctx, true);
    return;
  }
  ctx.lastCrossReactiveSig = '';
  void runFilterNow(ctx);
}

export function applySvarBuilderToFilters(ctx: any) {
  const rules = flattenSvarRules(ctx.svarFilterSet);
  if (!rules.length) {
    ctx.svarNotice = 'No rules to apply.';
    return;
  }

  let unsupported = 0;
  let textApplied = false;
  let numericApplied = false;
  let dateApplied = false;
  let catApplied = false;

  for (const rule of rules) {
    const idx = toColIdx(rule.field, ctx.headers.length);
    if (idx == null) {
      unsupported++;
      continue;
    }
    const rawVal = rule.value == null ? '' : String(rule.value);
    const cleanVal = rawVal.trim();
    const filter = rule.filter ?? 'contains';
    const typ = (rule.type ?? 'text') as 'text' | 'number' | 'date' | 'tuple';

    if (!textApplied && typ === 'text') {
      ctx.targetColIdx = idx;
      if (filter === 'equal') {
        ctx.matchMode = 'exact';
        ctx.query = cleanVal;
        textApplied = true;
      } else if (filter === 'contains') {
        ctx.matchMode = 'fuzzy';
        ctx.query = cleanVal;
        textApplied = true;
      } else if (filter === 'beginsWith') {
        ctx.matchMode = 'regex';
        ctx.query = `^${ctx.escapeRegExp(cleanVal)}`;
        textApplied = true;
      } else if (filter === 'endsWith') {
        ctx.matchMode = 'regex';
        ctx.query = `${ctx.escapeRegExp(cleanVal)}$`;
        textApplied = true;
      } else {
        unsupported++;
      }
      continue;
    }

    if (!numericApplied && typ === 'number') {
      ctx.numericF.enabled = true;
      ctx.numericF.colIdx = idx;
      if (filter === 'between' && typeof rule.value === 'object' && rule.value != null) {
        const v = rule.value as { start?: unknown; end?: unknown };
        ctx.numericF.minText = v.start == null ? '' : String(v.start);
        ctx.numericF.maxText = v.end == null ? '' : String(v.end);
        numericApplied = true;
      } else if (filter === 'greater' || filter === 'greaterOrEqual') {
        ctx.numericF.minText = cleanVal;
        ctx.numericF.maxText = '';
        numericApplied = true;
      } else if (filter === 'less' || filter === 'lessOrEqual') {
        ctx.numericF.minText = '';
        ctx.numericF.maxText = cleanVal;
        numericApplied = true;
      } else if (filter === 'equal') {
        ctx.numericF.minText = cleanVal;
        ctx.numericF.maxText = cleanVal;
        numericApplied = true;
      } else {
        unsupported++;
      }
      continue;
    }

    if (!dateApplied && typ === 'date') {
      ctx.dateF.enabled = true;
      ctx.dateF.colIdx = idx;
      if (filter === 'between' && typeof rule.value === 'object' && rule.value != null) {
        const v = rule.value as { start?: unknown; end?: unknown };
        ctx.dateF.minIso = v.start == null ? '' : String(v.start).slice(0, 10);
        ctx.dateF.maxIso = v.end == null ? '' : String(v.end).slice(0, 10);
        dateApplied = true;
      } else if (filter === 'greater' || filter === 'greaterOrEqual') {
        ctx.dateF.minIso = String(rule.value ?? '').slice(0, 10);
        ctx.dateF.maxIso = '';
        dateApplied = true;
      } else if (filter === 'less' || filter === 'lessOrEqual') {
        ctx.dateF.minIso = '';
        ctx.dateF.maxIso = String(rule.value ?? '').slice(0, 10);
        dateApplied = true;
      } else if (filter === 'equal') {
        const iso = String(rule.value ?? '').slice(0, 10);
        ctx.dateF.minIso = iso;
        ctx.dateF.maxIso = iso;
        dateApplied = true;
      } else {
        unsupported++;
      }
      continue;
    }

    if (!catApplied && Array.isArray(rule.includes) && rule.includes.length > 0) {
      ctx.catF.enabled = true;
      ctx.catF.colIdx = idx;
      ctx.catF.selected = new Set(rule.includes.map((v) => String(v)));
      catApplied = true;
      continue;
    }

    unsupported++;
  }

  ctx.showSvarBuilder = false;
  if (unsupported > 0) {
    ctx.svarNotice = `Applied supported clauses. ${unsupported} unsupported clause(s) were skipped.`;
  } else {
    ctx.svarNotice = 'Applied filter builder clauses.';
  }
  setTimeout(() => (ctx.svarNotice = null), 2200);
  void runFilterNow(ctx);
}
