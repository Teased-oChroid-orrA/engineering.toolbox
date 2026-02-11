type CylinderCtx = {
  getCylRes: () =>
    | {
        rms: number;
        absDistances: number[];
      }
    | null;
  getCylRefineK: () => number;
  getCylFitPointIds: () => number[];
  getSelectedPointIds: () => number[];
  setSelectedPointIds: (next: number[]) => void;
};

export function cylThresholdAbs(ctx: CylinderCtx): number {
  const cylRes = ctx.getCylRes();
  if (!cylRes) return 0;
  const k = Number.isFinite(ctx.getCylRefineK()) ? Math.abs(ctx.getCylRefineK()) : 2;
  return k * (cylRes.rms ?? 0);
}

export function cylIdsByThreshold(ctx: CylinderCtx, outliers: boolean): number[] {
  const cylRes = ctx.getCylRes();
  if (!cylRes) return [];
  const thr = cylThresholdAbs(ctx);
  const fitIds = ctx.getCylFitPointIds();
  const ids: number[] = [];
  for (let j = 0; j < (cylRes.absDistances?.length ?? 0); j++) {
    const d = Math.abs(cylRes.absDistances[j] ?? 0);
    if (outliers ? d > thr : d <= thr) ids.push(fitIds[j]);
  }
  return ids.filter((v) => Number.isFinite(v));
}

export function cylSelectOutliers(ctx: CylinderCtx): void {
  const ids = cylIdsByThreshold(ctx, true);
  ctx.setSelectedPointIds(Array.from(new Set(ids)).sort((a, b) => a - b));
}

export function cylKeepInliers(ctx: CylinderCtx): void {
  const ids = cylIdsByThreshold(ctx, false);
  ctx.setSelectedPointIds(Array.from(new Set(ids)).sort((a, b) => a - b));
}

export function cylRemoveOutliers(ctx: CylinderCtx): void {
  const toRemove = new Set(cylIdsByThreshold(ctx, true));
  const cur = new Set(ctx.getSelectedPointIds());
  for (const id of toRemove) cur.delete(id);
  ctx.setSelectedPointIds(Array.from(cur).sort((a, b) => a - b));
}
