import type { Edge } from './SurfaceOrchestratorDeps';

type ProjectedPoint = { x: number; y: number; z?: number } | null | undefined;

type SortedEdge = { i: number; a: number; b: number; z: number };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function computeDecimatedPointIds(args: {
  totalPoints: number;
  budget: number;
  selectedPointIds?: number[];
  pendingPointIdx?: number | null;
}): number[] {
  const { totalPoints, budget, selectedPointIds = [], pendingPointIdx = null } = args;
  if (totalPoints <= 0) return [];

  const ids = new Set<number>();
  if (totalPoints <= budget) {
    for (let i = 0; i < totalPoints; i++) ids.add(i);
  } else {
    const stride = Math.max(1, Math.ceil(totalPoints / Math.max(1, budget)));
    for (let i = 0; i < totalPoints; i += stride) ids.add(i);
  }

  selectedPointIds.forEach((idx) => {
    if (idx >= 0 && idx < totalPoints) ids.add(idx);
  });
  if (pendingPointIdx !== null && pendingPointIdx >= 0 && pendingPointIdx < totalPoints) ids.add(pendingPointIdx);
  return [...ids].sort((a, b) => a - b);
}

export function computeDecimatedEdges(args: {
  sortedEdges: SortedEdge[];
  budget: number;
  selectedLineIds?: number[];
  activeEdgeIdx?: number | null;
}): SortedEdge[] {
  const { sortedEdges, budget, selectedLineIds = [], activeEdgeIdx = null } = args;
  const total = sortedEdges.length;
  if (total <= budget) return sortedEdges;

  const stride = Math.max(1, Math.ceil(total / Math.max(1, budget)));
  const picked: SortedEdge[] = [];
  for (let i = 0; i < total; i += stride) picked.push(sortedEdges[i]!);

  const seen = new Set<number>(picked.map((edge) => edge.i));
  selectedLineIds.forEach((idx) => {
    if (seen.has(idx)) return;
    const edge = sortedEdges.find((item) => item.i === idx);
    if (!edge) return;
    picked.push(edge);
    seen.add(idx);
  });
  if (activeEdgeIdx !== null && !seen.has(activeEdgeIdx)) {
    const activeEdge = sortedEdges.find((item) => item.i === activeEdgeIdx);
    if (activeEdge) picked.push(activeEdge);
  }
  return picked;
}

export function nearestEdgeHitProjected(args: {
  mx: number;
  my: number;
  edges: Edge[];
  projected: ProjectedPoint[];
  maxDistancePx?: number;
}): { edgeIdx: number; t: number; d: number } | null {
  const { mx, my, edges, projected, maxDistancePx = 24 } = args;
  let best: { edgeIdx: number; t: number; d: number } | null = null;
  for (let ei = 0; ei < edges.length; ei++) {
    const [a, b] = edges[ei];
    const p0 = projected[a];
    const p1 = projected[b];
    if (!p0 || !p1) continue;
    const vx = p1.x - p0.x;
    const vy = p1.y - p0.y;
    const len2 = vx * vx + vy * vy;
    if (len2 < 1e-9) continue;
    const t = clamp(((mx - p0.x) * vx + (my - p0.y) * vy) / len2, 0, 1);
    const cx = p0.x + t * vx;
    const cy = p0.y + t * vy;
    const d = Math.hypot(mx - cx, my - cy);
    if (!best || d < best.d) best = { edgeIdx: ei, t, d };
  }
  if (!best || best.d > maxDistancePx) return null;
  return best;
}
