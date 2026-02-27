import type { FastenerSolverInput, MaterialInput } from '../types';

export type ContinuumLayerInput = {
  id: string;
  label: string;
  thickness: number;
  outerMaterial: MaterialInput;
};

export type ContinuumMeshControl = {
  nrBolt: number;
  nrOuter: number;
  nzPerLayer: number;
};

export type ContinuumBoundaryInput = {
  constrainBottomOuterUz: boolean;
  constrainAxisUr: boolean;
};

export type ContinuumPretensionInput = {
  preloadForce: number;
};

export type ContinuumContactInput = {
  enabled: boolean;
  frictionEnabled: boolean;
  frictionCoefficient?: number;
  initialRadialGap?: number;
};

export type ContinuumModelInput = {
  units: FastenerSolverInput['units'];
  boltRadius: number;
  outerRadius: number;
  boltMaterial: MaterialInput;
  layers: ContinuumLayerInput[];
  mesh: ContinuumMeshControl;
  pretension: ContinuumPretensionInput;
  boundary: ContinuumBoundaryInput;
  contact: ContinuumContactInput;
};

export type ContinuumNode = {
  id: number;
  r: number;
  z: number;
};

export type ContinuumElement = {
  id: number;
  nodeIds: [number, number, number, number];
  layerId: string;
  region: 'bolt' | 'outer';
  material: MaterialInput;
};

export type ContinuumMesh = {
  nodes: ContinuumNode[];
  elements: ContinuumElement[];
  zLevels: number[];
  rLevels: number[];
  interfacePairs: Array<{ z: number; r: number; weight: number; boltNodeId: number; outerNodeId: number }>;
};

export type ContinuumElementField = {
  elementId: number;
  layerId: string;
  region: 'bolt' | 'outer';
  sigmaR: number;
  sigmaZ: number;
  sigmaTheta: number;
  tauRZ: number;
  epsilonR: number;
  epsilonZ: number;
  epsilonTheta: number;
  gammaRZ: number;
  rMid: number;
  zMid: number;
  volumeWeight: number;
};

export type ContinuumLayerResult = {
  layerId: string;
  label: string;
  z0: number;
  z1: number;
  boltForce: number;
  outerForce: number;
  transferredToOuter: number;
};

export type ContinuumSolverOutput = {
  model: ContinuumModelInput;
  mesh: {
    nodeCount: number;
    elementCount: number;
  };
  solved: {
    converged: boolean;
    residualNorm: number;
  };
  preload: {
    inputForce: number;
    topBoltEdgeForce: number;
    bottomBoltEdgeForce: number;
    bottomOuterReaction: number;
  };
  contact: {
    enabled: boolean;
    frictionEnabled: boolean;
    activePairs: number;
    openPairs: number;
    stickPairs: number;
    slipPairs: number;
    iterations: number;
    maxPenetration: number;
    maxTangentialSlip: number;
    complementarityResidual: number;
    normalResultant: number;
    tangentialResultant: number;
  };
  fields: ContinuumElementField[];
  layers: ContinuumLayerResult[];
  assumptions: string[];
  warnings: string[];
  errors: string[];
};
