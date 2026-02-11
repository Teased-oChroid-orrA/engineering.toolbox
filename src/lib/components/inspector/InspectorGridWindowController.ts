export function normalizeRowHeight(value: number, fallback = 34): number {
  const n = Number.isFinite(value) ? Math.floor(value) : fallback;
  return Math.max(24, Math.min(96, n));
}

export function computeStartIdx(scrollTop: number, rowHeight: number, totalFilteredCount: number): number {
  if (totalFilteredCount <= 0) return 0;
  const safeRowHeight = normalizeRowHeight(rowHeight);
  const raw = Math.floor(Math.max(0, scrollTop) / safeRowHeight);
  return Math.min(Math.max(raw, 0), Math.max(0, totalFilteredCount - 1));
}

export function snapTranslateY(startIdx: number, rowHeight: number): number {
  const safeRowHeight = normalizeRowHeight(rowHeight);
  return Math.round(Math.max(0, startIdx) * safeRowHeight);
}

