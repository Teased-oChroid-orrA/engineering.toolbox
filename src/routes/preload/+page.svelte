<script lang="ts">
  import {
    Badge,
    Button,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Input,
    Label,
    Select
  } from '$lib/components/ui';
  import { exportPdfFromHtml, exportSvg } from '$lib/drafting/core/export';
  import {
    buildPreloadEquationSheetHtml,
    computeFastenedJointPreload,
    solveFastenerGroupPattern,
    solveFastenerGroupPatternCases,
    PRELOAD_FASTENER_CATALOG,
    getPreloadFastener,
    getPreloadMaterial,
    PRELOAD_MATERIAL_LIBRARY,
    solveMemberSegmentStiffness,
    type BoltSegmentInput,
    type FastenedJointPreloadInput,
    type FastenerGroupPatternLoadCaseInput,
    type MemberSegmentInput
  } from '$lib/core/preload';

  const STORAGE_KEY = 'scd.preload.inputs.v1';
  type PreloadForm = Omit<FastenedJointPreloadInput, 'serviceCase' | 'washerStack'> & {
    washerStack: NonNullable<FastenedJointPreloadInput['washerStack']>;
    serviceCase: NonNullable<FastenedJointPreloadInput['serviceCase']>;
    selectedPlateMaterialId: string;
    selectedWasherMaterialId: string;
    selectedFastenerId: string;
    selectedFastenerDash: string;
    selectedFastenerGrip: string;
    selectedFastenerMaterialId: string;
    adjacentFastenerScreen: {
      enabled: boolean;
      rowCount: number;
      columnCount: number;
      rowPitch: number;
      columnPitch: number;
      edgeDistanceX: number;
      edgeDistanceY: number;
      eccentricityX: number;
      eccentricityY: number;
      plateStiffnessRatioX: number;
      plateStiffnessRatioY: number;
      bypassLoadFactor: number;
      transferEfficiency: number;
      loadCases: FastenerGroupPatternLoadCaseInput[];
    };
  };

  const defaultBoltSegments: BoltSegmentInput[] = [
    { id: 'shank', length: 1.2, area: 0.1419, modulus: 30_000_000 },
    { id: 'threaded', length: 0.6, area: 0.118, modulus: 30_000_000 }
  ];

  const defaultMemberSegments: MemberSegmentInput[] = [
    {
      id: 'plate-a',
      plateWidth: 2.5,
      plateLength: 3.5,
      compressionModel: 'cylindrical_annulus',
      length: 0.3,
      modulus: 10_600_000,
      outerDiameter: 1.6,
      innerDiameter: 0.53
    },
    {
      id: 'plate-b',
      plateWidth: 2.5,
      plateLength: 3.5,
      compressionModel: 'cylindrical_annulus',
      length: 0.3,
      modulus: 10_600_000,
      outerDiameter: 1.6,
      innerDiameter: 0.53
    }
  ];

  const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

  function normalizeMemberSegment(segment: MemberSegmentInput): MemberSegmentInput {
    const plateWidth = Number(('plateWidth' in segment ? segment.plateWidth : undefined) ?? 2.5);
    const plateLength = Number(('plateLength' in segment ? segment.plateLength : undefined) ?? 3.5);
    return {
      ...segment,
      plateWidth: Number.isFinite(plateWidth) && plateWidth > 0 ? plateWidth : 2.5,
      plateLength: Number.isFinite(plateLength) && plateLength > 0 ? plateLength : 3.5
    } as MemberSegmentInput;
  }

  const defaultForm = (): PreloadForm => ({
    nominalDiameter: 0.5,
    tensileStressArea: 0.1419,
    boltModulus: 30_000_000,
    compressionConeHalfAngleDeg: 30,
    installationScatterPercent: 15,
    boltThermalExpansionCoeff: 6.5e-6,
    boltProofStrength: 85_000,
    boltUltimateStrength: 120_000,
    boltEnduranceLimit: 45_000,
    memberBearingAllowable: 42_000,
    underHeadBearingArea: 0.32,
    engagedThreadLength: 0.45,
    internalThreadShearDiameter: 0.46,
    externalThreadShearDiameter: 0.43,
    internalThreadStripShearAllowable: 32_000,
    externalThreadStripShearAllowable: 28_000,
    fayingSurfaceSlipCoeff: 0.28,
    frictionInterfaceCount: 2,
    washerStack: {
      enabled: true,
      count: 2,
      underHeadCount: 1,
      underNutCount: 1,
      thicknessPerWasher: 0.065,
      modulus: 29_000_000,
      outerDiameter: 0.95,
      innerDiameter: 0.53,
      underHeadOuterDiameter: 0.95,
      underHeadInnerDiameter: 0.53,
      underNutOuterDiameter: 0.95,
      underNutInnerDiameter: 0.53,
      thermalExpansionCoeff: 6.2e-6
    },
    selectedPlateMaterialId: 'al2024',
    selectedWasherMaterialId: 'washer_steel',
    selectedFastenerId: 'HL48',
    selectedFastenerDash: '8',
    selectedFastenerGrip: '8',
    selectedFastenerMaterialId: 'ti6al4v',
    adjacentFastenerScreen: {
      enabled: true,
      rowCount: 2,
      columnCount: 2,
      rowPitch: 1.5,
      columnPitch: 1.5,
      edgeDistanceX: 1.0,
      edgeDistanceY: 1.0,
      eccentricityX: 0.15,
      eccentricityY: 0.05,
      plateStiffnessRatioX: 1,
      plateStiffnessRatioY: 1,
      bypassLoadFactor: 0.18,
      transferEfficiency: 0.65,
      loadCases: [
        {
          id: 'lc1',
          label: 'Baseline clamp relief',
          externalAxialLoad: 300,
          externalShearX: 200,
          externalShearY: 0,
          externalMomentZ: 120
        },
        {
          id: 'lc2',
          label: 'Eccentric shear case',
          externalAxialLoad: 220,
          externalShearX: 260,
          externalShearY: 80,
          externalMomentZ: 180
        }
      ]
    },
    boltSegments: clone(defaultBoltSegments),
    memberSegments: clone(defaultMemberSegments),
    installation: {
      model: 'exact_torque',
      appliedTorque: 120,
      prevailingTorque: 8,
      threadFrictionCoeff: 0.12,
      bearingFrictionCoeff: 0.14,
      threadPitch: 1 / 13,
      threadPitchDiameter: 0.4505,
      bearingMeanDiameter: 0.75,
      threadHalfAngleDeg: 30
    },
    serviceCase: {
      externalAxialLoad: 300,
      externalTransverseLoad: 200,
      meanAxialLoad: 180,
      alternatingAxialLoad: 90,
      temperatureChange: 40,
      embedmentSettlement: 0.00008
    }
  });

  let form: PreloadForm = defaultForm();
  let exportError = '';
  let solverError = '';
  let selectedInstallationModel: FastenedJointPreloadInput['installation']['model'] = form.installation.model;
  let visualizationMode: 'classical_cone' | 'equivalent_annulus' = 'classical_cone';
  let summarySvg: SVGSVGElement | null = null;
  let jointSectionSvg: SVGSVGElement | null = null;

  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<FastenedJointPreloadInput>;
        const baseline = defaultForm();
        form = {
          ...baseline,
          ...parsed,
          boltSegments: Array.isArray(parsed.boltSegments) ? parsed.boltSegments : baseline.boltSegments,
          memberSegments: Array.isArray(parsed.memberSegments)
            ? (parsed.memberSegments as MemberSegmentInput[]).map(normalizeMemberSegment)
            : baseline.memberSegments,
          adjacentFastenerScreen: {
            ...baseline.adjacentFastenerScreen,
            ...((parsed as Partial<PreloadForm>).adjacentFastenerScreen ?? {}),
            loadCases: Array.isArray((parsed as Partial<PreloadForm>).adjacentFastenerScreen?.loadCases)
              ? (parsed as Partial<PreloadForm>).adjacentFastenerScreen?.loadCases ?? baseline.adjacentFastenerScreen.loadCases
              : baseline.adjacentFastenerScreen.loadCases
          },
          washerStack: {
            ...baseline.washerStack,
            ...(parsed.washerStack ?? {})
          },
          serviceCase: {
            ...baseline.serviceCase,
            ...(parsed.serviceCase ?? {})
          }
        };
        selectedInstallationModel = form.installation.model;
      } catch {
        form = defaultForm();
      }
    }
  }

  function setInstallationModel(model: FastenedJointPreloadInput['installation']['model']) {
    if (model === form.installation.model) return;
    if (model === 'exact_torque') {
      form.installation = {
        model,
        appliedTorque: 120,
        prevailingTorque: 8,
        threadFrictionCoeff: 0.12,
        bearingFrictionCoeff: 0.14,
        threadPitch: 1 / 13,
        threadPitchDiameter: 0.4505,
        bearingMeanDiameter: 0.75,
        threadHalfAngleDeg: 30
      };
      return;
    }
    if (model === 'nut_factor') {
      form.installation = {
        model,
        appliedTorque: 120,
        nutFactor: 0.2,
        nominalDiameter: form.nominalDiameter
      };
      return;
    }
    form.installation = {
      model,
      targetPreload: output?.installation.preload ?? 4500
    };
  }

  let lastPlateMaterialId = '';
  let lastWasherMaterialId = '';
  let lastFastenerId = '';
  let lastFastenerMaterialId = '';

  function applyPlateMaterialDefaults(materialId: string) {
    const material = getPreloadMaterial(materialId);
    form.memberSegments = form.memberSegments.map((segment) => ({
      ...segment,
      modulus: material.modulusPsi,
      thermalExpansionCoeff: material.thermalExpansionCoeff
    }));
    if (material.bearingAllowablePsi) {
      form.memberBearingAllowable = material.bearingAllowablePsi;
    }
  }

  function applyWasherMaterialDefaults(materialId: string) {
    const material = getPreloadMaterial(materialId);
    form.washerStack = {
      ...form.washerStack,
      modulus: material.modulusPsi,
      thermalExpansionCoeff: material.thermalExpansionCoeff
    };
  }

  function applyFastenerMaterialDefaults(materialId: string) {
    const material = getPreloadMaterial(materialId);
    form.boltModulus = material.modulusPsi;
    form.boltSegments = form.boltSegments.map((segment) => ({ ...segment, modulus: material.modulusPsi }));
    if (material.proofStrengthPsi) form.boltProofStrength = material.proofStrengthPsi;
    if (material.ultimateStrengthPsi) form.boltUltimateStrength = material.ultimateStrengthPsi;
    if (material.enduranceLimitPsi) form.boltEnduranceLimit = material.enduranceLimitPsi;
    if (material.thermalExpansionCoeff) form.boltThermalExpansionCoeff = material.thermalExpansionCoeff;
  }

  function addLoadCase() {
    const nextIndex = form.adjacentFastenerScreen.loadCases.length + 1;
    form.adjacentFastenerScreen = {
      ...form.adjacentFastenerScreen,
      loadCases: [
        ...form.adjacentFastenerScreen.loadCases,
        {
          id: `lc${nextIndex}`,
          label: `Load case ${nextIndex}`,
          externalAxialLoad: form.serviceCase.externalAxialLoad ?? 0,
          externalShearX: form.serviceCase.externalTransverseLoad ?? 0,
          externalShearY: 0,
          externalMomentZ: 0
        }
      ]
    };
  }

  function duplicateLoadCase(index: number) {
    const target = form.adjacentFastenerScreen.loadCases[index];
    form.adjacentFastenerScreen = {
      ...form.adjacentFastenerScreen,
      loadCases: [
        ...form.adjacentFastenerScreen.loadCases.slice(0, index + 1),
        { ...target, id: `${target.id}-copy`, label: `${target.label} copy` },
        ...form.adjacentFastenerScreen.loadCases.slice(index + 1)
      ]
    };
  }

  function moveLoadCase(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= form.adjacentFastenerScreen.loadCases.length) return;
    const list = [...form.adjacentFastenerScreen.loadCases];
    [list[index], list[next]] = [list[next], list[index]];
    form.adjacentFastenerScreen = { ...form.adjacentFastenerScreen, loadCases: list };
  }

  function removeLoadCase(index: number) {
    if (form.adjacentFastenerScreen.loadCases.length <= 1) return;
    form.adjacentFastenerScreen = {
      ...form.adjacentFastenerScreen,
      loadCases: form.adjacentFastenerScreen.loadCases.filter((_, i) => i !== index)
    };
  }

  $: if (selectedInstallationModel !== form.installation.model) setInstallationModel(selectedInstallationModel);
  $: if (form.selectedPlateMaterialId !== lastPlateMaterialId) {
    lastPlateMaterialId = form.selectedPlateMaterialId;
    applyPlateMaterialDefaults(form.selectedPlateMaterialId);
  }
  $: if (form.selectedWasherMaterialId !== lastWasherMaterialId) {
    lastWasherMaterialId = form.selectedWasherMaterialId;
    applyWasherMaterialDefaults(form.selectedWasherMaterialId);
  }
  $: if (form.selectedFastenerId !== lastFastenerId) {
    lastFastenerId = form.selectedFastenerId;
    const fastener = getPreloadFastener(form.selectedFastenerId);
    if (!fastener.dashVariants.some((variant) => variant.dash === form.selectedFastenerDash)) {
      form.selectedFastenerDash = fastener.dashVariants[0]?.dash ?? '8';
    }
    if (!fastener.gripTable.some((entry) => entry.gripCode === form.selectedFastenerGrip)) {
      form.selectedFastenerGrip = fastener.gripTable[0]?.gripCode ?? '1';
    }
    if (fastener.materialId !== form.selectedFastenerMaterialId) {
      form.selectedFastenerMaterialId = fastener.materialId;
    }
  }
  $: if (form.selectedFastenerMaterialId !== lastFastenerMaterialId) {
    lastFastenerMaterialId = form.selectedFastenerMaterialId;
    applyFastenerMaterialDefaults(form.selectedFastenerMaterialId);
  }
  $: if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(form));

  let output: ReturnType<typeof computeFastenedJointPreload> | null = null;
  $: {
    solverError = '';
    try {
      output = computeFastenedJointPreload(form);
    } catch (error) {
      output = null;
      solverError = error instanceof Error ? error.message : 'Preload solver failed.';
    }
  }

  function addBoltSegment() {
    form.boltSegments = [
      ...form.boltSegments,
      {
        id: `bolt-${form.boltSegments.length + 1}`,
        length: 0.25,
        area: form.tensileStressArea,
        modulus: form.boltModulus
      }
    ];
  }

  function duplicateBoltSegment(index: number) {
    const target = form.boltSegments[index];
    form.boltSegments = [
      ...form.boltSegments.slice(0, index + 1),
      { ...target, id: `${target.id}-copy` },
      ...form.boltSegments.slice(index + 1)
    ];
  }

  function moveBoltSegment(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= form.boltSegments.length) return;
    const list = [...form.boltSegments];
    [list[index], list[next]] = [list[next], list[index]];
    form.boltSegments = list;
  }

  function removeBoltSegment(index: number) {
    if (form.boltSegments.length <= 1) return;
    form.boltSegments = form.boltSegments.filter((_, i) => i !== index);
  }

  function addMemberSegment(compressionModel: MemberSegmentInput['compressionModel'] = 'cylindrical_annulus') {
    const id = `member-${form.memberSegments.length + 1}`;
    let segment: MemberSegmentInput;
    if (compressionModel === 'cylindrical_annulus') {
      segment = {
        id,
        plateWidth: 2.5,
        plateLength: 3.5,
        compressionModel,
        length: 0.25,
        modulus: 10_600_000,
        outerDiameter: 1.2,
        innerDiameter: 0.53
      };
    } else if (compressionModel === 'conical_frustum_annulus') {
      segment = {
        id,
        plateWidth: 2.5,
        plateLength: 3.5,
        compressionModel,
        length: 0.25,
        modulus: 10_600_000,
        outerDiameterStart: 1.2,
        outerDiameterEnd: 1.5,
        innerDiameter: 0.53
      };
    } else {
      segment = {
        id,
        plateWidth: 2.5,
        plateLength: 3.5,
        compressionModel,
        length: 0.25,
        modulus: 10_600_000,
        effectiveArea: 0.65,
        note: 'Explicit area segment'
      };
    }
    form.memberSegments = [...form.memberSegments, segment];
  }

  function duplicateMemberSegment(index: number) {
    const target = form.memberSegments[index];
    const copy = clone(target);
    copy.id = `${target.id}-copy`;
    form.memberSegments = [
      ...form.memberSegments.slice(0, index + 1),
      copy,
      ...form.memberSegments.slice(index + 1)
    ];
  }

  function moveMemberSegment(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= form.memberSegments.length) return;
    const list = [...form.memberSegments];
    [list[index], list[next]] = [list[next], list[index]];
    form.memberSegments = list;
  }

  function removeMemberSegment(index: number) {
    if (form.memberSegments.length <= 1) return;
    form.memberSegments = form.memberSegments.filter((_, i) => i !== index);
  }

  function changeCompressionModel(index: number, compressionModel: MemberSegmentInput['compressionModel']) {
    const current = form.memberSegments[index];
    const id = current.id;
    const plateWidth = current.plateWidth;
    const plateLength = current.plateLength;
    const length = current.length;
    const modulus = current.modulus;
    const thermalExpansionCoeff = current.thermalExpansionCoeff;
    let next: MemberSegmentInput;
    if (compressionModel === 'cylindrical_annulus') {
      next = {
        id,
        plateWidth,
        plateLength,
        compressionModel,
        length,
        modulus,
        thermalExpansionCoeff,
        outerDiameter: 'outerDiameter' in current ? current.outerDiameter : 1.2,
        innerDiameter: 'innerDiameter' in current ? current.innerDiameter : 0.53
      };
    } else if (compressionModel === 'conical_frustum_annulus') {
      next = {
        id,
        plateWidth,
        plateLength,
        compressionModel,
        length,
        modulus,
        thermalExpansionCoeff,
        outerDiameterStart:
          'outerDiameterStart' in current ? current.outerDiameterStart : 'outerDiameter' in current ? current.outerDiameter : 1.2,
        outerDiameterEnd:
          'outerDiameterEnd' in current ? current.outerDiameterEnd : 'outerDiameter' in current ? current.outerDiameter + 0.2 : 1.5,
        innerDiameter: 'innerDiameter' in current ? current.innerDiameter : 0.53
      };
    } else {
      next = {
        id,
        plateWidth,
        plateLength,
        compressionModel,
        length,
        modulus,
        thermalExpansionCoeff,
        effectiveArea: 'effectiveArea' in current ? current.effectiveArea : 0.65,
        note: 'Explicit area segment'
      };
    }
    form.memberSegments = form.memberSegments.map((segment, i) => (i === index ? next : segment));
  }

  function boltValidation(segment: BoltSegmentInput): string[] {
    const issues: string[] = [];
    if (!segment.id.trim()) issues.push('ID is required.');
    if (!(segment.length > 0)) issues.push('Length must be positive.');
    if (!(segment.area > 0)) issues.push('Area must be positive.');
    if (!(segment.modulus > 0)) issues.push('Modulus must be positive.');
    return issues;
  }

  function memberValidation(segment: MemberSegmentInput): string[] {
    const issues: string[] = [];
    if (!segment.id.trim()) issues.push('ID is required.');
    if (!(segment.length > 0)) issues.push('Length must be positive.');
    if (!(segment.plateWidth > 0)) issues.push('Plate width must be positive.');
    if (!(segment.plateLength > 0)) issues.push('Plate plan length must be positive.');
    if (!(segment.modulus > 0)) issues.push('Modulus must be positive.');
    if (segment.compressionModel === 'cylindrical_annulus') {
      if (!(segment.outerDiameter > 0)) issues.push('Outer diameter must be positive.');
      if (!(segment.innerDiameter >= 0) || segment.innerDiameter >= segment.outerDiameter) {
        issues.push('Inner diameter must be non-negative and smaller than outer diameter.');
      }
    } else if (segment.compressionModel === 'conical_frustum_annulus') {
      if (!(segment.outerDiameterStart > 0) || !(segment.outerDiameterEnd > 0)) {
        issues.push('Both conical outer diameters must be positive.');
      }
      if (
        !(segment.innerDiameter >= 0) ||
        segment.innerDiameter >= segment.outerDiameterStart ||
        segment.innerDiameter >= segment.outerDiameterEnd
      ) {
        issues.push('Inner diameter must be smaller than both conical outer diameters.');
      }
    } else if (!(segment.effectiveArea > 0)) {
      issues.push('Effective area must be positive.');
    }
    return issues;
  }

  async function exportPdfReport() {
    if (!output) return;
    exportError = '';
    try {
      const html = buildPreloadEquationSheetHtml(output);
      await exportPdfFromHtml(html, 'Fastened Joint Preload Analysis');
    } catch (error) {
      exportError = error instanceof Error ? error.message : 'Preload report export failed.';
    }
  }

  async function exportSummarySvg() {
    if (!summarySvg) return;
    exportError = '';
    try {
      await exportSvg(summarySvg, 'preload_summary.svg');
    } catch (error) {
      exportError = error instanceof Error ? error.message : 'Preload SVG export failed.';
    }
  }

  async function exportJointSectionSvg() {
    if (!jointSectionSvg) return;
    exportError = '';
    try {
      await exportSvg(jointSectionSvg, 'preload_joint_section.svg');
    } catch (error) {
      exportError = error instanceof Error ? error.message : 'Preload joint-section SVG export failed.';
    }
  }

  function downloadTextFile(filename: string, text: string, mime = 'text/plain;charset=utf-8') {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 250);
  }

  function exportAuditJson() {
    if (!output) return;
    exportError = '';
    try {
      downloadTextFile(
        'preload_audit.json',
        JSON.stringify(
          {
            ...output,
            adjacentFastenerScreen: {
              enabled: form.adjacentFastenerScreen.enabled,
              governingLoadCase: governingLoadCaseLabel,
              neighborCount: adjacentNeighborCount,
              attenuation: adjacentTransferAttenuation,
              axialPerNeighbor: adjacentAxialPerNeighbor,
              transversePerNeighbor: adjacentTransversePerNeighbor,
              criticalFastener: criticalFastenerLabel,
              pattern: fastenerGroupCaseResult
            }
          },
          null,
          2
        ),
        'application/json;charset=utf-8'
      );
    } catch (error) {
      exportError = error instanceof Error ? error.message : 'Preload JSON export failed.';
    }
  }

  function exportAuditCsv() {
    if (!output) return;
    exportError = '';
    try {
      const rows = [
        ['metric', 'value'],
        ['installation.preload', String(output.installation.preload)],
        ['installation.preloadMin', String(output.installation.preloadMin)],
        ['installation.preloadMax', String(output.installation.preloadMax)],
        ['stiffness.bolt', String(output.stiffness.bolt.stiffness)],
        ['stiffness.members', String(output.stiffness.members.stiffness)],
        ['stiffness.jointConstant', String(output.stiffness.jointConstant)],
        ['service.preloadEffective', String(output.service?.preloadEffective ?? '')],
        ['service.separationLoad', String(output.service?.separationLoad ?? '')],
        ['service.slipResistance', String(output.service?.slipResistance ?? '')],
        ['checks.separation.status', output.checks.serviceLimits.separation.status],
        ['checks.separation.utilization.min', String(output.checks.envelopes.separationUtilization.min ?? '')],
        ['checks.separation.utilization.nominal', String(output.checks.envelopes.separationUtilization.nominal ?? '')],
        ['checks.separation.utilization.max', String(output.checks.envelopes.separationUtilization.max ?? '')],
        ['checks.slip.status', output.checks.serviceLimits.slip.status],
        ['checks.slip.utilization.min', String(output.checks.envelopes.slipUtilization.min ?? '')],
        ['checks.slip.utilization.nominal', String(output.checks.envelopes.slipUtilization.nominal ?? '')],
        ['checks.slip.utilization.max', String(output.checks.envelopes.slipUtilization.max ?? '')],
        ['checks.selfLooseningRisk.level', output.checks.serviceLimits.selfLooseningRisk.level],
        ['checks.proof.utilization.min', String(output.checks.envelopes.proofUtilization.min ?? '')],
        ['checks.proof.utilization.nominal', String(output.checks.envelopes.proofUtilization.nominal ?? '')],
        ['checks.proof.utilization.max', String(output.checks.envelopes.proofUtilization.max ?? '')],
        ['checks.bearing.governing', String(output.checks.bearing.governing ?? '')],
        ['checks.bearing.utilization.min', String(output.checks.envelopes.bearingUtilization.min ?? '')],
        ['checks.bearing.utilization.nominal', String(output.checks.envelopes.bearingUtilization.nominal ?? '')],
        ['checks.bearing.utilization.max', String(output.checks.envelopes.bearingUtilization.max ?? '')],
        ['checks.fatigue.utilization.min', String(output.checks.envelopes.fatigueUtilization.min ?? '')],
        ['checks.fatigue.utilization.nominal', String(output.checks.envelopes.fatigueUtilization.nominal ?? '')],
        ['checks.fatigue.utilization.max', String(output.checks.envelopes.fatigueUtilization.max ?? '')],
        ['adjacent.enabled', String(form.adjacentFastenerScreen.enabled)],
        ['adjacent.governingLoadCase', governingLoadCaseLabel],
        ['adjacent.neighborCount', String(adjacentNeighborCount)],
        ['adjacent.attenuation', String(adjacentTransferAttenuation)],
        ['adjacent.axialPerNeighbor', String(adjacentAxialPerNeighbor)],
        ['adjacent.transversePerNeighbor', String(adjacentTransversePerNeighbor)],
        ['adjacent.criticalFastener', criticalFastenerLabel]
      ];
      const csv = rows
        .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
        .join('\n');
      downloadTextFile('preload_audit.csv', csv, 'text/csv;charset=utf-8');
    } catch (error) {
      exportError = error instanceof Error ? error.message : 'Preload CSV export failed.';
    }
  }

  function segmentPreview(segment: BoltSegmentInput) {
    if (!(segment.length > 0) || !(segment.area > 0) || !(segment.modulus > 0)) return null;
    const compliance = segment.length / (segment.modulus * segment.area);
    return compliance > 0 ? 1 / compliance : null;
  }

  function memberPreview(segment: MemberSegmentInput) {
    try {
      return solveMemberSegmentStiffness(segment);
    } catch {
      return null;
    }
  }

  function annulusArea(outerDiameter: number, innerDiameter: number) {
    if (!(outerDiameter > 0) || !(innerDiameter >= 0) || innerDiameter >= outerDiameter) return null;
    return (Math.PI / 4) * (outerDiameter * outerDiameter - innerDiameter * innerDiameter);
  }

  function equivalentOuterDiameter(area: number | null | undefined, innerDiameter: number) {
    if (!(Number(area) > 0) || !(innerDiameter >= 0)) return null;
    return Math.sqrt(innerDiameter * innerDiameter + (4 * Number(area)) / Math.PI);
  }

  function compressionModelLabel(compressionModel: MemberSegmentInput['compressionModel']) {
    switch (compressionModel) {
      case 'cylindrical_annulus':
        return 'Uniform compression proxy';
      case 'conical_frustum_annulus':
        return 'Tapered compression proxy';
      case 'explicit_area':
        return 'Direct equivalent area proxy';
      default:
        return compressionModel;
    }
  }

  function linearlyInterpolate(start: number, end: number, ratio: number) {
    return start + (end - start) * ratio;
  }

  const fmt = (value: number | null | undefined, digits = 4) =>
    Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : '—';
  const statusTone = (status: 'ok' | 'warning' | 'unavailable' | undefined) =>
    status === 'warning' ? 'text-amber-300' : status === 'ok' ? 'text-emerald-300' : 'text-white/60';
  const riskTone = (level: 'low' | 'moderate' | 'high' | 'unknown') =>
    level === 'high'
      ? 'text-rose-300'
      : level === 'moderate'
        ? 'text-amber-300'
        : level === 'low'
          ? 'text-emerald-300'
          : 'text-white/60';

  $: selectedPlateMaterial = getPreloadMaterial(form.selectedPlateMaterialId);
  $: selectedWasherMaterial = getPreloadMaterial(form.selectedWasherMaterialId);
  $: selectedFastener = getPreloadFastener(form.selectedFastenerId);
  $: selectedFastenerDashVariant =
    selectedFastener.dashVariants.find((variant) => variant.dash === form.selectedFastenerDash) ??
    selectedFastener.dashVariants[0] ??
    null;
  $: selectedFastenerGripVariant =
    selectedFastener.gripTable.find((entry) => entry.gripCode === form.selectedFastenerGrip) ??
    selectedFastener.gripTable[0] ??
    null;
  $: selectedFastenerMaterial = getPreloadMaterial(form.selectedFastenerMaterialId);

  $: clampInstalled = output?.installation.preload ?? 0;
  $: clampService = Math.max(0, output?.service?.clampForceService ?? 0);
  $: clampMax = Math.max(clampInstalled, clampService, 1);
  $: separationUtil = Math.max(0, Math.min(1.4, output?.checks.serviceLimits.separation.utilization ?? 0));
  $: slipUtil = Math.max(0, Math.min(1.4, output?.checks.serviceLimits.slip.utilization ?? 0));
  $: scatterMin = output?.installation.preloadMin ?? 0;
  $: scatterMax = output?.installation.preloadMax ?? 0;
  $: representativeCone = form.memberSegments.find((segment) => segment.compressionModel === 'conical_frustum_annulus') ?? null;
  $: washerTopCount = Math.max(0, Math.round(form.washerStack.underHeadCount ?? 0));
  $: washerBottomCount = Math.max(0, Math.round(form.washerStack.underNutCount ?? 0));
  $: effectiveWasherCount = form.washerStack.enabled ? washerTopCount + washerBottomCount : 0;
  $: topBearingFaceOuterDiameter =
    form.washerStack.enabled && Number(form.washerStack.underHeadOuterDiameter ?? form.washerStack.outerDiameter) > 0
      ? Number(form.washerStack.underHeadOuterDiameter ?? form.washerStack.outerDiameter)
      : Math.sqrt(
          Math.max(
            form.nominalDiameter * form.nominalDiameter +
              (4 * Math.max(0, Number(form.underHeadBearingArea ?? 0))) / Math.PI,
            form.nominalDiameter * form.nominalDiameter
          )
        );
  $: bottomBearingFaceOuterDiameter =
    form.washerStack.enabled && Number(form.washerStack.underNutOuterDiameter ?? form.washerStack.outerDiameter) > 0
      ? Number(form.washerStack.underNutOuterDiameter ?? form.washerStack.outerDiameter)
      : Math.sqrt(
          Math.max(
            form.nominalDiameter * form.nominalDiameter +
              (4 * Math.max(0, Number(form.underHeadBearingArea ?? 0))) / Math.PI,
            form.nominalDiameter * form.nominalDiameter
          )
        );
  $: compressionConeHalfAngleDeg = Math.max(10, Math.min(45, Number(form.compressionConeHalfAngleDeg ?? 30)));
  $: compressionConeSlope = Math.tan((compressionConeHalfAngleDeg * Math.PI) / 180);
  $: if (form.washerStack.enabled && form.washerStack.count !== effectiveWasherCount) {
    form.washerStack.count = effectiveWasherCount;
  }
  $: stackRows = [
    ...(form.washerStack.enabled
      ? Array.from({ length: washerTopCount }, (_, index) => ({
          id: `washer-head-${index + 1}`,
          kind: 'washer' as const,
          length: Number(form.washerStack.thicknessPerWasher),
          modulus: Number(form.washerStack.modulus),
          outerDiameter: Number(form.washerStack.underHeadOuterDiameter ?? form.washerStack.outerDiameter),
          innerDiameter: Number(form.washerStack.underHeadInnerDiameter ?? form.washerStack.innerDiameter)
        }))
      : []),
    ...form.memberSegments.map((segment) => ({
      id: segment.id,
      kind: 'member' as const,
      length: Number(segment.length),
      modulus: Number(segment.modulus),
      compressionModel: segment.compressionModel,
      preview: memberPreview(segment),
      outerDiameter:
        segment.compressionModel === 'cylindrical_annulus'
          ? Number(segment.outerDiameter)
          : segment.compressionModel === 'conical_frustum_annulus'
            ? Math.max(Number(segment.outerDiameterStart), Number(segment.outerDiameterEnd))
            : topBearingFaceOuterDiameter,
      innerDiameter:
        segment.compressionModel === 'explicit_area'
          ? Number(form.nominalDiameter)
          : Number(segment.innerDiameter)
    })),
    ...(form.washerStack.enabled
      ? Array.from({ length: washerBottomCount }, (_, index) => ({
          id: `washer-nut-${index + 1}`,
          kind: 'washer' as const,
          length: Number(form.washerStack.thicknessPerWasher),
          modulus: Number(form.washerStack.modulus),
          outerDiameter: Number(form.washerStack.underNutOuterDiameter ?? form.washerStack.outerDiameter),
          innerDiameter: Number(form.washerStack.underNutInnerDiameter ?? form.washerStack.innerDiameter)
        }))
      : [])
  ].filter((row) => Number.isFinite(row.length) && row.length > 0);
  $: stackTotalLength = Math.max(
    0.0001,
    stackRows.reduce((sum, row) => sum + row.length, 0)
  );
  $: adjacentFastenerCount = Math.max(
    1,
    Math.round(form.adjacentFastenerScreen.rowCount) * Math.round(form.adjacentFastenerScreen.columnCount)
  );
  $: adjacentNeighborCount = Math.max(0, adjacentFastenerCount - 1);
  $: fastenerGroupCaseResult =
    form.adjacentFastenerScreen.enabled && output
      ? solveFastenerGroupPatternCases({
          rowCount: form.adjacentFastenerScreen.rowCount,
          columnCount: form.adjacentFastenerScreen.columnCount,
          rowPitch: form.adjacentFastenerScreen.rowPitch,
          columnPitch: form.adjacentFastenerScreen.columnPitch,
          edgeDistanceX: form.adjacentFastenerScreen.edgeDistanceX,
          edgeDistanceY: form.adjacentFastenerScreen.edgeDistanceY,
          eccentricityX: form.adjacentFastenerScreen.eccentricityX,
          eccentricityY: form.adjacentFastenerScreen.eccentricityY,
          plateStiffnessRatioX: form.adjacentFastenerScreen.plateStiffnessRatioX,
          plateStiffnessRatioY: form.adjacentFastenerScreen.plateStiffnessRatioY,
          bypassLoadFactor: form.adjacentFastenerScreen.bypassLoadFactor,
          transferEfficiency: form.adjacentFastenerScreen.transferEfficiency,
          boltStiffness: output.stiffness.bolt.stiffness,
          memberStiffness: output.stiffness.members.stiffness,
          preloadPerFastener: output.service?.preloadEffective ?? output.installation.preload
        }, form.adjacentFastenerScreen.loadCases)
      : null;
  $: activeFastenerGroupCase =
    fastenerGroupCaseResult?.cases.find((entry) => entry.caseId === fastenerGroupCaseResult.governingCaseId) ??
    fastenerGroupCaseResult?.cases[0] ??
    null;
  $: fastenerGroupResult = activeFastenerGroupCase?.result ?? null;
  $: adjacentTransferAttenuation = fastenerGroupResult
    ? Math.max(...fastenerGroupResult.fasteners.slice(1).map((row) => row.edgeAmplification), 0)
    : 0;
  $: adjacentAxialPerNeighbor = fastenerGroupResult?.fasteners[1]?.axialLoad ?? 0;
  $: adjacentTransversePerNeighbor = fastenerGroupResult
    ? Math.hypot(fastenerGroupResult.fasteners[1]?.totalShearX ?? 0, fastenerGroupResult.fasteners[1]?.totalShearY ?? 0)
    : 0;
  $: currentFastenerEquivalentLoad = fastenerGroupResult?.fasteners[0]?.equivalentDemand ?? Math.hypot(
    output?.service?.boltLoadService ?? output?.installation.preload ?? 0,
    output?.service?.externalTransverseLoad ?? 0
  );
  $: adjacentFastenerEquivalentLoad = fastenerGroupResult?.fasteners[1]?.equivalentDemand ?? 0;
  $: criticalFastenerLabel = fastenerGroupResult
    ? `F${fastenerGroupResult.criticalFastenerIndex + 1}`
    : 'Current fastener';
  $: governingLoadCaseLabel = fastenerGroupCaseResult?.governingCaseLabel ?? '—';
  $: caseEnvelopeScale = Math.max(
    1,
    ...(fastenerGroupCaseResult?.cases.map((entry) => entry.result.criticalEquivalentDemand) ?? [1])
  );
  $: fastenerCaseEnvelopeRows =
    fastenerGroupCaseResult?.cases.map((entry, index) => ({
      index,
      label: entry.label,
      criticalFastenerLabel: `F${entry.result.criticalFastenerIndex + 1}`,
      demand: entry.result.criticalEquivalentDemand,
      ratio: entry.result.criticalEquivalentDemand / caseEnvelopeScale,
      isGoverning: entry.caseId === fastenerGroupCaseResult.governingCaseId
    })) ?? [];
  $: coneReachLength = Math.min(stackTotalLength / 2, (Math.max(topBearingFaceOuterDiameter, bottomBearingFaceOuterDiameter) - form.nominalDiameter) / Math.max(compressionConeSlope, 1e-6));
  $: jointDisplayMaxDiameter = Math.max(
    topBearingFaceOuterDiameter,
    bottomBearingFaceOuterDiameter,
    ...stackRows.map((row) =>
      visualizationMode === 'equivalent_annulus' && row.kind === 'member' && row.preview
        ? equivalentOuterDiameter(row.preview.averageAreaEquivalent, row.innerDiameter) ?? row.outerDiameter
        : row.outerDiameter
    ),
    form.nominalDiameter + 2 * compressionConeSlope * coneReachLength
  );
  $: jointViewport = {
    left: 22,
    top: 68,
    width: 516,
    height: 452,
    centerX: 200,
    rowTop: 136,
    rowBottom: 430,
    halfWidthLimit: 124,
    legendX: 372
  };
  $: jointVerticalScale = (jointViewport.rowBottom - jointViewport.rowTop) / Math.max(stackTotalLength, 0.0001);
  $: jointHorizontalScale = (jointViewport.halfWidthLimit * 2) / Math.max(jointDisplayMaxDiameter, 0.001);
  const jointY = (position: number) => jointViewport.rowTop + position * jointVerticalScale;
  const jointDiameterPx = (diameter: number) => Math.max(4, diameter * jointHorizontalScale);
  const jointRadiusPx = (diameter: number) => Math.max(2, (diameter * jointHorizontalScale) / 2);
  const buildConeEnvelopePoints = (
    slices: Array<{ sliceStart: number; sliceEnd: number; topRadius: number; bottomRadius: number }>
  ) => {
    if (!slices.length) return '';
    const left: string[] = [];
    const right: string[] = [];
    const first = slices[0];
    left.push(`${jointViewport.centerX - jointRadiusPx(first.topRadius * 2)},${jointY(first.sliceStart)}`);
    for (const slice of slices) {
      left.push(`${jointViewport.centerX - jointRadiusPx(slice.bottomRadius * 2)},${jointY(slice.sliceEnd)}`);
    }
    const last = slices[slices.length - 1];
    right.push(`${jointViewport.centerX + jointRadiusPx(last.bottomRadius * 2)},${jointY(last.sliceEnd)}`);
    for (let i = slices.length - 1; i >= 0; i -= 1) {
      const slice = slices[i];
      right.push(`${jointViewport.centerX + jointRadiusPx(slice.topRadius * 2)},${jointY(slice.sliceStart)}`);
    }
    return [...left, ...right].join(' ');
  };
  const buildThreadHelixPath = (side: 'left' | 'right', yValues: number[], width: number) => {
    if (!yValues.length) return '';
    const sign = side === 'right' ? 1 : -1;
    const baseX = jointViewport.centerX + sign * (width / 2 - 2);
    const crestX = jointViewport.centerX + sign * (width / 2 + 8);
    const startY = yValues[0];
    let d = `M ${baseX} ${startY}`;
    for (const y of yValues) {
      d += ` L ${crestX} ${y + 4} L ${baseX} ${y + 8}`;
    }
    return d;
  };
  const rowTint = (row: { kind: 'washer' | 'member'; id: string }, index: number) => {
    if (row.kind === 'washer') {
      return {
        fill: 'rgba(250,204,21,0.34)',
        stroke: 'rgba(250,204,21,0.62)'
      };
    }
    const palette = [
      { fill: 'rgba(99,102,241,0.26)', stroke: 'rgba(129,140,248,0.46)' },
      { fill: 'rgba(34,197,94,0.24)', stroke: 'rgba(74,222,128,0.46)' },
      { fill: 'rgba(251,146,60,0.15)', stroke: 'rgba(251,191,36,0.32)' },
      { fill: 'rgba(244,114,182,0.14)', stroke: 'rgba(244,114,182,0.30)' }
    ];
    const memberIndex = Math.max(0, index - washerTopCount);
    return palette[memberIndex % palette.length];
  };
  const rowDisplayLabel = (row: { kind: 'washer' | 'member'; id: string }, index: number) => {
    if (row.kind === 'washer') {
      if (row.id.startsWith('washer-head-')) return `Head washer ${row.id.split('-').pop()}`;
      if (row.id.startsWith('washer-nut-')) return `Nut washer ${row.id.split('-').pop()}`;
      return 'Washer';
    }
    if (row.id === 'plate-a') return 'Top member';
    if (row.id === 'plate-b') return 'Bottom member';
    const memberIndex = Math.max(0, index - washerTopCount);
    return `Member ${String.fromCharCode(65 + memberIndex)}`;
  };
  $: jointBoltWidthPx = Math.max(10, jointDiameterPx(form.nominalDiameter));
  $: headBlock = {
    width: Math.max(jointBoltWidthPx * 1.8, jointDiameterPx(topBearingFaceOuterDiameter)),
    height: 34,
    y: 102
  };
  $: nutBlock = {
    width: Math.max(jointBoltWidthPx * 1.8, jointDiameterPx(bottomBearingFaceOuterDiameter)),
    height: 34,
    y: 430
  };
  $: stackVisualRows = (() => {
    let cursor = 0;
    return stackRows.map((row) => {
      const equivalentAnnulusOuterDiameter =
        row.kind === 'washer'
          ? row.outerDiameter
          : row.preview
            ? equivalentOuterDiameter(row.preview.averageAreaEquivalent, row.innerDiameter) ?? row.outerDiameter
            : row.outerDiameter;
      const displayOuterDiameter =
        visualizationMode === 'equivalent_annulus' ? equivalentAnnulusOuterDiameter : row.outerDiameter;
      const stiffnessContribution =
        row.kind === 'washer'
          ? (() => {
              const area = annulusArea(row.outerDiameter, row.innerDiameter);
              return area && row.length > 0 && row.modulus > 0 ? (row.modulus * area) / row.length : null;
            })()
          : row.preview?.stiffness ?? null;
      const start = cursor;
      cursor += row.length;
      return {
        ...row,
        start,
        end: cursor,
        displayOuterDiameter,
        equivalentAnnulusOuterDiameter,
        stiffnessContribution
      };
    });
  })();
  $: stackTableRows = stackVisualRows.map((row) => ({
    id: row.id,
    kind: row.kind,
    thickness: row.length,
    displayOuterDiameter: row.displayOuterDiameter,
    stiffnessContribution: row.stiffnessContribution
  }));
  $: coneVisualTop = stackVisualRows.length
    ? (() => {
        const apex = stackTotalLength / 2;
        const start = 0;
        const end = Math.min(apex, coneReachLength);
        return stackVisualRows
          .filter((row) => row.end > start && row.start < end)
          .map((row) => {
            const sliceStart = Math.max(row.start, start);
            const sliceEnd = Math.min(row.end, end);
            const topRadius = Math.min(topBearingFaceOuterDiameter / 2 + compressionConeSlope * sliceStart, row.displayOuterDiameter / 2);
            const bottomRadius = Math.min(topBearingFaceOuterDiameter / 2 + compressionConeSlope * sliceEnd, row.displayOuterDiameter / 2);
            return {
              sliceStart,
              sliceEnd,
              topRadius,
              bottomRadius
            };
          });
      })()
    : [];
  $: coneVisualBottom = stackVisualRows.length
    ? (() => {
        const apex = stackTotalLength / 2;
        const start = Math.max(apex, stackTotalLength - coneReachLength);
        const end = stackTotalLength;
        return stackVisualRows
          .filter((row) => row.end > start && row.start < end)
          .map((row) => {
            const sliceStart = Math.max(row.start, start);
            const sliceEnd = Math.min(row.end, end);
            const topRadius = Math.min(bottomBearingFaceOuterDiameter / 2 + compressionConeSlope * (end - sliceStart), row.displayOuterDiameter / 2);
            const bottomRadius = Math.min(bottomBearingFaceOuterDiameter / 2 + compressionConeSlope * (end - sliceEnd), row.displayOuterDiameter / 2);
            return {
              sliceStart,
              sliceEnd,
              topRadius,
              bottomRadius
            };
          });
      })()
    : [];
  $: topConeEnvelopePoints = buildConeEnvelopePoints(coneVisualTop);
  $: bottomConeEnvelopePoints = buildConeEnvelopePoints(coneVisualBottom);
  $: stackRenderRows = stackVisualRows.map((row, index) => ({
    ...row,
    ...rowTint(row, index),
    displayLabel: rowDisplayLabel(row, index),
    labelY: jointY((row.start + row.end) / 2),
    pixelHeight: Math.max(row.kind === 'washer' ? 14 : 6, (row.end - row.start) * jointVerticalScale),
    outerWidthPx: Math.max(10, jointDiameterPx(row.displayOuterDiameter)),
    innerWidthPx: Math.max(4, jointDiameterPx(row.innerDiameter))
  }));
  $: splitPlaneY = (() => {
    const topMember = stackVisualRows.find((row) => row.id === 'plate-a');
    return topMember ? jointY(topMember.end) : null;
  })();
  $: threadTickYs = (() => {
    const start = jointY(stackTotalLength) + 6;
    const end = nutBlock.y + nutBlock.height - 10;
    const ticks: number[] = [];
    for (let y = start + 18; y <= end - 10; y += 12) ticks.push(y);
    return ticks;
  })();
  $: rightThreadHelixPath = buildThreadHelixPath('right', threadTickYs, jointBoltWidthPx);
  $: leftThreadHelixPath = buildThreadHelixPath('left', threadTickYs, jointBoltWidthPx);
  $: reserveEnvelopeRows = output
    ? [
        { label: 'Separation', envelope: output.checks.envelopes.separationUtilization, color: '#34d399' },
        { label: 'Slip', envelope: output.checks.envelopes.slipUtilization, color: '#22d3ee' },
        { label: 'Proof', envelope: output.checks.envelopes.proofUtilization, color: '#a78bfa' },
        { label: 'Bearing', envelope: output.checks.envelopes.bearingUtilization, color: '#f59e0b' },
        { label: 'Fatigue', envelope: output.checks.envelopes.fatigueUtilization, color: '#fb7185' }
      ]
    : [];
