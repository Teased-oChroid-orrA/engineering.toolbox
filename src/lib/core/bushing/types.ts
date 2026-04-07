import type {
  BoreProcessCapability,
  BushingContaminationLevel,
  BushingCriticality,
  BushingLoadSpectrum,
  BushingLubricationMode,
  BushingProcessRouteId,
  BushingStandardsBasis,
  CSMode,
  CountersinkInput,
  InterferenceEnforcementPolicy,
  ToleranceMode
} from './typePrimitives';

export type {
  BushingCandidate,
  BushingContaminationLevel,
  BushingCriticality,
  BushingLoadSpectrum,
  BushingLubricationMode,
  BushingWarningCode,
  BushingWarning,
  BushingProcessRouteId,
  BushingStandardsBasis,
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

export type BushingMeasuredDimension = {
  actual?: number;
  tolPlus?: number;
  tolMinus?: number;
  roundness?: number;
  ra?: number;
};

export type BushingMeasuredPart = {
  enabled?: boolean;
  basis?: 'nominal' | 'measured';
  bore?: BushingMeasuredDimension;
  id?: BushingMeasuredDimension;
  edgeDist?: number;
  housingWidth?: number;
  notes?: string;
};

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
  csDepthTolPlus?: number;
  csDepthTolMinus?: number;
  csAngle: number;
  extCsMode: CSMode;
  extCsDia: number;
  extCsDepth: number;
  extCsDepthTolPlus?: number;
  extCsDepthTolMinus?: number;
  extCsAngle: number;
  flangeDia?: number;
  flangeOd?: number;
  flangeThk?: number;
  matHousing: string;
  matBushing: string;
  friction: number;
  dT: number;
  assemblyHousingTemperature?: number;
  assemblyBushingTemperature?: number;
  processRouteId?: BushingProcessRouteId;
  standardsBasis?: BushingStandardsBasis;
  standardsRevision?: string;
  processSpec?: string;
  approvalNotes?: string;
  criticality?: BushingCriticality;
  minWallStraight: number;
  minWallNeck: number;
  endConstraint?: 'free' | 'one_end' | 'both_ends';
  load?: number;
  edgeLoadAngleDeg?: number;
  serviceTemperatureHot?: number;
  serviceTemperatureCold?: number;
  finishReamAllowance?: number;
  wearAllowance?: number;
  loadSpectrum?: BushingLoadSpectrum;
  oscillationAngleDeg?: number;
  oscillationFreqHz?: number;
  dutyCyclePct?: number;
  lubricationMode?: BushingLubricationMode;
  contaminationLevel?: BushingContaminationLevel;
  surfaceRoughnessRaUm?: number;
  shaftHardnessHrc?: number;
  misalignmentDeg?: number;
  idCS?: CountersinkInput;
  odCS?: CountersinkInput;
  measuredPart?: BushingMeasuredPart;
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
  cs_depth_tol_plus?: number;
  cs_depth_tol_minus?: number;
  cs_angle?: number;
  ext_cs_mode?: CSMode;
  ext_cs_dia?: number;
  ext_cs_depth?: number;
  ext_cs_depth_tol_plus?: number;
  ext_cs_depth_tol_minus?: number;
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
  process_route_id?: BushingProcessRouteId;
  standards_basis?: BushingStandardsBasis;
  standards_revision?: string;
  process_spec?: string;
  approval_notes?: string;
  criticality?: BushingCriticality;
  end_constraint?: 'free' | 'one_end' | 'both_ends';
  service_temperature_hot?: number;
  service_temperature_cold?: number;
  finish_ream_allowance?: number;
  wear_allowance?: number;
  load_spectrum?: BushingLoadSpectrum;
  oscillation_angle_deg?: number;
  oscillation_freq_hz?: number;
  duty_cycle_pct?: number;
  lubrication_mode?: BushingLubricationMode;
  contamination_level?: BushingContaminationLevel;
  surface_roughness_ra_um?: number;
  shaft_hardness_hrc?: number;
  misalignment_deg?: number;
  thetaDeg?: number;
  edgeLoadAngleDeg?: number;
  edge_load_angle_deg?: number;
  failure_plane_angle_deg?: number;
  assemblyHousingTemperature?: number;
  assemblyBushingTemperature?: number;
  assembly_housing_temperature?: number;
  assembly_bushing_temperature?: number;
  t1?: number;
  t2?: number;
  measuredPart?: Partial<BushingMeasuredPart>;
  measured_part?: Partial<BushingMeasuredPart> & {
    edge_dist?: number;
    housing_width?: number;
  };
};
