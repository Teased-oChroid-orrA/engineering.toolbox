import type { MaterialProps } from './types';
import type { BushingInputs } from './types';
import type {
  BushingApprovalReview,
  BushingDutyScreen,
  BushingOutput,
  BushingProcessReview,
  BushingServiceState
} from './outputTypes';
import { clamp } from './solveMath';
import {
  BUSHING_CONTAMINATION_HINTS,
  BUSHING_CRITICALITY_HINTS,
  BUSHING_LUBRICATION_HINTS,
  getBushingProcessRoute,
  getStandardsRefs
} from './processLibrary';

const PSI_TO_MPA = 0.006894757;
const IN_TO_M = 0.0254;
const REFERENCE_TEMP_IMPERIAL = 70;
const REFERENCE_TEMP_METRIC = 20;
const SERVICE_GAP_THRESHOLD_IN = 0.00005;
const CLOSURE_FACTOR = 0.3;
const PRESSURE_TO_CLOSURE_DIVISOR = 20_000_000;
const UM_TO_UIN = 39.37007874015748;

function temperatureDeltaToF(value: number | undefined, units: BushingInputs['units']): number | null {
  if (!Number.isFinite(Number(value))) return null;
  const ref = units === 'metric' ? REFERENCE_TEMP_METRIC : REFERENCE_TEMP_IMPERIAL;
  const delta = Number(value) - ref;
  return units === 'metric' ? delta * 1.8 : delta;
}

function hasAssemblyTemperatures(input: BushingInputs): boolean {
  return Number.isFinite(Number(input.assemblyHousingTemperature)) || Number.isFinite(Number(input.assemblyBushingTemperature));
}

function thermalShiftInches(
  boreDia: number,
  deltaTempF: number,
  matHousing: Pick<MaterialProps, 'alpha_uF'>,
  matBushing: Pick<MaterialProps, 'alpha_uF'>
): number {
  return (matBushing.alpha_uF - matHousing.alpha_uF) * 1e-6 * boreDia * deltaTempF;
}

function fitClassFor(effectiveInterference: number): BushingServiceState['fitClass'] {
  if (effectiveInterference < -SERVICE_GAP_THRESHOLD_IN) return 'clearance';
  if (Math.abs(effectiveInterference) <= SERVICE_GAP_THRESHOLD_IN) return 'transition';
  return 'interference';
}

function wearRiskFor(score: number): BushingDutyScreen['wearRisk'] {
  if (score >= 75) return 'severe';
  if (score >= 50) return 'high';
  if (score >= 25) return 'moderate';
  return 'low';
}

function serviceLoadLbf(input: BushingInputs, pressurePsi: number): number {
  if (Number.isFinite(input.load as number) && Number(input.load) > 0) return Number(input.load);
  const area = Math.max(input.boreDia * input.housingLen, 1e-9);
  return Math.max(pressurePsi * area * 0.25, 0);
}

function computeSlidingVelocityMps(input: BushingInputs): number {
  const dutyFactor = clamp((Number(input.dutyCyclePct ?? 100) || 0) / 100, 0, 1);
  const freqHz = Math.max(0, Number(input.oscillationFreqHz ?? 0));
  const angleDeg = Math.max(0, Number(input.oscillationAngleDeg ?? 0));
  const diameterMeters = Math.max(0, input.boreDia) * IN_TO_M;
  if (input.loadSpectrum === 'static') return 0;
  if (input.loadSpectrum === 'rotating') {
    return Math.PI * diameterMeters * freqHz * dutyFactor;
  }
  const angleRad = (angleDeg * Math.PI) / 180;
  return diameterMeters * angleRad * freqHz * dutyFactor;
}

function basePvLimit(lubrication: BushingInputs['lubricationMode']): number {
  switch (lubrication) {
    case 'dry':
      return 0.45;
    case 'oiled':
      return 1.15;
    case 'solid_film':
      return 0.95;
    case 'greased':
    default:
      return 0.8;
  }
}

