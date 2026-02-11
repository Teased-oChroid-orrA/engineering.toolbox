import { MM_TO_IN, type UnitSystem } from '$lib/core/units';
import { evaluateEdgeDistance } from '$lib/core/edge-distance/solve';
import { getMaterial } from '$lib/core/bushing/materials';
import { calculateUniversalBearing, type BearingSegment } from '$lib/core/shared/bearing';
import type { HighlightMode, InteractionPair, ShearInputs, ShearMemberOutput, ShearOutput, AnalysisWarning } from './types';

const KSI_TO_PSI = 1000;
const LBF_TO_N = 4.4482216152605;

const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function toImperialLen(v: number, units: UnitSystem) {
  return units === 'metric' ? v * MM_TO_IN : v;
}
function toImperialForce(v: number, units: UnitSystem) {
  return units === 'metric' ? v / LBF_TO_N : v;
}

// Interaction Curve: 1 / ( (1/P1)^m + (1/P2)^m )^(1/m)
function solveInteraction(P1: number, P2: number, m: number) {
  if (!isNum(P1) || !isNum(P2) || P1 <= 0 || P2 <= 0) return 0;
  return 1 / Math.pow(Math.pow(1 / P1, m) + Math.pow(1 / P2, m), 1 / m);
}

function buildBearingProfileStraight(d: number, t: number): BearingSegment[] {
  return [{ d_top: d, d_bottom: d, height: Math.max(0, t), role: 'parent' }];
}

function buildBearingProfileCountersunk(d: number, t: number): BearingSegment[] {
  const csDepth = 0.5 * d;
  const h_cs = Math.min(Math.max(0, csDepth), Math.max(0, t));
  const h_str = Math.max(0, t - h_cs);
  const Dcs = d * 1.5;
  const segs: BearingSegment[] = [];
  if (h_cs > 0) segs.push({ d_top: Dcs, d_bottom: d, height: h_cs, role: 'parent' });
  if (h_str > 0) segs.push({ d_top: d, d_bottom: d, height: h_str, role: 'parent' });
  return segs.length ? segs : buildBearingProfileStraight(d, t);
}

function memberIsCountersunk(idx: number, n: number, isCountersunk: boolean) {
  if (!isCountersunk) return false;
  return idx === 0 || idx === n - 1;
}

function resolveInteractionExponent(inputs: ShearInputs): number {
  const mFromToughness = (t: number) => {
    if (t <= 0.25 + 1e-9) return 1.0;
    if (t <= 0.5 + 1e-9) return 1.5;
    return 2.0;
  };
  return clamp(
    isNum(inputs.interactionExponent) ? Number(inputs.interactionExponent) : mFromToughness(Number(inputs.toughness ?? 0.75)),
    1.0,
    4.0
  );
}

function buildMemberResults(args: {
  memberThicknesses: number[];
  isCountersunk: boolean;
  d: number;
  e: number;
  w: number;
  safetyFactor: number;
  Fbru: number;
  Fsu: number;
  Ftu: number;
  csAngleDeg: number;
  mInteraction: number;
  sinTh: number;
  cosTh: number;
}): { members: ShearMemberOutput[]; memberCapacities: { id: number; bearing: number; tearOut: number; }[] } {
  const { memberThicknesses, isCountersunk, d, e, w, safetyFactor, Fbru, Fsu, Ftu, csAngleDeg, mInteraction, sinTh, cosTh } = args;
  const nMembers = memberThicknesses.length;
  const members: ShearMemberOutput[] = [];
  const memberCapacities: { id: number; bearing: number; tearOut: number; }[] = [];
  for (let i = 0; i < nMembers; i++) {
    const t = memberThicknesses[i];
    const cs = memberIsCountersunk(i, nMembers, isCountersunk);
    const profile = cs ? buildBearingProfileCountersunk(d, t) : buildBearingProfileStraight(d, t);
    const ub = calculateUniversalBearing(profile);
    const fbru_eff = cs ? (Fbru * Math.sin((csAngleDeg * Math.PI) / 360)) : Fbru;
    const load_br_raw = d * ub.t_eff_bearing * fbru_eff;
    const load_so_raw = 2 * e * ub.t_eff_sequence * Fsu * sinTh;
    const netWidth = Math.max(1e-9, w - d);
    const load_nt_raw = netWidth * t * Ftu * cosTh;
    const int_bn_raw = solveInteraction(load_nt_raw, load_br_raw, mInteraction);
    const int_bs_raw = solveInteraction(load_so_raw, load_br_raw, mInteraction);
    const int_pair: InteractionPair = (isNum(int_bn_raw) && isNum(int_bs_raw) && int_bs_raw < int_bn_raw) ? 'Br+So' : 'Br+Nt';
    const int_raw = int_pair === 'Br+So' ? int_bs_raw : int_bn_raw;
    members.push({
      index: i + 1,
      thickness: t,
      isCountersunk: cs,
      t_eff_bearing: ub.t_eff_bearing,
      t_eff_sequence: ub.t_eff_sequence,
      loads: { bearing: load_br_raw / safetyFactor, shearOut: load_so_raw / safetyFactor, netSection: load_nt_raw / safetyFactor, interaction_BrNt: int_bn_raw / safetyFactor, interaction_BrSo: int_bs_raw / safetyFactor, interaction: int_raw / safetyFactor, interactionPair: int_pair },
      edgeDistance: { actual_e_over_d: NaN, min_e_over_d_sequence: NaN, min_e_over_d_strength: NaN, governing: 'unknown' },
      warnings: []
    });
    memberCapacities.push({ id: i + 1, bearing: load_br_raw / safetyFactor, tearOut: load_so_raw / safetyFactor });
  }
  return { members, memberCapacities };
}

