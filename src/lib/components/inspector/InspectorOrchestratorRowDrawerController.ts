export async function openRowDrawer(ctx: any, visualIdx: number) {
  if (!ctx.hasLoaded) return;
  const t0 = performance.now();
  ctx.withViewTransition(() => {
    ctx.showRowDrawer = true;
  });
  ctx.drawerLoading = true;
  ctx.drawerError = null;
  ctx.drawerVisualIdx = visualIdx;
  ctx.drawerKVs = [];
  ctx.drawerSearch = '';
  ctx.drawerExplain = null;
  try {
    const out = await ctx.loadRowDrawerData({
      invoke: ctx.invoke,
      visualIdx,
      headers: ctx.headers,
      colTypes: ctx.colTypes
    });
    ctx.drawerKVs = out.drawerKVs as any;
    ctx.drawerExplain = out.drawerExplain as any;
  } catch (e: any) {
    ctx.drawerError = e?.message ?? String(e);
  } finally {
    ctx.drawerLoading = false;
    ctx.recordPerf('row_drawer', t0, { visualIdx, fields: ctx.drawerKVs.length });
  }
}

export function closeRowDrawer(ctx: any) {
  ctx.withViewTransition(() => {
    ctx.showRowDrawer = false;
  });
  ctx.drawerLoading = false;
  ctx.drawerError = null;
  ctx.drawerVisualIdx = null;
  ctx.drawerKVs = [];
  ctx.drawerSearch = '';
  ctx.drawerExplain = null;
}

export async function copyDrawerAsJson(ctx: any) {
  try {
    await ctx.copyDrawerAsJsonController(ctx.drawerKVs as any);
    ctx.recipeNotice = 'Copied row JSON.';
    setTimeout(() => (ctx.recipeNotice = null), 1200);
  } catch {}
}

export function navRow(ctx: any, delta: number) {
  if (ctx.drawerVisualIdx == null) return;
  const next = ctx.clamp(ctx.drawerVisualIdx + delta, 0, Math.max(0, ctx.totalFilteredCount - 1));
  void openRowDrawer(ctx, next);
}

export function drawerApplyTarget(ctx: any, idx: number) {
  ctx.targetColIdx = idx;
  ctx.scheduleFilter();
}

export function drawerApplyCategory(ctx: any, idx: number, value: string) {
  ctx.tier2Open = true;
  ctx.tier2Tab = 'category';
  ctx.catF.colIdx = idx;
  ctx.catF.enabled = true;
  const s = new Set(ctx.catF.selected);
  const v = (value ?? '').trim();
  if (v) s.add(v);
  ctx.catF.selected = s;
  void ctx.runFilterNow();
}

export function drawerApplyNumericExact(ctx: any, idx: number, value: string) {
  const out = ctx.applyDrawerNumericExact(value);
  if (out == null) {
    ctx.recipeNotice = 'Value is not numeric.';
    setTimeout(() => (ctx.recipeNotice = null), 1400);
    return;
  }
  ctx.tier2Open = true;
  ctx.tier2Tab = 'numeric';
  ctx.numericF.enabled = true;
  ctx.numericF.colIdx = idx;
  ctx.numericF.minText = out;
  ctx.numericF.maxText = out;
  ctx.numericF.error = null;
  void ctx.runFilterNow();
}

export function drawerApplyDateExact(ctx: any, idx: number, value: string) {
  const iso = ctx.applyDrawerDateExact(value);
  if (iso == null) {
    ctx.recipeNotice = 'Value is not a recognized date.';
    setTimeout(() => (ctx.recipeNotice = null), 1400);
    return;
  }
  ctx.tier2Open = true;
  ctx.tier2Tab = 'date';
  ctx.dateF.enabled = true;
  ctx.dateF.colIdx = idx;
  ctx.dateF.minIso = iso;
  ctx.dateF.maxIso = iso;
  ctx.dateF.error = null;
  void ctx.runFilterNow();
}
