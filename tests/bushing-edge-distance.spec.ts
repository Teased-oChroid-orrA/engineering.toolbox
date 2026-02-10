import { expect, test } from '@playwright/test';
import { computeBushing } from '../src/lib/core/bushing';
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
});
