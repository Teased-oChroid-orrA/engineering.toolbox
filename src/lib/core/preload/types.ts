export type InstallationModel = 'exact_torque' | 'nut_factor' | 'direct_preload';

export type CompressionModel =
  | 'cylindrical_annulus'
  | 'conical_frustum_annulus'
  | 'explicit_area';

export type BoltSegmentInput = {
  id: string;
  length: number;
  area: number;
  modulus: number;
};

export type MemberSegmentInput =
  | {
      id: string;
      plateWidth: number;
      plateLength: number;
      compressionModel: 'cylindrical_annulus';
      length: number;
      modulus: number;
      outerDiameter: number;
      innerDiameter: number;
      thermalExpansionCoeff?: number;
    }
  | {
      id: string;
      plateWidth: number;
      plateLength: number;
      compressionModel: 'conical_frustum_annulus';
      length: number;
      modulus: number;
      outerDiameterStart: number;
      outerDiameterEnd: number;
      innerDiameter: number;
      thermalExpansionCoeff?: number;
    }
  | {
      id: string;
      plateWidth: number;
      plateLength: number;
      compressionModel: 'explicit_area';
      length: number;
      modulus: number;
      effectiveArea: number;
      thermalExpansionCoeff?: number;
      note?: string;
    };

export type InstallationInput =
  | {
      model: 'exact_torque';
      appliedTorque: number;
      prevailingTorque?: number;
      threadFrictionCoeff: number;
      bearingFrictionCoeff: number;
      threadPitch: number;
      threadPitchDiameter: number;
      bearingMeanDiameter: number;
      threadHalfAngleDeg: number;
    }
  | {
      model: 'nut_factor';
      appliedTorque: number;
      nutFactor: number;
      nominalDiameter: number;
    }
  | {
      model: 'direct_preload';
      targetPreload: number;
    };

export type FastenedJointPreloadInput = {
  nominalDiameter: number;
  tensileStressArea: number;
  boltModulus: number;
  compressionConeHalfAngleDeg?: number;
  installationScatterPercent?: number;
  boltThermalExpansionCoeff?: number;
  boltProofStrength?: number;
  boltUltimateStrength?: number;
  boltEnduranceLimit?: number;
  memberBearingAllowable?: number;
  underHeadBearingArea?: number;
  engagedThreadLength?: number;
  internalThreadShearDiameter?: number;
  externalThreadShearDiameter?: number;
  internalThreadStripShearAllowable?: number;
  externalThreadStripShearAllowable?: number;
  fayingSurfaceSlipCoeff?: number;
  frictionInterfaceCount?: number;
  washerStack?: {
    enabled: boolean;
    count: number;
    underHeadCount?: number;
    underNutCount?: number;
    thicknessPerWasher: number;
    modulus: number;
    outerDiameter: number;
    innerDiameter: number;
    underHeadOuterDiameter?: number;
    underHeadInnerDiameter?: number;
    underNutOuterDiameter?: number;
    underNutInnerDiameter?: number;
    thermalExpansionCoeff?: number;
  };
  boltSegments: BoltSegmentInput[];
  memberSegments: MemberSegmentInput[];
  installation: InstallationInput;
  serviceCase?: {
    externalAxialLoad?: number;
    externalTransverseLoad?: number;
    meanAxialLoad?: number;
    alternatingAxialLoad?: number;
    temperatureChange?: number;
    embedmentSettlement?: number;
  };
};

export type ExactTorqueTerms = {
  leadAngleRad: number;
  threadFrictionAngleRad: number;
  secThreadHalfAngle: number;
  threadTorquePerUnitPreload: number;
  bearingTorquePerUnitPreload: number;
  preloadPerAppliedTorque: number;
};

export type InstallationResult =
  | {
      model: 'exact_torque';
      preload: number;
      preloadMin: number;
      preloadMax: number;
      appliedTorque: number;
      prevailingTorque: number;
      availableTorque: number;
      threadTorque: number;
      bearingTorque: number;
      exactTerms: ExactTorqueTerms;
    }
  | {
      model: 'nut_factor';
      preload: number;
      preloadMin: number;
      preloadMax: number;
      appliedTorque: number;
      nutFactor: number;
      nominalDiameter: number;
      torqueCoefficient: number;
    }
  | {
      model: 'direct_preload';
      preload: number;
      preloadMin: number;
      preloadMax: number;
      targetPreload: number;
    };

export type SegmentStiffnessResult = {
  id: string;
  stiffness: number;
  compliance: number;
};

export type MemberSegmentStiffnessResult = SegmentStiffnessResult & {
  compressionModel: CompressionModel;
  exactAreaIntegral: number;
  averageAreaEquivalent: number;
};

export type StiffnessResult = {
  bolt: {
    stiffness: number;
    compliance: number;
    segments: SegmentStiffnessResult[];
  };
  members: {
    stiffness: number;
    compliance: number;
    segments: MemberSegmentStiffnessResult[];
  };
  washers: {
    enabled: boolean;
    count: number;
    stiffness: number | null;
    compliance: number | null;
    equivalentSegments: MemberSegmentStiffnessResult[];
  };
  jointConstant: number;
  memberLoadFraction: number;
};

export type FastenedJointPreloadOutput = {
  input: FastenedJointPreloadInput;
  installation: InstallationResult;
  stiffness: StiffnessResult;
  service: ServiceEvaluationResult | null;
  checks: StructuralChecksResult;
  assumptions: string[];
};

export type ServiceEvaluationResult = {
  preloadInstalled: number;
  preloadEffective: number;
  embedmentLoss: number;
  thermalPreloadShift: number;
  externalAxialLoad: number;
  externalTransverseLoad: number;
  boltLoadIncrease: number;
  clampForceLoss: number;
  boltLoadService: number;
  clampForceService: number;
  separationLoad: number;
  separationMargin: number;
  hasSeparated: boolean;
  boltLoadPostSeparation: number;
  slipResistance: number | null;
  slipMargin: number | null;
  slipRatio: number | null;
};

export type UtilizationCheck = {
  status: 'ok' | 'warning' | 'unavailable';
  demand: number | null;
  capacity: number | null;
  utilization: number | null;
  margin: number | null;
  note?: string;
};

export type ThreadStripCheck = UtilizationCheck & {
  shearArea: number | null;
};

export type FatigueCheck = UtilizationCheck & {
  alternatingStress: number | null;
  meanStress: number | null;
  goodmanEquivalent: number | null;
  soderbergEquivalent: number | null;
  gerberEquivalent: number | null;
};

export type CheckEnvelope = {
  min: number | null;
  nominal: number | null;
  max: number | null;
  note: string;
};

export type StructuralChecksResult = {
  serviceLimits: {
    separation: UtilizationCheck;
    slip: UtilizationCheck;
    selfLooseningRisk: {
      level: 'low' | 'moderate' | 'high' | 'unknown';
      slipRatio: number | null;
      note: string;
    };
  };
  envelopes: {
    separationUtilization: CheckEnvelope;
    slipUtilization: CheckEnvelope;
    proofUtilization: CheckEnvelope;
    bearingUtilization: CheckEnvelope;
    fatigueUtilization: CheckEnvelope;
  };
  proof: UtilizationCheck;
  bearing: {
    underHead: UtilizationCheck;
    threadBearing: UtilizationCheck;
    localCrushing: UtilizationCheck;
    governing: 'under_head' | 'thread_bearing' | 'local_crushing' | null;
  };
  threadStrip: {
    internal: ThreadStripCheck;
    external: ThreadStripCheck;
    governing: 'internal' | 'external' | null;
  };
  fatigue: FatigueCheck;
};
