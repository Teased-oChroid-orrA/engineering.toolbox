import type { Point3D } from '../types';
import { bestFitCylinder, bestFitPlane, sectionSlices } from '../api/surfaceApi';
import { activeFitPointIds, activeFitPointsFromIds, mapSubsetOutliersToGlobal } from '../geom/indexing';

type EvalParams = {
  evalTol: number;
  evalSigmaMult: number;
  evalMaxOutliers: number;
};

export async function runBestFitPlane(
  points: Point3D[],
  selectedPointIds: number[],
  evalUseSelection: boolean,
  params: EvalParams
) {
  const fitPoints = evalUseSelection && selectedPointIds.length > 0
    ? selectedPointIds.map((i) => points[i]).filter(Boolean)
    : points;
  return bestFitPlane({
    points: fitPoints,
    tol: Number(params.evalTol),
    sigmaMult: Number(params.evalSigmaMult),
    maxOutliers: Number(params.evalMaxOutliers)
  });
}

export async function runSectionSlices(
  points: Point3D[],
  selectedPointIds: number[],
  evalUseSelection: boolean,
  axis: 'x' | 'y' | 'z',
  bins: number,
  thickness: number
) {
  return sectionSlices({
    points: evalUseSelection && selectedPointIds.length > 0
      ? selectedPointIds.map((i) => points[i]).filter(Boolean)
      : points,
    axis,
    bins: Number(bins),
    thickness: Number(thickness)
  });
}

export async function runBestFitCylinder(
  points: Point3D[],
  selectedPointIds: number[],
  cylUseSelection: boolean,
  params: EvalParams
) {
  const ids = activeFitPointIds(cylUseSelection, selectedPointIds, points);
  const fitPoints = activeFitPointsFromIds(ids, points);
  const res = await bestFitCylinder({
    points: fitPoints,
    tol: Number(params.evalTol),
    sigmaMult: Number(params.evalSigmaMult),
    maxOutliers: Number(params.evalMaxOutliers)
  });
  const outIdx: number[] = Array.isArray(res?.outlierIndices) ? res.outlierIndices : [];
  res.outlierIndices = mapSubsetOutliersToGlobal(ids, outIdx);
  return { res, fitPointIds: ids };
}

