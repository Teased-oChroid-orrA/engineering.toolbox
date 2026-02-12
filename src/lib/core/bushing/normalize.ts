import { MM_TO_IN } from '../units';
import type { BushingInputs, BushingInputsRaw, CSMode, ToleranceMode } from './types';

const toInches = (v: number, units: BushingInputs['units']) => (units === 'metric' ? v * MM_TO_IN : v);

function normalizeMode(v: unknown, fallback: CSMode): CSMode {
  const s = String(v ?? '').toLowerCase().replace('+', '_');
  if (s === 'depth_angle' || s === 'dia_angle' || s === 'dia_depth') return s;
  return fallback;
}

function normalizeBushingType(v: unknown): BushingInputs['bushingType'] {
  const s = String(v ?? 'straight').toLowerCase();
  if (s.includes('flanged')) return 'flanged';
  if (s.includes('countersink')) return 'countersink';
  return 'straight';
}

function normalizeIdType(v: unknown): BushingInputs['idType'] {
  const s = String(v ?? 'straight').toLowerCase();
  return s.includes('countersink') ? 'countersink' : 'straight';
}

function normalizeToleranceMode(v: unknown): ToleranceMode {
  const s = String(v ?? '').toLowerCase();
  return s === 'limits' ? 'limits' : 'nominal_tol';
}

function normalizeEndConstraint(v: unknown): NonNullable<BushingInputs['endConstraint']> {
  const s = String(v ?? 'free').toLowerCase();
  if (s === 'one_end' || s === 'one-end' || s === 'one end') return 'one_end';
  if (s === 'both_ends' || s === 'both-ends' || s === 'both ends') return 'both_ends';
  return 'free';
}

function normalizeBool(v: unknown, fallback: boolean): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (s === 'true' || s === '1' || s === 'yes' || s === 'on') return true;
    if (s === 'false' || s === '0' || s === 'no' || s === 'off') return false;
  }
  return fallback;
}

function normalizeCapabilityMode(v: unknown): NonNullable<BushingInputs['boreCapability']>['mode'] {
  const s = String(v ?? '').toLowerCase();
  if (s === 'reamer_fixed' || s === 'reamer-fixed' || s === 'reamer fixed') return 'reamer_fixed';
  if (s === 'adjustable') return 'adjustable';
  return 'unspecified';
}

