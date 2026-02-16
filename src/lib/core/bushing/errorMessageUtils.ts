/**
 * User-friendly error message utility for bushing toolbox
 * Converts technical error codes into actionable, understandable messages
 * Following WCAG and UX best practices for error communication
 */

export type ErrorSeverity = 'error' | 'warning' | 'info';

export interface FriendlyMessage {
  title: string;
  description: string;
  suggestion: string;
  severity: ErrorSeverity;
  technicalCode?: string;
}

/**
 * Convert technical warning code to user-friendly message
 * @param code - Technical warning code (e.g., "EDGE_DISTANCE_SEQUENCE_FAIL")
 * @param context - Optional context for more specific suggestions
 */
export function makeFriendlyMessage(
  code: string,
  context?: {
    margin?: number;
    actualValue?: number;
    requiredValue?: number;
    units?: string;
  }
): FriendlyMessage {
  const units = context?.units || 'in';

  switch (code) {
    case 'EDGE_DISTANCE_SEQUENCE_FAIL':
      return {
        title: 'Edge Distance Too Small',
        description: `The bushing is too close to the plate edge. This can cause failure during installation or under load.`,
        suggestion: context?.requiredValue
          ? `Increase edge distance to at least ${context.requiredValue.toFixed(3)} ${units} (currently ${context.actualValue?.toFixed(3) || '?'} ${units}).`
          : 'Increase the edge distance value in the Geometry section.',
        severity: 'error',
        technicalCode: code
      };

    case 'EDGE_DISTANCE_STRENGTH_FAIL':
      return {
        title: 'Insufficient Bearing Strength',
        description: 'The edge distance is too small to support the required bearing strength.',
        suggestion: context?.requiredValue
          ? `Increase edge distance to at least ${context.requiredValue.toFixed(3)} ${units}.`
          : 'Increase the edge distance or reduce the applied load.',
        severity: 'error',
        technicalCode: code
      };

    case 'STRAIGHT_WALL_BELOW_MIN':
      return {
        title: 'Wall Too Thin (Straight Section)',
        description: 'The straight wall thickness is below the minimum required for structural integrity.',
        suggestion: 'Increase housing thickness or reduce bore diameter.',
        severity: 'error',
        technicalCode: code
      };

    case 'NECK_WALL_BELOW_MIN':
      return {
        title: 'Wall Too Thin (Neck Section)',
        description: 'The neck wall thickness is below the minimum required. This is common with countersink profiles.',
        suggestion: 'Reduce countersink depth, increase housing thickness, or change to straight profile.',
        severity: 'error',
        technicalCode: code
      };

    case 'NET_CLEARANCE_FIT':
      return {
        title: 'Clearance Fit Detected',
        description: 'After thermal expansion, the bushing may have clearance instead of interference.',
        suggestion: 'Increase nominal interference or review thermal conditions.',
        severity: 'warning',
        technicalCode: code
      };

    case 'INPUT_INVALID':
      return {
        title: 'Invalid Input Configuration',
        description: 'The current countersink geometry is invalid for the selected parametrization mode.',
        suggestion: 'Check countersink depth, angle, and diameter values. Try a different mode.',
        severity: 'warning',
        technicalCode: code
      };

    case 'HOUSING_MARGIN_FAIL':
      return {
        title: 'Housing Stress Too High',
        description: 'The housing material stress exceeds the allowable limit.',
        suggestion: 'Increase housing thickness, use stronger material, or reduce interference.',
        severity: 'error',
        technicalCode: code
      };

    case 'BUSHING_MARGIN_FAIL':
      return {
        title: 'Bushing Stress Too High',
        description: 'The bushing material stress exceeds the allowable limit.',
        suggestion: 'Use stronger bushing material, reduce interference, or increase bushing thickness.',
        severity: 'error',
        technicalCode: code
      };

    default:
      // Fallback for unknown codes - make them more readable
      return {
        title: formatCodeAsTitle(code),
        description: 'A design constraint has been violated.',
        suggestion: 'Review the diagnostics panel for more details.',
        severity: 'warning',
        technicalCode: code
      };
  }
}

/**
 * Format technical code as human-readable title
 * Example: "EDGE_DISTANCE_SEQUENCE_FAIL" → "Edge Distance Sequence Fail"
 */
function formatCodeAsTitle(code: string): string {
  return code
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Get quick fix action for a warning code
 */
export function getQuickFix(code: string): string | null {
  const quickFixes: Record<string, string> = {
    EDGE_DISTANCE_SEQUENCE_FAIL: 'Increase Edge Distance',
    EDGE_DISTANCE_STRENGTH_FAIL: 'Increase Edge Distance',
    STRAIGHT_WALL_BELOW_MIN: 'Increase Housing Thickness',
    NECK_WALL_BELOW_MIN: 'Reduce Countersink Depth',
    NET_CLEARANCE_FIT: 'Increase Interference',
    HOUSING_MARGIN_FAIL: 'Increase Housing Thickness',
    BUSHING_MARGIN_FAIL: 'Use Stronger Material'
  };

  return quickFixes[code] || null;
}
