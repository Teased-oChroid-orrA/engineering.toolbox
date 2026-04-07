import { expect, test } from '@playwright/test';
import { computeSchemaDrift } from '../src/lib/components/inspector/InspectorOrchestratorSchemaInsightsController';

test('schema drift reports changed, added, and removed columns', () => {
  const baseline = [
    { idx: 0, name: 'id', type: 'numeric', empty: 0, nonEmpty: 10, emptyPct: 0, typeConfidence: 1, numericParseRate: 1, dateParseRate: 0, distinctSample: 10, distinctRatio: 1, entropyNorm: 1, topSample: [], min: '1', max: '10' },
    { idx: 1, name: 'legacy', type: 'string', empty: 0, nonEmpty: 10, emptyPct: 0, typeConfidence: 1, numericParseRate: 0, dateParseRate: 0, distinctSample: 2, distinctRatio: 0.2, entropyNorm: 0.3, topSample: [] }
  ] as any;
  const current = [
    { idx: 0, name: 'id', type: 'string', empty: 3, nonEmpty: 7, emptyPct: 30, typeConfidence: 1, numericParseRate: 0.2, dateParseRate: 0, distinctSample: 6, distinctRatio: 0.6, entropyNorm: 0.7, topSample: [] },
    { idx: 2, name: 'added_col', type: 'date', empty: 0, nonEmpty: 10, emptyPct: 0, typeConfidence: 1, numericParseRate: 0, dateParseRate: 1, distinctSample: 10, distinctRatio: 1, entropyNorm: 1, topSample: [] }
  ] as any;

  const drift = computeSchemaDrift(current, baseline);
  expect(drift.some((entry) => entry.kind === 'changed' && entry.name === 'id')).toBeTruthy();
  expect(drift.some((entry) => entry.kind === 'added' && entry.name === 'added_col')).toBeTruthy();
  expect(drift.some((entry) => entry.kind === 'removed' && entry.name === 'legacy')).toBeTruthy();
});
