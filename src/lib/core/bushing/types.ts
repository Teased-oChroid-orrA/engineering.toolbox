import type {
  BoreProcessCapability,
  CSMode,
  CountersinkInput,
  InterferenceEnforcementPolicy,
  ToleranceMode
} from './typePrimitives';

export type {
  BushingCandidate,
  BushingWarningCode,
  BushingWarning,
  MaterialProps,
  ToleranceRange,
  InterferenceEnforcementReasonCode,
  InterferenceEnforcementPolicy,
  BoreProcessCapability,
  CSMode,
  ToleranceMode,
  CountersinkInput
} from './typePrimitives';

export type { BushingOutput } from './outputTypes';

export type BushingInputs = {
  units: 'imperial' | 'metric';
  boreDia: number;
  idBushing: number;
  interference: number;
  boreTolMode?: ToleranceMode;
  boreNominal?: number;
  boreTolPlus?: number;
  boreTolMinus?: number;
  boreLower?: number;
  boreUpper?: number;
  interferenceTolMode?: ToleranceMode;
  interferenceNominal?: number;
  interferenceTolPlus?: number;
  interferenceTolMinus?: number;
  interferenceLower?: number;
  interferenceUpper?: number;
  interferencePolicy?: InterferenceEnforcementPolicy;
  boreCapability?: BoreProcessCapability;
  enforceInterferenceTolerance?: boolean;
  lockBoreForInterference?: boolean;
  housingLen: number;
  housingWidth: number;
  edgeDist: number;
  bushingType: 'straight' | 'flanged' | 'countersink';
  idType: 'straight' | 'countersink';
  csMode: CSMode;
  csDia: number;
  csDepth: number;
  csAngle: number;
  extCsMode: CSMode;
  extCsDia: number;
  extCsDepth: number;
  extCsAngle: number;
  flangeDia?: number;
  flangeOd?: number;
  flangeThk?: number;
  matHousing: string;
  matBushing: string;
  friction: number;
  dT: number;
  minWallStraight: number;
  minWallNeck: number;
  endConstraint?: 'free' | 'one_end' | 'both_ends';
  load?: number;
  thetaDeg?: number;
  idCS?: CountersinkInput;
  odCS?: CountersinkInput;
};

export type BushingInputsRaw = Partial<BushingInputs> & {
  bore_dia?: number;
  bushOD?: number;
  bushID?: number;
  id_bushing?: number;
  housing_len?: number;
  housingWidth?: number;
  housing_width?: number;
  edge_dist?: number;
  bushing_type?: string;
  flange_od?: number;
  flange_thk?: number;
  id_type?: string;
  cs_mode?: CSMode;
  cs_dia?: number;
  cs_depth?: number;
  cs_angle?: number;
  ext_cs_mode?: CSMode;
  ext_cs_dia?: number;
  ext_cs_depth?: number;
  ext_cs_angle?: number;
  bore_tol_mode?: ToleranceMode;
  bore_nominal?: number;
  bore_tol_plus?: number;
  bore_tol_minus?: number;
  bore_lower?: number;
  bore_upper?: number;
  interference_tol_mode?: ToleranceMode;
  interference_nominal?: number;
  interference_tol_plus?: number;
  interference_tol_minus?: number;
  interference_lower?: number;
  interference_upper?: number;
  interference_policy?: Partial<InterferenceEnforcementPolicy> & {
    lock_bore?: boolean;
    preserve_bore_nominal?: boolean;
    allow_bore_nominal_shift?: boolean;
    max_bore_nominal_shift?: number;
  };
  bore_capability?: Partial<BoreProcessCapability> & {
    min_achievable_tol_width?: number;
    max_recommended_tol_width?: number;
    preferred_it_class?: string;
  };
  enforce_interference_tolerance?: boolean;
  lock_bore_for_interference?: boolean;
  mat_housing?: string;
  mat_bushing?: string;
  min_wall_straight?: number;
  min_wall_neck?: number;
  end_constraint?: 'free' | 'one_end' | 'both_ends';
  t1?: number;
  t2?: number;
};
