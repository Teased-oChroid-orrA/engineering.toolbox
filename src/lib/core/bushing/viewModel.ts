import type { BushingInputs, BushingOutput } from './types';

export type BushingViewModel = BushingInputs & {
  geometry?: BushingOutput['geometry'];
  csSolved?: BushingOutput['csSolved'];
};

export function buildBushingViewModel(form: BushingInputs, results: BushingOutput): BushingViewModel {
  return {
    ...form,
    geometry: results?.geometry,
    csSolved: results?.csSolved
  };
}
