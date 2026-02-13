import type { MultiQueryClause } from '$lib/components/inspector/InspectorOrchestratorDeps';

export function highlightCell(
  cell: string,
  query: string,
  matchMode: 'fuzzy' | 'regex' | 'exact',
  multiQueryEnabled: boolean,
  multiQueryClauses: MultiQueryClause[],
  escapeRegExp: (s: string) => string,
  escapeHtml: (s: string) => string,
  multiQueryHighlightRegexes: (clauses: MultiQueryClause[], escapeRegExpFn: (s: string) => string) => RegExp[]
): string {
  const raw = cell ?? '';
  const q = (query ?? '').trim();
  const regexes: RegExp[] = [];
  try {
    if (q) {
      if (matchMode === 'regex') regexes.push(new RegExp(q, 'gi'));
      else regexes.push(new RegExp(escapeRegExp(q), 'gi'));
    }
  } catch {
    // ignore invalid base regex for highlighting; query error is surfaced elsewhere
  }
  if (multiQueryEnabled) regexes.push(...multiQueryHighlightRegexes(multiQueryClauses, escapeRegExp));
  if (!regexes.length) return escapeHtml(raw);

  const ranges: Array<{ start: number; end: number }> = [];
  for (const re of regexes) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null = null;
    while ((m = re.exec(raw)) !== null) {
      const text = m[0] ?? '';
      if (!text.length) {
        re.lastIndex += 1;
        continue;
      }
      ranges.push({ start: m.index, end: m.index + text.length });
    }
  }
  if (!ranges.length) return escapeHtml(raw);

  ranges.sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: Array<{ start: number; end: number }> = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (!last || r.start > last.end) merged.push({ ...r });
    else if (r.end > last.end) last.end = r.end;
  }

  let out = '';
  let cursor = 0;
  for (const r of merged) {
    if (r.start > cursor) out += escapeHtml(raw.slice(cursor, r.start));
    out += `<span class="ins-query-hit">${escapeHtml(raw.slice(r.start, r.end))}</span>`;
    cursor = r.end;
  }
  if (cursor < raw.length) out += escapeHtml(raw.slice(cursor));
  return out;
}
