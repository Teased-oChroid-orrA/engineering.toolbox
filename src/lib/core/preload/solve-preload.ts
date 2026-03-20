import { evaluateStructuralChecks } from './checks';
import { evaluateServicePreloadRetention } from './retention';
import { solveJointStiffness } from './stiffness';
import { buildJointAssemblyInput } from './assembly';
import type {
  CheckEnvelope,
  DecisionSupportResult,
  EnvelopeScenarioLabel,
  ExactTorqueTerms,
  FastenedJointPreloadInput,
  FastenedJointPreloadOutput,
  InstallationUncertaintyInput,
  InstallationUncertaintyResult,
  InstallationInput,
  InstallationResult,
  PreloadInverseTargetResult,
  PreloadScenarioVariant
} from './types';

const DEG_TO_RAD = Math.PI / 180;

function assertPositive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a finite positive number.`);
  }
}

function buildExactTorqueTerms(input: Extract<InstallationInput, { model: 'exact_torque' }>): ExactTorqueTerms {
  assertPositive('threadPitch', input.threadPitch);
  assertPositive('threadPitchDiameter', input.threadPitchDiameter);
  assertPositive('bearingMeanDiameter', input.bearingMeanDiameter);
  if (!Number.isFinite(input.threadFrictionCoeff) || input.threadFrictionCoeff < 0) {
    throw new Error('threadFrictionCoeff must be a finite non-negative number.');
  }
  if (!Number.isFinite(input.bearingFrictionCoeff) || input.bearingFrictionCoeff < 0) {
    throw new Error('bearingFrictionCoeff must be a finite non-negative number.');
  }

  const halfAngleRad = input.threadHalfAngleDeg * DEG_TO_RAD;
  const secThreadHalfAngle = 1 / Math.cos(halfAngleRad);
  const leadAngleRad = Math.atan(input.threadPitch / (Math.PI * input.threadPitchDiameter));
  const frictionFactor = input.threadFrictionCoeff * secThreadHalfAngle;
  const threadFrictionAngleRad = Math.atan(frictionFactor);

  const tanLead = Math.tan(leadAngleRad);
  const denominator = 1 - frictionFactor * tanLead;
  if (denominator <= 0) {
    throw new Error('Thread torque denominator is non-physical; reduce friction or lead angle.');
  }

  const threadTorquePerUnitPreload =
    (input.threadPitchDiameter / 2) * ((tanLead + frictionFactor) / denominator);
  const bearingTorquePerUnitPreload = input.bearingFrictionCoeff * (input.bearingMeanDiameter / 2);
  const totalTorquePerUnitPreload = threadTorquePerUnitPreload + bearingTorquePerUnitPreload;

  return {
    leadAngleRad,
    threadFrictionAngleRad,
    secThreadHalfAngle,
    threadTorquePerUnitPreload,
    bearingTorquePerUnitPreload,
    preloadPerAppliedTorque: 1 / totalTorquePerUnitPreload
  };
}

function buildInstallationUncertainty(
  scatterPercent: number | undefined,
  uncertainty: InstallationUncertaintyInput | undefined
): InstallationUncertaintyResult {
  const legacyScatterPercent = Math.max(0, Number(uncertainty?.legacyScatterPercent ?? scatterPercent ?? 0));
  const toolAccuracyPercent = Math.max(0, Number(uncertainty?.toolAccuracyPercent ?? 0));
  const threadFrictionPercent = Math.max(0, Number(uncertainty?.threadFrictionPercent ?? 0));
  const bearingFrictionPercent = Math.max(0, Number(uncertainty?.bearingFrictionPercent ?? 0));
  const prevailingTorquePercent = Math.max(0, Number(uncertainty?.prevailingTorquePercent ?? 0));
  const threadGeometryPercent = Math.max(0, Number(uncertainty?.threadGeometryPercent ?? 0));
  const rss = Math.sqrt(
    legacyScatterPercent ** 2 +
      toolAccuracyPercent ** 2 +
      threadFrictionPercent ** 2 +
      bearingFrictionPercent ** 2 +
      prevailingTorquePercent ** 2 +
      threadGeometryPercent ** 2
  );
  return {
    legacyScatterPercent,
    toolAccuracyPercent,
    threadFrictionPercent,
    bearingFrictionPercent,
    prevailingTorquePercent,
    threadGeometryPercent,
    combinedPercent: rss,
    note:
      rss > 0
        ? 'Combined installation uncertainty uses root-sum-square aggregation of explicit tightening and friction contributors.'
        : 'No explicit uncertainty terms were provided; preload range remains deterministic.'
  };
}

function scatterBounds(preload: number, uncertainty: InstallationUncertaintyResult) {
  const scatter = Math.max(0, Number(uncertainty.combinedPercent ?? 0));
  const fraction = scatter / 100;
  return {
    preloadMin: preload * (1 - fraction),
    preloadMax: preload * (1 + fraction)
  };
}

function buildEnvelope(
  min: number | null | undefined,
  nominal: number | null | undefined,
  max: number | null | undefined,
  note: string
): CheckEnvelope {
  return {
    min: Number.isFinite(Number(min)) ? Number(min) : null,
    nominal: Number.isFinite(Number(nominal)) ? Number(nominal) : null,
    max: Number.isFinite(Number(max)) ? Number(max) : null,
    note
  };
}

function pickWorstCaseScenario(
  envelope: CheckEnvelope,
  note: string
): { scenario: EnvelopeScenarioLabel; utilization: number | null; note: string } {
  const candidates: Array<{ scenario: EnvelopeScenarioLabel; utilization: number | null }> = [
    { scenario: 'min_preload', utilization: envelope.min },
    { scenario: 'nominal_preload', utilization: envelope.nominal },
    { scenario: 'max_preload', utilization: envelope.max }
  ];
  let worst = candidates[1];
  for (const candidate of candidates) {
    const value = Number(candidate.utilization);
    const current = Number(worst.utilization);
    if (Number.isFinite(value) && (!Number.isFinite(current) || value > current)) {
      worst = candidate;
    }
  }
  return {
    scenario: worst.scenario,
    utilization: Number.isFinite(Number(worst.utilization)) ? Number(worst.utilization) : null,
    note
  };
}

function clonePreloadInput(input: FastenedJointPreloadInput): FastenedJointPreloadInput {
  return JSON.parse(JSON.stringify(input)) as FastenedJointPreloadInput;
}

function zeroInstallationUncertainty(): InstallationUncertaintyInput {
  return {
    legacyScatterPercent: 0,
    toolAccuracyPercent: 0,
    threadFrictionPercent: 0,
    bearingFrictionPercent: 0,
    prevailingTorquePercent: 0,
    threadGeometryPercent: 0
  };
}

function buildDeterministicDirectPreloadInput(input: FastenedJointPreloadInput, preload: number): FastenedJointPreloadInput {
  const candidate = clonePreloadInput(input);
  candidate.installation = {
    model: 'direct_preload',
    targetPreload: preload
  };
  candidate.installationScatterPercent = 0;
  candidate.installationUncertainty = zeroInstallationUncertainty();
  return candidate;
}

function estimateThreadedArea(nominalDiameter: number): number {
  const diameter = Number(nominalDiameter);
  if (!Number.isFinite(diameter) || diameter <= 0) return 0;
  return Math.PI * 0.25 * diameter * diameter * 0.74;
}

function solveBisectionTarget(
  seedInput: FastenedJointPreloadInput,
  predicate: (result: FastenedJointPreloadOutput) => boolean,
  mutateCandidate: (candidate: FastenedJointPreloadInput, trial: number) => void,
  lower: number,
  upper: number,
  iterations = 28
): number | null {
  let low = lower;
  let high = upper;

  const lowCandidate = clonePreloadInput(seedInput);
  mutateCandidate(lowCandidate, low);
  let lowResult: FastenedJointPreloadOutput | null = null;
  try {
    lowResult = computeFastenedJointPreload(lowCandidate);
  } catch {
    lowResult = null;
  }
  if (lowResult && predicate(lowResult)) return low;

  let highResult: FastenedJointPreloadOutput | null = null;
  for (let expand = 0; expand < 6; expand += 1) {
    const candidate = clonePreloadInput(seedInput);
    mutateCandidate(candidate, high);
    try {
      highResult = computeFastenedJointPreload(candidate);
    } catch {
      highResult = null;
    }
    if (highResult && predicate(highResult)) break;
    high *= 1.6;
  }

  if (!highResult || !predicate(highResult)) return null;

  for (let index = 0; index < iterations; index += 1) {
    const mid = (low + high) / 2;
    const candidate = clonePreloadInput(seedInput);
    mutateCandidate(candidate, mid);
    const result = computeFastenedJointPreload(candidate);
    if (predicate(result)) high = mid;
    else low = mid;
  }
  return high;
}

function verdictSeverity(utilization: number | null | undefined): 'pass' | 'attention' | 'fail' | 'unknown' {
  if (!Number.isFinite(Number(utilization))) return 'unknown';
  const value = Number(utilization);
  if (value > 1) return 'fail';
  if (value >= 0.8) return 'attention';
  return 'pass';
}

function buildDecisionSupport(
  input: FastenedJointPreloadInput,
  installation: InstallationResult,
  service: FastenedJointPreloadOutput['service'],
  checks: FastenedJointPreloadOutput['checks']
): DecisionSupportResult {
  const separationSeverity =
    service?.separationState === 'post_separation'
      ? 'fail'
      : service?.separationState === 'incipient'
        ? 'attention'
        : verdictSeverity(checks.serviceLimits.separation.utilization);
  const slipSeverity = verdictSeverity(checks.serviceLimits.slip.utilization);
  const stripUtilization = Math.max(
    checks.threadStrip.internal.utilization ?? -Infinity,
    checks.threadStrip.external.utilization ?? -Infinity
  );
  const stripSeverity = verdictSeverity(stripUtilization);
  const fatigueSeverity = verdictSeverity(checks.fatigue.utilization);
  const installationSeverity =
    installation.uncertainty.combinedPercent > 20
      ? 'fail'
      : installation.uncertainty.combinedPercent > 12
        ? 'attention'
        : 'pass';

  const bearingCheck =
    checks.bearing.governing === 'under_head'
      ? checks.bearing.underHead
      : checks.bearing.governing === 'thread_bearing'
        ? checks.bearing.threadBearing
        : checks.bearing.localCrushing;

  const candidates = [
    {
      id: 'separation' as const,
      title: 'Separation governs',
      equation: 'F_service / F_sep',
      check: checks.serviceLimits.separation,
      recommendations: [
        'Increase installed preload or reduce preload losses.',
        'Increase member stiffness relative to bolt stiffness.',
        'Reduce external axial load or shorten the effective grip.'
      ]
    },
    {
      id: 'slip' as const,
      title: 'Slip governs',
      equation: 'V_service / (μ · n · F_clamp)',
      check: checks.serviceLimits.slip,
      recommendations: [
        'Increase retained clamp preload.',
        'Increase faying-surface slip coefficient.',
        'Increase friction interface count or reduce transverse load.'
      ]
    },
    {
      id: 'proof' as const,
      title: 'Proof governs',
      equation: 'F_bolt / (S_proof · A_t)',
      check: checks.proof,
      recommendations: [
        'Increase fastener diameter or proof strength.',
        'Reduce installed preload or service bolt-load rise.',
        'Increase member stiffness so a smaller fraction of service load enters the bolt.'
      ]
    },
    {
      id: 'bearing' as const,
      title: 'Bearing / crushing governs',
      equation: 'F / (σ_allow · A_bearing)',
      check: bearingCheck,
      recommendations: [
        'Increase bearing diameter or washer OD.',
        'Increase member bearing allowable or use a harder washer stack.',
        'Reduce governing bolt load.'
      ]
    },
    {
      id: 'thread_strip' as const,
      title: 'Thread strip governs',
      equation: 'F / (τ_allow · π · d_shear · L_eff)',
      check:
        (checks.threadStrip.governing ? checks.threadStrip[checks.threadStrip.governing] : checks.threadStrip.internal),
      recommendations: [
        'Increase engaged thread length.',
        'Increase internal or external strip allowable as applicable.',
        'Increase nominal diameter or reduce installed preload.'
      ]
    },
    {
      id: 'fatigue' as const,
      title: 'Fatigue governs',
      equation: 'max(Goodman, Soderberg, Gerber)',
      check: checks.fatigue,
      recommendations: [
        'Reduce alternating load at the fastener.',
        'Increase fastener endurance capability or diameter.',
        'Increase retained preload only if proof and strip margins remain acceptable.'
      ]
    }
  ].sort((a, b) => (b.check.utilization ?? -Infinity) - (a.check.utilization ?? -Infinity));

  const governing = candidates[0] ?? {
    id: 'none' as const,
    title: 'No governing check available',
    equation: '—',
    check: { demand: null, capacity: null, utilization: null, margin: null },
    recommendations: ['Provide explicit capacities and service loads to activate decision support.']
  };

  const overallOrder = ['fail', 'attention', 'pass', 'unknown'] as const;
  const criticalFastenerRisk = input.serviceCase
    ? {
        severity: 'attention' as const,
        driver: 'pattern screening',
        note: 'Critical-fastener ranking is currently provided by the route-level pattern solver rather than the core preload solver.'
      }
    : {
        severity: 'unknown' as const,
        driver: 'pattern screening',
        note: 'No group-screening context is attached to the current preload solve.'
      };
  const severities = [
    installationSeverity,
    slipSeverity,
    separationSeverity,
    stripSeverity,
    fatigueSeverity,
    criticalFastenerRisk.severity
  ];
  const overall = overallOrder.find((severity) => severities.includes(severity)) ?? 'unknown';

  return {
    overall,
    installationRisk: {
      severity: installationSeverity,
      driver: 'installation uncertainty',
      note: `Combined installation uncertainty is ${installation.uncertainty.combinedPercent.toFixed(2)}%.`
    },
    slipRisk: {
      severity: slipSeverity,
      driver: 'slip reserve',
      note: checks.serviceLimits.selfLooseningRisk.note
    },
    separationRisk: {
      severity: separationSeverity,
      driver: service?.separationState ?? 'separation utilization',
      note:
        service === null
          ? 'Service case is required to evaluate separation.'
          : `Current separation state is ${service.separationState.replaceAll('_', ' ')}.`
    },
    stripRisk: {
      severity: stripSeverity,
      driver: checks.threadMechanics.governingStripLocation ?? 'thread strip unavailable',
      note: checks.threadMechanics.stripCapacityNote
    },
    fatigueRisk: {
      severity: fatigueSeverity,
      driver: 'fatigue envelope',
      note: checks.fatigue.note ?? 'Fatigue envelope not available.'
    },
    criticalFastenerRisk,
    governing: {
      id: governing.id,
      title: governing.title,
      equation: governing.equation,
      demand: governing.check.demand,
      capacity: governing.check.capacity,
      utilization: governing.check.utilization,
      margin: governing.check.margin,
      recommendations: governing.recommendations
    }
  };
}

export function solveInstallationPreload(
  installation: InstallationInput,
  scatterPercent?: number,
  installationUncertaintyInput?: InstallationUncertaintyInput
): InstallationResult {
  const uncertainty = buildInstallationUncertainty(scatterPercent, installationUncertaintyInput);
  switch (installation.model) {
    case 'exact_torque': {
      const exactTerms = buildExactTorqueTerms(installation);
      const prevailingTorque = Math.max(0, Number(installation.prevailingTorque ?? 0));
      const availableTorque = installation.appliedTorque - prevailingTorque;
      if (!Number.isFinite(availableTorque) || availableTorque <= 0) {
        throw new Error('Applied torque must exceed prevailing torque.');
      }
      const preload = availableTorque * exactTerms.preloadPerAppliedTorque;
      const bounds = scatterBounds(preload, uncertainty);
      return {
        model: 'exact_torque',
        preload,
        ...bounds,
        appliedTorque: installation.appliedTorque,
        prevailingTorque,
        availableTorque,
        threadTorque: preload * exactTerms.threadTorquePerUnitPreload,
        bearingTorque: preload * exactTerms.bearingTorquePerUnitPreload,
        exactTerms,
        uncertainty
      };
    }
    case 'nut_factor': {
      assertPositive('nutFactor', installation.nutFactor);
      assertPositive('nominalDiameter', installation.nominalDiameter);
      const torqueCoefficient = installation.nutFactor * installation.nominalDiameter;
      const preload = installation.appliedTorque / torqueCoefficient;
      const bounds = scatterBounds(preload, uncertainty);
      return {
        model: 'nut_factor',
        preload,
        ...bounds,
        appliedTorque: installation.appliedTorque,
        nutFactor: installation.nutFactor,
        nominalDiameter: installation.nominalDiameter,
        torqueCoefficient,
        uncertainty
      };
    }
    case 'direct_preload':
      assertPositive('targetPreload', installation.targetPreload);
      const bounds = scatterBounds(installation.targetPreload, uncertainty);
      return {
        model: 'direct_preload',
        preload: installation.targetPreload,
        ...bounds,
        targetPreload: installation.targetPreload,
        uncertainty
      };
    default: {
      const _never: never = installation;
      throw new Error(`Unsupported installation model: ${String(_never)}`);
    }
  }
}

export function computeFastenedJointPreload(input: FastenedJointPreloadInput): FastenedJointPreloadOutput {
  assertPositive('nominalDiameter', input.nominalDiameter);
  assertPositive('tensileStressArea', input.tensileStressArea);
  assertPositive('boltModulus', input.boltModulus);

  const installation = solveInstallationPreload(
    input.installation,
    input.installationScatterPercent,
    input.installationUncertainty
  );
  const stiffness = solveJointStiffness(input);
  const service = evaluateServicePreloadRetention(input, installation.preload, stiffness);
  const checks = evaluateStructuralChecks(input, installation.preload, service);
  const serviceMin = evaluateServicePreloadRetention(input, installation.preloadMin, stiffness);
  const serviceMax = evaluateServicePreloadRetention(input, installation.preloadMax, stiffness);
  const checksMin = evaluateStructuralChecks(input, installation.preloadMin, serviceMin);
  const checksMax = evaluateStructuralChecks(input, installation.preloadMax, serviceMax);
  checks.envelopes = {
    separationUtilization: buildEnvelope(
      checksMin.serviceLimits.separation.utilization,
      checks.serviceLimits.separation.utilization,
      checksMax.serviceLimits.separation.utilization,
      'Utilization envelope from installation preload scatter propagated through the separation state.'
    ),
    slipUtilization: buildEnvelope(
      checksMin.serviceLimits.slip.utilization,
      checks.serviceLimits.slip.utilization,
      checksMax.serviceLimits.slip.utilization,
      'Utilization envelope from installation preload scatter propagated through the slip state.'
    ),
    proofUtilization: buildEnvelope(
      checksMin.proof.utilization,
      checks.proof.utilization,
      checksMax.proof.utilization,
      'Proof envelope from min/nominal/max installed preload and service load transfer.'
    ),
    bearingUtilization: buildEnvelope(
      checksMin.bearing.governing
        ? (checksMin.bearing.governing === 'under_head'
            ? checksMin.bearing.underHead
            : checksMin.bearing.governing === 'thread_bearing'
              ? checksMin.bearing.threadBearing
              : checksMin.bearing.localCrushing
          ).utilization
        : null,
      checks.bearing.governing
        ? (checks.bearing.governing === 'under_head'
            ? checks.bearing.underHead
            : checks.bearing.governing === 'thread_bearing'
              ? checks.bearing.threadBearing
              : checks.bearing.localCrushing
          ).utilization
        : null,
      checksMax.bearing.governing
        ? (checksMax.bearing.governing === 'under_head'
            ? checksMax.bearing.underHead
            : checksMax.bearing.governing === 'thread_bearing'
              ? checksMax.bearing.threadBearing
              : checksMax.bearing.localCrushing
          ).utilization
        : null,
      'Bearing/crushing envelope from installation preload scatter.'
    ),
    fatigueUtilization: buildEnvelope(
      checksMin.fatigue.utilization,
      checks.fatigue.utilization,
      checksMax.fatigue.utilization,
      'Fatigue envelope from installation preload scatter superposed with explicit mean and alternating loads.'
    )
  };
  checks.worstCaseScenarios = {
    separation: pickWorstCaseScenario(
      checks.envelopes.separationUtilization,
      'Worst-case separation utilization across min/nominal/max installed preload.'
    ),
    slip: pickWorstCaseScenario(
      checks.envelopes.slipUtilization,
      'Worst-case slip utilization across min/nominal/max installed preload.'
    ),
    proof: pickWorstCaseScenario(
      checks.envelopes.proofUtilization,
      'Worst-case proof utilization across min/nominal/max installed preload.'
    ),
    bearing: pickWorstCaseScenario(
      checks.envelopes.bearingUtilization,
      'Worst-case bearing/crushing utilization across min/nominal/max installed preload.'
    ),
    fatigue: pickWorstCaseScenario(
      checks.envelopes.fatigueUtilization,
      'Worst-case fatigue utilization across min/nominal/max installed preload.'
    )
  };
  if (service && serviceMin && serviceMax) {
    service.preloadEffectiveMin = Math.min(serviceMin.preloadEffective, serviceMax.preloadEffective);
    service.preloadEffectiveMax = Math.max(serviceMin.preloadEffective, serviceMax.preloadEffective);
  }

  const activeCompressionModels = Array.from(new Set(input.memberSegments.map((segment) => segment.compressionModel)));
  const assembly = buildJointAssemblyInput(input);
  const compressionModelNotes = input.memberSegments.map((segment) => {
    switch (segment.compressionModel) {
      case 'cylindrical_annulus':
        return `${segment.id}: constant effective compression diameter through thickness.`;
      case 'conical_frustum_annulus':
        return `${segment.id}: exact annular-frustum compliance integration from explicit start/end diameters.`;
      case 'explicit_area':
        return `${segment.id}: direct equivalent compressed area from user-defined area input.`;
      case 'calibrated_vdi_equivalent':
        return `${segment.id}: auto-derived tapered annulus from plate footprint and cone half-angle.`;
      default:
        return 'Explicit compression model.';
    }
  });
  const modelBasis = {
    v2FoundationEnabled: Boolean(input.featureFlags?.v2Foundation ?? true),
    activeCompressionModels,
    compressionModelSummary:
      activeCompressionModels.length === 1
        ? `Active compression model: ${activeCompressionModels[0]}.`
        : `Mixed compression models: ${activeCompressionModels.join(', ')}.`,
    compressionModelNotes,
    assemblySummary: `${assembly.preset.replaceAll('_', ' ')} assembly with ${assembly.rows.filter((row) => row.participatesInClamp).length} clamp-participating rows and ${assembly.rows.length} total rows.`,
    uncertaintySummary: installation.uncertainty.note,
    preloadLossSummary:
      service === null
        ? 'No service case: preload-loss breakdown not evaluated.'
        : `Effective preload uses explicit embedment, seating/crush, relaxation, creep, and thermal terms.`
  };

  const assumptions = [
    'Segmented axial-spring model with explicit serial compliance only.',
    modelBasis.assemblySummary,
    'No hidden pressure-cone shortcut: member stiffness comes only from the selected area model.',
    `Compression-cone visualization uses the explicit half-angle input (default ${Number(input.compressionConeHalfAngleDeg ?? 30).toFixed(1)}°); it does not override the explicit member-segment stiffness model.`,
    'Exact thread + bearing torque decomposition is used when installation.model = exact_torque.',
    'Service-load redistribution uses the classical joint constant C = kb / (kb + km).',
    'Post-separation bolt load uses the conservative continuous transition rule from the implementation plan.',
    'Proof, bearing, thread-strip, and fatigue checks use only explicitly supplied capacities; unavailable inputs are surfaced, not guessed.',
    modelBasis.uncertaintySummary,
    modelBasis.preloadLossSummary
  ];

  return {
    input,
    installation,
    stiffness,
    service,
    checks,
    decisionSupport: buildDecisionSupport(input, installation, service, checks),
    assumptions,
    modelBasis
  };
}

export function buildPreloadScenarioVariants(input: FastenedJointPreloadInput): PreloadScenarioVariant[] {
  const nominal = computeFastenedJointPreload(input);
  const cases: Array<{ id: EnvelopeScenarioLabel; preload: number; label: string; note: string }> = [
    {
      id: 'min_preload',
      preload: nominal.installation.preloadMin,
      label: 'Min preload',
      note: 'Lower installed-preload bound after explicit installation uncertainty.'
    },
    {
      id: 'nominal_preload',
      preload: nominal.installation.preload,
      label: 'Nominal preload',
      note: 'Nominal installed preload from the selected installation model.'
    },
    {
      id: 'max_preload',
      preload: nominal.installation.preloadMax,
      label: 'Max preload',
      note: 'Upper installed-preload bound after explicit installation uncertainty.'
    }
  ];

  return cases.map((entry) => {
    const resolved = computeFastenedJointPreload(buildDeterministicDirectPreloadInput(input, entry.preload));
    return {
      id: entry.id,
      label: entry.label,
      preloadInstalled: resolved.installation.preload,
      preloadEffective: resolved.service?.preloadEffective ?? null,
      clampForceService: resolved.service?.clampForceService ?? null,
      boltLoadService: resolved.service?.boltLoadService ?? null,
      separationUtilization: resolved.checks.serviceLimits.separation.utilization,
      slipUtilization: resolved.checks.serviceLimits.slip.utilization,
      proofUtilization: resolved.checks.proof.utilization,
      note: entry.note
    };
  });
}

export function solveEnvelopeAwareInverseTargets(
  input: FastenedJointPreloadInput,
  nominalOutput: FastenedJointPreloadOutput | null = null
): PreloadInverseTargetResult[] {
  const output = nominalOutput ?? computeFastenedJointPreload(input);
  const results: PreloadInverseTargetResult[] = [];

  const noSlipTarget = solveBisectionTarget(
    input,
    (candidateResult) => (candidateResult.checks.worstCaseScenarios.slip.utilization ?? Infinity) <= 1,
    (candidate, trial) => {
      candidate.installation = {
        model: 'direct_preload',
        targetPreload: trial
      };
      candidate.installationScatterPercent = input.installationScatterPercent;
      candidate.installationUncertainty = clonePreloadInput(input).installationUncertainty;
    },
    0,
    Math.max(1000, (output.installation.preloadMax ?? output.installation.preload) * 4)
  );
  results.push({
    id: 'no_slip_preload',
    label: 'Required preload for no-slip',
    value: noSlipTarget,
    unit: 'lbf',
    note:
      noSlipTarget !== null
        ? 'Direct-preload equivalent needed to keep the worst-case slip utilization at or below 1.00.'
        : 'The current friction/contact model could not reach slip utilization <= 1 within the bounded search range.',
    severity:
      noSlipTarget === null
        ? 'fail'
        : noSlipTarget > output.installation.preload
          ? 'attention'
          : 'pass',
    feasible: noSlipTarget !== null,
    governingScenario: output.checks.worstCaseScenarios.slip.scenario,
    targetUtilization: 1
  });

  const targetProofUtilization = 0.85;
  const minimumDiameter = solveBisectionTarget(
    input,
    (candidateResult) => (candidateResult.checks.worstCaseScenarios.proof.utilization ?? Infinity) <= targetProofUtilization,
    (candidate, trial) => {
      candidate.nominalDiameter = trial;
      candidate.tensileStressArea = estimateThreadedArea(trial);
      candidate.installationScatterPercent = input.installationScatterPercent;
      candidate.installationUncertainty = clonePreloadInput(input).installationUncertainty;
      if (candidate.boltSegments.length) {
        candidate.boltSegments = candidate.boltSegments.map((segment, index) => ({
          ...segment,
          area:
            index === candidate.boltSegments.length - 1
              ? estimateThreadedArea(trial)
              : Math.PI * 0.25 * trial * trial
        }));
      }
    },
    Math.max(0.05, input.nominalDiameter * 0.65),
    Math.max(input.nominalDiameter * 2.5, input.nominalDiameter + 0.25)
  );
  results.push({
    id: 'proof_diameter',
    label: 'Minimum nominal diameter for proof margin',
    value: minimumDiameter,
    unit: 'in',
    note:
      minimumDiameter !== null
        ? `Approximate diameter needed to keep worst-case proof utilization at or below ${targetProofUtilization.toFixed(2)}.`
        : 'Proof margin target could not be met within the bounded diameter search range.',
    severity:
      minimumDiameter === null
        ? 'fail'
        : minimumDiameter > input.nominalDiameter
          ? 'attention'
          : 'pass',
    feasible: minimumDiameter !== null,
    governingScenario: output.checks.worstCaseScenarios.proof.scenario,
    targetUtilization: targetProofUtilization
  });

  const governingBearingDemand =
    output.checks.bearing.governing === 'under_head'
      ? output.checks.bearing.underHead.demand
      : output.checks.bearing.governing === 'thread_bearing'
        ? output.checks.bearing.threadBearing.demand
        : output.checks.bearing.localCrushing.demand;
  const bearingAllowable = Number(input.memberBearingAllowable ?? 0);
  const currentInner = Math.min(
    Number(input.washerStack?.underHeadInnerDiameter ?? input.washerStack?.innerDiameter ?? input.nominalDiameter),
    Number(input.washerStack?.underNutInnerDiameter ?? input.washerStack?.innerDiameter ?? input.nominalDiameter)
  );
  const requiredOuter =
    Number.isFinite(Number(governingBearingDemand)) && bearingAllowable > 0
      ? Math.sqrt(currentInner * currentInner + (4 * (Number(governingBearingDemand) / (bearingAllowable * 0.85))) / Math.PI)
      : null;
  results.push({
    id: 'bearing_face_od',
    label: 'Minimum governing bearing-face OD',
    value: Number.isFinite(Number(requiredOuter)) ? Number(requiredOuter) : null,
    unit: 'in',
    note:
      requiredOuter !== null
        ? 'Equivalent annulus OD needed to keep the governing worst-case bearing utilization at or below 0.85.'
        : 'Bearing-face OD target is unavailable because the governing bearing demand/capacity is incomplete.',
    severity:
      requiredOuter === null
        ? 'unknown'
        : requiredOuter >
            Math.max(
              Number(input.washerStack?.underHeadOuterDiameter ?? input.washerStack?.outerDiameter ?? 0),
              Number(input.washerStack?.underNutOuterDiameter ?? input.washerStack?.outerDiameter ?? 0),
              Number(input.bearingGeometry?.headBearingDiameter ?? 0),
              Number(input.bearingGeometry?.nutOrCollarBearingDiameter ?? 0)
            )
          ? 'attention'
          : 'pass',
    feasible: requiredOuter !== null,
    governingScenario: output.checks.worstCaseScenarios.bearing.scenario,
    targetUtilization: 0.85
  });

  return results;
}

export { buildExactTorqueTerms };
