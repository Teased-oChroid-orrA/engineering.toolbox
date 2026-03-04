import type {
  BoltSegmentInput,
  FastenedJointPreloadInput,
  MemberSegmentInput,
  MemberSegmentStiffnessResult,
  SegmentStiffnessResult,
  StiffnessResult
} from './types';

const PI = Math.PI;
const EPS = 1e-12;

function assertPositive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a finite positive number.`);
  }
}

function solveBoltSegment(segment: BoltSegmentInput): SegmentStiffnessResult {
  assertPositive(`${segment.id}.length`, segment.length);
  assertPositive(`${segment.id}.area`, segment.area);
  assertPositive(`${segment.id}.modulus`, segment.modulus);
  const compliance = segment.length / (segment.modulus * segment.area);
  return {
    id: segment.id,
    stiffness: 1 / compliance,
    compliance
  };
}

function areaFromDiameter(outerDiameter: number, innerDiameter = 0): number {
  assertPositive('outerDiameter', outerDiameter);
  if (!Number.isFinite(innerDiameter) || innerDiameter < 0) {
    throw new Error('innerDiameter must be a finite non-negative number.');
  }
  if (innerDiameter >= outerDiameter) {
    throw new Error('innerDiameter must be smaller than outerDiameter.');
  }
  return (PI / 4) * (outerDiameter * outerDiameter - innerDiameter * innerDiameter);
}

function solveCylindricalAnnulus(segment: Extract<MemberSegmentInput, { compressionModel: 'cylindrical_annulus' }>): MemberSegmentStiffnessResult {
  assertPositive(`${segment.id}.length`, segment.length);
  assertPositive(`${segment.id}.modulus`, segment.modulus);
  const area = areaFromDiameter(segment.outerDiameter, segment.innerDiameter);
  const compliance = segment.length / (segment.modulus * area);
  const integral = segment.length / area;
  return {
    id: segment.id,
    compressionModel: segment.compressionModel,
    stiffness: 1 / compliance,
    compliance,
    exactAreaIntegral: integral,
    averageAreaEquivalent: area
  };
}

function solveConicalFrustumAnnulus(segment: Extract<MemberSegmentInput, { compressionModel: 'conical_frustum_annulus' }>): MemberSegmentStiffnessResult {
  assertPositive(`${segment.id}.length`, segment.length);
  assertPositive(`${segment.id}.modulus`, segment.modulus);
  assertPositive(`${segment.id}.outerDiameterStart`, segment.outerDiameterStart);
  assertPositive(`${segment.id}.outerDiameterEnd`, segment.outerDiameterEnd);
  if (!Number.isFinite(segment.innerDiameter) || segment.innerDiameter < 0) {
    throw new Error(`${segment.id}.innerDiameter must be a finite non-negative number.`);
  }
  if (segment.innerDiameter >= segment.outerDiameterStart || segment.innerDiameter >= segment.outerDiameterEnd) {
    throw new Error(`${segment.id}.innerDiameter must be smaller than both outer diameters.`);
  }

  const d0 = segment.outerDiameterStart;
  const d1 = segment.outerDiameterEnd;
  const di = segment.innerDiameter;

  const slope = (d1 - d0) / segment.length;
  let exactAreaIntegral: number;

  if (Math.abs(slope) <= EPS) {
    const area = areaFromDiameter(d0, di);
    exactAreaIntegral = segment.length / area;
  } else {
    const denom = 2 * slope * di;
    const startRatio = (d0 - di) / (d0 + di);
    const endRatio = (d1 - di) / (d1 + di);
    if (startRatio <= 0 || endRatio <= 0) {
      throw new Error(`${segment.id} produced an invalid conical-frustum annulus ratio.`);
    }
    exactAreaIntegral = (2 / (PI * slope * di)) * Math.log(endRatio / startRatio);
  }

  const compliance = exactAreaIntegral / segment.modulus;
  const averageAreaEquivalent = segment.length / exactAreaIntegral;

  return {
    id: segment.id,
    compressionModel: segment.compressionModel,
    stiffness: 1 / compliance,
    compliance,
    exactAreaIntegral,
    averageAreaEquivalent
  };
}

function solveExplicitArea(segment: Extract<MemberSegmentInput, { compressionModel: 'explicit_area' }>): MemberSegmentStiffnessResult {
  assertPositive(`${segment.id}.length`, segment.length);
  assertPositive(`${segment.id}.modulus`, segment.modulus);
  assertPositive(`${segment.id}.effectiveArea`, segment.effectiveArea);
  const compliance = segment.length / (segment.modulus * segment.effectiveArea);
  const integral = segment.length / segment.effectiveArea;
  return {
    id: segment.id,
    compressionModel: segment.compressionModel,
    stiffness: 1 / compliance,
    compliance,
    exactAreaIntegral: integral,
    averageAreaEquivalent: segment.effectiveArea
  };
}

function buildWasherSegments(
  input: Pick<FastenedJointPreloadInput, 'washerStack'>
): MemberSegmentInput[] {
  const washer = input.washerStack;
  if (!washer?.enabled) return [];
  const underHeadCount = Math.max(0, Math.round(Number(washer.underHeadCount ?? 0)));
  const underNutCount = Math.max(0, Math.round(Number(washer.underNutCount ?? 0)));
  const totalCount = Math.max(
    0,
    underHeadCount || underNutCount ? underHeadCount + underNutCount : Math.round(Number(washer.count))
  );
  assertPositive('washerStack.count', totalCount);
  assertPositive('washerStack.thicknessPerWasher', washer.thicknessPerWasher);
  assertPositive('washerStack.modulus', washer.modulus);
  assertPositive('washerStack.outerDiameter', washer.outerDiameter);
  if (!Number.isFinite(washer.innerDiameter) || washer.innerDiameter < 0) {
    throw new Error('washerStack.innerDiameter must be a finite non-negative number.');
  }
  const headOuter = washer.underHeadOuterDiameter ?? washer.outerDiameter;
  const headInner = washer.underHeadInnerDiameter ?? washer.innerDiameter;
  const nutOuter = washer.underNutOuterDiameter ?? washer.outerDiameter;
  const nutInner = washer.underNutInnerDiameter ?? washer.innerDiameter;
  const topWashers = Array.from({ length: underHeadCount }, (_, index) => ({
    id: `washer-head-${index + 1}`,
    plateWidth: headOuter,
    plateLength: headOuter,
    compressionModel: 'cylindrical_annulus' as const,
    length: washer.thicknessPerWasher,
    modulus: washer.modulus,
    outerDiameter: headOuter,
    innerDiameter: headInner,
    thermalExpansionCoeff: washer.thermalExpansionCoeff
  }));
  const bottomWashers = Array.from({ length: underNutCount }, (_, index) => ({
    id: `washer-nut-${index + 1}`,
    plateWidth: nutOuter,
    plateLength: nutOuter,
    compressionModel: 'cylindrical_annulus' as const,
    length: washer.thicknessPerWasher,
    modulus: washer.modulus,
    outerDiameter: nutOuter,
    innerDiameter: nutInner,
    thermalExpansionCoeff: washer.thermalExpansionCoeff
  }));
  if (topWashers.length || bottomWashers.length) {
    return [...topWashers, ...bottomWashers];
  }
  return Array.from({ length: totalCount }, (_, index) => ({
    id: `washer-${index + 1}`,
    plateWidth: washer.outerDiameter,
    plateLength: washer.outerDiameter,
    compressionModel: 'cylindrical_annulus' as const,
    length: washer.thicknessPerWasher,
    modulus: washer.modulus,
    outerDiameter: washer.outerDiameter,
    innerDiameter: washer.innerDiameter,
    thermalExpansionCoeff: washer.thermalExpansionCoeff
  }));
}

export function solveMemberSegmentStiffness(segment: MemberSegmentInput): MemberSegmentStiffnessResult {
  switch (segment.compressionModel) {
    case 'cylindrical_annulus':
      return solveCylindricalAnnulus(segment);
    case 'conical_frustum_annulus':
      return solveConicalFrustumAnnulus(segment);
    case 'explicit_area':
      return solveExplicitArea(segment);
    default: {
      const _never: never = segment;
      throw new Error(`Unsupported area model: ${String(_never)}`);
    }
  }
}

export function solveSegmentedBoltStiffness(segments: BoltSegmentInput[]): StiffnessResult['bolt'] {
  if (!segments.length) {
    throw new Error('At least one bolt segment is required.');
  }
  const solved = segments.map(solveBoltSegment);
  const compliance = solved.reduce((sum, segment) => sum + segment.compliance, 0);
  return {
    stiffness: 1 / compliance,
    compliance,
    segments: solved
  };
}

export function solveSegmentedMemberStiffness(segments: MemberSegmentInput[]): StiffnessResult['members'] {
  if (!segments.length) {
    throw new Error('At least one member segment is required.');
  }
  const solved = segments.map(solveMemberSegmentStiffness);
  const compliance = solved.reduce((sum, segment) => sum + segment.compliance, 0);
  return {
    stiffness: 1 / compliance,
    compliance,
    segments: solved
  };
}

export function solveJointStiffness(
  input: Pick<FastenedJointPreloadInput, 'boltSegments' | 'memberSegments' | 'washerStack'>
): StiffnessResult {
  const bolt = solveSegmentedBoltStiffness(input.boltSegments);
  const washerInputs = buildWasherSegments(input as Pick<FastenedJointPreloadInput, 'washerStack'>);
  const washerSegments = washerInputs.map(solveMemberSegmentStiffness);
  const washerCompliance = washerSegments.reduce((sum, segment) => sum + segment.compliance, 0);
  const washerStiffness = washerCompliance > 0 ? 1 / washerCompliance : null;
  const combinedMemberInputs = [...washerInputs, ...input.memberSegments];
  const members = solveSegmentedMemberStiffness(combinedMemberInputs);
  const jointConstant = bolt.stiffness / (bolt.stiffness + members.stiffness);
  return {
    bolt,
    members,
    washers: {
      enabled: washerInputs.length > 0,
      count: washerInputs.length,
      stiffness: washerStiffness,
      compliance: washerCompliance > 0 ? washerCompliance : null,
      equivalentSegments: washerSegments
    },
    jointConstant,
    memberLoadFraction: 1 - jointConstant
  };
}
