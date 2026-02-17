/**
 * Ballast Calculation Module
 * 
 * Calculates required ballast weight and position to bring CG within envelope limits
 */

import type { CGEnvelope } from './types';

export interface BallastSolution {
  weight: number;
  arm: number;
  description: string;
  feasible: boolean;
  reason?: string;
}

export interface BallastCalculationInput {
  currentWeight: number;
  currentCG: number;
  maxWeight: number;
  forwardLimit?: number;
  aftLimit?: number;
  envelopes: CGEnvelope[];
}

/**
 * Calculate required ballast to bring CG within limits
 */
export function calculateBallast(input: BallastCalculationInput): BallastSolution {
  const { currentWeight, currentCG, maxWeight, forwardLimit, aftLimit, envelopes } = input;
  
  // Check if already within limits
  const inEnvelope = isPointInAnyEnvelope(currentWeight, currentCG, envelopes);
  if (inEnvelope) {
    return {
      weight: 0,
      arm: 0,
      description: 'CG is already within limits',
      feasible: true
    };
  }
  
  // Determine if CG is too far forward or aft
  const needsAftBallast = forwardLimit !== undefined && currentCG < forwardLimit;
  const needsForwardBallast = aftLimit !== undefined && currentCG > aftLimit;
  
  if (!needsAftBallast && !needsForwardBallast) {
    // CG is within forward/aft limits but outside weight envelope
    return {
      weight: 0,
      arm: 0,
      description: 'CG position is acceptable, but weight may be out of limits',
      feasible: false,
      reason: 'Weight limits may be exceeded'
    };
  }
  
  // Calculate ballast for forward CG (needs aft ballast)
  if (needsAftBallast && forwardLimit !== undefined) {
    const targetCG = forwardLimit + 1; // Move 1 inch past forward limit
    const ballastArm = currentCG + 100; // Place ballast 100 inches aft of current CG
    const ballastWeight = calculateBallastWeight(currentWeight, currentCG, targetCG, ballastArm);
    
    if (ballastWeight < 0 || currentWeight + ballastWeight > maxWeight) {
      return {
        weight: ballastWeight,
        arm: ballastArm,
        description: 'Required ballast exceeds weight limits',
        feasible: false,
        reason: ballastWeight < 0 ? 'Negative ballast required' : 'Would exceed max weight'
      };
    }
    
    return {
      weight: ballastWeight,
      arm: ballastArm,
      description: `Add ${ballastWeight.toFixed(1)} lbs at ${ballastArm.toFixed(1)}" to move CG aft`,
      feasible: true
    };
  }
  
  // Calculate ballast for aft CG (needs forward ballast)
  if (needsForwardBallast && aftLimit !== undefined) {
    const targetCG = aftLimit - 1; // Move 1 inch before aft limit
    const ballastArm = Math.max(0, currentCG - 100); // Place ballast 100 inches forward of current CG
    const ballastWeight = calculateBallastWeight(currentWeight, currentCG, targetCG, ballastArm);
    
    if (ballastWeight < 0 || currentWeight + ballastWeight > maxWeight) {
      return {
        weight: ballastWeight,
        arm: ballastArm,
        description: 'Required ballast exceeds weight limits',
        feasible: false,
        reason: ballastWeight < 0 ? 'Negative ballast required' : 'Would exceed max weight'
      };
    }
    
    return {
      weight: ballastWeight,
      arm: ballastArm,
      description: `Add ${ballastWeight.toFixed(1)} lbs at ${ballastArm.toFixed(1)}" to move CG forward`,
      feasible: true
    };
  }
  
  return {
    weight: 0,
    arm: 0,
    description: 'Unable to calculate ballast solution',
    feasible: false,
    reason: 'Insufficient envelope data'
  };
}

/**
 * Calculate ballast weight needed to move CG from current to target position
 * 
 * Formula: W_ballast = W_current * (CG_current - CG_target) / (ARM_ballast - CG_target)
 */
function calculateBallastWeight(
  currentWeight: number,
  currentCG: number,
  targetCG: number,
  ballastArm: number
): number {
  if (ballastArm === targetCG) {
    throw new Error('Ballast arm cannot equal target CG');
  }
  
  return (currentWeight * (currentCG - targetCG)) / (ballastArm - targetCG);
}

/**
 * Check if point is within any envelope
 */
function isPointInAnyEnvelope(
  weight: number,
  cgPosition: number,
  envelopes: CGEnvelope[]
): boolean {
  for (const envelope of envelopes) {
    if (isPointInEnvelope(weight, cgPosition, envelope)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if point is within a specific envelope
 */
function isPointInEnvelope(
  weight: number,
  cgPosition: number,
  envelope: CGEnvelope
): boolean {
  // Check weight limit
  if (weight > envelope.maxWeight) return false;
  
  // Use simple forward/aft limits if available
  if (envelope.forwardLimit !== undefined && envelope.aftLimit !== undefined) {
    return cgPosition >= envelope.forwardLimit && cgPosition <= envelope.aftLimit;
  }
  
  // Use polygon containment test
  return isPointInPolygon(cgPosition, weight, envelope.vertices);
}

/**
 * Point-in-polygon test using ray casting algorithm
 */
function isPointInPolygon(
  x: number,
  y: number,
  vertices: Array<{ cgPosition: number; weight: number }>
): boolean {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].cgPosition;
    const yi = vertices[i].weight;
    const xj = vertices[j].cgPosition;
    const yj = vertices[j].weight;
    
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
