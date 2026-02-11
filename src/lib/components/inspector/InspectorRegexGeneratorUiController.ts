import {
  addRegexClause,
  buildRegexCore,
  computeRegexTestMatches,
  genFlagsString,
  getRegexWarnings,
  moveRegexClause,
  newClause,
  removeRegexClause,
  validateRegexPattern,
  type BuildMode,
  type Clause,
  type ClauseKind
} from '$lib/components/inspector/InspectorOrchestratorDeps';

type RegexFlags = { i: boolean; m: boolean; s: boolean };

type RegexApplyCtx = {
  setQuery: (v: string) => void;
  setMatchMode: (v: string) => void;
  setShowRegexGenerator: (v: boolean) => void;
  setShowRegexHelp: (v: boolean) => void;
};

export function defaultRegexClauses(): Clause[] {
  return [newClause('prefix', 'AN')];
}

export function moveRegexGeneratorClause(clauses: Clause[], idx: number, dir: -1 | 1): Clause[] {
  return moveRegexClause(clauses, idx, dir);
}

export function removeRegexGeneratorClause(clauses: Clause[], idx: number): Clause[] {
  return removeRegexClause(clauses, idx);
}

export function addRegexGeneratorClause(clauses: Clause[], kind: ClauseKind): Clause[] {
  return addRegexClause(clauses, kind);
}

export function buildRegexGeneratorOutput(clauses: Clause[], buildMode: BuildMode): {
  pattern: string;
  warnExtra: string | null;
} {
  const built = buildRegexCore(clauses ?? [], buildMode);
  return {
    pattern: (built?.pattern ?? '').trim(),
    warnExtra: built?.warn ?? null
  };
}

export function validateRegexGenerator(pattern: string, flags: RegexFlags): string | null {
  return validateRegexPattern(pattern, genFlagsString(flags));
}

export function regexGeneratorWarnings(pattern: string, buildMode: BuildMode, warnExtra: string | null): string | null {
  return getRegexWarnings(pattern, buildMode, warnExtra);
}

export function regexGeneratorMatches(
  pattern: string,
  flags: RegexFlags,
  text: string,
  hasError: boolean
): { count: number; sample: string[] } {
  if (hasError) return { count: 0, sample: [] };
  return computeRegexTestMatches(pattern, genFlagsString(flags), text ?? '');
}

export function applyGeneratedRegexUi(ctx: RegexApplyCtx, pattern: string): void {
  ctx.setQuery(pattern);
  ctx.setMatchMode('regex');
  ctx.setShowRegexGenerator(false);
  ctx.setShowRegexHelp(false);
}
