export type QueryScope = 'current' | 'all' | 'ask';
export type MatchMode = 'fuzzy' | 'exact' | 'regex';
import type { 
  CategoryFilterState, 
  DateFilterState, 
  NumericFilterState,
  MultiQueryClause
} from '$lib/components/inspector/InspectorStateTypes';

export const shouldRunCrossFileQuery = (scope: QueryScope, loadedDatasetsLength: number) =>
  scope === 'all' && loadedDatasetsLength > 1;

export const normalizeQuery = (value: string) => (value ?? '').trim();

export function createInvalidationQueue() {
  let epoch = 0;
  return {
    issue() {
      epoch += 1;
      return epoch;
    },
    isCurrent(token: number) {
      return token === epoch;
    },
    current() {
      return epoch;
    }
  };
}

export function parseMaxRowsScanText(maxRowsScanText: string): number | null {
  const t = (maxRowsScanText ?? '').trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

export function buildFilterSpec(args: {
  query: string;
  targetColIdx: number | null;
  matchMode: MatchMode;
  multiQueryEnabled?: boolean;
  multiQueryClauses?: MultiQueryClause[];
  escapeRegExp?: (v: string) => string;
  numericF: NumericFilterState;
  dateF: DateFilterState;
  catF: CategoryFilterState;
  maxRowsScanText: string;
}): { spec: any | null; queryError?: string | null; numericError?: string | null; dateError?: string | null } {
  const {
    query,
    targetColIdx,
    matchMode,
    multiQueryEnabled = false,
    multiQueryClauses = [],
    escapeRegExp = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    numericF,
    dateF,
    catF,
    maxRowsScanText
  } = args;

  const effectiveQuery = query ?? '';
  const effectiveMode = matchMode;
  const activeMultiQueryClauses = multiQueryEnabled
    ? (multiQueryClauses ?? [])
        .map((c) => ({ ...c, query: (c.query ?? '').trim() }))
        .filter((c) => c.query.length > 0)
    : [];
  if (activeMultiQueryClauses.length > 0) {
    for (const c of activeMultiQueryClauses) {
      if (c.mode !== 'regex') continue;
      try {
        new RegExp(c.query, 'i');
      } catch (e: any) {
        return { spec: null, queryError: `Multi-query regex invalid: ${e?.message ?? 'Invalid regex'}` };
      }
    }
  }

  if (effectiveMode === 'regex' && effectiveQuery.trim().length > 0) {
    try {
      new RegExp(effectiveQuery, 'i');
    } catch (e: any) {
      return { spec: null, queryError: e?.message ?? 'Invalid regex' };
    }
  }

  const numericFilter = (() => {
    if (!numericF.enabled || numericF.colIdx == null) return null;
    const minT = (numericF.minText ?? '').trim();
    const maxT = (numericF.maxText ?? '').trim();
    const min = minT ? Number(minT) : -1e308;
    const max = maxT ? Number(maxT) : 1e308;
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return { __err: 'Numeric bounds must be valid numbers.' };
    }
    if (min > max) {
      return { __err: 'Min must be ≤ Max.' };
    }
    return { enabled: true, colIdx: numericF.colIdx, min, max };
  })() as any;
  if (numericFilter?.__err) return { spec: null, numericError: numericFilter.__err };

  const dateFilter = (() => {
    if (!dateF.enabled || dateF.colIdx == null) return null;
    const minIso = (dateF.minIso ?? '').trim();
    const maxIso = (dateF.maxIso ?? '').trim();
    if (minIso && !/^\d{4}-\d{2}-\d{2}$/.test(minIso)) return { __err: 'Min date must be YYYY-MM-DD.' };
    if (maxIso && !/^\d{4}-\d{2}-\d{2}$/.test(maxIso)) return { __err: 'Max date must be YYYY-MM-DD.' };
    if (minIso && maxIso && minIso > maxIso) return { __err: 'Min date must be ≤ Max date.' };
    return {
      enabled: true,
      colIdx: dateF.colIdx,
      minIso: minIso || '1900-01-01',
      maxIso: maxIso || '3000-01-01'
    };
  })() as any;
  if (dateFilter?.__err) return { spec: null, dateError: dateFilter.__err };

  const categoryFilter = (() => {
    if (!catF.enabled || catF.colIdx == null) return null;
    return { enabled: true, colIdx: catF.colIdx, selected: [...(catF.selected ?? new Set())] };
  })();

  return {
    spec: {
      query: effectiveQuery,
      columnIdx: targetColIdx,
      matchMode: effectiveMode,
      multiQueryEnabled,
      multiQueryClauses: activeMultiQueryClauses,
      numericFilter,
      dateFilter,
      categoryFilter,
      maxRowsScan: parseMaxRowsScanText(maxRowsScanText)
    }
  };
}
