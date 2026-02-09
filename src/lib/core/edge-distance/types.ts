export type EdgeDistanceInputs = {
  d: number;
  t: number;
  e: number;
  P: number;
  thetaDeg: number;
  Fbru: number;
  Fsu: number;
  /** Optional: shear-out fracture-plane model (advanced). */
  shearPlaneModel?: 'projected' | 'explicit';
  /** Optional: fracture plane angle from load direction, degrees (typ. 35–45). */
  shearPlaneDeg?: number;
};

export type EdgeDistanceOutput = {
  input: EdgeDistanceInputs;
  edge_margin: number;
  ed_min_coupled: number;
  ed_min_strength: number;
  e_required_sequence: number;
  e_required_strength: number;
  governing: 'strength' | 'sequencing' | 'unknown';
  edgeDistance: {
    actual_e_over_d: number;
    min_e_over_d_sequence: number;
    min_e_over_d_strength: number;
    governing: string;
  };
  bearingAnalysis: {
    bearingUltimateEffective: number;
    thetaRad: number;
    sinTheta: number;
    /** Shear-plane factor applied to shear-out (1 for projected model). */
    planeFactor: number;
  };
  error?: string;
};
