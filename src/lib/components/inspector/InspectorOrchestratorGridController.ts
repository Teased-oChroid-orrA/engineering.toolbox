import { devLog } from '$lib/utils/devLog';
import type { GridControllerContext } from './InspectorControllerContext';

export async function fetchVisibleSlice(ctx: GridControllerContext) {
  if (!ctx.hasLoaded) {
    devLog('FETCH SLICE', 'Skipped: hasLoaded =', ctx.hasLoaded);
    return;
  }
  const t0 = performance.now();
  const token = ctx.sliceGate.nextToken();
  
  const s = Number.isFinite(ctx.startIdx) ? Math.max(0, ctx.startIdx) : 0;
  const e = Number.isFinite(ctx.endIdx) ? Math.max(s, ctx.endIdx) : s;
  const reqCols = ctx.visibleColIdxs;

  devLog('FETCH SLICE', 'isMergedView:', ctx.isMergedView, 'mergedRowsAll.length:', ctx.mergedRowsAll?.length, 'range:', s, '-', e);

  try {
    if (ctx.isMergedView) {
      const base = ctx.mergedRowsAll.slice(s, e);
      if (!ctx.sliceGate.isLatest(token)) return;
      
      // CRITICAL FIX: Use callback to trigger Svelte reactivity
      const newRows = reqCols.length === 0 
        ? base
        : base.map((r: string[]) => {
            const sparse: string[] = [];
            for (let i = 0; i < reqCols.length; i++) sparse[reqCols[i]] = r[reqCols[i]] ?? '';
            return sparse;
          });
      
      if (ctx.updateVisibleRows) {
        ctx.updateVisibleRows(newRows);
      } else {
        // Fallback: direct mutation
        (ctx as any).loadState.visibleRows = newRows;
      }
      
      devLog('FETCH SLICE', 'Set visibleRows to', newRows.length, 'rows');
      ctx.recordPerf('slice', t0, {
        start: s,
        end: e,
        renderedRows: newRows.length,
        requestedCols: reqCols.length,
        merged: true
      });
      return;
    }
    const resp = (await ctx.invoke('inspector_get_row_slice', { start: s, end: e, cols: reqCols })) as any;
    if (!ctx.sliceGate.isLatest(token)) return;
    const rows = Array.isArray(resp) ? resp : resp.rows;
    if (!Array.isArray(rows)) {
      ctx.visibleRows = [];
    } else if (reqCols.length === 0) {
      ctx.visibleRows = rows;
    } else {
      ctx.visibleRows = rows.map((r: string[]) => {
        const sparse: string[] = [];
        for (let i = 0; i < reqCols.length; i++) sparse[reqCols[i]] = r[i] ?? '';
        return sparse;
      });
    }
    ctx.recordPerf('slice', t0, {
      start: s,
      end: e,
      renderedRows: ctx.visibleRows.length,
      requestedCols: reqCols.length
    });
  } catch (err: any) {
    ctx.visibleRows = [];
    ctx.loadError = err?.message ?? String(err);
  }
}

export function scheduleSliceFetch(ctx: GridControllerContext) {
  if (ctx.sliceTimer) clearTimeout(ctx.sliceTimer);
  const adaptiveMs = ctx.totalFilteredCount > 250_000 ? 55 : ctx.totalFilteredCount > 100_000 ? 35 : 0;
  if (adaptiveMs <= 0) {
    void fetchVisibleSlice(ctx);
    return;
  }
  ctx.sliceTimer = setTimeout(() => void fetchVisibleSlice(ctx), adaptiveMs);
}

export async function requestSort(ctx: GridControllerContext, colIdx: number, opts?: { multi?: boolean }) {
  if (!ctx.hasLoaded || !ctx.headers.length) return;
  const t0 = performance.now();
  const token = ctx.sortGate.nextToken();

  const multi = !!opts?.multi;
  if (!multi) {
    if (ctx.sortColIdx === colIdx) ctx.sortDir = ctx.sortDir === 'asc' ? 'desc' : 'asc';
    else {
      ctx.sortColIdx = colIdx;
      ctx.sortDir = 'asc';
    }
    ctx.sortSpecs = [{ colIdx, dir: ctx.sortDir }];
  } else {
    const curr = [...(ctx.sortSpecs ?? [])];
    const at = curr.findIndex((s: any) => s.colIdx === colIdx);
    if (at >= 0) {
      curr[at] = { colIdx, dir: curr[at].dir === 'asc' ? 'desc' : 'asc' };
    } else {
      curr.push({ colIdx, dir: 'asc' });
    }
    ctx.sortSpecs = curr.slice(0, 4);
    const first = ctx.sortSpecs[0];
    ctx.sortColIdx = first?.colIdx ?? colIdx;
    ctx.sortDir = first?.dir ?? 'asc';
  }

  try {
    const seq = (ctx.sortSpecs?.length ? ctx.sortSpecs : [{ colIdx, dir: ctx.sortDir }]).slice(0, 4);
    if (ctx.isMergedView) {
      for (let i = seq.length - 1; i >= 0; i--) {
        const s = seq[i];
        const factor = s.dir === 'asc' ? 1 : -1;
        ctx.mergedRowsAll = [...ctx.mergedRowsAll].sort((a, b) => {
          const av = (a?.[s.colIdx] ?? '').toLowerCase();
          const bv = (b?.[s.colIdx] ?? '').toLowerCase();
          if (av === bv) return 0;
          return av < bv ? -1 * factor : 1 * factor;
        });
      }
    } else {
      for (const s of seq) {
        await ctx.invoke('inspector_sort', { spec: { colIdx: s.colIdx, dir: s.dir, stable: true } });
      }
    }
    if (!ctx.sortGate.isLatest(token)) return;
    await fetchVisibleSlice(ctx);
    ctx.recordPerf('sort', t0, {
      colIdx: ctx.sortSpecs?.[0]?.colIdx ?? colIdx,
      dir: ctx.sortSpecs?.[0]?.dir ?? ctx.sortDir,
      sortLevels: ctx.sortSpecs?.length ?? 1,
      firstPaintRows: ctx.visibleRows.length
    });
  } catch (err: any) {
    ctx.loadError = err?.message ?? String(err);
  }
}

