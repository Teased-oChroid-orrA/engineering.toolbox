import { normalizeBushingInputs } from './normalize';
import { validateBushingInputs } from './schema';
import type { BushingInputsRaw, BushingOutput } from './types';
import { solveCountersink } from './solveMath';
import { buildWarnings, computeState, toOutput } from './solveEngine';

export type { BushingInputs, BushingInputsRaw, BushingOutput, BushingWarning, CSMode } from './types';
export { solveCountersink };

export function computeBushing(raw: BushingInputsRaw): BushingOutput {
  const input = normalizeBushingInputs(raw);
  const validationWarnings = validateBushingInputs(input);
  const state = computeState(input);
  const { warningCodes, warnings } = buildWarnings(validationWarnings, state);
  return toOutput(state, warningCodes, warnings);
}
