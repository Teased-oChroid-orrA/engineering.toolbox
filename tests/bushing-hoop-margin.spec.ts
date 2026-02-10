import { expect, test } from '@playwright/test';
import { computeBushing, MATERIALS } from '../src/lib/core/bushing';
import { baseBushingInput } from './bushing-fixture';

function mat(id: string) {
  return MATERIALS.find((m) => m.id === id) ?? MATERIALS[0];
}

test.describe('bushing hoop stress and margin verification', () => {
  test('hoop margin tracks allowable/demand relation for housing and bushing', async () => {
    const out = computeBushing(baseBushingInput);
    const housing = mat(baseBushingInput.matHousing);
    const bushing = mat(baseBushingInput.matBushing);

    const expectedHousing = out.physics.stressHoopHousing !== 0
      ? (housing.Sy_ksi * 1000) / out.physics.stressHoopHousing - 1
      : Infinity;
    const expectedBushing = out.physics.stressHoopBushing !== 0
      ? (bushing.Sy_ksi * 1000) / Math.abs(out.physics.stressHoopBushing) - 1
      : Infinity;

    expect(Math.abs(out.physics.marginHousing - expectedHousing)).toBeLessThan(1e-9);
    expect(Math.abs(out.physics.marginBushing - expectedBushing)).toBeLessThan(1e-9);
  });

  test('increased interference lowers margins in same material regime', async () => {
    const low = computeBushing({ ...baseBushingInput, interference: 0.0008 });
    const high = computeBushing({ ...baseBushingInput, interference: 0.0022 });

    expect(high.physics.stressHoopHousing).toBeGreaterThan(low.physics.stressHoopHousing);
    expect(Math.abs(high.physics.stressHoopBushing)).toBeGreaterThan(Math.abs(low.physics.stressHoopBushing));
    expect(high.physics.marginHousing).toBeLessThan(low.physics.marginHousing);
    expect(high.physics.marginBushing).toBeLessThan(low.physics.marginBushing);
  });
});

