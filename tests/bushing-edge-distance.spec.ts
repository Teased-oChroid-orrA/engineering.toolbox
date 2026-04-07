import { expect, test } from '@playwright/test';
import { computeBushing } from '../src/lib/core/bushing';
import { buildBushingWarningEntries } from '../src/lib/components/bushing/bushingWarningGuidance';
import { baseBushingInput } from './bushing-fixture';

test.describe('bushing edge-distance verification', () => {
  test('governing mode is deterministic from minima comparison', async () => {
    const out = computeBushing(baseBushingInput);
    const expected = out.edgeDistance.edMinSequence >= out.edgeDistance.edMinStrength ? 'sequencing' : 'strength';
    expect(out.edgeDistance.governing).toBe(expected);
  });

  test('failing edge distance emits deterministic warning codes', async () => {
    const out = computeBushing({ ...baseBushingInput, edgeDist: 0.12 });
    const codes = out.warningCodes.map((w) => w.code);
    if (out.edgeDistance.edActual / out.edgeDistance.edMinSequence - 1 < 0) {
      expect(codes).toContain('EDGE_DISTANCE_SEQUENCE_FAIL');
    }
    if (out.edgeDistance.edActual / out.edgeDistance.edMinStrength - 1 < 0) {
      expect(codes).toContain('EDGE_DISTANCE_STRENGTH_FAIL');
    }
    const edgeWarnings = out.warningCodes.filter((w) => w.code.startsWith('EDGE_DISTANCE_'));
    expect(edgeWarnings.length).toBeGreaterThan(0);
    expect(edgeWarnings.every((w) => w.severity === 'error')).toBeTruthy();
  });

  test('non-finite edge-strength requirement does not produce an Infinity remediation action', async () => {
    const results = {
      edgeDistance: {
        edActual: 4.4199,
        edMinSequence: 2.2148,
        edMinStrength: Number.POSITIVE_INFINITY,
        governing: 'sequencing'
      },
      geometry: {
        odBushing: 0.5015,
        wallStraight: 0.148,
        wallNeck: 0.148
      },
      warningCodes: [{ code: 'EDGE_DISTANCE_STRENGTH_FAIL', message: 'Edge distance strength margin is below zero.', severity: 'error' }]
    } as any;

    const entries = buildBushingWarningEntries(baseBushingInput, results, {
      updateForm: () => {},
      updateInterferencePolicy: () => {},
      updateBoreCapability: () => {}
    });

    expect(entries[0]?.actions.some((action) => action.label.includes('Infinity'))).toBeFalsy();
    expect(entries[0]?.actions.some((action) => action.label === 'Focus Geometry')).toBeTruthy();
  });
});
