import type {
  CalculationOptions,
  CalculationTraceEntry,
  LoadingAnalysis,
  SensitivityEntry,
  UncertaintyBand
} from './types';

export function resolveCalculationOptions(options: CalculationOptions): Required<CalculationOptions> {
  return {
    uncertaintyWeightTolerance: normalizeNonNegative(options.uncertaintyWeightTolerance, 2),
    uncertaintyArmTolerance: normalizeNonNegative(options.uncertaintyArmTolerance, 0.2),
    sensitivityDeltaWeight: normalizePositive(options.sensitivityDeltaWeight, 10, 0.001)
  };
}

export function computeLoadingAnalysis(
  totalWeight: number,
  totalMoment: number,
  trace: CalculationTraceEntry[],
  options: Required<CalculationOptions>
): LoadingAnalysis {
  const uncertaintyBand = computeUncertaintyBand(
    trace,
    options.uncertaintyWeightTolerance,
    options.uncertaintyArmTolerance
  );
  const sensitivity = computeSensitivity(totalWeight, totalMoment, trace, options.sensitivityDeltaWeight);

  return {
    uncertaintyBand,
    sensitivity,
    sensitivityDeltaWeight: options.sensitivityDeltaWeight
  };
}

function normalizeNonNegative(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(0, value);
}

function normalizePositive(value: number | undefined, fallback: number, min: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(min, value);
}

function computeUncertaintyBand(
  trace: CalculationTraceEntry[],
  weightTolerance: number,
  armTolerance: number
): UncertaintyBand {
  let totalWeightMin = 0;
  let totalWeightMax = 0;
  let totalMomentMin = 0;
  let totalMomentMax = 0;

  for (const entry of trace) {
    const wMin = Math.max(0, entry.weight - weightTolerance);
    const wMax = Math.max(0, entry.weight + weightTolerance);
    const aMin = entry.arm - armTolerance;
    const aMax = entry.arm + armTolerance;
    const momentCandidates = [wMin * aMin, wMin * aMax, wMax * aMin, wMax * aMax];

    totalWeightMin += wMin;
    totalWeightMax += wMax;
    totalMomentMin += Math.min(...momentCandidates);
    totalMomentMax += Math.max(...momentCandidates);
  }

  const safeWeightMin = Math.max(totalWeightMin, 0.001);
  const safeWeightMax = Math.max(totalWeightMax, safeWeightMin);
  const cgCandidates = [
    totalMomentMin / safeWeightMin,
    totalMomentMin / safeWeightMax,
    totalMomentMax / safeWeightMin,
    totalMomentMax / safeWeightMax
  ].filter(Number.isFinite);
  const cgMin = cgCandidates.length ? Math.min(...cgCandidates) : 0;
  const cgMax = cgCandidates.length ? Math.max(...cgCandidates) : 0;

  return {
    weightTolerance,
    armTolerance,
    totalWeightMin,
    totalWeightMax,
    totalMomentMin,
    totalMomentMax,
    cgMin,
    cgMax,
    cgSpan: Math.max(0, cgMax - cgMin)
  };
}

function computeSensitivity(
  totalWeight: number,
  totalMoment: number,
  trace: CalculationTraceEntry[],
  deltaWeight: number
): SensitivityEntry[] {
  const safeTotalWeight = Math.max(totalWeight, 0.001);
  const baselineCG = totalMoment / safeTotalWeight;

  return trace.map((entry) => {
    const nextWeight = safeTotalWeight + deltaWeight;
    const nextMoment = totalMoment + deltaWeight * entry.arm;
    const nextCG = nextMoment / nextWeight;
    const deltaCGForStep = nextCG - baselineCG;

    return {
      itemId: entry.id,
      itemName: entry.name,
      arm: entry.arm,
      baselineWeight: entry.weight,
      deltaWeight,
      cgPerUnitWeight: deltaCGForStep / deltaWeight,
      deltaCGForStep
    };
  });
}
