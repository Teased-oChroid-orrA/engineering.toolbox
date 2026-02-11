import { expect, test } from '@playwright/test';
import { buildBushingViewModel, computeBushing, type BushingInputs } from '../src/lib/core/bushing';
import { buildBushingScene } from '../src/lib/drafting/bushing/bushingSceneModel';
import { toCanonicalDraftScene } from '../src/lib/drafting/bushing/BushingDraftRenderer';
import {
  babylonSceneSignature,
  canonicalSceneSignature,
  compareParitySignatures
} from '../src/lib/drafting/bushing/BushingBabylonParity';

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

function canonicalFor(inputs: BushingInputs) {
  const solved = computeBushing(inputs);
  const model = buildBushingViewModel(inputs, solved);
  const scene = buildBushingScene(model);
  return toCanonicalDraftScene(scene);
}

test.describe('bushing babylon parity harness', () => {
  test('key geometry signatures stay aligned for straight/flanged/countersink', async () => {
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

    for (const v of variants) {
      const canonical = canonicalFor(v);
      const svgSig = canonicalSceneSignature(canonical);
      const babylonSig = babylonSceneSignature(canonical);
      const cmp = compareParitySignatures(svgSig, babylonSig);
      expect(cmp.ok, `parity drift for ${v.bushingType}: ${cmp.reasons.join('; ')}`).toBeTruthy();
      expect(babylonSig.polygonCount).toBeGreaterThan(0);
      expect(babylonSig.areaTotal).toBeGreaterThan(0);
    }
  });

  test('internal/external countersink mode transitions preserve Babylon parity', async () => {
    const internal = canonicalFor({
      ...baseInputs,
      bushingType: 'countersink',
      idType: 'countersink',
      csMode: 'depth_angle',
      csDepth: 0.1,
      csAngle: 90
    });
    const external = canonicalFor({
      ...baseInputs,
      bushingType: 'countersink',
      idType: 'countersink',
      extCsMode: 'dia_angle',
      extCsDia: 0.71,
      extCsAngle: 100
    });

    const iCmp = compareParitySignatures(canonicalSceneSignature(internal), babylonSceneSignature(internal));
    const eCmp = compareParitySignatures(canonicalSceneSignature(external), babylonSceneSignature(external));

    expect(iCmp.ok, `internal countersink parity drift: ${iCmp.reasons.join('; ')}`).toBeTruthy();
    expect(eCmp.ok, `external countersink parity drift: ${eCmp.reasons.join('; ')}`).toBeTruthy();
  });
});
