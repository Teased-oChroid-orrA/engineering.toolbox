import { expect, test } from '@playwright/test';
import { computeBushing } from '../src/lib/core/bushing';
import { baseBushingInput } from './bushing-fixture';

test.describe('bushing solver regression', () => {
  test('covers straight/flanged/countersink modes', async () => {
    const straight = computeBushing({ ...baseBushingInput, bushingType: 'straight', idType: 'straight' });
    const flanged = computeBushing({ ...baseBushingInput, bushingType: 'flanged', flangeOd: 0.82, flangeThk: 0.08 });
    const countersink = computeBushing({
      ...baseBushingInput,
      bushingType: 'countersink',
      idType: 'countersink',
      extCsMode: 'dia_depth',
      extCsDia: 0.72,
      extCsDepth: 0.09,
      csDepth: 0.1
    });

    expect(straight.odInstalled).toBeGreaterThan(baseBushingInput.idBushing);
    expect(flanged.csSolved.od).toBeUndefined();
    expect(countersink.csSolved.od?.dia).toBeGreaterThan(countersink.odInstalled);
  });

  test('metric/imperial conversion stays physically consistent', async () => {
    const imperial = computeBushing({ ...baseBushingInput, units: 'imperial' });
    const metric = computeBushing({
      ...baseBushingInput,
      units: 'metric',
      boreDia: baseBushingInput.boreDia / 0.03937007874015748,
      idBushing: baseBushingInput.idBushing / 0.03937007874015748,
      housingLen: baseBushingInput.housingLen / 0.03937007874015748,
      housingWidth: baseBushingInput.housingWidth / 0.03937007874015748,
      edgeDist: baseBushingInput.edgeDist / 0.03937007874015748,
      interference: baseBushingInput.interference,
      flangeOd: (baseBushingInput.flangeOd ?? 0) / 0.03937007874015748,
      flangeThk: (baseBushingInput.flangeThk ?? 0) / 0.03937007874015748,
      csDia: baseBushingInput.csDia / 0.03937007874015748,
      csDepth: baseBushingInput.csDepth / 0.03937007874015748,
      extCsDia: baseBushingInput.extCsDia / 0.03937007874015748,
      extCsDepth: baseBushingInput.extCsDepth / 0.03937007874015748,
      minWallStraight: baseBushingInput.minWallStraight / 0.03937007874015748,
      minWallNeck: baseBushingInput.minWallNeck / 0.03937007874015748
    });

    expect(Math.abs(metric.pressure - imperial.pressure)).toBeLessThan(1e-3);
    expect(Math.abs(metric.sleeveWall - imperial.sleeveWall)).toBeLessThan(1e-6);
  });

  test('invalid input produces warning codes and best-effort output', async () => {
    const out = computeBushing({
      ...baseBushingInput,
      boreDia: 0.3,
      idBushing: 0.35
    });
    expect(out.warningCodes.some((w) => w.code === 'INPUT_INVALID')).toBeTruthy();
    expect(Number.isFinite(out.pressure)).toBeTruthy();
  });
});
