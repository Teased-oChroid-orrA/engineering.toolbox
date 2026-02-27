import type { Edge, Point3D } from './SurfaceOrchestratorDeps';

export type DuplicateLineGroup = {
  key: string;
  lineIds: number[];
};

export type NonManifoldIncident = {
  pointIdx: number;
  valence: number;
};

export type SurfaceIntegrityReport = {
  orphanPointIds: number[];
  duplicateLineGroups: DuplicateLineGroup[];
  nonManifoldIncidents: NonManifoldIncident[];
};

export function analyzeSurfaceIntegrity(
  points: Point3D[],
  edges: Edge[],
  nonManifoldThreshold: number
): SurfaceIntegrityReport {
  const valence = new Array(points.length).fill(0);
  const duplicateMap = new Map<string, number[]>();

  edges.forEach(([a, b], idx) => {
    if (a >= 0 && a < points.length) valence[a] += 1;
    if (b >= 0 && b < points.length) valence[b] += 1;
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    const key = `${lo}-${hi}`;
    const existing = duplicateMap.get(key);
    if (existing) existing.push(idx);
    else duplicateMap.set(key, [idx]);
  });

  const orphanPointIds: number[] = [];
  valence.forEach((degree, pointIdx) => {
    if (degree === 0) orphanPointIds.push(pointIdx);
  });

  const duplicateLineGroups: DuplicateLineGroup[] = [];
  for (const [key, lineIds] of duplicateMap.entries()) {
    if (lineIds.length > 1) duplicateLineGroups.push({ key, lineIds: [...lineIds].sort((a, b) => a - b) });
  }

  const threshold = Math.max(2, Math.floor(nonManifoldThreshold));
  const nonManifoldIncidents: NonManifoldIncident[] = [];
  valence.forEach((degree, pointIdx) => {
    if (degree > threshold) nonManifoldIncidents.push({ pointIdx, valence: degree });
  });

  return {
    orphanPointIds,
    duplicateLineGroups,
    nonManifoldIncidents
  };
}
