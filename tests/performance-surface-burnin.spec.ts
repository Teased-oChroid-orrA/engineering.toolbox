import { expect, test } from '@playwright/test';
import { createSnapshot, materializeSnapshot } from '../src/lib/surface/state/SurfaceStore';
import { popHistoryUndo, pushHistoryUndo } from '../src/lib/surface/state/SurfaceHistoryController';
import { deletePoint } from '../src/lib/components/surface/SurfaceOrchestratorLogic.svelte';
import { nearestEdgeHitProjected } from '../src/lib/components/surface/SurfacePerformance';
import { nearestEdgeHitUi } from '../src/lib/components/surface/controllers/SurfaceViewportMathController';

test.describe('Surface Burn-in Guards', () => {
  test('create/delete/undo restores geometry snapshot parity', () => {
    const points = [
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 },
      { x: 10, y: 10, z: 0 },
      { x: 0, y: 10, z: 0 }
    ];
    const edges: Array<[number, number]> = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0]
    ];
    const surfaces = [{ name: 'S1', pts: [0, 1, 2, 3], vertexIds: [0, 1, 2, 3] }];
    const curves: any[] = [];
    const csys = [{ name: 'Global', origin: { x: 0, y: 0, z: 0 }, xAxis: { x: 1, y: 0, z: 0 }, yAxis: { x: 0, y: 1, z: 0 }, zAxis: { x: 0, y: 0, z: 1 } }];
    const planes: any[] = [];

    const before = createSnapshot(points, edges as any, curves, surfaces as any, csys as any, planes as any, 0);
    const stacks = pushHistoryUndo({ undoStack: [], redoStack: [] }, before);
    const deleted = deletePoint({ idx: 1, points: before.points, edges: before.edges as any, curves: before.curves as any, surfaces: before.surfaces as any });
    const current = createSnapshot(deleted.points, deleted.edges as any, deleted.curves as any, deleted.surfaces as any, before.csys as any, before.planes as any, null);
    const popped = popHistoryUndo(stacks, current);
    expect(popped.snapshot).toBeTruthy();
    const restored = materializeSnapshot(popped.snapshot!);
    expect(restored.points).toEqual(before.points);
    expect(restored.edges).toEqual(before.edges);
    expect(restored.surfaces).toEqual(before.surfaces);
  });

  test('worker/local nearest-edge parity stays consistent', () => {
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

    const probes = [
      { x: 50, y: 2 },
      { x: 99, y: 60 },
      { x: 2, y: 44 }
    ];

    probes.forEach((probe) => {
      const perfHit = nearestEdgeHitProjected({ mx: probe.x, my: probe.y, edges: edges as any, projected: projected as any, maxDistancePx: 24 });
      const baseHit = nearestEdgeHitUi(probe.x, probe.y, edges as any, projected as any);
      expect(perfHit?.edgeIdx ?? null).toBe(baseHit?.edgeIdx ?? null);
    });
  });
});
