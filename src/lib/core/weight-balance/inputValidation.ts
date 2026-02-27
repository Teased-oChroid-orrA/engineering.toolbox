import type { AircraftProfile, LoadingItem } from './types';

const MIN_POLYGON_VERTICES = 3;

export function validateInput(
  aircraft: AircraftProfile | null,
  items: LoadingItem[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!aircraft) return { valid: false, errors: ['No aircraft profile selected'] };

  validateAircraftLimits(aircraft, errors);
  validateEnvelopes(aircraft, errors);
  validateItems(items, errors);

  return { valid: errors.length === 0, errors };
}

function validateAircraftLimits(aircraft: AircraftProfile, errors: string[]): void {
  if (aircraft.basicEmptyWeight <= 0) errors.push('Basic empty weight must be positive');
  if (!Number.isFinite(aircraft.basicEmptyWeightArm)) errors.push('Basic empty weight arm must be a finite value');
  if (aircraft.maxTakeoffWeight <= 0) errors.push('Maximum takeoff weight must be positive');
  if (!Number.isFinite(aircraft.maxLandingWeight) || aircraft.maxLandingWeight <= 0) {
    errors.push('Maximum landing weight must be a positive finite value');
  }
  if (aircraft.maxLandingWeight > aircraft.maxTakeoffWeight) {
    errors.push('Maximum landing weight cannot exceed maximum takeoff weight');
  }
  if (aircraft.maxZeroFuelWeight !== undefined) {
    if (!Number.isFinite(aircraft.maxZeroFuelWeight) || aircraft.maxZeroFuelWeight <= 0) {
      errors.push('Maximum zero fuel weight must be a positive finite value');
    }
    if (aircraft.maxZeroFuelWeight > aircraft.maxTakeoffWeight) {
      errors.push('Maximum zero fuel weight cannot exceed maximum takeoff weight');
    }
  }
}

function validateEnvelopes(aircraft: AircraftProfile, errors: string[]): void {
  if (aircraft.envelopes.length === 0) errors.push('No CG envelopes defined');

  const categories = new Set<string>();
  for (const envelope of aircraft.envelopes) {
    if (!Number.isFinite(envelope.maxWeight) || envelope.maxWeight <= 0) {
      errors.push(`Envelope "${envelope.category}" must define a positive finite max weight`);
    }
    if (
      envelope.forwardLimit !== undefined &&
      envelope.aftLimit !== undefined &&
      envelope.forwardLimit >= envelope.aftLimit
    ) {
      errors.push(`Envelope "${envelope.category}" forward limit must be less than aft limit`);
    }
    if (envelope.vertices.length < MIN_POLYGON_VERTICES) {
      errors.push(`Envelope "${envelope.category}" must contain at least ${MIN_POLYGON_VERTICES} vertices`);
    }
    if (envelope.vertices.some((vertex) => !Number.isFinite(vertex.weight) || !Number.isFinite(vertex.cgPosition))) {
      errors.push(`Envelope "${envelope.category}" has non-finite vertex values`);
    }
    if (categories.has(envelope.category)) {
      errors.push(`Duplicate envelope category detected: ${envelope.category}`);
      continue;
    }
    categories.add(envelope.category);
  }
}

function validateItems(items: LoadingItem[], errors: string[]): void {
  if (items.length === 0) errors.push('At least one loading item is required');

  const ids = new Set<string>();
  for (const item of items) {
    if (!item.name.trim()) errors.push('All loading items must have a name');
    if (item.weight < 0) errors.push(`Invalid weight for ${item.name}: ${item.weight}`);
    if (!Number.isFinite(item.weight) || !Number.isFinite(item.arm)) {
      errors.push(`Invalid finite values for ${item.name}`);
    }
    if (ids.has(item.id)) errors.push(`Duplicate loading item id: ${item.id}`);
    ids.add(item.id);
  }
}
