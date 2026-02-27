import { expect, test } from '@playwright/test';
import {
  computeDecimatedEdges,
  computeDecimatedPointIds,
  nearestEdgeHitProjected
} from '../src/lib/components/surface/SurfacePerformance';

test.describe('Surface Performance Decimation', () => {
  test('decimates large point sets while preserving selected and pending points', () => {
    const totalPoints = 50_000;
    const budget = 9_000;
    const selectedPointIds = [3, 1200, 28_888, 49_999];
    const pendingPointIdx = 17_777;

    const ids = computeDecimatedPointIds({
      totalPoints,
      budget,
      selectedPointIds,
      pendingPointIdx
    });

    expect(ids.length).toBeGreaterThan(0);
    expect(ids.length).toBeLessThanOrEqual(budget + selectedPointIds.length + 1);
    selectedPointIds.forEach((id) => expect(ids).toContain(id));
    expect(ids).toContain(pendingPointIdx);
  });

  test('decimates large edge sets while preserving selected and active edges', () => {
    const sortedEdges = Array.from({ length: 60_000 }, (_, i) => ({
      i,
      a: i,
      b: i + 1,
      z: i % 100
    }));
    const budget = 12_000;
    const selectedLineIds = [7, 2222, 40_000, 59_998];
    const activeEdgeIdx = 30_123;

    const edges = computeDecimatedEdges({
      sortedEdges,
      budget,
      selectedLineIds,
      activeEdgeIdx
    });
    const ids = new Set(edges.map((e) => e.i));

    expect(edges.length).toBeGreaterThan(0);
    expect(edges.length).toBeLessThanOrEqual(budget + selectedLineIds.length + 1);
    selectedLineIds.forEach((id) => expect(ids.has(id)).toBeTruthy());
    expect(ids.has(activeEdgeIdx)).toBeTruthy();
  });

  test('nearestEdgeHitProjected identifies nearest visible edge with threshold', () => {
    const projected = [
      { x: 0, y: 0, z: 0 },
      { x: 100, y: 0, z: 0 },
      { x: 100, y: 100, z: 0 },
      { x: 0, y: 100, z: 0 }
    ];
    const edges: Array<[number, number]> = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0]
    ];

    const nearTop = nearestEdgeHitProjected({
      mx: 45,
      my: 6,
      edges,
      projected,
      maxDistancePx: 20
    });
    expect(nearTop?.edgeIdx).toBe(0);

    const farAway = nearestEdgeHitProjected({
      mx: 500,
      my: 500,
      edges,
      projected,
      maxDistancePx: 20
    });
    expect(farAway).toBeNull();
  });
});
