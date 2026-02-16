/**
 * Weight & Balance Calculation Engine
 * Implements FAA-H-8083-1B Tabular Method
 */

import type {
  AircraftProfile,
  LoadingItem,
  LoadingResults,
  ValidationResult,
  CGEnvelope
} from './types';

interface ItemWithMoment extends LoadingItem {
  moment: number;
}

/**
 * Main W&B calculation function using tabular method
 */
export function calculateWeightAndBalance(
  aircraft: AircraftProfile,
  items: LoadingItem[]
): LoadingResults {
  // Step 1: Calculate moments for each item
  const itemsWithMoments: ItemWithMoment[] = items.map(item => ({
    ...item,
    moment: item.weight * item.arm
  }));
  
  // Step 2: Sum all weights and moments
  const totalWeight = itemsWithMoments.reduce((sum, item) => sum + item.weight, 0);
  const totalMoment = itemsWithMoments.reduce((sum, item) => sum + item.moment, 0);
  
  // Step 3: Calculate CG position (handle divide by zero)
  const cgPosition = totalWeight > 0 ? totalMoment / totalWeight : 0;
  
  // Step 4: Calculate Zero Fuel Weight (exclude fuel items)
  const nonFuelItems = itemsWithMoments.filter(
    item => !item.type.startsWith('fuel_')
  );
  const zeroFuelWeight = nonFuelItems.reduce((sum, item) => sum + item.weight, 0);
  const zeroFuelMoment = nonFuelItems.reduce((sum, item) => sum + item.moment, 0);
  const zeroFuelCG = zeroFuelWeight > 0 ? zeroFuelMoment / zeroFuelWeight : 0;
  
  // Step 5: Run validations
  const validations = runValidations(aircraft, {
    totalWeight,
    cgPosition,
    zeroFuelWeight,
    zeroFuelCG
  });
  
  // Step 6: Determine category and overall status
  const category = determineBestCategory(aircraft, cgPosition, totalWeight);
  const hasErrors = validations.some(v => v.severity === 'error');
  const hasWarnings = validations.some(v => v.severity === 'warning');
  const overallStatus = hasErrors ? 'error' : hasWarnings ? 'warning' : 'safe';
  
  return {
    totalWeight,
    totalMoment,
    cgPosition,
    zeroFuelWeight,
    zeroFuelMoment,
    zeroFuelCG,
    validations,
    category,
    categoryValid: !hasErrors,
    overallStatus
  };
}

/**
 * Run all validation rules
 */
function runValidations(
  aircraft: AircraftProfile,
  results: {
    totalWeight: number;
    cgPosition: number;
    zeroFuelWeight: number;
    zeroFuelCG: number;
  }
): ValidationResult[] {
  const validations: ValidationResult[] = [];
  const { totalWeight, cgPosition, zeroFuelWeight } = results;
  
  // Validation 1: MTOW Check
  if (totalWeight > aircraft.maxTakeoffWeight) {
    validations.push({
      code: 'MTOW_EXCEEDED',
      severity: 'error',
      message: `Total weight (${totalWeight.toFixed(1)} ${aircraft.units === 'imperial' ? 'lbs' : 'kg'}) exceeds Maximum Takeoff Weight`,
      value: totalWeight,
      limit: aircraft.maxTakeoffWeight
    });
  }
  
  // Validation 2: MLW Check
  if (totalWeight > aircraft.maxLandingWeight) {
    validations.push({
      code: 'MLW_EXCEEDED',
      severity: 'warning',
      message: `Total weight (${totalWeight.toFixed(1)} ${aircraft.units === 'imperial' ? 'lbs' : 'kg'}) exceeds Maximum Landing Weight`,
      value: totalWeight,
      limit: aircraft.maxLandingWeight
    });
  }
  
  // Validation 3: Zero Fuel Weight Check
  if (aircraft.maxZeroFuelWeight && zeroFuelWeight > aircraft.maxZeroFuelWeight) {
    validations.push({
      code: 'MZFW_EXCEEDED',
      severity: 'error',
      message: `Zero fuel weight (${zeroFuelWeight.toFixed(1)} ${aircraft.units === 'imperial' ? 'lbs' : 'kg'}) exceeds Maximum Zero Fuel Weight`,
      value: zeroFuelWeight,
      limit: aircraft.maxZeroFuelWeight
    });
  }
  
  // Validation 4: CG Envelope Check
  const categoryResult = checkCGEnvelope(aircraft, cgPosition, totalWeight);
  if (!categoryResult.valid) {
    validations.push({
      code: 'CG_OUT_OF_ENVELOPE',
      severity: 'error',
      message: `CG position (${cgPosition.toFixed(2)}" aft of datum) is outside all approved envelopes`,
      value: cgPosition
    });
  }
  
  // Validation 5: Near envelope boundary warning (0.5" margin)
  if (categoryResult.valid && categoryResult.category) {
    const margin = checkEnvelopeMargin(aircraft, cgPosition, totalWeight, categoryResult.category);
    if (margin < 0.5) {
      validations.push({
        code: 'CG_NEAR_BOUNDARY',
        severity: 'warning',
        message: `CG position is within 0.5" of ${categoryResult.category} envelope boundary`,
        category: categoryResult.category
      });
    }
  }
  
  // Validation 6: NaN/Infinity checks
  if (!isFinite(cgPosition) || !isFinite(totalWeight)) {
    validations.push({
      code: 'INVALID_CALCULATION',
      severity: 'error',
      message: 'Invalid calculation result (NaN or Infinity)'
    });
  }
  
  return validations;
}

