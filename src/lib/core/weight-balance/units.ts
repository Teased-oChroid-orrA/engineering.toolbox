/**
 * Unit Conversion Utilities for Weight & Balance
 * Supports conversion between Imperial (lbs/in) and Metric (kg/cm) systems
 */

export type UnitSystem = 'imperial' | 'metric';

/**
 * Convert weight from pounds to kilograms
 */
export function lbsToKg(lbs: number): number {
  return lbs * 0.453592;
}

/**
 * Convert weight from kilograms to pounds
 */
export function kgToLbs(kg: number): number {
  return kg / 0.453592;
}

/**
 * Convert length from inches to centimeters
 */
export function inToCm(inches: number): number {
  return inches * 2.54;
}

/**
 * Convert length from centimeters to inches
 */
export function cmToIn(cm: number): number {
  return cm / 2.54;
}

/**
 * Convert moment from lb-in to kg-cm
 */
export function momentLbInToKgCm(lbIn: number): number {
  return lbIn * (0.453592 * 2.54);
}

/**
 * Convert moment from kg-cm to lb-in
 */
export function momentKgCmToLbIn(kgCm: number): number {
  return kgCm / (0.453592 * 2.54);
}

/**
 * Format weight with appropriate units
 */
export function formatWeight(weight: number, units: UnitSystem, decimals: number = 0): string {
  if (units === 'imperial') {
    return `${weight.toFixed(decimals)} lbs`;
  } else {
    const kg = lbsToKg(weight);
    return `${kg.toFixed(decimals)} kg`;
  }
}

/**
 * Format arm (distance) with appropriate units
 */
export function formatArm(arm: number, units: UnitSystem, decimals: number = 1): string {
  if (units === 'imperial') {
    return `${arm.toFixed(decimals)}"`;
  } else {
    const cm = inToCm(arm);
    return `${cm.toFixed(decimals)} cm`;
  }
}

/**
 * Format moment with appropriate units
 */
export function formatMoment(moment: number, units: UnitSystem, decimals: number = 0): string {
  if (units === 'imperial') {
    return `${moment.toFixed(decimals)} lb-in`;
  } else {
    const kgCm = momentLbInToKgCm(moment);
    return `${kgCm.toFixed(decimals)} kg-cm`;
  }
}

/**
 * Get weight unit label
 */
export function getWeightUnit(units: UnitSystem): string {
  return units === 'imperial' ? 'lbs' : 'kg';
}

/**
 * Get arm unit label
 */
export function getArmUnit(units: UnitSystem): string {
  return units === 'imperial' ? 'inches' : 'cm';
}

/**
 * Get moment unit label
 */
export function getMomentUnit(units: UnitSystem): string {
  return units === 'imperial' ? 'lb-in' : 'kg-cm';
}

/**
 * Display weight in current units
 * (returns the value to display, not a formatted string)
 */
export function displayWeight(weight: number, units: UnitSystem): number {
  return units === 'imperial' ? weight : lbsToKg(weight);
}

/**
 * Display arm in current units
 */
export function displayArm(arm: number, units: UnitSystem): number {
  return units === 'imperial' ? arm : inToCm(arm);
}

/**
 * Display moment in current units
 */
export function displayMoment(moment: number, units: UnitSystem): number {
  return units === 'imperial' ? moment : momentLbInToKgCm(moment);
}

/**
 * Parse weight input from current units to internal (imperial) units
 */
export function parseWeightInput(value: number, units: UnitSystem): number {
  return units === 'imperial' ? value : kgToLbs(value);
}

/**
 * Parse arm input from current units to internal (imperial) units
 */
export function parseArmInput(value: number, units: UnitSystem): number {
  return units === 'imperial' ? value : cmToIn(value);
}

/**
 * Convert aircraft profile to different unit system
 * NOTE: The internal storage remains in imperial, this is for display purposes
 */
export function getDisplayUnits(internalValue: number, converter: (val: number) => number, shouldConvert: boolean): number {
  return shouldConvert ? converter(internalValue) : internalValue;
}

/**
 * Unit conversion constants
 */
export const CONVERSION_CONSTANTS = {
  LBS_TO_KG: 0.453592,
  KG_TO_LBS: 1 / 0.453592,
  IN_TO_CM: 2.54,
  CM_TO_IN: 1 / 2.54,
  MOMENT_LBIN_TO_KGCM: 0.453592 * 2.54,
  MOMENT_KGCM_TO_LBIN: 1 / (0.453592 * 2.54)
};
