import type { FastenedJointPreloadInput, ServiceEvaluationResult, StiffnessResult } from './types';

function sumMemberThermalExpansion(memberSegments: FastenedJointPreloadInput['memberSegments']): number {
  return memberSegments.reduce(
    (sum, segment) => sum + (Number(segment.thermalExpansionCoeff ?? 0) * segment.length),
    0
  );
}

function washerThermalExpansion(input: FastenedJointPreloadInput): number {
  const washer = input.washerStack;
  if (!washer?.enabled) return 0;
  return (
    Number(washer.thermalExpansionCoeff ?? 0) *
    Math.max(0, Number(washer.count)) *
    Math.max(0, Number(washer.thicknessPerWasher))
  );
}

function sumBoltLength(boltSegments: FastenedJointPreloadInput['boltSegments']): number {
  return boltSegments.reduce((sum, segment) => sum + segment.length, 0);
}

export function evaluateServicePreloadRetention(
  input: FastenedJointPreloadInput,
  preloadInstalled: number,
  stiffness: StiffnessResult
): ServiceEvaluationResult | null {
  const service = input.serviceCase;
  if (!service) return null;

  const axial = Math.max(0, Number(service.externalAxialLoad ?? 0));
  const transverse = Math.max(0, Number(service.externalTransverseLoad ?? 0));
  const embedmentSettlement = Math.max(0, Number(service.embedmentSettlement ?? 0));
  const coatingCrushLoss = Math.max(0, Number(service.coatingCrushLoss ?? 0));
  const washerSeatingLoss = Math.max(0, Number(service.washerSeatingLoss ?? 0));
  const relaxationLossPercent = Math.max(0, Number(service.relaxationLossPercent ?? 0)) / 100;
  const creepLossPercent = Math.max(0, Number(service.creepLossPercent ?? 0)) / 100;
  const deltaTemperature = Number(service.temperatureChange ?? 0);

  const combinedCompliance = stiffness.bolt.compliance + stiffness.members.compliance;
  const embedmentLoss = embedmentSettlement > 0 ? embedmentSettlement / combinedCompliance : 0;

  const boltThermal = Number(input.boltThermalExpansionCoeff ?? 0);
  const boltLength = sumBoltLength(input.boltSegments);
  const memberThermalSum = sumMemberThermalExpansion(input.memberSegments) + washerThermalExpansion(input);
  const freeThermalMismatch = deltaTemperature * (memberThermalSum - boltThermal * boltLength);
  const thermalPreloadShift = freeThermalMismatch / combinedCompliance;
  const relaxationLoss = preloadInstalled * relaxationLossPercent;
  const creepLoss = preloadInstalled * creepLossPercent;
  const mechanicalLossTotal =
    embedmentLoss + coatingCrushLoss + washerSeatingLoss + relaxationLoss + creepLoss;
  const netPreloadShift = thermalPreloadShift - mechanicalLossTotal;

  const preloadEffective = preloadInstalled + netPreloadShift;

  const boltLoadIncrease = stiffness.jointConstant * axial;
  const clampForceLoss = stiffness.memberLoadFraction * axial;
  const boltLoadService = preloadEffective + boltLoadIncrease;
  const clampForceService = preloadEffective - clampForceLoss;
  const separationLoad = preloadEffective / Math.max(stiffness.memberLoadFraction, 1e-12);
  const separationMargin = separationLoad - axial;
  const hasSeparated = clampForceService <= 0;
  const separationState =
    clampForceService <= 0
      ? 'post_separation'
      : clampForceService <= Math.max(preloadEffective * 0.05, 1e-6)
        ? 'incipient'
        : 'clamped';

  const boltLoadPostSeparation = hasSeparated
    ? preloadEffective + stiffness.jointConstant * separationLoad + (axial - separationLoad)
    : boltLoadService;

  const interfaceCount = Math.max(1, Number(input.frictionInterfaceCount ?? 1));
  const slipCoeff = input.fayingSurfaceSlipCoeff;
  const slipResistance =
    Number.isFinite(Number(slipCoeff)) && Number(slipCoeff) > 0
      ? Number(slipCoeff) * interfaceCount * Math.max(0, clampForceService)
      : null;
  const slipMargin = slipResistance === null ? null : slipResistance - transverse;
  const slipRatio = slipResistance === null || slipResistance <= 0 ? null : transverse / slipResistance;

  return {
    preloadInstalled,
    preloadEffective,
    preloadEffectiveMin: preloadEffective,
    preloadEffectiveMax: preloadEffective,
    embedmentLoss,
    thermalPreloadShift,
    preloadLossBreakdown: {
      embedmentLoss,
      coatingCrushLoss,
      washerSeatingLoss,
      relaxationLoss,
      creepLoss,
      thermalPreloadShift,
      mechanicalLossTotal,
      netPreloadShift
    },
    externalAxialLoad: axial,
    externalTransverseLoad: transverse,
    boltLoadIncrease,
    clampForceLoss,
    boltLoadService,
    clampForceService,
    separationLoad,
    separationMargin,
    hasSeparated,
    separationState,
    preSeparationBoltLoadSlope: stiffness.jointConstant,
    postSeparationBoltLoadSlope: 1,
    boltLoadPostSeparation,
    slipResistance,
    slipMargin,
    slipRatio
  };
}
