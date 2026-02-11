import { expect, test } from '@playwright/test';
import {
  computeStartIdx,
  normalizeRowHeight,
  snapTranslateY
} from '../src/lib/components/inspector/InspectorGridWindowController';

test.describe('inspector grid window controller', () => {
  test('normalizes row height to safe range', async () => {
    expect(normalizeRowHeight(0)).toBe(24);
    expect(normalizeRowHeight(1000)).toBe(96);
    expect(normalizeRowHeight(33.9)).toBe(33);
  });

  test('computes bounded start index', async () => {
    expect(computeStartIdx(-100, 34, 1000)).toBe(0);
    expect(computeStartIdx(340, 34, 1000)).toBe(10);
    expect(computeStartIdx(999999, 34, 100)).toBe(99);
  });

  test('snaps translateY to integer pixel position', async () => {
    expect(snapTranslateY(10, 34)).toBe(340);
    expect(snapTranslateY(10, 33.8)).toBe(330);
  });
});

