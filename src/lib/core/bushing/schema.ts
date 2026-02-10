import { z } from 'zod';
import type { BushingInputs, BushingWarning } from './types';

export const bushingInputsSchema = z.object({
  units: z.enum(['imperial', 'metric']),
  boreDia: z.number().positive(),
  idBushing: z.number().positive(),
  interference: z.number(),
  housingLen: z.number().positive(),
  housingWidth: z.number().positive(),
  edgeDist: z.number().nonnegative(),
  bushingType: z.enum(['straight', 'flanged', 'countersink']),
  idType: z.enum(['straight', 'countersink']),
  csMode: z.enum(['depth_angle', 'dia_angle', 'dia_depth']),
  csDia: z.number().nonnegative(),
  csDepth: z.number().nonnegative(),
  csAngle: z.number().nonnegative(),
  extCsMode: z.enum(['depth_angle', 'dia_angle', 'dia_depth']),
  extCsDia: z.number().nonnegative(),
  extCsDepth: z.number().nonnegative(),
  extCsAngle: z.number().nonnegative(),
  flangeDia: z.number().optional(),
  flangeOd: z.number().optional(),
  flangeThk: z.number().optional(),
  matHousing: z.string().min(1),
  matBushing: z.string().min(1),
  friction: z.number().min(0),
  dT: z.number(),
  minWallStraight: z.number().positive(),
  minWallNeck: z.number().positive(),
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
  return warnings;
}
