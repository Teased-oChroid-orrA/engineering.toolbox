import { expect, test } from '@playwright/test';
import { buildBushingViewModel, computeBushing, type BushingInputs } from '../src/lib/core/bushing';
import { buildBushingScene } from '../src/lib/drafting/bushing/bushingSceneModel';
import { renderSvgDraft, toCanonicalDraftScene } from '../src/lib/drafting/bushing/BushingDraftRenderer';

const baseInputs: BushingInputs = {
  units: 'imperial',
  boreDia: 0.5,
  idBushing: 0.375,
  interference: 0.0015,
  housingLen: 0.5,
  housingWidth: 1.5,
  edgeDist: 0.75,
  bushingType: 'straight',
  idType: 'straight',
  csMode: 'depth_angle',
  csDia: 0.5,
  csDepth: 0.125,
  csAngle: 100,
  extCsMode: 'depth_angle',
  extCsDia: 0.625,
  extCsDepth: 0.125,
  extCsAngle: 100,
  flangeOd: 0.75,
  flangeThk: 0.063,
  matHousing: 'al7075',
  matBushing: 'bronze',
  friction: 0.15,
  dT: 0,
  minWallStraight: 0.05,
  minWallNeck: 0.04
};

function buildVariant(inputs: BushingInputs) {
  const solved = computeBushing(inputs);
  const view = buildBushingViewModel(inputs, solved);
  const scene = buildBushingScene(view);
  return {
    scene,
    canonical: toCanonicalDraftScene(scene)
  };
}

test.describe('bushing d3 render contract', () => {
  test('canonical loops and SVG output stay coherent for common profile variants', async () => {
    const variants: BushingInputs[] = [
      { ...baseInputs, bushingType: 'straight', idType: 'straight' },
      { ...baseInputs, bushingType: 'flanged', flangeOd: 0.82, flangeThk: 0.08 },
      {
        ...baseInputs,
        bushingType: 'countersink',
        idType: 'countersink',
        csMode: 'dia_angle',
        csDia: 0.64,
        csAngle: 90,
        extCsMode: 'dia_depth',
        extCsDia: 0.72,
        extCsDepth: 0.09
      }
    ];

    for (const variant of variants) {
      const { scene, canonical } = buildVariant(variant);
      const section = renderSvgDraft(scene, { x: 0, y: 0, w: 420, h: 260 }, 'section');
      const legacy = renderSvgDraft(scene, { x: 0, y: 0, w: 420, h: 260 }, 'legacy');

      expect(canonical.loops.length).toBe(scene.profile.loops.length);
      expect(canonical.loops.length).toBeGreaterThan(0);
      expect(section).toContain('data-layer="section-material"');
      expect(legacy).toContain('data-layer="legacy-material"');
      expect(section).not.toContain('NaN');
      expect(legacy).not.toContain('NaN');
    }
  });
});
