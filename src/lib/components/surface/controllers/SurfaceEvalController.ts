import type { Point3D } from '../../../surface/types';
import { runBestFitCylinder, runBestFitPlane, runSectionSlices } from '../../../surface/eval/SurfaceEvaluation';

type EvalParams = {
  evalTol: number;
  evalSigmaMult: number;
  evalMaxOutliers: number;
};

export async function computePlaneEvaluation(args: {
  points: Point3D[];
  selectedPointIds: number[];
  evalUseSelection: boolean;
  params: EvalParams;
}) {
  try {
    const result = await runBestFitPlane(args.points, args.selectedPointIds, args.evalUseSelection, args.params);
    return { result, error: null as string | null };
  } catch (e: any) {
    return { result: null, error: e?.message ? String(e.message) : String(e) };
  }
}

export async function computeSectionSliceEvaluation(args: {
  points: Point3D[];
  selectedPointIds: number[];
  evalUseSelection: boolean;
  sliceAxis: 'x' | 'y' | 'z';
  sliceBins: number;
  sliceThickness: number;
}) {
  try {
    const res = await runSectionSlices(
      args.points,
      args.selectedPointIds,
      args.evalUseSelection,
      args.sliceAxis,
      args.sliceBins,
      args.sliceThickness
    );
    const result = {
      axis: (res?.axis ?? args.sliceAxis) as 'x' | 'y' | 'z',
      min: Number(res?.min ?? res?.tMin ?? 0),
      max: Number(res?.max ?? res?.tMax ?? 0),
      slices: Array.isArray(res?.slices) ? res.slices : []
    };
    return { result, error: null as string | null };
  } catch (e: any) {
    return { result: null, error: e?.message ? String(e.message) : String(e) };
  }
}

export async function computeCylinderEvaluation(args: {
  points: Point3D[];
  selectedPointIds: number[];
  cylUseSelection: boolean;
  params: EvalParams;
}) {
  try {
    const out = await runBestFitCylinder(args.points, args.selectedPointIds, args.cylUseSelection, args.params);
    return {
      result: out.res,
      fitPointIds: out.fitPointIds,
      error: null as string | null
    };
  } catch (e: any) {
    return {
      result: null,
      fitPointIds: [] as number[],
      error: e?.message ? String(e.message) : String(e)
    };
  }
}

