"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toNumber = exports.clamp = exports.isNum = void 0;
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
exports.isNum = isNum;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
exports.clamp = clamp;
const toNumber = (v, fallback = NaN) => {
    if (typeof v === 'number')
        return v;
    if (typeof v === 'string' && v.trim() !== '') {
        const n = Number(v);
        return Number.isFinite(n) ? n : fallback;
    }
    return fallback;
};
exports.toNumber = toNumber;
