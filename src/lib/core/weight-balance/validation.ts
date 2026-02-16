/**
 * Weight & Balance Envelope Validation
 * Validates CG envelope geometry for correctness and safety
 */

import type { CGEnvelope, EnvelopePoint } from './types';

export interface ValidationError {
  code: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion?: string;
}

/**
 * Validate a CG envelope for geometric correctness
 */
export function validateEnvelope(envelope: CGEnvelope): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Check for minimum vertices
  if (!envelope.vertices || envelope.vertices.length < 3) {
    errors.push({
      code: 'INSUFFICIENT_VERTICES',
      severity: 'error',
      message: 'Envelope must have at least 3 vertices to form a polygon',
      suggestion: 'Add more vertices to define the envelope boundaries'
    });
    return errors; // Can't validate further without enough vertices
  }
  
  // Check if polygon is closed
  const isClosed = isPolygonClosed(envelope.vertices);
  if (!isClosed) {
    errors.push({
      code: 'UNCLOSED_POLYGON',
      severity: 'warning',
      message: 'Envelope polygon is not closed (first and last vertices should match)',
      suggestion: 'Add a vertex matching the first vertex to close the polygon'
    });
  }
  
  // Check for valid coordinates
  for (let i = 0; i < envelope.vertices.length; i++) {
    const vertex = envelope.vertices[i];
    
    if (vertex.weight < 0) {
      errors.push({
        code: 'NEGATIVE_WEIGHT',
        severity: 'error',
        message: `Vertex ${i + 1} has negative weight: ${vertex.weight}`,
        suggestion: 'All vertex weights must be positive'
      });
    }
    
    if (isNaN(vertex.weight) || isNaN(vertex.cgPosition)) {
      errors.push({
        code: 'INVALID_COORDINATES',
        severity: 'error',
        message: `Vertex ${i + 1} has invalid coordinates`,
        suggestion: 'Ensure all vertices have valid numeric values'
      });
    }
  }
  
  // Check vertex ordering (should be clockwise or counter-clockwise, not random)
  const orderingIssue = checkVertexOrdering(envelope.vertices);
  if (orderingIssue) {
    errors.push(orderingIssue);
  }
  
  // Check for self-intersecting edges
  const selfIntersection = checkSelfIntersection(envelope.vertices);
  if (selfIntersection) {
    errors.push(selfIntersection);
  }
  
  // Check if forward/aft limits are consistent with vertices
  if (envelope.forwardLimit !== undefined && envelope.aftLimit !== undefined) {
    const limitsCheck = validateLimitsConsistency(envelope);
    if (limitsCheck) {
      errors.push(limitsCheck);
    }
  }
  
  // Check if max weight is reasonable
  if (envelope.maxWeight <= 0) {
    errors.push({
      code: 'INVALID_MAX_WEIGHT',
      severity: 'error',
      message: 'Maximum weight must be positive',
      suggestion: 'Set a valid maximum weight for this envelope'
    });
  }
  
  // Check if vertices define a valid area
  const area = calculatePolygonArea(envelope.vertices);
  if (area < 0.001) {
    errors.push({
      code: 'DEGENERATE_POLYGON',
      severity: 'warning',
      message: 'Envelope area is too small or degenerate',
      suggestion: 'Ensure vertices define a meaningful area for CG operations'
    });
  }
  
  return errors;
}

/**
 * Check if polygon is properly closed
 */
function isPolygonClosed(vertices: EnvelopePoint[]): boolean {
  if (vertices.length < 3) return false;
  
  const first = vertices[0];
  const last = vertices[vertices.length - 1];
  
  const tolerance = 0.001; // Small tolerance for floating point comparison
  
  return (
    Math.abs(first.weight - last.weight) < tolerance &&
    Math.abs(first.cgPosition - last.cgPosition) < tolerance
  );
}

/**
 * Check vertex ordering for consistency
 */
function checkVertexOrdering(vertices: EnvelopePoint[]): ValidationError | null {
  if (vertices.length < 3) return null;
  
  // Calculate signed area to determine orientation
  let sum = 0;
  for (let i = 0; i < vertices.length - 1; i++) {
    const v1 = vertices[i];
    const v2 = vertices[i + 1];
    sum += (v2.cgPosition - v1.cgPosition) * (v2.weight + v1.weight);
  }
  
  // Check for near-zero sum (indicates vertices might be in a line or poorly ordered)
  if (Math.abs(sum) < 1.0) {
    return {
      code: 'POOR_VERTEX_ORDERING',
      severity: 'warning',
      message: 'Vertices may not be properly ordered or define a degenerate shape',
      suggestion: 'Ensure vertices are ordered consistently (clockwise or counter-clockwise)'
    };
  }
  
  return null;
}

