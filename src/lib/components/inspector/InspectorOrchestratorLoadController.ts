import { devLog } from '$lib/utils/devLog';
import { inspectorLogger } from '$lib/utils/loggers';
import type { LoadControllerContext } from './InspectorControllerContext';
import { resetBrowserModeOriginalRows } from './InspectorOrchestratorFilterController';

function normalizeDatasetLabel(input: string | null | undefined, fallback = 'Unnamed file'): string {
  const raw = (input ?? '').trim();
  const dequoted = raw.replace(/^["']+|["']+$/g, '').trim();
  if (!dequoted || /^\[?\s*none\s*\]?$/i.test(dequoted) || /^\(\s*none\s*\)$/i.test(dequoted)) {
    return fallback;
  }
  const base = dequoted.split(/[\\/]/).pop() ?? dequoted;
  const stripped = base.replace(/\.csv$/i, '').trim();
  return stripped || fallback;
}

function ensureSourceColumnHeaders(headers: string[]): { baseHeaders: string[]; fullHeaders: string[]; sourceIdx: number } {
  const srcIdx = headers.indexOf('_source_file');
  if (srcIdx >= 0) {
    const base = headers.filter((_, i) => i !== srcIdx);
    return { baseHeaders: base, fullHeaders: [...base, '_source_file'], sourceIdx: base.length };
  }
  return { baseHeaders: [...headers], fullHeaders: [...headers, '_source_file'], sourceIdx: headers.length };
}

function alignRowToHeaders(row: string[], rowHeaders: string[], targetHeaders: string[]): string[] {
  const idx = new Map<string, number>();
  for (let i = 0; i < rowHeaders.length; i++) idx.set(rowHeaders[i], i);
  return targetHeaders.map((h) => {
    const at = idx.get(h);
    return at == null ? '' : (row?.[at] ?? '');
  });
}

function appendBrowserDatasetToMergedRows(ctx: LoadControllerContext, args: {
  datasetLabel: string;
  parsedHeaders: string[];
  parsedRows: string[][];
  existingHeaders: string[];
  existingRows: string[][];
}) {
  const currentDatasets = (ctx.loadedDatasets ?? []) as any[];
  const fallbackExistingSource = normalizeDatasetLabel(currentDatasets[0]?.label);

  const existingNorm = ensureSourceColumnHeaders(args.existingHeaders ?? []);
  const newNorm = ensureSourceColumnHeaders(args.parsedHeaders ?? []);
  const combinedBaseHeaders = [...existingNorm.baseHeaders];
  for (const h of newNorm.baseHeaders) if (!combinedBaseHeaders.includes(h)) combinedBaseHeaders.push(h);
  const combinedFullHeaders = [...combinedBaseHeaders, '_source_file'];
  const sourceIdx = combinedBaseHeaders.length;

  const remappedExisting = (args.existingRows ?? []).map((r) => {
    const sourceRaw = existingNorm.sourceIdx < r.length ? r[existingNorm.sourceIdx] : fallbackExistingSource;
    const aligned = alignRowToHeaders(r, existingNorm.baseHeaders, combinedBaseHeaders);
    aligned[sourceIdx] = normalizeDatasetLabel(sourceRaw, fallbackExistingSource);
    return aligned;
  });

  const remappedNew = (args.parsedRows ?? []).map((r) => {
    const aligned = alignRowToHeaders(r, newNorm.baseHeaders, combinedBaseHeaders);
    aligned[sourceIdx] = args.datasetLabel;
    return aligned;
  });

  (ctx as any).loadState.headers = combinedFullHeaders;
  (ctx as any).loadState.colTypes = [...combinedBaseHeaders.map(() => 'string'), 'string'];
  (ctx as any).loadState.mergedRowsAll = [...remappedExisting, ...remappedNew];
  (ctx as any).loadState.totalRowCount = (ctx as any).loadState.mergedRowsAll.length;
  (ctx as any).loadState.totalFilteredCount = (ctx as any).loadState.mergedRowsAll.length;
  (ctx as any).loadState.visibleRows = (ctx as any).loadState.mergedRowsAll;
  (ctx as any).loadState.isMergedView = true;
}

async function rebuildMergedRowsFromWorkspaceTextDatasets(ctx: LoadControllerContext) {
  const datasets = (ctx.loadedDatasets ?? []).filter((ds: any) => ds?.source?.kind === 'text');
  if (datasets.length <= 1) return;
  const { parseCsvInBrowser } = await import('$lib/utils/csvParser');
  const unionHeaders: string[] = [];
  const parsed = datasets.map((ds: any) => {
    const out = parseCsvInBrowser(String(ds.source.text ?? ''), !!ds.hasHeaders);
    for (const h of out.headers ?? []) if (!unionHeaders.includes(h)) unionHeaders.push(h);
    return { label: normalizeDatasetLabel(ds.label), headers: out.headers ?? [], rows: out.rows ?? [] };
  });

  const outRows: string[][] = [];
  for (const ds of parsed) {
    const idx = new Map<string, number>();
    for (let i = 0; i < ds.headers.length; i++) idx.set(ds.headers[i], i);
    for (const row of ds.rows) {
      const aligned = unionHeaders.map((h) => {
        const at = idx.get(h);
        return at == null ? '' : (row?.[at] ?? '');
      });
      aligned.push(ds.label);
      outRows.push(aligned);
    }
  }

  (ctx as any).loadState.headers = [...unionHeaders, '_source_file'];
  (ctx as any).loadState.colTypes = [...unionHeaders.map(() => 'string'), 'string'];
  (ctx as any).loadState.mergedRowsAll = outRows;
  (ctx as any).loadState.totalRowCount = outRows.length;
  (ctx as any).loadState.totalFilteredCount = outRows.length;
  (ctx as any).loadState.visibleRows = outRows;
  (ctx as any).loadState.isMergedView = true;
}

export async function loadCsvFromText(
  ctx: LoadControllerContext,
  text: string,
  hasHeadersOverride?: boolean,
  trackWorkspace = true,
  forcedLabel?: string,
  applyInitialFilter = true
) {
  inspectorLogger.debug('[LOAD CTRL] Executing text load, length:', text.length);
  inspectorLogger.debug('[LOAD CTRL] loadCsvFromText called, text length:', text.length);
  inspectorLogger.debug('[LOAD CTRL] hasHeadersOverride:', hasHeadersOverride, 'trackWorkspace:', trackWorkspace);
  
  // Reset browser mode original rows when loading new CSV
  resetBrowserModeOriginalRows();
  
  ctx.isLoading = true;
  // Don't reset isMergedView here - it will be set correctly based on browser/Tauri mode
  // ctx.isMergedView = false;  // REMOVED: This breaks browser mode which needs isMergedView=true
  ctx.loadError = null;
  try {
    let didCrossMerge = false;
    const previousMergedHeaders = [...(((ctx as any).loadState.headers ?? []) as string[])];
    const previousMergedRows = [...(((ctx as any).loadState.mergedRowsAll ?? []) as string[][])];

    if (hasHeadersOverride !== undefined) {
      ctx.hasHeaders = !!hasHeadersOverride;
    } else if (ctx.headerMode === 'yes') {
      ctx.hasHeaders = true;
    } else if (ctx.headerMode === 'no') {
      ctx.hasHeaders = false;
    } else {
      // headerMode === 'auto': Use heuristic to auto-decide
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      const first = (lines[0] ?? '').split(',');
      const second = (lines[1] ?? '').split(',');
      const h = ctx.heuristicHasHeaders(first, second);
      ctx.headerHeuristicReason = h.reason;
      
      // Store heuristic results
      (ctx as any).headerConfidence = h.confidence;
      (ctx as any).autoDecision = h.value;
      
      // FIX: Use heuristic decision directly instead of showing prompt
      // The prompt modal has Svelte 5 reactivity issues, and the heuristic is reliable enough
      // Users can manually change Headers mode if the auto-detection is wrong
      ctx.queueDebug('loadCsvFromText:autoHeaderDecision', {
        decidedHeaders: h.value,
        confidence: h.confidence,
        reason: h.reason
      });
      ctx.hasHeaders = h.value;  // Use heuristic decision
      // Continue with loading (don't return early)
    }

    let resp;
    let browserModeRows: string[][] | null = null;
    try {
      // Check if Tauri is available
      const hasTauriRuntime = typeof window !== 'undefined' && (!!(window as any).__TAURI_INTERNALS__ || !!(window as any).__TAURI__);
      if (!hasTauriRuntime) {
        const { parseCsvInBrowser } = await import('$lib/utils/csvParser');
        const parsed = parseCsvInBrowser(text, ctx.hasHeaders);
        browserModeRows = parsed.rows;
        resp = { headers: parsed.headers, rowCount: parsed.rowCount, colTypes: parsed.colTypes };
      } else {
        resp = (await ctx.invoke('inspector_load_csv_text', { text, hasHeaders: ctx.hasHeaders })) as any;
      }
    } catch (backendError) {
      inspectorLogger.error('[LOAD CSV] Backend error, trying browser fallback:', backendError);
      const { parseCsvInBrowser } = await import('$lib/utils/csvParser');
      const parsed = parseCsvInBrowser(text, ctx.hasHeaders);
      browserModeRows = parsed.rows;
      resp = { headers: parsed.headers, rowCount: parsed.rowCount, colTypes: parsed.colTypes };
    }

    // CRITICAL FIX: Use loadState directly to ensure reactivity (same pattern as hasLoaded)
    (ctx as any).loadState.headers = resp.headers ?? [];
    (ctx as any).loadState.totalRowCount = resp.rowCount ?? 0;
    (ctx as any).loadState.colTypes = (resp.colTypes ?? []) as any[];

    const ids = ctx.computeDatasetIdentity(
      `text:${ctx.fnv1a32((text ?? '').slice(0, 20000))}`,
      ctx.headers,
      ctx.totalRowCount,
      ctx.fnv1a32
    );
    ctx.datasetId = ids.id;
    ctx.datasetLabel = normalizeDatasetLabel(forcedLabel || ids.label);

    // Browser mode must preserve all loaded files in one merged stream.
    // Previous behavior replaced mergedRowsAll with the newest file.
    if (browserModeRows !== null) {
      appendBrowserDatasetToMergedRows(ctx, {
        datasetLabel: ctx.datasetLabel,
        parsedHeaders: resp.headers ?? [],
        parsedRows: browserModeRows,
        existingHeaders: previousMergedHeaders,
        existingRows: previousMergedRows
      });
      devLog('LOAD CSV', 'Browser mode: merged rows now', ((ctx as any).loadState.mergedRowsAll ?? []).length);
    }

    ctx.recipes = await ctx.loadRecipesForDataset(ctx.datasetId);
    ctx.pendingRestore = await ctx.loadLastStateForDataset(ctx.datasetId);
    // CRITICAL FIX: Access loadState directly to ensure reactivity
    // Setting ctx.hasLoaded = true creates a new property due to TypeScript cast
    (ctx as any).loadState.hasLoaded = true;
    devLog('LOAD CSV', 'hasLoaded set to true, datasetId:', ctx.datasetId);
    
    // Bug 3 fix: Reset grid window so setupGridWindowInitEffect can reinitialize
    if (typeof (ctx as any).loadState.resetGridWindow === 'function') {
      (ctx as any).loadState.resetGridWindow();
    }
    
    // showDataControls removed - now always true in Orchestrator
    ctx.activeDatasetId = ctx.datasetId;

    if (trackWorkspace) {
      upsertWorkspaceDataset(ctx, {
        id: ctx.datasetId,
        label: normalizeDatasetLabel(forcedLabel || ctx.datasetLabel),
        hasHeaders: ctx.hasHeaders,
        source: { kind: 'text', text },
        rowCount: resp.rowCount ?? 0,
        colCount: (resp.headers ?? []).length,
        headerNames: [...(resp.headers ?? [])],
        filteredCount: resp.rowCount ?? 0
      });
    }

    if (trackWorkspace && (ctx.loadedDatasets?.length ?? 0) > 1 && (ctx.loadedDatasets ?? []).every((ds: any) => ds?.source?.kind === 'text')) {
      await rebuildMergedRowsFromWorkspaceTextDatasets(ctx);
    }

    // Tauri text uploads can load through backend without browser fallback rows.
    // In that mode, keep the multi-file merged grid synchronized explicitly.
    if (trackWorkspace && (ctx.loadedDatasets?.length ?? 0) > 1 && browserModeRows === null) {
      await ctx.runCrossDatasetQuery();
      didCrossMerge = true;
    }

    if (!ctx.suspendReactiveFiltering) {
      // CRITICAL FIX: Temporarily suspend reactive filtering while we batch state resets
      // Without this, each assignment below triggers the reactive filter effect, causing 40+ calls
      const wasSuspended = ctx.suspendReactiveFiltering;
      ctx.suspendReactiveFiltering = true;
      
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
      
      // Restore original suspend state
      ctx.suspendReactiveFiltering = wasSuspended;
    }

    const preserveActiveQuery = (ctx.query ?? '').trim().length > 0 || ctx.matchMode !== 'fuzzy' || ctx.targetColIdx != null;
    if (ctx.pendingRestore && applyInitialFilter && !preserveActiveQuery && !didCrossMerge) {
      await ctx.applyState(ctx.pendingRestore);
      ctx.pendingRestore = null;
    } else if (applyInitialFilter && !didCrossMerge) {
      await ctx.runFilterNow();
    }
  } catch (e: any) {
    inspectorLogger.error('[LOAD CSV TEXT] Failed to complete load', e);
    ctx.loadError = e?.message ?? String(e);
    (ctx as any).loadState.hasLoaded = false;
    (ctx as any).loadState.headers = [];
    (ctx as any).loadState.visibleRows = [];
    (ctx as any).loadState.totalRowCount = 0;
    (ctx as any).loadState.totalFilteredCount = 0;
  } finally {
    ctx.isLoading = false;
  }
}

export async function loadCsvFromPath(
  ctx: LoadControllerContext,
  path: string,
  hasHeadersOverride?: boolean,
  trackWorkspace = true,
  forcedLabel?: string,
  applyInitialFilter = true
) {
  // Reset browser mode original rows when loading new CSV
  resetBrowserModeOriginalRows();
  
  ctx.isLoading = true;
  // Don't unconditionally reset isMergedView - will be set based on mode
  // ctx.isMergedView = false;  // REMOVED
  ctx.loadError = null;
  try {
    if (hasHeadersOverride !== undefined) {
      ctx.hasHeaders = !!hasHeadersOverride;
    } else if (ctx.headerMode === 'yes') {
      ctx.hasHeaders = true;
    } else if (ctx.headerMode === 'no') {
      ctx.hasHeaders = false;
    } else {
      // headerMode === 'auto': Use heuristic to auto-decide
      const sniff = (await ctx.invoke('inspector_sniff_has_headers_path', { path })) as {
        decided: boolean;
        hasHeaders: boolean;
        reason: string;
        confidence?: number;
      };
      ctx.headerHeuristicReason = sniff.reason ?? '';
      
      // Store heuristic results
      (ctx as any).headerConfidence = sniff.confidence ?? 0.5;
      (ctx as any).autoDecision = sniff.hasHeaders;
      
      // FIX: Use heuristic decision directly instead of showing prompt
      // The prompt modal has Svelte 5 reactivity issues, and the heuristic is reliable enough
      // Users can manually change Headers mode if the auto-detection is wrong
      ctx.queueDebug('loadCsvFromPath:autoHeaderDecision', {
        decidedHeaders: sniff.hasHeaders,
        confidence: sniff.confidence ?? null,
        reason: sniff.reason ?? ''
      });
      ctx.hasHeaders = sniff.hasHeaders;  // Use heuristic decision
      // Continue with loading (don't return early)
    }

    const resp = (await ctx.invoke('inspector_load_csv_path', { path, hasHeaders: ctx.hasHeaders })) as any;

    // CRITICAL FIX: Use loadState directly to ensure reactivity
    (ctx as any).loadState.headers = resp.headers ?? [];
    (ctx as any).loadState.totalRowCount = resp.rowCount ?? 0;
    (ctx as any).loadState.colTypes = (resp.colTypes ?? []) as any[];

    const ids = ctx.computeDatasetIdentity(`path:${path}`, ctx.headers, ctx.totalRowCount, ctx.fnv1a32);
    ctx.datasetId = ids.id;
    ctx.datasetLabel = normalizeDatasetLabel(forcedLabel || ids.label);
    ctx.recipes = await ctx.loadRecipesForDataset(ctx.datasetId);
    ctx.pendingRestore = await ctx.loadLastStateForDataset(ctx.datasetId);
    // CRITICAL FIX: Use loadState directly to ensure reactivity (same fix as loadCsvFromText)
    (ctx as any).loadState.hasLoaded = true;
    devLog('LOAD CSV PATH', 'hasLoaded set to true, datasetId:', ctx.datasetId);
    
    // Bug 3 fix: Reset grid window so setupGridWindowInitEffect can reinitialize
    if (typeof (ctx as any).loadState.resetGridWindow === 'function') {
      (ctx as any).loadState.resetGridWindow();
    }
    
    // showDataControls removed - now always true in Orchestrator
    ctx.activeDatasetId = ctx.datasetId;

    if (trackWorkspace) {
      upsertWorkspaceDataset(ctx, {
        id: ctx.datasetId,
        label: normalizeDatasetLabel(forcedLabel || path.split('/').pop() || ctx.datasetLabel),
        hasHeaders: ctx.hasHeaders,
        source: { kind: 'path', path },
        rowCount: resp.rowCount ?? 0,
        colCount: (resp.headers ?? []).length,
        headerNames: [...(resp.headers ?? [])],
        filteredCount: resp.rowCount ?? 0
      });
    }

    if (!ctx.suspendReactiveFiltering) {
      // CRITICAL FIX: Temporarily suspend reactive filtering while we batch state resets
      // Without this, each assignment below triggers the reactive filter effect, causing 40+ calls
      const wasSuspended = ctx.suspendReactiveFiltering;
      ctx.suspendReactiveFiltering = true;
      
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
      
      // Restore original suspend state
      ctx.suspendReactiveFiltering = wasSuspended;
    }

    const preserveActiveQuery = (ctx.query ?? '').trim().length > 0 || ctx.matchMode !== 'fuzzy' || ctx.targetColIdx != null;
    if (ctx.pendingRestore && applyInitialFilter && !preserveActiveQuery) {
      await ctx.applyState(ctx.pendingRestore);
      ctx.pendingRestore = null;
    } else if (applyInitialFilter) {
      await ctx.runFilterNow();
    }
  } catch (e: any) {
    inspectorLogger.error('[LOAD CSV PATH] Failed to complete load', e);
    ctx.loadError = e?.message ?? String(e);
    (ctx as any).loadState.hasLoaded = false;
    (ctx as any).loadState.headers = [];
    (ctx as any).loadState.visibleRows = [];
    (ctx as any).loadState.totalRowCount = 0;
    (ctx as any).loadState.totalFilteredCount = 0;
  } finally {
    ctx.isLoading = false;
  }
}

export function upsertWorkspaceDataset(ctx: LoadControllerContext, ds: any) {
  const updated = ctx.upsertWorkspaceDatasetInList(ctx.loadedDatasets, ds);
  
  // Mutate array in place to preserve Svelte 5 reactivity
  // (replacing the reference breaks reactivity in the context system)
  ctx.loadedDatasets.length = 0;
  ctx.loadedDatasets.push(...updated);
  
  ctx.activeDatasetId = ds.id;
}

export async function unloadWorkspaceDataset(ctx: LoadControllerContext, id: string) {
  const remaining = (ctx.loadedDatasets ?? []).filter((x: any) => x.id !== id);
  
  // Bug 4 fix: Use in-place mutation to preserve Svelte 5 reactivity (same as upsertWorkspaceDataset)
  ctx.loadedDatasets.length = 0;
  ctx.loadedDatasets.push(...remaining);
  
  ctx.crossQueryResults = ctx.crossQueryResults.filter((x: any) => x.datasetId !== id);
  resetBrowserModeOriginalRows();

  if (remaining.length === 0) {
    ctx.activeDatasetId = '';
    ctx.datasetId = '';
    ctx.datasetLabel = '(none)';
    (ctx as any).loadState.headers = [];
    (ctx as any).loadState.visibleRows = [];
    (ctx as any).loadState.totalRowCount = 0;
    (ctx as any).loadState.totalFilteredCount = 0;
    (ctx as any).loadState.hasLoaded = false;
    (ctx as any).loadState.isMergedView = false;
    ctx.mergedHeaders = [];
    ctx.mergedRowsAll = [];
    if (typeof (ctx as any).loadState.resetGridWindow === 'function') {
      (ctx as any).loadState.resetGridWindow();
    }
    return;
  }

  if (remaining.length === 1) {
    // If unloading down to one dataset while in merged/cross mode,
    // always restore that dataset as the active single-file view.
    await ctx.activateWorkspaceDataset(remaining[0].id);
    return;
  }

  if (remaining.every((ds: any) => ds?.source?.kind === 'text')) {
    await rebuildMergedRowsFromWorkspaceTextDatasets(ctx);
    (ctx as any).loadState.hasLoaded = true;
    (ctx as any).loadState.isMergedView = true;
    if (!(remaining as any[]).some((ds: any) => ds.id === ctx.activeDatasetId)) {
      ctx.activeDatasetId = remaining[0].id;
      ctx.datasetId = remaining[0].id;
      ctx.datasetLabel = normalizeDatasetLabel(remaining[0].label);
    }
    await ctx.runFilterNow(true);
    return;
  }

  if (!(remaining as any[]).some((ds: any) => ds.id === ctx.activeDatasetId)) {
    await ctx.activateWorkspaceDataset(remaining[0].id);
    return;
  }
  if (ctx.queryScope === 'all') {
    await ctx.runCrossDatasetQuery();
  } else {
    await ctx.runFilterNow(true);
  }
}

export async function openStreamLoadFromMenu(ctx: LoadControllerContext) {
  if (!ctx.dialogMod) {
    // In web/fallback environments, native dialog may be unavailable.
    // Route to hidden file input instead of silently no-op.
    openFallbackLoadFromMenu(ctx);
    return;
  }
  try {
    const p = await ctx.dialogMod.open({
      multiple: true,
      directory: false,
      filters: [{ name: 'CSV', extensions: ['csv', 'tsv'] }]
    }) as string | string[] | null;
    const paths = Array.isArray(p) ? p.filter((x: any): x is string => typeof x === 'string' && x.length > 0) : (typeof p === 'string' && p.length > 0 ? [p] : []);
    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];
      await loadCsvFromPath(ctx, path, undefined, true, path.split('/').pop() || `File ${i + 1}`);
    }
  } catch (e: any) {
    ctx.loadError = e?.message ?? String(e);
  }
}

