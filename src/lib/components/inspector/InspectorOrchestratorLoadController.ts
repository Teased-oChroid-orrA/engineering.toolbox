export async function loadCsvFromText(
  ctx: any,
  text: string,
  hasHeadersOverride?: boolean,
  trackWorkspace = true,
  forcedLabel?: string,
  applyInitialFilter = true
) {
  ctx.isLoading = true;
  ctx.isMergedView = false;
  ctx.loadError = null;
  try {
    if (hasHeadersOverride !== undefined) {
      ctx.hasHeaders = !!hasHeadersOverride;
    } else if (ctx.headerMode === 'yes') ctx.hasHeaders = true;
    else if (ctx.headerMode === 'no') ctx.hasHeaders = false;
    else {
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      const first = (lines[0] ?? '').split(',');
      const second = (lines[1] ?? '').split(',');
      const h = ctx.heuristicHasHeaders(first, second);
      ctx.headerHeuristicReason = h.reason;
      if (!h.decided) {
        ctx.pendingText = text;
        ctx.pendingPath = null;
        ctx.showHeaderPrompt = true;
        ctx.isLoading = false;
        return;
      }
      ctx.hasHeaders = h.value;
    }

    const resp = (await ctx.invoke('inspector_load_csv_text', { text, hasHeaders: ctx.hasHeaders })) as any;

    ctx.headers = resp.headers ?? [];
    ctx.totalRowCount = resp.rowCount ?? 0;
    ctx.colTypes = (resp.colTypes ?? []) as any[];

    const ids = ctx.computeDatasetIdentity(
      `text:${ctx.fnv1a32((text ?? '').slice(0, 20000))}`,
      ctx.headers,
      ctx.totalRowCount,
      ctx.fnv1a32
    );
    ctx.datasetId = ids.id;
    ctx.datasetLabel = ids.label;
    if (forcedLabel) ctx.datasetLabel = forcedLabel;

    ctx.recipes = ctx.loadRecipesForDataset(ctx.datasetId);
    ctx.pendingRestore = ctx.loadLastStateForDataset(ctx.datasetId);
    ctx.hasLoaded = true;
    ctx.showDataControls = true;
    ctx.activeDatasetId = ctx.datasetId;

    if (trackWorkspace) {
      upsertWorkspaceDataset(ctx, {
        id: ctx.datasetId,
        label: forcedLabel || ctx.datasetLabel,
        hasHeaders: ctx.hasHeaders,
        source: { kind: 'text', text }
      });
    }

    if (!ctx.suspendReactiveFiltering) {
      ctx.sortColIdx = null;
      ctx.sortDir = 'asc';
      ctx.sortSpecs = [];
      ctx.visibleColumns = new Set();
      ctx.pinnedLeft = [];
      ctx.pinnedRight = [];
      ctx.hiddenColumns = [];
      ctx.columnWidths = {};
      if (ctx.targetColIdx != null && ctx.targetColIdx >= ctx.headers.length) ctx.targetColIdx = null;
      if (ctx.numericF.colIdx != null && ctx.numericF.colIdx >= ctx.headers.length) ctx.numericF = { ...ctx.numericF, enabled: false, colIdx: null, error: null };
      if (ctx.dateF.colIdx != null && ctx.dateF.colIdx >= ctx.headers.length) ctx.dateF = { ...ctx.dateF, enabled: false, colIdx: null, error: null };
      if (ctx.catF.colIdx != null && ctx.catF.colIdx >= ctx.headers.length) ctx.catF = { enabled: false, colIdx: null, selected: new Set() };
    }

    const preserveActiveQuery = (ctx.query ?? '').trim().length > 0 || ctx.matchMode !== 'fuzzy' || ctx.targetColIdx != null;
    if (ctx.pendingRestore && applyInitialFilter && !preserveActiveQuery) {
      await ctx.applyState(ctx.pendingRestore);
      ctx.pendingRestore = null;
    } else if (applyInitialFilter) {
      await ctx.runFilterNow();
    }
  } catch (e: any) {
    ctx.loadError = e?.message ?? String(e);
    ctx.hasLoaded = false;
    ctx.headers = [];
    ctx.visibleRows = [];
    ctx.totalRowCount = 0;
    ctx.totalFilteredCount = 0;
  } finally {
    ctx.isLoading = false;
  }
}

