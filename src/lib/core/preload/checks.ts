import type {
  FastenedJointPreloadInput,
  FatigueCheck,
  ServiceEvaluationResult,
  StructuralChecksResult,
  ThreadStripCheck,
  UtilizationCheck
} from './types';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function threadMechanicsFactors(input: FastenedJointPreloadInput) {
  const nominalDiameter = Number(input.nominalDiameter);
  const engagedLength = Number(input.engagedThreadLength);
  if (!Number.isFinite(nominalDiameter) || nominalDiameter <= 0 || !Number.isFinite(engagedLength) || engagedLength <= 0) {
    return {
      engagementEffectiveness: null,
      loadDistributionFactor: null,
      effectiveEngagedLength: null
    };
  }
  const engagementRatio = engagedLength / nominalDiameter;
  const engagementEffectiveness = clamp(engagementRatio, 0, 1);
  const loadDistributionFactor = clamp(0.6 + 0.4 * Math.min(engagementRatio, 1), 0.6, 1);
  return {
    engagementEffectiveness,
    loadDistributionFactor,
    effectiveEngagedLength: engagedLength * engagementEffectiveness * loadDistributionFactor
  };
}

function buildUnavailable(note: string): UtilizationCheck {
  return {
    status: 'unavailable',
    demand: null,
    capacity: null,
    utilization: null,
    margin: null,
    note
  };
}

function buildCheck(demand: number, capacity: number, note?: string): UtilizationCheck {
  if (!Number.isFinite(demand) || demand < 0 || !Number.isFinite(capacity) || capacity <= 0) {
    return buildUnavailable(note ?? 'Invalid demand/capacity input.');
  }
  const utilization = demand / capacity;
  return {
    status: utilization <= 1 ? 'ok' : 'warning',
    demand,
    capacity,
    utilization,
    margin: capacity - demand,
    note
  };
}

function buildThreadStripCheck(
  preloadDemand: number,
  allowable: number | undefined,
  shearDiameter: number | undefined,
  engagedLength: number | undefined,
  label: string,
  engagementEffectiveness: number | null,
  loadDistributionFactor: number | null
): ThreadStripCheck {
  if (
    !Number.isFinite(Number(allowable)) ||
    Number(allowable) <= 0 ||
    !Number.isFinite(Number(shearDiameter)) ||
    Number(shearDiameter) <= 0 ||
    !Number.isFinite(Number(engagedLength)) ||
    Number(engagedLength) <= 0
  ) {
    return {
      ...buildUnavailable(`${label} thread-strip inputs are incomplete.`),
      shearArea: null,
      effectiveEngagedLength: null,
      engagementEffectiveness,
      loadDistributionFactor
    };
  }

  const effectiveEngagedLength =
    Number(engagedLength) *
    Number(engagementEffectiveness ?? 1) *
    Number(loadDistributionFactor ?? 1);
  const shearArea = Math.PI * Number(shearDiameter) * effectiveEngagedLength;
  const capacity = Number(allowable) * shearArea;
  const base = buildCheck(
    preloadDemand,
    capacity,
    `${label} thread strip uses explicit cylindrical shear area scaled by engagement effectiveness and load distribution.`
  );
  return {
    ...base,
    shearArea,
    effectiveEngagedLength,
    engagementEffectiveness,
    loadDistributionFactor
  };
}