export function openFallbackLoadFromMenu(ctx: LoadControllerContext) {
  ctx.hiddenUploadInput?.click();
}

export async function activateWorkspaceDataset(ctx: LoadControllerContext, datasetIdToActivate: string, internal = false) {
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

export async function runCrossDatasetQuery(ctx: LoadControllerContext) {
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
    if ((ctx.loadedDatasets?.length ?? 0) > 0) {
      const byId = new Map((resp?.datasetResults ?? []).map((r: any) => [r.datasetId, r]));
      const next = (ctx.loadedDatasets ?? []).map((ds: any) => {
        const hit = byId.get(ds.id);
        if (!hit) return ds;
        return {
          ...ds,
          rowCount: typeof hit.total === 'number' ? hit.total : ds.rowCount,
          filteredCount: typeof hit.filtered === 'number' ? hit.filtered : ds.filteredCount
        };
      });
      ctx.loadedDatasets.length = 0;
      ctx.loadedDatasets.push(...next);
    }
    ctx.mergedHeaders = resp?.mergedHeaders ?? [];
    (ctx as any).loadState.mergedRowsAll = resp?.mergedRows ?? [];
    (ctx as any).loadState.isMergedView = true;
    (ctx as any).loadState.headers = [...ctx.mergedHeaders];
    ctx.visibleColumns = new Set();
    (ctx as any).loadState.colTypes = ctx.headers.map((_: any, i: number) => (i === 0 ? 'string' : 'string')) as any[];
    (ctx as any).loadState.totalRowCount = (ctx as any).loadState.mergedRowsAll.length;
    (ctx as any).loadState.totalFilteredCount = (ctx as any).loadState.mergedRowsAll.length;
    (ctx as any).loadState.visibleRows = (ctx as any).loadState.mergedRowsAll;
  } catch (e: any) {
    ctx.loadError = e?.message ?? String(e);
    ctx.queueDebug('runCrossDatasetQuery:error', {
      error: ctx.loadError,
      ms: Math.round(performance.now() - startedAt)
    });
    (ctx as any).loadState.isMergedView = false;
    if (ctx.preMergedHeaders.length > 0) (ctx as any).loadState.headers = [...ctx.preMergedHeaders];
    if (ctx.preMergedColTypes.length > 0) (ctx as any).loadState.colTypes = [...ctx.preMergedColTypes];
    (ctx as any).loadState.totalRowCount = ctx.preMergedTotalRowCount;
    (ctx as any).loadState.totalFilteredCount = ctx.preMergedTotalFilteredCount;
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
