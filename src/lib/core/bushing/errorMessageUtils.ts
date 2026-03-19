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
        suggestion: 'Reduce bushing ID, increase the installed OD/interference, or select a larger bore/OD combination.',
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

    case 'BUSHING_ID_GE_BORE':
      return {
        title: 'Bushing ID Exceeds Bore',
        description: 'The bushing inner diameter is equal to or larger than the bore diameter. That geometry cannot produce a valid wall section.',
        suggestion: 'Reduce bushing ID below the bore diameter, or increase the bore diameter above the selected bushing ID.',
        severity: 'error',
        technicalCode: code
      };

    case 'INTERNAL_CS_DIA_LT_ID':
      return {
        title: 'Internal Countersink Too Small',
        description: 'The internal countersink mouth diameter is smaller than the bushing ID, so the countersink cannot be formed.',
        suggestion: 'Increase internal countersink diameter or reduce the bushing ID.',
        severity: 'warning',
        technicalCode: code
      };

    case 'INTERNAL_CS_ANGLE_INVALID':
      return {
        title: 'Internal Countersink Angle Invalid',
        description: 'The internal countersink angle must stay between 0° and 180°.',
        suggestion: 'Use a standard included angle such as 82°, 90°, or 100°.',
        severity: 'warning',
        technicalCode: code
      };

    case 'EXTERNAL_CS_DIA_LT_OD':
      return {
        title: 'External Countersink Too Small',
        description: 'The external countersink diameter is smaller than the installed outer baseline, so the countersink cannot open correctly.',
        suggestion: 'Increase external countersink diameter or reduce the installed OD baseline.',
        severity: 'warning',
        technicalCode: code
      };

    case 'EXTERNAL_CS_ANGLE_INVALID':
      return {
        title: 'External Countersink Angle Invalid',
        description: 'The external countersink angle must stay between 0° and 180°.',
        suggestion: 'Use a standard included angle such as 82°, 90°, or 100°.',
        severity: 'warning',
        technicalCode: code
      };

    case 'INTERNAL_CS_GEOMETRY_INVALID':
      return {
        title: 'Internal Countersink Geometry Invalid',
        description: 'The internal countersink geometry does not satisfy the active countersink parametrization.',
        suggestion: 'Review internal countersink diameter, depth, and angle together. Start by making sure the bushing ID is smaller than the bore.',
        severity: 'warning',
        technicalCode: code
      };

    case 'EXTERNAL_CS_GEOMETRY_INVALID':
      return {
        title: 'External Countersink Geometry Invalid',
        description: 'The external countersink geometry does not satisfy the active countersink parametrization.',
        suggestion: 'Review external countersink diameter, depth, and angle together.',
        severity: 'warning',
        technicalCode: code
      };

    case 'BORE_LIMITS_REVERSED':
      return {
        title: 'Bore Limits Reversed',
        description: 'The entered bore lower limit is larger than the bore upper limit.',
        suggestion: 'Swap the lower and upper bore limits.',
        severity: 'warning',
        technicalCode: code
      };

    case 'INTERFERENCE_LIMITS_REVERSED':
      return {
        title: 'Interference Limits Reversed',
        description: 'The entered interference lower limit is larger than the interference upper limit.',
        suggestion: 'Swap the lower and upper interference limits.',
        severity: 'warning',
        technicalCode: code
      };

    case 'BORE_CAPABILITY_RANGE_INVALID':
      return {
        title: 'Bore Capability Range Invalid',
        description: 'The minimum achievable bore tolerance width is larger than the maximum recommended width.',
        suggestion: 'Lower the minimum achievable width, raise the maximum recommended width, or clear one of the capability values.',
        severity: 'warning',
        technicalCode: code
      };

    case 'POLICY_PRESERVE_SHIFT_CONFLICT':
      return {
        title: 'Conflicting Bore-Shift Policy',
        description: 'Both preserve-nominal and allow-nominal-shift are enabled. Preserve nominal wins, so the shift option is currently ineffective.',
        suggestion: 'Choose either preserve nominal or allow nominal shift, not both.',
        severity: 'info',
        technicalCode: code
      };

    case 'REAMER_LOCK_CONFLICT':
      return {
        title: 'Reamer-Fixed Bore Must Stay Locked',
        description: 'Reamer-fixed capability means the bore cannot be reshaped by the solver.',
        suggestion: 'Turn bore lock back on or switch bore capability away from reamer-fixed.',
        severity: 'info',
        technicalCode: code
      };

    case 'INPUT_INVALID':
      return {
        title: 'Invalid Input Configuration',
        description: 'One or more input combinations are invalid.',
        suggestion: 'Review the highlighted warning details and apply one of the suggested fixes.',
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
    STRAIGHT_WALL_BELOW_MIN: 'Reduce Bushing ID',
    NECK_WALL_BELOW_MIN: 'Reduce Countersink Depth',
    NET_CLEARANCE_FIT: 'Increase Interference',
    BUSHING_ID_GE_BORE: 'Reduce Bushing ID',
    INTERNAL_CS_DIA_LT_ID: 'Increase Internal CS Diameter',
    EXTERNAL_CS_DIA_LT_OD: 'Increase External CS Diameter',
    HOUSING_MARGIN_FAIL: 'Increase Housing Thickness',
    BUSHING_MARGIN_FAIL: 'Use Stronger Material'
  };

  return quickFixes[code] || null;
}