function applyEdgeDistanceWarnings(args: {
  members: ShearMemberOutput[];
  d: number;
  e: number;
  Fbru: number;
  Fsu: number;
  thetaDeg: number;
  candidateFailure: number;
  safetyFactor: number;
}): boolean {
  const { members, d, e, Fbru, Fsu, thetaDeg, candidateFailure, safetyFactor } = args;
  let sequencingSuppressedShearOut = false;
  if (thetaDeg <= 5) return false;
  for (const m of members) {
    const ed = evaluateEdgeDistance({ d, t: m.t_eff_sequence, e, P: candidateFailure * safetyFactor, thetaDeg, Fbru, Fsu });
    m.edgeDistance = { actual_e_over_d: ed.edgeDistance.actual_e_over_d, min_e_over_d_sequence: ed.edgeDistance.min_e_over_d_sequence, min_e_over_d_strength: ed.edgeDistance.min_e_over_d_strength, governing: ed.edgeDistance.governing };
    const cap_bearing = m.loads.bearing * safetyFactor;
    const cap_tearout = m.loads.shearOut * safetyFactor;
    if (isNum(ed.edgeDistance.actual_e_over_d) && isNum(ed.edgeDistance.min_e_over_d_sequence) && ed.edgeDistance.actual_e_over_d < ed.edgeDistance.min_e_over_d_sequence) {
      m.warnings.push({ message: `Member ${m.index}: Sequencing Not Met`, type: 'warning', subItems: [`e/D Check: ${ed.edgeDistance.actual_e_over_d.toFixed(2)} < ${ed.edgeDistance.min_e_over_d_sequence.toFixed(2)} (Req)`, `Tear-out: ${cap_tearout.toFixed(0)} lbs`, `Bearing: ${cap_bearing.toFixed(0)} lbs`, 'Mode: Brittle edge failure.'] });
      sequencingSuppressedShearOut = true;
    }
    if (isNum(ed.edgeDistance.actual_e_over_d) && isNum(ed.edgeDistance.min_e_over_d_strength) && ed.edgeDistance.actual_e_over_d < ed.edgeDistance.min_e_over_d_strength) {
      m.warnings.push({ message: `Member ${m.index}: Strength Check Failed`, type: 'danger', subItems: [`e/D Check: ${ed.edgeDistance.actual_e_over_d.toFixed(2)} < ${ed.edgeDistance.min_e_over_d_strength.toFixed(2)} (Req)`, `Cap (Tear-out): ${cap_tearout.toFixed(0)} lbs`, `Load (Ult): ${(candidateFailure * safetyFactor).toFixed(0)} lbs`, 'Result: Rupture predicted.'] });
    }
  }
  return sequencingSuppressedShearOut;
}

function finalizeShearResult(args: {
  inputs: ShearInputs;
  members: ShearMemberOutput[];
  memberCapacities: { id: number; bearing: number; tearOut: number; }[];
  warnings: AnalysisWarning[];
  errors: string[];
  P_applied: number;
  d: number;
  load_pin_allowable: number;
  minBearing: ReturnType<typeof pickMinBy<ShearMemberOutput>>;
  minShearOut: ReturnType<typeof pickMinBy<ShearMemberOutput>>;
  minNet: ReturnType<typeof pickMinBy<ShearMemberOutput>>;
  minInteraction: ReturnType<typeof pickMinBy<ShearMemberOutput>>;
  m_interaction: number;
  sequencingSuppressedShearOut: boolean;
}): ShearOutput {
  const { inputs, members, memberCapacities, warnings, errors, P_applied, d, load_pin_allowable, minBearing, minShearOut, minNet, minInteraction, m_interaction, sequencingSuppressedShearOut } = args;
  const interactionPair = minInteraction.best?.loads.interactionPair ?? 'Br+Nt';
  const governingCandidates: { mode: HighlightMode; report: string; load: number }[] = [
    { mode: 'pinShear', report: 'Pin shear', load: load_pin_allowable },
    { mode: 'interaction', report: `Interaction (${interactionPair})`, load: minInteraction.bestV },
    { mode: 'netSection', report: 'Net-section', load: minNet.bestV },
    { mode: 'bearing', report: 'Bearing', load: minBearing.bestV }
  ];
  if (!sequencingSuppressedShearOut) governingCandidates.push({ mode: 'shearOut', report: 'Edge shear-out', load: minShearOut.bestV });
  const governing = pickMinBy(governingCandidates, (c) => c.load).best ?? governingCandidates[0];
  const margin = (isNum(P_applied) && P_applied > 0 && isNum(governing.load)) ? (governing.load / P_applied) - 1 : -1.0;
  for (const m of members) for (const w of m.warnings) warnings.push(w);
  if (!isNum(d) || d <= 0) errors.push('Invalid diameter.');
  return {
    inputs,
    members,
    memberCapacities,
    loads: { pinShear: load_pin_allowable, bearing: minBearing.bestV, shearOut: minShearOut.bestV, netSection: minNet.bestV, interaction: minInteraction.bestV, interactionPair, interactionExponent: m_interaction },
    sequencingSuppressedShearOut,
    governing: { reportMode: governing.report, highlightMode: governing.mode, failureLoad: governing.load, margin },
    warnings,
    errors
  };
}

