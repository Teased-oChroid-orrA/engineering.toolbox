import { expect, test } from '@playwright/test';
import {
  buildPreloadEquationSheetHtml,
  buildExactTorqueTerms,
  computeFastenedJointPreload,
  solveFastenerGroupPattern,
  solveFastenerGroupPatternCases,
  solveJointStiffness,
  solveMemberSegmentStiffness,
  solveInstallationPreload,
  type FastenedJointPreloadInput
} from '../src/lib/core/preload';

const baseInput: FastenedJointPreloadInput = {
  nominalDiameter: 0.5,
  tensileStressArea: 0.1419,
  boltModulus: 30_000_000,
  installationScatterPercent: 15,
  boltProofStrength: 85_000,
  boltUltimateStrength: 120_000,
  boltEnduranceLimit: 45_000,
  memberBearingAllowable: 42_000,
  underHeadBearingArea: 0.32,
  engagedThreadLength: 0.45,
  internalThreadShearDiameter: 0.46,
  externalThreadShearDiameter: 0.43,
  internalThreadStripShearAllowable: 32_000,
  externalThreadStripShearAllowable: 28_000,
  washerStack: {
    enabled: true,
    count: 2,
    thicknessPerWasher: 0.065,
    modulus: 29_000_000,
    outerDiameter: 0.95,
    innerDiameter: 0.53,
    thermalExpansionCoeff: 6.2e-6
  },
  boltSegments: [
    { id: 'shank', length: 1.2, area: 0.1419, modulus: 30_000_000 },
    { id: 'threaded', length: 0.6, area: 0.118, modulus: 30_000_000 }
  ],
  memberSegments: [
    {
      id: 'plate-a',
      plateWidth: 2.5,
      plateLength: 3.5,
      compressionModel: 'cylindrical_annulus',
      length: 0.25,
      modulus: 10_600_000,
      outerDiameter: 1.2,
      innerDiameter: 0.53
    },
    {
      id: 'plate-b',
      plateWidth: 2.5,
      plateLength: 3.5,
      compressionModel: 'conical_frustum_annulus',
      length: 0.35,
      modulus: 10_600_000,
      outerDiameterStart: 1.2,
      outerDiameterEnd: 1.7,
      innerDiameter: 0.53
    }
  ],
  installation: {
    model: 'exact_torque',
    appliedTorque: 120,
    prevailingTorque: 8,
    threadFrictionCoeff: 0.12,
    bearingFrictionCoeff: 0.14,
    threadPitch: 1 / 13,
    threadPitchDiameter: 0.4505,
    bearingMeanDiameter: 0.75,
    threadHalfAngleDeg: 30
  },
  fayingSurfaceSlipCoeff: 0.28,
  frictionInterfaceCount: 2,
  boltThermalExpansionCoeff: 6.5e-6,
  serviceCase: {
    externalAxialLoad: 300,
    externalTransverseLoad: 200,
    meanAxialLoad: 180,
    alternatingAxialLoad: 90,
    embedmentSettlement: 0.00008,
    temperatureChange: 40
  }
};

