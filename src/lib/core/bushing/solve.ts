import { MATERIALS } from './materials';
import { calculateUniversalBearing } from '../shared/bearing';
import { normalizeBushingInputs } from './normalize';
import { validateBushingInputs } from './schema';
import type { BushingInputsRaw, BushingOutput, BushingWarning, CSMode } from './types';

export type { BushingInputs, BushingInputsRaw, BushingOutput, BushingWarning, CSMode } from './types';

const getMat = (id: string | undefined) => MATERIALS.find((m) => m.id === id) || MATERIALS[0];

export function solveCountersink(mode: CSMode, dia: number, depth: number, angle: number, baseDia: number) {
  const r_rad = (angle / 2) * (Math.PI / 180);
  const tan_r = Math.tan(r_rad);
  const res = { dia, depth, angleDeg: angle };
  if (mode === 'depth_angle') res.dia = baseDia + 2 * depth * tan_r;
  else if (mode === 'dia_angle') res.depth = tan_r > 1e-9 ? (dia - baseDia) / (2 * tan_r) : 0;
  else if (mode === 'dia_depth') {
    const angle_rad = depth > 1e-9 ? 2 * Math.atan((dia - baseDia) / (2 * depth)) : 0;
    res.angleDeg = angle_rad * (180 / Math.PI);
  }
  return res;
}

function toPsiFromKsi(v: number) {
  return v * 1000;
}

