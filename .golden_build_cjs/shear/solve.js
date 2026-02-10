"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeShear = computeShear;
const units_1 = require("$lib/core/units");
const solve_1 = require("$lib/core/edge-distance/solve");
const materials_1 = require("$lib/core/bushing/materials");
const bearing_1 = require("$lib/core/shared/bearing");
const KSI_TO_PSI = 1000;
const LBF_TO_N = 4.4482216152605;
const isNum = (n) => typeof n === 'number' && Number.isFinite(n);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function toImperialLen(v, units) {
    return units === 'metric' ? v * units_1.MM_TO_IN : v;
}
function toImperialForce(v, units) {
    return units === 'metric' ? v / LBF_TO_N : v;
}
// Interaction Curve: 1 / ( (1/P1)^m + (1/P2)^m )^(1/m)
function solveInteraction(P1, P2, m) {
    if (!isNum(P1) || !isNum(P2) || P1 <= 0 || P2 <= 0)
        return 0;
    return 1 / Math.pow(Math.pow(1 / P1, m) + Math.pow(1 / P2, m), 1 / m);
}
function buildBearingProfileStraight(d, t) {
    return [{ d_top: d, d_bottom: d, height: Math.max(0, t), role: 'parent' }];
}
function buildBearingProfileCountersunk(d, t) {
    const csDepth = 0.5 * d;
    const h_cs = Math.min(Math.max(0, csDepth), Math.max(0, t));
    const h_str = Math.max(0, t - h_cs);
    const Dcs = d * 1.5;
    const segs = [];
    if (h_cs > 0)
        segs.push({ d_top: Dcs, d_bottom: d, height: h_cs, role: 'parent' });
    if (h_str > 0)
        segs.push({ d_top: d, d_bottom: d, height: h_str, role: 'parent' });
    return segs.length ? segs : buildBearingProfileStraight(d, t);
}
function memberIsCountersunk(idx, n, isCountersunk) {
    if (!isCountersunk)
        return false;
    return idx === 0 || idx === n - 1;
}
// Robust minimum picker
function pickMinBy(items, get) {
    let best = null;
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
function computeShear(inputs) {
    const warnings = [];
    const errors = [];
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
    if (thetaDeg === 0)
        thetaDeg = 40;
    const safetyFactor = Math.max(1e-6, Number(inputs.safetyFactor ?? 1));
    // Interaction exponent (m) for bearing-vs-(net/shear-out) interaction.
    // Default mapping from legacy "toughness" slider:
    //   0.25 -> 1.0 (linear / brittle)
    //   0.5  -> 1.5 (intermediate)
    //   0.75 -> 2.0 (elliptical / ductile)
    // A new explicit override is supported via inputs.interactionExponent.
    const m_from_toughness = (t) => {
        if (t <= 0.25 + 1e-9)
            return 1.0;
        if (t <= 0.5 + 1e-9)
            return 1.5;
        return 2.0;
    };
    const m_interaction = clamp(isNum(inputs.interactionExponent) ? Number(inputs.interactionExponent) : m_from_toughness(Number(inputs.toughness ?? 0.75)), 1.0, 4.0);
    const plate = (0, materials_1.getMaterial)(inputs.plateMat);
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
    const members = [];
    const memberCapacities = [];
    for (let i = 0; i < nMembers; i++) {
        const t = memberThicknesses[i];
        const cs = memberIsCountersunk(i, nMembers, !!inputs.isCountersunk);
        const profile = cs ? buildBearingProfileCountersunk(d, t) : buildBearingProfileStraight(d, t);
        const ub = (0, bearing_1.calculateUniversalBearing)(profile);
        const csAng = (Number(inputs.csAngleDeg ?? 100) * Math.PI) / 180;
        const fbru_eff = cs ? (Fbru * Math.sin(csAng / 2)) : Fbru;
        const load_br_raw = d * ub.t_eff_bearing * fbru_eff;
        const load_so_raw = 2 * e * ub.t_eff_sequence * Fsu * sinTh;
        const netWidth = Math.max(1e-9, w - d);
        const load_nt_raw = netWidth * t * Ftu * cosTh;
        const int_bn_raw = solveInteraction(load_nt_raw, load_br_raw, m_interaction);
        const int_bs_raw = solveInteraction(load_so_raw, load_br_raw, m_interaction);
        const int_pair = (isNum(int_bn_raw) && isNum(int_bs_raw) && int_bs_raw < int_bn_raw) ? 'Br+So' : 'Br+Nt';
        const int_raw = int_pair === 'Br+So' ? int_bs_raw : int_bn_raw;
        members.push({
            index: i + 1,
            thickness: t,
            isCountersunk: cs,
            t_eff_bearing: ub.t_eff_bearing,
            t_eff_sequence: ub.t_eff_sequence,
            loads: {
                bearing: load_br_raw / safetyFactor,
                shearOut: load_so_raw / safetyFactor,
                netSection: load_nt_raw / safetyFactor,
                interaction_BrNt: int_bn_raw / safetyFactor,
                interaction_BrSo: int_bs_raw / safetyFactor,
                interaction: int_raw / safetyFactor,
                interactionPair: int_pair
            },
            edgeDistance: {
                actual_e_over_d: NaN,
                min_e_over_d_sequence: NaN,
                min_e_over_d_strength: NaN,
                governing: 'unknown'
            },
            warnings: []
        });
        memberCapacities.push({
            id: i + 1,
            bearing: load_br_raw / safetyFactor,
            tearOut: load_so_raw / safetyFactor
        });
    }
    const minBearing = pickMinBy(members, (m) => m.loads.bearing);
    const minShearOut = pickMinBy(members, (m) => m.loads.shearOut);
    const minNet = pickMinBy(members, (m) => m.loads.netSection);
    const minInteraction = pickMinBy(members, (m) => m.loads.interaction);
    const candidateFailure = Math.min(load_pin_allowable, minInteraction.bestV);
    let sequencingSuppressedShearOut = false;
    if (thetaDeg > 5) {
        for (const m of members) {
            const ed = (0, solve_1.evaluateEdgeDistance)({
                d,
                t: m.t_eff_sequence,
                e,
                P: candidateFailure * safetyFactor,
                thetaDeg,
                Fbru: Fbru,
                Fsu: Fsu
            });
            m.edgeDistance = {
                actual_e_over_d: ed.edgeDistance.actual_e_over_d,
                min_e_over_d_sequence: ed.edgeDistance.min_e_over_d_sequence,
                min_e_over_d_strength: ed.edgeDistance.min_e_over_d_strength,
                governing: ed.edgeDistance.governing
            };
            const edActual = ed.edgeDistance.actual_e_over_d;
            const edSeq = ed.edgeDistance.min_e_over_d_sequence;
            const edStr = ed.edgeDistance.min_e_over_d_strength;
            const cap_bearing = m.loads.bearing * safetyFactor;
            const cap_tearout = m.loads.shearOut * safetyFactor;
            if (isNum(edActual) && isNum(edSeq) && edActual < edSeq) {
                m.warnings.push({
                    message: `Member ${m.index}: Sequencing Not Met`,
                    type: 'warning',
                    subItems: [
                        `e/D Check: ${edActual.toFixed(2)} < ${edSeq.toFixed(2)} (Req)`,
                        `Tear-out: ${cap_tearout.toFixed(0)} lbs`,
                        `Bearing: ${cap_bearing.toFixed(0)} lbs`,
                        `Mode: Brittle edge failure.`
                    ]
                });
                sequencingSuppressedShearOut = true;
            }
            if (isNum(edActual) && isNum(edStr) && edActual < edStr) {
                m.warnings.push({
                    message: `Member ${m.index}: Strength Check Failed`,
                    type: 'danger',
                    subItems: [
                        `e/D Check: ${edActual.toFixed(2)} < ${edStr.toFixed(2)} (Req)`,
                        `Cap (Tear-out): ${cap_tearout.toFixed(0)} lbs`,
                        `Load (Ult): ${(candidateFailure * safetyFactor).toFixed(0)} lbs`,
                        `Result: Rupture predicted.`
                    ]
                });
            }
        }
    }
    if (sequencingSuppressedShearOut) {
        warnings.push({
            message: 'Sequencing Suppression Active',
            type: 'info',
            subItems: ['Shear-out ignored in governing mode.', 'Design forced to Bearing/Interaction to ensure safety.']
        });
    }
    const { best: minIntMember } = minInteraction;
    const interactionPair = minIntMember?.loads.interactionPair ?? 'Br+Nt';
    let load_bearing = minBearing.bestV;
    let load_shearOut = minShearOut.bestV;
    let load_net = minNet.bestV;
    let load_interaction = minInteraction.bestV;
    const governingCandidates = [
        { mode: 'pinShear', report: 'Pin shear', load: load_pin_allowable },
        { mode: 'interaction', report: `Interaction (${interactionPair})`, load: load_interaction },
        { mode: 'netSection', report: 'Net-section', load: load_net },
        { mode: 'bearing', report: 'Bearing', load: load_bearing }
    ];
    if (!sequencingSuppressedShearOut) {
        governingCandidates.push({ mode: 'shearOut', report: 'Edge shear-out', load: load_shearOut });
    }
    const gov = pickMinBy(governingCandidates, (c) => c.load);
    const governing = gov.best ?? governingCandidates[0];
    const margin = (isNum(P_applied) && P_applied > 0 && isNum(governing.load))
        ? (governing.load / P_applied) - 1
        : -1.0;
    for (const m of members) {
        for (const w of m.warnings)
            warnings.push(w);
    }
    if (!isNum(d) || d <= 0)
        errors.push('Invalid diameter.');
    return {
        inputs,
        members,
        memberCapacities,
        loads: {
            pinShear: load_pin_allowable,
            bearing: load_bearing,
            shearOut: load_shearOut,
            netSection: load_net,
            interaction: load_interaction,
            interactionPair,
            interactionExponent: m_interaction
        },
        sequencingSuppressedShearOut,
        governing: {
            reportMode: governing.report,
            highlightMode: governing.mode,
            failureLoad: governing.load,
            margin
        },
        warnings,
        errors
    };
}
