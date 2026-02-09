export type RegexTemplate = { label: string; pattern: string; desc: string; tags?: string[] };
export type GenTab = 'builder' | 'templates' | 'tester';
export type ClauseKind = 'prefix' | 'contains' | 'suffix' | 'family' | 'dashOneOf' | 'dashRange' | 'exact' | 'custom';
export type BuildMode = 'inOrder' | 'anyOrder';
export type Clause = { id: string; kind: ClauseKind; a: string; b: string; c: string };

export const regexTemplates: RegexTemplate[] = [
  { label: 'AN part prefix', pattern: '^AN\\d+-.*', desc: 'Starts with AN + digits + dash.', tags: ['parts'] },
  { label: 'NAS/MS common', pattern: '^(NAS|MS)\\d+.*', desc: 'NAS or MS family numbers.', tags: ['parts'] },
  { label: 'Dash number', pattern: '.*-\\d+$', desc: 'Ends with dash number.', tags: ['parts'] },
  { label: 'Aluminum 7075', pattern: '.*7075.*', desc: 'Contains 7075 (toggle i flag for case-insensitive).', tags: ['materials'] },
  { label: 'Date YYYY-MM-DD', pattern: '^\\d{4}-\\d{2}-\\d{2}$', desc: 'Strict ISO date.', tags: ['dates'] },
  { label: 'DMS inch (e.g., 0.250")', pattern: '^\\d+(?:\\.\\d+)?\\s*(?:"|in|inch|inches)$', desc: 'Numeric with inch units.', tags: ['units'] }
];

