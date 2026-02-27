import { expect, test } from '@playwright/test';
import {
  applyBoltSizeToElements,
  buildNumericExample,
  computeFastenerSolver,
  getBoltSizeCatalog,
  getMaterialCatalog
} from '../src/lib/core/fastener';

test.describe('fastener continuum solver', () => {
  test('series compliance equals sum of element compliances', async () => {
    const { input, output } = buildNumericExample('imperial');
    const expectedCompliance = input.elements.reduce((sum, e) => sum + e.length / (e.material.youngsModulus * (e.tensileStressArea ?? e.area)), 0);

    expect(output.errors).toEqual([]);
    expect(output.totals.compliance).toBeCloseTo(expectedCompliance, 12);
    expect(output.totals.preloadDeformation).toBeCloseTo(output.totals.preloadForce * expectedCompliance, 10);
  });

  test('external load split satisfies exact compatibility-equilibrium form', async () => {
    const base = buildNumericExample('imperial').input;
    base.external.enabled = true;
    base.external.axialForce = 3000;
    const out = computeFastenerSolver(base);

    const kb = out.split.bolt.stiffness;
    const kc = out.split.clamped.stiffness;
    const expectedBolt = (kb / (kb + kc)) * base.external.axialForce;
    const expectedClamp = (kc / (kb + kc)) * base.external.axialForce;

    expect(out.external.deltaBoltLoad).toBeCloseTo(expectedBolt, 9);
    expect(out.external.deltaClampedLoad).toBeCloseTo(expectedClamp, 9);
    expect(out.external.deltaBoltLoad + out.external.deltaClampedLoad).toBeCloseTo(base.external.axialForce, 9);
  });

  test('torque inversion uses full lead + thread friction + bearing friction denominator', async () => {
    const base = buildNumericExample('imperial').input;
    base.torque.enabled = true;
    base.torque.appliedTorque = 1100;
    base.torque.lead = 1 / 13;
    base.torque.pitchDiameter = 0.405;
    base.torque.threadHalfAngleDeg = 30;
    base.torque.threadFriction = 0.12;
    base.torque.bearingFriction = 0.14;
    base.torque.bearingMeanDiameter = 0.55;

    const out = computeFastenerSolver(base);
    const alpha = (Math.PI / 180) * base.torque.threadHalfAngleDeg;
    const denominator =
      base.torque.lead / (2 * Math.PI) +
      (base.torque.pitchDiameter * base.torque.threadFriction) / (2 * Math.cos(alpha)) +
      (base.torque.bearingFriction * base.torque.bearingMeanDiameter) / 2;

    expect(out.torque.used).toBeTruthy();
    expect(out.torque.denominator).toBeCloseTo(denominator, 12);
    expect(out.torque.preloadFromTorque).toBeCloseTo(base.torque.appliedTorque / denominator, 10);
    expect(out.totals.preloadForce).toBeCloseTo(out.torque.preloadFromTorque, 10);
  });

  test('thermal toggle off yields zero thermal force and on yields deterministic value', async () => {
    const base = buildNumericExample('metric').input;

    base.thermal.enabled = false;
    const off = computeFastenerSolver(base);
    expect(off.thermal.thermalForce).toBe(0);

    base.thermal.enabled = true;
    base.thermal.deltaT = 50;
    const on = computeFastenerSolver(base);
    const totalFree = base.elements.reduce(
      (sum, e) => sum + (e.material.thermalExpansion ?? 0) * base.thermal.deltaT * e.length,
      0
    );
    const totalCompliance = base.elements.reduce(
      (sum, e) => sum + e.length / (e.material.youngsModulus * (e.tensileStressArea ?? e.area)),
      0
    );

    expect(on.thermal.thermalForce).toBeCloseTo(-totalFree / totalCompliance, 8);
  });

  test('per-element thermal gradients override global deltaT when enabled', async () => {
    const base = buildNumericExample('metric').input;
    base.thermal.enabled = true;
    base.thermal.deltaT = 0;
    base.thermal.usePerElement = true;
    base.thermal.perElementDeltaT = {
      'bolt-shank': 20,
      'bolt-thread': 20,
      'member-1': 80,
      'member-2': 80,
      'member-3': 80,
      'washer-head-1': 40,
      'washer-head-2': 40,
      'washer-nut-1': 40
    };

    const out = computeFastenerSolver(base);
    const totalFree = base.elements.reduce((sum, e) => {
      const dT = base.thermal.perElementDeltaT?.[e.id] ?? base.thermal.deltaT;
      return sum + (e.material.thermalExpansion ?? 0) * dT * e.length;
    }, 0);
    const totalCompliance = base.elements.reduce(
      (sum, e) => sum + e.length / (e.material.youngsModulus * (e.tensileStressArea ?? e.area)),
      0
    );

    expect(out.thermal.thermalForce).toBeCloseTo(-totalFree / totalCompliance, 8);
  });

  test('multi-bolt row satisfies global force and moment equilibrium', async () => {
    const base = buildNumericExample('imperial').input;
    base.row.enabled = true;
    base.row.force = 4000;
    base.row.eccentricity = 1.5;
    const out = computeFastenerSolver(base);

    expect(out.row.enabled).toBeTruthy();
    expect(out.row.forceResidual).toBeCloseTo(0, 8);
    expect(out.row.momentResidual).toBeCloseTo(0, 8);
  });

  test('contact toggle reports separated state under excessive external tension', async () => {
    const base = buildNumericExample('imperial').input;
    base.external.enabled = true;
    base.external.axialForce = 1_000_000;
    base.contact.enabled = true;

    const out = computeFastenerSolver(base);

    expect(out.contact.enabled).toBeTruthy();
    expect(out.contact.separated).toBeTruthy();
    expect(out.contact.activeSetIterations.length).toBeGreaterThan(0);
    expect(out.contact.converged).toBeTruthy();
    expect(out.contact.contactReaction).toBeCloseTo(0, 8);
    expect(out.contact.clampForceAfterContact).toBeCloseTo(out.thermal.clampForceAfterThermal, 8);
    expect(out.contact.boltForceAfterContact).toBeCloseTo(out.thermal.boltForceAfterThermal, 8);
  });

  test('contact active-set converges to closed-contact complementarity for negative free gap', async () => {
    const base = buildNumericExample('imperial').input;
    base.external.enabled = false;
    base.thermal.enabled = false;
    base.contact.enabled = true;
    base.contact.gapAtZeroLoad = 0;
    base.contact.maxIterations = 30;
    base.contact.tolerance = 1e-10;

    const out = computeFastenerSolver(base);

    expect(out.contact.enabled).toBeTruthy();
    expect(out.contact.converged).toBeTruthy();
    expect(out.contact.separated).toBeFalsy();
    expect(out.contact.contactReaction).toBeGreaterThan(0);
    expect(Math.abs(out.contact.gap)).toBeLessThan(1e-8);
    expect(out.contact.complementarityResidual).toBeLessThan(1e-8);
    expect(out.contact.clampForceAfterContact).toBeLessThan(out.thermal.clampForceAfterThermal);
    expect(out.contact.boltForceAfterContact).toBeGreaterThan(out.thermal.boltForceAfterThermal);
    expect(out.contact.contactReaction).toBeCloseTo(
      out.thermal.clampForceAfterThermal - out.contact.clampForceAfterContact,
      8
    );
  });

  test('catalog exposes selectable engineering materials and bolt presets', async () => {
    const imperialMaterials = getMaterialCatalog('imperial');
    const metricBolts = getBoltSizeCatalog('metric');
    expect(imperialMaterials.length).toBeGreaterThan(2);
    expect(metricBolts.some((b) => b.id === 'M10x1.5')).toBeTruthy();
  });

  test('bolt preset application updates shank/thread areas consistently', async () => {
    const base = buildNumericExample('imperial').input;
    const preset = getBoltSizeCatalog('imperial').find((b) => b.id === '1/2-20');
    expect(preset).toBeTruthy();
    const updated = applyBoltSizeToElements(base.elements, preset!);
    const shank = updated.find((e) => e.kind === 'bolt-shank');
    const thread = updated.find((e) => e.kind === 'bolt-thread');
    expect(shank?.area).toBeCloseTo(preset!.shankArea, 10);
    expect(thread?.tensileStressArea).toBeCloseTo(preset!.tensileStressArea, 10);
  });

  test('solver emits explicit assumptions and deterministic checks', async () => {
    const out = buildNumericExample('imperial').output;
    expect(out.assumptions.length).toBeGreaterThan(0);
    expect(out.assumptions.some((a) => a.toLowerCase().includes('no pressure-cone'))).toBeTruthy();
    expect(out.checks.length).toBeGreaterThan(0);
    expect(out.checks.some((c) => c.id === 'clamp-retention')).toBeTruthy();
  });
});
