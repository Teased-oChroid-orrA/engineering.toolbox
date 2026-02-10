import {
  computeDatumPlaneSlicesKernel,
  type DatumSliceMode,
  type DatumSliceRecord,
  type DatumSliceRunResult,
  type DatumSliceSeverity,
  type DatumSliceStation,
  type DatumSliceWarning
} from '../../../surface/regression/DatumSlicingKernel';

export type {
  DatumSliceMode,
  DatumSliceRecord,
  DatumSliceRunResult,
  DatumSliceSeverity,
  DatumSliceStation,
  DatumSliceWarning
};

function csvEscape(value: unknown) {
  const raw = value == null ? '' : String(value);
  if (/[,"\n\r]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
}

export const computeDatumPlaneSlices = computeDatumPlaneSlicesKernel;

export function buildCombinedSliceCsv(result: DatumSliceRunResult, includeOptionalColumns: boolean) {
  const requiredHeaders = ['slice_id', 'x', 'y', 'z'];
  const optionalHeaders = ['source_entity', 'residual', 'method', 'warning_code'];
  const headers = includeOptionalColumns ? [...requiredHeaders, ...optionalHeaders] : requiredHeaders;

  const lines: string[] = [];
  lines.push(headers.join(','));

  for (const row of result.records) {
    const base = [row.slice_id, row.x, row.y, row.z];
    const optional = [row.source_entity ?? '', row.residual ?? '', row.method ?? '', row.warning_code ?? ''];
    const vals = includeOptionalColumns ? [...base, ...optional] : base;
    lines.push(vals.map(csvEscape).join(','));
  }

  return lines.join('\n');
}

export function buildSliceMetadataSidecar(result: DatumSliceRunResult, includeOptionalColumns: boolean) {
  return {
    schemaVersion: 1,
    generatedAt: result.generatedAt,
    export: {
      format: 'csv+json-sidecar',
      requiredColumns: ['slice_id', 'x', 'y', 'z'],
      optionalColumnsIncluded: includeOptionalColumns,
      optionalColumns: ['source_entity', 'residual', 'method', 'warning_code']
    },
    slicing: {
      planeName: result.planeName,
      planeOrigin: result.planeOrigin,
      planeNormal: result.planeNormal,
      mode: result.mode,
      spacingUsed: result.spacingUsed,
      countUsed: result.countUsed,
      thicknessUsed: result.thicknessUsed,
      minStation: result.minStation,
      maxStation: result.maxStation
    },
    stats: {
      pointsInputCount: result.pointsInputCount,
      pointsExportedCount: result.pointsExportedCount,
      sliceCount: result.stations.length,
      warningCount: result.warnings.length
    },
    warnings: result.warnings,
    stations: result.stations
  };
}
