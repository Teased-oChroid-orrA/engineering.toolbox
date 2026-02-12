import type {
  BushingCandidate,
  BushingWarning,
  InterferenceEnforcementReasonCode,
  ToleranceRange
} from './typePrimitives';

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
    contactPressure: number;
    installForce: number;
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
    csExternalDia?: ToleranceRange;
  };
  candidates: BushingCandidate[];
  warningCodes: BushingWarning[];
  warnings: string[];
};
