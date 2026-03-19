import { buildJointAssemblyInput } from './assembly';
import type { FastenedJointPreloadOutput } from './types';

function esc(value: unknown): string {
  return String(value).replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return char;
    }
  });
}

function fmt(value: number | null | undefined, digits = 5): string {
  if (!Number.isFinite(Number(value))) return '—';
  return Number(value).toFixed(digits);
}

function renderRows(rows: Array<[string, string]>): string {
  return rows
    .map(([label, value]) => `<tr><th>${esc(label)}</th><td>${value}</td></tr>`)
    .join('');
}

export function buildPreloadEquationSheetHtml(output: FastenedJointPreloadOutput): string {
  const { input, installation, stiffness, service, checks } = output;
  const assembly = buildJointAssemblyInput(input);
  const date = new Date().toISOString().slice(0, 10);
  const installationRows: Array<[string, string]> = [
    ['Installation model', esc(installation.model)],
    ['Installed preload', fmt(installation.preload, 4)],
    ['Installed preload (min)', fmt(installation.preloadMin, 4)],
    ['Installed preload (max)', fmt(installation.preloadMax, 4)],
    ['Nominal diameter', fmt(input.nominalDiameter, 4)],
    ['Tensile stress area', fmt(input.tensileStressArea, 6)]
  ];

  if (installation.model === 'exact_torque') {
    installationRows.push(
      ['Applied torque', fmt(installation.appliedTorque, 4)],
      ['Prevailing torque', fmt(installation.prevailingTorque, 4)],
      ['Available torque', fmt(installation.availableTorque, 4)],
      ['Thread torque', fmt(installation.threadTorque, 4)],
      ['Bearing torque', fmt(installation.bearingTorque, 4)],
      ['Lead angle (rad)', fmt(installation.exactTerms.leadAngleRad, 6)],
      ['Thread friction angle (rad)', fmt(installation.exactTerms.threadFrictionAngleRad, 6)]
    );
  } else if (installation.model === 'nut_factor') {
    installationRows.push(
      ['Applied torque', fmt(installation.appliedTorque, 4)],
      ['Nut factor', fmt(installation.nutFactor, 4)],
      ['Torque coefficient', fmt(installation.torqueCoefficient, 6)]
    );
  }

  const serviceRows: Array<[string, string]> = service
    ? [
        ['Preload effective', fmt(service.preloadEffective, 4)],
        ['Preload effective (min)', fmt(service.preloadEffectiveMin, 4)],
        ['Preload effective (max)', fmt(service.preloadEffectiveMax, 4)],
        ['Embedment loss', fmt(service.embedmentLoss, 6)],
        ['Coating crush loss', fmt(service.preloadLossBreakdown.coatingCrushLoss, 6)],
        ['Washer seating loss', fmt(service.preloadLossBreakdown.washerSeatingLoss, 6)],
        ['Relaxation loss', fmt(service.preloadLossBreakdown.relaxationLoss, 6)],
        ['Creep loss', fmt(service.preloadLossBreakdown.creepLoss, 6)],
        ['Thermal preload shift', fmt(service.thermalPreloadShift, 6)],
        ['Mechanical loss total', fmt(service.preloadLossBreakdown.mechanicalLossTotal, 6)],
        ['Net preload shift', fmt(service.preloadLossBreakdown.netPreloadShift, 6)],
        ['External axial load', fmt(service.externalAxialLoad, 4)],
        ['External transverse load', fmt(service.externalTransverseLoad, 4)],
        ['Bolt load in service', fmt(service.boltLoadService, 4)],
        ['Clamp force in service', fmt(service.clampForceService, 4)],
        ['Separation load', fmt(service.separationLoad, 4)],
        ['Separation state', esc(service.separationState)],
        ['Slip resistance', fmt(service.slipResistance, 4)]
      ]
    : [['Service state', 'No service case provided']];

  const checkRows: Array<[string, string]> = [
    [
      'Separation',
      `${checks.serviceLimits.separation.status} (${fmt(checks.serviceLimits.separation.utilization, 4)})`
    ],
    ['Slip', `${checks.serviceLimits.slip.status} (${fmt(checks.serviceLimits.slip.utilization, 4)})`],
    ['Self-loosening risk', esc(checks.serviceLimits.selfLooseningRisk.level)],
    ['Proof', `${checks.proof.status} (${fmt(checks.proof.utilization, 4)})`],
    [
      'Bearing (gov.)',
      checks.bearing.governing
        ? `${checks.bearing.governing} (${fmt(
            checks.bearing[
              checks.bearing.governing === 'under_head'
                ? 'underHead'
                : checks.bearing.governing === 'thread_bearing'
                  ? 'threadBearing'
                  : 'localCrushing'
            ].utilization,
            4
          )})`
        : 'unavailable'
    ],
    [
      'Thread strip (gov.)',
      checks.threadStrip.governing
        ? `${checks.threadStrip.governing} (${fmt(
            checks.threadStrip[checks.threadStrip.governing].utilization,
            4
          )})`
        : 'unavailable'
    ],
    [
      'Fatigue',
      `${checks.fatigue.status} (Goodman ${fmt(checks.fatigue.goodmanEquivalent, 4)}, Soderberg ${fmt(
        checks.fatigue.soderbergEquivalent,
        4
      )}, Gerber ${fmt(checks.fatigue.gerberEquivalent, 4)})`
    ]
  ];

  const boltSegments = input.boltSegments
    .map(
      (segment) =>
        `<tr><td>${esc(segment.id)}</td><td>${fmt(segment.length, 4)}</td><td>${fmt(segment.area, 6)}</td><td>${fmt(segment.modulus, 0)}</td></tr>`
    )
    .join('');
  const memberSegments = input.memberSegments
    .map((segment, index) => {
      const label =
        segment.compressionModel === 'cylindrical_annulus'
          ? `Constant effective compression diameter: Do=${fmt(segment.outerDiameter, 4)}, Di=${fmt(segment.innerDiameter, 4)}`
          : segment.compressionModel === 'conical_frustum_annulus'
            ? `Tapered effective compression diameter: Do0=${fmt(segment.outerDiameterStart, 4)}, Do1=${fmt(segment.outerDiameterEnd, 4)}, Di=${fmt(segment.innerDiameter, 4)}`
            : segment.compressionModel === 'calibrated_vdi_equivalent'
              ? `Calibrated cone / VDI-style equivalent row: Di=${fmt(segment.innerDiameter, 4)}`
              : `Equivalent compressed area: Aeff=${fmt(segment.effectiveArea, 6)}`;
      return `<tr><td>${esc(segment.id || `member-${index + 1}`)}</td><td>${esc(segment.compressionModel)}</td><td>${fmt(segment.length, 4)}</td><td>${fmt(segment.modulus, 0)}</td><td>Plate ${fmt(segment.plateWidth, 4)} × ${fmt(segment.plateLength, 4)} • ${label}</td></tr>`;
    })
    .join('');

  const assumptions = output.assumptions.map((entry) => `<li>${esc(entry)}</li>`).join('');
  const modelBasisRows: Array<[string, string]> = [
    ['Assembly basis', esc(output.modelBasis.assemblySummary)],
    ['Compression basis', esc(output.modelBasis.compressionModelSummary)],
    ['Uncertainty basis', esc(output.modelBasis.uncertaintySummary)],
    ['Preload-loss basis', esc(output.modelBasis.preloadLossSummary)],
    ['Active compression models', esc(output.modelBasis.activeCompressionModels.join(', '))]
  ];
  const uncertaintyRows: Array<[string, string]> = [
    ['Legacy scatter %', fmt(installation.uncertainty.legacyScatterPercent, 3)],
    ['Tool accuracy %', fmt(installation.uncertainty.toolAccuracyPercent, 3)],
    ['Thread friction %', fmt(installation.uncertainty.threadFrictionPercent, 3)],
    ['Bearing friction %', fmt(installation.uncertainty.bearingFrictionPercent, 3)],
    ['Prevailing torque %', fmt(installation.uncertainty.prevailingTorquePercent, 3)],
    ['Thread geometry %', fmt(installation.uncertainty.threadGeometryPercent, 3)],
    ['Combined RSS %', fmt(installation.uncertainty.combinedPercent, 3)]
  ];
  const verdictRows: Array<[string, string]> = [
    ['Overall', esc(output.decisionSupport.overall)],
    ['Installation risk', `${esc(output.decisionSupport.installationRisk.severity)} • ${esc(output.decisionSupport.installationRisk.driver)}`],
    ['Slip risk', `${esc(output.decisionSupport.slipRisk.severity)} • ${esc(output.decisionSupport.slipRisk.driver)}`],
    ['Separation risk', `${esc(output.decisionSupport.separationRisk.severity)} • ${esc(output.decisionSupport.separationRisk.driver)}`],
    ['Strip risk', `${esc(output.decisionSupport.stripRisk.severity)} • ${esc(output.decisionSupport.stripRisk.driver)}`],
    ['Fatigue risk', `${esc(output.decisionSupport.fatigueRisk.severity)} • ${esc(output.decisionSupport.fatigueRisk.driver)}`]
  ];
  const governingRows: Array<[string, string]> = [
    ['Governing title', esc(output.decisionSupport.governing.title)],
    ['Equation', `<code>${esc(output.decisionSupport.governing.equation)}</code>`],
    ['Demand', fmt(output.decisionSupport.governing.demand, 4)],
    ['Capacity', fmt(output.decisionSupport.governing.capacity, 4)],
    ['Utilization', fmt(output.decisionSupport.governing.utilization, 4)],
    ['Margin', fmt(output.decisionSupport.governing.margin, 4)]
  ];
  const assemblyRows = assembly.rows
    .map(
      (row) =>
        `<tr><td>${esc(row.label)}</td><td>${esc(row.kind)}</td><td>${fmt(row.axialLength, 4)}</td><td>${fmt(row.outerDiameter, 4)}</td><td>${fmt(row.innerDiameter, 4)}</td><td>${row.participatesInClamp ? 'yes' : 'no'}</td><td>${esc(row.note ?? '—')}</td></tr>`
    )
    .join('');
  const threadMechanicsRows: Array<[string, string]> = [
    ['Bearing geometry source', esc(checks.threadMechanics.bearingGeometrySource)],
    ['Head bearing diameter', fmt(checks.threadMechanics.headBearingDiameter, 4)],
    ['Nut/collar bearing diameter', fmt(checks.threadMechanics.nutOrCollarBearingDiameter, 4)],
    ['Engagement effectiveness', fmt(checks.threadMechanics.engagedLengthEffectiveness, 4)],
    ['Load distribution factor', fmt(checks.threadMechanics.loadDistributionFactor, 4)],
    ['Effective engaged length', fmt(checks.threadMechanics.effectiveEngagedLength, 4)],
    ['Governing strip location', esc(checks.threadMechanics.governingStripLocation ?? 'unavailable')]
  ];

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Fastened Joint Preload Analysis</title>
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;margin:24px;color:#111;background:#fff}
    h1{margin:0 0 6px 0;font-size:20px}
    h2{margin:18px 0 8px 0;font-size:14px}
    p{margin:0 0 6px 0;color:#333}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th,td{border:1px solid #bbb;padding:6px 8px;vertical-align:top}
    th{width:34%;text-align:left;background:#f7f7f7}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    .box{border:1px solid #cfd4da;border-radius:8px;padding:12px}
    code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:#f3f4f6;padding:0 4px;border-radius:4px}
    ul{margin:8px 0 0 18px}
    .mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
  </style>
</head>
<body>
  <h1>Fastened Joint Preload Analysis</h1>
  <p>Date: <span class="mono">${esc(date)}</span></p>
  <p>Audit-ready equation sheet generated from explicit intermediate values. No hidden assumptions are inserted when capacities are missing.</p>

  <div class="grid">
    <div class="box">
      <h2>Installation</h2>
      <table>${renderRows(installationRows)}</table>
      <p><code>F_i = (T_inst - T_prev) / (T_thread/F + T_bearing/F)</code> when exact torque is selected.</p>
    </div>
    <div class="box">
      <h2>Stiffness</h2>
      <table>
        ${renderRows([
          ['Bolt stiffness', fmt(stiffness.bolt.stiffness, 4)],
          ['Bolt compliance', fmt(stiffness.bolt.compliance, 8)],
          ['Member stiffness', fmt(stiffness.members.stiffness, 4)],
          ['Member compliance', fmt(stiffness.members.compliance, 8)],
          ['Joint constant C', fmt(stiffness.jointConstant, 6)],
          ['Member load fraction', fmt(stiffness.memberLoadFraction, 6)]
        ])}
      </table>
      <p><code>1/k = Σ(L / EA)</code> and <code>C = k_b / (k_b + k_m)</code>.</p>
    </div>
  </div>

  <div class="grid" style="margin-top:16px">
    <div class="box">
      <h2>Service State</h2>
      <table>${renderRows(serviceRows)}</table>
      <p><code>ΔF_b = C·P</code>, <code>ΔF_c = (1-C)·P</code>, <code>P_sep = F_i / (1-C)</code>.</p>
    </div>
    <div class="box">
      <h2>Checks Summary</h2>
      <table>${renderRows(checkRows)}</table>
      <p>${esc(checks.serviceLimits.selfLooseningRisk.note)}</p>
    </div>
  </div>

  <div class="grid" style="margin-top:16px">
    <div class="box">
      <h2>Design Verdict</h2>
      <table>${renderRows(verdictRows)}</table>
    </div>
    <div class="box">
      <h2>Why This Fails / Governs</h2>
      <table>${renderRows(governingRows)}</table>
      <ul>${output.decisionSupport.governing.recommendations.map((entry) => `<li>${esc(entry)}</li>`).join('')}</ul>
    </div>
  </div>

  <div class="grid" style="margin-top:16px">
    <div class="box">
      <h2>Model Basis</h2>
      <table>${renderRows(modelBasisRows)}</table>
    </div>
    <div class="box">
      <h2>Installation Uncertainty</h2>
      <table>${renderRows(uncertaintyRows)}</table>
      <p>${esc(installation.uncertainty.note)}</p>
    </div>
  </div>

  <h2>Bolt Segments</h2>
  <table>
    <tr><th>ID</th><th>Length</th><th>Area</th><th>Modulus</th></tr>
    ${boltSegments}
  </table>

  <h2>Clamped Plate Layers</h2>
  <table>
    <tr><th>ID</th><th>Effective compression model</th><th>Thickness</th><th>Modulus</th><th>Geometry</th></tr>
    ${memberSegments}
  </table>

  <h2>Assembly Model</h2>
  <table>
    <tr><th>Row</th><th>Kind</th><th>Axial length</th><th>Outer dia</th><th>Inner dia</th><th>Clamp row</th><th>Note</th></tr>
    ${assemblyRows}
  </table>

  <h2>Thread / Bearing Mechanics</h2>
  <table>${renderRows(threadMechanicsRows)}</table>
  <p>${esc(checks.threadMechanics.stripCapacityNote)}</p>
  <p>${esc(checks.threadMechanics.washerCompatibilityNote)}</p>

  <h2>Assumptions (Explicit)</h2>
  <ul>${assumptions}</ul>
</body>
</html>`;
}
