import { z } from 'zod';
import type { BushingInputs, BushingWarning } from './types';

export const bushingInputsSchema = z.object({
  units: z.enum(['imperial', 'metric']),
  boreDia: z.number().positive(),
  idBushing: z.number().positive(),
  interference: z.number(),
  boreTolMode: z.enum(['nominal_tol', 'limits']).optional(),
  boreNominal: z.number().positive().optional(),
  boreTolPlus: z.number().nonnegative().optional(),
  boreTolMinus: z.number().nonnegative().optional(),
  boreLower: z.number().positive().optional(),
  boreUpper: z.number().positive().optional(),
  interferenceTolMode: z.enum(['nominal_tol', 'limits']).optional(),
  interferenceNominal: z.number().optional(),
  interferenceTolPlus: z.number().nonnegative().optional(),
  interferenceTolMinus: z.number().nonnegative().optional(),
  interferenceLower: z.number().optional(),
  interferenceUpper: z.number().optional(),
  interferencePolicy: z.object({
    enabled: z.boolean().optional(),
    lockBore: z.boolean().optional(),
    preserveBoreNominal: z.boolean().optional(),
    allowBoreNominalShift: z.boolean().optional(),
    maxBoreNominalShift: z.number().nonnegative().optional()
  }).optional(),
  boreCapability: z.object({
    mode: z.enum(['unspecified', 'reamer_fixed', 'adjustable']).optional(),
    minAchievableTolWidth: z.number().nonnegative().optional(),
    maxRecommendedTolWidth: z.number().nonnegative().optional(),
    preferredItClass: z.string().optional()
  }).optional(),
  enforceInterferenceTolerance: z.boolean().optional(),
  lockBoreForInterference: z.boolean().optional(),
  housingLen: z.number().positive(),
  housingWidth: z.number().positive(),
  edgeDist: z.number().nonnegative(),
  bushingType: z.enum(['straight', 'flanged', 'countersink']),
  idType: z.enum(['straight', 'countersink']),
  csMode: z.enum(['depth_angle', 'dia_angle', 'dia_depth']),
  csDia: z.number().nonnegative(),
  csDepth: z.number().nonnegative(),
  csDepthTolPlus: z.number().nonnegative().optional(),
  csDepthTolMinus: z.number().nonnegative().optional(),
  csAngle: z.number().gt(0).lt(180),
  extCsMode: z.enum(['depth_angle', 'dia_angle', 'dia_depth']),
  extCsDia: z.number().nonnegative(),
  extCsDepth: z.number().nonnegative(),
  extCsDepthTolPlus: z.number().nonnegative().optional(),
  extCsDepthTolMinus: z.number().nonnegative().optional(),
  extCsAngle: z.number().gt(0).lt(180),
  flangeDia: z.number().optional(),
  flangeOd: z.number().optional(),
  flangeThk: z.number().optional(),
  matHousing: z.string().min(1),
  matBushing: z.string().min(1),
  friction: z.number().min(0),
  dT: z.number(),
  assemblyHousingTemperature: z.number().optional(),
  assemblyBushingTemperature: z.number().optional(),
  processRouteId: z.enum(['press_fit_only', 'press_fit_finish_ream', 'line_ream_repair', 'thermal_assist_install', 'bonded_joint']).optional(),
  standardsBasis: z.enum(['shop_default', 'faa_ac_43_13', 'nas_ms', 'sae_ams', 'oem_srm']).optional(),
  standardsRevision: z.string().optional(),
  processSpec: z.string().optional(),
  approvalNotes: z.string().optional(),
  criticality: z.enum(['general', 'primary_structure', 'repair']).optional(),
  minWallStraight: z.number().positive(),
  minWallNeck: z.number().positive(),
  endConstraint: z.enum(['free', 'one_end', 'both_ends']).optional(),
  load: z.number().optional(),
  edgeLoadAngleDeg: z.number().positive().optional(),
  serviceTemperatureHot: z.number().optional(),
  serviceTemperatureCold: z.number().optional(),
  finishReamAllowance: z.number().nonnegative().optional(),
  wearAllowance: z.number().nonnegative().optional(),
  loadSpectrum: z.enum(['static', 'oscillating', 'rotating']).optional(),
  oscillationAngleDeg: z.number().min(0).optional(),
  oscillationFreqHz: z.number().min(0).optional(),
  dutyCyclePct: z.number().min(0).max(100).optional(),
  lubricationMode: z.enum(['dry', 'greased', 'oiled', 'solid_film']).optional(),
  contaminationLevel: z.enum(['clean', 'shop', 'dirty', 'abrasive']).optional(),
  surfaceRoughnessRaUm: z.number().positive().optional(),
  shaftHardnessHrc: z.number().positive().optional(),
  misalignmentDeg: z.number().min(0).optional(),
  measuredPart: z
    .object({
      enabled: z.boolean().optional(),
      basis: z.enum(['nominal', 'measured']).optional(),
      bore: z
        .object({
          actual: z.number().positive().optional(),
          tolPlus: z.number().nonnegative().optional(),
          tolMinus: z.number().nonnegative().optional(),
          roundness: z.number().nonnegative().optional(),
          ra: z.number().nonnegative().optional()
        })
        .optional(),
      id: z
        .object({
          actual: z.number().positive().optional(),
          tolPlus: z.number().nonnegative().optional(),
          tolMinus: z.number().nonnegative().optional(),
          roundness: z.number().nonnegative().optional(),
          ra: z.number().nonnegative().optional()
        })
        .optional(),
      edgeDist: z.number().nonnegative().optional(),
      housingWidth: z.number().nonnegative().optional(),
      notes: z.string().optional()
    })
    .optional(),
  idCS: z
    .object({
      enabled: z.boolean().optional(),
      defType: z.string().optional(),
      dia: z.number().optional(),
      depth: z.number().optional(),
      angleDeg: z.number().optional()
    })
    .optional(),
  odCS: z
    .object({
      enabled: z.boolean().optional(),
      defType: z.string().optional(),
      dia: z.number().optional(),
      depth: z.number().optional(),
      angleDeg: z.number().optional()
    })
    .optional()
});