export async function loadCsvFromPath(
  ctx: any,
  path: string,
  hasHeadersOverride?: boolean,
  trackWorkspace = true,
  forcedLabel?: string,
  applyInitialFilter = true
) {
  ctx.isLoading = true;
  ctx.isMergedView = false;
  ctx.loadError = null;
  try {
    if (hasHeadersOverride !== undefined) {
      ctx.hasHeaders = !!hasHeadersOverride;
    } else if (ctx.headerMode === 'yes') ctx.hasHeaders = true;
    else if (ctx.headerMode === 'no') ctx.hasHeaders = false;
    else {
      const sniff = (await ctx.invoke('inspector_sniff_has_headers_path', { path })) as {
        decided: boolean;
        hasHeaders: boolean;
        reason: string;
      };
      ctx.headerHeuristicReason = sniff.reason ?? '';
      if (!sniff.decided) {
        ctx.pendingPath = path;
        ctx.pendingText = null;
        ctx.showHeaderPrompt = true;
        ctx.isLoading = false;
        return;
      }
      ctx.hasHeaders = !!sniff.hasHeaders;
    }

    const resp = (await ctx.invoke('inspector_load_csv_path', { path, hasHeaders: ctx.hasHeaders })) as any;

    ctx.headers = resp.headers ?? [];
    ctx.totalRowCount = resp.rowCount ?? 0;
    ctx.colTypes = (resp.colTypes ?? []) as any[];

    const ids = ctx.computeDatasetIdentity(`path:${path}`, ctx.headers, ctx.totalRowCount, ctx.fnv1a32);
    ctx.datasetId = ids.id;
    ctx.datasetLabel = ids.label;
    if (forcedLabel) ctx.datasetLabel = forcedLabel;
    ctx.recipes = ctx.loadRecipesForDataset(ctx.datasetId);
    ctx.pendingRestore = ctx.loadLastStateForDataset(ctx.datasetId);
    ctx.hasLoaded = true;
    ctx.showDataControls = true;
    ctx.activeDatasetId = ctx.datasetId;

    if (trackWorkspace) {
      upsertWorkspaceDataset(ctx, {
        id: ctx.datasetId,
        label: forcedLabel || path.split('/').pop() || ctx.datasetLabel,
        hasHeaders: ctx.hasHeaders,
        source: { kind: 'path', path }
      });
    }

    if (!ctx.suspendReactiveFiltering) {
      ctx.sortColIdx = null;
      ctx.sortDir = 'asc';
      ctx.sortSpecs = [];
      ctx.visibleColumns = new Set();
      ctx.pinnedLeft = [];
      ctx.pinnedRight = [];
      ctx.hiddenColumns = [];
      ctx.columnWidths = {};
      if (ctx.targetColIdx != null && ctx.targetColIdx >= ctx.headers.length) ctx.targetColIdx = null;
      if (ctx.numericF.colIdx != null && ctx.numericF.colIdx >= ctx.headers.length) ctx.numericF = { ...ctx.numericF, enabled: false, colIdx: null, error: null };
      if (ctx.dateF.colIdx != null && ctx.dateF.colIdx >= ctx.headers.length) ctx.dateF = { ...ctx.dateF, enabled: false, colIdx: null, error: null };
      if (ctx.catF.colIdx != null && ctx.catF.colIdx >= ctx.headers.length) ctx.catF = { enabled: false, colIdx: null, selected: new Set() };
    }

    const preserveActiveQuery = (ctx.query ?? '').trim().length > 0 || ctx.matchMode !== 'fuzzy' || ctx.targetColIdx != null;
    if (ctx.pendingRestore && applyInitialFilter && !preserveActiveQuery) {
      await ctx.applyState(ctx.pendingRestore);
      ctx.pendingRestore = null;
    } else if (applyInitialFilter) {
      await ctx.runFilterNow();
    }
  } catch (e: any) {
    ctx.loadError = e?.message ?? String(e);
    ctx.hasLoaded = false;
    ctx.headers = [];
    ctx.visibleRows = [];
    ctx.totalRowCount = 0;
    ctx.totalFilteredCount = 0;
  } finally {
    ctx.isLoading = false;
  }
}

export function upsertWorkspaceDataset(ctx: any, ds: any) {
  ctx.loadedDatasets = ctx.upsertWorkspaceDatasetInList(ctx.loadedDatasets, ds);
  ctx.activeDatasetId = ds.id;
}

export async function unloadWorkspaceDataset(ctx: any, id: string) {
  const remaining = (ctx.loadedDatasets ?? []).filter((x: any) => x.id !== id);
  ctx.loadedDatasets = remaining;
  ctx.crossQueryResults = ctx.crossQueryResults.filter((x: any) => x.datasetId !== id);
  if (ctx.activeDatasetId !== id) return;
  if (remaining.length === 0) {
    ctx.activeDatasetId = '';
    ctx.datasetId = '';
    ctx.datasetLabel = '(none)';
    ctx.headers = [];
    ctx.visibleRows = [];
    ctx.totalRowCount = 0;
    ctx.totalFilteredCount = 0;
    ctx.hasLoaded = false;
    ctx.showDataControls = false;
    ctx.isMergedView = false;
    ctx.mergedHeaders = [];
    ctx.mergedRowsAll = [];
    return;
  }
  await ctx.activateWorkspaceDataset(remaining[0].id);
}

