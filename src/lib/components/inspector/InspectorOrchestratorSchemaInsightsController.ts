type ColType = 'numeric' | 'date' | 'string';

export type SchemaColStat = {
  idx: number;
  name: string;
  type: ColType;
  empty: number;
  nonEmpty: number;
  emptyPct: number;
  typeConfidence: number;
  numericParseRate: number;
  dateParseRate: number;
  distinctSample: number;
  distinctRatio: number;
  entropyNorm: number;
  topSample: { v: string; n: number }[];
  min?: string;
  max?: string;
};

export type SuggestedCol = {
  idx: number;
  name: string;
  kind: 'categorical' | 'numeric' | 'date' | 'identifier';
  score: number;
  reason: string;
};

type SchemaActionCtx = {
  targetColIdx: number | null;
  tier2Open: boolean;
  tier2Tab: 'numeric' | 'date' | 'category';
  catF: { enabled: boolean; colIdx: number | null; selected: Set<string> };
  numericF: { enabled: boolean; colIdx: number | null; minText: string; maxText: string };
  dateF: { enabled: boolean; colIdx: number | null; minIso: string; maxIso: string };
  schemaStats: SchemaColStat[];
  runFilterNow: () => Promise<void> | void;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function scoreMid(x: number, mid: number, width: number): number {
  const d = Math.abs(x - mid);
  return clamp(1 - d / Math.max(1e-6, width), 0, 1);
}

export function computeSchemaSuggested(schemaStats: SchemaColStat[]) {
  const out: SuggestedCol[] = [];
  for (const s of schemaStats ?? []) {
    if ((s.nonEmpty ?? 0) < 25) continue;
    if ((s.emptyPct ?? 100) > 60) continue;

    if (s.distinctRatio >= 0.9 && s.entropyNorm >= 0.9) {
      out.push({
        idx: s.idx,
        name: s.name,
        kind: 'identifier',
        score: (1 - s.emptyPct / 100) * s.distinctRatio,
        reason: `High uniqueness (${(s.distinctRatio * 100).toFixed(0)}% distinct)`
      });
      continue;
    }

    const isCat = s.distinctSample >= 2 && s.distinctSample <= 30 && s.distinctRatio <= 0.35;
    if (isCat) {
      const skewOk = scoreMid(s.entropyNorm, 0.7, 0.5);
      const score = (1 - s.emptyPct / 100) * (1 - s.distinctRatio) * skewOk * Math.log(1 + s.distinctSample);
      out.push({
        idx: s.idx,
        name: s.name,
        kind: 'categorical',
        score,
        reason: `Low card (${s.distinctSample}) • entropy ${(s.entropyNorm * 100).toFixed(0)}%`
      });
    }

    if (s.numericParseRate >= 0.95) {
      out.push({
        idx: s.idx,
        name: s.name,
        kind: 'numeric',
        score: (1 - s.emptyPct / 100) * s.numericParseRate * scoreMid(s.distinctRatio, 0.6, 0.5),
        reason: `Numeric parse ${(s.numericParseRate * 100).toFixed(0)}%`
      });
    }
    if (s.dateParseRate >= 0.9) {
      out.push({
        idx: s.idx,
        name: s.name,
        kind: 'date',
        score: (1 - s.emptyPct / 100) * s.dateParseRate,
        reason: `Date parse ${(s.dateParseRate * 100).toFixed(0)}%`
      });
    }
  }

  const pick = (kind: SuggestedCol['kind'], n: number) =>
    out.filter((x) => x.kind === kind).sort((a, b) => b.score - a.score).slice(0, n);

  return {
    categorical: pick('categorical', 8),
    numeric: pick('numeric', 6),
    date: pick('date', 6),
    identifier: pick('identifier', 6)
  };
}

export function computeSchemaOutliers(schemaStats: SchemaColStat[]) {
  const out: { idx: number; name: string; zHint: number; reason: string }[] = [];
  for (const s of schemaStats ?? []) {
    if (s.type !== 'numeric') continue;
    const ratio = s.distinctRatio ?? 0;
    const entropy = s.entropyNorm ?? 0;
    const parse = s.numericParseRate ?? 0;
    const zHint = clamp((ratio * 0.8 + entropy * 0.4 + parse * 0.3) * 3.2, 0, 5);
    if (zHint < 2.2) continue;
    out.push({
      idx: s.idx,
      name: s.name,
      zHint: Number(zHint.toFixed(2)),
      reason: `High spread signature (distinct ${(ratio * 100).toFixed(0)}%, entropy ${(entropy * 100).toFixed(0)}%).`
    });
  }
  return out.sort((a, b) => b.zHint - a.zHint).slice(0, 8);
}

export function computeSchemaRelationshipHints(schemaStats: SchemaColStat[]) {
  const hs = schemaStats ?? [];
  const out: { a: number; b: number; score: number; reason: string }[] = [];
  for (let i = 0; i < hs.length; i++) {
    for (let j = i + 1; j < hs.length; j++) {
      const a = hs[i];
      const b = hs[j];
      if (!a || !b || a.type !== b.type) continue;
      const cardProx = 1 - Math.abs((a.distinctRatio ?? 0) - (b.distinctRatio ?? 0));
      const emptyProx = 1 - Math.abs((a.emptyPct ?? 0) - (b.emptyPct ?? 0)) / 100;
      const score = clamp(cardProx * 0.7 + emptyProx * 0.3, 0, 1);
      if (score < 0.86) continue;
      out.push({
        a: a.idx,
        b: b.idx,
        score: Number(score.toFixed(2)),
        reason: `${a.name} ↔ ${b.name} show similar cardinality/completeness.`
      });
    }
  }
  return out.sort((x, y) => y.score - x.score).slice(0, 8);
}

export function computeSchemaDrift(schemaStats: SchemaColStat[], baseline: SchemaColStat[] | null) {
  if (!baseline?.length || !(schemaStats?.length ?? 0)) return [];
  const base = new Map<number, SchemaColStat>();
  for (const s of baseline) base.set(s.idx, s);
  const out: { idx: number; name: string; drift: number; reason: string }[] = [];
  for (const s of schemaStats ?? []) {
    const b = base.get(s.idx);
    if (!b) continue;
    const dEmpty = Math.abs((s.emptyPct ?? 0) - (b.emptyPct ?? 0)) / 100;
    const dDistinct = Math.abs((s.distinctRatio ?? 0) - (b.distinctRatio ?? 0));
    const dType = s.type === b.type ? 0 : 0.5;
    const drift = clamp(dEmpty * 0.35 + dDistinct * 0.45 + dType * 0.2, 0, 1);
    if (drift < 0.15) continue;
    out.push({
      idx: s.idx,
      name: s.name,
      drift: Number(drift.toFixed(2)),
      reason: `empty ${(b.emptyPct ?? 0).toFixed(1)}%→${(s.emptyPct ?? 0).toFixed(1)}%, distinct ${(b.distinctRatio ?? 0).toFixed(2)}→${(s.distinctRatio ?? 0).toFixed(2)}`
    });
  }
  return out.sort((a, b) => b.drift - a.drift).slice(0, 10);
}

export function schemaActionTarget(ctx: SchemaActionCtx, idx: number) {
  ctx.targetColIdx = idx;
}

export function schemaActionCategory(ctx: SchemaActionCtx, idx: number, autoSelectTop = true) {
  ctx.tier2Open = true;
  ctx.tier2Tab = 'category';
  ctx.catF = { ...ctx.catF, enabled: true, colIdx: idx };
  if (autoSelectTop) {
    const st = (ctx.schemaStats ?? []).find((s) => s.idx === idx);
    const top = (st?.topSample ?? [])
      .slice(0, 6)
      .map((x) => x.v)
      .filter((v) => (v ?? '').trim().length > 0);
    ctx.catF = { ...ctx.catF, selected: new Set<string>(top) };
  }
  void ctx.runFilterNow();
}

export function schemaActionNumericRange(ctx: SchemaActionCtx, idx: number, useMinMax = true) {
  ctx.tier2Open = true;
  ctx.tier2Tab = 'numeric';
  const next = { ...ctx.numericF, enabled: true, colIdx: idx };
  const st = (ctx.schemaStats ?? []).find((s) => s.idx === idx);
  if (useMinMax && st?.min != null && st?.max != null) {
    next.minText = st.min;
    next.maxText = st.max;
  }
  ctx.numericF = next;
  void ctx.runFilterNow();
}

export function schemaActionDateRange(ctx: SchemaActionCtx, idx: number, useMinMax = true) {
  ctx.tier2Open = true;
  ctx.tier2Tab = 'date';
  const next = { ...ctx.dateF, enabled: true, colIdx: idx };
  const st = (ctx.schemaStats ?? []).find((s) => s.idx === idx);
  if (useMinMax && st?.min != null && st?.max != null) {
    next.minIso = st.min;
    next.maxIso = st.max;
  }
  ctx.dateF = next;
  void ctx.runFilterNow();
}
