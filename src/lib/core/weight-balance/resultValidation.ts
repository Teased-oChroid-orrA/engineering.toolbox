import type { AircraftProfile, ValidationResult } from './types';
import { checkCGEnvelope, checkEnvelopeMargin } from './envelope';

const ENVELOPE_MARGIN_THRESHOLD = 0.5;

export function runValidations(
  aircraft: AircraftProfile,
  totals: { totalWeight: number; cgPosition: number; zeroFuelWeight: number }
): ValidationResult[] {
  const validations: ValidationResult[] = [];
  const { totalWeight, cgPosition, zeroFuelWeight } = totals;

  pushMtowValidation(validations, aircraft, totalWeight);
  pushMlwValidation(validations, aircraft, totalWeight);
  pushMzfwValidation(validations, aircraft, zeroFuelWeight);
  pushEnvelopeValidation(validations, aircraft, totalWeight, cgPosition);
  pushFiniteValidation(validations, totalWeight, cgPosition);

  return validations;
}

function pushMtowValidation(
  validations: ValidationResult[],
  aircraft: AircraftProfile,
  totalWeight: number
): void {
  if (totalWeight <= aircraft.maxTakeoffWeight) return;
  validations.push({
    code: 'MTOW_EXCEEDED',
    severity: 'error',
    message: `Total weight (${formatWeightWithUnits(totalWeight, aircraft.units)}) exceeds Maximum Takeoff Weight`,
    value: totalWeight,
    limit: aircraft.maxTakeoffWeight
  });
}

function pushMlwValidation(
  validations: ValidationResult[],
  aircraft: AircraftProfile,
  totalWeight: number
): void {
  if (totalWeight <= aircraft.maxLandingWeight) return;
  validations.push({
    code: 'MLW_EXCEEDED',
    severity: 'warning',
    message: `Total weight (${formatWeightWithUnits(totalWeight, aircraft.units)}) exceeds Maximum Landing Weight`,
    value: totalWeight,
    limit: aircraft.maxLandingWeight
  });
}

function pushMzfwValidation(
  validations: ValidationResult[],
  aircraft: AircraftProfile,
  zeroFuelWeight: number
): void {
  if (!aircraft.maxZeroFuelWeight || zeroFuelWeight <= aircraft.maxZeroFuelWeight) return;
  validations.push({
    code: 'MZFW_EXCEEDED',
    severity: 'error',
    message: `Zero fuel weight (${formatWeightWithUnits(zeroFuelWeight, aircraft.units)}) exceeds Maximum Zero Fuel Weight`,
    value: zeroFuelWeight,
    limit: aircraft.maxZeroFuelWeight
  });
}

function pushEnvelopeValidation(
  validations: ValidationResult[],
  aircraft: AircraftProfile,
  totalWeight: number,
  cgPosition: number
): void {
  const categoryResult = checkCGEnvelope(aircraft, cgPosition, totalWeight);
  if (!categoryResult.valid) {
    validations.push({
      code: 'CG_OUT_OF_ENVELOPE',
      severity: 'error',
      message: `CG position (${cgPosition.toFixed(2)}" aft of datum) is outside all approved envelopes`,
      value: cgPosition
    });
    return;
  }
  if (!categoryResult.category) return;

  const margin = checkEnvelopeMargin(aircraft, cgPosition, categoryResult.category);
  if (margin >= ENVELOPE_MARGIN_THRESHOLD) return;
  validations.push({
    code: 'CG_NEAR_BOUNDARY',
    severity: 'warning',
    message: `CG position is within ${ENVELOPE_MARGIN_THRESHOLD}" of ${categoryResult.category} envelope boundary`,
    category: categoryResult.category
  });
}

function pushFiniteValidation(
  validations: ValidationResult[],
  totalWeight: number,
  cgPosition: number
): void {
  if (Number.isFinite(totalWeight) && Number.isFinite(cgPosition)) return;
  validations.push({
    code: 'INVALID_CALCULATION',
    severity: 'error',
    message: 'Invalid calculation result (NaN or Infinity)'
  });
}

function formatWeightWithUnits(weight: number, units: 'imperial' | 'metric'): string {
  const unitLabel = units === 'imperial' ? 'lbs' : 'kg';
  return `${weight.toFixed(1)} ${unitLabel}`;
}
