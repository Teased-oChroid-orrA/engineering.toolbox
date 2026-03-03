import { expect, test } from '@playwright/test';
import { applyAxisLocksToDelta, duplicateSelectionByMirrorAxis, duplicateSelectionByVector, duplicateSelectionByZRotation, mirrorSelectionAcrossAxis, moveSelectionByVector, resolveTransformAnchor, rotateSelectionAroundZ } from '../src/lib/components/surface/SurfaceOrchestratorLogic.svelte';

test.describe('Surface precision topology copy', () => {
  test('applies axis locks to exact transform vectors', () => {
    expect(applyAxisLocksToDelta({ x: 3, y: -4, z: 5 }, { x: false, y: false, z: false })).toEqual({ x: 3, y: -4, z: 5 });
    expect(applyAxisLocksToDelta({ x: 3, y: -4, z: 5 }, { x: true, y: false, z: true })).toEqual({ x: 3, y: 0, z: 5 });
    expect(applyAxisLocksToDelta({ x: 3, y: -4, z: 5 }, { x: false, y: true, z: false })).toEqual({ x: 0, y: -4, z: 0 });
  });

  test('resolves anchors from centroid, last point, and origin', () => {
    const points = [
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 2 },
      { x: 0, y: 10, z: 4 }
    ];
    const centroid = resolveTransformAnchor({ points, pointIds: [0, 1, 2], mode: 'centroid' });
    expect(centroid.x).toBeCloseTo(10 / 3, 8);
    expect(centroid.y).toBeCloseTo(10 / 3, 8);
    expect(centroid.z).toBe(2);
    expect(resolveTransformAnchor({ points, pointIds: [0, 1, 2], mode: 'last', lastSelectedPointId: 1 })).toEqual({ x: 10, y: 0, z: 2 });
    expect(resolveTransformAnchor({ points, pointIds: [0, 1, 2], mode: 'origin' })).toEqual({ x: 0, y: 0, z: 0 });
  });

  test('duplicates selected points, lines, and surfaces with stable remap indices', () => {
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
    const surfaces = [
      { name: 'S1', pts: [0, 1, 2, 3], vertexIds: [0, 1, 2, 3] }
    ];

    const result = duplicateSelectionByVector({
      points,
      edges: edges as any,
      surfaces: surfaces as any,
      selectedPointIds: [],
      selectedLineIds: [0, 1],
      selectedSurfaceIds: [0],
      delta: { x: 5, y: -5, z: 2 }
    });

    expect(result).toBeTruthy();
    expect(result?.newPoints).toHaveLength(4);
    expect(result?.newEdges).toEqual([
      [4, 5],
      [5, 6]
    ]);
    expect(result?.newSurfaces).toHaveLength(1);
    expect(result?.newSurfaces[0]?.vertexIds).toEqual([4, 5, 6, 7]);
    expect(result?.pointIds).toEqual([4, 5, 6, 7]);
    expect(result?.lineIds).toEqual([4, 5]);
    expect(result?.surfaceIds).toEqual([1]);
    expect(result?.newPoints[0]).toEqual({ x: 5, y: -5, z: 2 });
    expect(result?.newPoints[3]).toEqual({ x: 5, y: 5, z: 2 });
  });

  test('moves selected topology in place using line and surface membership', () => {
    const points = [
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 },
      { x: 10, y: 10, z: 0 },
      { x: 0, y: 10, z: 0 },
      { x: 100, y: 100, z: 100 }
    ];
    const edges: Array<[number, number]> = [
      [0, 1],
      [1, 2]
    ];
    const surfaces = [
      { name: 'S1', pts: [0, 1, 2, 3], vertexIds: [0, 1, 2, 3] }
    ];

    const result = moveSelectionByVector({
      points,
      edges: edges as any,
      surfaces: surfaces as any,
      selectedPointIds: [],
      selectedLineIds: [0],
      selectedSurfaceIds: [0],
      delta: { x: -2, y: 3, z: 4 }
    });

    expect(result).toBeTruthy();
    expect(result?.movedPointIds).toEqual([0, 1, 2, 3]);
    expect(result?.nextPoints[0]).toEqual({ x: -2, y: 3, z: 4 });
    expect(result?.nextPoints[1]).toEqual({ x: 8, y: 3, z: 4 });
    expect(result?.nextPoints[2]).toEqual({ x: 8, y: 13, z: 4 });
    expect(result?.nextPoints[3]).toEqual({ x: -2, y: 13, z: 4 });
    expect(result?.nextPoints[4]).toEqual({ x: 100, y: 100, z: 100 });
  });

  test('rotates selected topology around z using the supplied anchor', () => {
    const points = [
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 5, y: 5, z: 0 }
    ];
    const result = rotateSelectionAroundZ({
      points,
      edges: [[0, 1]] as any,
      surfaces: [],
      selectedPointIds: [],
      selectedLineIds: [0],
      selectedSurfaceIds: [],
      angleDeg: 90,
      anchor: { x: 0, y: 0, z: 0 }
    });

    expect(result).toBeTruthy();
    expect(result?.rotatedPointIds).toEqual([0, 1]);
    expect(result?.nextPoints[0]?.x).toBeCloseTo(0, 8);
    expect(result?.nextPoints[0]?.y).toBeCloseTo(1, 8);
    expect(result?.nextPoints[1]?.x).toBeCloseTo(-1, 8);
    expect(result?.nextPoints[1]?.y).toBeCloseTo(0, 8);
    expect(result?.nextPoints[2]).toEqual({ x: 5, y: 5, z: 0 });
  });

  test('mirrors selected topology across anchored x and y axes', () => {
    const points = [
      { x: 3, y: 4, z: 1 },
      { x: -2, y: 7, z: 1 },
      { x: 9, y: 9, z: 1 }
    ];
    const anchor = { x: 1, y: 2, z: 0 };
    const mirrorX = mirrorSelectionAcrossAxis({
      points,
      edges: [[0, 1]] as any,
      surfaces: [],
      selectedPointIds: [],
      selectedLineIds: [0],
      selectedSurfaceIds: [],
      axis: 'x',
      anchor
    });
    expect(mirrorX).toBeTruthy();
    expect(mirrorX?.mirroredPointIds).toEqual([0, 1]);
    expect(mirrorX?.nextPoints[0]).toEqual({ x: 3, y: 0, z: 1 });
    expect(mirrorX?.nextPoints[1]).toEqual({ x: -2, y: -3, z: 1 });
    expect(mirrorX?.nextPoints[2]).toEqual({ x: 9, y: 9, z: 1 });

    const mirrorY = mirrorSelectionAcrossAxis({
      points,
      edges: [[0, 1]] as any,
      surfaces: [],
      selectedPointIds: [],
      selectedLineIds: [0],
      selectedSurfaceIds: [],
      axis: 'y',
      anchor
    });
    expect(mirrorY).toBeTruthy();
    expect(mirrorY?.nextPoints[0]).toEqual({ x: -1, y: 4, z: 1 });
    expect(mirrorY?.nextPoints[1]).toEqual({ x: 4, y: 7, z: 1 });
    expect(mirrorY?.nextPoints[2]).toEqual({ x: 9, y: 9, z: 1 });
  });

  test('duplicates selected topology as a rotated copy around an anchor', () => {
    const points = [
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 0, y: 0, z: 0 }
    ];
    const result = duplicateSelectionByZRotation({
      points,
      edges: [[0, 1]] as any,
      surfaces: [{ name: 'T1', pts: [0, 1, 2], vertexIds: [0, 1, 2] }] as any,
      selectedPointIds: [],
      selectedLineIds: [0],
      selectedSurfaceIds: [0],
      angleDeg: 90,
      anchor: { x: 0, y: 0, z: 0 }
    });

    expect(result).toBeTruthy();
    expect(result?.pointIds).toEqual([3, 4, 5]);
    expect(result?.lineIds).toEqual([1]);
    expect(result?.surfaceIds).toEqual([1]);
    expect(result?.newPoints[0]?.x).toBeCloseTo(0, 8);
    expect(result?.newPoints[0]?.y).toBeCloseTo(1, 8);
    expect(result?.newPoints[1]?.x).toBeCloseTo(-1, 8);
    expect(result?.newPoints[1]?.y).toBeCloseTo(0, 8);
    expect(result?.newSurfaces[0]?.vertexIds).toEqual([3, 4, 5]);
  });

  test('duplicates selected topology as a mirrored copy around an anchor axis', () => {
    const points = [
      { x: 3, y: 4, z: 0 },
      { x: -1, y: 5, z: 0 },
      { x: 2, y: 2, z: 0 }
    ];
    const result = duplicateSelectionByMirrorAxis({
      points,
      edges: [[0, 1]] as any,
      surfaces: [{ name: 'Tri', pts: [0, 1, 2], vertexIds: [0, 1, 2] }] as any,
      selectedPointIds: [],
      selectedLineIds: [0],
      selectedSurfaceIds: [0],
      axis: 'y',
      anchor: { x: 1, y: 0, z: 0 }
    });

    expect(result).toBeTruthy();
    expect(result?.pointIds).toEqual([3, 4, 5]);
    expect(result?.lineIds).toEqual([1]);
    expect(result?.surfaceIds).toEqual([1]);
    expect(result?.newPoints[0]).toEqual({ x: -1, y: 4, z: 0 });
    expect(result?.newPoints[1]).toEqual({ x: 3, y: 5, z: 0 });
    expect(result?.newPoints[2]).toEqual({ x: 0, y: 2, z: 0 });
    expect(result?.newSurfaces[0]?.vertexIds).toEqual([3, 4, 5]);
  });
});
