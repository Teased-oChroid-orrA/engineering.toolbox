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
  housingLen: z.number().positive(),
  housingWidth: z.number().positive(),
  edgeDist: z.number().nonnegative(),
  bushingType: z.enum(['straight', 'flanged', 'countersink']),
  idType: z.enum(['straight', 'countersink']),
  csMode: z.enum(['depth_angle', 'dia_angle', 'dia_depth']),
  csDia: z.number().nonnegative(),
  csDepth: z.number().nonnegative(),
  csAngle: z.number().gt(0).lt(180),
  extCsMode: z.enum(['depth_angle', 'dia_angle', 'dia_depth']),
  extCsDia: z.number().nonnegative(),
  extCsDepth: z.number().nonnegative(),
  extCsAngle: z.number().gt(0).lt(180),
  flangeDia: z.number().optional(),
  flangeOd: z.number().optional(),
  flangeThk: z.number().optional(),
  matHousing: z.string().min(1),
  matBushing: z.string().min(1),
  friction: z.number().min(0),
  dT: z.number(),
  minWallStraight: z.number().positive(),
  minWallNeck: z.number().positive(),
  endConstraint: z.enum(['free', 'one_end', 'both_ends']).optional(),
  load: z.number().optional(),
  thetaDeg: z.number().optional(),
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
      code: 'INPUT_INVALID',
      message: 'Some inputs are invalid. Results are best-effort.',
      severity: 'warning'
    });
  }
  if (Number.isFinite(input.idBushing) && Number.isFinite(input.boreDia) && input.idBushing >= input.boreDia) {
    warnings.push({
      code: 'INPUT_INVALID',
      message: 'Bushing ID should be smaller than bore diameter.',
      severity: 'warning'
    });
  }
  const boreLower = Number(input.boreLower);
  const boreUpper = Number(input.boreUpper);
  if (Number.isFinite(boreLower) && Number.isFinite(boreUpper) && boreLower > boreUpper) {
    warnings.push({
      code: 'INPUT_INVALID',
      message: 'Bore lower limit should be <= upper limit.',
      severity: 'warning'
    });
  }
  const interferenceLower = Number(input.interferenceLower);
  const interferenceUpper = Number(input.interferenceUpper);
  if (Number.isFinite(interferenceLower) && Number.isFinite(interferenceUpper) && interferenceLower > interferenceUpper) {
    warnings.push({
      code: 'INPUT_INVALID',
      message: 'Interference lower limit should be <= upper limit.',
      severity: 'warning'
    });
  }
  if (input.idType === 'countersink') {
    if (Number.isFinite(input.csDia) && Number.isFinite(input.idBushing) && input.csDia < input.idBushing) {
      warnings.push({
        code: 'INPUT_INVALID',
        message: 'Internal countersink diameter should be >= bushing ID.',
        severity: 'warning'
      });
    }
    if (!Number.isFinite(input.csAngle) || input.csAngle <= 0 || input.csAngle >= 180) {
      warnings.push({
        code: 'INPUT_INVALID',
        message: 'Internal countersink angle must be between 0 and 180 degrees.',
        severity: 'warning'
      });
    }
  }
  if (input.bushingType === 'countersink') {
    if (Number.isFinite(input.extCsDia) && Number.isFinite(input.boreDia) && input.extCsDia < input.boreDia) {
      warnings.push({
        code: 'INPUT_INVALID',
        message: 'External countersink diameter should be >= installed OD baseline.',
        severity: 'warning'
      });
    }
    if (!Number.isFinite(input.extCsAngle) || input.extCsAngle <= 0 || input.extCsAngle >= 180) {
      warnings.push({
        code: 'INPUT_INVALID',
        message: 'External countersink angle must be between 0 and 180 degrees.',
        severity: 'warning'
      });
    }
  }
  return warnings;
}