export function validateBushingInputs(input: BushingInputs): BushingWarning[] {
  const warnings: BushingWarning[] = [];
  const parsed = bushingInputsSchema.safeParse(input);
  if (!parsed.success) {
    warnings.push({
      code: 'INPUT_SCHEMA_INVALID',
      message: 'Some inputs are invalid. Results are best-effort.',
      severity: 'warning'
    });
  }
  if (Number.isFinite(input.idBushing) && Number.isFinite(input.boreDia) && input.idBushing >= input.boreDia) {
    warnings.push({
      code: 'BUSHING_ID_GE_BORE',
      message: 'Bushing ID should be smaller than bore diameter.',
      severity: 'warning'
    });
  }
  const boreLower = Number(input.boreLower);
  const boreUpper = Number(input.boreUpper);
  if (Number.isFinite(boreLower) && Number.isFinite(boreUpper) && boreLower > boreUpper) {
    warnings.push({
      code: 'BORE_LIMITS_REVERSED',
      message: 'Bore lower limit should be <= upper limit.',
      severity: 'warning'
    });
  }
  const interferenceLower = Number(input.interferenceLower);
  const interferenceUpper = Number(input.interferenceUpper);
  if (Number.isFinite(interferenceLower) && Number.isFinite(interferenceUpper) && interferenceLower > interferenceUpper) {
    warnings.push({
      code: 'INTERFERENCE_LIMITS_REVERSED',
      message: 'Interference lower limit should be <= upper limit.',
      severity: 'warning'
    });
  }
  const minAchievableTolWidth = Number(input.boreCapability?.minAchievableTolWidth);
  const maxRecommendedTolWidth = Number(input.boreCapability?.maxRecommendedTolWidth);
  if (Number.isFinite(minAchievableTolWidth) && Number.isFinite(maxRecommendedTolWidth) && minAchievableTolWidth > maxRecommendedTolWidth) {
    warnings.push({
      code: 'BORE_CAPABILITY_RANGE_INVALID',
      message: 'Bore capability min achievable tolerance width should be <= max recommended tolerance width.',
      severity: 'warning'
    });
  }
  if (input.interferencePolicy?.preserveBoreNominal && input.interferencePolicy?.allowBoreNominalShift) {
    warnings.push({
      code: 'POLICY_PRESERVE_SHIFT_CONFLICT',
      message: 'Interference policy has both preserve-bore-nominal and allow-bore-nominal-shift enabled; preserve nominal takes precedence.',
      severity: 'info'
    });
  }
  if (input.boreCapability?.mode === 'reamer_fixed' && input.interferencePolicy?.lockBore === false) {
    warnings.push({
      code: 'REAMER_LOCK_CONFLICT',
      message: 'Reamer-fixed bore capability requires lock bore to remain enabled.',
      severity: 'info'
    });
  }
  if (Number.isFinite(input.dutyCyclePct) && (Number(input.dutyCyclePct) < 0 || Number(input.dutyCyclePct) > 100)) {
    warnings.push({
      code: 'INPUT_SCHEMA_INVALID',
      message: 'Duty cycle should stay between 0 and 100 percent.',
      severity: 'warning'
    });
  }
  if (input.measuredPart?.enabled && input.measuredPart.basis === 'measured') {
    const measuredBore = Number(input.measuredPart.bore?.actual);
    const measuredId = Number(input.measuredPart.id?.actual);
    if (Number.isFinite(measuredBore) && Number.isFinite(measuredId) && measuredId >= measuredBore) {
      warnings.push({
        code: 'BUSHING_ID_GE_BORE',
        message: 'Measured ID should be smaller than measured bore diameter.',
        severity: 'warning'
      });
    }
    if (Number.isFinite(input.measuredPart.edgeDist) && Number(input.measuredPart.edgeDist) < 0) {
      warnings.push({
        code: 'INPUT_SCHEMA_INVALID',
        message: 'Measured edge distance should be nonnegative.',
        severity: 'warning'
      });
    }
    if (Number.isFinite(input.measuredPart.housingWidth) && Number(input.measuredPart.housingWidth) <= 0) {
      warnings.push({
        code: 'INPUT_SCHEMA_INVALID',
        message: 'Measured surrounding width should be positive.',
        severity: 'warning'
      });
    }
  }
  if (input.idType === 'countersink') {
    if (Number.isFinite(input.csDia) && Number.isFinite(input.idBushing) && input.csDia < input.idBushing) {
      warnings.push({
        code: 'INTERNAL_CS_DIA_LT_ID',
        message: 'Internal countersink diameter should be >= bushing ID.',
        severity: 'warning'
      });
    }
    if (!Number.isFinite(input.csAngle) || input.csAngle <= 0 || input.csAngle >= 180) {
      warnings.push({
        code: 'INTERNAL_CS_ANGLE_INVALID',
        message: 'Internal countersink angle must be between 0 and 180 degrees.',
        severity: 'warning'
      });
    }
  }
  if (input.bushingType === 'countersink') {
    if (Number.isFinite(input.extCsDia) && Number.isFinite(input.boreDia) && input.extCsDia < input.boreDia) {
      warnings.push({
        code: 'EXTERNAL_CS_DIA_LT_OD',
        message: 'External countersink diameter should be >= installed OD baseline.',
        severity: 'warning'
      });
    }
    if (!Number.isFinite(input.extCsAngle) || input.extCsAngle <= 0 || input.extCsAngle >= 180) {
      warnings.push({
        code: 'EXTERNAL_CS_ANGLE_INVALID',
        message: 'External countersink angle must be between 0 and 180 degrees.',
        severity: 'warning'
      });
    }
  }
  return warnings;
}