export function evaluateStructuralChecks(
  input: FastenedJointPreloadInput,
  installationPreload: number,
  service: ServiceEvaluationResult | null
): StructuralChecksResult {
  const factors = threadMechanicsFactors(input);
  const governingBoltLoad = Math.max(
    installationPreload,
    service?.boltLoadService ?? 0,
    service?.boltLoadPostSeparation ?? 0
  );

  const separation =
    service === null
      ? buildUnavailable('serviceCase is required for separation-state evaluation.')
      : buildCheck(
          service.externalAxialLoad,
          service.separationLoad,
          'Separation check compares applied separating load to separation load.'
        );

  const slip =
    service === null || service.slipResistance === null
      ? buildUnavailable('serviceCase and friction inputs are required for slip-state evaluation.')
      : buildCheck(
          service.externalTransverseLoad,
          service.slipResistance,
          'Slip check compares transverse load to available friction resistance.'
        );

  const selfLooseningRisk =
    service === null || service.slipRatio === null
      ? {
          level: 'unknown' as const,
          slipRatio: null,
          note: 'Self-loosening risk requires explicit transverse load and slip resistance.'
        }
      : service.hasSeparated || service.slipRatio >= 1
        ? {
            level: 'high' as const,
            slipRatio: service.slipRatio,
            note: 'Gross slip or separation is predicted; transverse self-loosening risk is high.'
          }
        : service.slipRatio >= 0.7
          ? {
              level: 'moderate' as const,
              slipRatio: service.slipRatio,
              note: 'Slip reserve is thin; transverse self-loosening risk should be treated as active.'
            }
          : {
              level: 'low' as const,
              slipRatio: service.slipRatio,
              note: 'Slip reserve remains below the transverse self-loosening screening threshold.'
            };

  const proof =
    Number.isFinite(Number(input.boltProofStrength)) && Number(input.boltProofStrength) > 0
      ? buildCheck(
          governingBoltLoad,
          Number(input.boltProofStrength) * input.tensileStressArea,
          'Bolt proof check uses explicit tensile-stress-area capacity.'
        )
      : buildUnavailable('boltProofStrength is required for proof check.');

  const underHeadBearing =
    Number.isFinite(Number(input.memberBearingAllowable)) &&
    Number(input.memberBearingAllowable) > 0 &&
    Number.isFinite(Number(input.underHeadBearingArea)) &&
    Number(input.underHeadBearingArea) > 0
      ? buildCheck(
          governingBoltLoad,
          Number(input.memberBearingAllowable) * Number(input.underHeadBearingArea),
          `Under-head bearing check uses explicit under-head/nut bearing area (${input.bearingGeometry?.source ?? 'derived'} source).`
        )
      : buildUnavailable('memberBearingAllowable and underHeadBearingArea are required for bearing check.');

  const threadBearing =
    Number.isFinite(Number(input.memberBearingAllowable)) &&
    Number(input.memberBearingAllowable) > 0 &&
    Number.isFinite(Number(input.engagedThreadLength)) &&
    Number(input.engagedThreadLength) > 0 &&
    Number.isFinite(Number(input.internalThreadShearDiameter)) &&
    Number(input.internalThreadShearDiameter) > 0
      ? buildCheck(
          governingBoltLoad,
          Number(input.memberBearingAllowable) *
            Math.PI *
            Number(input.internalThreadShearDiameter) *
            Number(input.engagedThreadLength),
          'Thread-bearing check uses explicit engaged cylindrical bearing band.'
        )
      : buildUnavailable(
          'memberBearingAllowable, internalThreadShearDiameter, and engagedThreadLength are required for thread-bearing check.'
        );

  const localCrushing =
    Number.isFinite(Number(input.memberBearingAllowable)) &&
    Number(input.memberBearingAllowable) > 0 &&
    Number.isFinite(Number(input.nominalDiameter)) &&
    Number(input.nominalDiameter) > 0 &&
    Number.isFinite(Number(input.engagedThreadLength)) &&
    Number(input.engagedThreadLength) > 0
      ? buildCheck(
          governingBoltLoad,
          Number(input.memberBearingAllowable) * Number(input.nominalDiameter) * Number(input.engagedThreadLength),
          'Local crushing check uses projected d × L bearing footprint.'
        )
      : buildUnavailable(
          'memberBearingAllowable, nominalDiameter, and engagedThreadLength are required for local crushing check.'
        );

  const bearingCandidates: Array<['under_head' | 'thread_bearing' | 'local_crushing', UtilizationCheck]> = [
    ['under_head', underHeadBearing],
    ['thread_bearing', threadBearing],
    ['local_crushing', localCrushing]
  ];
  let governingBearing: 'under_head' | 'thread_bearing' | 'local_crushing' | null = null;
  let governingBearingUtil = -Infinity;
  for (const [key, check] of bearingCandidates) {
    const utilization = check.utilization ?? -Infinity;
    if (utilization > governingBearingUtil) {
      governingBearingUtil = utilization;
      governingBearing = utilization < 0 ? governingBearing : key;
    }
  }

  const threadStripInternal = buildThreadStripCheck(
    governingBoltLoad,
    input.internalThreadStripShearAllowable,
    input.internalThreadShearDiameter,
    input.engagedThreadLength,
    'Internal',
    factors.engagementEffectiveness,
    factors.loadDistributionFactor
  );

  const threadStripExternal = buildThreadStripCheck(
    governingBoltLoad,
    input.externalThreadStripShearAllowable,
    input.externalThreadShearDiameter,
    input.engagedThreadLength,
    'External',
    factors.engagementEffectiveness,
    factors.loadDistributionFactor
  );

  const internalUtil = threadStripInternal.utilization ?? -Infinity;
  const externalUtil = threadStripExternal.utilization ?? -Infinity;
  const governing =
    internalUtil < 0 && externalUtil < 0
      ? null
      : internalUtil >= externalUtil
        ? 'internal'
        : 'external';

  let fatigue: FatigueCheck;
  if (
    Number.isFinite(Number(input.boltEnduranceLimit)) &&
    Number(input.boltEnduranceLimit) > 0 &&
    Number.isFinite(Number(input.boltUltimateStrength)) &&
    Number(input.boltUltimateStrength) > 0
  ) {
    const meanAxial = Math.max(
      0,
      Number(input.serviceCase?.meanAxialLoad ?? input.serviceCase?.externalAxialLoad ?? 0)
    );
    const alternatingAxial = Math.max(0, Number(input.serviceCase?.alternatingAxialLoad ?? 0));
    const meanStress = governingBoltLoad / input.tensileStressArea + meanAxial / input.tensileStressArea;
    const alternatingStress = alternatingAxial / input.tensileStressArea;
    const endurance = Number(input.boltEnduranceLimit);
    const proofStrength = Number(input.boltProofStrength ?? 0);
    const ultimate = Number(input.boltUltimateStrength);
    const goodmanEquivalent =
      meanStress / ultimate + alternatingStress / endurance;
    const soderbergEquivalent =
      proofStrength > 0 ? meanStress / proofStrength + alternatingStress / endurance : null;
    const gerberEquivalent =
      alternatingStress / (endurance * Math.max(1e-12, 1 - (meanStress / ultimate) ** 2));
    const base = buildCheck(
      Math.max(
        goodmanEquivalent,
        soderbergEquivalent ?? -Infinity,
        gerberEquivalent
      ),
      1,
      'Fatigue check exposes Goodman, Soderberg, and Gerber relations from explicit mean/alternating loads.'
    );
    fatigue = {
      ...base,
      meanStress,
      alternatingStress,
      goodmanEquivalent,
      soderbergEquivalent,
      gerberEquivalent
    };
  } else {
    fatigue = {
      ...buildUnavailable('boltEnduranceLimit and boltUltimateStrength are required for fatigue check.'),
      meanStress: null,
      alternatingStress: null,
      goodmanEquivalent: null,
      soderbergEquivalent: null,
      gerberEquivalent: null
    };
  }

  return {
    serviceLimits: {
      separation,
      slip,
      selfLooseningRisk
    },
    envelopes: {
      separationUtilization: {
        min: separation.utilization,
        nominal: separation.utilization,
        max: separation.utilization,
        note: 'Nominal-only until scatter envelopes are merged at the solver level.'
      },
      slipUtilization: {
        min: slip.utilization,
        nominal: slip.utilization,
        max: slip.utilization,
        note: 'Nominal-only until scatter envelopes are merged at the solver level.'
      },
      proofUtilization: {
        min: proof.utilization,
        nominal: proof.utilization,
        max: proof.utilization,
        note: 'Nominal-only until scatter envelopes are merged at the solver level.'
      },
      bearingUtilization: {
        min: governingBearing
          ? (governingBearing === 'under_head'
              ? underHeadBearing
              : governingBearing === 'thread_bearing'
                ? threadBearing
                : localCrushing
            ).utilization
          : null,
        nominal: governingBearing
          ? (governingBearing === 'under_head'
              ? underHeadBearing
              : governingBearing === 'thread_bearing'
                ? threadBearing
                : localCrushing
            ).utilization
          : null,
        max: governingBearing
          ? (governingBearing === 'under_head'
              ? underHeadBearing
              : governingBearing === 'thread_bearing'
                ? threadBearing
                : localCrushing
            ).utilization
          : null,
        note: 'Nominal-only until scatter envelopes are merged at the solver level.'
      },
      fatigueUtilization: {
        min: fatigue.utilization,
        nominal: fatigue.utilization,
        max: fatigue.utilization,
        note: 'Nominal-only until scatter envelopes are merged at the solver level.'
      }
    },
    proof,
    bearing: {
      underHead: underHeadBearing,
      threadBearing,
      localCrushing,
      governing: governingBearing
    },
    threadStrip: {
      internal: threadStripInternal,
      external: threadStripExternal,
      governing
    },
    threadMechanics: {
      engagedLengthEffectiveness: factors.engagementEffectiveness,
      loadDistributionFactor: factors.loadDistributionFactor,
      effectiveEngagedLength: factors.effectiveEngagedLength,
      governingStripLocation: governing,
      bearingGeometrySource: input.bearingGeometry?.source ?? 'derived',
      headBearingDiameter: input.bearingGeometry?.headBearingDiameter ?? null,
      nutOrCollarBearingDiameter: input.bearingGeometry?.nutOrCollarBearingDiameter ?? null,
      washerCompatibilityNote:
        input.bearingGeometry?.washerCompatibilityNote ?? 'Washer compatibility not explicitly declared.',
      stripCapacityNote:
        'Thread-strip capacity uses explicit cylindrical shear area scaled by engaged-length effectiveness and a first-thread load-distribution factor.'
    },
    fatigue
  };
}
