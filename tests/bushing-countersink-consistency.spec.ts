import { expect, test } from '@playwright/test';
import { solveCountersink } from '../src/lib/core/bushing';

test.describe('bushing countersink consistency', () => {
  test('depth_angle <-> dia_angle round-trip consistency', async () => {
    const baseDia = 0.375;
    const solvedA = solveCountersink('depth_angle', 0, 0.1, 100, baseDia);
    const solvedB = solveCountersink('dia_angle', solvedA.dia, 0, 100, baseDia);

    expect(Math.abs(solvedA.depth - solvedB.depth)).toBeLessThan(1e-9);
    expect(Math.abs(solvedA.dia - solvedB.dia)).toBeLessThan(1e-9);
  });

  test('dia_depth computes stable angle and reconstructs depth', async () => {
    const baseDia = 0.375;
    const dia = 0.52;
    const depth = 0.08;
    const solved = solveCountersink('dia_depth', dia, depth, 0, baseDia);
    const reconstructed = solveCountersink('dia_angle', dia, 0, solved.angleDeg, baseDia);
    expect(Math.abs(depth - reconstructed.depth)).toBeLessThan(1e-9);
  });

  test('dia_angle clamps negative depth solutions to zero', async () => {
    const baseDia = 0.375;
    const solved = solveCountersink('dia_angle', 0.25, 0, 100, baseDia);
    expect(solved.depth).toBe(0);
  });
});
