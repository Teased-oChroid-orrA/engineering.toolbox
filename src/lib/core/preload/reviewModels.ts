import { buildPreloadComparePacks } from './solve-preload';
import type {
  FastenedJointPreloadInput,
  PreloadInverseTargetResult,
  PreloadCompareMetricSnapshot,
  PreloadComparePack
} from './types';
import type { FastenerGroupPatternResult } from './group';

const COMPARE_PACK_CACHE_LIMIT = 8;
const comparePackCache = new Map<string, PreloadComparePack[]>();

export type ComparePackMetricRow = {
  label: string;
  value: number | null;
  delta: number | null;
  digits: number;
  note: string;
  favorableDirection: 'up' | 'down' | 'neutral';
};

export type LoadTransferStageView = {
  step: number;
  title: string;
  removedLabel: string;
  activeFastenerCount: number;
  activeFastenerIndices: number[];
  criticalFastenerIndex: number;
  criticalLabel: string;
  criticalEquivalentDemand: number;
  redistributionFactor: number;
  demandRisePercent: number;
  criticalLoadShare: number;
  criticalAxialLoad: number;
  criticalShearMagnitude: number;
  note: string;
  fasteners: FastenerGroupPatternResult['fasteners'];
};

export type InverseSolveCardViewModel = {
  title: string;
  value: string;
  note: string;
  severity: 'ok' | 'warn' | 'fail' | 'unknown';
  scenario?: string;
};

export const PRELOAD_COMPARE_PACK_METRICS: Record<
  Exclude<PreloadComparePack['id'], 'installed_preload'>,
  Array<{
    key: keyof PreloadCompareMetricSnapshot;
    label: string;
    digits: number;
    note: string;
    favorableDirection: 'up' | 'down' | 'neutral';
  }>
> = {
  thermal: [
    {
      key: 'thermalPreloadShift',
      label: 'Thermal preload shift',
      digits: 4,
      note: 'Signed thermal mismatch contribution to retained preload.',
      favorableDirection: 'neutral'
    },
    {
      key: 'preloadEffective',
      label: 'Effective preload',
      digits: 2,
      note: 'Clamp retained after explicit thermal and mechanical terms.',
      favorableDirection: 'up'
    },
    {
      key: 'separationUtilization',
      label: 'Separation util.',
      digits: 3,
      note: 'Lower is better when temperature drift hurts clamp retention.',
      favorableDirection: 'down'
    },
    {
      key: 'fatigueUtilization',
      label: 'Fatigue util.',
      digits: 3,
      note: 'Shows the thermal pack impact on the fatigue envelope.',
      favorableDirection: 'down'
    }
  ],
  friction: [
    {
      key: 'fayingSurfaceSlipCoeff',
      label: 'Slip coeff.',
      digits: 3,
      note: 'Effective interface friction coefficient used by slip resistance.',
      favorableDirection: 'up'
    },
    {
      key: 'preloadInstalled',
      label: 'Installed preload',
      digits: 2,
      note: 'Exact-torque cases shift installed clamp when tightening friction changes.',
      favorableDirection: 'up'
    },
    {
      key: 'slipUtilization',
      label: 'Slip util.',
      digits: 3,
      note: 'Direct measure of interface reserve under the friction pack.',
      favorableDirection: 'down'
    },
    {
      key: 'separationUtilization',
      label: 'Separation util.',
      digits: 3,
      note: 'Tracks the secondary clamp-retention effect of friction changes.',
      favorableDirection: 'down'
    }
  ],
  preload_loss: [
    {
      key: 'mechanicalLossTotal',
      label: 'Mechanical loss',
      digits: 4,
      note: 'Aggregate seating, embedment, creep, and relaxation loss.',
      favorableDirection: 'down'
    },
    {
      key: 'netPreloadShift',
      label: 'Net preload shift',
      digits: 4,
      note: 'Combined preload shift after thermal and mechanical terms.',
      favorableDirection: 'up'
    },
    {
      key: 'preloadEffective',
      label: 'Effective preload',
      digits: 2,
      note: 'Retained clamp after the full loss stack is applied.',
      favorableDirection: 'up'
    },
    {
      key: 'separationUtilization',
      label: 'Separation util.',
      digits: 3,
      note: 'Lower is better when explicit loss terms increase.',
      favorableDirection: 'down'
    }
  ]
};

function comparePackSignature(input: FastenedJointPreloadInput): string {
  return JSON.stringify({
    nominalDiameter: input.nominalDiameter,
    tensileStressArea: input.tensileStressArea,
    boltModulus: input.boltModulus,
    installationScatterPercent: input.installationScatterPercent,
    installationUncertainty: input.installationUncertainty,
    boltThermalExpansionCoeff: input.boltThermalExpansionCoeff,
    memberSegments: input.memberSegments,
    boltSegments: input.boltSegments,
    installation: input.installation,
    serviceCase: input.serviceCase,
    fayingSurfaceSlipCoeff: input.fayingSurfaceSlipCoeff,
    frictionInterfaceCount: input.frictionInterfaceCount,
    washerStack: input.washerStack,
    bearingGeometry: input.bearingGeometry,
    boltProofStrength: input.boltProofStrength,
    boltUltimateStrength: input.boltUltimateStrength,
    boltEnduranceLimit: input.boltEnduranceLimit,
    memberBearingAllowable: input.memberBearingAllowable,
    underHeadBearingArea: input.underHeadBearingArea,
    engagedThreadLength: input.engagedThreadLength,
    internalThreadShearDiameter: input.internalThreadShearDiameter,
    externalThreadShearDiameter: input.externalThreadShearDiameter,
    internalThreadStripShearAllowable: input.internalThreadStripShearAllowable,
    externalThreadStripShearAllowable: input.externalThreadStripShearAllowable
  });
}

