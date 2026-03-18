import type { ToleranceMode, ToleranceRange } from './types';
import { makeRange } from './solveMath';

function fixed(value: number, digits: number): string {
  return Number.isFinite(value) ? value.toFixed(digits) : '---';
}

export function formatToleranceRange(range: ToleranceRange | null | undefined, digits = 4): string {
  if (!range) return '---';
  const lower = Number.isFinite(range.lower) ? range.lower : range.nominal - range.tolMinus;
  const upper = Number.isFinite(range.upper) ? range.upper : range.nominal + range.tolPlus;
  const nominal = (lower + upper) / 2;
  const tolMinus = nominal - lower;
  const tolPlus = upper - nominal;
  const scale = Math.pow(10, digits);
  const roundedLower = Math.round(lower * scale);
  const roundedUpper = Math.round(upper * scale);
  const displayDigits = (roundedLower + roundedUpper) % 2 === 0 ? digits : digits + 1;
  const roundingEpsilon = 0.5 * Math.pow(10, -displayDigits);
  if (Math.abs(tolPlus - tolMinus) <= roundingEpsilon) {
    return `${fixed(nominal, displayDigits)} (+/- ${fixed((tolPlus + tolMinus) / 2, displayDigits)})`;
  }
  return `${fixed(nominal, displayDigits)} (-${fixed(tolMinus, displayDigits)}, +${fixed(tolPlus, displayDigits)})`;
}

export function splitToleranceRangeDisplay(range: ToleranceRange | null | undefined, digits = 4): { nominal: string; tolerance: string } {
  const text = formatToleranceRange(range, digits);
  const divider = text.indexOf(' (');
  if (divider === -1) return { nominal: text, tolerance: '' };
  return {
    nominal: text.slice(0, divider),
    tolerance: text.slice(divider)
  };
}

export function formatToleranceValue(
  nominal: number,
  lower: number,
  upper: number,
  digits = 4
): string {
  const range = makeRange('limits', lower, upper, nominal);
  return formatToleranceRange(range, digits);
}

export function rangeFromNominalAndDeviation(
  nominal: number,
  plus = 0,
  minus = 0,
  mode: ToleranceMode = 'nominal_tol'
): ToleranceRange {
  return makeRange(mode, nominal - Math.max(0, minus), nominal + Math.max(0, plus), nominal);
}

export function scaleValueToToleranceRange(
  value: number,
  referenceNominal: number,
  referenceRange: ToleranceRange,
  mode: ToleranceMode = 'limits'
): ToleranceRange {
  if (!Number.isFinite(value) || !Number.isFinite(referenceNominal)) {
    return makeRange(mode, value, value, value);
  }
  if (Math.abs(referenceNominal) < 1e-12) {
    return makeRange(mode, value, value, value);
  }
  const lower = value * (referenceRange.lower / referenceNominal);
  const upper = value * (referenceRange.upper / referenceNominal);
  return makeRange(mode, lower, upper, value);
}
