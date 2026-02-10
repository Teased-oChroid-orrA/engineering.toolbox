import { expect, test } from '@playwright/test';
import { buildBushingViewModel, computeBushing } from '../../src/lib/core/bushing';
import { renderDraftingSheetSvg } from '../../src/lib/drafting/core/render';
import { baseBushingInput } from '../bushing-fixture';

function normalizeSvg(svg: string): string {
  return svg
    .replace(/<metadata>[\s\S]*?<\/metadata>/g, '<metadata>__META__</metadata>')
    .replace(/\s+/g, ' ')
    .trim();
}

test.describe('bushing visual snapshots', () => {
  const cases = [
    { name: 'straight', input: { ...baseBushingInput, bushingType: 'straight', idType: 'straight' } },
    { name: 'flanged', input: { ...baseBushingInput, bushingType: 'flanged', flangeOd: 0.82, flangeThk: 0.08 } },
    {
      name: 'countersink',
      input: { ...baseBushingInput, bushingType: 'countersink', idType: 'countersink', extCsDia: 0.72, extCsDepth: 0.09, csDepth: 0.1 }
    }
  ] as const;

  for (const c of cases) {
    test(`snapshot:${c.name}`, async () => {
      const results = computeBushing(c.input);
      const view = buildBushingViewModel(c.input, results);
      const svg = renderDraftingSheetSvg('bushing', view, { title: `snapshot-${c.name}`, date: '2026-02-10' });
      expect(normalizeSvg(svg)).toMatchSnapshot(`bushing-${c.name}.svg.txt`);
    });
  }
});
