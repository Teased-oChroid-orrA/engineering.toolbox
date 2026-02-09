export type UnitSystem = 'imperial' | 'metric';

export type CountersinkDefType = 'Dia+Angle' | 'Dia+Depth' | 'Depth+Angle';

export type CountersinkInput = {
  enabled: boolean;
  defType: CountersinkDefType;
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
  // Basic geometry
  t1: number;
  t2: number;
  housingLen: number; // contact length
  boreDia: number;
  bushOD: number; // nominal
  bushID: number;
  edgeDist: number;

  // Fit / load
  interference: number;
  dT: number;
  friction: number;
  load: number;
  thetaDeg: number;

  // Types
  idType: 'Straight' | 'Countersink';
  bushingType: 'Straight' | 'Flanged' | 'CountersinkBushing';
  // Flange geometry (used for drafting; solver currently ignores these)
  flangeDia?: number;
  flangeThk?: number;


  // Countersinks
  idCS: CountersinkInput;
  odCS: CountersinkInput;

  // Min thickness constraints
  minWallStraight: number;
  minWallNeck: number;

  // Materials
  housingMat: string;
  bushingMat: string;
};

export type BushingCandidate = {
  name: string;
  /** Margin of safety (MS) for this check: + is pass, - is fail. */
  margin: number;
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
  /** Candidate checks with margins for traceability. */
  candidates: BushingCandidate[];
  warnings: string[];
  debug: Record<string, unknown>;
};
