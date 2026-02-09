import type { Edge } from '../types';

export function edgeExists(edges: Edge[], i0: number, i1: number) {
  return edges.some(([a, b]) => (a === i0 && b === i1) || (a === i1 && b === i0));
}

