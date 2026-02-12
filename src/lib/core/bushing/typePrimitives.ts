import type { UnitSystem } from '../units';

export type CSMode = 'depth_angle' | 'dia_angle' | 'dia_depth';
export type ToleranceMode = 'nominal_tol' | 'limits';

export type ToleranceRange = {
  mode: ToleranceMode;
  lower: number;
  upper: number;
  nominal: number;
  tolPlus: number;
  tolMinus: number;
};

export type InterferenceEnforcementPolicy = {
  enabled?: boolean;
  lockBore?: boolean;
  preserveBoreNominal?: boolean;
  allowBoreNominalShift?: boolean;
  maxBoreNominalShift?: number;
};

export type BoreProcessCapability = {
  mode?: 'unspecified' | 'reamer_fixed' | 'adjustable';
  minAchievableTolWidth?: number;
  maxRecommendedTolWidth?: number;
  preferredItClass?: string;
};

export type InterferenceEnforcementReasonCode =
  | 'ENFORCEMENT_DISABLED'
  | 'CONTAINMENT_SATISFIED'
  | 'AUTO_ADJUST_BORE_WIDTH'
  | 'BLOCKED_BORE_LOCKED'
  | 'BLOCKED_CAPABILITY_FLOOR'
  | 'BLOCKED_INFEASIBLE_WIDTH'
  | 'BLOCKED_NOMINAL_SHIFT_NO_EFFECT';

export type CountersinkInput = {
  enabled?: boolean;
  defType?: string;
  dia?: number;
  depth?: number;
  angleDeg?: number;
};

export type MaterialProps = {
  id: string;
  name: string;
  E_ksi: number;
  Sy_ksi: number;
  Fbru_ksi: number;
  Fsu_ksi: number;
  Ftu_ksi?: number;
  nu: number;
  alpha_uF: number;
};

export type BushingCandidate = {
  name: string;
  margin: number;
};

export type BushingWarningCode =
  | 'INPUT_INVALID'
  | 'TOLERANCE_INFEASIBLE'
  | 'INTERFERENCE_ENFORCEMENT_BLOCKED'
  | 'STRAIGHT_WALL_BELOW_MIN'
  | 'NECK_WALL_BELOW_MIN'
  | 'NET_CLEARANCE_FIT'
  | 'EDGE_DISTANCE_SEQUENCE_FAIL'
  | 'EDGE_DISTANCE_STRENGTH_FAIL';

export type BushingWarning = {
  code: BushingWarningCode;
  message: string;
  severity: 'info' | 'warning' | 'error';
};

export type BushingUnits = UnitSystem;
