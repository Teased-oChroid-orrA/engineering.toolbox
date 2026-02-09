export const isNum = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const toNumber = (v: unknown, fallback = NaN): number => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
};