function contaminationFactor(level: BushingInputs['contaminationLevel']): number {
  switch (level) {
    case 'shop':
      return 0.86;
    case 'dirty':
      return 0.68;
    case 'abrasive':
      return 0.5;
    case 'clean':
    default:
      return 1;
  }
}

function roughnessFactor(raUm: number | undefined): number {
  const ra = Number.isFinite(Number(raUm)) ? Number(raUm) : 1.6;
  return clamp(1.15 - Math.max(0, ra - 1.6) * 0.09 - Math.max(0, 1.6 - ra) * 0.01, 0.55, 1.2);
}

function hardnessFactor(hrc: number | undefined): number {
  const hardness = Number.isFinite(Number(hrc)) ? Number(hrc) : 32;
  return clamp(1.1 - Math.max(0, 36 - hardness) * 0.03, 0.6, 1.1);
}

function misalignmentFactor(misalignmentDeg: number | undefined): number {
  const value = Math.abs(Number(misalignmentDeg ?? 0));
  return clamp(1 - value * 0.08, 0.6, 1);
}

function temperatureFactor(input: BushingInputs): number {
  const hotDeltaF = temperatureDeltaToF(input.serviceTemperatureHot, input.units);
  if (hotDeltaF == null) return 1;
  return clamp(1 - Math.max(0, hotDeltaF - 80) * 0.0015, 0.75, 1);
}

function scoreDrivers(items: Array<{ label: string; score: number }>): string[] {
  return [...items]
    .sort((a, b) => b.score - a.score)
    .filter((item) => item.score > 0.5)
    .slice(0, 3)
    .map((item) => item.label);
}

function finishText(raUm: number, units: BushingInputs['units']): string {
  if (units === 'metric') return `${raUm.toFixed(2)} um`;
  return `${(raUm * UM_TO_UIN).toFixed(0)} uin`;
}

function roundnessText(roundnessUm: number, units: BushingInputs['units']): string {
  if (units === 'metric') return `${roundnessUm.toFixed(0)} um`;
  return `${(roundnessUm * UM_TO_UIN).toFixed(0)} uin`;
}

function buildState(
  id: BushingServiceState['id'],
  label: string,
  effectiveInterference: number,
  allowance: number,
  basePressure: number,
  baseEffectiveInterference: number,
  freeId: number,
  note: string
): BushingServiceState {
  const scale = baseEffectiveInterference > 1e-9 ? clamp(Math.max(effectiveInterference, 0) / baseEffectiveInterference, 0, 1.5) : 0;
  const contactPressure = Math.max(0, basePressure * scale);
  const closureEstimate = clamp(
    CLOSURE_FACTOR * Math.max(effectiveInterference, 0) + contactPressure / PRESSURE_TO_CLOSURE_DIVISOR,
    0,
    freeId * 0.08
  );
  const idChangeFromFree = closureEstimate - allowance;
  const projectedId = Math.max(0, freeId - idChangeFromFree);
  return {
    id,
    label,
    effectiveInterference,
    contactPressure,
    projectedId,
    idChangeFromFree,
    fitClass: fitClassFor(effectiveInterference),
    note
  };
}