/**
 * Determine the best category for the given CG and weight
 */
function determineBestCategory(
  aircraft: AircraftProfile,
  cgPosition: number,
  totalWeight: number
): 'normal' | 'utility' | 'acrobatic' | null {
  const categoryPriority: Array<'normal' | 'utility' | 'acrobatic'> = ['normal', 'utility', 'acrobatic'];
  
  for (const cat of categoryPriority) {
    const envelope = aircraft.envelopes.find(e => e.category === cat);
    if (envelope && isPointInEnvelope(totalWeight, cgPosition, envelope)) {
      return cat;
    }
  }
  
  return null;
}

/**
 * Check if a point is inside a CG envelope
 */
export function isPointInEnvelope(
  weight: number,
  cgPosition: number,
  envelope: CGEnvelope
): boolean {
  // Check weight limit first
  if (weight > envelope.maxWeight) return false;
  
  // Try simple limits if available
  if (envelope.forwardLimit !== undefined && envelope.aftLimit !== undefined) {
    return cgPosition >= envelope.forwardLimit && cgPosition <= envelope.aftLimit;
  }
  
  // Use point-in-polygon (ray casting algorithm)
  if (!envelope.vertices || envelope.vertices.length < 3) return false;
  
  const point = { x: cgPosition, y: weight };
  const vertices = envelope.vertices;
  let inside = false;
  
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].cgPosition;
    const yi = vertices[i].weight;
    const xj = vertices[j].cgPosition;
    const yj = vertices[j].weight;
    
    const intersect = ((yi > point.y) !== (yj > point.y))
      && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    
    if (intersect) inside = !inside;
  }
  
  return inside;
}

/**
 * Check CG envelope validity and return category
 */
function checkCGEnvelope(
  aircraft: AircraftProfile,
  cgPosition: number,
  totalWeight: number
): { valid: boolean; category?: string } {
  for (const envelope of aircraft.envelopes) {
    if (isPointInEnvelope(totalWeight, cgPosition, envelope)) {
      return { valid: true, category: envelope.category };
    }
  }
  return { valid: false };
}

/**
 * Calculate minimum distance to envelope boundary
 */
function checkEnvelopeMargin(
  aircraft: AircraftProfile,
  cgPosition: number,
  totalWeight: number,
  category: string
): number {
  const envelope = aircraft.envelopes.find(e => e.category === category);
  if (!envelope) return Infinity;
  
  // Simplified: check distance to forward/aft limits if available
  if (envelope.forwardLimit !== undefined && envelope.aftLimit !== undefined) {
    const forwardDistance = cgPosition - envelope.forwardLimit;
    const aftDistance = envelope.aftLimit - cgPosition;
    return Math.min(forwardDistance, aftDistance);
  }
  
  // For complex envelopes, return a safe value
  return 1.0;
}

/**
 * Validate input data
 */
export function validateInput(
  aircraft: AircraftProfile | null,
  items: LoadingItem[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!aircraft) {
    errors.push('No aircraft profile selected');
    return { valid: false, errors };
  }
  
  if (aircraft.basicEmptyWeight <= 0) {
    errors.push('Basic empty weight must be positive');
  }
  
  if (aircraft.maxTakeoffWeight <= 0) {
    errors.push('Maximum takeoff weight must be positive');
  }
  
  if (aircraft.envelopes.length === 0) {
    errors.push('No CG envelopes defined');
  }
  
  for (const item of items) {
    if (item.weight < 0) {
      errors.push(`Invalid weight for ${item.name}: ${item.weight}`);
    }
  }
  
  return { valid: errors.length === 0, errors };
}
