import { expect, test } from '@playwright/test';
import { computeBushing } from '../src/lib/core/bushing';
import { buildBushingViewModel } from '../src/lib/core/bushing/viewModel';
import { renderBushingSection } from '../src/lib/drafting/bushing/generate';
import { baseBushingInput } from './bushing-fixture';

test.describe('bushing render mode contract', () => {
  test('legacy and section mode produce intentionally different markup', async () => {
    const solved = computeBushing(baseBushingInput);
    const view = buildBushingViewModel(baseBushingInput, solved);
    const section = renderBushingSection(view, { x: 0, y: 0, w: 420, h: 260 }, 'section');
    const legacy = renderBushingSection(view, { x: 0, y: 0, w: 420, h: 260 }, 'legacy');

    expect(section).not.toBe(legacy);
    expect(section).toContain('data-layer="section-material"');
    expect(legacy).toContain('data-layer="legacy-material"');
  });
});

