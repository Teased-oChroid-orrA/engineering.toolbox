"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeState = computeState;
exports.buildWarnings = buildWarnings;
exports.toOutput = toOutput;
const materials_1 = require("./materials");
const bearing_1 = require("../shared/bearing");
const solveMath_1 = require("./solveMath");
const getMat = (id) => materials_1.MATERIALS.find((m) => m.id === id) || materials_1.MATERIALS[0];
function lameStressAtRadius(r, innerRadius, outerRadius, pInner, pOuter) {
    const a2 = innerRadius ** 2;
    const b2 = outerRadius ** 2;
    const denom = Math.max(b2 - a2, 1e-12);
    const A = (a2 * pInner - b2 * pOuter) / denom;
    const B = (a2 * b2 * (pInner - pOuter)) / denom;
    const rr = Math.max(r ** 2, 1e-12);
    const sigmaR = A - B / rr;
    const sigmaTheta = A + B / rr;
    return { sigmaR, sigmaTheta };
}
function buildLameRegionField(innerRadius, outerRadius, pInner, pOuter, nu, axialScale, sampleCount = 41) {
    const n = Math.max(3, sampleCount);
    const samples = [];
    let maxAbsHoop = -Infinity;
    let maxAbsHoopAt = innerRadius;
    let maxAbsAxial = -Infinity;
    let maxAbsAxialAt = innerRadius;
    for (let i = 0; i < n; i += 1) {
        const t = i / (n - 1);
        const r = innerRadius + (outerRadius - innerRadius) * t;
        const { sigmaR, sigmaTheta } = lameStressAtRadius(r, innerRadius, outerRadius, pInner, pOuter);
        const sigmaAxial = axialScale * nu * (sigmaR + sigmaTheta);
        samples.push({ r, sigmaR, sigmaTheta, sigmaAxial });
        const hoopAbs = Math.abs(sigmaTheta);
        if (hoopAbs > maxAbsHoop) {
            maxAbsHoop = hoopAbs;
            maxAbsHoopAt = r;
        }
        const axialAbs = Math.abs(sigmaAxial);
        if (axialAbs > maxAbsAxial) {
            maxAbsAxial = axialAbs;
            maxAbsAxialAt = r;
        }
    }
    const atInner = lameStressAtRadius(innerRadius, innerRadius, outerRadius, pInner, pOuter);
    const atOuter = lameStressAtRadius(outerRadius, innerRadius, outerRadius, pInner, pOuter);
    const sigmaAxialInner = axialScale * nu * (atInner.sigmaR + atInner.sigmaTheta);
    const sigmaAxialOuter = axialScale * nu * (atOuter.sigmaR + atOuter.sigmaTheta);
    return {
        innerRadius,
        outerRadius,
        samples,
        boundary: {
            sigmaRInner: atInner.sigmaR,
            sigmaROuter: atOuter.sigmaR,
            sigmaThetaInner: atInner.sigmaTheta,
            sigmaThetaOuter: atOuter.sigmaTheta,
            maxAbsHoop,
            maxAbsHoopAt,
            sigmaAxialInner,
            sigmaAxialOuter,
            maxAbsAxial,
            maxAbsAxialAt
        }
    };
}
function computeState(input) {
    const matHousing = getMat(input.matHousing);
    const matBushing = getMat(input.matBushing);
    let boreTol = (0, solveMath_1.resolveTolerance)({
        mode: input.boreTolMode,
        nominal: input.boreNominal ?? input.boreDia,
        plus: input.boreTolPlus,
        minus: input.boreTolMinus,
        lower: input.boreLower,
        upper: input.boreUpper,
        minFloor: 1e-6
    });
    const interferenceTol = (0, solveMath_1.resolveTolerance)({
        mode: input.interferenceTolMode,
        nominal: input.interferenceNominal ?? input.interference,
        plus: input.interferenceTolPlus,
        minus: input.interferenceTolMinus,
        lower: input.interferenceLower,
        upper: input.interferenceUpper
    });
    let odFit = (0, solveMath_1.buildOdTolerance)(boreTol, interferenceTol);
    const policy = input.interferencePolicy;
    const enforceInterference = Boolean(policy?.enabled ?? input.enforceInterferenceTolerance);
    const lockBore = Boolean(policy?.lockBore ?? input.lockBoreForInterference ?? true);
    const preserveBoreNominal = Boolean(policy?.preserveBoreNominal ?? true);
    const allowBoreNominalShift = Boolean(policy?.allowBoreNominalShift ?? false);
    const enforcementReasonCodes = [];
    const boreNominalShiftApplied = 0;
    const availableBoreTolWidth = Math.max(0, boreTol.upper - boreTol.lower);
    const targetInterferenceWidth = Math.max(0, interferenceTol.upper - interferenceTol.lower);
    const requiredBoreTolWidth = targetInterferenceWidth;
    if (!enforceInterference)
        enforcementReasonCodes.push('ENFORCEMENT_DISABLED');
    if (enforceInterference && odFit.status === 'infeasible') {
        if (lockBore) {
            odFit.notes.push('Strict interference enforcement is blocked because bore is locked (reamer-fixed).');
            enforcementReasonCodes.push('BLOCKED_BORE_LOCKED');
        }
        else {
            const enforcedBore = (0, solveMath_1.enforceBoreBandForTarget)(boreTol, interferenceTol, input.boreCapability);
            if (enforcedBore.changed) {
                boreTol = enforcedBore.adjusted;
                odFit = (0, solveMath_1.buildOdTolerance)(boreTol, interferenceTol);
                enforcementReasonCodes.push('AUTO_ADJUST_BORE_WIDTH');
            }
            if (enforcedBore.note) {
                odFit.notes.unshift(enforcedBore.note);
                if (enforcedBore.note.includes('capability floor'))
                    enforcementReasonCodes.push('BLOCKED_CAPABILITY_FLOOR');
            }
            if (!enforcedBore.changed && allowBoreNominalShift && !preserveBoreNominal) {
                odFit.notes.unshift('Bore nominal shift cannot resolve width-driven interference infeasibility.');
                enforcementReasonCodes.push('BLOCKED_NOMINAL_SHIFT_NO_EFFECT');
            }
            if (!enforcedBore.changed && !enforcementReasonCodes.some((c) => c === 'BLOCKED_CAPABILITY_FLOOR')) {
                enforcementReasonCodes.push('BLOCKED_INFEASIBLE_WIDTH');
            }
        }
    }
    const vio = (0, solveMath_1.containmentViolations)(odFit.achievedInterference, interferenceTol);
    const enforcementSatisfied = !enforceInterference || (vio.lowerViolation <= solveMath_1.EPS && vio.upperViolation <= solveMath_1.EPS);
    const enforcementBlocked = enforceInterference && !enforcementSatisfied;
    if (enforceInterference && enforcementSatisfied) {
        enforcementReasonCodes.push('CONTAINMENT_SATISFIED');
    }
    const odInstalled = odFit.od.nominal;
    const dT = Number.isFinite(input.dT) ? input.dT : 0;
    const dT_F = input.units === 'metric' ? dT * 1.8 : dT;
    const deltaThermal = ((matBushing.alpha_uF ?? 0) - (matHousing.alpha_uF ?? 0)) * 1e-6 * boreTol.nominal * dT_F;
    const deltaUser = odFit.achievedInterference.nominal;
    const delta = deltaUser + deltaThermal;
    const csSolvedId = (input.idCS?.enabled ?? input.idType === 'countersink')
        ? (0, solveMath_1.solveCountersink)(input.csMode, input.csDia, input.csDepth, input.csAngle, input.idBushing)
        : { dia: input.csDia, depth: input.csDepth, angleDeg: input.csAngle };
    const csSolvedOd = (input.odCS?.enabled ?? input.bushingType === 'countersink')
        ? (0, solveMath_1.solveCountersink)(input.extCsMode, input.extCsDia, input.extCsDepth, input.extCsAngle, odInstalled)
        : { dia: input.extCsDia, depth: input.extCsDepth, angleDeg: input.extCsAngle };
    const csInternalDiaTol = (0, solveMath_1.csDiaToleranceFromBase)(input.csMode, csSolvedId.dia, csSolvedId.depth, csSolvedId.angleDeg, (0, solveMath_1.makeRange)('nominal_tol', input.idBushing, input.idBushing, input.idBushing));
    const csExternalDiaTol = (0, solveMath_1.csDiaToleranceFromBase)(input.extCsMode, csSolvedOd.dia, csSolvedOd.depth, csSolvedOd.angleDeg, odFit.od);
    const internalCsInvalid = input.idType === 'countersink' &&
        (!Number.isFinite(csSolvedId.dia) ||
            !Number.isFinite(csSolvedId.depth) ||
            !Number.isFinite(csSolvedId.angleDeg) ||
            csSolvedId.dia < input.idBushing ||
            csSolvedId.depth < 0 ||
            csSolvedId.angleDeg <= 0 ||
            csSolvedId.angleDeg >= 180);
    const externalCsInvalid = input.bushingType === 'countersink' &&
        (!Number.isFinite(csSolvedOd.dia) ||
            !Number.isFinite(csSolvedOd.depth) ||
            !Number.isFinite(csSolvedOd.angleDeg) ||
            csSolvedOd.dia < odInstalled ||
            csSolvedOd.depth < 0 ||
            csSolvedOd.angleDeg <= 0 ||
            csSolvedOd.angleDeg >= 180);
    const wallStraight = Math.max((odInstalled - input.idBushing) / 2, 0);
    const A_rad = (csSolvedId.angleDeg / 2) * (Math.PI / 180);
    const outerBoundary = input.bushingType === 'flanged'
        ? (input.flangeOd ?? 0)
        : input.bushingType === 'countersink'
            ? csSolvedOd.dia
            : odInstalled;
    const t_top = (outerBoundary - csSolvedId.dia) / (2 * Math.cos(A_rad));
    const d_corner = ((odInstalled - csSolvedId.dia) / 2) * Math.cos(A_rad) + (input.flangeThk ?? 0) * Math.sin(A_rad);
    const wallNeck = input.idType !== 'countersink'
        ? wallStraight
        : input.bushingType === 'countersink'
            ? Math.min((csSolvedOd.dia - csSolvedId.dia) / 2, wallStraight)
            : input.bushingType === 'flanged'
                ? Math.min(t_top, d_corner)
                : t_top;
    const failStraight = wallStraight < input.minWallStraight;
    const failNeck = wallNeck < input.minWallNeck;
    const Eh = (0, solveMath_1.toPsiFromKsi)(matHousing.E_ksi || 0);
    const Eb = (0, solveMath_1.toPsiFromKsi)(matBushing.E_ksi || 0);
    const R_sat = boreTol.nominal * 2;
    const w_eff = Math.min(input.housingWidth, R_sat * 2);
    const e_eff = Math.min(input.edgeDist, R_sat);
    const area_housing = Math.max(w_eff * (e_eff * 2.0) - (Math.PI * boreTol.nominal ** 2) / 4, 1e-6);
    const D_equivalent = Math.sqrt((4 * area_housing) / Math.PI + boreTol.nominal ** 2);
    const lambda = Math.min(e_eff / (D_equivalent / 2), 1.0);
    const psi = 1.0 + 0.2 * (1.0 - lambda);
    const effectiveODHousing = D_equivalent;
    const termB = (boreTol.nominal / Eb) *
        (((boreTol.nominal ** 2 + input.idBushing ** 2) / (boreTol.nominal ** 2 - input.idBushing ** 2)) -
            (matBushing.nu ?? 0.33));
    const termH = psi *
        (boreTol.nominal / Eh) *
        (((effectiveODHousing ** 2 + boreTol.nominal ** 2) / (effectiveODHousing ** 2 - boreTol.nominal ** 2)) +
            (matHousing.nu ?? 0.33));
    const pressure = delta > 0 ? delta / (termB + termH) : 0;
    const stressHoopHousing = pressure * ((effectiveODHousing ** 2 + boreTol.nominal ** 2) / (effectiveODHousing ** 2 - boreTol.nominal ** 2));
    const stressHoopBushing = -pressure * ((boreTol.nominal ** 2 + input.idBushing ** 2) / (boreTol.nominal ** 2 - input.idBushing ** 2));
    const endConstraint = input.endConstraint ?? 'free';
    const axialConstraintFactor = endConstraint === 'both_ends' ? 1 : endConstraint === 'one_end' ? 0.5 : 0;
    const axialLengthFactor = (0, solveMath_1.clamp)(input.housingLen / Math.max(4 * wallStraight, 1e-6), 0, 1);
    const axialScale = axialConstraintFactor * axialLengthFactor;
    const stressAxialHousing = axialScale * (matHousing.nu ?? 0.33) * stressHoopHousing;
    const stressAxialBushing = axialScale * (matBushing.nu ?? 0.33) * stressHoopBushing;
    const installForce = (Number.isFinite(input.friction) ? input.friction : 0.15) * pressure * (Math.PI * boreTol.nominal * input.housingLen);
    const profile = input.bushingType === 'countersink'
        ? [
            {
                d_top: csSolvedOd.dia,
                d_bottom: odInstalled,
                height: Math.min(csSolvedOd.depth, input.housingLen),
                role: 'parent'
            },
            ...(csSolvedOd.depth < input.housingLen
                ? [{ d_top: odInstalled, d_bottom: odInstalled, height: Math.max(0, input.housingLen - csSolvedOd.depth), role: 'parent' }]
                : [])
        ]
        : [{ d_top: odInstalled, d_bottom: odInstalled, height: input.housingLen, role: 'parent' }];
    const t_eff_seq = (0, bearing_1.calculateUniversalBearing)(profile).t_eff_sequence || input.housingLen;
    const sinTheta = Math.max(1e-6, Math.sin(Math.max(1e-6, Math.abs(input.thetaDeg ?? 40)) * (Math.PI / 180)));
    const Fbru_eff = (0, solveMath_1.toPsiFromKsi)(matHousing.Fbru_ksi || matHousing.Sy_ksi || 0) + 0.8 * pressure;
    const tau = (0, solveMath_1.toPsiFromKsi)(matHousing.Fsu_ksi || matHousing.Sy_ksi || 0);
    const e_required_seq = tau > 0 ? (boreTol.nominal * Fbru_eff) / (2 * tau * sinTheta) : Infinity;
    const e_required_strength = 2 * t_eff_seq * tau * sinTheta > 1e-9
        ? (Number.isFinite(input.load) ? Number(input.load) : 1000) / (2 * t_eff_seq * tau * sinTheta)
        : Infinity;
    const edMinSequence = e_required_seq > 0 ? e_required_seq / boreTol.nominal : Infinity;
    const edMinStrength = e_required_strength > 0 ? e_required_strength / boreTol.nominal : Infinity;
    const edActual = boreTol.nominal > 0 ? input.edgeDist / boreTol.nominal : Infinity;
    const candidates = [
        { name: 'Edge distance (sequencing)', margin: edActual / edMinSequence - 1 },
        { name: 'Edge distance (strength)', margin: edActual / edMinStrength - 1 },
        { name: 'Straight wall thickness', margin: wallStraight / input.minWallStraight - 1 },
        { name: 'Neck wall thickness', margin: wallNeck / input.minWallNeck - 1 }
    ];
    const governing = candidates.reduce((best, cur) => (cur.margin < best.margin ? cur : best), candidates[0]);
    return {
        input,
        matHousing,
        matBushing,
        boreTol,
        interferenceTol,
        odTol: odFit.od,
        achievedInterferenceTol: odFit.achievedInterference,
        toleranceStatus: odFit.status,
        toleranceNotes: odFit.notes,
        enforcementEnabled: enforceInterference,
        enforcementSatisfied,
        enforcementBlocked,
        enforcementReasonCodes,
        enforcementLowerViolation: vio.lowerViolation,
        enforcementUpperViolation: vio.upperViolation,
        requiredBoreTolWidth,
        availableBoreTolWidth,
        targetInterferenceWidth,
        boreNominalShiftApplied,
        odInstalled,
        delta,
        deltaUser,
        deltaThermal,
        csSolvedId,
        csSolvedOd,
        csInternalDiaTol,
        csExternalDiaTol,
        internalCsInvalid,
        externalCsInvalid,
        wallStraight,
        wallNeck,
        failStraight,
        failNeck,
        effectiveODHousing,
        D_equivalent,
        psi,
        lambda,
        w_eff,
        e_eff,
        termB,
        termH,
        pressure,
        stressHoopHousing,
        stressHoopBushing,
        stressAxialHousing,
        stressAxialBushing,
        axialConstraintFactor,
        axialLengthFactor,
        installForce,
        e_required_seq,
        edActual,
        edMinSequence,
        edMinStrength,
        candidates,
        governing
    };
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
    if (s.edActual / s.edMinSequence - 1 < 0)
        push('EDGE_DISTANCE_SEQUENCE_FAIL', 'Edge distance sequencing margin is below zero.', 'error');
    if (s.edActual / s.edMinStrength - 1 < 0)
        push('EDGE_DISTANCE_STRENGTH_FAIL', 'Edge distance strength margin is below zero.', 'error');
    if (s.internalCsInvalid)
        push('INPUT_INVALID', 'Internal countersink geometry is invalid for the selected mode.', 'warning');
    if (s.externalCsInvalid)
        push('INPUT_INVALID', 'External countersink geometry is invalid for the selected mode.', 'warning');
    if (s.toleranceStatus === 'infeasible') {
        push('TOLERANCE_INFEASIBLE', 'Bore/interference tolerance bands are incompatible for full-range containment.', 'warning');
    }
    if (s.enforcementEnabled && s.enforcementBlocked) {
        push('INTERFERENCE_ENFORCEMENT_BLOCKED', 'Interference enforcement is enabled but full containment could not be satisfied under current constraints.', 'error');
    }
    return { warningCodes, warnings };
}
function toOutput(s, warningCodes, warnings) {
    const bushingField = buildLameRegionField(s.input.idBushing / 2, s.boreTol.nominal / 2, 0, s.pressure, s.matBushing.nu ?? 0.33, s.axialConstraintFactor * s.axialLengthFactor);
    const housingField = buildLameRegionField(s.boreTol.nominal / 2, s.effectiveODHousing / 2, s.pressure, 0, s.matHousing.nu ?? 0.33, s.axialConstraintFactor * s.axialLengthFactor);
    return {
        sleeveWall: s.wallStraight,
        neckWall: s.wallNeck,
        odInstalled: s.odInstalled,
        csSolved: {
            ...(s.input.idType === 'countersink'
                ? { id: { dia: s.csSolvedId.dia, depth: s.csSolvedId.depth, angleDeg: s.csSolvedId.angleDeg } }
                : {}),
            ...(s.input.bushingType === 'countersink'
                ? { od: { dia: s.csSolvedOd.dia, depth: s.csSolvedOd.depth, angleDeg: s.csSolvedOd.angleDeg } }
                : {})
        },
        pressure: s.pressure,
        lame: {
            model: 'lame_thick_cylinder',
            unitsBase: { length: 'in', stress: 'psi', force: 'lbf' },
            deltaTotal: s.delta,
            deltaThermal: s.deltaThermal,
            deltaUser: s.deltaUser,
            boreDia: s.boreTol.nominal,
            idBushing: s.input.idBushing,
            effectiveODHousing: s.effectiveODHousing,
            D_equivalent: s.D_equivalent,
            psi: s.psi,
            lambda: s.lambda,
            w_eff: s.w_eff,
            e_eff: s.e_eff,
            termB: s.termB,
            termH: s.termH,
            pressurePsi: s.pressure,
            pressureKsi: s.pressure / 1000,
            field: {
                signConvention: 'Tension positive; compressive pressure appears as negative radial stress.',
                axialModel: `sigma_z(r) = k_constraint*k_length*nu*(sigma_r(r)+sigma_theta(r)), with k_constraint=${s.axialConstraintFactor.toFixed(2)} and k_length=${s.axialLengthFactor.toFixed(2)}.`,
                bushing: bushingField,
                housing: housingField
            }
        },
        hoop: {
            housingSigma: s.stressHoopHousing,
            housingMS: s.stressHoopHousing !== 0 ? (0, solveMath_1.toPsiFromKsi)(s.matHousing.Sy_ksi || 0) / s.stressHoopHousing - 1 : Infinity,
            bushingSigma: s.stressHoopBushing,
            bushingMS: s.stressHoopBushing !== 0
                ? (0, solveMath_1.toPsiFromKsi)(s.matBushing.Sy_ksi || 0) / Math.abs(s.stressHoopBushing) - 1
                : Infinity,
            ligamentSigma: s.stressHoopHousing,
            ligamentMS: s.stressHoopHousing !== 0 ? (0, solveMath_1.toPsiFromKsi)(s.matHousing.Sy_ksi || 0) / s.stressHoopHousing - 1 : Infinity,
            edRequiredLigament: s.e_required_seq
        },
        edgeDistance: {
            edActual: s.edActual,
            edMinSequence: s.edMinSequence,
            edMinStrength: s.edMinStrength,
            governing: s.edMinSequence >= s.edMinStrength ? 'sequencing' : 'strength'
        },
        physics: {
            deltaEffective: s.delta,
            contactPressure: s.pressure,
            installForce: s.installForce,
            stressHoopHousing: s.stressHoopHousing,
            stressHoopBushing: s.stressHoopBushing,
            stressAxialHousing: s.stressAxialHousing,
            stressAxialBushing: s.stressAxialBushing,
            marginHousing: s.stressHoopHousing !== 0 ? (0, solveMath_1.toPsiFromKsi)(s.matHousing.Sy_ksi || 0) / s.stressHoopHousing - 1 : Infinity,
            marginBushing: s.stressHoopBushing !== 0
                ? (0, solveMath_1.toPsiFromKsi)(s.matBushing.Sy_ksi || 0) / Math.abs(s.stressHoopBushing) - 1
                : Infinity,
            axialConstraintFactor: s.axialConstraintFactor,
            axialLengthFactor: s.axialLengthFactor,
            edMinCoupled: s.edMinSequence
        },
        geometry: {
            odBushing: s.odInstalled,
            wallStraight: s.wallStraight,
            wallNeck: s.wallNeck,
            csInternal: s.csSolvedId,
            csExternal: s.csSolvedOd,
            isSaturationActive: s.input.housingWidth > s.w_eff || s.input.edgeDist > s.e_eff
        },
        tolerance: {
            status: s.toleranceStatus,
            notes: s.toleranceNotes,
            enforcement: {
                enabled: s.enforcementEnabled,
                satisfied: s.enforcementSatisfied,
                blocked: s.enforcementBlocked,
                reasonCodes: s.enforcementReasonCodes,
                requiredBoreTolWidth: s.requiredBoreTolWidth,
                availableBoreTolWidth: s.availableBoreTolWidth,
                targetInterferenceWidth: s.targetInterferenceWidth,
                lowerViolation: s.enforcementLowerViolation,
                upperViolation: s.enforcementUpperViolation,
                boreNominalShiftApplied: s.boreNominalShiftApplied
            },
            bore: s.boreTol,
            interferenceTarget: s.interferenceTol,
            odBushing: s.odTol,
            achievedInterference: s.achievedInterferenceTol,
            ...(s.input.idType === 'countersink' ? { csInternalDia: s.csInternalDiaTol } : {}),
            ...(s.input.bushingType === 'countersink' ? { csExternalDia: s.csExternalDiaTol } : {})
        },
        governing: s.governing,
        candidates: s.candidates,
        warningCodes,
        warnings
    };
}
