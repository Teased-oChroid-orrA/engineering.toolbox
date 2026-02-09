import type { EdgeDistanceInputs, EdgeDistanceOutput } from './types';

const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function solveEdgeDistance({ d, t, P, thetaDeg, Fbru, Fsu, shearPlaneModel, shearPlaneDeg }: EdgeDistanceInputs) {
  // Baseline model matches the existing web tool baseline:
  // Bearing capacity: Pb = d * t * Fbru
  // Shear-out (projected) strength: Ps = 2 * e * t * Fsu * sin(theta)
  // Required e from strength: e >= P / (2*t*Fsu*sin(theta))
  // Sequencing threshold: e_seq >= (d*Fbru) / (2*Fsu*sin(theta))
  //
  // Advanced option (explicit fracture plane):
  // Apply a shear-plane factor cos(phi) to reflect inclined tear-out fracture
  // surfaces (~35–45°) relative to the load direction. This reduces effective
  // shear strength and increases required e/D.
  const th = (isNum(thetaDeg) ? thetaDeg : 0) * Math.PI / 180;
  const s = Math.max(1e-6, Math.sin(clamp(th, 1e-6, Math.PI - 1e-6)));

  const phiDeg = (typeof shearPlaneDeg === 'number' && Number.isFinite(shearPlaneDeg)) ? shearPlaneDeg : 40;
  const phi = (phiDeg * Math.PI) / 180;
  const planeFactor = (shearPlaneModel === 'explicit')
    ? Math.max(1e-6, Math.abs(Math.cos(clamp(phi, 1e-6, (Math.PI / 2) - 1e-6))))
    : 1;

  const Pb = (isNum(d) && isNum(t) && isNum(Fbru)) ? d * t * Fbru : NaN;
  const e_req_strength = (isNum(P) && isNum(t) && isNum(Fsu)) ? (P / (2 * t * Fsu * s * planeFactor)) : NaN;
  const e_req_sequence = (isNum(d) && isNum(Fbru) && isNum(Fsu)) ? ((d * Fbru) / (2 * Fsu * s * planeFactor)) : NaN;

  const ed_strength = (isNum(e_req_strength) && isNum(d) && d > 0) ? (e_req_strength / d) : NaN;
  const ed_sequence = (isNum(e_req_sequence) && isNum(d) && d > 0) ? (e_req_sequence / d) : NaN;

  const governing: 'strength' | 'sequencing' | 'unknown' = (isNum(ed_strength) && isNum(ed_sequence))
    ? (ed_strength >= ed_sequence ? 'strength' : 'sequencing')
    : (isNum(ed_strength) ? 'strength' : (isNum(ed_sequence) ? 'sequencing' : 'unknown'));

  return {
    bearingUltimateEffective: Pb,
    ed_min_strength: ed_strength,
    ed_min_sequence: ed_sequence,
    e_required_strength: e_req_strength,
    e_required_sequence: e_req_sequence,
    thetaRad: th,
    sinTheta: s,
    planeFactor,
    governing
  };
}

export function evaluateEdgeDistance(params: Partial<EdgeDistanceInputs>): EdgeDistanceOutput {
  const d = Number(params.d);
  const t = Number(params.t);
  const e = Number(params.e);
  const P = isNum(params.P) ? Number(params.P) : NaN;
  const thetaDeg = isNum(params.thetaDeg) ? Number(params.thetaDeg) : 40;
  const Fbru = isNum(params.Fbru) ? Number(params.Fbru) : NaN;
  const Fsu = isNum(params.Fsu) ? Number(params.Fsu) : NaN;

  const shearPlaneModel = (params as any).shearPlaneModel as ('projected' | 'explicit' | undefined);
  const shearPlaneDeg = isNum((params as any).shearPlaneDeg) ? Number((params as any).shearPlaneDeg) : undefined;

  const calc = solveEdgeDistance({ d, t, e, P, thetaDeg, Fbru, Fsu, shearPlaneModel, shearPlaneDeg });
  const ed_actual = (isNum(e) && isNum(d) && d > 0) ? (e / d) : NaN;

  const out: EdgeDistanceOutput = {
    input: { d, t, e, P, thetaDeg, Fbru, Fsu, shearPlaneModel, shearPlaneDeg },
    edge_margin: ed_actual,
    ed_min_coupled: calc.ed_min_sequence,
    ed_min_strength: calc.ed_min_strength,
    e_required_sequence: calc.e_required_sequence,
    e_required_strength: calc.e_required_strength,
    governing: calc.governing,
    edgeDistance: {
      actual_e_over_d: ed_actual,
      min_e_over_d_sequence: calc.ed_min_sequence,
      min_e_over_d_strength: calc.ed_min_strength,
      governing: calc.governing
    },
    bearingAnalysis: {
      bearingUltimateEffective: calc.bearingUltimateEffective,
      thetaRad: calc.thetaRad,
      sinTheta: calc.sinTheta,
      planeFactor: calc.planeFactor
    }
  };

  if (!isNum(Fbru) || !isNum(Fsu)) {
    out.error = 'EdgeDistance: missing allowables (Fbru/Fsu).';
  }

  return out;
}
