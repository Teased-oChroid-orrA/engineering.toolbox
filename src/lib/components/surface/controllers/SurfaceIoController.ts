import type { Edge, Point3D } from '../../../surface/types';
import { importStepText } from '../../../surface/api/surfaceApi';
import { parseStepPointsAndEdges } from '../SurfaceCommands';

export function parseSurfaceCsvText(text: string) {
  const rows = text
    .split(/\r?\n/)
    .map((r) => r.trim())
    .filter((r) => r && !r.startsWith('#'));

  const points: Point3D[] = [];
  const edges: Edge[] = [];
  for (const row of rows) {
    const cols = row.split(',').map((s) => s.trim());
    if (cols.length < 2) continue;
    const t = cols[0].toUpperCase();
    if (t === 'P') {
      if (cols.length < 4) continue;
      const x = Number(cols[1]);
      const y = Number(cols[2]);
      const z = Number(cols[3]);
      if ([x, y, z].some((v) => !Number.isFinite(v))) continue;
      points.push({ x, y, z });
    } else if (t === 'L') {
      if (cols.length < 3) continue;
      const a = Number(cols[1]);
      const b = Number(cols[2]);
      if (!Number.isInteger(a) || !Number.isInteger(b)) continue;
      edges.push([a, b]);
    }
  }
  return { points, edges };
}

export async function readSurfaceCsvFile(file: File) {
  return parseSurfaceCsvText(await file.text());
}

export async function readSurfaceStepFile(file: File, maxPoints = 200_000) {
  const stepText = await file.text();
  const parsed = parseStepPointsAndEdges(stepText, maxPoints);

  let backendPts: any = null;
  try {
    backendPts = await importStepText({ stepText, maxPoints });
  } catch {
    backendPts = null;
  }

  const pts = (backendPts?.points ?? backendPts?.pts ?? backendPts) as any;
  let points: Point3D[] = parsed.points as Point3D[];
  if (Array.isArray(pts) && pts.length) {
    const b = pts
      .map((p: any) => ({ x: Number(p.x), y: Number(p.y), z: Number(p.z) }))
      .filter((p: any) => [p.x, p.y, p.z].every((v: any) => Number.isFinite(v)));
    if (b.length > points.length) points = b;
  }
  if (!points.length) throw new Error('STEP import returned no points');

  const edges = points.length === parsed.points.length ? (parsed.edges as Edge[]) : [];
  return { points, edges, warnings: parsed.warnings ?? [] };
}

export function buildSurfaceCsv(points: Point3D[], edges: Edge[]) {
  const lines: string[] = [];
  lines.push('# Type,V1,V2,V3');
  for (const p of points) lines.push(`P,${p.x},${p.y},${p.z}`);
  for (const [a, b] of edges) lines.push(`L,${a},${b}`);
  return lines.join('\n');
}

export function triggerCsvDownload(csv: string, filenamePrefix = 'surface_mesh') {
  return triggerTextDownload(csv, `${filenamePrefix}_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`, 'text/csv');
}

export function triggerJsonDownload(payload: unknown, filenamePrefix = 'surface_export_metadata') {
  const text = JSON.stringify(payload, null, 2);
  return triggerTextDownload(text, `${filenamePrefix}_${new Date().toISOString().replace(/[:.]/g, '-')}.json`, 'application/json');
}

export function triggerTextDownload(text: string, filename: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
