import type { DatumSliceRunResult } from './SurfaceSlicingExportController';

export type SliceRecommendation = {
  id: string;
  label: string;
  confidence: number;
  rationale: string;
};

export type SliceSyncModel = {
  selectedSliceId: number | null;
  sparkline: { x: number; y: number; sliceId: number; n: number; maxResidual: number }[];
  selected: { sliceId: number; station: number; n: number; minResidual: number | null; maxResidual: number | null } | null;
  recommendations: SliceRecommendation[];
  summary: {
    slices: number;
    emptySlices: number;
    sparseSlices: number;
    maxResidual: number;
  };
};

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export function buildSliceSyncModel(result: DatumSliceRunResult | null, selectedSliceId: number | null): SliceSyncModel {
  if (!result || result.stations.length === 0) {
    return {
      selectedSliceId: null,
      sparkline: [],
      selected: null,
      recommendations: [],
      summary: { slices: 0, emptySlices: 0, sparseSlices: 0, maxResidual: 0 }
    };
  }

  const maxResidual = Math.max(1e-12, ...result.stations.map((s) => s.maxResidual ?? 0));
  const emptySlices = result.stations.filter((s) => s.n === 0).length;
  const sparseSlices = result.stations.filter((s) => s.n > 0 && s.n < 3).length;
  const effectiveSelected =
    selectedSliceId != null && selectedSliceId >= 0 && selectedSliceId < result.stations.length
      ? selectedSliceId
      : result.stations.reduce((best, cur, i) => ((cur.maxResidual ?? 0) > (result.stations[best].maxResidual ?? 0) ? i : best), 0);

  const sparkline = result.stations.map((s, i) => {
    const x = (i / Math.max(1, result.stations.length - 1)) * 236 + 2;
    const y = 62 - ((s.maxResidual ?? 0) / maxResidual) * 56;
    return { x, y, sliceId: s.sliceId, n: s.n, maxResidual: s.maxResidual ?? 0 };
  });

  const selected = result.stations[effectiveSelected] ?? null;

  const emptyRatio = emptySlices / Math.max(1, result.stations.length);
  const sparseRatio = sparseSlices / Math.max(1, result.stations.length);

  const recommendations: SliceRecommendation[] = [];
  if (emptyRatio > 0.2) {
    recommendations.push({
      id: 'increase_thickness',
      label: 'Increase slicing thickness',
      confidence: clamp(0.55 + emptyRatio * 0.4, 0.55, 0.95),
      rationale: 'Many slices are empty; wider capture bands will stabilize continuity.'
    });
  }
  if (sparseRatio > 0.15) {
    recommendations.push({
      id: 'reduce_density',
      label: 'Use fewer stations or denser cloud',
      confidence: clamp(0.5 + sparseRatio * 0.45, 0.5, 0.92),
      rationale: 'Sparse slices indicate under-sampled sections for reliable residual metrics.'
    });
  }
  if ((selected?.maxResidual ?? 0) > Math.max(1e-12, result.thicknessUsed)) {
    recommendations.push({
      id: 'revisit_plane',
      label: 'Review datum plane orientation',
      confidence: 0.66,
      rationale: 'Peak residual exceeds slice thickness; plane orientation may be misaligned with feature flow.'
    });
  }
  if (recommendations.length === 0) {
    recommendations.push({
      id: 'settings_stable',
      label: 'Settings look stable',
      confidence: 0.82,
      rationale: 'Slice occupancy and residual distribution indicate a healthy slicing setup.'
    });
  }

  return {
    selectedSliceId: effectiveSelected,
    sparkline,
    selected,
    recommendations,
    summary: {
      slices: result.stations.length,
      emptySlices,
      sparseSlices,
      maxResidual
    }
  };
}
