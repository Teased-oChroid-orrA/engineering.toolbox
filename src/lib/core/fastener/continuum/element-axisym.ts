import type { ContinuumElement, ContinuumMesh } from './types';

export type ElementMatrices = {
  ke: number[][];
  dof: number[];
};

export type ElementFieldAtCenter = {
  epsilon: [number, number, number, number];
  sigma: [number, number, number, number];
  rMid: number;
  zMid: number;
  detJ: number;
};

const GAUSS = [
  { xi: -1 / Math.sqrt(3), w: 1 },
  { xi: 1 / Math.sqrt(3), w: 1 }
];

function zeros(n: number, m: number): number[][] {
  return Array.from({ length: n }, () => Array.from({ length: m }, () => 0));
}

function transpose(a: number[][]): number[][] {
  const n = a.length;
  const m = a[0].length;
  const t = zeros(m, n);
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) t[j][i] = a[i][j];
  return t;
}

function multiply(a: number[][], b: number[][]): number[][] {
  const n = a.length;
  const k = a[0].length;
  const m = b[0].length;
  const out = zeros(n, m);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      let sum = 0;
      for (let p = 0; p < k; p++) sum += a[i][p] * b[p][j];
      out[i][j] = sum;
    }
  }
  return out;
}

function shape(xi: number, eta: number): [number, number, number, number] {
  return [
    0.25 * (1 - xi) * (1 - eta),
    0.25 * (1 + xi) * (1 - eta),
    0.25 * (1 + xi) * (1 + eta),
    0.25 * (1 - xi) * (1 + eta)
  ];
}

function shapeDerivatives(xi: number, eta: number) {
  const dNdxi = [
    -0.25 * (1 - eta),
    0.25 * (1 - eta),
    0.25 * (1 + eta),
    -0.25 * (1 + eta)
  ];
  const dNdeta = [
    -0.25 * (1 - xi),
    -0.25 * (1 + xi),
    0.25 * (1 + xi),
    0.25 * (1 - xi)
  ];
  return { dNdxi, dNdeta };
}

function dMatrix(E: number, nu: number): number[][] {
  const n = Math.max(-0.49, Math.min(0.49, nu));
  const e = Math.max(1e-9, E);
  const lam = (e * n) / ((1 + n) * (1 - 2 * n));
  const mu = e / (2 * (1 + n));
  return [
    [lam + 2 * mu, lam, lam, 0],
    [lam, lam + 2 * mu, lam, 0],
    [lam, lam, lam + 2 * mu, 0],
    [0, 0, 0, mu]
  ];
}

function invert2(a: number[][]): { inv: number[][]; det: number } {
  const det = a[0][0] * a[1][1] - a[0][1] * a[1][0];
  const safeDet = Math.abs(det) < 1e-18 ? (det < 0 ? -1e-18 : 1e-18) : det;
  const inv = [
    [a[1][1] / safeDet, -a[0][1] / safeDet],
    [-a[1][0] / safeDet, a[0][0] / safeDet]
  ];
  return { inv, det: safeDet };
}

function bMatrixForQ4(
  coords: Array<{ r: number; z: number }>,
  xi: number,
  eta: number
): { B: number[][]; detJ: number; r: number; z: number; N: number[] } {
  const { dNdxi, dNdeta } = shapeDerivatives(xi, eta);
  const N = shape(xi, eta);

  let j11 = 0;
  let j12 = 0;
  let j21 = 0;
  let j22 = 0;
  let r = 0;
  let z = 0;

  for (let i = 0; i < 4; i++) {
    j11 += dNdxi[i] * coords[i].r;
    j12 += dNdxi[i] * coords[i].z;
    j21 += dNdeta[i] * coords[i].r;
    j22 += dNdeta[i] * coords[i].z;
    r += N[i] * coords[i].r;
    z += N[i] * coords[i].z;
  }

  const { inv, det } = invert2([
    [j11, j12],
    [j21, j22]
  ]);

  const dNdr: number[] = [];
  const dNdz: number[] = [];
  for (let i = 0; i < 4; i++) {
    dNdr.push(inv[0][0] * dNdxi[i] + inv[0][1] * dNdeta[i]);
    dNdz.push(inv[1][0] * dNdxi[i] + inv[1][1] * dNdeta[i]);
  }

  const rr = Math.max(r, 1e-9);
  const B = zeros(4, 8);
  for (let i = 0; i < 4; i++) {
    const c = 2 * i;
    B[0][c] = dNdr[i];
    B[1][c + 1] = dNdz[i];
    B[2][c] = N[i] / rr;
    B[3][c] = dNdz[i];
    B[3][c + 1] = dNdr[i];
  }

  return { B, detJ: det, r: rr, z, N };
}

export function elementStiffnessAxisym(mesh: ContinuumMesh, element: ContinuumElement): ElementMatrices {
  const coords = element.nodeIds.map((id) => mesh.nodes[id]);
  const E = Math.max(1e-9, Number(element.material.youngsModulus));
  const nu = Number.isFinite(element.material.poissonsRatio) ? Number(element.material.poissonsRatio) : 0.3;
  const D = dMatrix(E, nu);

  const ke = zeros(8, 8);

  for (const gx of GAUSS) {
    for (const gy of GAUSS) {
      const { B, detJ, r } = bMatrixForQ4(coords, gx.xi, gy.xi);
      const Bt = transpose(B);
      const BtD = multiply(Bt, D);
      const BtDB = multiply(BtD, B);
      const w = gx.w * gy.w * detJ * 2 * Math.PI * r;
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
          ke[i][j] += BtDB[i][j] * w;
        }
      }
    }
  }

  const dof: number[] = [];
  for (const nid of element.nodeIds) {
    dof.push(2 * nid, 2 * nid + 1);
  }

  return { ke, dof };
}

export function elementFieldCenter(
  mesh: ContinuumMesh,
  element: ContinuumElement,
  displacement: number[]
): ElementFieldAtCenter {
  const coords = element.nodeIds.map((id) => mesh.nodes[id]);
  const E = Math.max(1e-9, Number(element.material.youngsModulus));
  const nu = Number.isFinite(element.material.poissonsRatio) ? Number(element.material.poissonsRatio) : 0.3;
  const D = dMatrix(E, nu);

  const { B, detJ, r, z } = bMatrixForQ4(coords, 0, 0);
  const ue = new Array(8).fill(0);
  for (let i = 0; i < 4; i++) {
    const nid = element.nodeIds[i];
    ue[2 * i] = displacement[2 * nid] ?? 0;
    ue[2 * i + 1] = displacement[2 * nid + 1] ?? 0;
  }

  const epsilon: [number, number, number, number] = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) {
    let s = 0;
    for (let j = 0; j < 8; j++) s += B[i][j] * ue[j];
    epsilon[i] = s;
  }

  const sigma: [number, number, number, number] = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) {
    let s = 0;
    for (let j = 0; j < 4; j++) s += D[i][j] * epsilon[j];
    sigma[i] = s;
  }

  return {
    epsilon,
    sigma,
    rMid: r,
    zMid: z,
    detJ
  };
}
