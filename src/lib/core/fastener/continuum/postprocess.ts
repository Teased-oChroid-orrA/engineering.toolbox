import { elementFieldCenter } from './element-axisym';
import type {
  ContinuumElementField,
  ContinuumLayerResult,
  ContinuumMesh,
  ContinuumModelInput
} from './types';

export function extractFields(mesh: ContinuumMesh, model: ContinuumModelInput, u: number[]): ContinuumElementField[] {
  return mesh.elements.map((el) => {
    const c = elementFieldCenter(mesh, el, u);
    const volumeWeight = c.detJ * 2 * Math.PI * c.rMid * 4;
    return {
      elementId: el.id,
      layerId: el.layerId,
      region: el.region,
      sigmaR: c.sigma[0],
      sigmaZ: c.sigma[1],
      sigmaTheta: c.sigma[2],
      tauRZ: c.sigma[3],
      epsilonR: c.epsilon[0],
      epsilonZ: c.epsilon[1],
      epsilonTheta: c.epsilon[2],
      gammaRZ: c.epsilon[3],
      rMid: c.rMid,
      zMid: c.zMid,
      volumeWeight
    };
  });
}

function weightedAverageSigmaZ(rows: ContinuumElementField[]): number {
  const den = rows.reduce((s, r) => s + r.volumeWeight, 0);
  if (den <= 1e-18) return 0;
  return rows.reduce((s, r) => s + r.sigmaZ * r.volumeWeight, 0) / den;
}

export function layerForceSummary(
  model: ContinuumModelInput,
  fields: ContinuumElementField[]
): ContinuumLayerResult[] {
  const areaBolt = Math.PI * model.boltRadius * model.boltRadius;
  const areaOuter = Math.PI * (model.outerRadius * model.outerRadius - model.boltRadius * model.boltRadius);

  let z0 = 0;
  const out: ContinuumLayerResult[] = [];

  for (const layer of model.layers) {
    const z1 = z0 + layer.thickness;
    const layerRows = fields.filter((f) => f.zMid >= z0 - 1e-9 && f.zMid <= z1 + 1e-9);
    const boltRows = layerRows.filter((f) => f.region === 'bolt');
    const outerRows = layerRows.filter((f) => f.region === 'outer');

    const sigmaBolt = weightedAverageSigmaZ(boltRows);
    const sigmaOuter = weightedAverageSigmaZ(outerRows);

    const boltForce = sigmaBolt * areaBolt;
    const outerForce = sigmaOuter * areaOuter;
    const prevBolt = out.length > 0 ? out[out.length - 1].boltForce : boltForce;
    const transferredToOuter = prevBolt - boltForce;

    out.push({
      layerId: layer.id,
      label: layer.label,
      z0,
      z1,
      boltForce,
      outerForce,
      transferredToOuter
    });

    z0 = z1;
  }

  return out;
}