const uid = () => `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function newClause(kind: ClauseKind, a = '', b = '', c = ''): Clause {
  return { id: uid(), kind, a, b, c };
}

export function genFlagsString(flags: { i: boolean; m: boolean; s: boolean }) {
  return `${flags.i ? 'i' : ''}${flags.m ? 'm' : ''}${flags.s ? 's' : ''}`;
}

export function moveClause(clauses: Clause[], idx: number, dir: -1 | 1): Clause[] {
  const next = [...clauses];
  const j = idx + dir;
  if (idx < 0 || idx >= next.length) return next;
  if (j < 0 || j >= next.length) return next;
  const tmp = next[idx];
  next[idx] = next[j];
  next[j] = tmp;
  return next;
}

export function removeClause(clauses: Clause[], idx: number): Clause[] {
  const next = [...clauses];
  next.splice(idx, 1);
  return next.length ? next : [newClause('contains', '')];
}

export function addClause(clauses: Clause[], kind: ClauseKind): Clause[] {
  return [...clauses, newClause(kind)];
}

const makeFamilyGroup = (raw: string) => {
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return '';
  return parts.map((p) => escapeRegExp(p)).join('|');
};

const makeOneOfGroup = (raw: string) => {
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return '';
  return parts.map((p) => escapeRegExp(p)).join('|');
};

const dashRangeGroup = (a: string, b: string) => {
  const lo = Number(a);
  const hi = Number(b);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return '';
  const L = Math.min(lo, hi);
  const H = Math.max(lo, hi);
  if (H - L > 40) return '\\d+';
  return Array.from({ length: H - L + 1 }, (_, i) => String(L + i)).join('|');
};

const permute = <T>(arr: T[]): T[][] => {
  if (arr.length <= 1) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const p of permute(rest)) out.push([arr[i], ...p]);
  }
  return out;
};

export function buildRegexCore(clauses: Clause[], mode: BuildMode): { pattern: string; warn: string | null } {
  for (const c of clauses) {
    const a = (c.a ?? '').trim();
    if (c.kind === 'exact' && a) return { pattern: `^${escapeRegExp(a)}$`, warn: null };
  }

  const nonEmpty = clauses.filter((c) => (c.a ?? '').trim().length > 0 || (c.b ?? '').trim().length > 0 || (c.c ?? '').trim().length > 0);
  const custom = nonEmpty.find((c) => c.kind === 'custom' && (c.a ?? '').trim().length > 0);
  if (custom && nonEmpty.length === 1) return { pattern: custom.a.trim(), warn: null };

  const warn: string[] = [];
  let start = '';
  let end = '';
  let hasStart = false;
  let hasEnd = false;
  const terms: string[] = [];

  for (const c of clauses) {
    const a = (c.a ?? '').trim();
    const b = (c.b ?? '').trim();
    const cc = (c.c ?? '').trim();

    if (c.kind === 'prefix') {
      if (!a) continue;
      if (!hasStart) {
        start = '^';
        hasStart = true;
      }
      start += escapeRegExp(a);
    } else if (c.kind === 'family') {
      const fam = makeFamilyGroup(a);
      if (!fam) continue;
      start = `^(${fam})\\d+`;
      hasStart = true;
      if (cc) terms.push(escapeRegExp(cc));
    } else if (c.kind === 'contains') {
      if (a) terms.push(escapeRegExp(a));
    } else if (c.kind === 'suffix') {
      if (!a) continue;
      end = `${escapeRegExp(a)}$`;
      hasEnd = true;
    } else if (c.kind === 'dashOneOf') {
      const grp = makeOneOfGroup(a);
      if (!grp) continue;
      end = `-(${grp})$`;
      hasEnd = true;
    } else if (c.kind === 'dashRange') {
      const grp = dashRangeGroup(a, b);
      if (!grp) continue;
      end = `-(${grp})$`;
      hasEnd = true;
    } else if (c.kind === 'custom' && a) {
      warn.push('Custom clause is ignored unless it is the only clause.');
    }
  }

  if (!hasStart && !hasEnd && terms.length === 0) return { pattern: '', warn: null };

  const prefixPad = hasStart ? '' : '.*';
  const suffixPad = hasEnd ? '' : '.*';

  let mid = '';
  if (terms.length === 0) {
    mid = '.*';
  } else if (mode === 'inOrder' || terms.length === 1) {
    mid = `${terms.map((t) => `.*${t}`).join('')}.*`;
  } else if (terms.length > 5) {
    warn.push('Any-order is capped at 5 terms; falling back to in-order.');
    mid = `${terms.map((t) => `.*${t}`).join('')}.*`;
  } else {
    const perms = permute(terms);
    const alts = perms.map((p) => p.map((t) => `.*${t}`).join('') + '.*');
    mid = `(?:${alts.join('|')})`;
  }

  const pattern = `${hasStart ? start : ''}${prefixPad}${mid}${hasEnd ? `.*${end}` : ''}${suffixPad}`;
  return { pattern, warn: warn.length ? warn.join(' ') : null };
}

export function getRegexWarnings(
  pattern: string,
  buildMode: BuildMode,
  coreWarn: string | null
): string | null {
  const pat = (pattern ?? '').trim();
  if (!pat) return null;
  const warns: string[] = [];
  if (coreWarn) warns.push(coreWarn);
  if (/\.\*\.\*/.test(pat)) warns.push('Contains ".*.*" (usually redundant).');
  if (!/[\^\$]/.test(pat)) warns.push('Not anchored (^/$). Consider anchoring for faster, stricter matching.');
  if (buildMode === 'anyOrder') warns.push('Any-order expands into an alternation; keep term count small for performance.');
  return warns.length ? warns.join(' ') : null;
}

export function validateRegexPattern(pattern: string, flags: string): string | null {
  const pat = (pattern ?? '').trim();
  if (!pat) return null;
  if (pat.length > 256) return 'Pattern exceeds 256 chars (backend will reject).';
  try {
    new RegExp(pat, flags);
    return null;
  } catch (e: any) {
    return e?.message ?? 'Invalid regex';
  }
}

export function computeRegexTestMatches(pattern: string, flags: string, sourceText: string) {
  const pat = (pattern ?? '').trim();
  if (!pat) return { count: 0, sample: [] as string[] };
  try {
    const mergedFlags = Array.from(new Set((flags + 'g').split(''))).join('');
    const re = new RegExp(pat, mergedFlags);
    const out: string[] = [];
    let m: RegExpExecArray | null;
    let guard = 0;
    while ((m = re.exec(sourceText ?? '')) && guard < 200) {
      out.push(m[0]);
      if (m[0].length === 0) re.lastIndex++;
      guard++;
    }
    return { count: out.length, sample: out.slice(0, 12) };
  } catch {
    return { count: 0, sample: [] as string[] };
  }
}
