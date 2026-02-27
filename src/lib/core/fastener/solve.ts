import type {
  AxialContinuumElementInput,
  ElementResult,
  FastenerSolverInput,
  FastenerSolverOutput,
  MaterialInput,
  NumericExampleOutput,
  RowBoltInput
} from './types';
import { computeDeterministicChecks, modelAssumptions } from './checks';

const EPS = 1e-12;
const clampMin = (v: number, min = EPS) => (Number.isFinite(v) && v > min ? v : min);
const toRad = (deg: number) => (deg * Math.PI) / 180;

export class Material {
  readonly name: string;
  readonly youngsModulus: number;
  readonly thermalExpansion: number;
  readonly poissonsRatio: number;
  readonly yieldStrength: number;
  readonly ultimateStrength: number;
  readonly bearingStrength: number;

  constructor(input: MaterialInput) {
    this.name = input.name;
    this.youngsModulus = clampMin(input.youngsModulus);
    this.thermalExpansion = Number.isFinite(input.thermalExpansion) ? Number(input.thermalExpansion) : 0;
    this.poissonsRatio = Number.isFinite(input.poissonsRatio) ? Number(input.poissonsRatio) : 0.3;
    this.yieldStrength = Number.isFinite(input.yieldStrength) ? Number(input.yieldStrength) : 0;
    this.ultimateStrength = Number.isFinite(input.ultimateStrength) ? Number(input.ultimateStrength) : 0;
    this.bearingStrength = Number.isFinite(input.bearingStrength) ? Number(input.bearingStrength) : 0;
  }
}

export class AxialContinuumElement {
  readonly id: string;
  readonly label: string;
  readonly kind: AxialContinuumElementInput['kind'];
  readonly group: AxialContinuumElementInput['group'];
  readonly length: number;
  readonly area: number;
  readonly material: Material;

  constructor(input: AxialContinuumElementInput) {
    this.id = input.id;
    this.label = input.label;
    this.kind = input.kind;
    this.group = input.group;
    this.length = clampMin(input.length);
    this.area = clampMin(input.area);
    this.material = new Material(input.material);
  }

  compliance(): number {
    return this.length / (this.material.youngsModulus * this.area);
  }

  stiffness(): number {
    return 1 / this.compliance();
  }

  preloadDeformation(force: number): number {
    return force * this.compliance();
  }

  thermalFreeDeformation(deltaT: number): number {
    return this.material.thermalExpansion * deltaT * this.length;
  }
}

export class BoltSegment extends AxialContinuumElement {
  constructor(input: AxialContinuumElementInput) {
    const area = input.tensileStressArea && Number.isFinite(input.tensileStressArea) ? input.tensileStressArea : input.area;
    super({ ...input, area });
  }
}

export class WasherSegment extends AxialContinuumElement {}
export class JointMemberSegment extends AxialContinuumElement {}

export class SeriesAssembly {
  readonly elements: AxialContinuumElement[];

  constructor(elements: AxialContinuumElement[]) {
    this.elements = elements;
  }

  compliance(): number {
    return this.elements.reduce((sum, el) => sum + el.compliance(), 0);
  }

  stiffness(): number {
    const c = this.compliance();
    return c > EPS ? 1 / c : 0;
  }

  forGroup(group: 'bolt' | 'clamped'): SeriesAssembly {
    return new SeriesAssembly(this.elements.filter((el) => el.group === group));
  }
}

export class PreloadSolver {
  readonly assembly: SeriesAssembly;

  constructor(assembly: SeriesAssembly) {
    this.assembly = assembly;
  }

