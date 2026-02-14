import type { MatchMode, MultiQueryClause } from './InspectorStateTypes';

export function newMultiQueryClause(seed = 0): MultiQueryClause {
  return {
    id: `mq_${Date.now()}_${seed}`,
    query: '',
    matchMode: 'fuzzy',
    targetColIdx: null,
    logicalOp: 'AND',
    mode: 'fuzzy'
  };
}

export function toCombinedRegexQuery(
  clauses: MultiQueryClause[],
  escapeRegExp: (v: string) => string
): { query: string; error?: string } {
  const active = clauses
    .map((c) => ({ ...c, query: (c.query ?? '').trim() }))
    .filter((c) => c.query.length > 0);
  if (!active.length) return { query: '' };

  const lookaheads: string[] = [];
  for (const c of active) {
    if (c.mode === 'regex') {
      try {
        new RegExp(c.query, 'i');
      } catch (e: any) {
        return { query: '', error: `Multi-query regex invalid: ${e?.message ?? 'Invalid regex'}` };
      }
      lookaheads.push(`(?=.*(?:${c.query}))`);
      continue;
    }
    if (c.mode === 'exact') {
      lookaheads.push(`(?=.*\\b${escapeRegExp(c.query)}\\b)`);
      continue;
    }
    lookaheads.push(`(?=.*${escapeRegExp(c.query)})`);
  }

  return { query: `${lookaheads.join('')}.*` };
}

export function activeMultiQueryClauses(clauses: MultiQueryClause[]): MultiQueryClause[] {
  return (clauses ?? [])
    .map((c) => ({ ...c, query: (c.query ?? '').trim() }))
    .filter((c) => c.query.length > 0);
}

export function multiQueryHighlightRegexes(
  clauses: MultiQueryClause[],
  escapeRegExp: (v: string) => string
): RegExp[] {
  const out: RegExp[] = [];
  for (const c of activeMultiQueryClauses(clauses)) {
    try {
      if (c.mode === 'regex') {
        out.push(new RegExp(c.query, 'gi'));
        continue;
      }
      if (c.mode === 'exact') {
        out.push(new RegExp(`\\b${escapeRegExp(c.query)}\\b`, 'gi'));
        continue;
      }
      out.push(new RegExp(escapeRegExp(c.query), 'gi'));
    } catch {
      // Ignore invalid clause for best-effort highlighting.
    }
  }
  return out;
}
