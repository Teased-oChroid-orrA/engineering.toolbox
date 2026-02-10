import { path as d3Path } from 'd3';

export type FigurePoint = { x: number; y: number };

// Shared deterministic path builders used by both live and export rendering flows.
export function buildClosedPolygonPath(points: FigurePoint[]): string {
  const p = d3Path();
  if (!points.length) return '';
  p.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) p.lineTo(points[i].x, points[i].y);
  p.closePath();
  return p.toString();
}

export function buildPolylinePath(points: FigurePoint[]): string {
  const p = d3Path();
  if (!points.length) return '';
  p.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) p.lineTo(points[i].x, points[i].y);
  return p.toString();
}

export function buildLinePath(a: FigurePoint, b: FigurePoint): string {
  return buildPolylinePath([a, b]);
}
