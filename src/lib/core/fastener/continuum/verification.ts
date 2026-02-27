import { solveContinuumModel } from './solve';
import type { ContinuumModelInput } from './types';

export type RefinementLevelResult = {
  factor: number;
  nodeCount: number;
  elementCount: number;
  topBoltEdgeForce: number;
  bottomOuterReaction: number;
  residualNorm: number;
};

export type RefinementStudyResult = {
  levels: RefinementLevelResult[];
  deltaTopForceLastStep: number;
  deltaReactionLastStep: number;
};

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

export function runMeshRefinementStudy(model: ContinuumModelInput, factors = [1, 2, 3]): RefinementStudyResult {
  const levels: RefinementLevelResult[] = [];

  for (const factorRaw of factors) {
    const factor = Math.max(1, Math.floor(factorRaw));
    const m = clone(model);
    m.mesh.nrBolt = Math.max(1, Math.floor(model.mesh.nrBolt * factor));
    m.mesh.nrOuter = Math.max(1, Math.floor(model.mesh.nrOuter * factor));
    m.mesh.nzPerLayer = Math.max(1, Math.floor(model.mesh.nzPerLayer * factor));

    const out = solveContinuumModel(m);
    levels.push({
      factor,
      nodeCount: out.mesh.nodeCount,
      elementCount: out.mesh.elementCount,
      topBoltEdgeForce: out.preload.topBoltEdgeForce,
      bottomOuterReaction: out.preload.bottomOuterReaction,
      residualNorm: out.solved.residualNorm
    });
  }

  const n = levels.length;
  const deltaTopForceLastStep =
    n >= 2
      ? Math.abs(levels[n - 1].topBoltEdgeForce - levels[n - 2].topBoltEdgeForce) /
        Math.max(1e-12, Math.abs(levels[n - 1].topBoltEdgeForce))
      : 0;
  const deltaReactionLastStep =
    n >= 2
      ? Math.abs(levels[n - 1].bottomOuterReaction - levels[n - 2].bottomOuterReaction) /
        Math.max(
          1e-12,
          Math.abs(levels[n - 1].topBoltEdgeForce),
          Math.abs(levels[n - 2].topBoltEdgeForce),
          Math.abs(levels[n - 1].bottomOuterReaction),
          Math.abs(levels[n - 2].bottomOuterReaction)
        )
      : 0;

  return { levels, deltaTopForceLastStep, deltaReactionLastStep };
}