  solvePreload(force: number) {
    const elementResults = this.assembly.elements.map((el): ElementResult => ({
      id: el.id,
      label: el.label,
      kind: el.kind,
      group: el.group,
      length: el.length,
      area: el.area,
      youngsModulus: el.material.youngsModulus,
      stiffness: el.stiffness(),
      compliance: el.compliance(),
      preloadDeformation: el.preloadDeformation(force),
      thermalFreeDeformation: 0
    }));

    const compliance = this.assembly.compliance();
    const deformation = force * compliance;

    const boltAssembly = this.assembly.forGroup('bolt');
    const clampedAssembly = this.assembly.forGroup('clamped');

    const boltDeformation = elementResults
      .filter((row) => row.group === 'bolt')
      .reduce((sum, row) => sum + row.preloadDeformation, 0);

    const clampedDeformation = elementResults
      .filter((row) => row.group === 'clamped')
      .reduce((sum, row) => sum + row.preloadDeformation, 0);

    return {
      elementResults,
      compliance,
      stiffness: compliance > EPS ? 1 / compliance : 0,
      deformation,
      split: {
        bolt: {
          compliance: boltAssembly.compliance(),
          stiffness: boltAssembly.stiffness()
        },
        clamped: {
          compliance: clampedAssembly.compliance(),
          stiffness: clampedAssembly.stiffness()
        }
      },
      boltDeformation,
      clampedDeformation
    };
  }

  solveThermal(deltaT: number, perElementDeltaT?: Record<string, number>, usePerElement = false): number {
    const totalFree = this.assembly.elements.reduce((sum, el) => {
      const localDeltaT = usePerElement && perElementDeltaT && Number.isFinite(perElementDeltaT[el.id]) ? Number(perElementDeltaT[el.id]) : deltaT;
      return sum + el.thermalFreeDeformation(localDeltaT);
    }, 0);
    const totalCompliance = this.assembly.compliance();
    if (totalCompliance <= EPS) return 0;
    return -totalFree / totalCompliance;
  }
}

function createElement(input: AxialContinuumElementInput): AxialContinuumElement {
  switch (input.kind) {
    case 'bolt-shank':
    case 'bolt-thread':
    case 'bolt-head':
      return new BoltSegment(input);
    case 'washer-head':
    case 'washer-nut':
      return new WasherSegment(input);
    case 'joint-member':
    case 'nut-body':
      return new JointMemberSegment(input);
    default:
      return new AxialContinuumElement(input);
  }
}

function solveTorquePreload(input: FastenerSolverInput['torque']) {
  if (!input.enabled) {
    return {
      used: false,
      preloadFromTorque: 0,
      denominator: 0,
      terms: {
        leadTorqueCoeff: 0,
        threadFrictionCoeff: 0,
        bearingFrictionCoeff: 0
      }
    };
  }

  const lead = clampMin(input.lead);
  const dm = clampMin(input.pitchDiameter);
  const alpha = toRad(Number(input.threadHalfAngleDeg));
  const muThread = Math.max(0, Number(input.threadFriction));
  const muBearing = Math.max(0, Number(input.bearingFriction));
  const dbMean = clampMin(input.bearingMeanDiameter);

  const leadCoeff = lead / (2 * Math.PI);
  const threadFrictionCoeff = (dm * muThread) / (2 * Math.cos(alpha));
  const bearingFrictionCoeff = (muBearing * dbMean) / 2;
  const denominator = leadCoeff + threadFrictionCoeff + bearingFrictionCoeff;
  const preloadFromTorque = denominator > EPS ? Number(input.appliedTorque) / denominator : 0;

  return {
    used: true,
    preloadFromTorque,
    denominator,
    terms: {
      leadTorqueCoeff: leadCoeff,
      threadFrictionCoeff,
      bearingFrictionCoeff
    }
  };
}

