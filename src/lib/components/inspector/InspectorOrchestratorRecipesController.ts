import type { RecipesControllerContext } from './InspectorControllerContext';

export function loadRecipesForDataset(ctx: RecipesControllerContext, dsId: string) {
  return ctx.loadRecipesForDatasetFromStore(ctx.RECIPES_STORE_KEY, ctx.LEGACY_RECIPES_STORE_KEYS, dsId);
}

export function persistRecipesForDataset(ctx: RecipesControllerContext, dsId: string, label: string, rs: any[]) {
  ctx.persistRecipesForDatasetToStore(ctx.RECIPES_STORE_KEY, ctx.LEGACY_RECIPES_STORE_KEYS, dsId, label, rs);
}

export function loadLastStateForDataset(ctx: RecipesControllerContext, dsId: string) {
  const out = ctx.loadLastStateForDatasetFromStore(ctx.LAST_STATE_STORE_KEY, ctx.LEGACY_LAST_STATE_KEYS, dsId);
  if (out.state) ctx.autoRestoreEnabled = out.autoRestore;
  return out.state;
}

export function persistLastStateForDataset(ctx: RecipesControllerContext, dsId: string, st: any) {
  ctx.persistLastStateForDatasetToStore(ctx.LAST_STATE_STORE_KEY, ctx.LEGACY_LAST_STATE_KEYS, dsId, st, ctx.autoRestoreEnabled);
}

