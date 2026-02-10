"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateUniversalBearing = calculateUniversalBearing;
// Ported 1:1 from legacy App.Logic.Bearing.calculateUniversalBearing
function calculateUniversalBearing(profile) {
    if (!profile || profile.length === 0) {
        return {
            segments: [],
            totalEffArea: 0,
            t_eff: 0,
            totalHeight: 0,
            isKnifeEdge: false,
            refD: 0,
            t_eff_bearing: 0,
            t_eff_sequence: 0
        };
    }
    const results = profile.map((segment) => {
        const isCyl = Math.abs(segment.d_top - segment.d_bottom) < 1e-6;
        const autoEta = isCyl ? 1.0 : 0.35;
        const eta = typeof segment.eta === 'number' ? segment.eta : autoEta;
        const rawArea = segment.height * (segment.d_top + segment.d_bottom) / 2;
        const effectiveArea = rawArea * eta;
        const geometry = isCyl ? 'CYLINDER' : 'FRUSTUM';
        return {
            ...segment,
            eta,
            rawArea,
            effectiveArea,
            geometry
        };
    });
    const totalEffArea = results.reduce((s, r) => s + r.effectiveArea, 0);
    const totalHeight = results.reduce((s, r) => s + r.height, 0);
    const refD = Math.max(...results.map((r) => Math.max(r.d_top, r.d_bottom)));
    const t_eff = refD > 0 ? totalEffArea / refD : 0;
    const parentSegments = results.filter((s) => (s.role || 'parent') === 'parent');
    const t_eff_sequence = parentSegments.reduce((sum, s) => sum + s.height * s.eta, 0);
    const cylindricalHeight = results
        .filter((r) => r.geometry === 'CYLINDER' && r.eta >= 0.9)
        .reduce((s, r) => s + r.height, 0);
    const isKnifeEdge = totalHeight > 0 && cylindricalHeight / totalHeight < 0.4;
    return {
        segments: results,
        totalEffArea,
        t_eff,
        totalHeight,
        refD,
        isKnifeEdge,
        t_eff_bearing: t_eff,
        t_eff_sequence
    };
}
