import { evaluateStructuralChecks } from './checks';
import { evaluateServicePreloadRetention } from './retention';
import { solveJointStiffness } from './stiffness';
import { buildJointAssemblyInput } from './assembly';
import type {
  CheckEnvelope,
  DecisionSupportResult,
  ExactTorqueTerms,
  FastenedJointPreloadInput,
  FastenedJointPreloadOutput,
  InstallationUncertaintyInput,
  InstallationUncertaintyResult,
  InstallationInput,
  InstallationResult
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

export { buildExactTorqueTerms };
