import type { BushingInputs } from '../src/lib/core/bushing';

export const baseBushingInput: BushingInputs = {
  units: 'imperial',
  boreDia: 0.5,
  idBushing: 0.375,
  interference: 0.0015,
  housingLen: 0.5,
  housingWidth: 1.5,
  edgeDist: 0.75,
  bushingType: 'straight',
  idType: 'straight',
  csMode: 'depth_angle',
  csDia: 0.5,
  csDepth: 0.125,
  csAngle: 100,
  extCsMode: 'depth_angle',
  extCsDia: 0.625,
  extCsDepth: 0.125,
  extCsAngle: 100,
  flangeOd: 0.75,
  flangeThk: 0.063,
  matHousing: 'al7075',
  matBushing: 'bronze',
  friction: 0.15,
  dT: 0,
  minWallStraight: 0.05,
  minWallNeck: 0.04
};
