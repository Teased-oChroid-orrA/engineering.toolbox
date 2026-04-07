export type InstallationModel = 'exact_torque' | 'nut_factor' | 'direct_preload';

export type CompressionModel =
  | 'cylindrical_annulus'
  | 'conical_frustum_annulus'
  | 'explicit_area'
  | 'calibrated_vdi_equivalent';

export type JointTypePreset =
  | 'bolted_nut'
  | 'hi_lok_collar'
  | 'blind_fastener'
  | 'tapped_joint'
  | 'countersunk_fastener';

export type PlateBehaviorMode =
  | 'isotropic_metallic'
  | 'orthotropic_laminate_proxy'
  | 'bearing_critical_thin_sheet';

export type AssemblyRowKind =
  | 'head'
  | 'head_washer'
  | 'plate'
  | 'shim'
  | 'interlayer'
  | 'nut_washer'
  | 'nut'
  | 'collar'
  | 'tapped_thread';

export type AssemblyRowInput = {
  id: string;
  label: string;
  kind: AssemblyRowKind;
  axialLength: number;
  outerDiameter: number | null;
  innerDiameter: number | null;
  modulus: number | null;
  thermalExpansionCoeff?: number;
  plateWidth?: number;
  plateLength?: number;
  compressionModel?: CompressionModel;
  note?: string;
  participatesInClamp: boolean;
  source: 'preset' | 'derived' | 'custom';
};

export type JointAssemblyInput = {
  preset: JointTypePreset;
  plateBehavior: PlateBehaviorMode;
  rows: AssemblyRowInput[];
  notes: string[];
};

export type BearingGeometryMetadata = {
  source: 'catalog' | 'manual' | 'derived';
  headBearingDiameter?: number | null;
  nutOrCollarBearingDiameter?: number | null;
  washerCompatibilityNote?: string;
  fastenerLabel?: string;
  headStyle?: string;
  threadDetail?: string;
};

export type PreloadFeatureFlags = {
  v2Foundation?: boolean;
};

export type InstallationUncertaintyInput = {
  legacyScatterPercent?: number;
  toolAccuracyPercent?: number;
  threadFrictionPercent?: number;
  bearingFrictionPercent?: number;
  prevailingTorquePercent?: number;
  threadGeometryPercent?: number;
};

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
    }
  | {
      id: string;
      plateWidth: number;
      plateLength: number;
      compressionModel: 'calibrated_vdi_equivalent';
      length: number;
      modulus: number;
      innerDiameter: number;
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
  featureFlags?: PreloadFeatureFlags;
  assembly?: JointAssemblyInput;
  bearingGeometry?: BearingGeometryMetadata;
  nominalDiameter: number;
  tensileStressArea: number;
  boltModulus: number;
  compressionConeHalfAngleDeg?: number;
  installationScatterPercent?: number;
  installationUncertainty?: InstallationUncertaintyInput;
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
    coatingCrushLoss?: number;
    washerSeatingLoss?: number;
    relaxationLossPercent?: number;
    creepLossPercent?: number;
  };
};

export type InstallationUncertaintyResult = {
  legacyScatterPercent: number;
  toolAccuracyPercent: number;
  threadFrictionPercent: number;
  bearingFrictionPercent: number;
  prevailingTorquePercent: number;
  threadGeometryPercent: number;
  combinedPercent: number;
  note: string;
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
      uncertainty: InstallationUncertaintyResult;
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
      uncertainty: InstallationUncertaintyResult;
    }
  | {
      model: 'direct_preload';
      preload: number;
      preloadMin: number;
      preloadMax: number;
      targetPreload: number;
      uncertainty: InstallationUncertaintyResult;
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
  modelNote?: string;
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
  decisionSupport: DecisionSupportResult;
  assumptions: string[];
  modelBasis: ModelBasisResult;
};

export type PreloadScenarioVariant = {
  id: EnvelopeScenarioLabel;
  label: string;
  preloadInstalled: number;
  preloadEffective: number | null;
  clampForceService: number | null;
  boltLoadService: number | null;
  separationUtilization: number | null;
  slipUtilization: number | null;
  proofUtilization: number | null;
  note: string;
};

export type PreloadComparePackId = 'installed_preload' | 'thermal' | 'friction' | 'preload_loss';

export type PreloadCompareMetricSnapshot = {
  preloadInstalled: number;
  preloadEffective: number | null;
  clampForceService: number | null;
  boltLoadService: number | null;
  separationUtilization: number | null;
  slipUtilization: number | null;
  proofUtilization: number | null;
  bearingUtilization: number | null;
  fatigueUtilization: number | null;
  thermalPreloadShift: number | null;
  mechanicalLossTotal: number | null;
  netPreloadShift: number | null;
  separationState: SeparationState | null;
  fayingSurfaceSlipCoeff: number | null;
  frictionInterfaceCount: number | null;
};

