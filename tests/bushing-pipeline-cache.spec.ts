import { expect, test } from '@playwright/test';
import {
  clearBushingPipelineCache,
  evaluateBushingPipeline,
  getBushingPipelineCacheStats
} from '../src/lib/components/bushing/BushingComputeController';
import { baseBushingInput } from './bushing-fixture';

test.describe('bushing compute pipeline cache', () => {
  test.beforeEach(async () => {
    clearBushingPipelineCache();
  });

  test('returns cache hit for equivalent normalized inputs', async () => {
    const a = evaluateBushingPipeline(baseBushingInput);
    const b = evaluateBushingPipeline({ ...baseBushingInput });
    expect(a.cacheHit).toBeFalsy();
    expect(b.cacheHit).toBeTruthy();
    const stats = getBushingPipelineCacheStats();
    expect(stats.hits).toBeGreaterThanOrEqual(1);
  });

  test('invalidates cache on relevant input changes', async () => {
    evaluateBushingPipeline(baseBushingInput);
    const changed = evaluateBushingPipeline({ ...baseBushingInput, interference: baseBushingInput.interference + 0.0002 });
    expect(changed.cacheHit).toBeFalsy();
    const stats = getBushingPipelineCacheStats();
    expect(stats.misses).toBeGreaterThanOrEqual(2);
  });
});

