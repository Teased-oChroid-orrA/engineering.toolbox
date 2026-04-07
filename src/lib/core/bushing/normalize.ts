import { MM_TO_IN } from '../units';
import type { BushingInputs, BushingInputsRaw, CSMode, ToleranceMode } from './types';

const toInches = (v: number, units: BushingInputs['units']) => (units === 'metric' ? v * MM_TO_IN : v);
const toMicrometers = (v: number, units: BushingInputs['units']) => (units === 'metric' ? v : v * 0.0254);

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

function normalizeProcessRoute(v: unknown): NonNullable<BushingInputs['processRouteId']> {
  const s = String(v ?? 'press_fit_only').toLowerCase();
  if (s === 'press_fit_finish_ream' || s === 'press-fit-finish-ream') return 'press_fit_finish_ream';
  if (s === 'line_ream_repair' || s === 'line-ream-repair') return 'line_ream_repair';
  if (s === 'thermal_assist_install' || s === 'thermal-assist-install') return 'thermal_assist_install';
  if (s === 'bonded_joint' || s === 'bonded-joint') return 'bonded_joint';
  return 'press_fit_only';
}

function normalizeStandardsBasis(v: unknown): NonNullable<BushingInputs['standardsBasis']> {
  const s = String(v ?? 'shop_default').toLowerCase();
  if (s === 'faa_ac_43_13' || s === 'faa-ac-43-13') return 'faa_ac_43_13';
  if (s === 'nas_ms' || s === 'nas-ms') return 'nas_ms';
  if (s === 'sae_ams' || s === 'sae-ams') return 'sae_ams';
  if (s === 'oem_srm' || s === 'oem-srm') return 'oem_srm';
  return 'shop_default';
}

function normalizeCriticality(v: unknown): NonNullable<BushingInputs['criticality']> {
  const s = String(v ?? 'general').toLowerCase();
  if (s === 'primary_structure' || s === 'primary-structure') return 'primary_structure';
  if (s === 'repair') return 'repair';
  return 'general';
}

function normalizeLoadSpectrum(v: unknown): NonNullable<BushingInputs['loadSpectrum']> {
  const s = String(v ?? 'static').toLowerCase();
  if (s === 'oscillating') return 'oscillating';
  if (s === 'rotating') return 'rotating';
  return 'static';
}

function normalizeLubricationMode(v: unknown): NonNullable<BushingInputs['lubricationMode']> {
  const s = String(v ?? 'dry').toLowerCase();
  if (s === 'greased') return 'greased';
  if (s === 'oiled') return 'oiled';
  if (s === 'solid_film' || s === 'solid-film') return 'solid_film';
  return 'dry';
}