export function smartSelectColumns(ctx: GridControllerContext) {
  const n = ctx.headers.length;
  const set = new Set<number>();
  if (!n) return;
  set.add(0);
  const preferredNames = ['part', 'pn', 'part_number', 'partnumber', 'dash', 'size', 'dia', 'diameter', 'mat', 'material', 'spec', 'standard', 'id'];
  const hits: number[] = [];
  ctx.headers.forEach((h: string, i: number) => {
    const k = (h || '').toLowerCase().replace(/\s+/g, '_');
    if (preferredNames.some((p) => k.includes(p))) hits.push(i);
  });

  for (const i of hits.slice(0, 12)) set.add(i);
  let i = 0;
  while (set.size < Math.min(13, n) && i < n) {
    set.add(i);
    i++;
  }
  ctx.visibleColumns = set;
}

export function openColumnPicker(ctx: GridControllerContext) {
  ctx.columnPickerNotice = null;
  if ((ctx.visibleColumns?.size ?? 0) === 0 && ctx.headers.length > 50) {
    smartSelectColumns(ctx);
    ctx.columnPickerNotice = 'Preferred columns selected.';
  }
  ctx.showColumnPicker = true;
}

export function toggleVisibleCol(ctx: GridControllerContext, i: number) {
  const set = new Set(ctx.visibleColumns);
  if (set.has(i)) set.delete(i);
  else set.add(i);
  ctx.visibleColumns = set;
}

export function selectAllColumns(ctx: GridControllerContext) {
  const set = new Set<number>();
  for (let i = 0; i < ctx.headers.length; i++) set.add(i);
  ctx.visibleColumns = set;
}

export function clearColumnSelection(ctx: GridControllerContext) {
  ctx.visibleColumns = new Set();
}

export function hideColumn(ctx: GridControllerContext, idx: number) {
  if (ctx.hiddenColumns.has(idx)) return;
  ctx.hiddenColumns = new Set([...ctx.hiddenColumns, idx]);
  ctx.pinnedLeft = new Set([...ctx.pinnedLeft].filter((x: number) => x !== idx));
  ctx.pinnedRight = new Set([...ctx.pinnedRight].filter((x: number) => x !== idx));
}

export function togglePinLeft(ctx: GridControllerContext, idx: number) {
  if (ctx.pinnedLeft.has(idx)) {
    ctx.pinnedLeft = new Set([...ctx.pinnedLeft].filter((x: number) => x !== idx));
    return;
  }
  ctx.pinnedRight = new Set([...ctx.pinnedRight].filter((x: number) => x !== idx));
  ctx.pinnedLeft = new Set([...ctx.pinnedLeft, idx]);
  ctx.hiddenColumns = new Set([...ctx.hiddenColumns].filter((x: number) => x !== idx));
}

export function togglePinRight(ctx: GridControllerContext, idx: number) {
  if (ctx.pinnedRight.has(idx)) {
    ctx.pinnedRight = new Set([...ctx.pinnedRight].filter((x: number) => x !== idx));
    return;
  }
  ctx.pinnedLeft = new Set([...ctx.pinnedLeft].filter((x: number) => x !== idx));
  ctx.pinnedRight = new Set([...ctx.pinnedRight, idx]);
  ctx.hiddenColumns = new Set([...ctx.hiddenColumns].filter((x: number) => x !== idx));
}

export function onColumnResize(ctx: GridControllerContext, idx: number, width: number) {
  ctx.columnWidths = { ...ctx.columnWidths, [idx]: Math.max(90, Math.min(480, Math.floor(width))) };
}
