"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mpa_to_ksi = exports.ksi_to_mpa = exports.LBF_TO_N = exports.MM_TO_IN = exports.IN_TO_MM = void 0;
exports.toImperialLen = toImperialLen;
exports.toImperialForce = toImperialForce;
exports.IN_TO_MM = 25.4;
exports.MM_TO_IN = 1 / exports.IN_TO_MM;
// Base-force conversion
exports.LBF_TO_N = 4.4482216152605;
const ksi_to_mpa = (ksi) => ksi * 6.894757;
exports.ksi_to_mpa = ksi_to_mpa;
const mpa_to_ksi = (mpa) => mpa / 6.894757;
exports.mpa_to_ksi = mpa_to_ksi;
/**
 * All solvers should compute in a single internal base unit system.
 * Current internal base: inches, pounds-force (lbf), psi.
 */
function toImperialLen(v, units) {
    return units === 'metric' ? v * exports.MM_TO_IN : v;
}
function toImperialForce(v, units) {
    // Metric UI uses N as base force; internal uses lbf.
    return units === 'metric' ? v / exports.LBF_TO_N : v;
}
