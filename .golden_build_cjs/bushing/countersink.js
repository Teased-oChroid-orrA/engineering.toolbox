"use strict";
/**
 * Calculations for projected bearing area of countersunk fasteners.
 * Based on the integration of the conical section.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateProjectedArea = calculateProjectedArea;
/**
 * Calculates the projected bearing area for a countersunk fastener.
 * * Logic:
 * 1. Straight Shank Area: (Thickness - CS_Depth) * Diameter
 * 2. Conical Section Area: Integrates the diameter change over the CS depth.
 * For a standard 100-degree countersink, the diameter at depth x is:
 * Dx = D_shank + 2 * x * tan(theta)
 */
function calculateProjectedArea(diameter, thickness, csDepth, isCountersunk) {
    if (!isCountersunk || csDepth <= 0) {
        return {
            effectiveArea: diameter * thickness,
            effectiveThickness: thickness,
            effectiveDiameter: diameter
        };
    }
    // Ensure CS depth doesn't exceed total thickness
    const actualCsDepth = Math.min(csDepth, thickness);
    const straightShankHeight = thickness - actualCsDepth;
    // Area of the straight portion
    const straightArea = straightShankHeight * diameter;
    // Area of the conical portion (Integration of D over depth)
    // For 100 deg countersink: D(y) = D_shank + 2 * y * tan(50deg)
    // Area_cs = Integral from 0 to actualCsDepth of (D_shank + 2*y*tan(50)) dy
    // Area_cs = D_shank*actualCsDepth + tan(50)*actualCsDepth^2
    const tan50 = Math.tan((50 * Math.PI) / 180);
    const conicalArea = (diameter * actualCsDepth) + (tan50 * Math.pow(actualCsDepth, 2));
    const totalArea = straightArea + conicalArea;
    return {
        effectiveArea: totalArea,
        // For MS calculations, we derive an effective thickness based on the nominal diameter
        effectiveThickness: totalArea / diameter,
        effectiveDiameter: diameter
    };
}
