/**
 * Weight & Balance Calculation Engine
 * Implements FAA-H-8083-1B Tabular Method
 */

import type { AircraftProfile, CalculationOptions, CalculationTraceEntry, LoadingItem, LoadingResults, ValidationResult } from './types';
import { computeLoadingAnalysis, resolveCalculationOptions } from './analysis';
import { buildInputHash } from './hash';
import { determineBestCategory, isPointInEnvelope } from './envelope';
import { runValidations } from './resultValidation';
import { validateInput } from './inputValidation';

interface ItemWithMoment extends LoadingItem {
  moment: number;
}

export function calculateWeightAndBalance(
  aircraft: AircraftProfile,
  items: LoadingItem[],
  options: CalculationOptions = {}
): LoadingResults {
  const itemsWithMoments = toItemsWithMoments(items);
  const totals = sumTotals(itemsWithMoments);
  const zeroFuel = sumZeroFuel(itemsWithMoments);
  const validations = runValidations(aircraft, {
    totalWeight: totals.totalWeight,
    cgPosition: totals.cgPosition,
    zeroFuelWeight: zeroFuel.zeroFuelWeight
  });
  const category = determineBestCategory(aircraft, totals.cgPosition, totals.totalWeight);
  const overallStatus = resolveOverallStatus(validations);
  const calculationTrace = toCalculationTrace(itemsWithMoments);
  const resolvedOptions = resolveCalculationOptions(options);
  const analysis = computeLoadingAnalysis(totals.totalWeight, totals.totalMoment, calculationTrace, resolvedOptions);

  return {
    ...totals,
    ...zeroFuel,
    validations,
    category,
    categoryValid: overallStatus !== 'error',
    overallStatus,
    calculationTrace,
    audit: {
      generatedAt: new Date().toISOString(),
      inputHash: buildInputHash(aircraft, calculationTrace, resolvedOptions),
      checks: summarizeValidationChecks(validations)
    },
    analysis
  };
}

export { isPointInEnvelope, validateInput };

function toItemsWithMoments(items: LoadingItem[]): ItemWithMoment[] {
  return items.map((item) => ({ ...item, moment: item.weight * item.arm }));
}

function sumTotals(itemsWithMoments: ItemWithMoment[]): {
  totalWeight: number;
  totalMoment: number;
  cgPosition: number;
} {
  const totalWeight = itemsWithMoments.reduce((sum, item) => sum + item.weight, 0);
  const totalMoment = itemsWithMoments.reduce((sum, item) => sum + item.moment, 0);
  const cgPosition = totalWeight > 0 ? totalMoment / totalWeight : 0;
  return { totalWeight, totalMoment, cgPosition };
}

function sumZeroFuel(itemsWithMoments: ItemWithMoment[]): {
  zeroFuelWeight: number;
  zeroFuelMoment: number;
  zeroFuelCG: number;
} {
  const nonFuelItems = itemsWithMoments.filter((item) => !item.type.startsWith('fuel_'));
  const zeroFuelWeight = nonFuelItems.reduce((sum, item) => sum + item.weight, 0);
  const zeroFuelMoment = nonFuelItems.reduce((sum, item) => sum + item.moment, 0);
  const zeroFuelCG = zeroFuelWeight > 0 ? zeroFuelMoment / zeroFuelWeight : 0;
  return { zeroFuelWeight, zeroFuelMoment, zeroFuelCG };
}

function toCalculationTrace(itemsWithMoments: ItemWithMoment[]): CalculationTraceEntry[] {
  return itemsWithMoments.map((item) => ({
    id: item.id,
    name: item.name,
    type: item.type,
    weight: item.weight,
    arm: item.arm,
    moment: item.moment,
    isFuel: item.type.startsWith('fuel_')
  }));
}

function resolveOverallStatus(validations: ValidationResult[]): 'safe' | 'warning' | 'error' {
  if (validations.some((validation) => validation.severity === 'error')) return 'error';
  if (validations.some((validation) => validation.severity === 'warning')) return 'warning';
  return 'safe';
}

function summarizeValidationChecks(validations: ValidationResult[]): { errors: number; warnings: number; info: number } {
  return validations.reduce(
    (acc, validation) => {
      if (validation.severity === 'error') acc.errors += 1;
      if (validation.severity === 'warning') acc.warnings += 1;
      if (validation.severity === 'info') acc.info += 1;
      return acc;
    },
    { errors: 0, warnings: 0, info: 0 }
  );
}
