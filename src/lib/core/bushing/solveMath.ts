import type { CSMode, ToleranceMode, ToleranceRange } from './types';

export const EPS = 1e-9;

export function clamp(value: number, lower: number, upper: number): number {
  return Math.min(upper, Math.max(lower, value));
}

export function toPsiFromKsi(v: number): number {
  return v * 1000;
}

function roundTol(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

export function makeRange(mode: ToleranceMode, lower: number, upper: number, nominal?: number): ToleranceRange {
  const lo = Math.min(lower, upper);
  const hi = Math.max(lower, upper);
  const nom = clamp(Number.isFinite(nominal as number) ? Number(nominal) : (lo + hi) / 2, lo, hi);
  return {
    mode,
    lower: roundTol(lo),
    upper: roundTol(hi),
    nominal: roundTol(nom),
    tolPlus: roundTol(hi - nom),
    tolMinus: roundTol(nom - lo)
  };
}

export function resolveTolerance(input: {
  mode?: ToleranceMode;
  nominal?: number;
  plus?: number;
  minus?: number;
  lower?: number;
  upper?: number;
  minFloor?: number;
}): ToleranceRange {
  const mode = input.mode === 'limits' ? 'limits' : 'nominal_tol';
  const minFloor = Number.isFinite(input.minFloor) ? Math.max(0, Number(input.minFloor)) : -Infinity;

  if (mode === 'limits') {
    const lower = Number.isFinite(input.lower) ? Number(input.lower) : Number(input.nominal ?? 0);
    const upper = Number.isFinite(input.upper) ? Number(input.upper) : Number(input.nominal ?? lower);
    const lo = Math.max(minFloor, Math.min(lower, upper));
    const hi = Math.max(lo, Math.max(lower, upper));
    return makeRange(mode, lo, hi, input.nominal);
  }

  const nominal = Number(input.nominal ?? 0);
  const plus = Math.max(0, Number(input.plus ?? 0));
  const minus = Math.max(0, Number(input.minus ?? 0));
  const lo = Math.max(minFloor, nominal - minus);
  const hi = Math.max(lo, nominal + plus);
  return makeRange(mode, lo, hi, nominal);
}

export function buildOdTolerance(bore: ToleranceRange, targetInterference: ToleranceRange): {
  status: 'ok' | 'clamped' | 'infeasible';
  notes: string[];
  od: ToleranceRange;
  achievedInterference: ToleranceRange;
} {
  const notes: string[] = [];
  const requiredLower = bore.upper + targetInterference.lower;
  const requiredUpper = bore.lower + targetInterference.upper;
  const desiredNominal = bore.nominal + targetInterference.nominal;

  if (requiredLower <= requiredUpper + EPS) {
    const nominal = clamp(desiredNominal, requiredLower, requiredUpper);
    const od = makeRange('limits', requiredLower, requiredUpper, nominal);
    const achieved = makeRange('limits', od.lower - bore.upper, od.upper - bore.lower, od.nominal - bore.nominal);
    const status = Math.abs(nominal - desiredNominal) > EPS ? 'clamped' : 'ok';
    if (status === 'clamped') {
      notes.push('OD nominal was clamped to keep fit inside the requested interference tolerance window.');
    }
    return {
      status,
      notes,
      od,
      achievedInterference: achieved
    };
  }

  const odCollapsed = makeRange('limits', desiredNominal, desiredNominal, desiredNominal);
  const achievedCollapsed = makeRange(
    'limits',
    odCollapsed.nominal - bore.upper,
    odCollapsed.nominal - bore.lower,
    odCollapsed.nominal - bore.nominal
  );
  notes.push('Bore tolerance width exceeds interference tolerance width; full-range containment is infeasible.');
  return {
    status: 'infeasible',
    notes,
    od: odCollapsed,
    achievedInterference: achievedCollapsed
  };
}

export function enforceBoreBandForTarget(
  bore: ToleranceRange,
  targetInterference: ToleranceRange,
  capability?: { minAchievableTolWidth?: number }
): { adjusted: ToleranceRange; changed: boolean; note?: string } {
  const boreWidth = Math.max(0, bore.upper - bore.lower);
  const targetWidth = Math.max(0, targetInterference.upper - targetInterference.lower);
  if (boreWidth <= targetWidth + EPS) return { adjusted: bore, changed: false };
  const minAchievable = Number(capability?.minAchievableTolWidth ?? 0);
  if (Number.isFinite(minAchievable) && minAchievable > targetWidth + EPS) {
    return {
      adjusted: bore,
      changed: false,
      note: `Strict interference enforcement is blocked by bore process capability floor (${minAchievable.toFixed(4)} > target width ${targetWidth.toFixed(4)}).`
    };
  }

  const half = Math.max(0, targetWidth / 2);
  const lower = Math.max(1e-6, bore.nominal - half);
  const upper = Math.max(lower, bore.nominal + half);
  return {
    adjusted: makeRange('limits', lower, upper, bore.nominal),
    changed: true,
    note: 'Bore tolerance was auto-adjusted to satisfy strict interference containment.'
  };
}

export function containmentViolations(achieved: ToleranceRange, target: ToleranceRange): {
  lowerViolation: number;
  upperViolation: number;
} {
  return {
    lowerViolation: Math.max(0, target.lower - achieved.lower),
    upperViolation: Math.max(0, achieved.upper - target.upper)
  };
}

export function csDiaToleranceFromBase(
  mode: CSMode,
  solvedDia: number,
  solvedDepth: number,
  solvedAngleDeg: number,
  base: ToleranceRange
): ToleranceRange {
  if (mode !== 'depth_angle') return makeRange('nominal_tol', solvedDia, solvedDia, solvedDia);
  const angleRad = (solvedAngleDeg / 2) * (Math.PI / 180);
  const offset = 2 * Math.max(0, solvedDepth) * Math.tan(angleRad);
  return makeRange(base.mode, base.lower + offset, base.upper + offset, base.nominal + offset);
}

export function solveCountersink(mode: CSMode, dia: number, depth: number, angle: number, baseDia: number) {
  const safeBaseDia = Number.isFinite(baseDia) ? Math.max(baseDia, 0) : 0;
  const safeDia = Number.isFinite(dia) ? Math.max(dia, 0) : 0;
  const safeDepth = Number.isFinite(depth) ? Math.max(depth, 0) : 0;
  const safeAngle = Number.isFinite(angle) ? Math.min(Math.max(angle, 1e-3), 179.999) : 100;
  const r_rad = (safeAngle / 2) * (Math.PI / 180);
  const tan_r = Math.tan(r_rad);
  const res = { dia: safeDia, depth: safeDepth, angleDeg: safeAngle };
  if (mode === 'depth_angle') res.dia = Math.max(safeBaseDia + 2 * safeDepth * tan_r, safeBaseDia);
  else if (mode === 'dia_angle') res.depth = tan_r > 1e-9 ? Math.max((safeDia - safeBaseDia) / (2 * tan_r), 0) : 0;
  else if (mode === 'dia_depth') {
    const angle_rad = safeDepth > 1e-9 ? 2 * Math.atan(Math.max(safeDia - safeBaseDia, 0) / (2 * safeDepth)) : 0;
    res.angleDeg = Math.min(Math.max(angle_rad * (180 / Math.PI), 0), 179.999);
  }
  return res;
}
