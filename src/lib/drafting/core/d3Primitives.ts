export type FigurePoint = { x: number; y: number };

function fmt(v: number): string {
  if (!Number.isFinite(v)) return '0';
  const rounded = Math.abs(v) < 1e-12 ? 0 : v;
  return Number(rounded.toFixed(12)).toString();
}

function moveTo(p: FigurePoint): string {
  return `M${fmt(p.x)},${fmt(p.y)}`;
}

function lineTo(p: FigurePoint): string {
  return `L${fmt(p.x)},${fmt(p.y)}`;
}

// Shared deterministic path builders used by both live and export rendering flows.
export function buildClosedPolygonPath(points: FigurePoint[]): string {
  if (!points.length) return '';
  const parts = [moveTo(points[0])];
  for (let i = 1; i < points.length; i += 1) parts.push(lineTo(points[i]));
  parts.push('Z');
  return parts.join(' ');
}

export function buildPolylinePath(points: FigurePoint[]): string {
  if (!points.length) return '';
  const parts = [moveTo(points[0])];
  for (let i = 1; i < points.length; i += 1) parts.push(lineTo(points[i]));
  return parts.join(' ');
}

export function buildLinePath(a: FigurePoint, b: FigurePoint): string {
  return buildPolylinePath([a, b]);
}
