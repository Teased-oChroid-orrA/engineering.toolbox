"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.solveCountersink = solveCountersink;
exports.computeBushing = computeBushing;
const materials_1 = require("./materials");
const bearing_1 = require("../shared/bearing");
const normalize_1 = require("./normalize");
const schema_1 = require("./schema");
const getMat = (id) => materials_1.MATERIALS.find((m) => m.id === id) || materials_1.MATERIALS[0];
function solveCountersink(mode, dia, depth, angle, baseDia) {
    const safeBaseDia = Number.isFinite(baseDia) ? Math.max(baseDia, 0) : 0;
    const safeDia = Number.isFinite(dia) ? Math.max(dia, 0) : 0;
    const safeDepth = Number.isFinite(depth) ? Math.max(depth, 0) : 0;
    const safeAngle = Number.isFinite(angle) ? Math.min(Math.max(angle, 1e-3), 179.999) : 100;
    const r_rad = (safeAngle / 2) * (Math.PI / 180);
    const tan_r = Math.tan(r_rad);
    const res = { dia: safeDia, depth: safeDepth, angleDeg: safeAngle };
    if (mode === 'depth_angle')
        res.dia = Math.max(safeBaseDia + 2 * safeDepth * tan_r, safeBaseDia);
    else if (mode === 'dia_angle')
        res.depth = tan_r > 1e-9 ? Math.max((safeDia - safeBaseDia) / (2 * tan_r), 0) : 0;
    else if (mode === 'dia_depth') {
        const angle_rad = safeDepth > 1e-9 ? 2 * Math.atan(Math.max(safeDia - safeBaseDia, 0) / (2 * safeDepth)) : 0;
        res.angleDeg = Math.min(Math.max(angle_rad * (180 / Math.PI), 0), 179.999);
    }
    return res;
}
function toPsiFromKsi(v) {
    return v * 1000;
}
function computeState(input) {
    const matHousing = getMat(input.matHousing);
    const matBushing = getMat(input.matBushing);
    const dT = Number.isFinite(input.dT) ? input.dT : 0;
    const dT_F = input.units === 'metric' ? dT * 1.8 : dT;
    const deltaThermal = ((matBushing.alpha_uF ?? 0) - (matHousing.alpha_uF ?? 0)) * 1e-6 * input.boreDia * dT_F;
    const delta = input.interference + deltaThermal;
    const odInstalled = input.boreDia + delta;
    const csSolvedId = (input.idCS?.enabled ?? input.idType === 'countersink')
        ? solveCountersink(input.csMode, input.csDia, input.csDepth, input.csAngle, input.idBushing)
        : { dia: input.csDia, depth: input.csDepth, angleDeg: input.csAngle };
    const csSolvedOd = (input.odCS?.enabled ?? input.bushingType === 'countersink')
        ? solveCountersink(input.extCsMode, input.extCsDia, input.extCsDepth, input.extCsAngle, odInstalled)
        : { dia: input.extCsDia, depth: input.extCsDepth, angleDeg: input.extCsAngle };
    const internalCsInvalid = input.idType === 'countersink' && (!Number.isFinite(csSolvedId.dia) || !Number.isFinite(csSolvedId.depth) || !Number.isFinite(csSolvedId.angleDeg) || csSolvedId.dia < input.idBushing || csSolvedId.depth < 0 || csSolvedId.angleDeg <= 0 || csSolvedId.angleDeg >= 180);
    const externalCsInvalid = input.bushingType === 'countersink' && (!Number.isFinite(csSolvedOd.dia) || !Number.isFinite(csSolvedOd.depth) || !Number.isFinite(csSolvedOd.angleDeg) || csSolvedOd.dia < odInstalled || csSolvedOd.depth < 0 || csSolvedOd.angleDeg <= 0 || csSolvedOd.angleDeg >= 180);
    const wallStraight = Math.max((odInstalled - input.idBushing) / 2, 0);
    const A_rad = (csSolvedId.angleDeg / 2) * (Math.PI / 180);
    const outerBoundary = input.bushingType === 'flanged' ? (input.flangeOd ?? 0) : (input.bushingType === 'countersink' ? csSolvedOd.dia : odInstalled);
    const t_top = (outerBoundary - csSolvedId.dia) / (2 * Math.cos(A_rad));
    const d_corner = ((odInstalled - csSolvedId.dia) / 2) * Math.cos(A_rad) + (input.flangeThk ?? 0) * Math.sin(A_rad);
    const wallNeck = input.idType !== 'countersink' ? wallStraight : input.bushingType === 'countersink' ? Math.min((csSolvedOd.dia - csSolvedId.dia) / 2, wallStraight) : input.bushingType === 'flanged' ? Math.min(t_top, d_corner) : t_top;
    const failStraight = wallStraight < input.minWallStraight;
    const failNeck = wallNeck < input.minWallNeck;
    const Eh = toPsiFromKsi(matHousing.E_ksi || 0);
    const Eb = toPsiFromKsi(matBushing.E_ksi || 0);
    const R_sat = input.boreDia * 2;
    const w_eff = Math.min(input.housingWidth, R_sat * 2);
    const e_eff = Math.min(input.edgeDist, R_sat);
    const area_housing = Math.max(w_eff * (e_eff * 2.0) - (Math.PI * input.boreDia ** 2) / 4, 1e-6);
    const D_equivalent = Math.sqrt((4 * area_housing) / Math.PI + input.boreDia ** 2);
    const lambda = Math.min(e_eff / (D_equivalent / 2), 1.0);
    const psi = 1.0 + 0.2 * (1.0 - lambda);
    const effectiveODHousing = D_equivalent;
    const termB = (input.boreDia / Eb) * (((input.boreDia ** 2 + input.idBushing ** 2) / (input.boreDia ** 2 - input.idBushing ** 2)) - (matBushing.nu ?? 0.33));
    const termH = psi * (input.boreDia / Eh) * (((effectiveODHousing ** 2 + input.boreDia ** 2) / (effectiveODHousing ** 2 - input.boreDia ** 2)) + (matHousing.nu ?? 0.33));
    const pressure = delta > 0 ? delta / (termB + termH) : 0;
    const stressHoopHousing = pressure * ((effectiveODHousing ** 2 + input.boreDia ** 2) / (effectiveODHousing ** 2 - input.boreDia ** 2));
    const stressHoopBushing = -pressure * ((input.boreDia ** 2 + input.idBushing ** 2) / (input.boreDia ** 2 - input.idBushing ** 2));
    const installForce = (Number.isFinite(input.friction) ? input.friction : 0.15) * pressure * (Math.PI * input.boreDia * input.housingLen);
    const profile = input.bushingType === 'countersink' ? [{ d_top: csSolvedOd.dia, d_bottom: odInstalled, height: Math.min(csSolvedOd.depth, input.housingLen), role: 'parent' }, ...(csSolvedOd.depth < input.housingLen ? [{ d_top: odInstalled, d_bottom: odInstalled, height: Math.max(0, input.housingLen - csSolvedOd.depth), role: 'parent' }] : [])] : [{ d_top: odInstalled, d_bottom: odInstalled, height: input.housingLen, role: 'parent' }];
    const t_eff_seq = (0, bearing_1.calculateUniversalBearing)(profile).t_eff_sequence || input.housingLen;
    const sinTheta = Math.max(1e-6, Math.sin(Math.max(1e-6, Math.abs(input.thetaDeg ?? 40)) * (Math.PI / 180)));
    const Fbru_eff = toPsiFromKsi(matHousing.Fbru_ksi || matHousing.Sy_ksi || 0) + 0.8 * pressure;
    const tau = toPsiFromKsi(matHousing.Fsu_ksi || matHousing.Sy_ksi || 0);
    const e_required_seq = tau > 0 ? (input.boreDia * Fbru_eff) / (2 * tau * sinTheta) : Infinity;
    const e_required_strength = (2 * t_eff_seq * tau * sinTheta) > 1e-9 ? ((Number.isFinite(input.load) ? Number(input.load) : 1000) / (2 * t_eff_seq * tau * sinTheta)) : Infinity;
    const edMinSequence = e_required_seq > 0 ? e_required_seq / input.boreDia : Infinity;
    const edMinStrength = e_required_strength > 0 ? e_required_strength / input.boreDia : Infinity;
    const edActual = input.boreDia > 0 ? input.edgeDist / input.boreDia : Infinity;
    const candidates = [{ name: 'Edge distance (sequencing)', margin: edActual / edMinSequence - 1 }, { name: 'Edge distance (strength)', margin: edActual / edMinStrength - 1 }, { name: 'Straight wall thickness', margin: wallStraight / input.minWallStraight - 1 }, { name: 'Neck wall thickness', margin: wallNeck / input.minWallNeck - 1 }];
    const governing = candidates.reduce((best, cur) => (cur.margin < best.margin ? cur : best), candidates[0]);
    return { input, matHousing, matBushing, odInstalled, delta, deltaThermal, csSolvedId, csSolvedOd, internalCsInvalid, externalCsInvalid, wallStraight, wallNeck, failStraight, failNeck, effectiveODHousing, D_equivalent, psi, lambda, w_eff, e_eff, termB, termH, pressure, stressHoopHousing, stressHoopBushing, installForce, e_required_seq, edActual, edMinSequence, edMinStrength, candidates, governing };
}
function buildWarnings(validationWarnings, s) {
    const warningCodes = [...validationWarnings];
    const warnings = validationWarnings.map((w) => w.message);
    const push = (code, message, severity) => {
        warningCodes.push({ code, message, severity });
        warnings.push(message);
    };
    if (s.failStraight)
        push('STRAIGHT_WALL_BELOW_MIN', 'Straight wall thickness below minimum.', 'error');
    if (s.failNeck)
        push('NECK_WALL_BELOW_MIN', 'Neck wall thickness below minimum.', 'error');
    if (s.delta <= 0)
        push('NET_CLEARANCE_FIT', 'Net interference is negative (clearance fit after thermal).', 'warning');
    if ((s.edActual / s.edMinSequence) - 1 < 0)
        push('EDGE_DISTANCE_SEQUENCE_FAIL', 'Edge distance sequencing margin is below zero.', 'error');
    if ((s.edActual / s.edMinStrength) - 1 < 0)
        push('EDGE_DISTANCE_STRENGTH_FAIL', 'Edge distance strength margin is below zero.', 'error');
    if (s.internalCsInvalid)
        push('INPUT_INVALID', 'Internal countersink geometry is invalid for the selected mode.', 'warning');
    if (s.externalCsInvalid)
        push('INPUT_INVALID', 'External countersink geometry is invalid for the selected mode.', 'warning');
    return { warningCodes, warnings };
}
function toOutput(s, warningCodes, warnings) {
    return {
        sleeveWall: s.wallStraight,
        neckWall: s.wallNeck,
        odInstalled: s.odInstalled,
        csSolved: {
            ...(s.input.idType === 'countersink' ? { id: { dia: s.csSolvedId.dia, depth: s.csSolvedId.depth, angleDeg: s.csSolvedId.angleDeg } } : {}),
            ...(s.input.bushingType === 'countersink' ? { od: { dia: s.csSolvedOd.dia, depth: s.csSolvedOd.depth, angleDeg: s.csSolvedOd.angleDeg } } : {})
        },
        pressure: s.pressure,
        lame: { model: 'lame_thick_cylinder', unitsBase: { length: 'in', stress: 'psi', force: 'lbf' }, deltaTotal: s.delta, deltaThermal: s.deltaThermal, deltaUser: s.input.interference, boreDia: s.input.boreDia, idBushing: s.input.idBushing, effectiveODHousing: s.effectiveODHousing, D_equivalent: s.D_equivalent, psi: s.psi, lambda: s.lambda, w_eff: s.w_eff, e_eff: s.e_eff, termB: s.termB, termH: s.termH, pressurePsi: s.pressure, pressureKsi: s.pressure / 1000 },
        hoop: { housingSigma: s.stressHoopHousing, housingMS: s.stressHoopHousing !== 0 ? (toPsiFromKsi(s.matHousing.Sy_ksi || 0) / s.stressHoopHousing) - 1 : Infinity, bushingSigma: s.stressHoopBushing, bushingMS: s.stressHoopBushing !== 0 ? (toPsiFromKsi(s.matBushing.Sy_ksi || 0) / Math.abs(s.stressHoopBushing)) - 1 : Infinity, ligamentSigma: s.stressHoopHousing, ligamentMS: s.stressHoopHousing !== 0 ? (toPsiFromKsi(s.matHousing.Sy_ksi || 0) / s.stressHoopHousing) - 1 : Infinity, edRequiredLigament: s.e_required_seq },
        edgeDistance: { edActual: s.edActual, edMinSequence: s.edMinSequence, edMinStrength: s.edMinStrength, governing: s.edMinSequence >= s.edMinStrength ? 'sequencing' : 'strength' },
        physics: { deltaEffective: s.delta, contactPressure: s.pressure, installForce: s.installForce, stressHoopHousing: s.stressHoopHousing, stressHoopBushing: s.stressHoopBushing, marginHousing: s.stressHoopHousing !== 0 ? (toPsiFromKsi(s.matHousing.Sy_ksi || 0) / s.stressHoopHousing) - 1 : Infinity, marginBushing: s.stressHoopBushing !== 0 ? (toPsiFromKsi(s.matBushing.Sy_ksi || 0) / Math.abs(s.stressHoopBushing)) - 1 : Infinity, edMinCoupled: s.edMinSequence },
        geometry: { odBushing: s.odInstalled, wallStraight: s.wallStraight, wallNeck: s.wallNeck, csInternal: s.csSolvedId, csExternal: s.csSolvedOd, isSaturationActive: s.input.housingWidth > s.w_eff || s.input.edgeDist > s.e_eff },
        governing: s.governing,
        candidates: s.candidates,
        warningCodes,
        warnings
    };
}
function computeBushing(raw) {
    const input = (0, normalize_1.normalizeBushingInputs)(raw);
    const validationWarnings = (0, schema_1.validateBushingInputs)(input);
    const state = computeState(input);
    const { warningCodes, warnings } = buildWarnings(validationWarnings, state);
    return toOutput(state, warningCodes, warnings);
}
