import type { UnitSystem } from '$lib/core/units';

export type MaterialInput = {
  name: string;
  youngsModulus: number;
  thermalExpansion?: number;
  poissonsRatio?: number;
  yieldStrength?: number;
  ultimateStrength?: number;
  bearingStrength?: number;
};

export type AxialElementKind = 'bolt-head' | 'bolt-shank' | 'bolt-thread' | 'washer-head' | 'washer-nut' | 'joint-member' | 'nut-body';
export type AxialElementGroup = 'bolt' | 'clamped';

export type AxialContinuumElementInput = {
  id: string;
  label: string;
  kind: AxialElementKind;
  group: AxialElementGroup;
  length: number;
  area: number;
  material: MaterialInput;
  tensileStressArea?: number;
};

export type TorquePreloadInput = {
  enabled: boolean;
  appliedTorque: number;
  lead: number;
  pitchDiameter: number;
  threadHalfAngleDeg: number;
  threadFriction: number;
  bearingFriction: number;
  bearingMeanDiameter: number;
};

export type ExternalLoadInput = {
  enabled: boolean;
  axialForce: number;
};

export type ThermalInput = {
  enabled: boolean;
  deltaT: number;
  perElementDeltaT?: Record<string, number>;
  usePerElement?: boolean;
};

export type NonlinearContactInput = {
  enabled: boolean;
  gapAtZeroLoad?: number;
  maxIterations?: number;
  tolerance?: number;
  penalty?: number;
};

export type RowBoltInput = {
  id: string;
  x: number;
  stiffness: number;
  preload: number;
};

export type RowLoadInput = {
  enabled: boolean;
  force: number;
  eccentricity: number;
  bolts: RowBoltInput[];
};

export type FastenerSolverInput = {
  units: UnitSystem;
  preload: number;
  elements: AxialContinuumElementInput[];
  torque: TorquePreloadInput;
  external: ExternalLoadInput;
  thermal: ThermalInput;
  contact: NonlinearContactInput;
  row: RowLoadInput;
};

export type ElementResult = {
  id: string;
  label: string;
  kind: AxialElementKind;
  group: AxialElementGroup;
  length: number;
  area: number;
  youngsModulus: number;
  stiffness: number;
  compliance: number;
  preloadDeformation: number;
  thermalFreeDeformation: number;
};

export type RowBoltResult = {
  id: string;
  x: number;
  stiffness: number;
  displacement: number;
  forceIncrement: number;
  forceTotal: number;
};

export type FastenerSolverOutput = {
  inputs: FastenerSolverInput;
  elementResults: ElementResult[];
  totals: {
    compliance: number;
    stiffness: number;
    preloadForce: number;
    preloadDeformation: number;
    boltElongation: number;
    clampedCompression: number;
  };
  split: {
    bolt: { stiffness: number; compliance: number };
    clamped: { stiffness: number; compliance: number };
  };
  torque: {
    used: boolean;
    preloadFromTorque: number;
    denominator: number;
    terms: {
      leadTorqueCoeff: number;
      threadFrictionCoeff: number;
      bearingFrictionCoeff: number;
    };
  };
  external: {
    enabled: boolean;
    deltaBoltLoad: number;
    deltaClampedLoad: number;
    boltForceAfterExternal: number;
    clampForceAfterExternal: number;
  };
  thermal: {
    enabled: boolean;
    thermalForce: number;
    boltForceAfterThermal: number;
    clampForceAfterThermal: number;
  };
  contact: {
    enabled: boolean;
    gap: number;
    contactPressureProxy: number;
    contactReaction: number;
    boltForceAfterContact: number;
    clampForceAfterContact: number;
    separated: boolean;
    converged: boolean;
    complementarityResidual: number;
    iterationsUsed: number;
    activeSetIterations: Array<{
      iter: number;
      gap: number;
      pressure: number;
      active: boolean;
      residual: number;
      boltForce: number;
      clampForce: number;
    }>;
  };
  row: {
    enabled: boolean;
    moment: number;
    u0: number;
    theta: number;
    forceResidual: number;
    momentResidual: number;
    bolts: RowBoltResult[];
  };
  assumptions: string[];
  checks: Array<{
    id: string;
    label: string;
    value: number;
    limit: number;
    margin: number;
    pass: boolean;
    unit: string;
    context: string;
  }>;
  derivation: string[];
  warnings: string[];
  errors: string[];
};

export type NumericExampleOutput = {
  input: FastenerSolverInput;
  output: FastenerSolverOutput;
};