function pushSequencingInfoWarning(warnings: AnalysisWarning[]) {
  warnings.push({
    message: 'Sequencing Suppression Active',
    type: 'info',
    subItems: ['Shear-out ignored in governing mode.', 'Design forced to Bearing/Interaction to ensure safety.']
  });
}

// Robust minimum picker
function pickMinBy<T>(items: T[], get: (t: T) => number) {
  let best: T | null = null;
  let bestV = Infinity;
  for (const it of items) {
    const v = get(it);
    const val = (typeof v === 'number' && Number.isFinite(v)) ? v : Infinity;
    if (val < bestV) {
      best = it;
      bestV = val;
    }
  }
  return { best, bestV };
}

export function computeShear(inputs: ShearInputs): ShearOutput {
  const warnings: AnalysisWarning[] = [];
  const errors: string[] = [];

  const units = inputs.units ?? 'imperial';
  const planes = inputs.planes ?? 1;

  const d = toImperialLen(Number(inputs.dia), units);
  const t1 = toImperialLen(Number(inputs.t1), units);
  const t2 = toImperialLen(Number(inputs.t2), units);
  const t3 = toImperialLen(Number(inputs.t3), units);
  const w = toImperialLen(Number(inputs.width), units);
  const e = toImperialLen(Number(inputs.edgeDist), units);
  const P_applied = toImperialForce(Number(inputs.load), units);

  let thetaDeg = Number(inputs.thetaDeg ?? 40);
  if (thetaDeg === 0) thetaDeg = 40; 

  const safetyFactor = Math.max(1e-6, Number(inputs.safetyFactor ?? 1));
  
  const m_interaction = resolveInteractionExponent(inputs);

  const plate = getMaterial(inputs.plateMat);
  const Fbru = plate.Fbru_ksi * KSI_TO_PSI;
  const Fsu = plate.Fsu_ksi * KSI_TO_PSI;
  const Ftu = (plate.Ftu_ksi ?? Math.max(plate.Sy_ksi, plate.Fsu_ksi) * 1.5) * KSI_TO_PSI;

  const fastenerFsu_psi = (Number(inputs.fastenerFsu_ksi ?? plate.Fsu_ksi) || plate.Fsu_ksi) * KSI_TO_PSI;

  const th = (thetaDeg * Math.PI) / 180;
  const sinTh = Math.max(1e-6, Math.sin(clamp(th, 1e-6, Math.PI - 1e-6)));
  const cosTh = Math.abs(Math.cos(th));

  const memberThicknesses = planes === 2 ? [t1, t2, t3] : [t1, t2];
  const nMembers = memberThicknesses.length;

  const area = Math.PI * d * d / 4;
  
  // --- CORRECTED PIN SHEAR ---
  // Capacity = (Number of Planes) * Area * Fsu
  const load_pin_ultimate = planes * area * fastenerFsu_psi; 
  const load_pin_allowable = load_pin_ultimate / safetyFactor;

  const { members, memberCapacities } = buildMemberResults({
    memberThicknesses,
    isCountersunk: !!inputs.isCountersunk,
    d,
    e,
    w,
    safetyFactor,
    Fbru,
    Fsu,
    Ftu,
    csAngleDeg: Number(inputs.csAngleDeg ?? 100),
    mInteraction: m_interaction,
    sinTh,
    cosTh
  });

  const minBearing = pickMinBy(members, (m) => m.loads.bearing);
  const minShearOut = pickMinBy(members, (m) => m.loads.shearOut);
  const minNet = pickMinBy(members, (m) => m.loads.netSection);
  const minInteraction = pickMinBy(members, (m) => m.loads.interaction);

  const candidateFailure = Math.min(load_pin_allowable, minInteraction.bestV);

  const sequencingSuppressedShearOut = applyEdgeDistanceWarnings({
    members,
    d,
    e,
    Fbru,
    Fsu,
    thetaDeg,
    candidateFailure,
    safetyFactor
  });

  if (sequencingSuppressedShearOut) pushSequencingInfoWarning(warnings);

  return finalizeShearResult({
    inputs,
    members,
    memberCapacities,
    warnings,
    errors,
    P_applied,
    d,
    load_pin_allowable,
    minBearing,
    minShearOut,
    minNet,
    minInteraction,
    m_interaction,
    sequencingSuppressedShearOut
  });
}