export async function openStreamLoadFromMenu(ctx: any) {
  if (!ctx.dialogMod) return;
  try {
    const p = await ctx.dialogMod.open({
      multiple: true,
      directory: false,
      filters: [{ name: 'CSV', extensions: ['csv', 'tsv'] }]
    });
    const paths = Array.isArray(p) ? p.filter((x: any): x is string => typeof x === 'string' && x.length > 0) : (typeof p === 'string' && p.length > 0 ? [p] : []);
    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];
      await loadCsvFromPath(ctx, path, undefined, true, path.split('/').pop() || `File ${i + 1}`);
    }
  } catch (e: any) {
    ctx.loadError = e?.message ?? String(e);
  }
}

export function openFallbackLoadFromMenu(ctx: any) {
  ctx.hiddenUploadInput?.click();
}

export async function activateWorkspaceDataset(ctx: any, datasetIdToActivate: string, internal = false) {
  const ds = (ctx.loadedDatasets ?? []).find((x: any) => x.id === datasetIdToActivate);
  if (!ds) return;
  ctx.suspendReactiveFiltering = true;
  ctx.isMergedView = false;
  try {
    if (ds.source.kind === 'path') {
      await loadCsvFromPath(ctx, ds.source.path, ds.hasHeaders, false, ds.label, false);
    } else {
      await loadCsvFromText(ctx, ds.source.text, ds.hasHeaders, false, ds.label, false);
    }
    if (!internal) {
      await ctx.runFilterNow(ctx.queryScope === 'current');
    }
    ctx.activeDatasetId = ds.id;
  } finally {
    ctx.suspendReactiveFiltering = false;
  }
}

export async function runCrossDatasetQuery(ctx: any) {
  if (ctx.crossQueryBusy || ctx.loadedDatasets.length <= 1 || !ctx.hasLoaded) return;
  const spec = ctx.buildFilterSpec();
  if (!spec) return;
  const startedAt = performance.now();
  ctx.queueDebug('runCrossDatasetQuery:start', {
    loadedDatasets: ctx.loadedDatasets.length,
    queryScope: ctx.queryScope,
    queryLen: (ctx.query ?? '').length,
    matchMode: ctx.matchMode
  });
  ctx.crossQueryBusy = true;
  ctx.suspendReactiveFiltering = true;
  try {
    ctx.preMergedHeaders = [...ctx.headers];
    ctx.preMergedColTypes = [...ctx.colTypes];
    ctx.preMergedTotalRowCount = ctx.totalRowCount;
    ctx.preMergedTotalFilteredCount = ctx.totalFilteredCount;

    const req = {
      datasets: ctx.loadedDatasets.map((ds: any) => ({
        datasetId: ds.id,
        label: ds.label,
        hasHeaders: ds.hasHeaders,
        kind: ds.source.kind,
        text: ds.source.kind === 'text' ? ds.source.text : null,
        path: ds.source.kind === 'path' ? ds.source.path : null
      })),
      spec
    };

    const resp = (await ctx.invoke('inspector_query_multiple_csv', { req })) as {
      datasetResults: { datasetId: string; label: string; filtered: number; total: number }[];
      mergedHeaders: string[];
      mergedRows: string[][];
    };
    ctx.queueDebug('runCrossDatasetQuery:response', {
      datasets: resp?.datasetResults?.length ?? 0,
      mergedHeaders: resp?.mergedHeaders?.length ?? 0,
      mergedRows: resp?.mergedRows?.length ?? 0,
      ms: Math.round(performance.now() - startedAt)
    });

    ctx.crossQueryResults = resp?.datasetResults ?? [];
    ctx.mergedHeaders = resp?.mergedHeaders ?? [];
    ctx.mergedRowsAll = resp?.mergedRows ?? [];
    ctx.isMergedView = true;
    ctx.headers = [...ctx.mergedHeaders];
    ctx.visibleColumns = new Set();
    ctx.colTypes = ctx.headers.map((_: any, i: number) => (i === 0 ? 'string' : 'string')) as any[];
    ctx.totalRowCount = ctx.mergedRowsAll.length;
    ctx.totalFilteredCount = ctx.mergedRowsAll.length;
    ctx.visibleRows = ctx.mergedRowsAll;
  } catch (e: any) {
    ctx.loadError = e?.message ?? String(e);
    ctx.queueDebug('runCrossDatasetQuery:error', {
      error: ctx.loadError,
      ms: Math.round(performance.now() - startedAt)
    });
    ctx.isMergedView = false;
    if (ctx.preMergedHeaders.length > 0) ctx.headers = [...ctx.preMergedHeaders];
    if (ctx.preMergedColTypes.length > 0) ctx.colTypes = [...ctx.preMergedColTypes];
    ctx.totalRowCount = ctx.preMergedTotalRowCount;
    ctx.totalFilteredCount = ctx.preMergedTotalFilteredCount;
  } finally {
    ctx.queueDebug('runCrossDatasetQuery:done', {
      merged: ctx.isMergedView,
      totalRows: ctx.totalRowCount,
      totalFiltered: ctx.totalFilteredCount,
      ms: Math.round(performance.now() - startedAt)
    });
    ctx.crossQueryBusy = false;
    ctx.suspendReactiveFiltering = false;
    void ctx.debugLogger.flush();
  }
}