export async function exportRecipesCurrent(ctx: RecipesControllerContext) {
  if (!ctx.datasetId) {
    ctx.recipeNotice = 'Load a dataset first.';
    return;
  }
  try {
    const payload = ctx.buildRecipeExportBlob({ datasetId: ctx.datasetId, datasetLabel: ctx.datasetLabel, recipes: ctx.recipes ?? [] });
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    const safeName = (ctx.datasetLabel || ctx.datasetId).replace(/[^a-z0-9\-_.]+/gi, '_').slice(0, 64);
    a.href = URL.createObjectURL(blob);
    a.download = `inspector_recipes_${safeName}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    ctx.recipeNotice = 'Exported.';
    setTimeout(() => (ctx.recipeNotice = null), 1200);
  } catch {
    ctx.recipeNotice = 'Export failed.';
  }
}

export async function importRecipesFile(ctx: RecipesControllerContext, file: File, mode: 'current' | 'file') {
  try {
    const text = await file.text();
    const obj = JSON.parse(text);
    if (!obj || obj.kind !== 'inspector_recipes' || !Array.isArray(obj.recipes) || ![1, 2].includes(Number(obj.v ?? 1))) {
      ctx.recipeNotice = 'Invalid recipes file.';
      return;
    }
    const targetId = mode === 'file' && typeof obj.datasetId === 'string' ? obj.datasetId : ctx.datasetId;
    const targetLabel = mode === 'file' && typeof obj.datasetLabel === 'string' ? obj.datasetLabel : ctx.datasetLabel;
    if (!targetId) {
      ctx.recipeNotice = 'Load a dataset first.';
      return;
    }

    const next = ctx.mergeImportedRecipes(ctx.recipes ?? [], obj.recipes ?? []);
    if (targetId === ctx.datasetId) ctx.recipes = next;
    ctx.persistRecipesForDataset(targetId, targetLabel, next);
    ctx.recipeNotice = `Imported ${next.length} recipe(s).`;
    setTimeout(() => (ctx.recipeNotice = null), 1400);
  } catch {
    ctx.recipeNotice = 'Import failed.';
  }
}

export async function exportCsvPreset(ctx: RecipesControllerContext, mode: 'current_view' | 'filtered_rows' | 'selected_columns') {
  if (!ctx.hasLoaded) return;
  try {
    let outHeaders = [...ctx.headers];
    let rows: string[][] = [];

    if (mode === 'current_view') {
      rows = [...ctx.visibleRows];
      if (ctx.visibleColIdxs.length > 0) outHeaders = ctx.visibleColIdxs.map((i: number) => ctx.headers[i] ?? `c${i}`);
    } else if (mode === 'filtered_rows') {
      const end = Math.max(0, Math.min(ctx.totalFilteredCount, 200_000));
      const resp = (await ctx.invoke('inspector_get_row_slice', { start: 0, end })) as any;
      rows = (Array.isArray(resp) ? resp : resp.rows) as string[][];
    } else {
      const sel = new Set<number>(ctx.visibleColIdxs.length ? ctx.visibleColIdxs : Array.from({ length: ctx.headers.length }, (_, i) => i));
      const sorted = Array.from(sel).sort((a: number, b: number) => a - b);
      outHeaders = sorted.map((i) => ctx.headers[i] ?? `c${i}`);
      const end = Math.max(0, Math.min(ctx.totalFilteredCount, 200_000));
      const resp = (await ctx.invoke('inspector_get_row_slice', { start: 0, end, cols: sorted })) as any;
      const raw = (Array.isArray(resp) ? resp : resp.rows) as string[][];
      rows = raw;
    }

    const csv = ctx.toCsvText(outHeaders, rows);
    ctx.downloadText(csv, `${ctx.datasetLabel.replace(/[^a-z0-9\-_]+/gi, '_')}_${mode}.csv`, 'text/csv;charset=utf-8');
  } catch (e: any) {
    ctx.recipeNotice = e?.message ?? String(e);
    setTimeout(() => (ctx.recipeNotice = null), 1600);
  }
}

export function exportAnalysisBundle(ctx: RecipesControllerContext) {
  if (!ctx.hasLoaded) return;
  const payload = {
    kind: 'inspector_analysis_bundle',
    v: 1,
    createdAt: Date.now(),
    datasetId: ctx.datasetId,
    datasetLabel: ctx.datasetLabel,
    summary: {
      rows: ctx.totalRowCount,
      filteredRows: ctx.totalFilteredCount,
      columns: ctx.headers.length,
      activeFiltersHash: ctx.activeFilterHash()
    },
    state: ctx.captureState(),
    schemaStats: ctx.schemaStats,
    perf: ctx.perf.lastByOp()
  };
  ctx.downloadText(JSON.stringify(payload, null, 2), `analysis_bundle_${ctx.datasetLabel.replace(/[^a-z0-9\-_]+/gi, '_')}.json`, 'application/json');
}

export function saveCurrentAsRecipe(ctx: RecipesControllerContext) {
  const name = (ctx.recipeName ?? '').trim();
  if (!name) {
    ctx.recipeNotice = 'Name required.';
    return;
  }
  const tags = (ctx.recipeTags ?? '')
    .split(',')
    .map((x: string) => x.trim())
    .filter((x: string) => x.length > 0)
    .slice(0, 8);
  const vars = Array.from(new Set((name.match(/\{[a-zA-Z0-9_]+\}/g) ?? []).map((x: string) => x.slice(1, -1))));
  const r = {
    id: ctx.newRecipeId(),
    name,
    createdAt: Date.now(),
    state: ctx.captureState(),
    tags,
    favorite: false,
    templateVars: vars,
    provenance: { datasetId: ctx.datasetId, datasetLabel: ctx.datasetLabel, createdAt: Date.now() }
  };
  ctx.recipes = [r, ...(ctx.recipes ?? [])];
  ctx.persistRecipesForDataset(ctx.datasetId, ctx.datasetLabel, ctx.recipes);
  ctx.recipeNotice = 'Saved.';
  ctx.recipeName = '';
  ctx.recipeTags = '';
}

export async function applyRecipe(ctx: RecipesControllerContext, r: any) {
  try {
    await ctx.applyState(r.state);
    ctx.recipeNotice = `Applied: ${r.name}`;
    setTimeout(() => (ctx.recipeNotice = null), 1400);
  } catch {}
}

export function deleteRecipe(ctx: RecipesControllerContext, id: string) {
  ctx.recipes = (ctx.recipes ?? []).filter((x: any) => x.id !== id);
  ctx.persistRecipesForDataset(ctx.datasetId, ctx.datasetLabel, ctx.recipes);
}

export function toggleRecipeFavorite(ctx: RecipesControllerContext, id: string) {
  ctx.recipes = (ctx.recipes ?? []).map((r: any) => (r.id === id ? { ...r, favorite: !r.favorite } : r));
  ctx.recipes = [...ctx.recipes].sort((a: any, b: any) => Number(!!b.favorite) - Number(!!a.favorite) || b.createdAt - a.createdAt);
  ctx.persistRecipesForDataset(ctx.datasetId, ctx.datasetLabel, ctx.recipes);
}
