import { invoke } from '@tauri-apps/api/core';
import type { Point3D } from '../types';

export type StepImportResult = {
  points: Point3D[];
  edges: [number, number][];
  warnings?: string[];
};

export async function bestFitCylinder(args: {
  points: Point3D[];
  tol: number;
  sigmaMult: number;
  maxOutliers: number;
}) {
  return invoke<any>('surface_eval_best_fit_cylinder', args);
}

export async function bestFitPlane(args: {
  points: Point3D[];
  tol: number;
  sigmaMult: number;
  maxOutliers: number;
}) {
  return invoke<any>('surface_eval_best_fit_plane', args);
}

export async function sectionSlices(args: {
  points: Point3D[];
  axis: 'x' | 'y' | 'z';
  bins: number;
  thickness: number;
}) {
  return invoke<any>('surface_eval_section_slices', args);
}

export async function calcOffsetIntersectionApi(args: {
  p1A: Point3D;
  p1B: Point3D;
  p2A: Point3D;
  p2B: Point3D;
  offsetDist: number;
  directionRef: Point3D;
}) {
  return invoke<any>('surface_calc_offset_intersection', args);
}

export async function importStepText(args: { stepText: string; maxPoints: number }) {
  return invoke<any>('surface_import_step_text', args);
}

