export type PerfOp =
  | 'filter'
  | 'slice'
  | 'sort'
  | 'schema'
  | 'category'
  | 'row_drawer';

export type PerfSample = {
  op: PerfOp;
  ms: number;
  ts: number;
  meta?: Record<string, unknown>;
};

export type PerfSummary = {
  count: number;
  p50: number;
  p95: number;
  max: number;
};

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * (sorted.length - 1))));
  return sorted[idx] ?? 0;
}

export class PerfRecorder {
  private samples: PerfSample[] = [];

  record(sample: PerfSample): void {
    this.samples.push(sample);
    if (this.samples.length > 5000) this.samples.splice(0, this.samples.length - 5000);
  }

  list(op?: PerfOp): PerfSample[] {
    if (!op) return [...this.samples];
    return this.samples.filter((s) => s.op === op);
  }

  summary(op: PerfOp): PerfSummary {
    const arr = this.samples.filter((s) => s.op === op).map((s) => s.ms).sort((a, b) => a - b);
    return {
      count: arr.length,
      p50: percentile(arr, 50),
      p95: percentile(arr, 95),
      max: arr.length ? arr[arr.length - 1] : 0,
    };
  }

  baselineReport(slos: Record<PerfOp, number>): string {
    const ops: PerfOp[] = ['filter', 'slice', 'sort', 'schema', 'category', 'row_drawer'];
    const lines = [
      '# Inspector Baseline Report',
      `Generated: ${new Date().toISOString()}`,
      '',
      '| Op | Count | p50 (ms) | p95 (ms) | Max (ms) | SLO p95 (ms) | Status |',
      '|---|---:|---:|---:|---:|---:|---|',
    ];

    for (const op of ops) {
      const s = this.summary(op);
      const slo = slos[op] ?? 0;
      const ok = slo > 0 ? s.p95 <= slo : true;
      lines.push(`| ${op} | ${s.count} | ${s.p50.toFixed(1)} | ${s.p95.toFixed(1)} | ${s.max.toFixed(1)} | ${slo || '-'} | ${ok ? 'PASS' : 'FAIL'} |`);
    }

    return lines.join('\n');
  }
}

export type RequestGate = {
  nextToken: () => number;
  isLatest: (token: number) => boolean;
};

export function createRequestGate(): RequestGate {
  let latest = 0;
  return {
    nextToken() {
      latest += 1;
      return latest;
    },
    isLatest(token) {
      return token === latest;
    },
  };
}

export type RecipeStateV2 = {
  query: string;
  matchMode: 'fuzzy' | 'exact' | 'regex';
  targetColIdx: number | null;
  maxRowsScanText: string;
  numericF?: { enabled: boolean; colIdx: number | null; minText: string; maxText: string };
  dateF?: { enabled: boolean; colIdx: number | null; minIso: string; maxIso: string };
  catF?: { enabled: boolean; colIdx: number | null; selected: string[] };
  sortColIdx: number | null;
  sortDir: 'asc' | 'desc';
  visibleColumns: number[];
};

export type RecipeStateV3 = RecipeStateV2 & {
  version: 3;
  autoRestore?: boolean;
};

export function migrateRecipeState(raw: unknown): RecipeStateV3 | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  if (r.version === 3) {
    return r as RecipeStateV3;
  }

  const matchMode = r.matchMode;
  if (matchMode !== 'fuzzy' && matchMode !== 'exact' && matchMode !== 'regex') return null;

  return {
    version: 3,
    query: typeof r.query === 'string' ? r.query : '',
    matchMode,
    targetColIdx: typeof r.targetColIdx === 'number' ? r.targetColIdx : null,
    maxRowsScanText: typeof r.maxRowsScanText === 'string' ? r.maxRowsScanText : '',
    numericF: r.numericF as RecipeStateV2['numericF'],
    dateF: r.dateF as RecipeStateV2['dateF'],
    catF: r.catF as RecipeStateV2['catF'],
    sortColIdx: typeof r.sortColIdx === 'number' ? r.sortColIdx : null,
    sortDir: r.sortDir === 'desc' ? 'desc' : 'asc',
    visibleColumns: Array.isArray(r.visibleColumns) ? (r.visibleColumns as unknown[]).filter((x): x is number => typeof x === 'number') : [],
    autoRestore: true,
  };
}

export function dedupeRecipesById<T extends { id: string; name: string; createdAt: number }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    if (!item?.id || seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}
