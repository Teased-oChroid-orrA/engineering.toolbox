import type { FastenerSolverInput, MaterialInput } from '../types';
import { continuumAssumptions } from './assumptions';
import {
  applyContactCouplingPenalty,
  assembleGlobalSystem,
  contactGapProxyByPair,
  contactSlipProxyByPair,
  nodalReaction,
  solveLinearSystem
} from './assembly';
import { buildContinuumMesh } from './mesh';
import { extractFields, layerForceSummary } from './postprocess';
import type { ContinuumLayerInput, ContinuumMesh, ContinuumModelInput, ContinuumSolverOutput } from './types';

function positive(v: number, fallback: number): number {
  return Number.isFinite(v) && v > 1e-12 ? v : fallback;
}

function aggregateBoltMaterial(input: FastenerSolverInput): MaterialInput {
  const boltEls = input.elements.filter((e) => e.group === 'bolt');
  const fallback = boltEls[0]?.material ?? input.elements[0]?.material ?? { name: 'Bolt', youngsModulus: 1, poissonsRatio: 0.3 };
  if (boltEls.length === 0) return fallback;

  let wE = 0;
  let wNu = 0;
  let wAlpha = 0;
  let wYield = 0;
  let wBear = 0;
  let wt = 0;

  for (const e of boltEls) {
    const w = positive(e.length * (e.tensileStressArea ?? e.area), 1);
    wt += w;
    wE += w * e.material.youngsModulus;
    wNu += w * (e.material.poissonsRatio ?? 0.3);
    wAlpha += w * (e.material.thermalExpansion ?? 0);
    wYield += w * (e.material.yieldStrength ?? 0);
    wBear += w * (e.material.bearingStrength ?? 0);
  }

  return {
    name: `${fallback.name} (aggregated)`,
    youngsModulus: wE / wt,
    poissonsRatio: wNu / wt,
    thermalExpansion: wAlpha / wt,
    yieldStrength: wYield / wt,
    bearingStrength: wBear / wt
  };
}

function buildLayersFromFastener(input: FastenerSolverInput): ContinuumLayerInput[] {
  const clamped = input.elements.filter((e) => e.group === 'clamped');
  if (clamped.length > 0) {
    return clamped.map((e, i) => ({
      id: e.id,
      label: e.label || `Layer ${i + 1}`,
      thickness: positive(e.length, 1),
      outerMaterial: e.material
    }));
  }

  return [
    {
      id: 'fallback-layer',
      label: 'Fallback Layer',
      thickness: positive(input.elements.reduce((s, e) => s + e.length, 0), 1),
      outerMaterial: input.elements[0]?.material ?? { name: 'Member', youngsModulus: 1, poissonsRatio: 0.3 }
    }
  ];
}

function inferBoltRadius(input: FastenerSolverInput): number {
  const boltAreas = input.elements
    .filter((e) => e.group === 'bolt')
    .map((e) => positive(e.tensileStressArea ?? e.area, 1e-8));
  if (boltAreas.length === 0) return input.units === 'metric' ? 5 : 0.2;
  const meanArea = boltAreas.reduce((s, a) => s + a, 0) / boltAreas.length;
  return Math.sqrt(meanArea / Math.PI);
}

function inferOuterRadius(input: FastenerSolverInput, boltRadius: number): number {
  const outerAreas = input.elements.filter((e) => e.group === 'clamped').map((e) => positive(e.area, Math.PI * boltRadius * boltRadius * 4));
  if (outerAreas.length === 0) return boltRadius * 3;
  const meanArea = outerAreas.reduce((s, a) => s + a, 0) / outerAreas.length;
  const total = meanArea + Math.PI * boltRadius * boltRadius;
  return Math.sqrt(total / Math.PI);
}

function preloadFromInput(input: FastenerSolverInput): number {
  if (!input.torque.enabled) return positive(input.preload, 1);
  const lead = positive(input.torque.lead, 1e-9);
  const dm = positive(input.torque.pitchDiameter, 1e-9);
  const alpha = (Math.PI / 180) * Number(input.torque.threadHalfAngleDeg);
  const muT = Math.max(0, Number(input.torque.threadFriction));
  const muB = Math.max(0, Number(input.torque.bearingFriction));
  const dbm = positive(input.torque.bearingMeanDiameter, 1e-9);
  const denom = lead / (2 * Math.PI) + (dm * muT) / (2 * Math.cos(alpha)) + (muB * dbm) / 2;
  if (!Number.isFinite(denom) || denom <= 1e-12) return positive(input.preload, 1);
  return Math.max(0, Number(input.torque.appliedTorque) / denom);
}

