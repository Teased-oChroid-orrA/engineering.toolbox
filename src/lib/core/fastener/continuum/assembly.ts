import { elementStiffnessAxisym } from './element-axisym';
import type { ContinuumMesh, ContinuumModelInput } from './types';

export type GlobalSystem = {
  K: number[][];
  F: number[];
  constrained: Map<number, number>;
};
export type ContactCouplingState = {
  activePairs: boolean[];
  tangentialStickPairs: boolean[];
  lambdaN: number[];
  lambdaT: number[];
  penalty: number;
  tangentialPenalty: number;
  frictionCoeff: number;
  initialGap: number;
};

function zeros(n: number, m: number): number[][] {
  return Array.from({ length: n }, () => Array.from({ length: m }, () => 0));
}

function boundaryEdgesByRegion(mesh: ContinuumMesh, region: 'bolt' | 'outer', atTop: boolean): Array<[number, number]> {
  const zTarget = atTop ? mesh.zLevels[mesh.zLevels.length - 1] : mesh.zLevels[0];
  const counts = new Map<string, { edge: [number, number]; count: number }>();
  const push = (a: number, b: number) => {
    const n1 = mesh.nodes[a];
    const n2 = mesh.nodes[b];
    if (Math.abs(n1.z - zTarget) > 1e-9 || Math.abs(n2.z - zTarget) > 1e-9) return;
    if (Math.abs(n1.r - n2.r) < 1e-12) return;
    const edge: [number, number] = a < b ? [a, b] : [b, a];
    const key = `${edge[0]}-${edge[1]}`;
    const prev = counts.get(key);
    if (prev) prev.count += 1;
    else counts.set(key, { edge, count: 1 });
  };

  for (const el of mesh.elements) {
    if (el.region !== region) continue;
    const [n1, n2, n3, n4] = el.nodeIds;
    push(n1, n2);
    push(n2, n3);
    push(n3, n4);
    push(n4, n1);
  }

  return [...counts.values()]
    .filter((v) => v.count === 1)
    .map((v) => v.edge)
    .sort((a, b) => mesh.nodes[a[0]].r - mesh.nodes[b[0]].r);
}

function addEdgeTractionAxisym(
  mesh: ContinuumMesh,
  F: number[],
  edge: [number, number],
  tz: number
): number {
  const n1 = mesh.nodes[edge[0]];
  const n2 = mesh.nodes[edge[1]];
  const dr = Math.abs(n2.r - n1.r);
  const rMid = 0.5 * (n1.r + n2.r);
  const total = tz * 2 * Math.PI * rMid * dr;

  F[2 * n1.id + 1] += 0.5 * total;
  F[2 * n2.id + 1] += 0.5 * total;
  return total;
}

export function assembleGlobalSystem(mesh: ContinuumMesh, model: ContinuumModelInput): GlobalSystem {
  const ndof = mesh.nodes.length * 2;
  const K = zeros(ndof, ndof);
  const F = new Array(ndof).fill(0);

  for (const el of mesh.elements) {
    const { ke, dof } = elementStiffnessAxisym(mesh, el);
    for (let i = 0; i < dof.length; i++) {
      for (let j = 0; j < dof.length; j++) {
        K[dof[i]][dof[j]] += ke[i][j];
      }
    }
  }

  const areaBolt = Math.PI * model.boltRadius * model.boltRadius;
  const tzTop = -model.pretension.preloadForce / Math.max(areaBolt, 1e-12);
  const tzBottom = model.pretension.preloadForce / Math.max(areaBolt, 1e-12);

  const top = boundaryEdgesByRegion(mesh, 'bolt', true);
  const bottom = boundaryEdgesByRegion(mesh, 'bolt', false);

  for (const edge of top) addEdgeTractionAxisym(mesh, F, edge, tzTop);
  for (const edge of bottom) addEdgeTractionAxisym(mesh, F, edge, tzBottom);

  const constrained = new Map<number, number>();

  if (model.boundary.constrainAxisUr) {
    for (const node of mesh.nodes) {
      if (Math.abs(node.r) < 1e-10) constrained.set(2 * node.id, 0);
    }
  }

  if (model.boundary.constrainBottomOuterUz) {
    const zBot = mesh.zLevels[0];
    for (const node of mesh.nodes) {
      if (Math.abs(node.z - zBot) < 1e-9 && node.r >= model.boltRadius - 1e-9) {
        constrained.set(2 * node.id + 1, 0);
      }
    }
  }

  return { K, F, constrained };
}

