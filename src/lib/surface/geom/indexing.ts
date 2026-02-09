import type { Point3D } from '../types';

export function activeFitPointIds(cylUseSelection: boolean, selectedPointIds: number[], points: Point3D[]) {
  if (cylUseSelection && selectedPointIds.length > 0) return [...selectedPointIds];
  return points.map((_, i) => i);
}

export function activeFitPointsFromIds(ids: number[], points: Point3D[]) {
  return ids.map((i) => points[i]).filter(Boolean);
}

export function mapSubsetOutliersToGlobal(ids: number[], outlierIndices: number[]) {
  return outlierIndices.map((j) => ids[j]).filter((v) => Number.isFinite(v));
}

