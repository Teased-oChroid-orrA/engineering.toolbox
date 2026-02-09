export type ColType = 'numeric' | 'date' | 'string';

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

export const createSchemaCacheKey = (datasetId: string, filterSig: string, sampleN: number, tier: string) =>
  `${datasetId}::${filterSig}::${sampleN}::${tier}`;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function parseF64Relaxed(s: string): number | null {
  const t = (s ?? '').trim();
  if (!t) return null;
  const cleaned = t.replaceAll(',', '').replaceAll('_', '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function parseDateRelaxed(s: string): number | null {
  const t = (s ?? '').trim();
  if (!t) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (iso) return Date.parse(`${iso[1]}-${iso[2]}-${iso[3]}T00:00:00Z`);
  const mdy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  if (mdy) return Date.parse(`${mdy[3]}-${String(mdy[1]).padStart(2, '0')}-${String(mdy[2]).padStart(2, '0')}T00:00:00Z`);
  const ymd = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(t);
  if (ymd) return Date.parse(`${ymd[1]}-${String(ymd[2]).padStart(2, '0')}-${String(ymd[3]).padStart(2, '0')}T00:00:00Z`);
  const p = Date.parse(t);
  return Number.isFinite(p) ? p : null;
}

export function fmtDate(ms: number): string {
  const d = new Date(ms);
  if (!Number.isFinite(d.getTime())) return '';
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function profileSchemaFromRows(
  rows: string[][],
  headers: string[],
  colTypes: ColType[]
): SchemaColStat[] {
  const colN = headers.length;
  const empties = new Array<number>(colN).fill(0);
  const nonEmpty = new Array<number>(colN).fill(0);
  const numOk = new Array<number>(colN).fill(0);
  const dateOk = new Array<number>(colN).fill(0);
  const distinctMaps: Map<string, number>[] = new Array(colN);
  for (let c = 0; c < colN; c++) distinctMaps[c] = new Map();
  const numMin = new Array<number | null>(colN).fill(null);
  const numMax = new Array<number | null>(colN).fill(null);
  const dateMin = new Array<number | null>(colN).fill(null);
  const dateMax = new Array<number | null>(colN).fill(null);

  const distinctCap = 200;
  for (const row of rows ?? []) {
    for (let c = 0; c < colN; c++) {
      const v = (row?.[c] ?? '').trim();
      if (!v) {
        empties[c]++;
        continue;
      }
      nonEmpty[c]++;
      const m = distinctMaps[c];
      if (m.size < distinctCap || m.has(v)) m.set(v, (m.get(v) ?? 0) + 1);

      const t = colTypes?.[c] ?? 'string';
      const nVal = parseF64Relaxed(v);
      if (nVal != null) numOk[c]++;
      const dVal = parseDateRelaxed(v);
      if (dVal != null) dateOk[c]++;

      if (t === 'numeric' && nVal != null) {
        numMin[c] = numMin[c] == null ? nVal : Math.min(numMin[c] as number, nVal);
        numMax[c] = numMax[c] == null ? nVal : Math.max(numMax[c] as number, nVal);
      } else if (t === 'date' && dVal != null) {
        dateMin[c] = dateMin[c] == null ? dVal : Math.min(dateMin[c] as number, dVal);
        dateMax[c] = dateMax[c] == null ? dVal : Math.max(dateMax[c] as number, dVal);
      }
    }
  }

  const stats: SchemaColStat[] = [];
  for (let c = 0; c < colN; c++) {
    const total = empties[c] + nonEmpty[c];
    const dm = distinctMaps[c];
    const top = [...dm.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([v, n]) => ({ v, n }));
    const t = colTypes?.[c] ?? 'string';
    const numericParseRate = nonEmpty[c] ? numOk[c] / nonEmpty[c] : 0;
    const dateParseRate = nonEmpty[c] ? dateOk[c] / nonEmpty[c] : 0;

    let entropyNorm = 0;
    if (dm.size > 1) {
      const denom = nonEmpty[c] || 1;
      let H = 0;
      for (const [, count] of dm.entries()) {
        const p = count / denom;
        if (p > 0) H += -p * Math.log(p);
      }
      const Hmax = Math.log(dm.size);
      entropyNorm = Hmax > 0 ? H / Hmax : 0;
    }

    const distinctRatio = nonEmpty[c] ? dm.size / nonEmpty[c] : 0;
    let typeConfidence = 0.65;
    if (t === 'numeric') typeConfidence = numericParseRate;
    else if (t === 'date') typeConfidence = dateParseRate;
    else typeConfidence = 1 - Math.max(numericParseRate, dateParseRate);

    const st: SchemaColStat = {
      idx: c,
      name: headers[c] ?? String(c),
      type: t,
      empty: empties[c],
      nonEmpty: nonEmpty[c],
      emptyPct: total ? (empties[c] / total) * 100 : 0,
      typeConfidence: clamp(typeConfidence, 0, 1),
      numericParseRate: clamp(numericParseRate, 0, 1),
      dateParseRate: clamp(dateParseRate, 0, 1),
      distinctSample: dm.size,
      distinctRatio: clamp(distinctRatio, 0, 1),
      entropyNorm: clamp(entropyNorm, 0, 1),
      topSample: top
    };
    if (t === 'numeric') {
      if (numMin[c] != null) st.min = String(numMin[c]);
      if (numMax[c] != null) st.max = String(numMax[c]);
    } else if (t === 'date') {
      if (dateMin[c] != null) st.min = fmtDate(dateMin[c] as number);
      if (dateMax[c] != null) st.max = fmtDate(dateMax[c] as number);
    }
    stats.push(st);
  }
  return stats;
}