export function normalizeBushingInputs(raw: BushingInputsRaw): BushingInputs {
  const units: BushingInputs['units'] = raw.units === 'metric' ? 'metric' : 'imperial';
  const boreTolMode = normalizeToleranceMode(raw.boreTolMode ?? raw.bore_tol_mode);
  const boreNominalRaw = Number(raw.boreNominal ?? raw.bore_nominal ?? raw.boreDia ?? raw.bore_dia ?? raw.bushOD ?? 0.5);
  const boreTolPlusRaw = Math.max(0, Number(raw.boreTolPlus ?? raw.bore_tol_plus ?? 0));
  const boreTolMinusRaw = Math.max(0, Number(raw.boreTolMinus ?? raw.bore_tol_minus ?? 0));
  const boreLowerRaw = Number(raw.boreLower ?? raw.bore_lower ?? (boreNominalRaw - boreTolMinusRaw));
  const boreUpperRaw = Number(raw.boreUpper ?? raw.bore_upper ?? (boreNominalRaw + boreTolPlusRaw));
  const boreNominal = toInches(boreNominalRaw, units);
  const boreTolPlus = toInches(boreTolPlusRaw, units);
  const boreTolMinus = toInches(boreTolMinusRaw, units);
  const boreLower = toInches(Math.min(boreLowerRaw, boreUpperRaw), units);
  const boreUpper = toInches(Math.max(boreLowerRaw, boreUpperRaw), units);
  const boreDia = boreTolMode === 'limits' ? (boreLower + boreUpper) / 2 : boreNominal;

  const interferenceTolMode = normalizeToleranceMode(raw.interferenceTolMode ?? raw.interference_tol_mode);
  const interferenceNominalRaw = Number(raw.interferenceNominal ?? raw.interference_nominal ?? raw.interference ?? 0);
  const interferenceTolPlusRaw = Math.max(0, Number(raw.interferenceTolPlus ?? raw.interference_tol_plus ?? 0));
  const interferenceTolMinusRaw = Math.max(0, Number(raw.interferenceTolMinus ?? raw.interference_tol_minus ?? 0));
  const interferenceLowerRaw = Number(raw.interferenceLower ?? raw.interference_lower ?? (interferenceNominalRaw - interferenceTolMinusRaw));
  const interferenceUpperRaw = Number(raw.interferenceUpper ?? raw.interference_upper ?? (interferenceNominalRaw + interferenceTolPlusRaw));
  const interferenceNominal = interferenceNominalRaw;
  const interferenceTolPlus = interferenceTolPlusRaw;
  const interferenceTolMinus = interferenceTolMinusRaw;
  const interferenceLower = Math.min(interferenceLowerRaw, interferenceUpperRaw);
  const interferenceUpper = Math.max(interferenceLowerRaw, interferenceUpperRaw);
  const interference = interferenceTolMode === 'limits' ? (interferenceLower + interferenceUpper) / 2 : interferenceNominal;

  const idBushing = toInches(Number(raw.idBushing ?? raw.bushID ?? raw.id_bushing ?? 0.375), units);
  const housingLen = toInches(
    Number((raw.housingLen ?? raw.housing_len ?? ((raw.t1 ?? 0) + (raw.t2 ?? 0))) || 0.5),
    units
  );
  const edgeDist = toInches(Number(raw.edgeDist ?? raw.edge_dist ?? 0.75), units);
  const housingWidth = toInches(Number(raw.housingWidth ?? raw.housing_width ?? Math.max(edgeDist * 2, boreDia * 4)), units);

  const csMode = normalizeMode(raw.csMode ?? raw.cs_mode ?? raw.idCS?.defType, 'depth_angle');
  const extCsMode = normalizeMode(raw.extCsMode ?? raw.ext_cs_mode ?? raw.odCS?.defType, 'depth_angle');
  const policyRaw = (raw.interferencePolicy ?? raw.interference_policy ?? {}) as Record<string, unknown>;
  const capabilityRaw = (raw.boreCapability ?? raw.bore_capability ?? {}) as Record<string, unknown>;

  const interferencePolicy: BushingInputs['interferencePolicy'] = {
    enabled: normalizeBool(
      policyRaw.enabled ?? raw.enforceInterferenceTolerance ?? raw.enforce_interference_tolerance,
      false
    ),
    lockBore: normalizeBool(
      policyRaw.lockBore ?? policyRaw.lock_bore ?? raw.lockBoreForInterference ?? raw.lock_bore_for_interference,
      true
    ),
    preserveBoreNominal: normalizeBool(policyRaw.preserveBoreNominal ?? policyRaw.preserve_bore_nominal, true),
    allowBoreNominalShift: normalizeBool(policyRaw.allowBoreNominalShift ?? policyRaw.allow_bore_nominal_shift, false),
    maxBoreNominalShift: Number.isFinite(Number(policyRaw.maxBoreNominalShift ?? policyRaw.max_bore_nominal_shift))
      ? toInches(Math.max(0, Number(policyRaw.maxBoreNominalShift ?? policyRaw.max_bore_nominal_shift)), units)
      : undefined
  };

  const minAchievableTolWidthRaw = Number(capabilityRaw.minAchievableTolWidth ?? capabilityRaw.min_achievable_tol_width);
  const maxRecommendedTolWidthRaw = Number(capabilityRaw.maxRecommendedTolWidth ?? capabilityRaw.max_recommended_tol_width);
  const boreCapability: BushingInputs['boreCapability'] = {
    mode: normalizeCapabilityMode(capabilityRaw.mode),
    minAchievableTolWidth: Number.isFinite(minAchievableTolWidthRaw)
      ? toInches(Math.max(0, minAchievableTolWidthRaw), units)
      : undefined,
    maxRecommendedTolWidth: Number.isFinite(maxRecommendedTolWidthRaw)
      ? toInches(Math.max(0, maxRecommendedTolWidthRaw), units)
      : undefined,
    preferredItClass: String(capabilityRaw.preferredItClass ?? capabilityRaw.preferred_it_class ?? '').trim() || undefined
  };
  if (boreCapability.mode === 'reamer_fixed') {
    interferencePolicy.lockBore = true;
  }

  return {
    units,
    boreDia,
    idBushing,
    interference,
    boreTolMode,
    boreNominal,
    boreTolPlus,
    boreTolMinus,
    boreLower,
    boreUpper,
    interferenceTolMode,
    interferenceNominal,
    interferenceTolPlus,
    interferenceTolMinus,
    interferenceLower,
    interferenceUpper,
    interferencePolicy,
    boreCapability,
    // Legacy mirrors, kept while UI migrates to policy object.
    enforceInterferenceTolerance: Boolean(interferencePolicy.enabled),
    lockBoreForInterference: Boolean(interferencePolicy.lockBore),
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
    endConstraint: normalizeEndConstraint(raw.endConstraint ?? raw.end_constraint),
    load: raw.load == null ? undefined : Number(raw.load),
    thetaDeg: raw.thetaDeg == null ? undefined : Number(raw.thetaDeg),
    idCS: raw.idCS,
    odCS: raw.odCS
  };
}
