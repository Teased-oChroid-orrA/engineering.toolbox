import type { DatumPlane, Point3D } from '../types';

export type DatumSliceMode = 'fixed_spacing' | 'fixed_count';
export type DatumSliceSeverity = 'info' | 'warning' | 'error';

export type DatumSliceWarning = {
  code: string;
  severity: DatumSliceSeverity;
  message: string;
  sliceId?: number;
};

export type DatumSliceRecord = {
  slice_id: number;
  x: number;
  y: number;
  z: number;
  source_entity?: string;
  residual?: number;
  method?: string;
  warning_code?: string;
};

export type DatumSliceStation = {
  sliceId: number;
  station: number;
  n: number;
  minResidual: number | null;
  maxResidual: number | null;
};

export type DatumSliceRunResult = {
  generatedAt: string;
  planeName: string;
  planeOrigin: Point3D;
  planeNormal: Point3D;
  mode: DatumSliceMode;
  spacingUsed: number;
  countUsed: number;
  thicknessUsed: number;
  minStation: number;
  maxStation: number;
  pointsInputCount: number;
  pointsExportedCount: number;
  stations: DatumSliceStation[];
  records: DatumSliceRecord[];
  warnings: DatumSliceWarning[];
};

function toFinite(value: unknown, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const n = Math.trunc(toFinite(value, fallback));
  return Math.max(min, Math.min(max, n));
}

function dot(a: Point3D, b: Point3D) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function sub(a: Point3D, b: Point3D): Point3D {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function vecNorm(v: Point3D): Point3D {
  const d = Math.hypot(v.x, v.y, v.z);
  if (d <= 1e-12 || !Number.isFinite(d)) return { x: 0, y: 0, z: 0 };
  return { x: v.x / d, y: v.y / d, z: v.z / d };
}

export function computeDatumPlaneSlicesKernel(args: {
  points: Point3D[];
  pointIds?: number[];
  plane: DatumPlane;
  mode: DatumSliceMode;
  spacing: number;
  count: number;
  thickness: number;
  generatedAt?: string;
}): DatumSliceRunResult {
  const n = vecNorm(args.plane.normal);
  const nLen = Math.hypot(n.x, n.y, n.z);
  if (!Number.isFinite(nLen) || nLen < 1e-12) {
    throw new Error('Selected datum plane has an invalid normal.');
  }

  const pickedIds = (args.pointIds ?? []).filter((id) => Number.isInteger(id) && id >= 0 && id < args.points.length);
  const ids = pickedIds.length > 0 ? pickedIds : args.points.map((_, i) => i);
  const sampled = ids.map((id) => ({ id, p: args.points[id], d: dot(sub(args.points[id], args.plane.origin), n) }));
  if (sampled.length === 0) {
    throw new Error('No points available for slicing.');
  }

  const dVals = sampled.map((s) => s.d);
  const minStation = Math.min(...dVals);
  const maxStation = Math.max(...dVals);
  const range = Math.max(0, maxStation - minStation);

  const warnings: DatumSliceWarning[] = [];
  let countUsed = 0;
  let spacingUsed = 0;
  const stations: number[] = [];

  if (args.mode === 'fixed_count') {
    countUsed = clampInt(args.count, 2, 500, 24);
    spacingUsed = countUsed > 1 ? range / (countUsed - 1) : 0;
    for (let i = 0; i < countUsed; i++) stations.push(minStation + i * spacingUsed);
  } else {
    spacingUsed = Math.max(1e-8, Math.abs(toFinite(args.spacing, 1)));
    countUsed = Math.max(1, Math.min(500, Math.floor(range / spacingUsed) + 1));
    for (let i = 0; i < countUsed; i++) stations.push(minStation + i * spacingUsed);
    if (countUsed === 1 && range > 1e-8) {
      stations.push(maxStation);
      countUsed = 2;
    }
  }

  const thicknessAuto = Math.max(1e-8, Math.abs(spacingUsed) * 0.35);
  const thicknessUsed = Math.max(1e-8, Math.abs(toFinite(args.thickness, 0)) || thicknessAuto);
  const halfBand = thicknessUsed * 0.5;

  const records: DatumSliceRecord[] = [];
  const stationSummary: DatumSliceStation[] = [];
  let emptySlices = 0;

  for (let i = 0; i < stations.length; i++) {
    const station = stations[i];
    const members = sampled.filter((sp) => Math.abs(sp.d - station) <= halfBand);
    let minResidual: number | null = null;
    let maxResidual: number | null = null;

    if (members.length === 0) {
      emptySlices += 1;
      warnings.push({
        code: 'SLICE_EMPTY',
        severity: 'warning',
        message: `Slice ${i} has no points in band; increase thickness or use fewer stations.`,
        sliceId: i
      });
    } else if (members.length < 3) {
      warnings.push({
        code: 'SLICE_SPARSE',
        severity: 'info',
        message: `Slice ${i} has only ${members.length} point(s); fit confidence is low.`,
        sliceId: i
      });
    }

    for (const member of members) {
      const residual = Math.abs(member.d - station);
      minResidual = minResidual == null ? residual : Math.min(minResidual, residual);
      maxResidual = maxResidual == null ? residual : Math.max(maxResidual, residual);
      records.push({
        slice_id: i,
        x: member.p.x,
        y: member.p.y,
        z: member.p.z,
        source_entity: `P${member.id}`,
        residual,
        method: 'datum_plane_band',
        warning_code: members.length < 3 ? 'SLICE_SPARSE' : ''
      });
    }

    stationSummary.push({
      sliceId: i,
      station,
      n: members.length,
      minResidual,
      maxResidual
    });
  }

  if (records.length === 0) {
    warnings.push({
      code: 'SLICE_EMPTY_ALL',
      severity: 'error',
      message: 'All slices are empty. Increase thickness or reduce spacing/count.'
    });
  } else if (emptySlices > Math.max(2, Math.floor(stations.length * 0.3))) {
    warnings.push({
      code: 'SLICE_EMPTY_MANY',
      severity: 'warning',
      message: `${emptySlices}/${stations.length} slices are empty; exported cloud may be discontinuous.`
    });
  }

  return {
    generatedAt: args.generatedAt ?? new Date().toISOString(),
    planeName: args.plane.name,
    planeOrigin: { ...args.plane.origin },
    planeNormal: { ...n },
    mode: args.mode,
    spacingUsed,
    countUsed,
    thicknessUsed,
    minStation,
    maxStation,
    pointsInputCount: sampled.length,
    pointsExportedCount: records.length,
    stations: stationSummary,
    records,
    warnings
  };
}