export function buildContinuumModelFromFastener(input: FastenerSolverInput): ContinuumModelInput {
  const boltRadius = inferBoltRadius(input);
  const outerRadius = inferOuterRadius(input, boltRadius);
  return {
    units: input.units,
    boltRadius,
    outerRadius,
    boltMaterial: aggregateBoltMaterial(input),
    layers: buildLayersFromFastener(input),
    mesh: {
      nrBolt: 4,
      nrOuter: 8,
      nzPerLayer: 3
    },
    pretension: {
      preloadForce: preloadFromInput(input)
    },
    boundary: {
      constrainBottomOuterUz: true,
      constrainAxisUr: true
    },
    contact: {
      enabled: false,
      frictionEnabled: false,
      frictionCoefficient: 0.3,
      initialRadialGap: 0
    }
  };
}

export function solveContinuumModel(model: ContinuumModelInput): ContinuumSolverOutput {
  const warnings: string[] = [];
  const errors: string[] = [];
  const assumptions = continuumAssumptions();

  if (model.layers.length === 0) {
    errors.push('At least one outer layer is required for continuum analysis.');
  }
  if (model.outerRadius <= model.boltRadius) {
    errors.push('Outer radius must be greater than bolt radius.');
  }

  let mesh: ContinuumMesh;
  try {
    mesh = buildContinuumMesh(model);
  } catch (err) {
    errors.push(err instanceof Error ? err.message : 'Failed to build continuum mesh.');
    return {
      model,
      mesh: { nodeCount: 0, elementCount: 0 },
      solved: { converged: false, residualNorm: Number.POSITIVE_INFINITY },
      preload: {
        inputForce: model.pretension.preloadForce,
        topBoltEdgeForce: 0,
        bottomBoltEdgeForce: 0,
        bottomOuterReaction: 0
      },
      contact: {
        enabled: model.contact.enabled,
        frictionEnabled: model.contact.frictionEnabled,
        activePairs: 0,
        openPairs: 0,
        stickPairs: 0,
        slipPairs: 0,
        iterations: 0,
        maxPenetration: 0,
        maxTangentialSlip: 0,
        complementarityResidual: 0,
        normalResultant: 0,
        tangentialResultant: 0
      },
      fields: [],
      layers: [],
      assumptions,
      warnings,
      errors
    };
  }
  let system = assembleGlobalSystem(mesh, model);
  let u: number[] = [];
  let residual = Number.POSITIVE_INFINITY;
  let activePairs = mesh.interfacePairs.map(() => !!model.contact.enabled);
  let tangentialStickPairs = mesh.interfacePairs.map(() => false);
  let lambdaN = mesh.interfacePairs.map(() => 0);
  let lambdaT = mesh.interfacePairs.map(() => 0);
  let iterations = 0;

  if (model.contact.enabled) {
    const penalty = Math.max(1e6, model.boltMaterial.youngsModulus * 0.1);
    const tangentialPenalty = model.contact.frictionEnabled ? penalty * 0.15 : 0;
    const mu = model.contact.frictionEnabled ? Math.max(0, Number(model.contact.frictionCoefficient ?? 0.3)) : 0;
    const initialGap = Number.isFinite(model.contact.initialRadialGap) ? Number(model.contact.initialRadialGap) : 0;
    for (let iter = 0; iter < 30; iter++) {
      iterations = iter + 1;
      system = assembleGlobalSystem(mesh, model);
      applyContactCouplingPenalty(
        mesh,
        system,
        {
          activePairs,
          tangentialStickPairs,
          lambdaN,
          lambdaT,
          penalty,
          tangentialPenalty,
          frictionCoeff: mu,
          initialGap
        },
        model.contact.frictionEnabled
      );
      const solved = solveLinearSystem(system);
      u = solved.u;
      residual = solved.residual;

      const gaps = contactGapProxyByPair(mesh, u).map((g) => g - initialGap);
      const slips = contactSlipProxyByPair(mesh, u);
      let maxUpdate = 0;
      for (let i = 0; i < gaps.length; i++) {
        const g = gaps[i];
        const active = g <= 0;
        activePairs[i] = active;

        const nextLn = active ? Math.max(0, lambdaN[i] - penalty * g) : 0;
        maxUpdate = Math.max(maxUpdate, Math.abs(nextLn - lambdaN[i]));
        lambdaN[i] = nextLn;

        if (model.contact.frictionEnabled && active) {
          const trial = lambdaT[i] + tangentialPenalty * slips[i];
          const lim = mu * lambdaN[i];
          const isStick = Math.abs(trial) <= lim + 1e-9;
          tangentialStickPairs[i] = isStick;
          const projected = isStick ? trial : Math.max(-lim, Math.min(lim, trial));
          maxUpdate = Math.max(maxUpdate, Math.abs(projected - lambdaT[i]));
          lambdaT[i] = projected;
        } else {
          tangentialStickPairs[i] = false;
          maxUpdate = Math.max(maxUpdate, Math.abs(lambdaT[i]));
          lambdaT[i] = 0;
        }
      }
      if (maxUpdate < 1e-3 && residual < 1e-6) break;
    }
  } else {
    const solved = solveLinearSystem(system);
    u = solved.u;
    residual = solved.residual;
  }
  const activePairCount = activePairs.filter((a) => a).length;
  const openPairCount = activePairs.length - activePairCount;
  const stickPairs = tangentialStickPairs.filter((s, i) => s && activePairs[i]).length;
  const slipPairs = Math.max(0, activePairCount - stickPairs);
  const gapsFinal = contactGapProxyByPair(mesh, u).map((g) => g - (Number.isFinite(model.contact.initialRadialGap) ? Number(model.contact.initialRadialGap) : 0));
  const slipsFinal = contactSlipProxyByPair(mesh, u);
  const maxPenetration = Math.max(0, ...gapsFinal.map((g) => (g < 0 ? -g : 0)));
  const maxSlip = Math.max(0, ...slipsFinal.map((s) => Math.abs(s)));
  const complementarityResidual = gapsFinal.reduce((s, g, i) => s + Math.abs(Math.max(0, lambdaN[i]) * Math.max(0, -g)), 0);
  const normalResultant = mesh.interfacePairs.reduce((s, p, i) => s + Math.max(0, lambdaN[i]) * p.weight, 0);
  const tangentialResultant = mesh.interfacePairs.reduce((s, p, i) => s + Math.abs(lambdaT[i]) * p.weight, 0);

  const fields = extractFields(mesh, model, u);
  const layers = layerForceSummary(model, fields);

  if (model.contact.enabled) {
    const inactive = activePairs.filter((a) => !a).length;
    if (inactive > 0) {
      warnings.push(`Contact active-set indicates ${inactive} open interface node pair(s).`);
    }
  }

  const topBoltUzDofs = mesh.nodes
    .filter((n) => Math.abs(n.z - mesh.zLevels[mesh.zLevels.length - 1]) < 1e-9 && n.r <= model.boltRadius + 1e-9)
    .map((n) => 2 * n.id + 1);
  const bottomBoltUzDofs = mesh.nodes
    .filter((n) => Math.abs(n.z - mesh.zLevels[0]) < 1e-9 && n.r <= model.boltRadius + 1e-9)
    .map((n) => 2 * n.id + 1);
  const bottomOuterUzDofs = mesh.nodes
    .filter((n) => Math.abs(n.z - mesh.zLevels[0]) < 1e-9 && n.r >= model.boltRadius - 1e-9)
    .map((n) => 2 * n.id + 1);

  const topBoltEdgeForce = topBoltUzDofs.reduce((s, dof) => s + system.F[dof], 0);
  const bottomBoltEdgeForce = bottomBoltUzDofs.reduce((s, dof) => s + system.F[dof], 0);
  const bottomOuterReaction = bottomOuterUzDofs.reduce((s, dof) => s + nodalReaction(system, u, dof), 0);

  return {
    model,
    mesh: {
      nodeCount: mesh.nodes.length,
      elementCount: mesh.elements.length
    },
    solved: {
      converged: Number.isFinite(residual) && residual < 1e-6,
      residualNorm: residual
    },
    preload: {
      inputForce: model.pretension.preloadForce,
      topBoltEdgeForce,
      bottomBoltEdgeForce,
      bottomOuterReaction
    },
    contact: {
      enabled: model.contact.enabled,
      frictionEnabled: model.contact.frictionEnabled,
      activePairs: activePairCount,
      openPairs: openPairCount,
      stickPairs,
      slipPairs,
      iterations,
      maxPenetration,
      maxTangentialSlip: maxSlip,
      complementarityResidual,
      normalResultant,
      tangentialResultant
    },
    fields,
    layers,
    assumptions,
    warnings,
    errors
  };
}
