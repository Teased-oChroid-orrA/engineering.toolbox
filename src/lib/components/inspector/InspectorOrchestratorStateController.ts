import type { StateControllerContext } from './InspectorControllerContext';

export function captureState(ctx: StateControllerContext) {
  return ctx.captureRecipeState({
    autoRestoreEnabled: ctx.autoRestoreEnabled,
    query: ctx.query,
    matchMode: ctx.matchMode,
    targetColIdx: ctx.targetColIdx,
    maxRowsScanText: ctx.maxRowsScanText,
    multiQueryEnabled: ctx.multiQueryEnabled,
    multiQueryExpanded: ctx.multiQueryExpanded,
    multiQueryClauses: ctx.multiQueryClauses,
    numericF: ctx.numericF,
    dateF: ctx.dateF,
    catF: ctx.catF,
    sortColIdx: ctx.sortColIdx,
    sortDir: ctx.sortDir,
    sortSpecs: ctx.sortSpecs ?? [],
    visibleColumns: ctx.visibleColumns ?? new Set<number>(),
    pinnedLeft: ctx.pinnedLeft ?? [],
    pinnedRight: ctx.pinnedRight ?? [],
    hiddenColumns: ctx.hiddenColumns ?? [],
    columnWidths: ctx.columnWidths ?? {}
  });
}

export async function applyState(ctx: StateControllerContext, st: any) {
  const migrated = ctx.migrateAndNormalizeRecipeState(st);
  if (!migrated) return;
  ctx.autoRestoreEnabled = migrated.autoRestore ?? true;
  ctx.query = migrated.query ?? '';
  ctx.matchMode = migrated.matchMode ?? 'fuzzy';
  ctx.multiQueryEnabled = !!migrated.multiQueryEnabled;
  ctx.multiQueryExpanded = !!migrated.multiQueryExpanded;
  ctx.multiQueryClauses = (migrated.multiQueryClauses ?? []).map((c: any) => ({
    id: String(c?.id ?? ''),
    query: String(c?.query ?? ''),
    mode: c?.mode === 'exact' || c?.mode === 'regex' ? c.mode : 'fuzzy'
  })).filter((c: any) => c.id.length > 0 || c.query.length > 0);
  if ((ctx.multiQueryClauses?.length ?? 0) === 0) {
    ctx.multiQueryClauses = [{ id: `mq_${Date.now()}_0`, query: '', mode: 'fuzzy' }];
  }
  ctx.targetColIdx = migrated.targetColIdx ?? null;
  ctx.maxRowsScanText = migrated.maxRowsScanText ?? '';
  ctx.numericF = {
    enabled: !!migrated.numericF?.enabled,
    colIdx: migrated.numericF?.colIdx ?? null,
    minText: migrated.numericF?.minText ?? '',
    maxText: migrated.numericF?.maxText ?? '',
    error: null
  };
  ctx.dateF = {
    enabled: !!migrated.dateF?.enabled,
    colIdx: migrated.dateF?.colIdx ?? null,
    minIso: migrated.dateF?.minIso ?? '',
    maxIso: migrated.dateF?.maxIso ?? '',
    error: null
  };
  ctx.catF = {
    enabled: !!migrated.catF?.enabled,
    colIdx: migrated.catF?.colIdx ?? null,
    selected: new Set<string>(migrated.catF?.selected ?? [])
  };
  ctx.sortColIdx = migrated.sortColIdx ?? null;
  ctx.sortDir = migrated.sortDir ?? 'asc';
  ctx.sortSpecs = (migrated.sortSpecs ?? (ctx.sortColIdx != null ? [{ colIdx: ctx.sortColIdx, dir: ctx.sortDir }] : []))
    .filter((x: any) => x && typeof x.colIdx === 'number' && (x.dir === 'asc' || x.dir === 'desc'))
    .slice(0, 4);
  ctx.visibleColumns = new Set<number>((migrated.visibleColumns ?? []).filter((i: number) => i >= 0 && i < ctx.headers.length));
  ctx.pinnedLeft = (migrated.pinnedLeft ?? []).filter((i: number) => i >= 0 && i < ctx.headers.length);
  ctx.pinnedRight = (migrated.pinnedRight ?? []).filter((i: number) => i >= 0 && i < ctx.headers.length && !ctx.pinnedLeft.includes(i));
  ctx.hiddenColumns = (migrated.hiddenColumns ?? []).filter((i: number) => i >= 0 && i < ctx.headers.length);
  ctx.columnWidths = { ...(migrated.columnWidths ?? {}) };

  if ((ctx.sortSpecs?.length ?? 0) > 0) {
    try {
      for (const s of ctx.sortSpecs) {
        await ctx.invoke('inspector_sort', { spec: { colIdx: s.colIdx, dir: s.dir, stable: true } });
      }
    } catch {}
  } else if (ctx.sortColIdx != null) {
    try {
      await ctx.invoke('inspector_sort', { spec: { colIdx: ctx.sortColIdx, dir: ctx.sortDir, stable: true } });
    } catch {}
  }
  await ctx.runFilterNow();
}
