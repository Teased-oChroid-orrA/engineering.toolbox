import { expect, test } from '@playwright/test';
import { buildBushingViewModel, computeBushing } from '../../src/lib/core/bushing';
import { renderBushingSection } from '../../src/lib/drafting/bushing/generate';
import { baseBushingInput } from '../bushing-fixture';

function normalizeSectionSvg(svgGroup: string): string {
  return svgGroup.replace(/\s+/g, ' ').trim();
}

test.describe('bushing section baseline snapshots', () => {
  const cases = [
    { name: 'straight', input: { ...baseBushingInput, bushingType: 'straight', idType: 'straight' } },
    { name: 'flanged', input: { ...baseBushingInput, bushingType: 'flanged', flangeOd: 0.82, flangeThk: 0.08 } },
    {
      name: 'countersink',
      input: { ...baseBushingInput, bushingType: 'countersink', idType: 'countersink', extCsDia: 0.72, extCsDepth: 0.09, csDepth: 0.1 }
    }
  ] as const;

  for (const c of cases) {
    test(`section-baseline:${c.name}`, async () => {
      const results = computeBushing(c.input);
      const view = buildBushingViewModel(c.input, results);
      const sectionGroup = renderBushingSection(view, { x: 0, y: 0, w: 420, h: 260 });
      expect(normalizeSectionSvg(sectionGroup)).toMatchSnapshot(`bushing-section-${c.name}.svg-fragment.txt`);
    });
  }
});

