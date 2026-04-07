import type { BushingOutput } from './outputTypes';
import type { BushingInputs } from './types';
import { buildBushingDecisionSupport } from './serviceAnalysis';

export function buildBushingEngineeringReview(args: {
  input: BushingInputs;
  material: { E_ksi: number; alpha_uF: number };
  housingMaterial: { alpha_uF: number };
  effectiveInterference: number;
  pressure: number;
  stressHoopBushing: number;
  termB: number;
  termH: number;
  installForce: number;
  retainedInstallForce: number;
}): Pick<BushingOutput, 'serviceEnvelope' | 'dutyScreen' | 'process' | 'review'> {
  return buildBushingDecisionSupport({
    input: args.input,
    matHousing: args.housingMaterial,
    matBushing: args.material,
    boreDia: args.input.boreDia,
    freeId: args.input.idBushing,
    baseEffectiveInterference: args.effectiveInterference,
    basePressure: args.pressure,
    installForce: args.installForce,
    retainedInstallForce: args.retainedInstallForce
  });
}