function touchComparePackCache(key: string, value: PreloadComparePack[]) {
  if (comparePackCache.has(key)) comparePackCache.delete(key);
  comparePackCache.set(key, value);
  if (comparePackCache.size <= COMPARE_PACK_CACHE_LIMIT) return;
  const oldestKey = comparePackCache.keys().next().value as string | undefined;
  if (oldestKey) comparePackCache.delete(oldestKey);
}

export function getMemoizedPreloadComparePacks(input: FastenedJointPreloadInput): PreloadComparePack[] {
  const key = comparePackSignature(input);
  const cached = comparePackCache.get(key);
  if (cached) {
    touchComparePackCache(key, cached);
    return cached;
  }
  const packs = buildPreloadComparePacks(input);
  touchComparePackCache(key, packs);
  return packs;
}

export function comparePackBaselineCase(pack: PreloadComparePack) {
  return pack.cases.find((entry) => entry.id === pack.baselineCaseId) ?? pack.cases[0] ?? null;
}

export function comparePackMetricRows(pack: PreloadComparePack, packCaseId: string) {
  if (pack.id === 'installed_preload') return [] as ComparePackMetricRow[];
  const baseline = comparePackBaselineCase(pack);
  const current = pack.cases.find((entry) => entry.id === packCaseId) ?? null;
  if (!baseline || !current) return [] as ComparePackMetricRow[];
  return PRELOAD_COMPARE_PACK_METRICS[pack.id].map((config) => {
    const currentValue = current.metrics[config.key];
    const baselineValue = baseline.metrics[config.key];
    const numericCurrent = typeof currentValue === 'number' ? currentValue : null;
    const numericBaseline = typeof baselineValue === 'number' ? baselineValue : null;
    return {
      label: config.label,
      value: numericCurrent,
      delta: numericCurrent !== null && numericBaseline !== null ? numericCurrent - numericBaseline : null,
      digits: config.digits,
      note: config.note,
      favorableDirection: config.favorableDirection
    };
  });
}

export function comparePackDeltaTone(row: ComparePackMetricRow) {
  if (row.delta == null || Math.abs(row.delta) < 1e-9 || row.favorableDirection === 'neutral') return 'text-white/60';
  if (row.favorableDirection === 'up') return row.delta > 0 ? 'text-emerald-300' : 'text-amber-300';
  return row.delta < 0 ? 'text-emerald-300' : 'text-amber-300';
}

export function buildLoadTransferStages(result: FastenerGroupPatternResult): LoadTransferStageView[] {
  const initialCritical =
    result.fasteners.find((fastener) => fastener.index === result.criticalFastenerIndex) ?? null;
  return [
    {
      step: 0,
      title: 'Stage 0',
      removedLabel: 'None',
      activeFastenerCount: result.activeFastenerCount,
      activeFastenerIndices: result.fasteners.map((fastener) => fastener.index),
      criticalFastenerIndex: result.criticalFastenerIndex,
      criticalLabel: `F${result.criticalFastenerIndex + 1}`,
      criticalEquivalentDemand: result.criticalEquivalentDemand,
      redistributionFactor: result.redistributionFactor,
      demandRisePercent: 0,
      criticalLoadShare: initialCritical?.loadShare ?? 0,
      criticalAxialLoad: initialCritical?.axialLoad ?? 0,
      criticalShearMagnitude: initialCritical ? Math.hypot(initialCritical.totalShearX, initialCritical.totalShearY) : 0,
      note: 'All fasteners active before staged removals.',
      fasteners: result.fasteners
    },
    ...result.progression.map((entry) => ({
      step: entry.step,
      title: `Stage ${entry.step}`,
      removedLabel: entry.removedFastenerIndices.map((index) => `F${index + 1}`).join(', '),
      activeFastenerCount: entry.activeFastenerCount,
      activeFastenerIndices: entry.activeFastenerIndices,
      criticalFastenerIndex: entry.criticalFastenerIndex,
      criticalLabel: `F${entry.criticalFastenerIndex + 1}`,
      criticalEquivalentDemand: entry.criticalEquivalentDemand,
      redistributionFactor: entry.redistributionFactor,
      demandRisePercent: entry.demandRisePercentFromInitial,
      criticalLoadShare: entry.criticalLoadShare,
      criticalAxialLoad: entry.criticalAxialLoad,
      criticalShearMagnitude: entry.criticalShearMagnitude,
      note: entry.note,
      fasteners: entry.fasteners
    }))
  ];
}

export function mapInverseTargetCards(
  inverseTargets: PreloadInverseTargetResult[],
  formatNumber: (value: number | null | undefined, digits?: number) => string,
  formatScenario: (value: string | null | undefined) => string
): InverseSolveCardViewModel[] {
  return inverseTargets.map((entry) => ({
    title: entry.label,
    value: entry.value !== null ? formatNumber(entry.value, entry.unit === 'lbf' ? 2 : 4) : 'No feasible solve',
    note: entry.note,
    severity:
      entry.severity === 'pass'
        ? 'ok'
        : entry.severity === 'attention'
          ? 'warn'
          : entry.severity === 'fail'
            ? 'fail'
            : 'unknown',
    scenario: entry.governingScenario ? formatScenario(entry.governingScenario) : undefined
  }));
}
