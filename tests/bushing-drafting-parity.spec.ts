import { expect, test } from '@playwright/test';
import { buildBushingViewModel, computeBushing, type BushingInputs } from '../src/lib/core/bushing';
import { renderBushingSection } from '../src/lib/drafting/bushing/generate';
import { renderDraftingSheetSvg } from '../src/lib/drafting/core/render';
import { num } from '../src/lib/drafting/core/svg';

const defaultViewport = { x: 26, y: 26, w: 368, h: 184 };
const f7 = (v: number) => (Math.round(v * 1e7) / 1e7).toString();

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

function squash(svg: string): string {
  return svg.replace(/\s+/g, ' ').trim();
}

function buildModel(inputs: BushingInputs) {
  const results = computeBushing(inputs);
  return buildBushingViewModel(inputs, results);
}

test.describe('bushing drafting parity', () => {
  test('straight/flanged/countersink export contains live section geometry from same model', async () => {
    const cases: Array<{ name: string; inputs: BushingInputs }> = [
      {
        name: 'straight',
        inputs: { ...baseInputs, bushingType: 'straight', idType: 'straight' }
      },
      {
        name: 'flanged',
        inputs: { ...baseInputs, bushingType: 'flanged', flangeOd: 0.8, flangeThk: 0.07 }
      },
      {
        name: 'countersink',
        inputs: {
          ...baseInputs,
          bushingType: 'countersink',
          idType: 'countersink',
          csDepth: 0.1,
          extCsDepth: 0.11,
          extCsDia: 0.7
        }
      }
    ];

    for (const c of cases) {
      const model = buildModel(c.inputs);
      const live = renderBushingSection(model, defaultViewport);
      const exported = renderDraftingSheetSvg('bushing', model, { title: `parity-${c.name}` });

      expect(squash(exported), `${c.name} export/live mismatch`).toContain(squash(live));
      expect(exported, `${c.name} should retain section title`).toContain('SECTION VIEW A-A');
      expect(exported, `${c.name} should not emit invalid numeric data`).not.toContain('NaN');
    }
  });

  test('feature-shape checks catch regressions across profile modes', async () => {
    const flanged = buildModel({ ...baseInputs, bushingType: 'flanged', flangeOd: 0.82, flangeThk: 0.08 });
    const flangedSvg = renderBushingSection(flanged, defaultViewport);
    const topY = -flanged.housingLen / 2;
    const expectedFlangeY = num(topY - (flanged.flangeThk ?? 0));
    expect(flangedSvg).toContain(expectedFlangeY);

    const countersink = buildModel({
      ...baseInputs,
      bushingType: 'countersink',
      idType: 'countersink',
      extCsMode: 'dia_depth',
      extCsDia: 0.72,
      extCsDepth: 0.09
    });
    const countersinkSvg = renderBushingSection(countersink, defaultViewport);
    const outerR = (countersink.geometry?.odBushing ?? countersink.boreDia ?? 0) / 2;
    const innerR = (countersink.idBushing ?? 0) / 2;
    const rawTopR = (countersink.geometry?.csExternal?.dia ?? 0) / 2;
    const clampedTopR = Math.min(rawTopR, outerR + (outerR - innerR) * 0.35);
    expect(countersinkSvg).toContain(f7(clampedTopR));
  });
});
