import { expect, test } from '@playwright/test';
import { multiQueryHighlightRegexes, toCombinedRegexQuery } from '../src/lib/components/inspector/InspectorMultiQueryController';

const esc = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test.describe('inspector multi-query controller', () => {
  test('combines fuzzy/exact clauses into lookahead regex', async () => {
    const out = toCombinedRegexQuery(
      [
        { id: '1', mode: 'fuzzy', query: 'bolt', matchMode: 'fuzzy', targetColIdx: null, logicalOp: 'AND' },
        { id: '2', mode: 'exact', query: 'M12', matchMode: 'exact', targetColIdx: null, logicalOp: 'AND' }
      ],
      esc
    );
    expect(out.error).toBeUndefined();
    expect(out.query).toContain('(?=.*bolt)');
    expect(out.query).toContain('(?=.*\\bM12\\b)');
  });

  test('returns error for invalid regex clauses', async () => {
    const out = toCombinedRegexQuery([{ id: '1', mode: 'regex', query: '([abc', matchMode: 'regex', targetColIdx: null, logicalOp: 'AND' }], esc);
    expect(out.error).toContain('Multi-query regex invalid');
  });

  test('builds highlight regexes for active clauses only', async () => {
    const regexes = multiQueryHighlightRegexes(
      [
        { id: '1', mode: 'fuzzy', query: 'bolt', matchMode: 'fuzzy', targetColIdx: null, logicalOp: 'AND' },
        { id: '2', mode: 'exact', query: 'M12', matchMode: 'exact', targetColIdx: null, logicalOp: 'AND' },
        { id: '3', mode: 'regex', query: '(', matchMode: 'regex', targetColIdx: null, logicalOp: 'AND' },
        { id: '4', mode: 'fuzzy', query: '', matchMode: 'fuzzy', targetColIdx: null, logicalOp: 'AND' }
      ],
      esc
    );
    expect(regexes).toHaveLength(2);
    expect('M12x1 bolt'.match(regexes[0]) ?? []).toBeTruthy();
    expect('M12x1 bolt'.match(regexes[1]) ?? []).toBeTruthy();
  });
});