export function applyContactCouplingPenalty(
  mesh: ContinuumMesh,
  system: GlobalSystem,
  state: ContactCouplingState,
  frictionEnabled: boolean
): void {
  const pN = Math.max(1e2, state.penalty);
  const pT = Math.max(0, state.tangentialPenalty);

  for (let i = 0; i < mesh.interfacePairs.length; i++) {
    if (!state.activePairs[i]) continue;
    const pair = mesh.interfacePairs[i];
    const br = 2 * pair.boltNodeId;
    const bz = 2 * pair.boltNodeId + 1;
    const or = 2 * pair.outerNodeId;
    const oz = 2 * pair.outerNodeId + 1;
    const w = Math.max(1e-12, pair.weight);
    const lambdaN = Math.max(0, state.lambdaN[i] ?? 0);
    const lambdaT = Number.isFinite(state.lambdaT[i]) ? Number(state.lambdaT[i]) : 0;

    // Normal contact in radial DOF: u_outer_r - u_bolt_r >= 0
    const kn = pN * w;
    system.K[br][br] += kn;
    system.K[or][or] += kn;
    system.K[br][or] -= kn;
    system.K[or][br] -= kn;

    // Multiplier force contribution (equal/opposite pair traction).
    system.F[br] -= lambdaN * w;
    system.F[or] += lambdaN * w;

    // Tangential coupling proxy for friction-enabled mode with AL multiplier.
    if (frictionEnabled && pT > 0 && state.tangentialStickPairs[i]) {
      const kt = pT * w;
      system.K[bz][bz] += kt;
      system.K[oz][oz] += kt;
      system.K[bz][oz] -= kt;
      system.K[oz][bz] -= kt;
      system.F[bz] += lambdaT * w;
      system.F[oz] -= lambdaT * w;
    }
  }
}

export function solveLinearSystem(system: GlobalSystem): { u: number[]; residual: number } {
  const n = system.F.length;
  const A = system.K.map((row) => [...row]);
  const b = [...system.F];

  for (const [dof, value] of system.constrained.entries()) {
    for (let j = 0; j < n; j++) A[dof][j] = 0;
    for (let i = 0; i < n; i++) A[i][dof] = 0;
    A[dof][dof] = 1;
    b[dof] = value;
  }

  const x = gaussianElimination(A, b);
  const r = residualNorm(system.K, x, system.F);
  return { u: x, residual: r };
}

function gaussianElimination(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let k = 0; k < n; k++) {
    let piv = k;
    let max = Math.abs(M[k][k]);
    for (let i = k + 1; i < n; i++) {
      const v = Math.abs(M[i][k]);
      if (v > max) {
        max = v;
        piv = i;
      }
    }
    if (piv !== k) {
      const tmp = M[k];
      M[k] = M[piv];
      M[piv] = tmp;
    }

    const pivot = Math.abs(M[k][k]) < 1e-18 ? (M[k][k] < 0 ? -1e-18 : 1e-18) : M[k][k];
    for (let i = k + 1; i < n; i++) {
      const factor = M[i][k] / pivot;
      if (factor === 0) continue;
      for (let j = k; j <= n; j++) {
        M[i][j] -= factor * M[k][j];
      }
    }
  }

  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = M[i][n];
    for (let j = i + 1; j < n; j++) sum -= M[i][j] * x[j];
    const piv = Math.abs(M[i][i]) < 1e-18 ? (M[i][i] < 0 ? -1e-18 : 1e-18) : M[i][i];
    x[i] = sum / piv;
  }
  return x;
}

function residualNorm(K: number[][], x: number[], f: number[]): number {
  let normF = 0;
  let normR = 0;
  for (let i = 0; i < f.length; i++) {
    let kx = 0;
    for (let j = 0; j < f.length; j++) kx += K[i][j] * x[j];
    const r = kx - f[i];
    normR += r * r;
    normF += f[i] * f[i];
  }
  return Math.sqrt(normR) / Math.max(1e-12, Math.sqrt(normF));
}

export function nodalReaction(system: GlobalSystem, u: number[], dof: number): number {
  let kx = 0;
  for (let j = 0; j < system.F.length; j++) kx += system.K[dof][j] * u[j];
  return kx - system.F[dof];
}

export function contactGapProxyByPair(mesh: ContinuumMesh, u: number[]): number[] {
  return mesh.interfacePairs.map((pair) => {
    const urBolt = u[2 * pair.boltNodeId] ?? 0;
    const urOuter = u[2 * pair.outerNodeId] ?? 0;
    return urOuter - urBolt;
  });
}

export function contactSlipProxyByPair(mesh: ContinuumMesh, u: number[]): number[] {
  return mesh.interfacePairs.map((pair) => {
    const uzBolt = u[2 * pair.boltNodeId + 1] ?? 0;
    const uzOuter = u[2 * pair.outerNodeId + 1] ?? 0;
    return uzOuter - uzBolt;
  });
}