function normalizeContaminationLevel(v: unknown): NonNullable<BushingInputs['contaminationLevel']> {
  const s = String(v ?? 'shop').toLowerCase();
  if (s === 'clean') return 'clean';
  if (s === 'dirty') return 'dirty';
  if (s === 'abrasive') return 'abrasive';
  return 'shop';
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

function normalizeMeasuredDimension(
  raw: Record<string, unknown> | undefined,
  units: BushingInputs['units']
): NonNullable<BushingInputs['measuredPart']>['bore'] | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const actualRaw = Number(raw.actual);
  const tolPlusRaw = Number(raw.tolPlus ?? raw.tol_plus);
  const tolMinusRaw = Number(raw.tolMinus ?? raw.tol_minus);
  const roundnessRaw = Number(raw.roundness);
  const raRaw = Number(raw.ra);
  const actual = Number.isFinite(actualRaw) ? toInches(actualRaw, units) : undefined;
  const tolPlus = Number.isFinite(tolPlusRaw) ? toInches(Math.max(0, tolPlusRaw), units) : undefined;
  const tolMinus = Number.isFinite(tolMinusRaw) ? toInches(Math.max(0, tolMinusRaw), units) : undefined;
  const roundness = Number.isFinite(roundnessRaw) ? toMicrometers(Math.max(0, roundnessRaw), units) : undefined;
  const ra = Number.isFinite(raRaw) ? toMicrometers(Math.max(0, raRaw), units) : undefined;
  if (
    actual === undefined &&
    tolPlus === undefined &&
    tolMinus === undefined &&
    roundness === undefined &&
    ra === undefined
  ) {
    return undefined;
  }
  return { actual, tolPlus, tolMinus, roundness, ra };
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

  const measuredPartRaw = (raw.measuredPart ?? raw.measured_part ?? {}) as Record<string, unknown>;
  const measuredEnabled = normalizeBool(measuredPartRaw.enabled, false);
  const measuredBasis =
    String(measuredPartRaw.basis ?? 'nominal').toLowerCase() === 'measured' ? 'measured' : 'nominal';
  const measuredBore = normalizeMeasuredDimension(measuredPartRaw.bore as Record<string, unknown> | undefined, units);
  const measuredId = normalizeMeasuredDimension(measuredPartRaw.id as Record<string, unknown> | undefined, units);
  const measuredEdgeDistRaw = Number(measuredPartRaw.edgeDist ?? measuredPartRaw.edge_dist);
  const measuredHousingWidthRaw = Number(measuredPartRaw.housingWidth ?? measuredPartRaw.housing_width);
  const measuredEdgeDist = Number.isFinite(measuredEdgeDistRaw) ? toInches(measuredEdgeDistRaw, units) : undefined;
  const measuredHousingWidth = Number.isFinite(measuredHousingWidthRaw) ? toInches(measuredHousingWidthRaw, units) : undefined;
  const measuredNotes = String(measuredPartRaw.notes ?? '').trim() || undefined;

  const measuredPart: BushingInputs['measuredPart'] =
    measuredEnabled || measuredBasis === 'measured' || measuredBore || measuredId || measuredEdgeDist !== undefined || measuredHousingWidth !== undefined || measuredNotes
      ? {
          enabled: measuredEnabled,
          basis: measuredBasis,
          bore: measuredBore,
          id: measuredId,
          edgeDist: measuredEdgeDist,
          housingWidth: measuredHousingWidth,
          notes: measuredNotes
        }
      : undefined;

  const resolvedBoreLower =
    measuredPart?.enabled && measuredPart.basis === 'measured' && Number.isFinite(measuredPart.bore?.actual)
      ? Number(measuredPart.bore?.actual) - Number(measuredPart.bore?.tolMinus ?? 0)
      : boreLower;
  const resolvedBoreUpper =
    measuredPart?.enabled && measuredPart.basis === 'measured' && Number.isFinite(measuredPart.bore?.actual)
      ? Number(measuredPart.bore?.actual) + Number(measuredPart.bore?.tolPlus ?? 0)
      : boreUpper;
  const resolvedBoreNominal =
    measuredPart?.enabled && measuredPart.basis === 'measured' && Number.isFinite(measuredPart.bore?.actual)
      ? Number(measuredPart.bore?.actual)
      : boreNominal;
  const resolvedBoreDia =
    measuredPart?.enabled && measuredPart.basis === 'measured' && Number.isFinite(measuredPart.bore?.actual)
      ? Number(measuredPart.bore?.actual)
      : boreDia;
  const resolvedId =
    measuredPart?.enabled && measuredPart.basis === 'measured' && Number.isFinite(measuredPart.id?.actual)
      ? Number(measuredPart.id?.actual)
      : idBushing;
  const resolvedEdgeDist =
    measuredPart?.enabled && measuredPart.basis === 'measured' && Number.isFinite(measuredPart.edgeDist)
      ? Number(measuredPart.edgeDist)
      : edgeDist;
  const resolvedHousingWidth =
    measuredPart?.enabled && measuredPart.basis === 'measured' && Number.isFinite(measuredPart.housingWidth)
      ? Number(measuredPart.housingWidth)
      : housingWidth;

  return {
    units,
    boreDia: resolvedBoreDia,
    idBushing: resolvedId,
    interference,
    boreTolMode,
    boreNominal: resolvedBoreNominal,
    boreTolPlus,
    boreTolMinus,
    boreLower: resolvedBoreLower,
    boreUpper: resolvedBoreUpper,
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
    housingWidth: resolvedHousingWidth,
    edgeDist: resolvedEdgeDist,
    bushingType: normalizeBushingType(raw.bushingType ?? raw.bushing_type),
    idType: normalizeIdType(raw.idType ?? raw.id_type),
    csMode,
    csDia: toInches(Number(raw.csDia ?? raw.cs_dia ?? raw.idCS?.dia ?? boreDia), units),
    csDepth: toInches(Number(raw.csDepth ?? raw.cs_depth ?? raw.idCS?.depth ?? 0), units),
    csDepthTolPlus: toInches(Math.max(0, Number(raw.csDepthTolPlus ?? raw.cs_depth_tol_plus ?? 0)), units),
    csDepthTolMinus: toInches(Math.max(0, Number(raw.csDepthTolMinus ?? raw.cs_depth_tol_minus ?? 0)), units),
    csAngle: Number(raw.csAngle ?? raw.cs_angle ?? raw.idCS?.angleDeg ?? 100),
    extCsMode,
    extCsDia: toInches(Number(raw.extCsDia ?? raw.ext_cs_dia ?? raw.odCS?.dia ?? boreDia), units),
    extCsDepth: toInches(Number(raw.extCsDepth ?? raw.ext_cs_depth ?? raw.odCS?.depth ?? 0), units),
    extCsDepthTolPlus: toInches(Math.max(0, Number(raw.extCsDepthTolPlus ?? raw.ext_cs_depth_tol_plus ?? 0)), units),
    extCsDepthTolMinus: toInches(Math.max(0, Number(raw.extCsDepthTolMinus ?? raw.ext_cs_depth_tol_minus ?? 0)), units),
    extCsAngle: Number(raw.extCsAngle ?? raw.ext_cs_angle ?? raw.odCS?.angleDeg ?? 100),
    flangeDia: raw.flangeDia,
    flangeOd: toInches(Number(raw.flangeOd ?? raw.flange_od ?? raw.flangeDia ?? 0), units),
    flangeThk: toInches(Number(raw.flangeThk ?? raw.flange_thk ?? 0), units),
    matHousing: String(raw.matHousing ?? raw.mat_housing ?? 'al7075'),
    matBushing: String(raw.matBushing ?? raw.mat_bushing ?? 'bronze'),
    friction: Number(raw.friction ?? 0.15),
    dT: Number(raw.dT ?? 0),
    assemblyHousingTemperature: Number.isFinite(Number(raw.assemblyHousingTemperature ?? raw.assembly_housing_temperature))
      ? Number(raw.assemblyHousingTemperature ?? raw.assembly_housing_temperature)
      : undefined,
    assemblyBushingTemperature: Number.isFinite(Number(raw.assemblyBushingTemperature ?? raw.assembly_bushing_temperature))
      ? Number(raw.assemblyBushingTemperature ?? raw.assembly_bushing_temperature)
      : undefined,
    processRouteId: normalizeProcessRoute(raw.processRouteId ?? raw.process_route_id ?? (raw.finishReamAllowance ?? raw.finish_ream_allowance ? 'press_fit_finish_ream' : undefined)),
    standardsBasis: normalizeStandardsBasis(raw.standardsBasis ?? raw.standards_basis),
    standardsRevision: String(raw.standardsRevision ?? raw.standards_revision ?? '').trim(),
    processSpec: String(raw.processSpec ?? raw.process_spec ?? '').trim(),
    approvalNotes: String(raw.approvalNotes ?? raw.approval_notes ?? '').trim(),
    criticality: normalizeCriticality(raw.criticality),
    minWallStraight: toInches(Number(raw.minWallStraight ?? raw.min_wall_straight ?? 0.05), units),
    minWallNeck: toInches(Number(raw.minWallNeck ?? raw.min_wall_neck ?? 0.04), units),
    endConstraint: normalizeEndConstraint(raw.endConstraint ?? raw.end_constraint),
    load: raw.load == null ? undefined : Number(raw.load),
    edgeLoadAngleDeg: Number(raw.edgeLoadAngleDeg ?? raw.edge_load_angle_deg ?? raw.failure_plane_angle_deg ?? raw.thetaDeg ?? 40),
    serviceTemperatureHot: Number.isFinite(Number(raw.serviceTemperatureHot ?? raw.service_temperature_hot))
      ? Number(raw.serviceTemperatureHot ?? raw.service_temperature_hot)
      : undefined,
    serviceTemperatureCold: Number.isFinite(Number(raw.serviceTemperatureCold ?? raw.service_temperature_cold))
      ? Number(raw.serviceTemperatureCold ?? raw.service_temperature_cold)
      : undefined,
    finishReamAllowance: toInches(Number(raw.finishReamAllowance ?? raw.finish_ream_allowance ?? 0), units),
    wearAllowance: toInches(Number(raw.wearAllowance ?? raw.wear_allowance ?? 0), units),
    loadSpectrum: normalizeLoadSpectrum(raw.loadSpectrum ?? raw.load_spectrum),
    oscillationAngleDeg: Number(raw.oscillationAngleDeg ?? raw.oscillation_angle_deg ?? 20),
    oscillationFreqHz: Number(raw.oscillationFreqHz ?? raw.oscillation_freq_hz ?? 0),
    dutyCyclePct: Number(raw.dutyCyclePct ?? raw.duty_cycle_pct ?? 60),
    lubricationMode: normalizeLubricationMode(raw.lubricationMode ?? raw.lubrication_mode),
    contaminationLevel: normalizeContaminationLevel(raw.contaminationLevel ?? raw.contamination_level),
    surfaceRoughnessRaUm: Number(raw.surfaceRoughnessRaUm ?? raw.surface_roughness_ra_um ?? 0.8),
    shaftHardnessHrc: Number(raw.shaftHardnessHrc ?? raw.shaft_hardness_hrc ?? 38),
    misalignmentDeg: Number(raw.misalignmentDeg ?? raw.misalignment_deg ?? 0.05),
    idCS: raw.idCS,
    odCS: raw.odCS,
    measuredPart
  };
}