function solveRow(load: FastenerSolverInput['row']) {
  if (!load.enabled || load.bolts.length === 0) {
    return {
      enabled: false,
      moment: 0,
      u0: 0,
      theta: 0,
      forceResidual: 0,
      momentResidual: 0,
      bolts: []
    };
  }

  const bolts: RowBoltInput[] = load.bolts
    .filter((b) => Number.isFinite(b.stiffness) && b.stiffness > 0)
    .map((b) => ({ ...b, stiffness: Number(b.stiffness), preload: Number(b.preload || 0), x: Number(b.x) }));

  if (bolts.length === 0) {
    return {
      enabled: true,
      moment: 0,
      u0: 0,
      theta: 0,
      forceResidual: Number(load.force),
      momentResidual: Number(load.force) * Number(load.eccentricity),
      bolts: []
    };
  }

  const force = Number(load.force);
  const moment = Number(load.force) * Number(load.eccentricity);

  const sumK = bolts.reduce((s, b) => s + b.stiffness, 0);
  const sumKx = bolts.reduce((s, b) => s + b.stiffness * b.x, 0);
  const sumKx2 = bolts.reduce((s, b) => s + b.stiffness * b.x * b.x, 0);

  const det = sumK * sumKx2 - sumKx * sumKx;
  if (Math.abs(det) <= EPS) {
    return {
      enabled: true,
      moment,
      u0: 0,
      theta: 0,
      forceResidual: force,
      momentResidual: moment,
      bolts: bolts.map((b) => ({
        id: b.id,
        x: b.x,
        stiffness: b.stiffness,
        displacement: 0,
        forceIncrement: 0,
        forceTotal: b.preload
      }))
    };
  }

  const u0 = (force * sumKx2 - moment * sumKx) / det;
  const theta = (moment * sumK - force * sumKx) / det;

  const boltResults = bolts.map((b) => {
    const displacement = u0 + theta * b.x;
    const forceIncrement = b.stiffness * displacement;
    return {
      id: b.id,
      x: b.x,
      stiffness: b.stiffness,
      displacement,
      forceIncrement,
      forceTotal: b.preload + forceIncrement
    };
  });

  const sumForce = boltResults.reduce((s, b) => s + b.forceIncrement, 0);
  const sumMoment = boltResults.reduce((s, b) => s + b.forceIncrement * b.x, 0);

  return {
    enabled: true,
    moment,
    u0,
    theta,
    forceResidual: force - sumForce,
    momentResidual: moment - sumMoment,
    bolts: boltResults
  };
}

function solveNonlinearContact(
  contact: FastenerSolverInput['contact'],
  gapAtZeroLoad: number,
  boltForceAfterThermal: number,
  clampForceAfterThermal: number,
  contactCompliance: number
) {
  const c = clampMin(contactCompliance);

  if (!contact.enabled) {
    const gap = gapAtZeroLoad - clampForceAfterThermal * c;
    return {
      enabled: false,
      gap,
      contactPressureProxy: 0,
      contactReaction: 0,
      boltForceAfterContact: boltForceAfterThermal,
      clampForceAfterContact: clampForceAfterThermal,
      separated: false,
      converged: true,
      complementarityResidual: 0,
      iterationsUsed: 0,
      activeSetIterations: []
    };
  }

  const maxIterations = Math.max(1, Math.floor(Number(contact.maxIterations ?? 25)));
  const tolerance = Math.max(EPS, Number(contact.tolerance ?? 1e-9));
  const penalty = clampMin(Number(contact.penalty ?? 1 / c));

  let reaction = 0;
  let gap = 0;
  let clampForce = clampForceAfterThermal;
  let boltForce = boltForceAfterThermal;
  let residual = Number.POSITIVE_INFINITY;
  const activeSetIterations: Array<{
    iter: number;
    gap: number;
    pressure: number;
    active: boolean;
    residual: number;
    boltForce: number;
    clampForce: number;
  }> = [];

  for (let iter = 1; iter <= maxIterations; iter++) {
    clampForce = clampForceAfterThermal - reaction;
    boltForce = boltForceAfterThermal + reaction;
    gap = gapAtZeroLoad - clampForce * c;

    const trial = reaction - penalty * gap;
    const nextReaction = Math.max(0, trial);
    const active = nextReaction > 0;
    const gapResidual = active ? Math.abs(gap) : Math.max(0, -gap);
    const pressureResidual = Math.max(0, -nextReaction);
    const compResidual = Math.abs(gap * nextReaction);
    const reactionResidual = Math.abs(nextReaction - reaction);
    residual = Math.max(gapResidual, pressureResidual, compResidual, reactionResidual);

    activeSetIterations.push({
      iter,
      gap,
      pressure: nextReaction,
      active,
      residual,
      boltForce,
      clampForce
    });
    reaction = nextReaction;
    if (residual <= tolerance) break;
  }

  clampForce = clampForceAfterThermal - reaction;
  boltForce = boltForceAfterThermal + reaction;
  gap = gapAtZeroLoad - clampForce * c;
  const separated = gap > tolerance;
  return {
    enabled: true,
    gap,
    contactPressureProxy: reaction,
    contactReaction: reaction,
    boltForceAfterContact: boltForce,
    clampForceAfterContact: clampForce,
    separated,
    converged: residual <= tolerance,
    complementarityResidual: Math.abs(gap * reaction),
    iterationsUsed: activeSetIterations.length,
    activeSetIterations
  };
}

