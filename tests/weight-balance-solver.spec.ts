import { expect, test } from '@playwright/test';
import { calculateWeightAndBalance, validateInput } from '../src/lib/core/weight-balance/solve';
import { SAMPLE_CESSNA_172S } from '../src/lib/core/weight-balance/sampleData';
import type { AircraftProfile, LoadingItem } from '../src/lib/core/weight-balance/types';

test.describe('W&B solver audit and validation', () => {
  test('builds per-item trace and deterministic hash for identical inputs', () => {
    const aircraft: AircraftProfile = {
      ...SAMPLE_CESSNA_172S,
      envelopes: SAMPLE_CESSNA_172S.envelopes.map((e) => ({
        ...e,
        vertices: e.vertices.map((v) => ({ ...v }))
      }))
    };
    const items: LoadingItem[] = [
      { id: 'bew', type: 'equipment_fixed', name: 'Basic Empty Weight', weight: 1663, arm: 39.5, editable: false },
      { id: 'pilot', type: 'occupant', name: 'Pilot', weight: 180, arm: 37.0, editable: true },
      { id: 'fuel-main', type: 'fuel_main', name: 'Main Fuel', weight: 240, arm: 48.0, editable: true }
    ];

    const resultA = calculateWeightAndBalance(aircraft, items);
    const resultB = calculateWeightAndBalance(aircraft, items);

    expect(resultA.calculationTrace).toHaveLength(3);
    expect(resultA.calculationTrace[0].moment).toBeCloseTo(65688.5, 6);
    expect(resultA.calculationTrace[1].moment).toBeCloseTo(6660, 6);
    expect(resultA.calculationTrace[2].moment).toBeCloseTo(11520, 6);
    expect(resultA.audit.inputHash).toBe(resultB.audit.inputHash);
    expect(resultA.audit.generatedAt).toMatch(/\d{4}-\d{2}-\d{2}T/);
    expect(resultA.analysis.uncertaintyBand.cgSpan).toBeGreaterThan(0);
    expect(resultA.analysis.sensitivity).toHaveLength(3);
    expect(resultA.analysis.sensitivity[0].deltaWeight).toBeCloseTo(10, 6);
  });

  test('changes input hash when loading values change', () => {
    const aircraft: AircraftProfile = {
      ...SAMPLE_CESSNA_172S,
      envelopes: SAMPLE_CESSNA_172S.envelopes.map((e) => ({
        ...e,
        vertices: e.vertices.map((v) => ({ ...v }))
      }))
    };
    const baseItems: LoadingItem[] = [
      { id: 'bew', type: 'equipment_fixed', name: 'Basic Empty Weight', weight: 1663, arm: 39.5, editable: false },
      { id: 'pilot', type: 'occupant', name: 'Pilot', weight: 180, arm: 37.0, editable: true }
    ];

    const baseline = calculateWeightAndBalance(aircraft, baseItems);
    const changed = calculateWeightAndBalance(aircraft, [
      ...baseItems.slice(0, 1),
      { ...baseItems[1], weight: 181 }
    ]);

    expect(changed.audit.inputHash).not.toBe(baseline.audit.inputHash);
  });

  test('uncertainty band grows with larger tolerance settings', () => {
    const aircraft: AircraftProfile = {
      ...SAMPLE_CESSNA_172S,
      envelopes: SAMPLE_CESSNA_172S.envelopes.map((e) => ({
        ...e,
        vertices: e.vertices.map((v) => ({ ...v }))
      }))
    };
    const items: LoadingItem[] = [
      { id: 'bew', type: 'equipment_fixed', name: 'Basic Empty Weight', weight: 1663, arm: 39.5, editable: false },
      { id: 'pilot', type: 'occupant', name: 'Pilot', weight: 180, arm: 37.0, editable: true },
      { id: 'fuel-main', type: 'fuel_main', name: 'Main Fuel', weight: 240, arm: 48.0, editable: true }
    ];

    const tight = calculateWeightAndBalance(aircraft, items, {
      uncertaintyWeightTolerance: 0.25,
      uncertaintyArmTolerance: 0.02,
      sensitivityDeltaWeight: 5
    });
    const loose = calculateWeightAndBalance(aircraft, items, {
      uncertaintyWeightTolerance: 5,
      uncertaintyArmTolerance: 0.5,
      sensitivityDeltaWeight: 5
    });

    expect(loose.analysis.uncertaintyBand.cgSpan).toBeGreaterThan(tight.analysis.uncertaintyBand.cgSpan);
    expect(loose.audit.inputHash).not.toBe(tight.audit.inputHash);
  });

  test('validateInput catches invalid limits, duplicate ids, and non-finite values', () => {
    const badAircraft: AircraftProfile = {
      ...SAMPLE_CESSNA_172S,
      maxTakeoffWeight: 2500,
      maxLandingWeight: 2600,
      maxZeroFuelWeight: 2601,
      envelopes: [
        {
          ...SAMPLE_CESSNA_172S.envelopes[0],
          category: 'normal',
          forwardLimit: 50,
          aftLimit: 40
        },
        {
          ...SAMPLE_CESSNA_172S.envelopes[0],
          category: 'normal'
        }
      ]
    };

    const badItems: LoadingItem[] = [
      { id: 'dup', type: 'occupant', name: '', weight: Number.NaN, arm: 37, editable: true },
      { id: 'dup', type: 'occupant', name: 'Pilot', weight: 180, arm: Number.POSITIVE_INFINITY, editable: true }
    ];

    const validation = validateInput(badAircraft, badItems);

    expect(validation.valid).toBe(false);
    expect(validation.errors.some((e) => e.includes('landing weight cannot exceed'))).toBeTruthy();
    expect(validation.errors.some((e) => e.includes('zero fuel weight cannot exceed'))).toBeTruthy();
    expect(validation.errors.some((e) => e.includes('Duplicate envelope category'))).toBeTruthy();
    expect(validation.errors.some((e) => e.includes('forward limit must be less than aft limit'))).toBeTruthy();
    expect(validation.errors.some((e) => e.includes('Duplicate loading item id'))).toBeTruthy();
    expect(validation.errors.some((e) => e.includes('must have a name'))).toBeTruthy();
  });
});
