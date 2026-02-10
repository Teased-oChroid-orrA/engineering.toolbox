import { expect, test } from '@playwright/test';
import { computeBushing } from '../src/lib/core/bushing';
import { buildBushingViewModel } from '../src/lib/core/bushing/viewModel';
import { buildBushingSectionProfile } from '../src/lib/drafting/bushing/bushingSectionProfileBuilder';
import { validateClosedLoop } from '../src/lib/drafting/bushing/sectionProfile';
import { baseBushingInput } from './bushing-fixture';

test.describe('bushing section profile schema', () => {
  test('builds closed loops with material + void region classification', async () => {
    const solved = computeBushing(baseBushingInput);
    const view = buildBushingViewModel(baseBushingInput, solved);
    const section = buildBushingSectionProfile(view, 1e-4);

    expect(section.profile.loops.length).toBeGreaterThanOrEqual(5);
    for (const loop of section.profile.loops) {
      const valid = validateClosedLoop(loop, 1e-4);
      expect(valid.ok, `${loop.id} expected closed`).toBeTruthy();
    }

    const materialRegions = section.profile.regions.filter((r) => r.kind === 'material');
    const voidRegions = section.profile.regions.filter((r) => r.kind === 'void');
    expect(materialRegions.length).toBeGreaterThanOrEqual(4);
    expect(voidRegions.length).toBeGreaterThanOrEqual(1);
  });

  test('supports dynamic variants without invalid topology', async () => {
    const variants = [
      { bushingType: 'straight', idType: 'straight' },
      { bushingType: 'flanged', idType: 'straight', flangeOd: 0.82, flangeThk: 0.08 },
      { bushingType: 'countersink', idType: 'countersink', csDepth: 0.1, extCsDepth: 0.09, extCsDia: 0.72 }
    ] as const;

    for (const variant of variants) {
      const solved = computeBushing({ ...baseBushingInput, ...variant });
      const view = buildBushingViewModel({ ...baseBushingInput, ...variant }, solved);
      const section = buildBushingSectionProfile(view, 1e-4);
      for (const loop of section.profile.loops) expect(validateClosedLoop(loop, 1e-4).ok).toBeTruthy();
    }
  });
});

