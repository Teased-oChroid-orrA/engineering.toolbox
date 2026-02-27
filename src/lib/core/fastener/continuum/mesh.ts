import type { ContinuumElement, ContinuumMesh, ContinuumModelInput, ContinuumNode } from './types';

const EPS = 1e-12;

function positive(v: number, fallback: number): number {
  return Number.isFinite(v) && v > EPS ? v : fallback;
}

function buildLevels(total: number, subdivisions: number): number[] {
  const n = Math.max(1, Math.floor(subdivisions));
  const out: number[] = [];
  for (let i = 0; i <= n; i++) out.push((i / n) * total);
  return out;
}

function mergeLevels(a: number[], b: number[]): number[] {
  const merged = [...a, ...b].sort((x, y) => x - y);
  const out: number[] = [];
  for (const v of merged) {
    if (out.length === 0 || Math.abs(v - out[out.length - 1]) > 1e-10) out.push(v);
  }
  return out;
}

export function buildContinuumMesh(model: ContinuumModelInput): ContinuumMesh {
  const boltRadius = positive(model.boltRadius, 1);
  const outerRadius = Math.max(positive(model.outerRadius, boltRadius * 2), boltRadius * 1.1);

  const nrBolt = Math.max(1, Math.floor(model.mesh.nrBolt));
  const nrOuter = Math.max(1, Math.floor(model.mesh.nrOuter));

  const rBolt = buildLevels(boltRadius, nrBolt);
  const outerSpan = outerRadius - boltRadius;
  const rOuter = buildLevels(outerSpan, nrOuter).map((v) => v + boltRadius);
  const rLevels = mergeLevels(rBolt, rOuter);

  const zLevels: number[] = [0];
  let zCursor = 0;
  const nz = Math.max(1, Math.floor(model.mesh.nzPerLayer));
  for (const layer of model.layers) {
    const t = positive(layer.thickness, 1);
    for (let i = 1; i <= nz; i++) {
      zLevels.push(zCursor + (i / nz) * t);
    }
    zCursor += t;
  }

  const nodes: ContinuumNode[] = [];
  const boltNodeIdByIJ = new Map<string, number>();
  const outerNodeIdByIJ = new Map<string, number>();
  const interfacePairsRaw: Array<{ z: number; r: number; boltNodeId: number; outerNodeId: number }> = [];

  const interfaceIndex = rLevels.findIndex((r) => Math.abs(r - boltRadius) < 1e-10);

  for (let iz = 0; iz < zLevels.length; iz++) {
    for (let ir = 0; ir < rLevels.length; ir++) {
      const r = rLevels[ir];

      if (r < boltRadius - 1e-10) {
        const id = nodes.length;
        nodes.push({ id, r, z: zLevels[iz] });
        boltNodeIdByIJ.set(`${ir},${iz}`, id);
      } else if (r > boltRadius + 1e-10) {
        const id = nodes.length;
        nodes.push({ id, r, z: zLevels[iz] });
        outerNodeIdByIJ.set(`${ir},${iz}`, id);
      } else {
        const boltId = nodes.length;
        nodes.push({ id: boltId, r, z: zLevels[iz] });
        boltNodeIdByIJ.set(`${ir},${iz}`, boltId);

        const outerId = nodes.length;
        nodes.push({ id: outerId, r, z: zLevels[iz] });
        outerNodeIdByIJ.set(`${ir},${iz}`, outerId);

        interfacePairsRaw.push({ z: zLevels[iz], r, boltNodeId: boltId, outerNodeId: outerId });
      }
    }
  }

  const layerByZ = (zMid: number) => {
    let z0 = 0;
    for (const layer of model.layers) {
      const z1 = z0 + positive(layer.thickness, 1);
      if (zMid >= z0 - 1e-9 && zMid <= z1 + 1e-9) return layer;
      z0 = z1;
    }
    return model.layers[model.layers.length - 1];
  };

  const elements: ContinuumElement[] = [];

  for (let iz = 0; iz < zLevels.length - 1; iz++) {
    for (let ir = 0; ir < rLevels.length - 1; ir++) {
      const rMid = 0.5 * (rLevels[ir] + rLevels[ir + 1]);
      const zMid = 0.5 * (zLevels[iz] + zLevels[iz + 1]);
      const layer = layerByZ(zMid);
      const region: 'bolt' | 'outer' = rMid <= boltRadius ? 'bolt' : 'outer';
      const material = region === 'bolt' ? model.boltMaterial : layer.outerMaterial;
      const map = region === 'bolt' ? boltNodeIdByIJ : outerNodeIdByIJ;
      const n1 = map.get(`${ir},${iz}`);
      const n2 = map.get(`${ir + 1},${iz}`);
      const n3 = map.get(`${ir + 1},${iz + 1}`);
      const n4 = map.get(`${ir},${iz + 1}`);
      if (n1 == null || n2 == null || n3 == null || n4 == null) continue;

      elements.push({
        id: elements.length,
        nodeIds: [n1, n2, n3, n4],
        layerId: layer.id,
        region,
        material
      });
    }
  }

  // If r=boltRadius is not exactly on a radial level, there is no interface pair, which is invalid for contact.
  if (interfaceIndex < 0) {
    throw new Error('Radial discretization does not include bolt radius interface.');
  }

  const interfacePairs = interfacePairsRaw
    .sort((a, b) => a.z - b.z)
    .map((pair, i, arr) => {
      const zPrev = i === 0 ? arr[i].z : arr[i - 1].z;
      const zNext = i === arr.length - 1 ? arr[i].z : arr[i + 1].z;
      const dz = i === 0 || i === arr.length - 1 ? Math.max(1e-9, Math.abs(zNext - zPrev)) : Math.max(1e-9, 0.5 * Math.abs(zNext - zPrev));
      const weight = 2 * Math.PI * pair.r * dz;
      return { ...pair, weight };
    });

  return { nodes, elements, zLevels, rLevels, interfacePairs };
}