function buildDerivation(): string[] {
  return [
    'For each segment i: delta_i = F * L_i / (E_i * A_i), k_i = E_i * A_i / L_i, C_i = 1 / k_i.',
    'Series compatibility: delta_total = sum(delta_i) and C_total = sum(C_i), k_total = 1 / C_total.',
    'Bolt/clamped split: C_b = sum(C_i in bolt group), C_c = sum(C_i in clamped group), k_b = 1/C_b, k_c = 1/C_c.',
    'External axial load sharing from compatibility and equilibrium: DeltaF_b = (k_b/(k_b+k_c)) * F_ext, DeltaF_c = (k_c/(k_b+k_c)) * F_ext.',
    'Torque-preload inversion (MIL-HDBK exact decomposition): T = F * [L/(2*pi) + d_m*mu_t/(2*cos(alpha)) + mu_b*d_bm/2], thus F = T / (...) .',
    'Thermal superposition for constrained series stack: F_th = -sum(alpha_i*DeltaT_i*L_i) / sum(C_i), with DeltaT_i = DeltaT when per-element mode is OFF.',
    'Unilateral contact constraints (toggle): g_n >= 0, p_n >= 0, g_n * p_n = 0, solved with projected active-set augmented Lagrangian iterations.'
  ];
}

export function computeFastenerSolver(inputs: FastenerSolverInput): FastenerSolverOutput {
  const errors: string[] = [];
  const warnings: string[] = [];

  const elements = inputs.elements.map(createElement);
  if (elements.length === 0) {
    errors.push('At least one axial segment is required.');
  }

  const assembly = new SeriesAssembly(elements);
  const preloadSolver = new PreloadSolver(assembly);
  const torque = solveTorquePreload(inputs.torque);

  const preloadForce = torque.used ? torque.preloadFromTorque : Number(inputs.preload);
  if (!Number.isFinite(preloadForce) || preloadForce <= 0) {
    errors.push('Preload must be greater than zero (direct preload or torque-derived preload).');
  }

  const preload = preloadSolver.solvePreload(Math.max(preloadForce, 0));

  const kb = preload.split.bolt.stiffness;
  const kc = preload.split.clamped.stiffness;
  const ksum = kb + kc;

  let deltaBoltLoad = 0;
  let deltaClampedLoad = 0;
  if (inputs.external.enabled && ksum > EPS) {
    deltaBoltLoad = (kb / ksum) * Number(inputs.external.axialForce);
    deltaClampedLoad = (kc / ksum) * Number(inputs.external.axialForce);
  }

  const boltForceAfterExternal = preloadForce + deltaBoltLoad;
  const clampForceAfterExternal = preloadForce - deltaClampedLoad;

  const thermalForce = inputs.thermal.enabled
    ? preloadSolver.solveThermal(
        Number(inputs.thermal.deltaT),
        inputs.thermal.perElementDeltaT,
        !!inputs.thermal.usePerElement
      )
    : 0;
  const boltForceAfterThermal = boltForceAfterExternal + thermalForce;
  const clampForceAfterThermal = clampForceAfterExternal - thermalForce;

  const gapAtZeroLoad = Number.isFinite(inputs.contact.gapAtZeroLoad) ? Number(inputs.contact.gapAtZeroLoad) : 0;
  const contact = solveNonlinearContact(
    inputs.contact,
    gapAtZeroLoad,
    boltForceAfterThermal,
    clampForceAfterThermal,
    preload.split.clamped.compliance
  );

  if (inputs.external.enabled && clampForceAfterExternal <= 0) {
    warnings.push('External load relieves clamp force to zero or below; separation likely.');
  }
  if (inputs.contact.enabled && contact.separated) {
    warnings.push('Contact toggle ON: unilateral contact predicts separated state (positive gap).');
  }
  if (inputs.contact.enabled && !contact.converged) {
    warnings.push('Contact solver reached max iterations before tolerance was met.');
  }

  const row = solveRow(inputs.row);

  const assumptions = modelAssumptions();
  const checks = computeDeterministicChecks(inputs, { contact });
  if (!checks.some((c) => c.id.startsWith('bolt-thread-tension'))) {
    warnings.push('No bolt thread tension check limit available (missing yield strengths on bolt-thread materials).');
  }

  const elementResults = preload.elementResults.map((rowEl) => ({
    ...rowEl,
    thermalFreeDeformation:
      elements
        .find((e) => e.id === rowEl.id)
        ?.thermalFreeDeformation(
          inputs.thermal.usePerElement && inputs.thermal.perElementDeltaT && Number.isFinite(inputs.thermal.perElementDeltaT[rowEl.id])
            ? Number(inputs.thermal.perElementDeltaT[rowEl.id])
            : inputs.thermal.deltaT
        ) ?? 0
  }));

  return {
    inputs,
    elementResults,
    totals: {
      compliance: preload.compliance,
      stiffness: preload.stiffness,
      preloadForce,
      preloadDeformation: preload.deformation,
      boltElongation: preload.boltDeformation,
      clampedCompression: preload.clampedDeformation
    },
    split: preload.split,
    torque,
    external: {
      enabled: inputs.external.enabled,
      deltaBoltLoad,
      deltaClampedLoad,
      boltForceAfterExternal,
      clampForceAfterExternal
    },
    thermal: {
      enabled: inputs.thermal.enabled,
      thermalForce,
      boltForceAfterThermal,
      clampForceAfterThermal
    },
    contact,
    row,
    assumptions,
    checks,
    derivation: buildDerivation(),
    warnings,
    errors
  };
}