</script>

<div class="grid h-[calc(100vh-6rem)] grid-cols-1 gap-4 overflow-hidden p-1 lg:grid-cols-[560px_1fr]" data-route-ready="preload">
  <div class="flex flex-col gap-4 overflow-y-auto pb-24 pr-2 scrollbar-hide">
    <div class="flex items-center justify-between px-1">
      <h2 class="text-lg font-semibold tracking-tight text-white">Fastened Joint Preload Analysis</h2>
      <Badge variant="outline" class="border-white/20 text-white/60">explicit solver</Badge>
    </div>

    <Card class="glass-card relative z-[1701] isolate">
      <CardHeader class="pb-2 pt-4">
        <CardTitle class="text-[10px] font-bold uppercase tracking-widest text-indigo-300">Installation Model</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="space-y-1">
          <Label class="text-white/70">Model</Label>
          <Select
            bind:value={selectedInstallationModel}
            items={[
              { value: 'exact_torque', label: 'Exact torque decomposition' },
              { value: 'nut_factor', label: 'Nut-factor fallback' },
              { value: 'direct_preload', label: 'Direct preload' }
            ]}
          />
        </div>

        {#if form.installation.model === 'exact_torque'}
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1"><Label class="text-white/70">Applied Torque</Label><Input type="number" step="1" bind:value={form.installation.appliedTorque} /></div>
            <div class="space-y-1"><Label class="text-white/70">Prevailing Torque</Label><Input type="number" step="0.1" bind:value={form.installation.prevailingTorque} /></div>
            <div class="space-y-1"><Label class="text-white/70">Thread μ</Label><Input type="number" step="0.01" bind:value={form.installation.threadFrictionCoeff} /></div>
            <div class="space-y-1"><Label class="text-white/70">Bearing μ</Label><Input type="number" step="0.01" bind:value={form.installation.bearingFrictionCoeff} /></div>
            <div class="space-y-1"><Label class="text-white/70">Pitch</Label><Input type="number" step="0.0001" bind:value={form.installation.threadPitch} /></div>
            <div class="space-y-1"><Label class="text-white/70">Pitch Dia</Label><Input type="number" step="0.0001" bind:value={form.installation.threadPitchDiameter} /></div>
            <div class="space-y-1"><Label class="text-white/70">Bearing Mean Dia</Label><Input type="number" step="0.0001" bind:value={form.installation.bearingMeanDiameter} /></div>
            <div class="space-y-1"><Label class="text-white/70">Thread Half-Angle</Label><Input type="number" step="0.1" bind:value={form.installation.threadHalfAngleDeg} /></div>
          </div>
        {:else if form.installation.model === 'nut_factor'}
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1"><Label class="text-white/70">Applied Torque</Label><Input type="number" step="1" bind:value={form.installation.appliedTorque} /></div>
            <div class="space-y-1"><Label class="text-white/70">Nut Factor</Label><Input type="number" step="0.01" bind:value={form.installation.nutFactor} /></div>
          </div>
        {:else}
          <div class="space-y-1">
            <Label class="text-white/70">Target Preload</Label>
            <Input type="number" step="1" bind:value={form.installation.targetPreload} />
          </div>
        {/if}
      </CardContent>
    </Card>

    <Card class="glass-card">
      <CardHeader class="pb-2 pt-4">
        <CardTitle class="text-[10px] font-bold uppercase tracking-widest text-indigo-300">Libraries / Defaults</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <div class="space-y-1">
            <Label class="text-white/70">Fastener family</Label>
            <Select
              bind:value={form.selectedFastenerId}
              items={PRELOAD_FASTENER_CATALOG.map((item) => ({ value: item.id, label: item.label }))}
            />
            <div class="text-xs text-white/50">{selectedFastener.notes}</div>
          </div>
          <div class="space-y-1">
            <Label class="text-white/70">Hi-Lok dash diameter</Label>
            <Select
              bind:value={form.selectedFastenerDash}
              items={selectedFastener.dashVariants.map((variant) => ({
                value: variant.dash,
                label: `-${variant.dash} • ${fmt(variant.nominalDiameterIn, 4)} in • ${variant.threadCallout}`
              }))}
            />
            <div class="text-xs text-white/50">Series/dash import resolves the exact displayed nominal diameter and thread callout for the selected pin family.</div>
          </div>
          <div class="space-y-1">
            <Label class="text-white/70">Hi-Lok grip code</Label>
            <Select
              bind:value={form.selectedFastenerGrip}
              items={selectedFastener.gripTable.map((entry) => ({
                value: entry.gripCode,
                label: `-${entry.gripCode} • ${fmt(entry.nominalGripIn, 4)} in nominal grip`
              }))}
            />
            <div class="text-xs text-white/50">Grip table is imported in 1/16 in increments; verify the exact manufacturer dash/grip line before release use.</div>
          </div>
          <div class="space-y-1">
            <Label class="text-white/70">Fastener material</Label>
            <Select
              bind:value={form.selectedFastenerMaterialId}
              items={PRELOAD_MATERIAL_LIBRARY.map((item) => ({ value: item.id, label: item.name }))}
            />
            <div class="text-xs text-white/50">Updates bolt modulus and fastener strength defaults. Explicit geometry remains user-entered.</div>
          </div>
          <div class="space-y-1">
            <Label class="text-white/70">Plate material</Label>
            <Select
              bind:value={form.selectedPlateMaterialId}
              items={PRELOAD_MATERIAL_LIBRARY.map((item) => ({ value: item.id, label: item.name }))}
            />
            <div class="text-xs text-white/50">Updates clamped plate layer modulus, thermal expansion, and bearing allowable defaults.</div>
          </div>
          <div class="space-y-1">
            <Label class="text-white/70">Washer material</Label>
            <Select
              bind:value={form.selectedWasherMaterialId}
              items={PRELOAD_MATERIAL_LIBRARY.map((item) => ({ value: item.id, label: item.name }))}
            />
            <div class="text-xs text-white/50">Updates explicit washer-stack modulus and thermal expansion defaults.</div>
          </div>
        </div>
        <div class="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/72">
          <div class="font-semibold text-white/80">Selected fastener catalog entry</div>
          <div class="mt-2">Head style: <span class="text-cyan-200">{selectedFastener.headStyle}</span></div>
          <div>Thread detail: <span class="text-cyan-200">{selectedFastener.threadDetail}</span></div>
          <div>Selected dash: <span class="text-cyan-200">-{form.selectedFastenerDash}</span></div>
          <div>Dash diameter: <span class="text-cyan-200">{selectedFastenerDashVariant ? fmt(selectedFastenerDashVariant.nominalDiameterIn, 4) : '—'}</span></div>
          <div>Thread callout: <span class="text-cyan-200">{selectedFastenerDashVariant?.threadCallout ?? '—'}</span></div>
          <div>Selected grip code: <span class="text-cyan-200">-{form.selectedFastenerGrip}</span></div>
          <div>Nominal grip: <span class="text-cyan-200">{selectedFastenerGripVariant ? fmt(selectedFastenerGripVariant.nominalGripIn, 4) : '—'}</span></div>
          <div>Grip range: <span class="text-cyan-200">{selectedFastener.gripRangeNote}</span></div>
          <div>Collar compatibility: <span class="text-cyan-200">{selectedFastenerDashVariant?.collarPart ?? selectedFastener.collarCompatibility}</span></div>
          <div>Nominal diameter: <span class="text-cyan-200">{selectedFastener.nominalDiameterIn === null ? 'dash-specific / manufacturer table' : fmt(selectedFastener.nominalDiameterIn, 4)}</span></div>
          {#if selectedFastener.sourceUrl}
            <div class="mt-2 text-white/55">Series source: <a href={selectedFastener.sourceUrl} target="_blank" rel="noreferrer" class="text-cyan-300 underline underline-offset-2">vendor reference</a></div>
          {/if}
          {#if selectedFastener.materialIsAssumed}
            <div class="mt-2 text-amber-200">Material family shown is a series-level assumption only. Confirm exact dash-table data before release use.</div>
          {/if}
        </div>
      </CardContent>
    </Card>

    <Card class="glass-card">
      <CardHeader class="pb-2 pt-4">
        <CardTitle class="text-[10px] font-bold uppercase tracking-widest text-indigo-300">Joint Inputs</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1"><Label class="text-white/70">Nominal Dia</Label><Input type="number" step="0.0001" bind:value={form.nominalDiameter} /></div>
          <div class="space-y-1"><Label class="text-white/70">Tensile Stress Area</Label><Input type="number" step="0.0001" bind:value={form.tensileStressArea} /></div>
          <div class="space-y-1"><Label class="text-white/70">Scatter %</Label><Input type="number" step="0.1" bind:value={form.installationScatterPercent} /></div>
          <div class="space-y-1"><Label class="text-white/70">Cone Half-Angle (visual)</Label><Input type="number" step="0.1" bind:value={form.compressionConeHalfAngleDeg} /></div>
          <div class="space-y-1"><Label class="text-white/70">Slip Coeff</Label><Input type="number" step="0.01" bind:value={form.fayingSurfaceSlipCoeff} /></div>
          <div class="space-y-1"><Label class="text-white/70">Interface Count</Label><Input type="number" step="1" bind:value={form.frictionInterfaceCount} /></div>
          <div class="space-y-1"><Label class="text-white/70">Proof Strength</Label><Input type="number" step="1000" bind:value={form.boltProofStrength} /></div>
          <div class="space-y-1"><Label class="text-white/70">Ultimate Strength</Label><Input type="number" step="1000" bind:value={form.boltUltimateStrength} /></div>
          <div class="space-y-1"><Label class="text-white/70">Endurance Limit</Label><Input type="number" step="1000" bind:value={form.boltEnduranceLimit} /></div>
          <div class="space-y-1"><Label class="text-white/70">Bearing Allowable</Label><Input type="number" step="1000" bind:value={form.memberBearingAllowable} /></div>
          <div class="space-y-1"><Label class="text-white/70">Under-Head Bearing Area</Label><Input type="number" step="0.0001" bind:value={form.underHeadBearingArea} /></div>
          <div class="space-y-1"><Label class="text-white/70">Engaged Thread Length</Label><Input type="number" step="0.0001" bind:value={form.engagedThreadLength} /></div>
        </div>
      </CardContent>
    </Card>

    <Card class="glass-card">
      <CardHeader class="pb-2 pt-4">
        <CardTitle class="text-[10px] font-bold uppercase tracking-widest text-indigo-300">Washer / Under-Head Stack</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <label class="flex items-center gap-2 text-sm text-white/75">
          <input type="checkbox" class="checkbox checkbox-sm border-white/20 bg-black/30" bind:checked={form.washerStack.enabled} />
          Include explicit washer stack in member compliance
        </label>
        {#if form.washerStack.enabled}
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1"><Label class="text-white/70">Under Head Count</Label><Input type="number" step="1" bind:value={form.washerStack.underHeadCount} /></div>
            <div class="space-y-1"><Label class="text-white/70">Under Nut Count</Label><Input type="number" step="1" bind:value={form.washerStack.underNutCount} /></div>
            <div class="space-y-1"><Label class="text-white/70">Thickness / Washer</Label><Input type="number" step="0.0001" bind:value={form.washerStack.thicknessPerWasher} /></div>
            <div class="space-y-1"><Label class="text-white/70">Modulus</Label><Input type="number" step="1000" bind:value={form.washerStack.modulus} /></div>
            <div class="space-y-1"><Label class="text-white/70">Head Outer Dia</Label><Input type="number" step="0.0001" bind:value={form.washerStack.underHeadOuterDiameter} /></div>
            <div class="space-y-1"><Label class="text-white/70">Head Inner Dia</Label><Input type="number" step="0.0001" bind:value={form.washerStack.underHeadInnerDiameter} /></div>
            <div class="space-y-1"><Label class="text-white/70">Nut Outer Dia</Label><Input type="number" step="0.0001" bind:value={form.washerStack.underNutOuterDiameter} /></div>
            <div class="space-y-1"><Label class="text-white/70">Nut Inner Dia</Label><Input type="number" step="0.0001" bind:value={form.washerStack.underNutInnerDiameter} /></div>
            <div class="space-y-1"><Label class="text-white/70">Thermal α</Label><Input type="number" step="0.0000001" bind:value={form.washerStack.thermalExpansionCoeff} /></div>
          </div>
          <div class="text-xs text-white/55">Washer annuli are inserted explicitly into the joint stack. Current total washers: {effectiveWasherCount}. They are not approximated as a hidden correction factor.</div>
          {#if output}
            <div class="rounded-lg border border-cyan-400/15 bg-cyan-500/5 p-2 text-xs text-cyan-100">
              Washer-stack equivalent stiffness: <span class="font-mono">{fmt(output.stiffness.washers.stiffness, 3)}</span>
              <span class="text-white/55"> • compliance {fmt(output.stiffness.washers.compliance, 8)} • equivalent segments {output.stiffness.washers.equivalentSegments}</span>
            </div>
          {/if}
        {/if}
      </CardContent>
    </Card>

    <Card class="glass-card">
      <CardHeader class="pb-2 pt-4">
        <CardTitle class="text-[10px] font-bold uppercase tracking-widest text-indigo-300">Bolt Segments</CardTitle>
      </CardHeader>
      <CardContent class="space-y-3">
        {#each form.boltSegments as segment, index}
          <div class={`rounded-xl border p-3 ${boltValidation(segment).length ? 'border-amber-400/30 bg-amber-500/8' : 'border-white/10 bg-black/20'}`}>
            <div class="mb-3 flex items-center justify-between gap-2">
              <div class="text-xs font-semibold text-white/75">{segment.id}</div>
              <div class="flex items-center gap-1 rounded-lg border border-white/10 bg-black/20 p-1">
                <Button size="sm" variant="ghost" class="min-w-8 px-2 text-[10px]" aria-label="Move bolt segment up" on:click={() => moveBoltSegment(index, -1)} disabled={index === 0}>^</Button>
                <Button size="sm" variant="ghost" class="min-w-8 px-2 text-[10px]" aria-label="Move bolt segment down" on:click={() => moveBoltSegment(index, 1)} disabled={index === form.boltSegments.length - 1}>v</Button>
                <Button size="sm" variant="ghost" class="min-w-10 px-2 text-[10px]" aria-label="Duplicate bolt segment" on:click={() => duplicateBoltSegment(index)}>dup</Button>
                <Button size="sm" variant="ghost" class="min-w-8 px-2 text-[10px]" aria-label="Remove bolt segment" on:click={() => removeBoltSegment(index)} disabled={form.boltSegments.length <= 1}>x</Button>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1"><Label class="text-white/60">ID</Label><Input bind:value={segment.id} /></div>
              <div class="space-y-1"><Label class="text-white/60">Length</Label><Input type="number" step="0.0001" bind:value={segment.length} /></div>
              <div class="space-y-1"><Label class="text-white/60">Area</Label><Input type="number" step="0.0001" bind:value={segment.area} /></div>
              <div class="space-y-1"><Label class="text-white/60">Modulus</Label><Input type="number" step="1000" bind:value={segment.modulus} /></div>
            </div>
            <div class="mt-3 rounded-lg border border-cyan-400/15 bg-cyan-500/5 p-2 text-xs text-cyan-100">
              {#if segmentPreview(segment)}
                Segment stiffness preview: <span class="font-mono">{fmt(segmentPreview(segment), 3)}</span>
              {:else}
                Segment stiffness preview unavailable until length, area, and modulus are all positive.
              {/if}
            </div>
            {#if boltValidation(segment).length}
              <ul class="mt-3 list-disc space-y-1 pl-5 text-xs text-amber-200">
                {#each boltValidation(segment) as issue}
                  <li>{issue}</li>
                {/each}
              </ul>
            {/if}
          </div>
        {/each}
        <Button size="sm" variant="secondary" on:click={addBoltSegment}>Add Bolt Segment</Button>
      </CardContent>
    </Card>

    <Card class="glass-card">
      <CardHeader class="pb-2 pt-4">
        <CardTitle class="text-[10px] font-bold uppercase tracking-widest text-indigo-300">Clamped Plate Layers</CardTitle>
      </CardHeader>
      <CardContent class="space-y-3">
        <div class="rounded-lg border border-cyan-400/15 bg-cyan-500/5 p-3 text-xs text-cyan-100">
          Physical layers remain plates. The selector below changes only the effective compression-zone stiffness model used for each plate layer.
        </div>
        {#each form.memberSegments as segment, index}
          <div class={`rounded-xl border p-3 ${memberValidation(segment).length ? 'border-amber-400/30 bg-amber-500/8' : 'border-white/10 bg-black/20'}`}>
            <div class="mb-3 flex items-center justify-between gap-2">
              <div class="text-xs font-semibold text-white/75">{segment.id}</div>
              <div class="flex flex-wrap items-center gap-1 rounded-lg border border-white/10 bg-black/20 p-1">
                <Select
                  class="min-w-[180px]"
                  value={segment.compressionModel}
                  items={[
                    { value: 'cylindrical_annulus', label: 'Uniform compression proxy' },
                    { value: 'conical_frustum_annulus', label: 'Tapered compression proxy' },
                    { value: 'explicit_area', label: 'Direct equivalent area proxy' }
                  ]}
                  on:change={(event) => changeCompressionModel(index, String(event.detail) as MemberSegmentInput['compressionModel'])}
                />
                <Button size="sm" variant="ghost" class="min-w-8 px-2 text-[10px]" aria-label="Move member segment up" on:click={() => moveMemberSegment(index, -1)} disabled={index === 0}>^</Button>
                <Button size="sm" variant="ghost" class="min-w-8 px-2 text-[10px]" aria-label="Move member segment down" on:click={() => moveMemberSegment(index, 1)} disabled={index === form.memberSegments.length - 1}>v</Button>
                <Button size="sm" variant="ghost" class="min-w-10 px-2 text-[10px]" aria-label="Duplicate member segment" on:click={() => duplicateMemberSegment(index)}>dup</Button>
                <Button size="sm" variant="ghost" class="min-w-8 px-2 text-[10px]" aria-label="Remove member segment" on:click={() => removeMemberSegment(index)} disabled={form.memberSegments.length <= 1}>x</Button>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1"><Label class="text-white/60">ID</Label><Input bind:value={segment.id} /></div>
              <div class="space-y-1"><Label class="text-white/60">Plate Thickness</Label><Input type="number" step="0.0001" bind:value={segment.length} /></div>
              <div class="space-y-1"><Label class="text-white/60">Plate Width</Label><Input type="number" step="0.0001" bind:value={segment.plateWidth} /></div>
              <div class="space-y-1"><Label class="text-white/60">Plate Plan Length</Label><Input type="number" step="0.0001" bind:value={segment.plateLength} /></div>
              <div class="space-y-1"><Label class="text-white/60">Modulus</Label><Input type="number" step="1000" bind:value={segment.modulus} /></div>
              <div class="space-y-1"><Label class="text-white/60">Thermal α</Label><Input type="number" step="0.0000001" bind:value={segment.thermalExpansionCoeff} /></div>

              {#if segment.compressionModel === 'cylindrical_annulus'}
                <div class="space-y-1"><Label class="text-white/60">Effective Outer Dia</Label><Input type="number" step="0.0001" bind:value={segment.outerDiameter} /></div>
                <div class="space-y-1"><Label class="text-white/60">Bolt Hole Dia</Label><Input type="number" step="0.0001" bind:value={segment.innerDiameter} /></div>
              {:else if segment.compressionModel === 'conical_frustum_annulus'}
                <div class="space-y-1"><Label class="text-white/60">Effective Outer Dia (start)</Label><Input type="number" step="0.0001" bind:value={segment.outerDiameterStart} /></div>
                <div class="space-y-1"><Label class="text-white/60">Effective Outer Dia (end)</Label><Input type="number" step="0.0001" bind:value={segment.outerDiameterEnd} /></div>
                <div class="space-y-1"><Label class="text-white/60">Bolt Hole Dia</Label><Input type="number" step="0.0001" bind:value={segment.innerDiameter} /></div>
                <div class="rounded-lg border border-cyan-400/20 bg-cyan-500/5 p-2 text-xs text-cyan-100">Exact annular-frustum compliance integration is used for the compressed-zone representation only. The physical part is still a plate layer.</div>
              {:else}
                <div class="space-y-1"><Label class="text-white/60">Explicit Equivalent Area</Label><Input type="number" step="0.0001" bind:value={segment.effectiveArea} /></div>
                <div class="space-y-1"><Label class="text-white/60">Note</Label><Input bind:value={segment.note} /></div>
              {/if}
            </div>
            <div class="mt-2 rounded-lg border border-white/8 bg-white/[0.02] p-2 text-xs text-white/60">
              Physical layer: rectangular plate footprint <span class="font-mono text-white/80">{fmt(segment.plateWidth, 3)} × {fmt(segment.plateLength, 3)}</span> with thickness <span class="font-mono text-white/80">{fmt(segment.length, 3)}</span>. The selected compression model only controls the effective compressed-zone stiffness abstraction.
            </div>
            <div class="mt-3 rounded-lg border border-cyan-400/15 bg-cyan-500/5 p-2 text-xs text-cyan-100">
              {#if memberPreview(segment)}
                Segment stiffness preview: <span class="font-mono">{fmt(memberPreview(segment)?.stiffness, 3)}</span>
                <span class="text-white/55"> • compliance {fmt(memberPreview(segment)?.compliance, 8)}</span>
                <div class="mt-1 text-white/65">Effective compression model: {compressionModelLabel(segment.compressionModel)}</div>
              {:else}
                Segment stiffness preview unavailable until the current compression-model proxy inputs are valid.
              {/if}
            </div>
            {#if memberValidation(segment).length}
              <ul class="mt-3 list-disc space-y-1 pl-5 text-xs text-amber-200">
                {#each memberValidation(segment) as issue}
                  <li>{issue}</li>
                {/each}
              </ul>
            {/if}
          </div>
        {/each}
        <div class="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" on:click={() => addMemberSegment('cylindrical_annulus')}>Add Plate Layer (Uniform Proxy)</Button>
          <Button size="sm" variant="secondary" on:click={() => addMemberSegment('conical_frustum_annulus')}>Add Plate Layer (Tapered Proxy)</Button>
          <Button size="sm" variant="secondary" on:click={() => addMemberSegment('explicit_area')}>Add Plate Layer (Area Proxy)</Button>
        </div>
      </CardContent>
    </Card>

    <Card class="glass-card">
      <CardHeader class="pb-2 pt-4">
        <CardTitle class="text-[10px] font-bold uppercase tracking-widest text-indigo-300">Service Case</CardTitle>
      </CardHeader>
      <CardContent class="grid grid-cols-2 gap-3">
        <div class="space-y-1"><Label class="text-white/70">External Axial</Label><Input type="number" step="1" bind:value={form.serviceCase.externalAxialLoad} /></div>
        <div class="space-y-1"><Label class="text-white/70">External Transverse</Label><Input type="number" step="1" bind:value={form.serviceCase.externalTransverseLoad} /></div>
        <div class="space-y-1"><Label class="text-white/70">Mean Axial</Label><Input type="number" step="1" bind:value={form.serviceCase.meanAxialLoad} /></div>
        <div class="space-y-1"><Label class="text-white/70">Alternating Axial</Label><Input type="number" step="1" bind:value={form.serviceCase.alternatingAxialLoad} /></div>
        <div class="space-y-1"><Label class="text-white/70">ΔT</Label><Input type="number" step="1" bind:value={form.serviceCase.temperatureChange} /></div>
        <div class="space-y-1"><Label class="text-white/70">Embedment Settlement</Label><Input type="number" step="0.00001" bind:value={form.serviceCase.embedmentSettlement} /></div>
      </CardContent>
    </Card>

    <Card class="glass-card">
      <CardHeader class="pb-2 pt-4">
        <CardTitle class="text-[10px] font-bold uppercase tracking-widest text-indigo-300">Adjacent Fastener Screening</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <label class="flex items-center gap-2 text-sm text-white/75">
          <input type="checkbox" class="checkbox checkbox-sm border-white/20 bg-black/30" bind:checked={form.adjacentFastenerScreen.enabled} />
          Enable adjacent-fastener load-transfer screening
        </label>
        {#if form.adjacentFastenerScreen.enabled}
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1"><Label class="text-white/70">Rows</Label><Input type="number" step="1" bind:value={form.adjacentFastenerScreen.rowCount} /></div>
            <div class="space-y-1"><Label class="text-white/70">Columns</Label><Input type="number" step="1" bind:value={form.adjacentFastenerScreen.columnCount} /></div>
            <div class="space-y-1"><Label class="text-white/70">Row pitch</Label><Input type="number" step="0.0001" bind:value={form.adjacentFastenerScreen.rowPitch} /></div>
            <div class="space-y-1"><Label class="text-white/70">Column pitch</Label><Input type="number" step="0.0001" bind:value={form.adjacentFastenerScreen.columnPitch} /></div>
            <div class="space-y-1"><Label class="text-white/70">Edge distance X</Label><Input type="number" step="0.0001" bind:value={form.adjacentFastenerScreen.edgeDistanceX} /></div>
            <div class="space-y-1"><Label class="text-white/70">Edge distance Y</Label><Input type="number" step="0.0001" bind:value={form.adjacentFastenerScreen.edgeDistanceY} /></div>
            <div class="space-y-1"><Label class="text-white/70">Eccentricity X</Label><Input type="number" step="0.0001" bind:value={form.adjacentFastenerScreen.eccentricityX} /></div>
            <div class="space-y-1"><Label class="text-white/70">Eccentricity Y</Label><Input type="number" step="0.0001" bind:value={form.adjacentFastenerScreen.eccentricityY} /></div>
            <div class="space-y-1"><Label class="text-white/70">Plate stiffness X/Y</Label><Input type="number" step="0.05" bind:value={form.adjacentFastenerScreen.plateStiffnessRatioX} /></div>
            <div class="space-y-1"><Label class="text-white/70">Plate stiffness Y/X</Label><Input type="number" step="0.05" bind:value={form.adjacentFastenerScreen.plateStiffnessRatioY} /></div>
            <div class="space-y-1"><Label class="text-white/70">Bypass edge factor</Label><Input type="number" step="0.01" min="0" max="1" bind:value={form.adjacentFastenerScreen.bypassLoadFactor} /></div>
            <div class="space-y-1"><Label class="text-white/70">Transfer efficiency</Label><Input type="number" step="0.01" min="0" max="1" bind:value={form.adjacentFastenerScreen.transferEfficiency} /></div>
          </div>
          <div class="rounded-lg border border-cyan-400/15 bg-cyan-500/5 p-3 text-xs text-cyan-100">
            2D bolt-pattern solver: an explicit coordinate matrix distributes axial relief, shear, and in-plane torsional moment using row/column geometry, directional plate-stiffness ratios, and a bypass-style loaded-edge bias.
            This is a mechanics-based bolt-pattern model, not a hidden continuum plate solver.
          </div>
          <div class="rounded-lg border border-white/10 bg-black/20 p-3">
            <div class="mb-2 flex items-center justify-between">
              <div class="text-[10px] uppercase tracking-widest text-white/45">Load cases</div>
              <Button size="sm" variant="secondary" on:click={addLoadCase}>Add Load Case</Button>
            </div>
            <div class="space-y-2">
              {#each form.adjacentFastenerScreen.loadCases as loadCase, index}
                <div class="rounded-lg border border-white/8 bg-white/[0.02] p-2">
                  <div class="mb-2 flex items-center justify-between gap-2">
                    <Input bind:value={loadCase.label} class="max-w-[220px]" />
                    <div class="flex items-center gap-1 rounded-lg border border-white/10 bg-black/20 p-1">
                      <Button size="sm" variant="ghost" class="min-w-8 px-2 text-[10px]" on:click={() => moveLoadCase(index, -1)} disabled={index === 0}>^</Button>
                      <Button size="sm" variant="ghost" class="min-w-8 px-2 text-[10px]" on:click={() => moveLoadCase(index, 1)} disabled={index === form.adjacentFastenerScreen.loadCases.length - 1}>v</Button>
                      <Button size="sm" variant="ghost" class="min-w-10 px-2 text-[10px]" on:click={() => duplicateLoadCase(index)}>dup</Button>
                      <Button size="sm" variant="ghost" class="min-w-8 px-2 text-[10px]" on:click={() => removeLoadCase(index)} disabled={form.adjacentFastenerScreen.loadCases.length <= 1}>x</Button>
                    </div>
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <div class="space-y-1"><Label class="text-white/60">Axial</Label><Input type="number" step="1" bind:value={loadCase.externalAxialLoad} /></div>
                    <div class="space-y-1"><Label class="text-white/60">Shear X</Label><Input type="number" step="1" bind:value={loadCase.externalShearX} /></div>
                    <div class="space-y-1"><Label class="text-white/60">Shear Y</Label><Input type="number" step="1" bind:value={loadCase.externalShearY} /></div>
                    <div class="space-y-1"><Label class="text-white/60">Moment Mz</Label><Input type="number" step="0.1" bind:value={loadCase.externalMomentZ} /></div>
                  </div>
                </div>
              {/each}
            </div>
          </div>
          <div class="rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-white/75">
            <div>Fasteners in pattern: <span class="font-mono text-cyan-300">{adjacentFastenerCount}</span></div>
            <div>Neighbor count: <span class="font-mono text-cyan-300">{adjacentNeighborCount}</span></div>
            <div>Governing load case: <span class="font-mono text-amber-200">{governingLoadCaseLabel}</span></div>
            <div>Attenuation: <span class="font-mono text-cyan-300">{fmt(adjacentTransferAttenuation, 4)}</span></div>
            <div>Axial to each adjacent: <span class="font-mono text-cyan-300">{fmt(adjacentAxialPerNeighbor, 2)}</span></div>
            <div>Transverse to each adjacent: <span class="font-mono text-cyan-300">{fmt(adjacentTransversePerNeighbor, 2)}</span></div>
            <div>Current fastener equivalent: <span class="font-mono text-cyan-300">{fmt(currentFastenerEquivalentLoad, 2)}</span></div>
            <div>Adjacent fastener equivalent: <span class="font-mono text-cyan-300">{fmt(adjacentFastenerEquivalentLoad, 2)}</span></div>
            <div class="mt-2">Critical fastener: <span class="font-semibold text-amber-200">{criticalFastenerLabel}</span></div>
          </div>
          {#if fastenerCaseEnvelopeRows.length}
            <div class="rounded-lg border border-white/10 bg-black/20 p-3">
              <div class="mb-2 text-[10px] uppercase tracking-widest text-white/45">Per-case critical envelopes</div>
              <svg viewBox="0 0 320 170" class="h-auto w-full rounded-lg border border-white/8 bg-black/20 p-2" aria-label="Preload fastener-group case envelopes">
                <rect x="16" y="16" width="288" height="138" rx="12" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.08)" />
                {#each fastenerCaseEnvelopeRows as row}
                  {@const y = 42 + row.index * 24}
                  <text x="26" y={y + 4} fill={row.isGoverning ? 'rgba(253,230,138,0.92)' : 'rgba(255,255,255,0.70)'} font-size="10">{row.label}</text>
                  <line x1="98" y1={y} x2="256" y2={y} stroke="rgba(255,255,255,0.10)" stroke-width="2" stroke-linecap="round" />
                  <line x1="98" y1={y} x2={98 + row.ratio * 158} y2={y} stroke={row.isGoverning ? '#fde68a' : '#22d3ee'} stroke-width="5" stroke-linecap="round" />
                  <circle cx={98 + row.ratio * 158} cy={y} r="4" fill={row.isGoverning ? '#fde68a' : '#67e8f9'} />
                  <text x="268" y={y + 4} text-anchor="end" fill="rgba(255,255,255,0.62)" font-size="9">{row.criticalFastenerLabel} • {fmt(row.demand, 2)}</text>
                {/each}
                <text x="24" y="150" fill="rgba(255,255,255,0.55)" font-size="10">Each bar shows the peak equivalent fastener demand within that load case. The longest bar is the governing case.</text>
              </svg>
            </div>
          {/if}
          {#if fastenerGroupResult}
            <div class="rounded-lg border border-white/10 bg-black/20 p-3">
              <div class="mb-2 text-[10px] uppercase tracking-widest text-white/45">Pattern distribution</div>
              <div class="grid grid-cols-[0.7fr_0.8fr_0.8fr_0.8fr_0.8fr_1fr] gap-x-2 text-[10px] uppercase tracking-widest text-white/35">
                <div>Fast</div>
                <div>R/C</div>
                <div>X</div>
                <div>Y</div>
                <div>Share</div>
                <div>Eqv</div>
              </div>
              <div class="mt-2 space-y-1">
                {#each fastenerGroupResult.fasteners as fastener}
                  <div class={`grid grid-cols-[0.7fr_0.8fr_0.8fr_0.8fr_0.8fr_1fr] gap-x-2 rounded-md px-2 py-1 text-xs ${fastener.index === fastenerGroupResult.criticalFastenerIndex ? 'bg-amber-500/10 text-amber-100 border border-amber-400/20' : 'bg-white/[0.02] text-white/72 border border-white/5'}`}>
                    <div>F{fastener.index + 1}</div>
                    <div class="font-mono">{fastener.row + 1}/{fastener.column + 1}</div>
                    <div class="font-mono">{fmt(fastener.x, 3)}</div>
                    <div class="font-mono">{fmt(fastener.y, 3)}</div>
                    <div class="font-mono">{fmt(fastener.loadShare, 4)}</div>
                    <div class="font-mono">{fmt(fastener.equivalentDemand, 2)}</div>
                  </div>
                {/each}
              </div>
              <div class="mt-3 text-xs text-white/55">{fastenerGroupResult.note}</div>
            </div>
            <div class="rounded-lg border border-white/10 bg-black/20 p-3">
              <div class="mb-2 text-[10px] uppercase tracking-widest text-white/45">Bolt map / load heatmap</div>
              <svg viewBox="0 0 320 220" class="h-auto w-full rounded-lg border border-white/8 bg-black/20 p-2" aria-label="Preload bolt pattern map">
                <defs>
                  <linearGradient id="bolt-map-grad" x1="0" x2="1">
                    <stop offset="0%" stop-color="#22d3ee" />
                    <stop offset="100%" stop-color="#fb7185" />
                  </linearGradient>
                </defs>
                <rect x="16" y="16" width="288" height="188" rx="12" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.08)" />
                {#each fastenerGroupResult.fasteners as fastener}
                  {@const normX = form.adjacentFastenerScreen.columnCount > 1 ? fastener.column / (form.adjacentFastenerScreen.columnCount - 1) : 0.5}
                  {@const normY = form.adjacentFastenerScreen.rowCount > 1 ? fastener.row / (form.adjacentFastenerScreen.rowCount - 1) : 0.5}
                  {@const x = 56 + normX * 208}
                  {@const y = 52 + normY * 116}
                  {@const ratio = fastenerGroupResult.criticalEquivalentDemand > 0 ? fastener.equivalentDemand / fastenerGroupResult.criticalEquivalentDemand : 0}
                  <circle cx={x} cy={y} r={10 + ratio * 8} fill={`rgba(${Math.round(34 + 210 * ratio)}, ${Math.round(211 - 90 * ratio)}, ${Math.round(238 - 90 * ratio)}, ${0.38 + ratio * 0.42})`} stroke={fastener.index === fastenerGroupResult.criticalFastenerIndex ? '#fde68a' : 'rgba(255,255,255,0.38)'} stroke-width={fastener.index === fastenerGroupResult.criticalFastenerIndex ? 3 : 1.5} />
                  <text x={x} y={y + 4} text-anchor="middle" fill="rgba(255,255,255,0.88)" font-size="9" font-weight="700">F{fastener.index + 1}</text>
                {/each}
                <text x="20" y="198" fill="rgba(255,255,255,0.55)" font-size="10">Loaded edge reference = top-left origin • brighter/hotter circles = higher demand</text>
              </svg>
            </div>
            <div class="rounded-lg border border-white/10 bg-black/20 p-3">
              <div class="mb-2 text-[10px] uppercase tracking-widest text-white/45">Influence matrix heatmap</div>
              <svg viewBox="0 0 320 320" class="h-auto w-full rounded-lg border border-white/8 bg-black/20 p-2" aria-label="Preload geometry influence matrix heatmap" data-preload-heatmap-svg="true">
                <rect x="40" y="24" width="248" height="248" rx="10" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.08)" />
                {#each fastenerGroupResult.geometryInfluenceMatrix as row, rowIndex}
                  {#each row as cell, columnIndex}
                    {@const size = 248 / Math.max(fastenerGroupResult.geometryInfluenceMatrix.length, 1)}
                    {@const x = 40 + columnIndex * size}
                    {@const y = 24 + rowIndex * size}
                    <rect
                      x={x}
                      y={y}
                      width={size}
                      height={size}
                      fill={`rgba(${Math.round(34 + 150 * cell)}, ${Math.round(99 + 120 * cell)}, ${Math.round(235 - 40 * cell)}, ${0.18 + cell * 0.65})`}
                      stroke="rgba(255,255,255,0.06)"
                    />
                  {/each}
                {/each}
                {#each fastenerGroupResult.fasteners as fastener}
                  {@const size = 248 / Math.max(fastenerGroupResult.geometryInfluenceMatrix.length, 1)}
                  <text x={52 + fastener.index * size} y="16" fill="rgba(255,255,255,0.5)" font-size="9">F{fastener.index + 1}</text>
                  <text x="10" y={40 + fastener.index * size} fill="rgba(255,255,255,0.5)" font-size="9">F{fastener.index + 1}</text>
                {/each}
                <text x="40" y="296" fill="rgba(255,255,255,0.55)" font-size="10">Brighter cells = stronger geometric coupling / influence between fastener pairs.</text>
              </svg>
            </div>
          {/if}
        {/if}
      </CardContent>
    </Card>
  </div>

  <div class="flex flex-col gap-4 overflow-y-auto pb-24 pr-2 scrollbar-hide">
    <Card class="glass-card">
      <CardHeader class="pb-2 pt-4">
        <CardTitle class="text-[10px] font-bold uppercase tracking-widest text-emerald-300">Joint Section Model</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1">
            <Label class="text-white/70">Visualization Mode</Label>
            <Select
              bind:value={visualizationMode}
              items={[
                { value: 'classical_cone', label: 'Classical cone' },
                { value: 'equivalent_annulus', label: 'Equivalent annulus only' }
              ]}
            />
          </div>
          <div class="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/65">
            {#if visualizationMode === 'classical_cone'}
              Classical view: pressure cones originate at the active bearing faces under the head and nut (or washers).
            {:else}
              Equivalent annulus view: rows scale to the explicit equivalent annulus used by the stiffness model.
            {/if}
          </div>
        </div>
        {#if output}
          <svg bind:this={jointSectionSvg} viewBox="0 0 560 560" class="h-auto w-full rounded-xl border border-white/10 bg-black/20 p-2" aria-label="Preload joint section panel">
            <defs>
              <linearGradient id="joint-frustum-fill" x1="0" x2="1">
                <stop offset="0%" stop-color="rgba(34,211,238,0.10)" />
                <stop offset="100%" stop-color="rgba(34,211,238,0.30)" />
              </linearGradient>
              <linearGradient id="joint-bolt-fill" x1="0" x2="1">
                <stop offset="0%" stop-color="rgba(148,163,184,0.58)" />
                <stop offset="50%" stop-color="rgba(226,232,240,0.78)" />
                <stop offset="100%" stop-color="rgba(148,163,184,0.58)" />
              </linearGradient>
            </defs>
            <text x="22" y="30" fill="rgba(255,255,255,0.82)" font-size="16" font-weight="700">Explicit Joint Stack</text>
            <text x="22" y="48" fill="rgba(255,255,255,0.55)" font-size="11">Full-height stack with explicit head, nut, washers, and row-capped compression envelope.</text>
            <rect x={jointViewport.left} y={jointViewport.top} width={jointViewport.width} height={jointViewport.height} rx="14" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" />
            <rect x="34" y="86" width="312" height="418" rx="12" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.06)" />
            <rect x="358" y="86" width="154" height="418" rx="12" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.06)" />
            <line x1={jointViewport.centerX} y1="88" x2={jointViewport.centerX} y2="502" stroke="rgba(255,255,255,0.16)" stroke-width="2" stroke-dasharray="4 4" />
            <rect
              x={jointViewport.centerX - headBlock.width / 2}
              y={headBlock.y + 8}
              width={headBlock.width}
              height={headBlock.height - 10}
              rx="10"
              fill="rgba(148,163,184,0.16)"
              stroke="rgba(226,232,240,0.20)"
            />
            <ellipse
              cx={jointViewport.centerX}
              cy={headBlock.y + 8}
              rx={headBlock.width / 2 - 6}
              ry="8"
              fill="rgba(226,232,240,0.10)"
              stroke="rgba(226,232,240,0.16)"
            />
            <rect
              x={jointViewport.centerX - Math.max(jointBoltWidthPx * 0.92, 16) / 2}
              y={headBlock.y + 11}
              width={Math.max(jointBoltWidthPx * 0.92, 16)}
              height="12"
              rx="3"
              fill="rgba(148,163,184,0.34)"
              stroke="rgba(226,232,240,0.26)"
            />
            <polygon
              points={`${jointViewport.centerX - Math.max(jointBoltWidthPx * 1.25, 20) / 2},${headBlock.y + 26} ${jointViewport.centerX},${headBlock.y + 20} ${jointViewport.centerX + Math.max(jointBoltWidthPx * 1.25, 20) / 2},${headBlock.y + 26}`}
              fill="rgba(226,232,240,0.08)"
              stroke="rgba(226,232,240,0.18)"
            />
            <polygon
              points={`${jointViewport.centerX - nutBlock.width / 2},${nutBlock.y + 8} ${jointViewport.centerX - nutBlock.width / 2 + 18},${nutBlock.y} ${jointViewport.centerX + nutBlock.width / 2 - 18},${nutBlock.y} ${jointViewport.centerX + nutBlock.width / 2},${nutBlock.y + 8} ${jointViewport.centerX + nutBlock.width / 2},${nutBlock.y + nutBlock.height - 8} ${jointViewport.centerX + nutBlock.width / 2 - 18},${nutBlock.y + nutBlock.height} ${jointViewport.centerX - nutBlock.width / 2 + 18},${nutBlock.y + nutBlock.height} ${jointViewport.centerX - nutBlock.width / 2},${nutBlock.y + nutBlock.height - 8}`}
              fill="rgba(148,163,184,0.20)"
              stroke="rgba(226,232,240,0.22)"
            />
            <rect
              x={jointViewport.centerX - Math.max(jointBoltWidthPx * 0.88, 16) / 2}
              y={nutBlock.y + 11}
              width={Math.max(jointBoltWidthPx * 0.88, 16)}
              height="12"
              rx="3"
              fill="rgba(148,163,184,0.34)"
              stroke="rgba(226,232,240,0.26)"
            />
            <line
              x1={jointViewport.centerX - nutBlock.width / 2 + 12}
              y1={nutBlock.y + 7}
              x2={jointViewport.centerX + nutBlock.width / 2 - 12}
              y2={nutBlock.y + 7}
              stroke="rgba(226,232,240,0.16)"
              stroke-width="1"
            />
            <rect
              x={jointViewport.centerX - jointBoltWidthPx / 2}
              y={headBlock.y}
              width={jointBoltWidthPx}
              height={nutBlock.y + nutBlock.height - headBlock.y}
              rx="8"
              fill="url(#joint-bolt-fill)"
              stroke="rgba(226,232,240,0.34)"
            />
            {#each Array.from({ length: 4 }, (_, index) => nutBlock.y + 12 + index * 4) as nutThreadY}
              <line
                x1={jointViewport.centerX - jointBoltWidthPx / 2 - 1}
                y1={nutThreadY}
                x2={jointViewport.centerX - jointBoltWidthPx / 2 + 6}
                y2={nutThreadY + 2.5}
                stroke="rgba(226,232,240,0.38)"
                stroke-width="0.9"
              />
              <line
                x1={jointViewport.centerX + jointBoltWidthPx / 2 + 1}
                y1={nutThreadY}
                x2={jointViewport.centerX + jointBoltWidthPx / 2 - 6}
                y2={nutThreadY + 2.5}
                stroke="rgba(226,232,240,0.38)"
                stroke-width="0.9"
              />
            {/each}
            <path d={rightThreadHelixPath} fill="none" stroke="rgba(226,232,240,0.58)" stroke-width="1.15" stroke-linecap="round" />
            <path d={leftThreadHelixPath} fill="none" stroke="rgba(226,232,240,0.42)" stroke-width="1" stroke-linecap="round" />
            <text x={jointViewport.legendX} y="108" fill="rgba(255,255,255,0.72)" font-size="11">Hardware + faces</text>
            <text x={jointViewport.legendX} y="132" fill="rgba(255,255,255,0.58)" font-size="10">Head face Ø {fmt(topBearingFaceOuterDiameter, 3)}</text>
            <text x={jointViewport.legendX} y="146" fill="rgba(255,255,255,0.58)" font-size="10">Nut face Ø {fmt(bottomBearingFaceOuterDiameter, 3)}</text>
            <text x={jointViewport.legendX} y="160" fill="rgba(255,255,255,0.58)" font-size="10">Bolt / stud Ø {fmt(form.nominalDiameter, 3)}</text>
            <text x={jointViewport.legendX} y="174" fill="rgba(255,255,255,0.50)" font-size="10">Hi-Lok-like collar, exposed threaded shank</text>
            {#if visualizationMode === 'classical_cone'}
              {#if topConeEnvelopePoints}
                <polygon
                  points={topConeEnvelopePoints}
                  fill="url(#joint-frustum-fill)"
                  stroke="rgba(34,211,238,0.52)"
                />
              {/if}
              {#if bottomConeEnvelopePoints}
                <polygon
                  points={bottomConeEnvelopePoints}
                  fill="url(#joint-frustum-fill)"
                  stroke="rgba(34,211,238,0.52)"
                />
              {/if}
            {/if}
            {#each stackRenderRows as row}
              <line
                x1="56"
                y1={jointY(row.start)}
                x2="344"
                y2={jointY(row.start)}
                stroke="rgba(255,255,255,0.08)"
                stroke-width="1"
              />
              <rect
                x={jointViewport.centerX - row.outerWidthPx / 2}
                y={jointY(row.start)}
                width={Math.max(2, (row.outerWidthPx - row.innerWidthPx) / 2)}
                height={row.pixelHeight}
                rx={row.kind === 'washer' ? 3 : 8}
                fill={row.fill}
                stroke={row.stroke}
                stroke-width={row.kind === 'washer' ? 2 : 1}
              />
              <rect
                x={jointViewport.centerX + row.innerWidthPx / 2}
                y={jointY(row.start)}
                width={Math.max(2, (row.outerWidthPx - row.innerWidthPx) / 2)}
                height={row.pixelHeight}
                rx={row.kind === 'washer' ? 3 : 8}
                fill={row.fill}
                stroke={row.stroke}
                stroke-width={row.kind === 'washer' ? 2 : 1}
              />
              {#if row.kind === 'washer'}
                <rect
                  x={jointViewport.centerX - row.outerWidthPx / 2 - 4}
                  y={jointY(row.start) - 2}
                  width={row.outerWidthPx + 8}
                  height={row.pixelHeight + 4}
                  rx="6"
                  fill="rgba(250,204,21,0.08)"
                  stroke="rgba(250,204,21,0.98)"
                  stroke-width="2"
                />
                <rect
                  x={jointViewport.centerX - row.innerWidthPx / 2 - 1}
                  y={jointY(row.start) - 1}
                  width={row.innerWidthPx + 2}
                  height={row.pixelHeight + 2}
                  fill="url(#joint-bolt-fill)"
                  stroke="rgba(250,204,21,0.58)"
                  stroke-width="1"
                />
                <rect
                  x={jointViewport.centerX - jointDiameterPx(row.displayOuterDiameter) / 2 - 2}
                  y={jointY(row.start) - 1}
                  width={Math.max(10, jointDiameterPx(row.displayOuterDiameter)) + 4}
                  height={row.pixelHeight + 2}
                  rx="4"
                  fill="none"
                  stroke="rgba(250,204,21,0.86)"
                  stroke-width="1.5"
                />
                <line x1="66" y1={row.labelY} x2="124" y2={row.labelY} stroke="rgba(250,204,21,0.72)" stroke-width="1.5" />
                <line
                  x1="124"
                  y1={row.labelY}
                  x2={jointViewport.centerX - row.outerWidthPx / 2 - 8}
                  y2={row.labelY}
                  stroke="rgba(250,204,21,0.48)"
                  stroke-width="1"
                  stroke-dasharray="3 2"
                />
                <text x="68" y={row.labelY - 8} fill="rgba(250,204,21,0.98)" font-size="10" font-weight="700">{row.displayLabel}</text>
              {:else}
                <text x="60" y={row.labelY + 4} fill="rgba(255,255,255,0.72)" font-size="10">{row.displayLabel}</text>
              {/if}
            {/each}
            <line
              x1="56"
              y1={jointY(stackTotalLength)}
              x2="344"
              y2={jointY(stackTotalLength)}
              stroke="rgba(255,255,255,0.08)"
              stroke-width="1"
            />
            {#if splitPlaneY !== null}
              <line x1="56" y1={splitPlaneY} x2="344" y2={splitPlaneY} stroke="rgba(248,250,252,0.28)" stroke-width="2" stroke-dasharray="6 4" />
              <text x="48" y={splitPlaneY - 8} fill="rgba(255,255,255,0.80)" font-size="10">Split plane / load-transfer interface</text>
            {/if}
            <text x="48" y="104" fill="rgba(255,255,255,0.70)" font-size="11">Member / washer stack</text>
            {#if visualizationMode === 'classical_cone'}
              <text x={jointViewport.legendX} y="210" fill="rgba(34,211,238,0.82)" font-size="11">Classical cone</text>
              <text x={jointViewport.legendX} y="226" fill="rgba(255,255,255,0.58)" font-size="10">Each side starts at its</text>
              <text x={jointViewport.legendX} y="240" fill="rgba(255,255,255,0.58)" font-size="10">bearing face, widens</text>
              <text x={jointViewport.legendX} y="254" fill="rgba(255,255,255,0.58)" font-size="10">toward the mid-plane,</text>
              <text x={jointViewport.legendX} y="268" fill="rgba(255,255,255,0.58)" font-size="10">and is capped per row.</text>
            {:else}
              <text x={jointViewport.legendX} y="210" fill="rgba(34,211,238,0.82)" font-size="11">Equivalent annulus</text>
              <text x={jointViewport.legendX} y="226" fill="rgba(255,255,255,0.58)" font-size="10">Cone overlay hidden.</text>
              <text x={jointViewport.legendX} y="240" fill="rgba(255,255,255,0.58)" font-size="10">Row widths follow the</text>
              <text x={jointViewport.legendX} y="254" fill="rgba(255,255,255,0.58)" font-size="10">explicit stiffness model.</text>
            {/if}
            <line x1="48" y1={jointViewport.rowTop} x2="64" y2={jointViewport.rowTop} stroke="rgba(255,255,255,0.32)" />
            <line x1="48" y1={jointViewport.rowBottom} x2="64" y2={jointViewport.rowBottom} stroke="rgba(255,255,255,0.32)" />
            <text x={jointViewport.legendX} y="314" fill="rgba(255,255,255,0.70)" font-size="11">Stack geometry</text>
            <text x={jointViewport.legendX} y="330" fill="rgba(255,255,255,0.58)" font-size="10">Thickness {fmt(stackTotalLength, 3)}</text>
            <text x={jointViewport.legendX} y="344" fill="rgba(255,255,255,0.58)" font-size="10">Cone half-angle {fmt(compressionConeHalfAngleDeg, 1)}°</text>
            <text x={jointViewport.legendX} y="358" fill="rgba(255,255,255,0.58)" font-size="10">Washers top {washerTopCount}</text>
            <text x={jointViewport.legendX} y="372" fill="rgba(255,255,255,0.58)" font-size="10">Washers bottom {washerBottomCount}</text>
            <text x={jointViewport.legendX} y="398" fill="rgba(255,255,255,0.70)" font-size="11">Interpretation</text>
            <text x={jointViewport.legendX} y="414" fill="rgba(255,255,255,0.58)" font-size="10">Blue field = classical</text>
            <text x={jointViewport.legendX} y="428" fill="rgba(255,255,255,0.58)" font-size="10">compression zone only.</text>
            <text x={jointViewport.legendX} y="442" fill="rgba(255,255,255,0.58)" font-size="10">Solver still uses explicit</text>
            <text x={jointViewport.legendX} y="456" fill="rgba(255,255,255,0.58)" font-size="10">segment stiffness values.</text>
          </svg>
          <div class="rounded-xl border border-white/10 bg-black/20 p-3">
            <div class="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/50">Visible Stack Map</div>
            <div class="grid grid-cols-[1.5fr_0.8fr_0.9fr_1fr] gap-x-3 text-[10px] uppercase tracking-widest text-white/40">
              <div>Row</div>
              <div>Thk</div>
              <div>Do,eff</div>
              <div>k row</div>
            </div>
            <div class="mt-2 space-y-1">
              {#each stackTableRows as row}
                <div class="grid grid-cols-[1.5fr_0.8fr_0.9fr_1fr] gap-x-3 rounded-lg border border-white/6 bg-white/[0.02] px-2 py-1 text-xs text-white/72">
                  <div>{row.id} <span class="text-white/40">({row.kind})</span></div>
                  <div class="font-mono">{fmt(row.thickness, 3)}</div>
                  <div class="font-mono">{fmt(row.displayOuterDiameter, 3)}</div>
                  <div class="font-mono">{fmt(row.stiffnessContribution, 2)}</div>
                </div>
              {/each}
            </div>
          </div>
          <div class="rounded-xl border border-cyan-400/15 bg-cyan-500/5 p-3 text-xs text-cyan-100">
            Default cone half-angle is 30.0° for visualization, matching the common Shigley pressure-cone assumption. Literature commonly treats 25°–35° as reasonable, while FEA studies report lower values around 20°–28° for smaller bolts and shorter grips. The angle remains user-editable here and does not override the explicit segment stiffness model.
          </div>
          <div class="flex flex-wrap gap-2">
            <Button variant="secondary" on:click={exportJointSectionSvg} disabled={!output}>Export Joint Section SVG</Button>
          </div>
        {/if}
      </CardContent>
    </Card>

    <Card class="glass-card">
      <CardHeader class="pb-2 pt-4">
        <CardTitle class="text-[10px] font-bold uppercase tracking-widest text-emerald-300">Preload Chart / Reserve Envelope</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        {#if output}
          <svg bind:this={summarySvg} viewBox="0 0 560 340" class="h-auto w-full rounded-xl border border-white/10 bg-black/20 p-2" data-preload-summary-svg="true" aria-label="Preload summary panel">
            <defs>
              <linearGradient id="preload-bar-cyan" x1="0" x2="1">
                <stop offset="0%" stop-color="#22d3ee" />
                <stop offset="100%" stop-color="#67e8f9" />
              </linearGradient>
              <linearGradient id="preload-bar-green" x1="0" x2="1">
                <stop offset="0%" stop-color="#34d399" />
                <stop offset="100%" stop-color="#6ee7b7" />
              </linearGradient>
              <linearGradient id="preload-bar-rose" x1="0" x2="1">
                <stop offset="0%" stop-color="#fb7185" />
                <stop offset="100%" stop-color="#fda4af" />
              </linearGradient>
            </defs>
            <text x="22" y="30" fill="rgba(255,255,255,0.82)" font-size="16" font-weight="700">Preload Ladder + Scatter</text>
            <text x="22" y="48" fill="rgba(255,255,255,0.55)" font-size="11">Installed preload, uncertainty band, service clamp force, and reserve envelopes.</text>
            <rect x="22" y="68" width="516" height="122" rx="14" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" />
            <line x1="70" y1="96" x2="70" y2="170" stroke="rgba(255,255,255,0.18)" stroke-width="2" />
            <rect x="118" y={170 - (74 * clampInstalled) / clampMax} width="74" height={(74 * clampInstalled) / clampMax} rx="10" fill="url(#preload-bar-cyan)" />
            <rect x="258" y={170 - (74 * clampService) / clampMax} width="74" height={(74 * clampService) / clampMax} rx="10" fill={output.service?.hasSeparated ? 'url(#preload-bar-rose)' : 'url(#preload-bar-green)'} />
            <line x1="155" y1={170 - (74 * scatterMin) / clampMax} x2="155" y2={170 - (74 * scatterMax) / clampMax} stroke="#fde68a" stroke-width="4" stroke-linecap="round" />
            <line x1="147" y1={170 - (74 * scatterMin) / clampMax} x2="163" y2={170 - (74 * scatterMin) / clampMax} stroke="#fde68a" stroke-width="2" />
            <line x1="147" y1={170 - (74 * scatterMax) / clampMax} x2="163" y2={170 - (74 * scatterMax) / clampMax} stroke="#fde68a" stroke-width="2" />
            <text x="155" y="186" text-anchor="middle" fill="rgba(255,255,255,0.72)" font-size="12">Installed</text>
            <text x="295" y="186" text-anchor="middle" fill="rgba(255,255,255,0.72)" font-size="12">Service</text>
            <text x="366" y="102" fill="#fde68a" font-size="11">Scatter band ±{fmt(form.installationScatterPercent, 1)}%</text>
            <text x="366" y="122" fill="rgba(255,255,255,0.64)" font-size="11">Bolt rise = {fmt(output.service?.boltLoadIncrease, 2)}</text>
            <text x="366" y="139" fill="rgba(255,255,255,0.64)" font-size="11">Clamp loss = {fmt(output.service?.clampForceLoss, 2)}</text>
            <text x="366" y="156" fill="rgba(255,255,255,0.64)" font-size="11">Separation load = {fmt(output.service?.separationLoad, 2)}</text>
            <text x="366" y="173" fill="rgba(255,255,255,0.64)" font-size="11">Post-separation bolt load = {fmt(output.service?.boltLoadPostSeparation, 2)}</text>

            <text x="22" y="228" fill="rgba(255,255,255,0.82)" font-size="16" font-weight="700">Reserve Envelopes (min / nominal / max)</text>
            <rect x="22" y="240" width="516" height="76" rx="14" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" />
            {#each reserveEnvelopeRows as row, envelopeIndex}
              <text x="36" y={258 + envelopeIndex * 12} fill="rgba(255,255,255,0.70)" font-size="10">{row.label}</text>
              <line x1="118" y1={254 + envelopeIndex * 12} x2="350" y2={254 + envelopeIndex * 12} stroke="rgba(255,255,255,0.08)" />
              <line x1={118 + Math.min(232, Math.max(0, 232 * Number(row.envelope.min ?? 0)))} y1={254 + envelopeIndex * 12} x2={118 + Math.min(232, Math.max(0, 232 * Number(row.envelope.max ?? 0)))} y2={254 + envelopeIndex * 12} stroke={row.color} stroke-width="3" stroke-linecap="round" />
              <circle cx={118 + Math.min(232, Math.max(0, 232 * Number(row.envelope.nominal ?? 0)))} cy={254 + envelopeIndex * 12} r="4" fill={row.color} />
              <text x="366" y={258 + envelopeIndex * 12} fill="rgba(255,255,255,0.60)" font-size="10">{fmt(row.envelope.min, 3)} / {fmt(row.envelope.nominal, 3)} / {fmt(row.envelope.max, 3)}</text>
            {/each}
            <text x="22" y="334" fill={output.service?.hasSeparated ? '#fda4af' : '#bbf7d0'} font-size="11">
              {output.service?.hasSeparated
                ? 'Separated state active: additional axial load transfers directly into bolt response.'
                : 'Joint remains clamped: interface compression remains active under the stated service load.'}
            </text>
          </svg>
        {/if}

        <div class="flex flex-wrap gap-2">
          <Button on:click={exportSummarySvg} disabled={!output}>Export Summary SVG</Button>
          <Button variant="secondary" on:click={exportPdfReport} disabled={!output}>Export PDF Equation Sheet</Button>
          <Button variant="secondary" on:click={exportAuditCsv} disabled={!output}>Export Audit CSV</Button>
          <Button variant="secondary" on:click={exportAuditJson} disabled={!output}>Export Audit JSON</Button>
        </div>
        {#if exportError}
          <div class="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-xs text-red-200">{exportError}</div>
        {/if}
        {#if solverError}
          <div class="rounded-lg border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-100">{solverError}</div>
        {/if}
      </CardContent>
    </Card>

    <Card class="glass-card">
      <CardHeader class="pb-2 pt-4">
        <CardTitle class="text-[10px] font-bold uppercase tracking-widest text-emerald-300">Spring Analogy</CardTitle>
      </CardHeader>
      <CardContent class="space-y-3">
        {#if output}
          <svg viewBox="0 0 560 210" class="h-auto w-full rounded-xl border border-white/10 bg-black/20 p-2" aria-label="Preload spring analogy panel">
            <text x="18" y="24" fill="rgba(255,255,255,0.82)" font-size="15" font-weight="700">Equivalent Springs</text>
            <text x="18" y="42" fill="rgba(255,255,255,0.55)" font-size="11">Classical spring analogy: bolt in tension at the center, clamped members in compression at the sides.</text>

            <rect x="92" y="60" width="376" height="12" rx="6" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.10)" />
            <rect x="92" y="150" width="376" height="12" rx="6" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.10)" />

            {#each [150, 280, 410] as springX, springIndex}
              <path
                d={`M ${springX} 72
                    C ${springX + 14} 82, ${springX - 14} 92, ${springX} 102
                    C ${springX + 14} 112, ${springX - 14} 122, ${springX} 132
                    C ${springX + 14} 142, ${springX - 14} 150, ${springX} 158`}
                fill="none"
                stroke={springIndex === 1 ? '#cbd5e1' : '#34d399'}
                stroke-width={springIndex === 1 ? 3 : 2.4}
                stroke-linecap="round"
              />
            {/each}
            <line x1="280" y1="58" x2="280" y2="174" stroke="rgba(255,255,255,0.10)" stroke-dasharray="4 4" />
            <text x="150" y="184" text-anchor="middle" fill="rgba(52,211,153,0.82)" font-size="11">Member spring branch</text>
            <text x="280" y="184" text-anchor="middle" fill="rgba(203,213,225,0.88)" font-size="11">Bolt spring</text>
            <text x="410" y="184" text-anchor="middle" fill="rgba(52,211,153,0.82)" font-size="11">Member spring branch</text>
            <text x="18" y="202" fill="rgba(255,255,255,0.60)" font-size="10">k_b = {fmt(output.stiffness.bolt.stiffness, 2)} • k_m = {fmt(output.stiffness.members.stiffness, 2)} • C = {fmt(output.stiffness.jointConstant, 4)}</text>
          </svg>
          <div class="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/70">
            <div class="font-semibold uppercase tracking-widest text-[10px] text-white/50">Axial Load Transfer</div>
            <div class="mt-2">
              Additional external axial load is shared by the joint springs:
              <span class="font-mono text-cyan-200"> bolt rise = C × F</span>,
              <span class="font-mono text-emerald-200"> clamp loss in members = (1 - C) × F</span>.
            </div>
            <div class="mt-2">
              For the current case:
              <span class="font-mono text-cyan-200"> bolt rise = {fmt(output.service?.boltLoadIncrease, 2)}</span>,
              <span class="font-mono text-emerald-200"> member compression relieved = {fmt(output.service?.clampForceLoss, 2)}</span>.
            </div>
            <div class="mt-2">
              After separation, the members stop taking additional axial relief and the extra axial load transfers directly into the bolt.
            </div>
          </div>
        {/if}
      </CardContent>
    </Card>

    <Card class="glass-card">
      <CardHeader class="pb-2 pt-4">
        <CardTitle class="text-[10px] font-bold uppercase tracking-widest text-emerald-300">Computed State</CardTitle>
      </CardHeader>
      <CardContent class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div class="rounded-xl border border-white/10 bg-black/20 p-4">
          <div class="text-[10px] uppercase tracking-widest text-white/45">Installation</div>
          {#if output}
            <div class="mt-3 text-sm text-white/85">Preload: <span class="font-mono text-cyan-300">{fmt(output.installation.preload)}</span></div>
            <div class="mt-1 text-sm text-white/70">Scatter Range: {fmt(output.installation.preloadMin)} → {fmt(output.installation.preloadMax)}</div>
            <div class="mt-1 text-sm text-white/70">Model: {output.installation.model}</div>
            {#if output.installation.model === 'exact_torque'}
              <div class="mt-1 text-sm text-white/70">Thread Torque: {fmt(output.installation.threadTorque)}</div>
              <div class="mt-1 text-sm text-white/70">Bearing Torque: {fmt(output.installation.bearingTorque)}</div>
            {/if}
          {/if}
        </div>

        <div class="rounded-xl border border-white/10 bg-black/20 p-4">
          <div class="text-[10px] uppercase tracking-widest text-white/45">Stiffness</div>
          {#if output}
            <div class="mt-3 text-sm text-white/85">k<sub>b</sub>: <span class="font-mono text-cyan-300">{fmt(output.stiffness.bolt.stiffness)}</span></div>
            <div class="mt-1 text-sm text-white/85">k<sub>m</sub>: <span class="font-mono text-cyan-300">{fmt(output.stiffness.members.stiffness)}</span></div>
            <div class="mt-1 text-sm text-white/70">Joint Constant C: {fmt(output.stiffness.jointConstant, 6)}</div>
            <div class="mt-1 text-sm text-white/70">Washers: {output.stiffness.washers.enabled ? `${output.stiffness.washers.count} active` : 'off'}</div>
          {/if}
        </div>

        <div class="rounded-xl border border-white/10 bg-black/20 p-4">
          <div class="text-[10px] uppercase tracking-widest text-white/45">Bearing / Crushing</div>
          {#if output}
            <div class="mt-3 text-sm text-white/85">Under-head: {output.checks.bearing.underHead.status} ({fmt(output.checks.bearing.underHead.utilization, 4)})</div>
            <div class="mt-1 text-sm text-white/85">Thread-bearing: {output.checks.bearing.threadBearing.status} ({fmt(output.checks.bearing.threadBearing.utilization, 4)})</div>
            <div class="mt-1 text-sm text-white/85">Local crushing: {output.checks.bearing.localCrushing.status} ({fmt(output.checks.bearing.localCrushing.utilization, 4)})</div>
            <div class="mt-1 text-sm text-white/70">Governing: {output.checks.bearing.governing ?? 'unavailable'}</div>
          {/if}
        </div>

        <div class="rounded-xl border border-white/10 bg-black/20 p-4">
          <div class="text-[10px] uppercase tracking-widest text-white/45">Fatigue Envelope</div>
          {#if output}
            <div class="mt-3 text-sm text-white/85">Goodman: {fmt(output.checks.fatigue.goodmanEquivalent, 4)}</div>
            <div class="mt-1 text-sm text-white/85">Soderberg: {fmt(output.checks.fatigue.soderbergEquivalent, 4)}</div>
            <div class="mt-1 text-sm text-white/85">Gerber: {fmt(output.checks.fatigue.gerberEquivalent, 4)}</div>
            <div class="mt-1 text-sm text-white/70">Status: {output.checks.fatigue.status} ({fmt(output.checks.fatigue.utilization, 4)})</div>
          {/if}
        </div>
      </CardContent>
    </Card>

    <Card class="glass-card">
      <CardHeader class="pb-2 pt-4">
        <CardTitle class="text-[10px] font-bold uppercase tracking-widest text-indigo-300">Audit Report</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/75">
          Export uses the same explicit intermediate values returned by the solver: torque terms, segmented stiffness, service redistribution, separation/slip state, and strength checks.
        </div>
        {#if output}
          <div class="rounded-xl border border-white/10 bg-black/20 p-4">
            <div class="text-[10px] uppercase tracking-widest text-white/45">Explicit Assumptions</div>
            <ul class="mt-3 list-disc space-y-2 pl-5 text-sm text-white/70">
              {#each output.assumptions as assumption}
                <li>{assumption}</li>
              {/each}
            </ul>
          </div>
        {/if}
      </CardContent>
    </Card>
  </div>
</div>