export function buildBushingDecisionSupport(ctx: {
  input: BushingInputs;
  matHousing: Pick<MaterialProps, 'alpha_uF'>;
  matBushing: Pick<MaterialProps, 'alpha_uF'>;
  boreDia: number;
  freeId: number;
  baseEffectiveInterference: number;
  basePressure: number;
  installForce: number;
  retainedInstallForce: number;
}): {
  serviceEnvelope: BushingOutput['serviceEnvelope'];
  dutyScreen: BushingOutput['dutyScreen'];
  process: BushingOutput['process'];
  review: BushingOutput['review'];
} {
  const { input, matHousing, matBushing, boreDia, freeId, baseEffectiveInterference, basePressure, installForce, retainedInstallForce } = ctx;
  const route = getBushingProcessRoute(input.processRouteId);
  const finishReamAllowance = Math.max(0, Number(input.finishReamAllowance ?? 0));
  const wearAllowance = Math.max(0, Number(input.wearAllowance ?? 0));
  const baseDeltaF =
    input.units === 'metric' ? Number(input.dT ?? 0) * 1.8 : Number(input.dT ?? 0);
  const hotDeltaF =
    temperatureDeltaToF(input.serviceTemperatureHot, input.units) ??
    Math.max(baseDeltaF, 0);
  const coldDeltaF =
    temperatureDeltaToF(input.serviceTemperatureCold, input.units) ??
    -Math.max(baseDeltaF, 0);

  const installedState = buildState(
    'installed',
    'Installed',
    baseEffectiveInterference,
    0,
    basePressure,
    baseEffectiveInterference,
    freeId,
    'Baseline installed condition at the current thermal state.'
  );
  const hotState = buildState(
    'hot',
    'Hot Service',
    baseEffectiveInterference + thermalShiftInches(boreDia, hotDeltaF, matHousing, matBushing),
    0,
    basePressure,
    baseEffectiveInterference,
    freeId,
    'Hot service reduces the fit margin when the housing expands faster than the bushing.'
  );
  const coldState = buildState(
    'cold',
    'Cold Service',
    baseEffectiveInterference + thermalShiftInches(boreDia, coldDeltaF, matHousing, matBushing),
    0,
    basePressure,
    baseEffectiveInterference,
    freeId,
    'Cold service usually increases closure for aluminum housings against bronze or steel bushings.'
  );
  const finishMachinedState = buildState(
    'finish_reamed',
    'Finish Reamed',
    baseEffectiveInterference - finishReamAllowance,
    finishReamAllowance,
    basePressure,
    baseEffectiveInterference,
    freeId,
    finishReamAllowance > 0
      ? 'Finish machining allowance is applied as a diametral correction after press fit.'
      : 'No finish machining allowance entered; this state mirrors the installed fit.'
  );
  const wornState = buildState(
    'worn',
    'Worn Service',
    baseEffectiveInterference - wearAllowance,
    wearAllowance,
    basePressure,
    baseEffectiveInterference,
    freeId,
    wearAllowance > 0
      ? 'Wear allowance opens the running ID over time and can shift the fit toward clearance.'
      : 'No wear allowance entered; this state mirrors the installed fit.'
  );
  const freeState: BushingServiceState = {
    id: 'free',
    label: 'Free State',
    effectiveInterference: 0,
    contactPressure: 0,
    projectedId: freeId,
    idChangeFromFree: 0,
    fitClass: 'clearance',
    note: 'Unassembled reference condition with no interference closure.'
  };

  const states = [freeState, installedState, hotState, coldState, finishMachinedState, wornState];
  const governingState = states
    .filter((state) => state.id !== 'free')
    .sort((a, b) => {
    const rank = { clearance: 0, transition: 1, interference: 2 } as const;
    const classDelta = rank[a.fitClass] - rank[b.fitClass];
    if (classDelta !== 0) return classDelta;
    if (Math.abs(a.effectiveInterference - b.effectiveInterference) > 1e-9) {
      return a.effectiveInterference - b.effectiveInterference;
    }
    return b.contactPressure - a.contactPressure;
  })[0] ?? installedState;

  const processRouteNotes = [...route.notes];
  if (finishReamAllowance > 0) {
    processRouteNotes.push('Finish-ream allowance is tracked as a diametral service correction.');
  }
  if (route.finishMachiningRequired || finishReamAllowance > 0) {
    processRouteNotes.push('Finish machining is required or strongly preferred for this route.');
  }
  if (route.thermalAssistRecommended) {
    processRouteNotes.push('Thermal assist is part of the selected route default.');
  }
  if (hasAssemblyTemperatures(input)) {
    processRouteNotes.push('Install-state interference is reduced using the entered housing and bushing assembly temperatures before equilibrium.');
  } else if (route.id === 'thermal_assist_install') {
    processRouteNotes.push('No explicit assembly temperatures were entered; install-force guidance falls back to the selected route factors.');
  }
  if (retainedInstallForce > 3000) {
    processRouteNotes.push('Press capacity should be reviewed against the calculated install-force band.');
  }

  const serviceLoad = serviceLoadLbf(input, basePressure);
  const specificLoadPsi = serviceLoad / Math.max(boreDia * input.housingLen, 1e-9);
  const specificLoadMpa = specificLoadPsi * PSI_TO_MPA;
  const slidingVelocityMps = computeSlidingVelocityMps(input);
  const pv = specificLoadPsi * slidingVelocityMps;

  const pvLimit =
    basePvLimit(input.lubricationMode) *
    contaminationFactor(input.contaminationLevel) *
    roughnessFactor(input.surfaceRoughnessRaUm) *
    hardnessFactor(input.shaftHardnessHrc) *
    misalignmentFactor(input.misalignmentDeg) *
    temperatureFactor(input);
  const pvUtilization = pvLimit > 0 ? pv / pvLimit : 0;

  const contamination = input.contaminationLevel ?? 'clean';
  const lubrication = input.lubricationMode ?? 'greased';
  const roughness = Number.isFinite(Number(input.surfaceRoughnessRaUm)) ? Number(input.surfaceRoughnessRaUm) : 1.6;
  const hardness = Number.isFinite(Number(input.shaftHardnessHrc)) ? Number(input.shaftHardnessHrc) : 32;
  const misalignment = Math.abs(Number(input.misalignmentDeg ?? 0));
  const utilizationScore = clamp(Math.max(0, pvUtilization) * 35, 0, 60);
  const contaminationScore =
    contamination === 'abrasive' ? 25 : contamination === 'dirty' ? 18 : contamination === 'shop' ? 8 : 0;
  const roughnessScore = clamp(Math.max(0, roughness - 1.6) * 9, 0, 16);
  const hardnessScore = clamp(Math.max(0, 34 - hardness) * 2.2, 0, 14);
  const misalignmentScore = clamp(misalignment * 8, 0, 14);
  const spectrumScore = input.loadSpectrum === 'static' ? 0 : input.loadSpectrum === 'oscillating' ? 4 : 8;
  const riskScore = clamp(
    utilizationScore + contaminationScore + roughnessScore + hardnessScore + misalignmentScore + spectrumScore,
    0,
    100
  );
  const wearRisk = wearRiskFor(riskScore);
  const lifeBase =
    lubrication === 'dry' ? 12_000 : lubrication === 'greased' ? 30_000 : lubrication === 'oiled' ? 45_000 : 22_000;
  const lifeEstimateHours =
    pv <= 0 || specificLoadPsi <= 0
      ? null
      : Math.max(250, Math.round((lifeBase * contaminationFactor(contamination)) / (1 + riskScore / 42 + Math.max(0, pvUtilization - 1) * 1.6)));

  const dominantDrivers = scoreDrivers([
    { label: `PV utilization ${pvUtilization.toFixed(2)}x limit`, score: utilizationScore },
    { label: BUSHING_CONTAMINATION_HINTS[contamination], score: contaminationScore },
    { label: `Surface roughness Ra ${finishText(roughness, input.units)}`, score: roughnessScore },
    { label: `Shaft hardness ${hardness.toFixed(0)} HRC`, score: hardnessScore },
    { label: `Misalignment ${misalignment.toFixed(2)} deg`, score: misalignmentScore },
    { label: BUSHING_LUBRICATION_HINTS[lubrication], score: spectrumScore + (lubrication === 'dry' ? 6 : 0) }
  ]);

  const dutyScreen: BushingDutyScreen = {
    loadSpectrum: input.loadSpectrum ?? 'static',
    lubricationMode: lubrication,
    contaminationLevel: contamination,
    specificLoadPsi,
    specificLoadMpa,
    slidingVelocityMps,
    pv,
    pvLimit,
    pvUtilization,
    wearRisk,
    riskScore,
    dominantDrivers,
    lifeEstimateHours
  };

  const finishMachiningRequired = Boolean(route.finishMachiningRequired || finishReamAllowance > 0);
  const thermalAssistRecommended = Boolean(route.thermalAssistRecommended || retainedInstallForce > 3000);
  const assemblyThermalAssistActive = hasAssemblyTemperatures(input);
  const installBandFactors =
    route.id === 'thermal_assist_install' && assemblyThermalAssistActive
      ? { low: 0.9, high: 1.1 }
      : route.installForceBand;
  const process: BushingProcessReview = {
    routeId: route.id,
    routeLabel: route.label,
    toleranceClass: route.toleranceClass,
    recommendedRaUm: route.recommendedRaUm,
    roundnessTargetUm: route.roundnessTargetUm,
    finishMachiningRequired,
    thermalAssistRecommended,
    assemblyThermalAssistActive,
    installForceBand: {
      low: installForce * installBandFactors.low,
      nominal: installForce,
      high: installForce * installBandFactors.high
    },
    removalForce: retainedInstallForce * route.removalForceFactor,
    notes: processRouteNotes
  };

  const basis = input.standardsBasis ?? 'shop_default';
  const revision = String(input.standardsRevision ?? '').trim() || (basis === 'faa_ac_43_13' ? 'AC 43.13-1B' : 'current');
  const processSpec = String(input.processSpec ?? '').trim() || route.label;
  const criticality = input.criticality ?? 'general';
  const serviceClearance = states.some(
    (state) => state.id !== 'free' && state.fitClass === 'clearance' && state.effectiveInterference < -SERVICE_GAP_THRESHOLD_IN
  );
  const approvalRequired =
    criticality !== 'general' ||
    basis !== 'shop_default' ||
    process.finishMachiningRequired ||
    dutyScreen.wearRisk !== 'low' ||
    serviceClearance ||
    pvUtilization > 0.75;
  const decision: BushingApprovalReview['decision'] =
    serviceClearance || dutyScreen.wearRisk === 'severe' || pvUtilization > 1.25 ? 'hold' : approvalRequired ? 'review' : 'pass';

  const traceabilityRefs = [
    ...getStandardsRefs(basis),
    `Process route: ${route.label}`,
    `Process spec: ${processSpec}`,
    `Standards revision: ${revision}`,
    `Criticality: ${criticality}`
  ];
  if (String(input.approvalNotes ?? '').trim()) {
    traceabilityRefs.push(`Approval notes recorded: ${String(input.approvalNotes).trim().slice(0, 120)}`);
  }
  if (input.measuredPart?.enabled && input.measuredPart?.basis === 'measured') {
    traceabilityRefs.push('Measured-part basis applied where actual bore / ID / geometry values were entered.');
  }
  traceabilityRefs.push(`Service envelope governed by ${governingState.label}`);
  traceabilityRefs.push(`Duty screen risk: ${wearRisk}`);

  const assumptions = [
    'Service-state envelope uses a screening-level linear thermal shift and pressure-scaled ID closure estimate.',
    'Finish-ream and wear allowances are treated as diametral corrections against the free-state ID.',
    'PV screening is approximate and intended to flag high-risk combinations, not replace bearing selection tables.',
    'Omitted service load falls back to a contact-pressure proxy when required for screening.',
    input.measuredPart?.enabled && input.measuredPart?.basis === 'measured'
      ? 'Measured-part mode overrides nominal geometry only where actual values were entered; missing fields remain on design intent.'
      : 'Measured-part mode not active; nominal/design intent values govern the solve.',
    `Guidance basis: ${BUSHING_CRITICALITY_HINTS[criticality]}`,
    `Surface finish target: Ra ${finishText(route.recommendedRaUm, input.units)} with roundness target ${roundnessText(route.roundnessTargetUm, input.units)}.`,
    String(input.approvalNotes ?? '').trim() ? `Approval notes captured: ${String(input.approvalNotes).trim()}` : 'No approval notes were provided.'
  ];

  const review: BushingApprovalReview = {
    standardsBasis: basis,
    standardsRevision: revision,
    processSpec,
    criticality,
    approvalRequired,
    decision,
    traceabilityRefs,
    assumptions
  };

  return {
    serviceEnvelope: {
      states,
      governingStateId: governingState.id,
      governingStateLabel: governingState.label,
      finishMachiningRequired
    },
    dutyScreen,
    process,
    review
  };
}
