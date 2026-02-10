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
    housingLen: zod_1.z.number().positive(),
    housingWidth: zod_1.z.number().positive(),
    edgeDist: zod_1.z.number().nonnegative(),
    bushingType: zod_1.z.enum(['straight', 'flanged', 'countersink']),
    idType: zod_1.z.enum(['straight', 'countersink']),
    csMode: zod_1.z.enum(['depth_angle', 'dia_angle', 'dia_depth']),
    csDia: zod_1.z.number().nonnegative(),
    csDepth: zod_1.z.number().nonnegative(),
    csAngle: zod_1.z.number().nonnegative(),
    extCsMode: zod_1.z.enum(['depth_angle', 'dia_angle', 'dia_depth']),
    extCsDia: zod_1.z.number().nonnegative(),
    extCsDepth: zod_1.z.number().nonnegative(),
    extCsAngle: zod_1.z.number().nonnegative(),
    flangeDia: zod_1.z.number().optional(),
    flangeOd: zod_1.z.number().optional(),
    flangeThk: zod_1.z.number().optional(),
    matHousing: zod_1.z.string().min(1),
    matBushing: zod_1.z.string().min(1),
    friction: zod_1.z.number().min(0),
    dT: zod_1.z.number(),
    minWallStraight: zod_1.z.number().positive(),
    minWallNeck: zod_1.z.number().positive(),
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
    return warnings;
}