export function buildNumericExample(units: FastenerSolverInput['units'] = 'imperial'): NumericExampleOutput {
  const steelE = units === 'metric' ? 210000 : 30_000_000;
  const steelAlpha = units === 'metric' ? 12e-6 : 6.7e-6;
  const aluE = units === 'metric' ? 70000 : 10_000_000;
  const aluAlpha = units === 'metric' ? 23e-6 : 12.8e-6;

  const input: FastenerSolverInput = {
    units,
    preload: units === 'metric' ? 60_000 : 13_500,
    torque: {
      enabled: false,
      appliedTorque: units === 'metric' ? 120 : 1062,
      lead: units === 'metric' ? 1.5 : 1 / 13,
      pitchDiameter: units === 'metric' ? 9.026 : 0.405,
      threadHalfAngleDeg: 30,
      threadFriction: 0.12,
      bearingFriction: 0.14,
      bearingMeanDiameter: units === 'metric' ? 14 : 0.55
    },
    external: {
      enabled: true,
      axialForce: units === 'metric' ? 24_000 : 5_400
    },
    thermal: {
      enabled: true,
      deltaT: 60,
      perElementDeltaT: {},
      usePerElement: false
    },
    contact: {
      enabled: true,
      gapAtZeroLoad: 0
    },
    row: {
      enabled: true,
      force: units === 'metric' ? 16_000 : 3_600,
      eccentricity: units === 'metric' ? 50 : 2,
      bolts: [
        { id: 'B1', x: units === 'metric' ? -75 : -3, stiffness: units === 'metric' ? 240_000 : 1_370_000, preload: units === 'metric' ? 20_000 : 4_500 },
        { id: 'B2', x: units === 'metric' ? -25 : -1, stiffness: units === 'metric' ? 240_000 : 1_370_000, preload: units === 'metric' ? 20_000 : 4_500 },
        { id: 'B3', x: units === 'metric' ? 25 : 1, stiffness: units === 'metric' ? 240_000 : 1_370_000, preload: units === 'metric' ? 20_000 : 4_500 },
        { id: 'B4', x: units === 'metric' ? 75 : 3, stiffness: units === 'metric' ? 240_000 : 1_370_000, preload: units === 'metric' ? 20_000 : 4_500 }
      ]
    },
    elements: [
      {
        id: 'bolt-shank',
        label: 'Bolt Shank',
        kind: 'bolt-shank',
        group: 'bolt',
        length: units === 'metric' ? 28 : 1.102,
        area: units === 'metric' ? 58 : 0.0899,
        material: {
          name: 'Bolt Steel',
          youngsModulus: steelE,
          thermalExpansion: steelAlpha,
          yieldStrength: units === 'metric' ? 900 : 130_000,
          bearingStrength: units === 'metric' ? 1200 : 175_000
        }
      },
      {
        id: 'bolt-thread',
        label: 'Bolt Threaded Segment',
        kind: 'bolt-thread',
        group: 'bolt',
        length: units === 'metric' ? 18 : 0.709,
        area: units === 'metric' ? 58 : 0.0899,
        tensileStressArea: units === 'metric' ? 58 : 0.0899,
        material: {
          name: 'Bolt Steel',
          youngsModulus: steelE,
          thermalExpansion: steelAlpha,
          yieldStrength: units === 'metric' ? 900 : 130_000,
          bearingStrength: units === 'metric' ? 1200 : 175_000
        }
      },
      {
        id: 'washer-head-1',
        label: 'Washer Head 1',
        kind: 'washer-head',
        group: 'clamped',
        length: units === 'metric' ? 2 : 0.079,
        area: units === 'metric' ? 180 : 0.279,
        material: {
          name: 'Washer Steel',
          youngsModulus: steelE,
          thermalExpansion: steelAlpha,
          yieldStrength: units === 'metric' ? 650 : 95_000,
          bearingStrength: units === 'metric' ? 900 : 130_000
        }
      },
      {
        id: 'washer-head-2',
        label: 'Washer Head 2',
        kind: 'washer-head',
        group: 'clamped',
        length: units === 'metric' ? 2 : 0.079,
        area: units === 'metric' ? 180 : 0.279,
        material: {
          name: 'Washer Steel',
          youngsModulus: steelE,
          thermalExpansion: steelAlpha,
          yieldStrength: units === 'metric' ? 650 : 95_000,
          bearingStrength: units === 'metric' ? 900 : 130_000
        }
      },
      {
        id: 'member-1',
        label: 'Joint Member 1',
        kind: 'joint-member',
        group: 'clamped',
        length: units === 'metric' ? 10 : 0.394,
        area: units === 'metric' ? 220 : 0.341,
        material: {
          name: 'Aluminum Plate',
          youngsModulus: aluE,
          thermalExpansion: aluAlpha,
          yieldStrength: units === 'metric' ? 345 : 50_000,
          bearingStrength: units === 'metric' ? 655 : 95_000
        }
      },
      {
        id: 'member-2',
        label: 'Joint Member 2',
        kind: 'joint-member',
        group: 'clamped',
        length: units === 'metric' ? 14 : 0.551,
        area: units === 'metric' ? 220 : 0.341,
        material: {
          name: 'Aluminum Plate',
          youngsModulus: aluE,
          thermalExpansion: aluAlpha,
          yieldStrength: units === 'metric' ? 345 : 50_000,
          bearingStrength: units === 'metric' ? 655 : 95_000
        }
      },
      {
        id: 'member-3',
        label: 'Joint Member 3',
        kind: 'joint-member',
        group: 'clamped',
        length: units === 'metric' ? 12 : 0.472,
        area: units === 'metric' ? 220 : 0.341,
        material: {
          name: 'Aluminum Plate',
          youngsModulus: aluE,
          thermalExpansion: aluAlpha,
          yieldStrength: units === 'metric' ? 345 : 50_000,
          bearingStrength: units === 'metric' ? 655 : 95_000
        }
      },
      {
        id: 'washer-nut-1',
        label: 'Washer Nut 1',
        kind: 'washer-nut',
        group: 'clamped',
        length: units === 'metric' ? 2 : 0.079,
        area: units === 'metric' ? 180 : 0.279,
        material: {
          name: 'Washer Steel',
          youngsModulus: steelE,
          thermalExpansion: steelAlpha,
          yieldStrength: units === 'metric' ? 650 : 95_000,
          bearingStrength: units === 'metric' ? 900 : 130_000
        }
      }
    ]
  };

  return {
    input,
    output: computeFastenerSolver(input)
  };
}