test.describe('preload solver G1 core', () => {
  test('exact torque decomposition reconstructs the available torque', () => {
    const out = solveInstallationPreload(baseInput.installation);
    expect(out.model).toBe('exact_torque');
    if (out.model !== 'exact_torque') return;
    expect(out.threadTorque + out.bearingTorque).toBeCloseTo(out.availableTorque, 9);
    expect(out.preload).toBeGreaterThan(0);
  });

  test('nut-factor fallback is explicit and deterministic', () => {
    const out = solveInstallationPreload({
      model: 'nut_factor',
      appliedTorque: 120,
      nutFactor: 0.2,
      nominalDiameter: 0.5
    });
    expect(out.model).toBe('nut_factor');
    if (out.model !== 'nut_factor') return;
    expect(out.preload).toBeCloseTo(120 / (0.2 * 0.5), 12);
  });

  test('segmented stiffness returns a valid joint constant', () => {
    const out = solveJointStiffness(baseInput);
    expect(out.bolt.stiffness).toBeGreaterThan(0);
    expect(out.members.stiffness).toBeGreaterThan(0);
    expect(out.jointConstant).toBeGreaterThan(0);
    expect(out.jointConstant).toBeLessThan(1);
    expect(out.memberLoadFraction).toBeCloseTo(1 - out.jointConstant, 12);
  });

  test('conical-frustum annulus uses exact integrated compliance, not a hidden average-area shortcut', () => {
    const segment = solveMemberSegmentStiffness({
      id: 'cone',
      plateWidth: 2.5,
      plateLength: 3.5,
      compressionModel: 'conical_frustum_annulus',
      length: 0.5,
      modulus: 10_000_000,
      outerDiameterStart: 1.0,
      outerDiameterEnd: 2.0,
      innerDiameter: 0.4
    });
    const midOuter = 1.5;
    const averageAreaShortcut = (Math.PI / 4) * (midOuter * midOuter - 0.4 * 0.4);
    expect(segment.averageAreaEquivalent).not.toBeCloseTo(averageAreaShortcut, 6);
    expect(segment.stiffness).toBeGreaterThan(0);
  });

  test('computeFastenedJointPreload returns installation and stiffness outputs together', () => {
    const out = computeFastenedJointPreload(baseInput);
    expect(out.installation.preload).toBeGreaterThan(0);
    expect(out.installation.preloadMin).toBeLessThan(out.installation.preload);
    expect(out.installation.preloadMax).toBeGreaterThan(out.installation.preload);
    expect(out.stiffness.bolt.segments).toHaveLength(2);
    expect(out.stiffness.members.segments).toHaveLength(4);
    expect(out.stiffness.washers.enabled).toBeTruthy();
    expect(out.service).not.toBeNull();
    expect(out.checks.proof.status).not.toBe('unavailable');
    expect(out.checks.bearing.governing).not.toBeNull();
    expect(out.assumptions.some((entry) => entry.includes('No hidden pressure-cone shortcut'))).toBeTruthy();
  });

  test('exact torque helper exposes explicit geometry terms', () => {
    if (baseInput.installation.model !== 'exact_torque') throw new Error('test setup mismatch');
    const terms = buildExactTorqueTerms(baseInput.installation);
    expect(terms.leadAngleRad).toBeGreaterThan(0);
    expect(terms.threadFrictionAngleRad).toBeGreaterThan(0);
    expect(terms.preloadPerAppliedTorque).toBeGreaterThan(0);
  });

  test('service retention computes preload loss, separation, and slip margins explicitly', () => {
    const out = computeFastenedJointPreload({
      ...baseInput,
      installation: {
        model: 'direct_preload',
        targetPreload: 4500
      }
    });
    expect(out.service).not.toBeNull();
    if (!out.service) return;
    expect(out.service.preloadEffective).toBeLessThan(out.service.preloadInstalled + 1e9);
    expect(out.service.separationLoad).toBeGreaterThan(0);
    expect(out.service.slipResistance).not.toBeNull();
    expect(out.service.slipRatio).not.toBeNull();
    expect(out.service.boltLoadPostSeparation).toBeGreaterThan(0);
  });

  test('structural checks expose explicit proof, bearing, strip, and fatigue capacities', () => {
    const out = computeFastenedJointPreload({
      ...baseInput,
      installation: {
        model: 'direct_preload',
        targetPreload: 4500
      }
    });
    expect(out.checks.proof.status).toBe('ok');
    expect(out.checks.bearing.underHead.status).toBe('ok');
    expect(out.checks.bearing.threadBearing.status).toBe('ok');
    expect(out.checks.bearing.localCrushing.status).toBe('ok');
    expect(out.checks.bearing.governing).not.toBeNull();
    expect(out.checks.threadStrip.internal.shearArea).not.toBeNull();
    expect(out.checks.threadStrip.external.shearArea).not.toBeNull();
    expect(out.checks.threadStrip.governing).not.toBeNull();
    expect(out.checks.fatigue.goodmanEquivalent).not.toBeNull();
    expect(out.checks.fatigue.soderbergEquivalent).not.toBeNull();
    expect(out.checks.fatigue.gerberEquivalent).not.toBeNull();
    expect(out.checks.fatigue.utilization).not.toBeNull();
    expect(out.checks.serviceLimits.separation.status).not.toBe('unavailable');
    expect(out.checks.serviceLimits.slip.status).not.toBe('unavailable');
    expect(out.checks.serviceLimits.selfLooseningRisk.level).not.toBe('unknown');
  });

  test('checks stay explicit when capacities are missing instead of inventing assumptions', () => {
    const out = computeFastenedJointPreload({
      ...baseInput,
      boltProofStrength: undefined,
      memberBearingAllowable: undefined,
      underHeadBearingArea: undefined,
      internalThreadStripShearAllowable: undefined,
      externalThreadStripShearAllowable: undefined,
      boltEnduranceLimit: undefined,
      boltUltimateStrength: undefined
    });
    expect(out.checks.proof.status).toBe('unavailable');
    expect(out.checks.bearing.underHead.status).toBe('unavailable');
    expect(out.checks.bearing.threadBearing.status).toBe('unavailable');
    expect(out.checks.bearing.localCrushing.status).toBe('unavailable');
    expect(out.checks.threadStrip.internal.status).toBe('unavailable');
    expect(out.checks.threadStrip.external.status).toBe('unavailable');
    expect(out.checks.fatigue.status).toBe('unavailable');
  });

  test('equation sheet report includes explicit intermediate values', () => {
    const out = computeFastenedJointPreload(baseInput);
    const html = buildPreloadEquationSheetHtml(out);
    expect(html).toContain('Fastened Joint Preload Analysis');
    expect(html).toContain('Joint constant C');
    expect(html).toContain('Self-loosening risk');
    expect(html).toContain('Audit-ready equation sheet');
  });

  test('2D fastener pattern solver returns a full influence matrix and critical fastener ranking', () => {
    const out = solveFastenerGroupPattern({
      rowCount: 2,
      columnCount: 3,
      rowPitch: 1.5,
      columnPitch: 1.75,
      edgeDistanceX: 1.0,
      edgeDistanceY: 0.9,
      eccentricityX: 0.2,
      eccentricityY: 0.1,
      plateStiffnessRatioX: 1.2,
      plateStiffnessRatioY: 0.9,
      bypassLoadFactor: 0.2,
      transferEfficiency: 0.65,
      boltStiffness: 100_000,
      memberStiffness: 240_000,
      preloadPerFastener: 4200,
      externalAxialLoad: 300,
      externalShearX: 180,
      externalShearY: 60,
      externalMomentZ: 140
    });
    expect(out.fasteners).toHaveLength(6);
    expect(out.geometryInfluenceMatrix).toHaveLength(6);
    expect(out.geometryInfluenceMatrix[0]).toHaveLength(6);
    expect(out.criticalFastenerIndex).toBeGreaterThanOrEqual(0);
    expect(out.criticalFastenerIndex).toBeLessThan(6);
    expect(out.criticalEquivalentDemand).toBeGreaterThan(0);
  });

  test('multiple load cases return a governing case and fastener', () => {
    const out = solveFastenerGroupPatternCases(
      {
        rowCount: 2,
        columnCount: 2,
        rowPitch: 1.5,
        columnPitch: 1.5,
        edgeDistanceX: 1,
        edgeDistanceY: 1,
        eccentricityX: 0.15,
        eccentricityY: 0.05,
        plateStiffnessRatioX: 1,
        plateStiffnessRatioY: 1.1,
        bypassLoadFactor: 0.18,
        transferEfficiency: 0.65,
        boltStiffness: 100_000,
        memberStiffness: 240_000,
        preloadPerFastener: 4200
      },
      [
        {
          id: 'lc1',
          label: 'Baseline',
          externalAxialLoad: 220,
          externalShearX: 160,
          externalShearY: 0,
          externalMomentZ: 60
        },
        {
          id: 'lc2',
          label: 'Moment dominated',
          externalAxialLoad: 160,
          externalShearX: 80,
          externalShearY: 50,
          externalMomentZ: 220
        }
      ]
    );
    expect(out.cases).toHaveLength(2);
    expect(out.governingCaseId).not.toBeNull();
    expect(out.governingCaseLabel).not.toBeNull();
    expect(out.governingFastenerIndex).not.toBeNull();
    expect(out.governingEquivalentDemand).toBeGreaterThan(0);
  });
});
