export type RegexHint = { level: 'info' | 'warn' | 'danger'; msg: string };

export function escapeHtml(s: string) {
  return (s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function escapeRegExp(s: string) {
  return (s ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function analyzeRegex(pattern: string): RegexHint[] {
  const p = (pattern ?? '').trim();
  if (!p) return [];
  const out: RegexHint[] = [];
  if (p.length > 256) out.push({ level: 'danger', msg: 'Pattern exceeds 256 chars (backend cap).' });
  if (/\.\*\.\*/.test(p)) out.push({ level: 'warn', msg: 'Contains \' .*.* \' which is often slow. Prefer anchors or tighter character classes.' });
  if (/(\(\.\*\)\+)|(\(\.\+\)\+)|(\(.*\)\+\+)/.test(p)) out.push({ level: 'danger', msg: 'Nested / repeated quantified groups (e.g., (.*)+, (.+)+) — high backtracking risk.' });
  if (/\([^)]*[+*{][^)]*\)[+*{]/.test(p)) out.push({ level: 'danger', msg: 'Nested quantifiers detected (e.g., (a+)+). High backtracking risk.' });
  if (/\|/.test(p) && /\(.*\|.*\)[+*{]/.test(p)) out.push({ level: 'warn', msg: 'Alternation inside a quantified group can be slow. Prefer anchors or explicit prefixes.' });
  if (!/^\^/.test(p)) out.push({ level: 'info', msg: 'Tip: Add ^ if you expect matches near the start.' });
  if (!/\$\s*$/.test(p) && /^\^/.test(p)) out.push({ level: 'info', msg: 'Tip: Add $ for full-string match.' });
  return out;
}

export function safeLocalStorageGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

export function safeLocalStorageSet(key: string, val: string) {
  try { localStorage.setItem(key, val); } catch {}
}

export function fnv1a32(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return ('0000000' + h.toString(16)).slice(-8);
}

export function computeActiveFilterHash(args: {
  query: string;
  matchMode: 'fuzzy' | 'exact' | 'regex';
  targetColIdx: number | null;
  numericF: { enabled: boolean; colIdx: number | null; minText: string; maxText: string };
  dateF: { enabled: boolean; colIdx: number | null; minIso: string; maxIso: string };
  catF: { enabled: boolean; colIdx: number | null; selected: Set<string> };
}) {
  const state = {
    query: args.query ?? '',
    matchMode: args.matchMode,
    targetColIdx: args.targetColIdx,
    numericF: { ...args.numericF, selected: undefined },
    dateF: { ...args.dateF },
    catF: { enabled: args.catF.enabled, colIdx: args.catF.colIdx, selected: [...(args.catF.selected ?? new Set())].sort() }
  };
  return fnv1a32(JSON.stringify(state));
}
