import { expect, test } from '@playwright/test';
import { computeBushing } from '../src/lib/core/bushing';
import { makeFriendlyMessage } from '../src/lib/core/bushing/errorMessageUtils';
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

  test('returns service-envelope, duty, process, and review outputs', async () => {
    const out = computeBushing({
      ...baseBushingInput,
      processRouteId: 'press_fit_finish_ream',
      standardsBasis: 'faa_ac_43_13',
      standardsRevision: 'current',
      processSpec: 'repair traveler 17',
      criticality: 'repair',
      serviceTemperatureHot: 90,
      serviceTemperatureCold: -65,
      finishReamAllowance: 0.0006,
      wearAllowance: 0.0004,
      load: 1800,
      edgeLoadAngleDeg: 35,
      loadSpectrum: 'oscillating',
      oscillationAngleDeg: 24,
      oscillationFreqHz: 0.8,
      dutyCyclePct: 70,
      lubricationMode: 'greased',
      contaminationLevel: 'shop',
      surfaceRoughnessRaUm: 0.8,
      shaftHardnessHrc: 42,
      misalignmentDeg: 0.08
    });

    expect(out.serviceEnvelope.states).toHaveLength(6);
    expect(out.serviceEnvelope.governingStateLabel.length).toBeGreaterThan(0);
    expect(out.dutyScreen.pvLimit).toBeGreaterThan(0);
    expect(out.process.routeId).toBe('press_fit_finish_ream');
    expect(out.process.finishMachiningRequired).toBeTruthy();
    expect(out.review.standardsBasis).toBe('faa_ac_43_13');
    expect(out.review.approvalRequired).toBeTruthy();
  });

  test('raises service and duty warnings for a harsh hot oscillating case', async () => {
    const out = computeBushing({
      ...baseBushingInput,
      processRouteId: 'line_ream_repair',
      criticality: 'primary_structure',
      serviceTemperatureHot: 180,
      serviceTemperatureCold: -120,
      wearAllowance: 0.001,
      load: 4200,
      edgeLoadAngleDeg: 20,
      loadSpectrum: 'oscillating',
      oscillationAngleDeg: 40,
      oscillationFreqHz: 3,
      dutyCyclePct: 90,
      lubricationMode: 'dry',
      contaminationLevel: 'abrasive',
      surfaceRoughnessRaUm: 2.4,
      shaftHardnessHrc: 28,
      misalignmentDeg: 0.35
    });

    expect(out.dutyScreen.wearRisk === 'high' || out.dutyScreen.wearRisk === 'severe').toBeTruthy();
    expect(out.warningCodes.some((w) => w.code === 'DUTY_SCREEN_HIGH_RISK')).toBeTruthy();
    expect(out.warningCodes.some((w) => w.code === 'APPROVAL_REVIEW_REQUIRED')).toBeTruthy();
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
    expect(out.tolerance.bore.lower + 1e-9).toBeGreaterThanOrEqual(0.5);
    expect(out.tolerance.bore.upper).toBeCloseTo(0.5007, 9);
  });

  test('strict interference tightening preserves the entered minimum bore and tightens from the upper side', async () => {
    const out = computeBushing({
      ...baseBushingInput,
      boreTolMode: 'limits',
      boreLower: 0.5,
      boreUpper: 0.5008,
      interferenceTolMode: 'limits',
      interferenceLower: 0.0022,
      interferenceUpper: 0.0026,
      interferencePolicy: {
        enabled: true,
        lockBore: false,
        preserveBoreNominal: true,
        allowBoreNominalShift: false
      }
    });

    expect(out.tolerance.enforcement.satisfied).toBeTruthy();
    expect(out.tolerance.bore.lower + 1e-9).toBeGreaterThanOrEqual(0.5);
    expect(out.tolerance.bore.upper).toBeCloseTo(0.5008, 9);
    expect(out.tolerance.bore.lower).toBeCloseTo(0.5004, 9);
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

  test('baseline service-state and review outputs remain low risk with simple static loading', async () => {
    const out = computeBushing({
      ...baseBushingInput,
      load: 250,
      loadSpectrum: 'static',
      lubricationMode: 'greased',
      contaminationLevel: 'clean',
      surfaceRoughnessRaUm: 1.2,
      shaftHardnessHrc: 36,
      misalignmentDeg: 0.02,
      processRouteId: 'press_fit_only',
      standardsBasis: 'shop_default',
      criticality: 'general'
    });

    expect(out.serviceEnvelope.states.length).toBeGreaterThanOrEqual(5);
    expect(out.serviceEnvelope.governingStateId).not.toBe('free');
    expect(out.dutyScreen.wearRisk).toBe('low');
    expect(out.review.approvalRequired).toBeFalsy();
    expect(out.review.decision).toBe('pass');
    expect(out.process.routeId).toBe('press_fit_only');
    expect(out.process.installForceBand.nominal).toBeGreaterThan(0);
  });

  test('high-risk duty and service-envelope conditions trigger review and warning codes', async () => {
    const out = computeBushing({
      ...baseBushingInput,
      load: 12000,
      loadSpectrum: 'oscillating',
      oscillationAngleDeg: 140,
      oscillationFreqHz: 18,
      dutyCyclePct: 95,
      lubricationMode: 'dry',
      contaminationLevel: 'abrasive',
      surfaceRoughnessRaUm: 3.2,
      shaftHardnessHrc: 24,
      misalignmentDeg: 0.35,
      serviceTemperatureHot: 220,
      serviceTemperatureCold: -20,
      finishReamAllowance: 0.002,
      wearAllowance: 0.001,
      processRouteId: 'line_ream_repair',
      standardsBasis: 'faa_ac_43_13',
      standardsRevision: 'AC 43.13-1B',
      criticality: 'primary_structure',
      approvalNotes: 'Engineering approval required before release.'
    });

    expect(out.dutyScreen.pvUtilization).toBeGreaterThan(1);
    expect(out.dutyScreen.wearRisk === 'high' || out.dutyScreen.wearRisk === 'severe').toBeTruthy();
    expect(out.review.approvalRequired).toBeTruthy();
    expect(['review', 'hold']).toContain(out.review.decision);
    expect(out.warningCodes.some((w) => w.code === 'DUTY_SCREEN_HIGH_RISK')).toBeTruthy();
    expect(out.warningCodes.some((w) => w.code === 'APPROVAL_REVIEW_REQUIRED')).toBeTruthy();
    expect(out.warningCodes.some((w) => w.code === 'SERVICE_STATE_CLEARANCE')).toBeTruthy();
    expect(out.serviceEnvelope.states.some((state) => state.fitClass === 'clearance')).toBeTruthy();
  });

  test('edge-distance friendly message avoids absurd literal recommendations', async () => {
    const friendly = makeFriendlyMessage('EDGE_DISTANCE_STRENGTH_FAIL', {
      units: 'in',
      actualValue: 0.42,
      requiredValue: 32959.789
    });

    expect(friendly.suggestion).not.toContain('32959.789 in');
    expect(friendly.suggestion).toContain('outside a practical range');
  });

  test('edge-distance sequencing falls back to a sane default when edge load angle is zero', async () => {
    const baseline = computeBushing({
      ...baseBushingInput,
      edgeLoadAngleDeg: 40
    });
    const zeroAngle = computeBushing({
      ...baseBushingInput,
      edgeLoadAngleDeg: 0
    });

    expect(zeroAngle.edgeDistance.edMinSequence).toBeCloseTo(baseline.edgeDistance.edMinSequence, 9);
  });

  test('assembly thermal assist reduces install force while keeping removal tied to retained fit', async () => {
    const baseline = computeBushing({
      ...baseBushingInput,
      processRouteId: 'thermal_assist_install'
    });
    const assisted = computeBushing({
      ...baseBushingInput,
      processRouteId: 'thermal_assist_install',
      assemblyHousingTemperature: 200,
      assemblyBushingTemperature: 0
    });

    expect(assisted.physics.installForce).toBeLessThan(baseline.physics.installForce);
    expect(assisted.physics.installContactPressure).toBeLessThan(baseline.physics.installContactPressure);
    expect(assisted.physics.installDeltaEffective).toBeLessThan(baseline.physics.installDeltaEffective);
    expect(assisted.process.installForceBand.nominal).toBeLessThan(baseline.process.installForceBand.nominal);
    expect(assisted.process.removalForce).toBeCloseTo(baseline.process.removalForce, 9);
    expect(assisted.process.assemblyThermalAssistActive).toBeTruthy();
  });
});