export function computeBushing(raw: BushingInputsRaw): BushingOutput {
  const input = normalizeBushingInputs(raw);
  const validationWarnings = validateBushingInputs(input);
  const units = input.units;
  const boreDia = input.boreDia;
  const idBushing = input.idBushing;
  const housingLen = input.housingLen;
  const edgeDist = input.edgeDist;
  const housingWidth = input.housingWidth;
  const flangeOd = input.flangeOd ?? 0;
  const flangeThk = input.flangeThk ?? 0;
  const minWallStraight = input.minWallStraight;
  const minWallNeck = input.minWallNeck;
  const csMode = input.csMode;
  const csEnabled = input.idCS?.enabled ?? input.idType === 'countersink';
  const csDia = input.csDia;
  const csDepth = input.csDepth;
  const csAngle = input.csAngle;
  const extCsMode = input.extCsMode;
  const extCsEnabled = input.odCS?.enabled ?? input.bushingType === 'countersink';
  const extCsDia = input.extCsDia;
  const extCsDepth = input.extCsDepth;
  const extCsAngle = input.extCsAngle;
  const bushingType = input.bushingType;
  const idType = input.idType;

  const matHousing = getMat(input.matHousing);
  const matBushing = getMat(input.matBushing);

  const friction = Number.isFinite(input.friction) ? input.friction : 0.15;
  const dT = Number.isFinite(input.dT) ? input.dT : 0;

  // Thermal delta: use per-°F coefficients and convert °C delta when metric.
  const dT_F = units === 'metric' ? dT * 1.8 : dT;
  const alpha_h = (matHousing.alpha_uF ?? 0) * 1e-6;
  const alpha_b = (matBushing.alpha_uF ?? 0) * 1e-6;

  const deltaThermal = (alpha_b - alpha_h) * boreDia * dT_F;
  const delta = input.interference + deltaThermal;
  const odInstalled = boreDia + delta;

  // Countersink resolution (ID and OD).
  const csSolvedId = csEnabled || idType === 'countersink'
    ? solveCountersink(csMode, csDia, csDepth, csAngle, idBushing)
    : { dia: csDia, depth: csDepth, angleDeg: csAngle };

  const csSolvedOd = extCsEnabled || bushingType === 'countersink'
    ? solveCountersink(extCsMode, extCsDia, extCsDepth, extCsAngle, odInstalled)
    : { dia: extCsDia, depth: extCsDepth, angleDeg: extCsAngle };

  // Wall calculations
  const wallStraight = Math.max((odInstalled - idBushing) / 2, 0);
  let wallNeck = wallStraight;

  if (idType === 'countersink') {
    const A_rad = (csSolvedId.angleDeg / 2) * (Math.PI / 180);
    const outerBoundary = bushingType === 'flanged' ? flangeOd : (bushingType === 'countersink' ? csSolvedOd.dia : odInstalled);

    if (bushingType === 'countersink') {
      wallNeck = Math.min((csSolvedOd.dia - csSolvedId.dia) / 2, wallStraight);
    } else {
      const t_top = (outerBoundary - csSolvedId.dia) / (2 * Math.cos(A_rad));
      wallNeck = t_top;
      if (bushingType === 'flanged') {
        const d_corner = ((odInstalled - csSolvedId.dia) / 2) * Math.cos(A_rad) + flangeThk * Math.sin(A_rad);
        wallNeck = Math.min(t_top, d_corner);
      }
    }
  }

  const failStraight = wallStraight < minWallStraight;
  const failNeck = wallNeck < minWallNeck;

  // Pressure and hoop stresses (Lamé).
  const Eh = toPsiFromKsi(matHousing.E_ksi || 0);
  const Eb = toPsiFromKsi(matBushing.E_ksi || 0);
  const nuh = matHousing.nu ?? 0.33;
  const nub = matBushing.nu ?? 0.33;

  // Saturation clamp for very wide plates (legacy used 2D span)
  const R_sat = boreDia * 2;
  const w_eff = Math.min(housingWidth, R_sat * 2);
  const e_eff = Math.min(edgeDist, R_sat);
  const area_rect = w_eff * (e_eff * 2.0);
  const area_bore = (Math.PI * boreDia ** 2) / 4;
  const area_housing = Math.max(area_rect - area_bore, 1e-6);
  const D_equivalent = Math.sqrt((4 * area_housing) / Math.PI + boreDia ** 2);

  const lambda = Math.min(e_eff / (D_equivalent / 2), 1.0);
  const psi = 1.0 + 0.2 * (1.0 - lambda);

  const effectiveODHousing = D_equivalent;
  const termB = (boreDia / Eb) * (((boreDia ** 2 + idBushing ** 2) / (boreDia ** 2 - idBushing ** 2)) - nub);
  const termH = psi * (boreDia / Eh) * (((effectiveODHousing ** 2 + boreDia ** 2) / (effectiveODHousing ** 2 - boreDia ** 2)) + nuh);

  const pressure = delta > 0 ? delta / (termB + termH) : 0;
  const stressHoopHousing = pressure * ((effectiveODHousing ** 2 + boreDia ** 2) / (effectiveODHousing ** 2 - boreDia ** 2));
  const stressHoopBushing = -pressure * ((boreDia ** 2 + idBushing ** 2) / (boreDia ** 2 - idBushing ** 2));
  const installForce = friction * pressure * (Math.PI * boreDia * housingLen);

  // Edge distance using legacy interaction approach.
  const profile = (bushingType === 'countersink')
    ? [
        { d_top: csSolvedOd.dia, d_bottom: odInstalled, height: Math.min(csSolvedOd.depth, housingLen), role: 'parent' },
        ...(csSolvedOd.depth < housingLen
          ? [{ d_top: odInstalled, d_bottom: odInstalled, height: Math.max(0, housingLen - csSolvedOd.depth), role: 'parent' }]
          : [])
      ]
    : [{ d_top: odInstalled, d_bottom: odInstalled, height: housingLen, role: 'parent' }];

  const bearingProfile = calculateUniversalBearing(profile);
  const t_eff_seq = bearingProfile.t_eff_sequence || housingLen;

  const thetaDeg = input.thetaDeg ?? 40;
  const th = Math.max(1e-6, Math.abs(thetaDeg)) * (Math.PI / 180);
  const sinTheta = Math.max(1e-6, Math.sin(th));

  const Fbru = toPsiFromKsi(matHousing.Fbru_ksi || matHousing.Sy_ksi || 0);
  const tau = toPsiFromKsi(matHousing.Fsu_ksi || matHousing.Sy_ksi || 0);

  const Fbru_eff = Fbru + 0.8 * pressure; // interaction uplift from legacy
  const e_required_seq = tau > 0 ? (boreDia * Fbru_eff) / (2 * tau * sinTheta) : Infinity;
  const loadForEdge = Number.isFinite(input.load) ? Number(input.load) : 1000;
  const e_required_strength = (2 * t_eff_seq * tau * sinTheta) > 1e-9 ? (loadForEdge) / (2 * t_eff_seq * tau * sinTheta) : Infinity;

  const edMinSequence = e_required_seq > 0 ? e_required_seq / boreDia : Infinity;
  const edMinStrength = e_required_strength > 0 ? e_required_strength / boreDia : Infinity;
  const edActual = boreDia > 0 ? edgeDist / boreDia : Infinity;

  // Governing margin selection.
  const marginSeq = edActual / edMinSequence - 1;
  const marginStrength = edActual / edMinStrength - 1;
  const marginWallStraight = wallStraight / minWallStraight - 1;
  const marginWallNeck = wallNeck / minWallNeck - 1;

  const candidates = [
    { name: 'Edge distance (sequencing)', margin: marginSeq },
    { name: 'Edge distance (strength)', margin: marginStrength },
    { name: 'Straight wall thickness', margin: marginWallStraight },
    { name: 'Neck wall thickness', margin: marginWallNeck }
  ];

  const governing = candidates.reduce((best, cur) => (cur.margin < best.margin ? cur : best), candidates[0]);

  const warningCodes: BushingWarning[] = [...validationWarnings];
  const warnings: string[] = validationWarnings.map((w) => w.message);
  if (failStraight) {
    warningCodes.push({
      code: 'STRAIGHT_WALL_BELOW_MIN',
      message: 'Straight wall thickness below minimum.',
      severity: 'error'
    });
    warnings.push('Straight wall thickness below minimum.');
  }
  if (failNeck) {
    warningCodes.push({
      code: 'NECK_WALL_BELOW_MIN',
      message: 'Neck wall thickness below minimum.',
      severity: 'error'
    });
    warnings.push('Neck wall thickness below minimum.');
  }
  if (delta <= 0) {
    warningCodes.push({
      code: 'NET_CLEARANCE_FIT',
      message: 'Net interference is negative (clearance fit after thermal).',
      severity: 'warning'
    });
    warnings.push('Net interference is negative (clearance fit after thermal).');
  }
  if (marginSeq < 0) {
    warningCodes.push({
      code: 'EDGE_DISTANCE_SEQUENCE_FAIL',
      message: 'Edge distance sequencing margin is below zero.',
      severity: 'error'
    });
    warnings.push('Edge distance sequencing margin is below zero.');
  }
  if (marginStrength < 0) {
    warningCodes.push({
      code: 'EDGE_DISTANCE_STRENGTH_FAIL',
      message: 'Edge distance strength margin is below zero.',
      severity: 'error'
    });
    warnings.push('Edge distance strength margin is below zero.');
  }

  return {
    sleeveWall: wallStraight,
    neckWall: wallNeck,
    odInstalled,
    csSolved: {
      ...(idType === 'countersink' ? { id: { dia: csSolvedId.dia, depth: csSolvedId.depth, angleDeg: csSolvedId.angleDeg } } : {}),
      ...(bushingType === 'countersink' ? { od: { dia: csSolvedOd.dia, depth: csSolvedOd.depth, angleDeg: csSolvedOd.angleDeg } } : {})
    },
    pressure,
    lame: {
      model: 'lame_thick_cylinder',
      unitsBase: { length: 'in', stress: 'psi', force: 'lbf' },
      deltaTotal: delta,
      deltaThermal,
      deltaUser: input.interference,
      boreDia,
      idBushing,
      effectiveODHousing,
      D_equivalent,
      psi,
      lambda,
      w_eff,
      e_eff,
      termB,
      termH,
      pressurePsi: pressure,
      pressureKsi: pressure / 1000,
    },
    hoop: {
      housingSigma: stressHoopHousing,
      housingMS: stressHoopHousing !== 0 ? (toPsiFromKsi(matHousing.Sy_ksi || 0) / stressHoopHousing) - 1 : Infinity,
      bushingSigma: stressHoopBushing,
      bushingMS: stressHoopBushing !== 0 ? (toPsiFromKsi(matBushing.Sy_ksi || 0) / Math.abs(stressHoopBushing)) - 1 : Infinity,
      ligamentSigma: stressHoopHousing,
      ligamentMS: stressHoopHousing !== 0 ? (toPsiFromKsi(matHousing.Sy_ksi || 0) / stressHoopHousing) - 1 : Infinity,
      edRequiredLigament: e_required_seq
    },
    edgeDistance: {
      edActual,
      edMinSequence,
      edMinStrength,
      governing: edMinSequence >= edMinStrength ? 'sequencing' : 'strength'
    },
    physics: {
      deltaEffective: delta,
      contactPressure: pressure,
      installForce,
      stressHoopHousing: stressHoopHousing,
      stressHoopBushing: stressHoopBushing,
      marginHousing: stressHoopHousing !== 0 ? (toPsiFromKsi(matHousing.Sy_ksi || 0) / stressHoopHousing) - 1 : Infinity,
      marginBushing: stressHoopBushing !== 0 ? (toPsiFromKsi(matBushing.Sy_ksi || 0) / Math.abs(stressHoopBushing)) - 1 : Infinity,
      edMinCoupled: edMinSequence
    },
    geometry: {
      odBushing: odInstalled,
      wallStraight,
      wallNeck,
      csInternal: csSolvedId,
      csExternal: csSolvedOd,
      isSaturationActive: housingWidth > w_eff || edgeDist > e_eff
    },
    governing,
    candidates,
    warningCodes,
    warnings
  };
}
