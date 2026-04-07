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

export type BushingProcessRouteId =
  | 'press_fit_only'
  | 'press_fit_finish_ream'
  | 'line_ream_repair'
  | 'thermal_assist_install'
  | 'bonded_joint';

export type BushingStandardsBasis =
  | 'shop_default'
  | 'faa_ac_43_13'
  | 'nas_ms'
  | 'sae_ams'
  | 'oem_srm';

export type BushingCriticality = 'general' | 'primary_structure' | 'repair';

export type BushingLoadSpectrum = 'static' | 'oscillating' | 'rotating';

export type BushingLubricationMode = 'dry' | 'greased' | 'oiled' | 'solid_film';

export type BushingContaminationLevel = 'clean' | 'shop' | 'dirty' | 'abrasive';

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
  | 'INPUT_SCHEMA_INVALID'
  | 'BUSHING_ID_GE_BORE'
  | 'BORE_LIMITS_REVERSED'
  | 'INTERFERENCE_LIMITS_REVERSED'
  | 'BORE_CAPABILITY_RANGE_INVALID'
  | 'POLICY_PRESERVE_SHIFT_CONFLICT'
  | 'REAMER_LOCK_CONFLICT'
  | 'INTERNAL_CS_DIA_LT_ID'
  | 'INTERNAL_CS_ANGLE_INVALID'
  | 'EXTERNAL_CS_DIA_LT_OD'
  | 'EXTERNAL_CS_ANGLE_INVALID'
  | 'INTERNAL_CS_GEOMETRY_INVALID'
  | 'EXTERNAL_CS_GEOMETRY_INVALID'
  | 'TOLERANCE_INFEASIBLE'
  | 'INTERFERENCE_ENFORCEMENT_BLOCKED'
  | 'STRAIGHT_WALL_BELOW_MIN'
  | 'NECK_WALL_BELOW_MIN'
  | 'NET_CLEARANCE_FIT'
  | 'SERVICE_STATE_CLEARANCE'
  | 'DUTY_SCREEN_HIGH_RISK'
  | 'APPROVAL_REVIEW_REQUIRED'
  | 'EDGE_DISTANCE_SEQUENCE_FAIL'
  | 'EDGE_DISTANCE_STRENGTH_FAIL';

export type BushingWarning = {
  code: BushingWarningCode;
  message: string;
  severity: 'info' | 'warning' | 'error';
};

export type BushingUnits = UnitSystem;
