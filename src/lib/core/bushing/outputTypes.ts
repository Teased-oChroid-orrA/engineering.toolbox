import type {
  BushingCandidate,
  BushingContaminationLevel,
  BushingCriticality,
  BushingLoadSpectrum,
  BushingLubricationMode,
  BushingProcessRouteId,
  BushingStandardsBasis,
  BushingWarning,
  InterferenceEnforcementReasonCode,
  ToleranceRange
} from './typePrimitives';

export type BushingServiceState = {
  id: 'free' | 'installed' | 'finish_reamed' | 'cold' | 'hot' | 'worn';
  label: string;
  effectiveInterference: number;
  contactPressure: number;
  projectedId: number;
  idChangeFromFree: number;
  fitClass: 'interference' | 'transition' | 'clearance';
  note: string;
};

export type BushingDutyScreen = {
  loadSpectrum: BushingLoadSpectrum;
  lubricationMode: BushingLubricationMode;
  contaminationLevel: BushingContaminationLevel;
  specificLoadPsi: number;
  specificLoadMpa: number;
  slidingVelocityMps: number;
  pv: number;
  pvLimit: number;
  pvUtilization: number;
  wearRisk: 'low' | 'moderate' | 'high' | 'severe';
  riskScore: number;
  dominantDrivers: string[];
  lifeEstimateHours: number | null;
};

export type BushingProcessReview = {
  routeId: BushingProcessRouteId;
  routeLabel: string;
  toleranceClass: string;
  recommendedRaUm: number;
  roundnessTargetUm: number;
  finishMachiningRequired: boolean;
  thermalAssistRecommended: boolean;
  assemblyThermalAssistActive: boolean;
  installForceBand: { low: number; nominal: number; high: number };
  removalForce: number;
  notes: string[];
};

export type BushingApprovalReview = {
  standardsBasis: BushingStandardsBasis;
  standardsRevision: string;
  processSpec: string;
  criticality: BushingCriticality;
  approvalRequired: boolean;
  decision: 'pass' | 'review' | 'hold';
  traceabilityRefs: string[];
  assumptions: string[];
};

export type BushingMeasuredPartSummary = {
  applied: boolean;
  basis: 'nominal' | 'measured';
  overrides: string[];
  notes: string[];
};

export type BushingOutput = {
  sleeveWall: number;
  neckWall: number | null;
  odInstalled: number;
  csSolved: {
    id?: { dia: number; depth: number; angleDeg: number };
    od?: { dia: number; depth: number; angleDeg: number };
  };
  pressure: number;
  lame: {
    model: string;
    unitsBase: { length: 'in'; stress: 'psi'; force: 'lbf' };
    deltaTotal: number;
    deltaThermal: number;
    deltaUser: number;
    boreDia: number;
    idBushing: number;
    effectiveODHousing: number;
    D_equivalent: number;
    psi: number;
    lambda: number;
    w_eff: number;
    e_eff: number;
    termB: number;
    termH: number;
    pressurePsi: number;
    pressureKsi: number;
    field: {
      signConvention: string;
      axialModel: string;
      bushing: {
        innerRadius: number;
        outerRadius: number;
        samples: Array<{ r: number; sigmaR: number; sigmaTheta: number; sigmaAxial: number }>;
        boundary: {
          sigmaRInner: number;
          sigmaROuter: number;
          sigmaThetaInner: number;
          sigmaThetaOuter: number;
          sigmaAxialInner: number;
          sigmaAxialOuter: number;
          maxAbsHoop: number;
          maxAbsHoopAt: number;
          maxAbsAxial: number;
          maxAbsAxialAt: number;
        };
      };
      housing: {
        innerRadius: number;
        outerRadius: number;
        samples: Array<{ r: number; sigmaR: number; sigmaTheta: number; sigmaAxial: number }>;
        boundary: {
          sigmaRInner: number;
          sigmaROuter: number;
          sigmaThetaInner: number;
          sigmaThetaOuter: number;
          sigmaAxialInner: number;
          sigmaAxialOuter: number;
          maxAbsHoop: number;
          maxAbsHoopAt: number;
          maxAbsAxial: number;
          maxAbsAxialAt: number;
        };
      };
    };
  };
  hoop: {
    housingSigma: number;
    housingMS: number;
    bushingSigma: number;
    bushingMS: number;
    ligamentSigma: number;
    ligamentMS: number;
    edRequiredLigament: number | null;
  };
  edgeDistance: {
    edMinSequence: number;
    edMinStrength: number;
    edActual: number;
    governing: 'sequencing' | 'strength' | 'unknown';
  };
  governing: { name: string; margin: number };
  physics: {
    deltaEffective: number;
    installDeltaEffective: number;
    contactPressure: number;
    installContactPressure: number;
    installForce: number;
    retainedInstallForce: number;
    assemblyThermalDelta: number;
    stressHoopHousing: number;
    stressHoopBushing: number;
    marginHousing: number;
    marginBushing: number;
    stressAxialHousing: number;
    stressAxialBushing: number;
    axialConstraintFactor: number;
    axialLengthFactor: number;
    edMinCoupled: number;
  };
  geometry: {
    odBushing: number;
    wallStraight: number;
    wallNeck: number;
    csInternal: { dia: number; depth: number; angleDeg: number };
    csExternal: { dia: number; depth: number; angleDeg: number };
    isSaturationActive: boolean;
  };
  serviceEnvelope: {
    states: BushingServiceState[];
    governingStateId: BushingServiceState['id'];
    governingStateLabel: string;
    finishMachiningRequired: boolean;
  };
  dutyScreen: BushingDutyScreen;
  process: BushingProcessReview;
  review: BushingApprovalReview;
  inputBasis: {
    bore: 'nominal' | 'measured';
    id: 'nominal' | 'measured';
    edgeDist: 'nominal' | 'measured';
    housingWidth: 'nominal' | 'measured';
  };
  measuredPartSummary: BushingMeasuredPartSummary;
  tolerance: {
    status: 'ok' | 'clamped' | 'infeasible';
    notes: string[];
    enforcement: {
      enabled: boolean;
      satisfied: boolean;
      blocked: boolean;
      reasonCodes: InterferenceEnforcementReasonCode[];
      requiredBoreTolWidth: number;
      availableBoreTolWidth: number;
      targetInterferenceWidth: number;
      lowerViolation: number;
      upperViolation: number;
      boreNominalShiftApplied: number;
    };
    bore: ToleranceRange;
    interferenceTarget: ToleranceRange;
    odBushing: ToleranceRange;
    achievedInterference: ToleranceRange;
    csInternalDia?: ToleranceRange;
    csInternalDepth?: ToleranceRange;
    csExternalDia?: ToleranceRange;
    csExternalDepth?: ToleranceRange;
  };
  candidates: BushingCandidate[];
  warningCodes: BushingWarning[];
  warnings: string[];
};
