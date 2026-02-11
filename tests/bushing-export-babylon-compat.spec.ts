import { expect, test } from '@playwright/test';
import { buildBushingViewModel, computeBushing, type BushingInputs } from '../src/lib/core/bushing';
import { prepareBushingExportArtifacts } from '../src/lib/components/bushing/BushingExportController';

const baseInputs: BushingInputs = {
  units: 'imperial',
  boreDia: 0.5,
  idBushing: 0.375,
  interference: 0.0015,
  housingLen: 0.5,
  housingWidth: 1.5,
  edgeDist: 0.75,
  bushingType: 'countersink',
  idType: 'countersink',
  csMode: 'depth_angle',
  csDia: 0.5,
  csDepth: 0.125,
  csAngle: 100,
  extCsMode: 'dia_depth',
  extCsDia: 0.7,
  extCsDepth: 0.09,
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

test.describe('bushing export compatibility with Babylon draft engine active', () => {
  test('export artifact generation is renderer-agnostic', async () => {
    const results = computeBushing(baseInputs);
    const draftingView = buildBushingViewModel(baseInputs, results);
    const artifacts = prepareBushingExportArtifacts({
      form: baseInputs,
      results,
      draftingView
    });

    expect(artifacts.svgText).toContain('SECTION VIEW A-A');
    expect(artifacts.svgText).not.toContain('NaN');
    expect(artifacts.html).toContain('Drafting Sheet');
    expect(artifacts.html).toContain('SECTION VIEW A-A');
  });
});
