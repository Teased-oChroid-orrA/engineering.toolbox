import { expect, test } from '@playwright/test';
import { computeBushing } from '../src/lib/core/bushing';
import { buildBushingViewModel } from '../src/lib/core/bushing/viewModel';
import { buildBushingScene } from '../src/lib/drafting/bushing/bushingSceneModel';
import { buildBushingTraceRecord } from '../src/lib/components/bushing/BushingTraceLogger';
import { baseBushingInput } from './bushing-fixture';

test.describe('bushing trace logger', () => {
  test('captures raw -> normalized -> solved -> rendered chain', async () => {
    const solved = computeBushing(baseBushingInput);
    const view = buildBushingViewModel(baseBushingInput, solved);
    const scene = buildBushingScene(view);
    const trace = buildBushingTraceRecord({
      rawInput: baseBushingInput,
      solved,
      scene,
      source: 'test'
    });

    expect(trace.rawInput.boreDia).toBe(baseBushingInput.boreDia);
    expect(trace.normalizedInput.boreDia).toBeGreaterThan(0);
    expect(Number.isFinite(trace.solved.contactPressure)).toBeTruthy();
    expect(Number.isFinite(trace.rendered.sceneSize.width)).toBeTruthy();
    expect(trace.rendered.signature.length).toBeGreaterThan(8);
    expect(trace.rendered.labelTitle).toContain('SECTION');
  });
});

