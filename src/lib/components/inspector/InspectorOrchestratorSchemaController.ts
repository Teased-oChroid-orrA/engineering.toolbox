export async function computeSchemaStats(ctx: any) {
  if (!ctx.hasLoaded || ctx.headers.length === 0) return;
  const t0 = performance.now();
  ctx.schemaLoading = true;
  ctx.schemaError = null;
  const scopeFiltered = (ctx.query ?? '').trim().length > 0 || ctx.matchMode !== 'fuzzy' || ctx.targetColIdx != null;
  ctx.schemaScopeLabel = scopeFiltered ? 'filtered' : 'full';
  const tierSample = ctx.schemaSampleTier === 'fast' ? 800 : ctx.schemaSampleTier === 'balanced' ? 2000 : 10000;
  const n = Math.max(0, Math.min(Number(ctx.schemaSampleN) || tierSample, ctx.totalFilteredCount || ctx.totalRowCount || 0));
  const cacheKey = `${ctx.datasetId}:${ctx.activeFilterHash()}:${scopeFiltered ? 'filtered' : 'full'}:${n}`;
  const cached = ctx.schemaCache.get(cacheKey);
  if (cached) {
    ctx.schemaStats = cached;
    ctx.schemaLoading = false;
    ctx.recordPerf('schema', t0, { cache: true, sample: n, cols: ctx.headers.length });
    return;
  }
  ctx.schemaStats = [];
  try {
    const end = Math.max(0, Math.min(n, ctx.totalFilteredCount || 0));
    const resp = (await ctx.invoke('inspector_get_row_slice', { start: 0, end })) as any;
    const rows = (Array.isArray(resp) ? resp : resp.rows) as string[][];
    const stats = ctx.profileSchemaFromRows(rows, ctx.headers, ctx.colTypes);
    ctx.schemaStats = stats;
    ctx.schemaCache.set(cacheKey, stats);
    ctx.recordPerf('schema', t0, { cache: false, sample: n, cols: ctx.headers.length });
  } catch (e: any) {
    ctx.schemaError = e?.message ?? String(e);
  } finally {
    ctx.schemaLoading = false;
  }
}

export function openSchema(ctx: any) {
  if (!ctx.hasLoaded) return;
  ctx.withViewTransition(() => {
    ctx.showSchemaModal = true;
  });
  void computeSchemaStats(ctx);
}

export function setSchemaDriftBaseline(ctx: any) {
  ctx.schemaDriftBaseline = (ctx.schemaStats ?? []).map((x: any) => ({ ...x, topSample: [...(x.topSample ?? [])] }));
  ctx.recipeNotice = 'Schema baseline captured for drift compare.';
  setTimeout(() => (ctx.recipeNotice = null), 1400);
}

export async function fetchCategoryValues(ctx: any, reset = false) {
  if (!ctx.hasLoaded) return;
  const t0 = performance.now();
  const token = ctx.categoryGate.nextToken();
  const idx = ctx.catF.colIdx;
  if (idx == null || idx < 0 || idx >= ctx.headers.length) {
    ctx.catAvailItems = [];
    ctx.catAvailOffset = 0;
    ctx.catAvailDistinctTotal = 0;
    ctx.catAvailRowsScanned = 0;
    ctx.catAvailTotalRowsInView = 0;
    ctx.catAvailPartial = false;
    ctx.catAvailError = null;
    return;
  }

  if (reset) {
    ctx.catAvailOffset = 0;
    ctx.catAvailItems = [];
  }

  ctx.catAvailLoading = true;
  ctx.catAvailError = null;
  try {
    const resp = (await ctx.invoke('inspector_get_category_values', {
      req: {
        colIdx: idx,
        search: (ctx.catAvailSearch ?? '').trim() || null,
        offset: reset ? 0 : ctx.catAvailOffset,
        limit: ctx.catAvailLimit,
        maxRowsScan: ctx.parseMaxRowsScanText(ctx.maxRowsScanText) ?? 20000
      }
    })) as any;
    if (!ctx.categoryGate.isLatest(token)) return;

    ctx.catAvailRowsScanned = resp?.rowsScanned ?? 0;
    ctx.catAvailTotalRowsInView = resp?.totalRowsInView ?? 0;
    ctx.catAvailPartial = !!resp?.partial;
    ctx.catAvailDistinctTotal = resp?.distinctTotal ?? 0;

    const next = (resp?.values ?? []).map((x: any) => ({ value: x.value, count: x.count }));
    if (reset) ctx.catAvailItems = next;
    else ctx.catAvailItems = [...(ctx.catAvailItems ?? []), ...next];

    ctx.catAvailOffset = (reset ? 0 : ctx.catAvailOffset) + next.length;
    ctx.recordPerf('category', t0, {
      colIdx: idx,
      reset,
      returned: next.length,
      distinct: ctx.catAvailDistinctTotal,
      scanned: ctx.catAvailRowsScanned
    });
  } catch (e: any) {
    ctx.catAvailError = e?.message ?? String(e);
  } finally {
    if (ctx.categoryGate.isLatest(token)) ctx.catAvailLoading = false;
  }
}

export function scheduleFetchCategory(ctx: any, reset: boolean) {
  if (ctx.catAvailTimer) clearTimeout(ctx.catAvailTimer);
  ctx.catAvailTimer = setTimeout(() => {
    void fetchCategoryValues(ctx, reset);
  }, 160);
}