export type PreloadCompareCase = {
  id: string;
  packId: PreloadComparePackId;
  label: string;
  note: string;
  result: FastenedJointPreloadOutput;
  metrics: PreloadCompareMetricSnapshot;
};

export type PreloadComparePack = {
  id: PreloadComparePackId;
  label: string;
  description: string;
  baselineCaseId: string;
  cases: PreloadCompareCase[];
};

export type PreloadInverseTargetSettings = {
  slipMaxUtilization: number;
  separationMaxUtilization: number;
  proofMaxUtilization: number;
  bearingMaxUtilization: number;
  fatigueMaxUtilization: number;
  proofTargetUtilization?: number;
  fatigueTargetUtilization?: number;
};

export type PreloadInverseTargetResult = {
  id:
    | 'no_slip_preload'
    | 'separation_preload'
    | 'proof_diameter'
    | 'bearing_face_od'
    | 'fatigue_diameter';
  label: string;
  value: number | null;
  unit: string;
  note: string;
  severity: VerdictSeverity;
  feasible: boolean;
  governingScenario: EnvelopeScenarioLabel | null;
  targetUtilization: number | null;
};

export type PreloadInverseTargetPreferences = {
  proofTargetUtilization?: number;
  fatigueTargetUtilization?: number;
};

export type PreloadLossBreakdown = {
  embedmentLoss: number;
  coatingCrushLoss: number;
  washerSeatingLoss: number;
  relaxationLoss: number;
  creepLoss: number;
  thermalPreloadShift: number;
  mechanicalLossTotal: number;
  netPreloadShift: number;
};

export type SeparationState = 'clamped' | 'incipient' | 'post_separation';

export type ModelBasisResult = {
  v2FoundationEnabled: boolean;
  activeCompressionModels: CompressionModel[];
  compressionModelSummary: string;
  compressionModelNotes: string[];
  assemblySummary: string;
  uncertaintySummary: string;
  preloadLossSummary: string;
};

export type ServiceEvaluationResult = {
  preloadInstalled: number;
  preloadEffective: number;
  preloadEffectiveMin: number;
  preloadEffectiveMax: number;
  embedmentLoss: number;
  thermalPreloadShift: number;
  preloadLossBreakdown: PreloadLossBreakdown;
  externalAxialLoad: number;
  externalTransverseLoad: number;
  boltLoadIncrease: number;
  clampForceLoss: number;
  boltLoadService: number;
  clampForceService: number;
  separationLoad: number;
  separationMargin: number;
  hasSeparated: boolean;
  separationState: SeparationState;
  preSeparationBoltLoadSlope: number;
  postSeparationBoltLoadSlope: number;
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
  effectiveEngagedLength: number | null;
  engagementEffectiveness: number | null;
  loadDistributionFactor: number | null;
};

export type ThreadMechanicsResult = {
  engagedLengthEffectiveness: number | null;
  loadDistributionFactor: number | null;
  effectiveEngagedLength: number | null;
  governingStripLocation: 'internal' | 'external' | null;
  bearingGeometrySource: 'catalog' | 'manual' | 'derived';
  headBearingDiameter: number | null;
  nutOrCollarBearingDiameter: number | null;
  washerCompatibilityNote: string;
  stripCapacityNote: string;
};

export type VerdictSeverity = 'pass' | 'attention' | 'fail' | 'unknown';

export type VerdictItem = {
  severity: VerdictSeverity;
  driver: string;
  note: string;
};

export type FailureDecompositionResult = {
  id: 'separation' | 'slip' | 'proof' | 'bearing' | 'thread_strip' | 'fatigue' | 'none';
  title: string;
  equation: string;
  demand: number | null;
  capacity: number | null;
  utilization: number | null;
  margin: number | null;
  recommendations: string[];
};

export type DecisionSupportResult = {
  overall: VerdictSeverity;
  installationRisk: VerdictItem;
  slipRisk: VerdictItem;
  separationRisk: VerdictItem;
  stripRisk: VerdictItem;
  fatigueRisk: VerdictItem;
  criticalFastenerRisk: VerdictItem;
  governing: FailureDecompositionResult;
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

export type EnvelopeScenarioLabel = 'min_preload' | 'nominal_preload' | 'max_preload';

export type WorstCaseScenarioResult = {
  scenario: EnvelopeScenarioLabel;
  utilization: number | null;
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
  worstCaseScenarios: {
    separation: WorstCaseScenarioResult;
    slip: WorstCaseScenarioResult;
    proof: WorstCaseScenarioResult;
    bearing: WorstCaseScenarioResult;
    fatigue: WorstCaseScenarioResult;
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
  threadMechanics: ThreadMechanicsResult;
  fatigue: FatigueCheck;
};
