import { expect, test } from '@playwright/test';
import { buildBushingViewModel, computeBushing } from '../src/lib/core/bushing';
import { renderBushingSection } from '../src/lib/drafting/bushing/generate';
import { prepareBushingExportArtifacts } from '../src/lib/components/bushing/BushingExportController';
import { baseBushingInput } from './bushing-fixture';

test.describe('bushing smoke', () => {
  test('compute + live render path are healthy', async () => {
    const results = computeBushing(baseBushingInput);
    const view = buildBushingViewModel(baseBushingInput, results);
    const g = renderBushingSection(view, { x: 20, y: 20, w: 300, h: 160 });
    expect(g).toContain('SECTION VIEW A-A');
    expect(g).not.toContain('NaN');
    expect(results.warningCodes).toBeDefined();
  });

  test('export artifact path produces svg + report html', async () => {
    const results = computeBushing(baseBushingInput);
    const view = buildBushingViewModel(baseBushingInput, results);
    const { svgText, html } = prepareBushingExportArtifacts({ form: baseBushingInput, results, draftingView: view });
    expect(svgText).toContain('<svg');
    expect(svgText).toContain('SECTION VIEW A-A');
    expect(html).toContain('Bushing Toolbox');
    expect(html).toContain('Drafting Sheet');
  });
});
