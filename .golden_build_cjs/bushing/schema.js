"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bushingInputsSchema = void 0;
exports.validateBushingInputs = validateBushingInputs;
const zod_1 = require("zod");
exports.bushingInputsSchema = zod_1.z.object({
    units: zod_1.z.enum(['imperial', 'metric']),
    boreDia: zod_1.z.number().positive(),
    idBushing: zod_1.z.number().positive(),
    interference: zod_1.z.number(),
    boreTolMode: zod_1.z.enum(['nominal_tol', 'limits']).optional(),
    boreNominal: zod_1.z.number().positive().optional(),
    boreTolPlus: zod_1.z.number().nonnegative().optional(),
    boreTolMinus: zod_1.z.number().nonnegative().optional(),
    boreLower: zod_1.z.number().positive().optional(),
    boreUpper: zod_1.z.number().positive().optional(),
    interferenceTolMode: zod_1.z.enum(['nominal_tol', 'limits']).optional(),
    interferenceNominal: zod_1.z.number().optional(),
    interferenceTolPlus: zod_1.z.number().nonnegative().optional(),
    interferenceTolMinus: zod_1.z.number().nonnegative().optional(),
    interferenceLower: zod_1.z.number().optional(),
    interferenceUpper: zod_1.z.number().optional(),
    interferencePolicy: zod_1.z.object({
        enabled: zod_1.z.boolean().optional(),
        lockBore: zod_1.z.boolean().optional(),
        preserveBoreNominal: zod_1.z.boolean().optional(),
        allowBoreNominalShift: zod_1.z.boolean().optional(),
        maxBoreNominalShift: zod_1.z.number().nonnegative().optional()
    }).optional(),
    boreCapability: zod_1.z.object({
        mode: zod_1.z.enum(['unspecified', 'reamer_fixed', 'adjustable']).optional(),
        minAchievableTolWidth: zod_1.z.number().nonnegative().optional(),
        maxRecommendedTolWidth: zod_1.z.number().nonnegative().optional(),
        preferredItClass: zod_1.z.string().optional()
    }).optional(),
    enforceInterferenceTolerance: zod_1.z.boolean().optional(),
    lockBoreForInterference: zod_1.z.boolean().optional(),
    housingLen: zod_1.z.number().positive(),
    housingWidth: zod_1.z.number().positive(),
    edgeDist: zod_1.z.number().nonnegative(),
    bushingType: zod_1.z.enum(['straight', 'flanged', 'countersink']),
    idType: zod_1.z.enum(['straight', 'countersink']),
    csMode: zod_1.z.enum(['depth_angle', 'dia_angle', 'dia_depth']),
    csDia: zod_1.z.number().nonnegative(),
    csDepth: zod_1.z.number().nonnegative(),
    csAngle: zod_1.z.number().gt(0).lt(180),
    extCsMode: zod_1.z.enum(['depth_angle', 'dia_angle', 'dia_depth']),
    extCsDia: zod_1.z.number().nonnegative(),
    extCsDepth: zod_1.z.number().nonnegative(),
    extCsAngle: zod_1.z.number().gt(0).lt(180),
    flangeDia: zod_1.z.number().optional(),
    flangeOd: zod_1.z.number().optional(),
    flangeThk: zod_1.z.number().optional(),
    matHousing: zod_1.z.string().min(1),
    matBushing: zod_1.z.string().min(1),
    friction: zod_1.z.number().min(0),
    dT: zod_1.z.number(),
    minWallStraight: zod_1.z.number().positive(),
    minWallNeck: zod_1.z.number().positive(),
    endConstraint: zod_1.z.enum(['free', 'one_end', 'both_ends']).optional(),
    load: zod_1.z.number().optional(),
    thetaDeg: zod_1.z.number().optional(),
    idCS: zod_1.z
        .object({
        enabled: zod_1.z.boolean().optional(),
        defType: zod_1.z.string().optional(),
        dia: zod_1.z.number().optional(),
        depth: zod_1.z.number().optional(),
        angleDeg: zod_1.z.number().optional()
    })
        .optional(),
    odCS: zod_1.z
        .object({
        enabled: zod_1.z.boolean().optional(),
        defType: zod_1.z.string().optional(),
        dia: zod_1.z.number().optional(),
        depth: zod_1.z.number().optional(),
        angleDeg: zod_1.z.number().optional()
    })
        .optional()
});
function validateBushingInputs(input) {
    const warnings = [];
    const parsed = exports.bushingInputsSchema.safeParse(input);
    if (!parsed.success) {
        warnings.push({
            code: 'INPUT_INVALID',
            message: 'Some inputs are invalid. Results are best-effort.',
            severity: 'warning'
        });
    }
    if (Number.isFinite(input.idBushing) && Number.isFinite(input.boreDia) && input.idBushing >= input.boreDia) {
        warnings.push({
            code: 'INPUT_INVALID',
            message: 'Bushing ID should be smaller than bore diameter.',
            severity: 'warning'
        });
    }
    const boreLower = Number(input.boreLower);
    const boreUpper = Number(input.boreUpper);
    if (Number.isFinite(boreLower) && Number.isFinite(boreUpper) && boreLower > boreUpper) {
        warnings.push({
            code: 'INPUT_INVALID',
            message: 'Bore lower limit should be <= upper limit.',
            severity: 'warning'
        });
    }
    const interferenceLower = Number(input.interferenceLower);
    const interferenceUpper = Number(input.interferenceUpper);
    if (Number.isFinite(interferenceLower) && Number.isFinite(interferenceUpper) && interferenceLower > interferenceUpper) {
        warnings.push({
            code: 'INPUT_INVALID',
            message: 'Interference lower limit should be <= upper limit.',
            severity: 'warning'
        });
    }
    const minAchievableTolWidth = Number(input.boreCapability?.minAchievableTolWidth);
    const maxRecommendedTolWidth = Number(input.boreCapability?.maxRecommendedTolWidth);
    if (Number.isFinite(minAchievableTolWidth) && Number.isFinite(maxRecommendedTolWidth) && minAchievableTolWidth > maxRecommendedTolWidth) {
        warnings.push({
            code: 'INPUT_INVALID',
            message: 'Bore capability min achievable tolerance width should be <= max recommended tolerance width.',
            severity: 'warning'
        });
    }
    if (input.interferencePolicy?.preserveBoreNominal && input.interferencePolicy?.allowBoreNominalShift) {
        warnings.push({
            code: 'INPUT_INVALID',
            message: 'Interference policy has both preserve-bore-nominal and allow-bore-nominal-shift enabled; preserve nominal takes precedence.',
            severity: 'info'
        });
    }
    if (input.boreCapability?.mode === 'reamer_fixed' && input.interferencePolicy?.lockBore === false) {
        warnings.push({
            code: 'INPUT_INVALID',
            message: 'Reamer-fixed bore capability requires lock bore to remain enabled.',
            severity: 'info'
        });
    }
    if (input.idType === 'countersink') {
        if (Number.isFinite(input.csDia) && Number.isFinite(input.idBushing) && input.csDia < input.idBushing) {
            warnings.push({
                code: 'INPUT_INVALID',
                message: 'Internal countersink diameter should be >= bushing ID.',
                severity: 'warning'
            });
        }
        if (!Number.isFinite(input.csAngle) || input.csAngle <= 0 || input.csAngle >= 180) {
            warnings.push({
                code: 'INPUT_INVALID',
                message: 'Internal countersink angle must be between 0 and 180 degrees.',
                severity: 'warning'
            });
        }
    }
    if (input.bushingType === 'countersink') {
        if (Number.isFinite(input.extCsDia) && Number.isFinite(input.boreDia) && input.extCsDia < input.boreDia) {
            warnings.push({
                code: 'INPUT_INVALID',
                message: 'External countersink diameter should be >= installed OD baseline.',
                severity: 'warning'
            });
        }
        if (!Number.isFinite(input.extCsAngle) || input.extCsAngle <= 0 || input.extCsAngle >= 180) {
            warnings.push({
                code: 'INPUT_INVALID',
                message: 'External countersink angle must be between 0 and 180 degrees.',
                severity: 'warning'
            });
        }
    }
    return warnings;
}
