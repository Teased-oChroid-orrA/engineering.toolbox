"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeBushingInputs = normalizeBushingInputs;
const units_1 = require("../units");
const toInches = (v, units) => (units === 'metric' ? v * units_1.MM_TO_IN : v);
function normalizeMode(v, fallback) {
    const s = String(v ?? '').toLowerCase().replace('+', '_');
    if (s === 'depth_angle' || s === 'dia_angle' || s === 'dia_depth')
        return s;
    return fallback;
}
function normalizeBushingType(v) {
    const s = String(v ?? 'straight').toLowerCase();
    if (s.includes('flanged'))
        return 'flanged';
    if (s.includes('countersink'))
        return 'countersink';
    return 'straight';
}
function normalizeIdType(v) {
    const s = String(v ?? 'straight').toLowerCase();
    return s.includes('countersink') ? 'countersink' : 'straight';
}
function normalizeBushingInputs(raw) {
    const units = raw.units === 'metric' ? 'metric' : 'imperial';
    const boreDia = toInches(Number(raw.boreDia ?? raw.bore_dia ?? raw.bushOD ?? 0.5), units);
    const idBushing = toInches(Number(raw.idBushing ?? raw.bushID ?? raw.id_bushing ?? 0.375), units);
    const housingLen = toInches(Number((raw.housingLen ?? raw.housing_len ?? ((raw.t1 ?? 0) + (raw.t2 ?? 0))) || 0.5), units);
    const edgeDist = toInches(Number(raw.edgeDist ?? raw.edge_dist ?? 0.75), units);
    const housingWidth = toInches(Number(raw.housingWidth ?? raw.housing_width ?? Math.max(edgeDist * 2, boreDia * 4)), units);
    const csMode = normalizeMode(raw.csMode ?? raw.cs_mode ?? raw.idCS?.defType, 'depth_angle');
    const extCsMode = normalizeMode(raw.extCsMode ?? raw.ext_cs_mode ?? raw.odCS?.defType, 'depth_angle');
    return {
        units,
        boreDia,
        idBushing,
        interference: Number(raw.interference ?? 0),
        housingLen,
        housingWidth,
        edgeDist,
        bushingType: normalizeBushingType(raw.bushingType ?? raw.bushing_type),
        idType: normalizeIdType(raw.idType ?? raw.id_type),
        csMode,
        csDia: toInches(Number(raw.csDia ?? raw.cs_dia ?? raw.idCS?.dia ?? boreDia), units),
        csDepth: toInches(Number(raw.csDepth ?? raw.cs_depth ?? raw.idCS?.depth ?? 0), units),
        csAngle: Number(raw.csAngle ?? raw.cs_angle ?? raw.idCS?.angleDeg ?? 100),
        extCsMode,
        extCsDia: toInches(Number(raw.extCsDia ?? raw.ext_cs_dia ?? raw.odCS?.dia ?? boreDia), units),
        extCsDepth: toInches(Number(raw.extCsDepth ?? raw.ext_cs_depth ?? raw.odCS?.depth ?? 0), units),
        extCsAngle: Number(raw.extCsAngle ?? raw.ext_cs_angle ?? raw.odCS?.angleDeg ?? 100),
        flangeDia: raw.flangeDia,
        flangeOd: toInches(Number(raw.flangeOd ?? raw.flange_od ?? raw.flangeDia ?? 0), units),
        flangeThk: toInches(Number(raw.flangeThk ?? raw.flange_thk ?? 0), units),
        matHousing: String(raw.matHousing ?? raw.mat_housing ?? 'al7075'),
        matBushing: String(raw.matBushing ?? raw.mat_bushing ?? 'bronze'),
        friction: Number(raw.friction ?? 0.15),
        dT: Number(raw.dT ?? 0),
        minWallStraight: toInches(Number(raw.minWallStraight ?? raw.min_wall_straight ?? 0.05), units),
        minWallNeck: toInches(Number(raw.minWallNeck ?? raw.min_wall_neck ?? 0.04), units),
        load: raw.load == null ? undefined : Number(raw.load),
        thetaDeg: raw.thetaDeg == null ? undefined : Number(raw.thetaDeg),
        idCS: raw.idCS,
        odCS: raw.odCS
    };
}
