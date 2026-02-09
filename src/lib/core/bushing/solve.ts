import { MATERIALS } from './materials';
import { MM_TO_IN, type UnitSystem } from '../units';
import { calculateUniversalBearing } from '../shared/bearing';

export type CSMode = 'depth_angle' | 'dia_angle' | 'dia_depth';

export type BushingInputs = {
  units: UnitSystem;
  boreDia?: number;
  bore_dia?: number;
  bushOD?: number;
  bushID?: number;
  id_bushing?: number;
  idBushing?: number;
  interference: number;
  housingLen?: number;
  housing_len?: number;
  housingWidth?: number;
  housing_width?: number;
  edgeDist?: number;
  edge_dist?: number;
  bushingType?: 'straight' | 'flanged' | 'countersink' | 'CountersinkBushing' | 'Straight' | 'Flanged';
  bushing_type?: 'straight' | 'flanged' | 'countersink' | 'CountersinkBushing' | 'Straight' | 'Flanged';
  flangeOd?: number;
  flange_od?: number;
  flangeThk?: number;
  flange_thk?: number;
  idType?: 'straight' | 'countersink' | 'Straight' | 'Countersink';
  id_type?: 'straight' | 'countersink' | 'Straight' | 'Countersink';
  csMode?: CSMode;
  cs_mode?: CSMode;
  csDia?: number;
  cs_dia?: number;
  csDepth?: number;
  cs_depth?: number;
  csAngle?: number;
  cs_angle?: number;
  extCsMode?: CSMode;
  ext_cs_mode?: CSMode;
  extCsDia?: number;
  ext_cs_dia?: number;
  extCsDepth?: number;
  ext_cs_depth?: number;
  extCsAngle?: number;
  ext_cs_angle?: number;
  matHousing?: string;
  mat_housing?: string;
  matBushing?: string;
  mat_bushing?: string;
  friction: number;
  dT: number;
  minWallStraight?: number;
  min_wall_straight?: number;
  minWallNeck?: number;
  min_wall_neck?: number;
  // legacy/extended fields
  t1?: number;
  t2?: number;
  housing_surf_len?: number;
  load?: number;
  thetaDeg?: number;
  idCS?: {
    enabled?: boolean;
    defType?: string;
    dia?: number;
    depth?: number;
    angleDeg?: number;
  };
  odCS?: {
    enabled?: boolean;
    defType?: string;
    dia?: number;
    depth?: number;
    angleDeg?: number;
  };
};

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

function toInches(v: number, units: UnitSystem) {
  return units === 'metric' ? v * MM_TO_IN : v;
}

function toPsiFromKsi(v: number) {
  return v * 1000;
}

