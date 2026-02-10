import type { UnitSystem } from '../units';

export type CSMode = 'depth_angle' | 'dia_angle' | 'dia_depth';

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
  // Imperial inputs are in ksi (E, Sy, Fbru/Fsu) and microstrain/°F (alpha)
  E_ksi: number;
  Sy_ksi: number;
  Fbru_ksi: number;
  Fsu_ksi: number;
  Ftu_ksi?: number;
  nu: number;
  alpha_uF: number;
};

export type BushingInputs = {
  units: UnitSystem;
  boreDia: number;
  idBushing: number;
  interference: number;
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
  load?: number;
  thetaDeg?: number;
  idCS?: CountersinkInput;
  odCS?: CountersinkInput;
};

export type BushingCandidate = {
  name: string;
  /** Margin of safety (MS) for this check: + is pass, - is fail. */
  margin: number;
};

export type BushingWarningCode =
  | 'INPUT_INVALID'
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

export type BushingOutput = {
  sleeveWall: number;
  neckWall: number | null;
  odInstalled: number;

  csSolved: {
    id?: { dia: number; depth: number; angleDeg: number };
    od?: { dia: number; depth: number; angleDeg: number };
  };

  pressure: number;
  lame: {
    model: string;
    unitsBase: { length: 'in'; stress: 'psi'; force: 'lbf' };
    deltaTotal: number;
    deltaThermal: number;
    deltaUser: number;
    boreDia: number;
    idBushing: number;
    effectiveODHousing: number;
    D_equivalent: number;
    psi: number;
    lambda: number;
    w_eff: number;
    e_eff: number;
    termB: number;
    termH: number;
    pressurePsi: number;
    pressureKsi: number;
  };
  hoop: {
    housingSigma: number;
    housingMS: number;
    bushingSigma: number;
    bushingMS: number;
    ligamentSigma: number;
    ligamentMS: number;
    edRequiredLigament: number | null;
  };

  edgeDistance: {
    edMinSequence: number;
    edMinStrength: number;
    edActual: number;
    governing: 'sequencing' | 'strength' | 'unknown';
  };

  governing: { name: string; margin: number };
  physics: {
    deltaEffective: number;
    contactPressure: number;
    installForce: number;
    stressHoopHousing: number;
    stressHoopBushing: number;
    marginHousing: number;
    marginBushing: number;
    edMinCoupled: number;
  };
  geometry: {
    odBushing: number;
    wallStraight: number;
    wallNeck: number;
    csInternal: { dia: number; depth: number; angleDeg: number };
    csExternal: { dia: number; depth: number; angleDeg: number };
    isSaturationActive: boolean;
  };
  candidates: BushingCandidate[];
  warningCodes: BushingWarning[];
  warnings: string[];
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
  mat_housing?: string;
  mat_bushing?: string;
  min_wall_straight?: number;
  min_wall_neck?: number;
  t1?: number;
  t2?: number;
};