/**
 * Check for self-intersecting edges
 */
function checkSelfIntersection(vertices: EnvelopePoint[]): ValidationError | null {
  if (vertices.length < 4) return null;
  
  // Check each pair of non-adjacent edges for intersection
  for (let i = 0; i < vertices.length - 1; i++) {
    const edge1Start = vertices[i];
    const edge1End = vertices[i + 1];
    
    for (let j = i + 2; j < vertices.length - 1; j++) {
      // Skip if edges are adjacent
      if (j === i + 1 || (i === 0 && j === vertices.length - 2)) continue;
      
      const edge2Start = vertices[j];
      const edge2End = vertices[j + 1];
      
      if (edgesIntersect(edge1Start, edge1End, edge2Start, edge2End)) {
        return {
          code: 'SELF_INTERSECTING',
          severity: 'error',
          message: `Envelope edges intersect between vertices ${i + 1}-${i + 2} and ${j + 1}-${j + 2}`,
          suggestion: 'Reorder vertices to eliminate edge crossings'
        };
      }
    }
  }
  
  return null;
}

/**
 * Check if two line segments intersect
 */
function edgesIntersect(
  p1: EnvelopePoint,
  p2: EnvelopePoint,
  p3: EnvelopePoint,
  p4: EnvelopePoint
): boolean {
  const x1 = p1.cgPosition, y1 = p1.weight;
  const x2 = p2.cgPosition, y2 = p2.weight;
  const x3 = p3.cgPosition, y3 = p3.weight;
  const x4 = p4.cgPosition, y4 = p4.weight;
  
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  
  if (Math.abs(denom) < 0.0001) return false; // Parallel or coincident
  
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
  
  return t > 0 && t < 1 && u > 0 && u < 1;
}

/**
 * Calculate polygon area (shoelace formula)
 */
function calculatePolygonArea(vertices: EnvelopePoint[]): number {
  if (vertices.length < 3) return 0;
  
  let area = 0;
  for (let i = 0; i < vertices.length - 1; i++) {
    const v1 = vertices[i];
    const v2 = vertices[i + 1];
    area += v1.cgPosition * v2.weight - v2.cgPosition * v1.weight;
  }
  
  return Math.abs(area) / 2;
}

/**
 * Validate that forward/aft limits are consistent with vertices
 */
function validateLimitsConsistency(envelope: CGEnvelope): ValidationError | null {
  if (!envelope.forwardLimit || !envelope.aftLimit) return null;
  
  // Check if limits are in correct order
  if (envelope.forwardLimit >= envelope.aftLimit) {
    return {
      code: 'INVALID_LIMITS',
      severity: 'error',
      message: 'Forward limit must be less than aft limit',
      suggestion: 'Swap the forward and aft limit values'
    };
  }
  
  // Check if vertices fall within the specified limits
  let minCG = Infinity;
  let maxCG = -Infinity;
  
  for (const vertex of envelope.vertices) {
    minCG = Math.min(minCG, vertex.cgPosition);
    maxCG = Math.max(maxCG, vertex.cgPosition);
  }
  
  const tolerance = 0.1;
  
  if (minCG < envelope.forwardLimit - tolerance || maxCG > envelope.aftLimit + tolerance) {
    return {
      code: 'LIMITS_VERTEX_MISMATCH',
      severity: 'warning',
      message: 'Some vertices fall outside the specified forward/aft limits',
      suggestion: 'Adjust limits to encompass all vertices, or adjust vertex positions'
    };
  }
  
  return null;
}

/**
 * Get user-friendly summary of validation results
 */
export function getValidationSummary(errors: ValidationError[]): {
  isValid: boolean;
  errorCount: number;
  warningCount: number;
  message: string;
} {
  const errorCount = errors.filter(e => e.severity === 'error').length;
  const warningCount = errors.filter(e => e.severity === 'warning').length;
  
  let message = '';
  if (errorCount === 0 && warningCount === 0) {
    message = 'Envelope is valid';
  } else if (errorCount > 0) {
    message = `Envelope has ${errorCount} error(s) and ${warningCount} warning(s)`;
  } else {
    message = `Envelope has ${warningCount} warning(s)`;
  }
  
  return {
    isValid: errorCount === 0,
    errorCount,
    warningCount,
    message
  };
}