export function computeBushing(raw: BushingInputs) {
  const units = raw.units ?? 'imperial';

  // Normalize the mixed legacy/current field names and convert geometry to inches so that
  // the solver can stay in psi/inch space (matches the legacy golden baselines).
  const boreDia = toInches(raw.boreDia ?? raw.bore_dia ?? raw.bushOD ?? 0, units);
  const idBushing = toInches(raw.idBushing ?? raw.bushID ?? raw.id_bushing ?? 0, units);
  const housingLen = toInches(
    (raw.housingLen ?? raw.housing_len ?? (raw.t1 ?? 0) + (raw.t2 ?? 0)) || boreDia * 2,
    units
  );
  const edgeDist = toInches(raw.edgeDist ?? raw.edge_dist ?? Math.max(boreDia * 2, 0), units);
  const housingWidth = toInches(
    raw.housingWidth ?? raw.housing_width ?? Math.max(edgeDist * 2, boreDia * 4),
    units
  );
  const flangeOd = toInches(raw.flangeOd ?? raw.flange_od ?? 0, units);
  const flangeThk = toInches(raw.flangeThk ?? raw.flange_thk ?? 0, units);

  const minWallStraight = toInches(raw.minWallStraight ?? raw.min_wall_straight ?? 0.02, units);
  const minWallNeck = toInches(raw.minWallNeck ?? raw.min_wall_neck ?? 0.02, units);

  // Internal countersink (ID)
  const csMode = ((raw.csMode ?? raw.cs_mode ?? raw.idCS?.defType)?.toString().toLowerCase().replace('+', '_') as CSMode) || 'depth_angle';
  const csEnabled = raw.idCS?.enabled ?? (raw.idType ?? raw.id_type)?.toString().toLowerCase() === 'countersink';
  const csDia = toInches(
    raw.csDia ?? raw.cs_dia ?? raw.idCS?.dia ?? raw.boreDia ?? raw.bore_dia ?? idBushing,
    units
  );
  const csDepth = toInches(raw.csDepth ?? raw.cs_depth ?? raw.idCS?.depth ?? 0, units);
  const csAngle = raw.csAngle ?? raw.cs_angle ?? raw.idCS?.angleDeg ?? 100;

  // External countersink (OD / head)
  const extCsMode = ((raw.extCsMode ?? raw.ext_cs_mode ?? raw.odCS?.defType)?.toString().toLowerCase().replace('+', '_') as CSMode) || 'depth_angle';
  const extCsEnabled = raw.odCS?.enabled ?? (raw.bushingType ?? raw.bushing_type)?.toString().toLowerCase() === 'countersink';
  const extCsDia = toInches(
    raw.extCsDia ?? raw.ext_cs_dia ?? raw.odCS?.dia ?? raw.boreDia ?? raw.bore_dia ?? boreDia,
    units
  );
  const extCsDepth = toInches(raw.extCsDepth ?? raw.ext_cs_depth ?? raw.odCS?.depth ?? 0, units);
  const extCsAngle = raw.extCsAngle ?? raw.ext_cs_angle ?? raw.odCS?.angleDeg ?? 100;

  const bushingType = (raw.bushingType ?? raw.bushing_type ?? 'straight').toString().toLowerCase() as BushingInputs['bushingType'];
  const idType = (raw.idType ?? raw.id_type ?? 'straight').toString().toLowerCase() as BushingInputs['idType'];

  const matHousing = getMat(raw.matHousing ?? raw.mat_housing);
  const matBushing = getMat(raw.matBushing ?? raw.mat_bushing);

  const friction = Number.isFinite(raw.friction) ? raw.friction : 0.15;
  const dT = Number.isFinite(raw.dT) ? raw.dT : 0;

  // Thermal delta: use per-°F coefficients and convert °C delta when metric.
  const dT_F = units === 'metric' ? dT * 1.8 : dT;
  const alpha_h = (matHousing.alpha_uF ?? 0) * 1e-6;
  const alpha_b = (matBushing.alpha_uF ?? 0) * 1e-6;

  const deltaThermal = (alpha_b - alpha_h) * boreDia * dT_F;
  const delta = (raw.interference ?? 0) + deltaThermal;
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

  const thetaDeg = raw.thetaDeg ?? 40;
  const th = Math.max(1e-6, Math.abs(thetaDeg)) * (Math.PI / 180);
  const sinTheta = Math.max(1e-6, Math.sin(th));

  const Fbru = toPsiFromKsi(matHousing.Fbru_ksi || matHousing.Sy_ksi || 0);
  const tau = toPsiFromKsi(matHousing.Fsu_ksi || matHousing.Sy_ksi || 0);

  const Fbru_eff = Fbru + 0.8 * pressure; // interaction uplift from legacy
  const e_required_seq = tau > 0 ? (boreDia * Fbru_eff) / (2 * tau * sinTheta) : Infinity;
  const loadForEdge = Number.isFinite(raw.load) ? Number(raw.load) : 1000;
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

  const warnings: string[] = [];
  if (failStraight) warnings.push('Straight wall thickness below minimum.');
  if (failNeck) warnings.push('Neck wall thickness below minimum.');
  if (delta <= 0) warnings.push('Net interference is negative (clearance fit after thermal).');

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
      deltaUser: (raw.interference ?? 0),
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
    warnings
  };
}
