import { expect, test } from '@playwright/test';
import { BUSHING_FORMULA_INVENTORY, computeBushing } from '../src/lib/core/bushing';
import { baseBushingInput } from './bushing-fixture';

test.describe('bushing formula audit', () => {
  test('inventory is present and references solver locations', async () => {
    expect(BUSHING_FORMULA_INVENTORY.length).toBeGreaterThanOrEqual(6);
    for (const entry of BUSHING_FORMULA_INVENTORY) {
      expect(entry.id.length).toBeGreaterThan(3);
      expect(entry.location).toContain('src/lib/core/bushing/solve.ts');
      expect(entry.units.length).toBeGreaterThan(0);
    }
  });

  test('press-fit pressure is monotonic with interference in positive-fit regime', async () => {
    const low = computeBushing({ ...baseBushingInput, interference: 0.0008 });
    const mid = computeBushing({ ...baseBushingInput, interference: 0.0015 });
    const high = computeBushing({ ...baseBushingInput, interference: 0.0022 });

    expect(low.physics.contactPressure).toBeGreaterThanOrEqual(0);
    expect(mid.physics.contactPressure).toBeGreaterThan(low.physics.contactPressure);
    expect(high.physics.contactPressure).toBeGreaterThan(mid.physics.contactPressure);
  });
});

