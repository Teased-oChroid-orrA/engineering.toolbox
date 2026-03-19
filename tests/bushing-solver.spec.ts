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

  test('neck wall follows actual countersink geometry instead of collapsing to straight wall', async () => {
    const internalOnly = computeBushing({
      ...baseBushingInput,
      bushingType: 'straight',
      idType: 'countersink',
      csMode: 'depth_angle',
      csDepth: 0.1,
      csAngle: 100
    });
    const doubleCountersink = computeBushing({
      ...baseBushingInput,
      bushingType: 'countersink',
      idType: 'countersink',
      extCsMode: 'dia_depth',
      extCsDia: 0.72,
      extCsDepth: 0.09,
      csDepth: 0.1
    });

    expect(internalOnly.neckWall).toBeLessThan(internalOnly.sleeveWall);
    expect(doubleCountersink.neckWall).toBeLessThan(doubleCountersink.sleeveWall);
    expect(internalOnly.neckWall!).toBeLessThan(0);
  });

  test('neck wall keeps decreasing as internal countersink grows deeper under a fixed angle', async () => {
    const shallow = computeBushing({
      ...baseBushingInput,
      bushingType: 'straight',
      idType: 'countersink',
      csMode: 'depth_angle',
      csDepth: 0.04,
      csAngle: 100
    });
    const medium = computeBushing({
      ...baseBushingInput,
      bushingType: 'straight',
      idType: 'countersink',
      csMode: 'depth_angle',
      csDepth: 0.08,
      csAngle: 100
    });
    const deep = computeBushing({
      ...baseBushingInput,
      bushingType: 'straight',
      idType: 'countersink',
      csMode: 'depth_angle',
      csDepth: 0.12,
      csAngle: 100
    });

    expect(shallow.neckWall).not.toBeNull();
    expect(medium.neckWall).not.toBeNull();
    expect(deep.neckWall).not.toBeNull();
    expect(medium.neckWall!).toBeLessThan(shallow.neckWall!);
    expect(deep.neckWall!).toBeLessThan(medium.neckWall!);
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
    expect(out.warningCodes.some((w) => w.code === 'BUSHING_ID_GE_BORE')).toBeTruthy();
    expect(Number.isFinite(out.pressure)).toBeTruthy();
  });

  test('strict interference enforcement reports blocked state when bore is locked', async () => {
    const out = computeBushing({
      ...baseBushingInput,
      boreTolMode: 'nominal_tol',
      boreNominal: 0.5,
      boreTolPlus: 0.0007,
      boreTolMinus: 0,
      interferenceTolMode: 'nominal_tol',
      interferenceNominal: 0.0025,
      interferenceTolPlus: 0.0005,
      interferenceTolMinus: 0,
      interferencePolicy: {
        enabled: true,
        lockBore: true,
        preserveBoreNominal: true,
        allowBoreNominalShift: false
      }
    });
    expect(out.tolerance.enforcement.enabled).toBeTruthy();
    expect(out.tolerance.enforcement.satisfied).toBeFalsy();
    expect(out.tolerance.enforcement.blocked).toBeTruthy();
    expect(out.tolerance.enforcement.reasonCodes).toContain('BLOCKED_BORE_LOCKED');
    expect(out.warningCodes.some((w) => w.code === 'INTERFERENCE_ENFORCEMENT_BLOCKED')).toBeTruthy();
  });

  test('strict interference enforcement can satisfy containment by shrinking bore width when unlocked', async () => {
    const out = computeBushing({
      ...baseBushingInput,
      boreTolMode: 'nominal_tol',
      boreNominal: 0.5,
      boreTolPlus: 0.0007,
      boreTolMinus: 0,
      interferenceTolMode: 'nominal_tol',
      interferenceNominal: 0.0025,
      interferenceTolPlus: 0.0005,
      interferenceTolMinus: 0,
      interferencePolicy: {
        enabled: true,
        lockBore: false,
        preserveBoreNominal: true,
        allowBoreNominalShift: false
      }
    });
    expect(out.tolerance.enforcement.satisfied).toBeTruthy();
    expect(out.tolerance.enforcement.blocked).toBeFalsy();
    expect(out.tolerance.enforcement.reasonCodes).toContain('AUTO_ADJUST_BORE_WIDTH');
    expect(out.tolerance.achievedInterference.lower + 1e-9).toBeGreaterThanOrEqual(out.tolerance.interferenceTarget.lower);
    expect(out.tolerance.achievedInterference.upper - 1e-9).toBeLessThanOrEqual(out.tolerance.interferenceTarget.upper);
    expect(out.tolerance.bore.nominal).toBeCloseTo(0.5, 9);
  });

  test('strict interference enforcement is blocked by bore capability floor', async () => {
    const out = computeBushing({
      ...baseBushingInput,
      boreTolMode: 'nominal_tol',
      boreNominal: 0.5,
      boreTolPlus: 0.0007,
      boreTolMinus: 0,
      interferenceTolMode: 'nominal_tol',
      interferenceNominal: 0.0025,
      interferenceTolPlus: 0.0005,
      interferenceTolMinus: 0,
      interferencePolicy: {
        enabled: true,
        lockBore: false,
        preserveBoreNominal: true,
        allowBoreNominalShift: false
      },
      boreCapability: {
        mode: 'adjustable',
        minAchievableTolWidth: 0.0006
      }
    });
    expect(out.tolerance.enforcement.satisfied).toBeFalsy();
    expect(out.tolerance.enforcement.reasonCodes).toContain('BLOCKED_CAPABILITY_FLOOR');
    expect(out.warningCodes.some((w) => w.code === 'INTERFERENCE_ENFORCEMENT_BLOCKED')).toBeTruthy();
  });

  test('countersink outputs stay finite and ordered under enforced tolerance policy', async () => {
    const out = computeBushing({
      ...baseBushingInput,
      bushingType: 'countersink',
      idType: 'countersink',
      boreTolMode: 'nominal_tol',
      boreNominal: 0.5,
      boreTolPlus: 0.0007,
      boreTolMinus: 0,
      interferenceTolMode: 'nominal_tol',
      interferenceNominal: 0.0025,
      interferenceTolPlus: 0.0005,
      interferenceTolMinus: 0,
      interferencePolicy: {
        enabled: true,
        lockBore: false,
        preserveBoreNominal: true,
        allowBoreNominalShift: false
      },
      extCsMode: 'depth_angle',
      extCsDepth: 0.1,
      extCsAngle: 100,
      csMode: 'depth_angle',
      csDepth: 0.09,
      csAngle: 100
    });
    expect(Number.isFinite(out.geometry.csExternal.dia)).toBeTruthy();
    expect(Number.isFinite(out.geometry.csInternal.dia)).toBeTruthy();
    expect(out.tolerance.csExternalDia?.lower ?? 0).toBeGreaterThanOrEqual(out.tolerance.odBushing.lower);
    expect(out.tolerance.csInternalDia?.lower ?? 0).toBeGreaterThanOrEqual(baseBushingInput.idBushing);
  });
});
