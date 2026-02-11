import {
  buildCombinedSliceCsv,
  buildSliceMetadataSidecar,
  computeCylinderEvaluation,
  computeDatumPlaneSlices,
  computePlaneEvaluation,
  computeSectionSliceEvaluation,
  dispatchWarningToasts,
  mergeWarningsUntracked,
  triggerCsvDownload,
  triggerJsonDownload,
  type DatumSliceMode,
  type DatumSliceRunResult,
  type SurfaceStatusWarning
} from '../SurfaceOrchestratorDeps';
import type { DatumPlane, Point3D } from '../../../surface/types';

type EvaluationCtx = {
  getPoints: () => Point3D[];
  getSelectedPointIds: () => number[];
  getEvalUseSelection: () => boolean;
  getEvalTol: () => number;
  getEvalSigmaMult: () => number;
  getEvalMaxOutliers: () => number;
  setCylErr: (v: string | null) => void;
  setCylBusy: (v: boolean) => void;
  setCylFitPointIds: (v: number[]) => void;
  setCylRes: (v: any) => void;
  setEvalErr: (v: string | null) => void;
  setEvalBusy: (v: boolean) => void;
  setEvalRes: (v: any) => void;
  getSliceAxis: () => 'x' | 'y' | 'z';
  getSliceBins: () => number;
  getSliceThickness: () => number;
  setSliceErr: (v: string | null) => void;
  setSliceBusy: (v: boolean) => void;
  setSliceRes: (v: any) => void;
  getDatumPlaneChoices: () => DatumPlane[];
  getDatumSlicePlaneIdx: () => number;
  getDatumSliceMode: () => DatumSliceMode;
  getDatumSliceSpacing: () => number;
  getDatumSliceCount: () => number;
  getDatumSliceThickness: () => number;
  getDatumSliceUseSelection: () => boolean;
  setDatumSliceErr: (v: string | null) => void;
  setDatumSliceBusy: (v: boolean) => void;
  setDatumSliceRes: (v: DatumSliceRunResult | null) => void;
  getDatumSliceRes: () => DatumSliceRunResult | null;
  setSelectedSliceId: (v: number | null) => void;
  getIncludeOptionalSliceColumns: () => boolean;
  getStatusWarnings: () => SurfaceStatusWarning[];
  setStatusWarnings: (v: SurfaceStatusWarning[]) => void;
  getEmittedWarningIds: () => Set<string>;
  toast: any;
};

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export async function computeCylinderFitUi(ctx: EvaluationCtx): Promise<void> {
  ctx.setCylErr(null);
  ctx.setCylBusy(true);
  const out = await computeCylinderEvaluation({
    points: ctx.getPoints(),
    selectedPointIds: ctx.getSelectedPointIds(),
    cylUseSelection: ctx.getEvalUseSelection(),
    params: {
      evalTol: ctx.getEvalTol(),
      evalSigmaMult: ctx.getEvalSigmaMult(),
      evalMaxOutliers: ctx.getEvalMaxOutliers()
    }
  });
  ctx.setCylFitPointIds(out.fitPointIds);
  ctx.setCylRes(out.result);
  ctx.setCylErr(out.error);
  ctx.setCylBusy(false);
}

export async function computeSurfaceEvalUi(ctx: EvaluationCtx): Promise<void> {
  ctx.setEvalErr(null);
  ctx.setEvalBusy(true);
  const out = await computePlaneEvaluation({
    points: ctx.getPoints(),
    selectedPointIds: ctx.getSelectedPointIds(),
    evalUseSelection: ctx.getEvalUseSelection(),
    params: {
      evalTol: ctx.getEvalTol(),
      evalSigmaMult: ctx.getEvalSigmaMult(),
      evalMaxOutliers: ctx.getEvalMaxOutliers()
    }
  });
  ctx.setEvalRes(out.result);
  ctx.setEvalErr(out.error);
  ctx.setEvalBusy(false);
}

export async function computeSectionSlicesUi(ctx: EvaluationCtx): Promise<void> {
  ctx.setSliceErr(null);
  ctx.setSliceBusy(true);
  const out = await computeSectionSliceEvaluation({
    points: ctx.getPoints(),
    selectedPointIds: ctx.getSelectedPointIds(),
    evalUseSelection: ctx.getEvalUseSelection(),
    sliceAxis: ctx.getSliceAxis(),
    sliceBins: ctx.getSliceBins(),
    sliceThickness: ctx.getSliceThickness()
  });
  ctx.setSliceRes(out.result);
  ctx.setSliceErr(out.error);
  ctx.setSliceBusy(false);
}

export async function computeDatumSlicesUi(ctx: EvaluationCtx): Promise<void> {
  ctx.setDatumSliceErr(null);
  ctx.setDatumSliceBusy(true);
  try {
    const choices = ctx.getDatumPlaneChoices();
    const plane = choices[clamp(ctx.getDatumSlicePlaneIdx(), 0, choices.length - 1)];
    if (!plane) throw new Error('No datum plane available for slicing.');
    ctx.setDatumSliceRes(
      computeDatumPlaneSlices({
        points: ctx.getPoints(),
        pointIds: ctx.getDatumSliceUseSelection() ? ctx.getSelectedPointIds() : [],
        plane,
        mode: ctx.getDatumSliceMode(),
        spacing: Number(ctx.getDatumSliceSpacing()),
        count: Number(ctx.getDatumSliceCount()),
        thickness: Number(ctx.getDatumSliceThickness())
      })
    );
    ctx.setSelectedSliceId(null);
  } catch (e: any) {
    ctx.setDatumSliceRes(null);
    ctx.setDatumSliceErr(e?.message ? String(e.message) : String(e));
    ctx.setSelectedSliceId(null);
  } finally {
    ctx.setDatumSliceBusy(false);
  }
}

export function exportDatumSliceCombinedUi(ctx: EvaluationCtx): void {
  const res = ctx.getDatumSliceRes();
  if (!res) return;
  const includeOptional = ctx.getIncludeOptionalSliceColumns();
  const csv = buildCombinedSliceCsv(res, includeOptional);
  const sidecar = buildSliceMetadataSidecar(res, includeOptional);
  triggerCsvDownload(csv, 'surface_slices_combined');
  triggerJsonDownload(sidecar, 'surface_slices_metadata');
}

export function emitStatusWarningsUi(ctx: EvaluationCtx, incoming: SurfaceStatusWarning[]): void {
  const out = mergeWarningsUntracked({
    getCurrent: () => ctx.getStatusWarnings(),
    incoming,
    seen: ctx.getEmittedWarningIds(),
    maxItems: 50
  });
  ctx.setStatusWarnings(out.warnings);
  dispatchWarningToasts(out.toasts, ctx.toast);
}
