import type { UnitSystem } from '$lib/core/units';

export type ShearMaterial = {
  id: string;
  name: string;
  Fsu_imp: number;
  Fsu_met: number;
  Ftu_imp: number;
  Ftu_met: number;
  Fbru_imp: number;
  Fbru_met: number;
};

export type BearingSegment = {
  d_top: number;
  d_bottom: number;
  height: number;
  eta?: number;
  role?: string;
};

export type UniversalBearingResult = {
  segments: Array<BearingSegment & { eta: number; rawArea: number; effectiveArea: number; geometry: 'CYLINDER' | 'FRUSTUM' }>;
  totalEffArea: number;
  totalHeight: number;
  refD: number;
  t_eff: number;
  t_eff_bearing: number;
  t_eff_sequence: number;
  isKnifeEdge: boolean;
};

export type ShearInputs = {
  units: UnitSystem;
  planes: 1 | 2;
  dia: number;
  t1: number;
  t2: number;
  t3: number;
  width: number;
  edgeDist: number;
  load: number;
  thetaDeg: number;
  plateMat: string;
  fastenerFsu_ksi: number;
  /**
   * Legacy UI control (0.25/0.5/0.75). Historically treated as a "toughness"
   * slider, but it really selects the bearing-vs-(net/shear-out) interaction
   * exponent.
   *
   * Default mapping:
   * - 0.25 -> m = 1.0 (linear / brittle)
   * - 0.5  -> m = 1.5 (intermediate)
   * - 0.75 -> m = 2.0 (elliptical / ductile)
   */
  toughness: 0.25 | 0.5 | 0.75;

  /**
   * Preferred explicit interaction exponent (m). If provided, overrides
   * the legacy toughness mapping.
   */
  interactionExponent?: number;
  safetyFactor: number;
  isCountersunk: boolean;
  csAngleDeg: number;
};

export type InteractionPair = 'Br+Nt' | 'Br+So';
export type HighlightMode = 'pinShear' | 'bearing' | 'shearOut' | 'netSection' | 'interaction';

export type AnalysisWarning = {
  message: string;
  subItems?: string[];
  type: 'danger' | 'warning' | 'info'; // Added severity
};

export type ShearMemberOutput = {
  index: number;
  thickness: number;
  isCountersunk: boolean;
  t_eff_bearing: number;
  t_eff_sequence: number;
  loads: {
    bearing: number;
    shearOut: number;
    netSection: number;
    interaction_BrNt: number;
    interaction_BrSo: number;
    interaction: number;
    interactionPair: InteractionPair;
  };
  edgeDistance: {
    actual_e_over_d: number;
    min_e_over_d_sequence: number;
    min_e_over_d_strength: number;
    governing: string;
  };
  warnings: AnalysisWarning[];
};

export type ShearOutput = {
  inputs: ShearInputs;
  members: ShearMemberOutput[];
  loads: {
    pinShear: number;
    bearing: number;
    shearOut: number;
    netSection: number;
    interaction: number;
    interactionPair: InteractionPair;
    /** Interaction exponent (m) actually used in solveInteraction(). */
    interactionExponent: number;
  };
  memberCapacities: { // New detailed breakdown
    id: number;
    bearing: number;
    tearOut: number;
  }[];
  sequencingSuppressedShearOut: boolean;
  governing: {
    reportMode: string;
    highlightMode: HighlightMode;
    failureLoad: number;
    margin: number;
  };
  warnings: AnalysisWarning[];
  errors: string[];
};
