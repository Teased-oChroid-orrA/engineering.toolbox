import type { AircraftProfile, CGEnvelope } from './types';

const MIN_POLYGON_VERTICES = 3;

export function determineBestCategory(
  aircraft: AircraftProfile,
  cgPosition: number,
  totalWeight: number
): 'normal' | 'utility' | 'acrobatic' | null {
  const categoryPriority: Array<'normal' | 'utility' | 'acrobatic'> = ['normal', 'utility', 'acrobatic'];

  for (const category of categoryPriority) {
    const envelope = aircraft.envelopes.find((entry) => entry.category === category);
    if (envelope && isPointInEnvelope(totalWeight, cgPosition, envelope)) return category;
  }
  return null;
}

export function checkCGEnvelope(
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

export function checkEnvelopeMargin(
  aircraft: AircraftProfile,
  cgPosition: number,
  category: string
): number {
  const envelope = aircraft.envelopes.find((entry) => entry.category === category);
  if (!envelope) return Number.POSITIVE_INFINITY;

  if (envelope.forwardLimit !== undefined && envelope.aftLimit !== undefined) {
    return Math.min(cgPosition - envelope.forwardLimit, envelope.aftLimit - cgPosition);
  }
  return 1.0;
}

export function isPointInEnvelope(weight: number, cgPosition: number, envelope: CGEnvelope): boolean {
  if (weight > envelope.maxWeight) return false;

  if (envelope.forwardLimit !== undefined && envelope.aftLimit !== undefined) {
    return cgPosition >= envelope.forwardLimit && cgPosition <= envelope.aftLimit;
  }

  if (!envelope.vertices || envelope.vertices.length < MIN_POLYGON_VERTICES) return false;
  let inside = false;
  const point = { x: cgPosition, y: weight };

  for (let i = 0, j = envelope.vertices.length - 1; i < envelope.vertices.length; j = i++) {
    const xi = envelope.vertices[i].cgPosition;
    const yi = envelope.vertices[i].weight;
    const xj = envelope.vertices[j].cgPosition;
    const yj = envelope.vertices[j].weight;
    const isIntersect = ((yi > point.y) !== (yj > point.y))
      && (point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi);
    if (isIntersect) inside = !inside;
  }
  return inside;
}
