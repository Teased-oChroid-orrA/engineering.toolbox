import { expect, test } from '@playwright/test';
import { computeBushing } from '../src/lib/core/bushing';
import { buildBushingViewModel } from '../src/lib/core/bushing/viewModel';
import { buildBushingScene } from '../src/lib/drafting/bushing/bushingSceneModel';
import { renderBushingSection } from '../src/lib/drafting/bushing/generate';
import { baseBushingInput } from './bushing-fixture';

test.describe('bushing render stress', () => {
  test('recompute and rerender loop stays stable', async () => {
    const modes: Array<{ bushingType: 'straight' | 'flanged' | 'countersink'; idType: 'straight' | 'countersink' }> = [
      { bushingType: 'straight', idType: 'straight' },
      { bushingType: 'flanged', idType: 'straight' },
      { bushingType: 'countersink', idType: 'countersink' }
    ];

    let invalidFrames = 0;
    for (let i = 0; i < 240; i += 1) {
      const mode = modes[i % modes.length];
      const scale = 1 + (i % 11) * 0.01;
      const input = {
        ...baseBushingInput,
        ...mode,
        boreDia: baseBushingInput.boreDia * scale,
        idBushing: baseBushingInput.idBushing * scale,
        housingLen: baseBushingInput.housingLen * (1 + (i % 7) * 0.01),
        housingWidth: baseBushingInput.housingWidth * (1 + (i % 5) * 0.01),
        edgeDist: baseBushingInput.edgeDist * (1 + (i % 3) * 0.02),
        flangeOd: (baseBushingInput.flangeOd ?? 0.75) * scale,
        flangeThk: (baseBushingInput.flangeThk ?? 0.063) * (1 + (i % 4) * 0.01),
        extCsDia: baseBushingInput.extCsDia * scale,
        extCsDepth: baseBushingInput.extCsDepth * (1 + (i % 6) * 0.01),
        csDepth: baseBushingInput.csDepth * (1 + (i % 9) * 0.01)
      };

      const result = computeBushing(input);
      const view = buildBushingViewModel(input, result);
      const scene = buildBushingScene(view);
      const frame = renderBushingSection(view, { x: 20, y: 20, w: 380, h: 190 });

      if (!Number.isFinite(scene.width) || !Number.isFinite(scene.height) || frame.includes('NaN')) invalidFrames += 1;
    }

    expect(invalidFrames).toBe(0);
  });
});
