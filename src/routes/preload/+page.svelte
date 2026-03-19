<script lang="ts">
    import { fly } from 'svelte/transition';
  import { onDestroy, onMount } from 'svelte';
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
  import { safeModeStore } from '$lib/stores/safeModeStore';
  import { cn } from '$lib/utils';
  import {
    buildPreloadEquationSheetHtml,
    computeFastenedJointPreload,
    solveFastenerGroupPattern,
    solveFastenerGroupPatternCases,
    PRELOAD_FASTENER_CATALOG,
    PRELOAD_IMPORT_PROVENANCE,
    getPreloadFastener,
    getPreloadMaterial,
    PRELOAD_MATERIAL_LIBRARY,
    solveMemberSegmentStiffness,
    type BoltSegmentInput,
    type FastenedJointPreloadInput,
    type FastenerGroupPatternLoadCaseInput,
    type MemberSegmentInput
  } from '$lib/core/preload';

  const STORAGE_KEY = 'scd.preload.inputs.v2';
  const LEGACY_STORAGE_KEYS = ['scd.preload.inputs.v1'];
  const STEP_SNAPSHOT_KEY = 'scd.preload.step-snapshots.v1';
  const STEP_HINTS_KEY = 'scd.preload.step-hints.v1';
  const STEP_TELEMETRY_KEY = 'scd.preload.step-telemetry.v1';
  const STEP_PREFS_KEY = 'scd.preload.step-prefs.v1';
  type WorkflowStep = 'fastener' | 'materials' | 'geometry' | 'review';
  type PreloadForm = Omit<FastenedJointPreloadInput, 'serviceCase' | 'washerStack'> & {
    featureFlags: NonNullable<FastenedJointPreloadInput['featureFlags']>;
    installationUncertainty: NonNullable<FastenedJointPreloadInput['installationUncertainty']>;
    washerStack: NonNullable<FastenedJointPreloadInput['washerStack']>;
    serviceCase: NonNullable<FastenedJointPreloadInput['serviceCase']>;
    useCustomBoltSegments: boolean;
    useCustomPlateLayers: boolean;
    defaultPlateWidth: number;
    defaultPlateLength: number;
    defaultTopPlateThickness: number;
    defaultBottomPlateThickness: number;
    defaultPlateCompressionModel: MemberSegmentInput['compressionModel'];
    useSamePlateMaterial: boolean;
    useSameWasherMaterial: boolean;
    selectedPlateMaterialId: string;
    selectedTopPlateMaterialId: string;
    selectedBottomPlateMaterialId: string;
    selectedWasherMaterialId: string;
    selectedHeadWasherMaterialId: string;
    selectedNutWasherMaterialId: string;
    washerGeometryManualOverride: boolean;
    conicalGeometryManualOverride: boolean;
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
  const localButtonBase =
    'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold tracking-tight transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/40 disabled:pointer-events-none disabled:opacity-50 hover:brightness-110 hover:scale-[1.01] active:scale-[0.99]';
  const localButtonVariants = {
    primary: 'bg-teal-400 text-black hover:bg-teal-300',
    secondary: 'bg-white/10 text-white hover:bg-white/15',
    outline: 'border border-white/12 bg-white/0 text-white hover:bg-white/6',
    ghost: 'bg-transparent text-white/80 hover:bg-white/6 hover:text-white'
  } as const;
  const localButtonSizes = {
    sm: 'h-8 px-3',
    md: 'h-9 px-4'
  } as const;
  function localButtonClass(
    variant: keyof typeof localButtonVariants = 'secondary',
    size: keyof typeof localButtonSizes = 'sm',
    className = ''
  ) {
    return cn(localButtonBase, localButtonVariants[variant], localButtonSizes[size], className);
  }

  function readStoredInputs() {
    if (typeof window === 'undefined') return null;
    const keys = [STORAGE_KEY, ...LEGACY_STORAGE_KEYS];
    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        return JSON.parse(raw) as Partial<PreloadForm>;
      } catch {
        continue;
      }
    }
    return null;
  }

  function estimateThreadedArea(nominalDiameter: number) {
    const d = Math.max(0.05, Number(nominalDiameter));
    return Math.max(0.0001, Math.PI * 0.25 * Math.pow(d * 0.84, 2));
  }

  function buildAutoBoltSegments(
    nominalDiameter: number,
    boltModulus: number,
    gripLength: number,
    engagedThreadLength: number
  ): BoltSegmentInput[] {
    const shankLength = Math.max(0.05, Number(gripLength));
    const threadedLength = Math.max(0.05, Number(engagedThreadLength));
    return [
      {
        id: 'grip-shank',
        length: shankLength,
        area: Math.max(0.0001, Math.PI * 0.25 * nominalDiameter * nominalDiameter),
        modulus: boltModulus
      },
      {
        id: 'engaged-thread',
        length: threadedLength,
        area: estimateThreadedArea(nominalDiameter),
        modulus: boltModulus
      }
    ];
  }

  function buildAutoPlateLayers(
    plateWidth: number,
    plateLength: number,
    topThickness: number,
    bottomThickness: number,
    modulus: number,
    nominalDiameter: number,
    compressionModel: MemberSegmentInput['compressionModel'],
    compressionConeHalfAngleDeg = 30
  ): MemberSegmentInput[] {
    const safePlateWidth = Math.max(0.1, Number(plateWidth));
    const safePlateLength = Math.max(0.1, Number(plateLength));
    const proxyOuterDiameter = Math.min(Math.max(safePlateWidth, safePlateLength), Math.max(nominalDiameter * 2.6, nominalDiameter + 0.5));
    const safeGap = Math.max(0.001, Number(nominalDiameter || 0.5) * 0.05);
    const makeLayer = (id: string, thickness: number): MemberSegmentInput => {
      if (compressionModel === 'conical_frustum_annulus') {
        const layerThickness = Math.max(0.02, Number(thickness));
        const inner = Math.max(0, Number(nominalDiameter));
        const footprintCap = Math.min(safePlateWidth, safePlateLength);
        const cap = Math.max(inner + safeGap, footprintCap || inner + safeGap);
        const start = Math.max(inner + safeGap, Math.min(cap, Math.max(inner + safeGap, nominalDiameter * 1.6)));
        const spread = 2 * layerThickness * Math.tan((Math.max(5, Math.min(45, Number(compressionConeHalfAngleDeg || 30))) * Math.PI) / 180);
        const end = Math.max(inner + safeGap, Math.min(cap, Math.max(start + safeGap, start + spread)));
        return {
          id,
          plateWidth: safePlateWidth,
          plateLength: safePlateLength,
          compressionModel,
          length: layerThickness,
          modulus,
          outerDiameterStart: start,
          outerDiameterEnd: end,
          innerDiameter: inner
        };
      }
      if (compressionModel === 'explicit_area') {
        return {
          id,
          plateWidth: safePlateWidth,
          plateLength: safePlateLength,
          compressionModel,
          length: Math.max(0.02, Number(thickness)),
          modulus,
          effectiveArea: Math.max(0.0001, safePlateWidth * safePlateLength * 0.22),
          note: 'Auto-derived from rectangular plate footprint'
        };
      }
      if (compressionModel === 'calibrated_vdi_equivalent') {
        return {
          id,
          plateWidth: safePlateWidth,
          plateLength: safePlateLength,
          compressionModel,
          length: Math.max(0.02, Number(thickness)),
          modulus,
          innerDiameter: nominalDiameter,
          note: 'Auto-derived calibrated cone / VDI-style equivalent row'
        };
      }
      return {
        id,
        plateWidth: safePlateWidth,
        plateLength: safePlateLength,
        compressionModel,
        length: Math.max(0.02, Number(thickness)),
        modulus,
        outerDiameter: proxyOuterDiameter,
        innerDiameter: nominalDiameter
      };
    };
    return [makeLayer('top-plate', topThickness), makeLayer('bottom-plate', bottomThickness)];
  }

  function normalizeMemberSegment(segment: MemberSegmentInput): MemberSegmentInput {
    const plateWidth = Number(('plateWidth' in segment ? segment.plateWidth : undefined) ?? 2.5);
    const plateLength = Number(('plateLength' in segment ? segment.plateLength : undefined) ?? 3.5);
    return {
      ...segment,
      plateWidth: Number.isFinite(plateWidth) && plateWidth > 0 ? plateWidth : 2.5,
      plateLength: Number.isFinite(plateLength) && plateLength > 0 ? plateLength : 3.5
    } as MemberSegmentInput;
  }

  function readSelectValue(event: CustomEvent<unknown>, fallback: string): string {
    const detail = event.detail as string | number | { value?: string | number } | null | undefined;
    if (typeof detail === 'string' || typeof detail === 'number') return String(detail);
    if (detail && typeof detail === 'object' && 'value' in detail && detail.value != null) {
      return String(detail.value);
    }
    return fallback;
  }

  const defaultForm = (): PreloadForm => ({
    featureFlags: { v2Foundation: true },
    nominalDiameter: 0.5,
    tensileStressArea: 0.1419,
    boltModulus: 30_000_000,
    compressionConeHalfAngleDeg: 30,
    installationScatterPercent: 15,
    installationUncertainty: {
      legacyScatterPercent: 15,
      toolAccuracyPercent: 3,
      threadFrictionPercent: 6,
      bearingFrictionPercent: 4,
      prevailingTorquePercent: 2,
      threadGeometryPercent: 1
    },
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
    selectedTopPlateMaterialId: 'al2024',
    selectedBottomPlateMaterialId: 'al2024',
    selectedWasherMaterialId: 'washer_steel',
    selectedHeadWasherMaterialId: 'washer_steel',
    selectedNutWasherMaterialId: 'washer_steel',
    washerGeometryManualOverride: false,
    conicalGeometryManualOverride: false,
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
      embedmentSettlement: 0.00008,
      coatingCrushLoss: 0,
      washerSeatingLoss: 0,
      relaxationLossPercent: 0,
      creepLossPercent: 0
    }
    ,
    useCustomBoltSegments: false,
    useCustomPlateLayers: false,
    defaultPlateWidth: 2.5,
    defaultPlateLength: 3.5,
    defaultTopPlateThickness: 0.3,
    defaultBottomPlateThickness: 0.3,
    defaultPlateCompressionModel: 'cylindrical_annulus',
    useSamePlateMaterial: true,
    useSameWasherMaterial: true
  });

  let form: PreloadForm = $state(defaultForm());
  let exportError = $state('');
  let solverError = $state('');
  let output = $state<ReturnType<typeof computeFastenedJointPreload> | null>(null);
  let selectedInstallationModel = $state<FastenedJointPreloadInput['installation']['model']>('exact_torque');
  let visualizationMode = $state<'classical_cone' | 'equivalent_annulus'>('classical_cone');
  let workflowStep = $state<WorkflowStep>('fastener');
  let showAdvancedInputs = $state<boolean>(false);
  const workflowOrder: WorkflowStep[] = ['fastener', 'materials', 'geometry', 'review'];
  type StepSnapshot = { form: PreloadForm; savedAt: number };
  type StepPrefs = {
    autoAdvance: boolean;
    walkthrough: boolean;
    autoBearingArea: boolean;
  };
  type StepTelemetry = { totalMs: number; enteredAt: number | null };
  type PreloadIssueAction = { label: string; target?: string; run: () => void };
  type PreloadIssue = {
    key: string;
    title: string;
    description: string;
    severity: 'warning' | 'error';
    actions: PreloadIssueAction[];
  };
  let stepSnapshots: Partial<Record<WorkflowStep, StepSnapshot[]>> = $state({});
  let stepHintsSeen: Partial<Record<WorkflowStep, boolean>> = $state({});
  let stepCompletedAt: Partial<Record<WorkflowStep, number>> = $state({});
  let stepPrefs: StepPrefs = $state({
    autoAdvance: false,
    walkthrough: true,
    autoBearingArea: true
  });
  let stepTelemetry: Record<WorkflowStep, StepTelemetry> = $state({
    fastener: { totalMs: 0, enteredAt: null },
    materials: { totalMs: 0, enteredAt: null },
    geometry: { totalMs: 0, enteredAt: null },
    review: { totalMs: 0, enteredAt: null }
  });
  let stepEnteredAt = $state<number>(Date.now());
  let previousTrackedStep: WorkflowStep = 'fastener';
  let snapshotTimer: ReturnType<typeof setTimeout> | null = null;
  let stepToastTimer: ReturnType<typeof setTimeout> | null = null;
  let stepToast: { open: boolean; text: string; tone: 'info' | 'ok' | 'warn' } = $state({
    open: false,
    text: '',
    tone: 'info'
  });
  let formSignature = '';
  let stepPrefsSignature = '';
  let summarySvg = $state<SVGSVGElement | null>(null);
  let jointSectionSvg = $state<SVGSVGElement | null>(null);
  let loadFullWorkspace = $state(false);
  let activePreloadIssueIndex = $state(0);
  let lastConicalAutoSignature = '';

  if (typeof window !== 'undefined') {
    const parsed = readStoredInputs();
    if (parsed) {
      try {
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
            ...(parsed.adjacentFastenerScreen ?? {}),
            loadCases: Array.isArray(parsed.adjacentFastenerScreen?.loadCases)
              ? parsed.adjacentFastenerScreen?.loadCases ?? baseline.adjacentFastenerScreen.loadCases
              : baseline.adjacentFastenerScreen.loadCases
          },
          washerStack: {
            ...baseline.washerStack,
            ...(parsed.washerStack ?? {})
          },
          serviceCase: {
            ...baseline.serviceCase,
            ...(parsed.serviceCase ?? {})
          },
          installationUncertainty: {
            ...baseline.installationUncertainty,
            ...(parsed.installationUncertainty ?? {})
          },
          installation: {
            ...baseline.installation,
            ...(parsed.installation ?? {})
          }
        };
        const restoredInstallationModel = parsed.installation?.model;
        selectedInstallationModel =
          restoredInstallationModel === 'exact_torque' ||
          restoredInstallationModel === 'nut_factor' ||
          restoredInstallationModel === 'direct_preload'
            ? restoredInstallationModel
            : baseline.installation.model;
      } catch {
        form = defaultForm();
      }
    }
  }

  function readStepPersistence() {
    if (typeof window === 'undefined') return;
    try {
      const snapshotsRaw = localStorage.getItem(STEP_SNAPSHOT_KEY);
      if (snapshotsRaw) stepSnapshots = JSON.parse(snapshotsRaw) as Partial<Record<WorkflowStep, StepSnapshot[]>>;
      const hintsRaw = localStorage.getItem(STEP_HINTS_KEY);
      if (hintsRaw) stepHintsSeen = JSON.parse(hintsRaw) as Partial<Record<WorkflowStep, boolean>>;
      const telemetryRaw = localStorage.getItem(STEP_TELEMETRY_KEY);
      if (telemetryRaw) {
        const parsed = JSON.parse(telemetryRaw) as Partial<Record<WorkflowStep, StepTelemetry>>;
        stepTelemetry = {
          fastener: parsed.fastener ?? stepTelemetry.fastener,
          materials: parsed.materials ?? stepTelemetry.materials,
          geometry: parsed.geometry ?? stepTelemetry.geometry,
          review: parsed.review ?? stepTelemetry.review
        };
      }
      const prefsRaw = localStorage.getItem(STEP_PREFS_KEY);
      if (prefsRaw) {
        const parsedPrefs = JSON.parse(prefsRaw) as Partial<StepPrefs>;
        stepPrefs = {
          autoAdvance: parsedPrefs.autoAdvance ?? stepPrefs.autoAdvance,
          walkthrough: parsedPrefs.walkthrough ?? stepPrefs.walkthrough,
          autoBearingArea: parsedPrefs.autoBearingArea ?? stepPrefs.autoBearingArea
        };
      }
    } catch {
      stepSnapshots = {};
      stepHintsSeen = {};
    }
  }

  function persistStepState() {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STEP_SNAPSHOT_KEY, JSON.stringify(stepSnapshots));
    localStorage.setItem(STEP_HINTS_KEY, JSON.stringify(stepHintsSeen));
    localStorage.setItem(STEP_TELEMETRY_KEY, JSON.stringify(stepTelemetry));
    localStorage.setItem(STEP_PREFS_KEY, JSON.stringify(stepPrefs));
  }

  function saveStepSnapshot(step: WorkflowStep) {
    const history = stepSnapshots[step] ?? [];
    const latest = history[history.length - 1];
    const nextSnapshot = {
      form: clone(form),
      savedAt: Date.now()
    };
    if (latest && JSON.stringify(latest.form) === JSON.stringify(nextSnapshot.form)) return;
    stepSnapshots = {
      ...stepSnapshots,
      [step]: [...history.slice(-4), nextSnapshot]
    };
    persistStepState();
  }

  function revertStepSnapshot(step: WorkflowStep) {
    const history = stepSnapshots[step] ?? [];
    const snapshot = history[history.length - 1];
    if (!snapshot) return;
    form = clone(snapshot.form);
    selectedInstallationModel = form.installation.model;
  }

  function revertPreviousStepSnapshot(step: WorkflowStep) {
    const history = stepSnapshots[step] ?? [];
    const snapshot = history[history.length - 2];
    if (!snapshot) return;
    form = clone(snapshot.form);
    selectedInstallationModel = form.installation.model;
  }

  function fieldId(id: string) {
    return `preload-${id}`;
  }

  type StepFieldCheck = { id: string; label: string; valid: boolean };
  function stepChecklist(step: WorkflowStep): StepFieldCheck[] {
    if (step === 'fastener') {
      const installationValid =
        form.installation.model !== 'exact_torque' ||
        (form.installation.appliedTorque > 0 &&
          form.installation.threadPitch > 0 &&
          form.installation.threadPitchDiameter > 0 &&
          form.installation.bearingMeanDiameter > 0);
      return [
        { id: fieldId('fastener-family'), label: 'Fastener family', valid: Boolean(form.selectedFastenerId) },
        { id: fieldId('fastener-dash'), label: 'Dash diameter', valid: Boolean(form.selectedFastenerDash) },
        { id: fieldId('fastener-grip'), label: 'Grip code', valid: Boolean(form.selectedFastenerGrip) },
        { id: fieldId('fastener-material'), label: 'Fastener material', valid: Boolean(form.selectedFastenerMaterialId) },
        { id: fieldId('installation-model'), label: 'Installation model inputs', valid: installationValid }
      ];
    }
    if (step === 'materials') {
      return [
        {
          id: fieldId('plate-material'),
          label: 'Plate material(s)',
          valid: form.useSamePlateMaterial
            ? Boolean(form.selectedPlateMaterialId)
            : Boolean(form.selectedTopPlateMaterialId && form.selectedBottomPlateMaterialId)
        },
        {
          id: fieldId('washer-material'),
          label: 'Washer material(s)',
          valid: form.useSameWasherMaterial
            ? Boolean(form.selectedWasherMaterialId)
            : Boolean(form.selectedHeadWasherMaterialId && form.selectedNutWasherMaterialId)
        }
      ];
    }
    if (step === 'geometry') {
      const checklist: StepFieldCheck[] = [
        { id: fieldId('nominal-dia'), label: 'Nominal diameter', valid: form.nominalDiameter > 0 },
        { id: fieldId('stress-area'), label: 'Tensile stress area', valid: form.tensileStressArea > 0 },
        {
          id: fieldId('bearing-area'),
          label: 'Governing bearing area',
          valid: stepPrefs.autoBearingArea ? autoComputedBearingArea > 0 : Number(form.underHeadBearingArea ?? 0) > 0
        }
      ];
      if (!form.useCustomPlateLayers) {
        checklist.push(
          { id: fieldId('plate-width'), label: 'Plate width', valid: form.defaultPlateWidth > 0 },
          { id: fieldId('plate-length'), label: 'Plate length', valid: form.defaultPlateLength > 0 },
          { id: fieldId('top-thk'), label: 'Top plate thickness', valid: form.defaultTopPlateThickness > 0 },
          { id: fieldId('bot-thk'), label: 'Bottom plate thickness', valid: form.defaultBottomPlateThickness > 0 }
        );
      } else {
        checklist.push({
          id: fieldId('plate-layers'),
          label: 'Custom plate rows',
          valid: form.memberSegments.length > 0 && form.memberSegments.every((segment) => memberValidation(segment).length === 0)
        });
      }
      return checklist;
    }
    return [
      { id: fieldId('review-main'), label: 'Solver output', valid: Boolean(output) && !solverError },
      {
        id: fieldId('adjacent-screening'),
        label: 'Pattern screening',
        valid: !form.adjacentFastenerScreen.enabled || Boolean(fastenerGroupResult)
      }
    ];
  }

  function focusByFieldId(id: string) {
    if (typeof document === 'undefined') return;
    const element = document.getElementById(id);
    if (!element) return;
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const focusTarget = element.matches('input,select,button,[tabindex]')
      ? element
      : (element.querySelector('input,select,button,[tabindex]') as HTMLElement | null);
    focusTarget?.focus();
  }

  function focusIssueTarget(id?: string) {
    if (!id) return;
    focusByFieldId(id);
  }

  function focusFirstInvalidField(step: WorkflowStep) {
    const firstInvalid = stepChecklist(step).find((item) => !item.valid);
    if (!firstInvalid) return;
    focusByFieldId(firstInvalid.id);
  }

  function handleNextClick() {
    if (workflowStep !== 'review' && currentStepValid) {
      setWorkflowStep(nextWorkflowStep(workflowStep));
      return;
    }
    showStepToast('Complete required fields to continue.', 'warn');
    focusFirstInvalidField(workflowStep);
  }

  function showStepToast(text: string, tone: 'info' | 'ok' | 'warn' = 'info') {
    if (stepToastTimer) clearTimeout(stepToastTimer);
    stepToast = { open: true, text, tone };
    stepToastTimer = setTimeout(() => {
      stepToast = { open: false, text: '', tone: 'info' };
    }, 2600);
  }

  function stepHintText(step: WorkflowStep) {
    if (step === 'fastener') {
      return 'Tip: Pick family, dash, grip, then installation model.';
    }
    if (step === 'materials') {
      return 'Tip: Keep same-material toggles on unless top/bottom or washer sides differ.';
    }
    if (step === 'geometry') {
      return 'Tip: Start with auto plate layers; enable custom layers only for non-standard stacks.';
    }
    return 'Tip: Validate solver output, pattern screening, and exports before sign-off.';
  }

  function showStepHintToast(step: WorkflowStep) {
    if (!stepPrefs.walkthrough) return;
    showStepToast(stepHintText(step), 'info');
    stepHintsSeen = { ...stepHintsSeen, [step]: true };
    persistStepState();
  }

  function walkthroughTarget(step: WorkflowStep) {
    const checklist = stepChecklist(step);
    return checklist.find((item) => !item.valid) ?? checklist[0] ?? null;
  }

  function stepLabel(step: WorkflowStep) {
    return step === 'fastener' ? 'Fastener' : step === 'materials' ? 'Materials' : step === 'geometry' ? 'Geometry' : 'Review';
  }

  function blockedStepsBeforeReview() {
    return workflowOrder
      .filter((step) => step !== 'review')
      .filter((step) => !isStepValid(step))
      .map((step) => ({
        step,
        label: stepLabel(step),
        remaining: stepChecklist(step).filter((item) => !item.valid)
      }));
  }

  onMount(() => {
    readStepPersistence();
    stepEnteredAt = Date.now();
    previousTrackedStep = workflowStep;
    stepTelemetry[workflowStep] = { ...stepTelemetry[workflowStep], enteredAt: stepEnteredAt };
    persistStepState();
    if (!(stepHintsSeen[workflowStep] ?? false)) showStepHintToast(workflowStep);
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.altKey) return;
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        handleNextClick();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        if (canGoBack) setWorkflowStep(previousWorkflowStep(workflowStep));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (stepToastTimer) clearTimeout(stepToastTimer);
    };
  });

  onDestroy(() => {
    const now = Date.now();
    const elapsed = Math.max(0, now - stepEnteredAt);
    stepTelemetry[workflowStep] = {
      totalMs: stepTelemetry[workflowStep].totalMs + elapsed,
      enteredAt: null
    };
    if (snapshotTimer) clearTimeout(snapshotTimer);
    persistStepState();
  });

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

  let lastPlateMaterialSignature = '';
  let lastWasherMaterialSignature = '';
  let lastFastenerId = '';
  let lastFastenerMaterialId = '';

  function applyPlateMaterialDefaults() {
    const topMaterial = getPreloadMaterial(form.useSamePlateMaterial ? form.selectedPlateMaterialId : form.selectedTopPlateMaterialId);
    const bottomMaterial = getPreloadMaterial(form.useSamePlateMaterial ? form.selectedPlateMaterialId : form.selectedBottomPlateMaterialId);
    form.memberSegments = form.memberSegments.map((segment, index) => {
      const material = index === 0 ? topMaterial : bottomMaterial;
      return {
        ...segment,
        modulus: material.modulusPsi,
        thermalExpansionCoeff: material.thermalExpansionCoeff
      };
    });
    const governingBearing = Math.min(
      topMaterial.bearingAllowablePsi ?? Number.POSITIVE_INFINITY,
      bottomMaterial.bearingAllowablePsi ?? Number.POSITIVE_INFINITY
    );
    if (Number.isFinite(governingBearing)) form.memberBearingAllowable = governingBearing;
  }

  function applyWasherMaterialDefaults() {
    const headMaterial = getPreloadMaterial(form.useSameWasherMaterial ? form.selectedWasherMaterialId : form.selectedHeadWasherMaterialId);
    const nutMaterial = getPreloadMaterial(form.useSameWasherMaterial ? form.selectedWasherMaterialId : form.selectedNutWasherMaterialId);
    const modulus = form.useSameWasherMaterial
      ? headMaterial.modulusPsi
      : (headMaterial.modulusPsi + nutMaterial.modulusPsi) / 2;
    const headAlpha = headMaterial.thermalExpansionCoeff ?? 6.2e-6;
    const nutAlpha = nutMaterial.thermalExpansionCoeff ?? 6.2e-6;
    const thermalExpansionCoeff = form.useSameWasherMaterial ? headAlpha : (headAlpha + nutAlpha) / 2;
    form.washerStack = {
      ...form.washerStack,
      modulus,
      thermalExpansionCoeff
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

  $effect(() => {
    if (selectedInstallationModel !== form.installation.model) setInstallationModel(selectedInstallationModel);
  });
  $effect(() => {
    const signature = form.useSamePlateMaterial
      ? `same:${form.selectedPlateMaterialId}`
      : `split:${form.selectedTopPlateMaterialId}:${form.selectedBottomPlateMaterialId}`;
    if (signature !== lastPlateMaterialSignature) {
      lastPlateMaterialSignature = signature;
      applyPlateMaterialDefaults();
    }
  });
  $effect(() => {
    const signature = form.useSameWasherMaterial
      ? `same:${form.selectedWasherMaterialId}`
      : `split:${form.selectedHeadWasherMaterialId}:${form.selectedNutWasherMaterialId}`;
    if (signature !== lastWasherMaterialSignature) {
      lastWasherMaterialSignature = signature;
      applyWasherMaterialDefaults();
    }
  });
  $effect(() => {
    if (form.selectedFastenerId !== lastFastenerId) {
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
  });
  $effect(() => {
    if (form.selectedFastenerMaterialId !== lastFastenerMaterialId) {
      lastFastenerMaterialId = form.selectedFastenerMaterialId;
      applyFastenerMaterialDefaults(form.selectedFastenerMaterialId);
    }
  });
  $effect(() => {
    if (form.useSamePlateMaterial) {
      form.selectedTopPlateMaterialId = form.selectedPlateMaterialId;
      form.selectedBottomPlateMaterialId = form.selectedPlateMaterialId;
    }
  });
  $effect(() => {
    if (form.useSameWasherMaterial) {
      form.selectedHeadWasherMaterialId = form.selectedWasherMaterialId;
      form.selectedNutWasherMaterialId = form.selectedWasherMaterialId;
    }
  });
  $effect(() => {
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  });

  function isFastenerStepValid(): boolean {
    if (!form.selectedFastenerId || !form.selectedFastenerDash || !form.selectedFastenerGrip) return false;
    if (form.useCustomBoltSegments) return form.boltSegments.every((segment) => boltValidation(segment).length === 0);
    if (form.installation.model === 'exact_torque') {
      return (
        form.nominalDiameter > 0 &&
        form.tensileStressArea > 0 &&
        form.installation.appliedTorque > 0 &&
        form.installation.threadPitch > 0 &&
        form.installation.threadPitchDiameter > 0 &&
        form.installation.bearingMeanDiameter > 0
      );
    }
    if (form.installation.model === 'nut_factor') {
      return form.nominalDiameter > 0 && form.tensileStressArea > 0 && form.installation.appliedTorque > 0 && (form.installation.nutFactor ?? 0) > 0;
    }
    return form.nominalDiameter > 0 && form.tensileStressArea > 0 && (form.installation.targetPreload ?? 0) > 0;
  }

  function isMaterialsStepValid(): boolean {
    const plateOk = form.useSamePlateMaterial
      ? Boolean(form.selectedPlateMaterialId)
      : Boolean(form.selectedTopPlateMaterialId && form.selectedBottomPlateMaterialId);
    const washerOk = form.useSameWasherMaterial
      ? Boolean(form.selectedWasherMaterialId)
      : Boolean(form.selectedHeadWasherMaterialId && form.selectedNutWasherMaterialId);
    return plateOk && washerOk;
  }

  function isGeometryStepValid(): boolean {
    if (form.useCustomPlateLayers) {
      return form.memberSegments.length > 0 && form.memberSegments.every((segment) => memberValidation(segment).length === 0);
    }
    return (
      form.defaultPlateWidth > 0 &&
      form.defaultPlateLength > 0 &&
      form.defaultTopPlateThickness > 0 &&
      form.defaultBottomPlateThickness > 0 &&
      form.nominalDiameter > 0
    );
  }

  function isStepValid(step: WorkflowStep): boolean {
    if (step === 'fastener') return isFastenerStepValid();
    if (step === 'materials') return isMaterialsStepValid();
    if (step === 'geometry') return isGeometryStepValid();
    return Boolean(output) && !solverError;
  }

  function canNavigateToStep(step: WorkflowStep): boolean {
    const targetIndex = workflowOrder.indexOf(step);
    for (let i = 0; i < targetIndex; i += 1) {
      if (!isStepValid(workflowOrder[i])) return false;
    }
    return true;
  }

  function setWorkflowStep(nextStep: WorkflowStep) {
    if (!canNavigateToStep(nextStep)) return;
    const isStepChange = workflowStep !== nextStep;
    workflowStep = nextStep;
    if (isStepChange) showStepHintToast(nextStep);
  }

  function previousWorkflowStep(step: WorkflowStep): WorkflowStep {
    const idx = workflowOrder.indexOf(step);
    return workflowOrder[Math.max(0, idx - 1)];
  }

  function nextWorkflowStep(step: WorkflowStep): WorkflowStep {
    const idx = workflowOrder.indexOf(step);
    return workflowOrder[Math.min(workflowOrder.length - 1, idx + 1)];
  }

  let currentStepValid = $derived(isStepValid(workflowStep));
  let canGoBack = $derived(workflowStep !== 'fastener');
  let nextStepTarget = $derived(nextWorkflowStep(workflowStep));
  let canGoNext = $derived(workflowOrder.indexOf(workflowStep) < workflowOrder.length - 1 && currentStepValid && canNavigateToStep(nextStepTarget));
  let currentChecklist = $derived(stepChecklist(workflowStep));
  let currentChecklistDone = $derived(currentChecklist.filter((item) => item.valid).length);
  let currentChecklistTotal = $derived(currentChecklist.length);
  let currentSnapshotHistory = $derived(stepSnapshots[workflowStep] ?? []);
  let currentSnapshot = $derived(currentSnapshotHistory.length ? currentSnapshotHistory[currentSnapshotHistory.length - 1] : null);
  let walkthroughItem = $derived(stepPrefs.walkthrough ? walkthroughTarget(workflowStep) : null);
  let blockedPrereqs = $derived(blockedStepsBeforeReview());
  let validStepCount = $derived(workflowOrder.filter((step) => isStepValid(step)).length);
  let validityProgressPct = $derived(Math.max(0, Math.min(100, (validStepCount / workflowOrder.length) * 100)));
  let telemetryMinutes = $derived(Math.round(((stepTelemetry[workflowStep]?.totalMs ?? 0) + (Date.now() - stepEnteredAt)) / 600) / 100);
  let activeStepIndex = $derived(workflowOrder.indexOf(workflowStep));
  let stepChips = $derived(workflowOrder.map((step, index) => {
    let state: 'complete' | 'active' | 'ready' | 'available' | 'locked' = 'locked';
    if (index < activeStepIndex && isStepValid(step)) state = 'complete';
    else if (step === workflowStep) state = currentStepValid ? 'ready' : 'active';
    else if (canNavigateToStep(step)) state = 'available';
    return {
      step,
      label:
        step === 'fastener'
          ? 'Fastener'
          : step === 'materials'
            ? 'Materials'
            : step === 'geometry'
              ? 'Geometry'
              : 'Review',
      state
    };
  }));
  $effect(() => {
    if (workflowStep !== previousTrackedStep) {
      const now = Date.now();
      const elapsed = Math.max(0, now - stepEnteredAt);
      stepTelemetry[previousTrackedStep] = {
        totalMs: stepTelemetry[previousTrackedStep].totalMs + elapsed,
        enteredAt: null
      };
      saveStepSnapshot(previousTrackedStep);
      previousTrackedStep = workflowStep;
      stepEnteredAt = now;
      stepTelemetry[workflowStep] = { ...stepTelemetry[workflowStep], enteredAt: now };
      persistStepState();
    }
  });
  $effect(() => {
    if (isStepValid(workflowStep) && !(stepHintsSeen[workflowStep] ?? false)) {
      stepHintsSeen = { ...stepHintsSeen, [workflowStep]: true };
      persistStepState();
    }
  });
  $effect(() => {
    for (const step of workflowOrder) {
      if (isStepValid(step) && !stepCompletedAt[step]) {
        stepCompletedAt = { ...stepCompletedAt, [step]: Date.now() };
      }
    }
  });
  $effect(() => {
    formSignature = JSON.stringify(form);
  });
  $effect(() => {
    if (formSignature) {
      if (snapshotTimer) clearTimeout(snapshotTimer);
      snapshotTimer = setTimeout(() => {
        saveStepSnapshot(workflowStep);
      }, 450);
      return () => {
        if (snapshotTimer) clearTimeout(snapshotTimer);
      };
    }
  });
  $effect(() => {
    stepPrefsSignature = JSON.stringify(stepPrefs);
  });
  $effect(() => {
    if (typeof window !== 'undefined' && stepPrefsSignature) {
      localStorage.setItem(STEP_PREFS_KEY, stepPrefsSignature);
    }
  });
  $effect(() => {
    if (
      stepPrefs.autoAdvance &&
      workflowStep !== 'review' &&
      currentStepValid &&
      canNavigateToStep(nextStepTarget)
    ) {
      const current = workflowStep;
      const next = nextStepTarget;
      const timer = setTimeout(() => {
        if (workflowStep === current && currentStepValid) setWorkflowStep(next);
      }, 220);
      return () => clearTimeout(timer);
    }
  });

  $effect(() => {
    solverError = '';
    try {
      output = computeFastenedJointPreload(form);
    } catch (error) {
      output = null;
      solverError = error instanceof Error ? error.message : 'Preload solver failed.';
    }
  });

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
    } else if (compressionModel === 'calibrated_vdi_equivalent') {
      segment = {
        id,
        plateWidth: 2.5,
        plateLength: 3.5,
        compressionModel,
        length: 0.25,
        modulus: 10_600_000,
        innerDiameter: 0.53,
        note: 'Calibrated row'
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
    } else if (compressionModel === 'calibrated_vdi_equivalent') {
      next = {
        id,
        plateWidth,
        plateLength,
        compressionModel,
        length,
        modulus,
        thermalExpansionCoeff,
        innerDiameter: 'innerDiameter' in current ? current.innerDiameter : 0.53,
        note: 'Calibrated row'
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
    } else if (segment.compressionModel === 'calibrated_vdi_equivalent') {
      if (!(segment.innerDiameter >= 0)) {
        issues.push('Bolt hole diameter must be non-negative.');
      }
      if (!(segment.plateWidth > segment.innerDiameter) || !(segment.plateLength > segment.innerDiameter)) {
        issues.push('Plate footprint must remain larger than the bolt hole diameter.');
      }
    } else if (!(segment.effectiveArea > 0)) {
      issues.push('Effective area must be positive.');
    }
    return issues;
  }

  function replaceBoltSegment(index: number, next: BoltSegmentInput) {
    form.boltSegments = form.boltSegments.map((segment, i) => (i === index ? next : segment));
  }

  function replaceMemberSegment(index: number, next: MemberSegmentInput) {
    form.memberSegments = form.memberSegments.map((segment, i) => (i === index ? next : segment));
  }

  function safeStepSize() {
    return Math.max(0.001, Number(form.nominalDiameter || 0.5) * 0.05);
  }

  function autoFixBoltSegment(index: number) {
    const segment = form.boltSegments[index];
    if (!segment) return;
    replaceBoltSegment(index, {
      id: segment.id?.trim() || `bolt-${index + 1}`,
      length: Math.max(0.05, Number(segment.length || 0.05)),
      area: Math.max(0.0001, Number(segment.area || form.tensileStressArea || 0.0001)),
      modulus: Math.max(1, Number(segment.modulus || form.boltModulus || 1))
    });
  }

  function autoFixMemberSegment(index: number) {
    const segment = form.memberSegments[index];
    if (!segment) return;
    const base = {
      ...segment,
      id: segment.id?.trim() || `member-${index + 1}`,
      length: Math.max(0.02, Number(segment.length || 0.02)),
      plateWidth: Math.max(0.1, Number(segment.plateWidth || form.defaultPlateWidth || 0.1)),
      plateLength: Math.max(0.1, Number(segment.plateLength || form.defaultPlateLength || 0.1)),
      modulus: Math.max(1, Number(segment.modulus || getPreloadMaterial(form.useSamePlateMaterial ? form.selectedPlateMaterialId : form.selectedTopPlateMaterialId).modulusPsi || 1))
    };
    const step = safeStepSize();
    if (segment.compressionModel === 'cylindrical_annulus') {
      const outerDiameter = Math.max(Number(segment.outerDiameter || form.nominalDiameter * 2.6), Number(form.nominalDiameter) + step);
      replaceMemberSegment(index, {
        ...base,
        compressionModel: 'cylindrical_annulus',
        outerDiameter,
        innerDiameter: Math.max(0, Math.min(Number(segment.innerDiameter || form.nominalDiameter), outerDiameter - step))
      });
      return;
    }
    if (segment.compressionModel === 'conical_frustum_annulus') {
      const outerDiameterStart = Math.max(Number(segment.outerDiameterStart || form.nominalDiameter * 2.2), Number(form.nominalDiameter) + step);
      const outerDiameterEnd = Math.max(Number(segment.outerDiameterEnd || form.nominalDiameter * 2.6), outerDiameterStart + step);
      replaceMemberSegment(index, {
        ...base,
        compressionModel: 'conical_frustum_annulus',
        outerDiameterStart,
        outerDiameterEnd,
        innerDiameter: Math.max(0, Math.min(Number(segment.innerDiameter || form.nominalDiameter), Math.min(outerDiameterStart, outerDiameterEnd) - step))
      });
      return;
    }
    if (segment.compressionModel === 'calibrated_vdi_equivalent') {
      replaceMemberSegment(index, {
        ...base,
        compressionModel: 'calibrated_vdi_equivalent',
        innerDiameter: Math.max(0, Math.min(Number('innerDiameter' in segment ? segment.innerDiameter : form.nominalDiameter), Math.min(base.plateWidth, base.plateLength) - step)),
        note: segment.note || 'Auto-corrected calibrated row'
      });
      return;
    }
    replaceMemberSegment(index, {
      ...base,
      compressionModel: 'explicit_area',
      effectiveArea: Math.max(0.0001, Number(segment.effectiveArea || base.plateWidth * base.plateLength * 0.22)),
      note: segment.note || 'Auto-corrected explicit area'
    });
  }

  function buildSolverIssue(message: string): PreloadIssue | null {
    const trimmed = message.trim();
    if (!trimmed) return null;
    if (trimmed.includes('Applied torque must exceed prevailing torque')) {
      return {
        key: 'solver-prevailing-torque',
        title: 'Prevailing torque exceeds applied torque',
        description: 'The exact-torque model cannot solve because the available tightening torque is zero or negative.',
        severity: 'error',
        actions: [
          {
            label: 'Reduce prevailing torque to 5% of applied torque',
            target: fieldId('installation-model'),
            run: () => {
              if (form.installation.model !== 'exact_torque') return;
              form.installation = {
                ...form.installation,
                prevailingTorque: Number(form.installation.appliedTorque) * 0.05
              };
            }
          },
          {
            label: 'Focus installation inputs',
            target: fieldId('installation-model'),
            run: () => {}
          }
        ]
      };
    }
    if (trimmed.includes('Thread torque denominator is non-physical')) {
      return {
        key: 'solver-nonphysical-thread',
        title: 'Thread friction inputs are non-physical',
        description: 'The exact-torque decomposition could not compute a valid preload from the current pitch and friction terms.',
        severity: 'error',
        actions: [
          {
            label: 'Reset exact-torque friction defaults',
            target: fieldId('installation-model'),
            run: () => {
              if (form.installation.model !== 'exact_torque') return;
              form.installation = {
                ...form.installation,
                threadFrictionCoeff: 0.12,
                bearingFrictionCoeff: 0.14,
                threadHalfAngleDeg: 30
              };
            }
          }
        ]
      };
    }
    if (trimmed.includes('At least one member segment is required')) {
      return {
        key: 'solver-missing-member',
        title: 'No clamped plate layers are defined',
        description: 'The preload model needs at least one plate layer to compute member stiffness.',
        severity: 'error',
        actions: [
          {
            label: 'Add a default plate layer',
            target: fieldId('plate-layers'),
            run: () => addMemberSegment(form.defaultPlateCompressionModel)
          }
        ]
      };
    }
    if (trimmed.includes('At least one bolt segment is required')) {
      return {
        key: 'solver-missing-bolt',
        title: 'No bolt segments are defined',
        description: 'The preload model needs at least one bolt segment to compute bolt stiffness.',
        severity: 'error',
        actions: [
          {
            label: 'Add a default bolt segment',
            target: fieldId('nominal-dia'),
            run: () => addBoltSegment()
          }
        ]
      };
    }
    if (trimmed.includes('Unsupported area model')) {
      return {
        key: 'solver-unsupported-area-model',
        title: 'Compression model selection is inconsistent',
        description: 'One or more plate layers use an unsupported compression model state.',
        severity: 'error',
        actions: [
          {
            label: 'Reset layers to the selected default model',
            target: fieldId('plate-layers'),
            run: () => {
              form.memberSegments = form.memberSegments.map((segment) => {
                if (form.defaultPlateCompressionModel === 'explicit_area') {
                  return {
                    ...segment,
                    compressionModel: 'explicit_area',
                    effectiveArea:
                      'effectiveArea' in segment ? Math.max(0.0001, Number(segment.effectiveArea || 0.0001)) : Math.max(0.0001, Number(segment.plateWidth) * Number(segment.plateLength) * 0.22)
                  } as MemberSegmentInput;
                }
                if (form.defaultPlateCompressionModel === 'calibrated_vdi_equivalent') {
                  return {
                    ...segment,
                    compressionModel: 'calibrated_vdi_equivalent',
                    innerDiameter: Math.max(
                      0,
                      Math.min(
                        Number('innerDiameter' in segment ? segment.innerDiameter : form.nominalDiameter),
                        Math.min(Number(segment.plateWidth), Number(segment.plateLength)) - safeStepSize()
                      )
                    ),
                    note: 'Reset to calibrated cone / VDI-style equivalent row'
                  } as MemberSegmentInput;
                }
                if (form.defaultPlateCompressionModel === 'conical_frustum_annulus') {
                  const outerDiameterStart =
                    'outerDiameterStart' in segment ? Number(segment.outerDiameterStart) : Math.max(Number(form.nominalDiameter) * 2.2, Number(form.nominalDiameter) + safeStepSize());
                  const outerDiameterEnd =
                    'outerDiameterEnd' in segment ? Number(segment.outerDiameterEnd) : Math.max(Number(form.nominalDiameter) * 2.6, outerDiameterStart + safeStepSize());
                  return {
                    ...segment,
                    compressionModel: 'conical_frustum_annulus',
                    outerDiameterStart,
                    outerDiameterEnd,
                    innerDiameter: Math.max(0, Math.min(Number('innerDiameter' in segment ? segment.innerDiameter : form.nominalDiameter), Math.min(outerDiameterStart, outerDiameterEnd) - safeStepSize()))
                  } as MemberSegmentInput;
                }
                const outerDiameter =
                  'outerDiameter' in segment ? Number(segment.outerDiameter) : Math.max(Number(form.nominalDiameter) * 2.6, Number(form.nominalDiameter) + safeStepSize());
                return {
                  ...segment,
                  compressionModel: 'cylindrical_annulus',
                  outerDiameter,
                  innerDiameter: Math.max(0, Math.min(Number('innerDiameter' in segment ? segment.innerDiameter : form.nominalDiameter), outerDiameter - safeStepSize()))
                } as MemberSegmentInput;
              });
            }
          }
        ]
      };
    }
    return {
      key: `solver-generic-${trimmed}`,
      title: 'Solver input combination is invalid',
      description: trimmed,
      severity: 'error',
      actions: [
        {
          label: 'Focus current step',
          target: fieldId(`${workflowStep}-main`),
          run: () => {}
        }
      ]
    };
  }

  let preloadIssues = $derived.by(() => {
    const issues: PreloadIssue[] = [];

    if (form.useCustomBoltSegments) {
      form.boltSegments.forEach((segment, index) => {
        const validation = boltValidation(segment);
        if (!validation.length) return;
        issues.push({
          key: `bolt-${segment.id}-${index}`,
          title: `Bolt segment ${segment.id || index + 1} needs correction`,
          description: validation.join(' '),
          severity: 'warning',
          actions: [
            {
              label: 'Auto-fix bolt segment values',
              target: fieldId('nominal-dia'),
              run: () => autoFixBoltSegment(index)
            },
            {
              label: 'Focus fastener geometry',
              target: fieldId('nominal-dia'),
              run: () => {}
            }
          ]
        });
      });
    }

    if (form.useCustomPlateLayers) {
      form.memberSegments.forEach((segment, index) => {
        const validation = memberValidation(segment);
        if (!validation.length) return;
        issues.push({
          key: `member-${segment.id}-${index}`,
          title: `Plate layer ${segment.id || index + 1} needs correction`,
          description: validation.join(' '),
          severity: 'warning',
          actions: [
            {
              label: 'Auto-fix plate layer geometry',
              target: fieldId('plate-layers'),
              run: () => autoFixMemberSegment(index)
            },
            {
              label: 'Focus plate layers',
              target: fieldId('plate-layers'),
              run: () => {}
            }
          ]
        });
      });
    }

    if (solverError) {
      const solverIssue = buildSolverIssue(solverError);
      if (solverIssue) issues.unshift(solverIssue);
    }

    return issues;
  });
  let selectedPreloadIssue = $derived(preloadIssues[Math.min(activePreloadIssueIndex, Math.max(preloadIssues.length - 1, 0))] ?? null);

  $effect(() => {
    activePreloadIssueIndex = Math.min(activePreloadIssueIndex, Math.max(preloadIssues.length - 1, 0));
  });

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
        ['service.preloadEffectiveMin', String(output.service?.preloadEffectiveMin ?? '')],
        ['service.preloadEffectiveMax', String(output.service?.preloadEffectiveMax ?? '')],
        ['service.loss.embedment', String(output.service?.preloadLossBreakdown.embedmentLoss ?? '')],
        ['service.loss.coatingCrush', String(output.service?.preloadLossBreakdown.coatingCrushLoss ?? '')],
        ['service.loss.washerSeating', String(output.service?.preloadLossBreakdown.washerSeatingLoss ?? '')],
        ['service.loss.relaxation', String(output.service?.preloadLossBreakdown.relaxationLoss ?? '')],
        ['service.loss.creep', String(output.service?.preloadLossBreakdown.creepLoss ?? '')],
        ['service.loss.thermalShift', String(output.service?.preloadLossBreakdown.thermalPreloadShift ?? '')],
        ['service.separationLoad', String(output.service?.separationLoad ?? '')],
        ['service.separationState', String(output.service?.separationState ?? '')],
        ['service.slipResistance', String(output.service?.slipResistance ?? '')],
        ['installation.uncertainty.combinedPercent', String(output.installation.uncertainty.combinedPercent ?? '')],
        ['modelBasis.compressionSummary', output.modelBasis.compressionModelSummary],
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

  function annularFrictionMeanDiameter(outerDiameter: number, innerDiameter: number) {
    if (!(outerDiameter > innerDiameter) || !(innerDiameter >= 0)) return null;
    const ro = outerDiameter / 2;
    const ri = innerDiameter / 2;
    const numerator = Math.pow(ro, 3) - Math.pow(ri, 3);
    const denominator = Math.pow(ro, 2) - Math.pow(ri, 2);
    if (!(denominator > 0)) return null;
    const meanRadius = (2 / 3) * (numerator / denominator);
    return 2 * meanRadius;
  }

  function enforceAnnulusGap(outer: number, inner: number, minGap = 0.001) {
    const safeInner = Math.max(0, Number(inner) || 0);
    const safeOuter = Number(outer) || 0;
    if (safeOuter > safeInner + minGap) return { outer: safeOuter, inner: safeInner, changed: false };
    return { outer: safeInner + minGap, inner: safeInner, changed: true };
  }

  function deriveAutoWasherGeometry() {
    const d = Number(selectedFastenerDashVariant?.nominalDiameterIn ?? form.nominalDiameter);
    const nominal = Number.isFinite(d) && d > 0 ? d : 0.25;
    const styleRaw = String(selectedFastener?.headStyle ?? '').toLowerCase();
    const isFlush = styleRaw.includes('flush');
    const isTension = styleRaw.includes('tension');
    const headStyleKey: 'protrudingShear' | 'reducedFlushShear' | 'protrudingTension' | 'flushTension' =
      isTension ? (isFlush ? 'flushTension' : 'protrudingTension') : (isFlush ? 'reducedFlushShear' : 'protrudingShear');
    const dashGeom = selectedFastenerDashVariant?.geometry;
    const clearance = Math.max(0.005, nominal * 0.06);
    const inner = Number.isFinite(Number(dashGeom?.washerInnerDiameterIn)) && Number(dashGeom?.washerInnerDiameterIn) > nominal
      ? Number(dashGeom?.washerInnerDiameterIn)
      : nominal + clearance;
    const existingOuter = Number(dashGeom?.washerOuterDiameterIn ?? form.washerStack.outerDiameter);
    const outerCandidate = Math.max(
      Number.isFinite(existingOuter) && existingOuter > 0 ? existingOuter : 0,
      nominal * 2.6,
      inner + 0.08
    );
    const enforced = enforceAnnulusGap(outerCandidate, inner, 0.001);
    const nutFace = Number(dashGeom?.nutFaceDiameterIn ?? 0);
    const headFace = Number(dashGeom?.headFaceDiametersIn?.[headStyleKey] ?? 0);
    const topFaceEnforced = enforceAnnulusGap(
      Number.isFinite(headFace) && headFace > 0 ? headFace : enforced.outer,
      enforced.inner,
      0.001
    );
    const bottomFaceEnforced = enforceAnnulusGap(
      Number.isFinite(nutFace) && nutFace > 0 ? nutFace : enforced.outer,
      enforced.inner,
      0.001
    );
    return {
      outer: enforced.outer,
      inner: enforced.inner,
      topFaceOuter: topFaceEnforced.outer,
      bottomFaceOuter: bottomFaceEnforced.outer
    };
  }

  function sanitizeMemberSegment(segment: MemberSegmentInput): { segment: MemberSegmentInput; changed: boolean } {
    if (segment.compressionModel === 'cylindrical_annulus') {
      const next = enforceAnnulusGap(Number(segment.outerDiameter), Number(segment.innerDiameter));
      if (!next.changed) return { segment, changed: false };
      return {
        segment: {
          ...segment,
          outerDiameter: next.outer,
          innerDiameter: next.inner
        },
        changed: true
      };
    }
    if (segment.compressionModel === 'conical_frustum_annulus') {
      const start = enforceAnnulusGap(Number(segment.outerDiameterStart), Number(segment.innerDiameter));
      const end = enforceAnnulusGap(Number(segment.outerDiameterEnd), Number(segment.innerDiameter));
      if (!start.changed && !end.changed) return { segment, changed: false };
      return {
        segment: {
          ...segment,
          outerDiameterStart: start.outer,
          outerDiameterEnd: end.outer,
          innerDiameter: Math.max(start.inner, end.inner)
        },
        changed: true
      };
    }
    return { segment, changed: false };
  }

  function deriveConicalProxyDiameters(segment: Extract<MemberSegmentInput, { compressionModel: 'conical_frustum_annulus' }>) {
    const inner = Math.max(0, Number(segment.innerDiameter) || 0);
    const thickness = Math.max(0.001, Number(segment.length) || 0.001);
    const gap = safeStepSize();
    const footprintCap = Math.min(Number(segment.plateWidth) || 0, Number(segment.plateLength) || 0);
    const cap = Math.max(inner + gap, footprintCap || inner + gap);
    const startSeed = Math.max(inner + gap, form.nominalDiameter * 1.6);
    const start = Math.max(inner + gap, Math.min(cap, startSeed));
    const spread = 2 * thickness * Math.tan((Math.max(5, Math.min(45, Number(form.compressionConeHalfAngleDeg ?? 30))) * Math.PI) / 180);
    const end = Math.max(inner + gap, Math.min(cap, Math.max(start + gap, start + spread)));
    return { start, end };
  }

  function compressionModelLabel(compressionModel: MemberSegmentInput['compressionModel']) {
    switch (compressionModel) {
      case 'cylindrical_annulus':
        return 'Constant effective compression diameter';
      case 'conical_frustum_annulus':
        return 'Tapered effective compression diameter';
      case 'explicit_area':
        return 'Equivalent compressed area';
      case 'calibrated_vdi_equivalent':
        return 'Calibrated cone / VDI-style equivalent stiffness';
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

  type GuideCheckStatus = 'ok' | 'warn' | 'todo';
  type GuideDerivedCheck = {
    id: string;
    principle: string;
    source: 'Bolt Council 2nd Ed.' | 'VT Multi-Bolt Joint Chapter';
    status: GuideCheckStatus;
    mappedInputs: string[];
    rationale: string;
    action?: string;
  };
  const guideTone = (status: GuideCheckStatus) =>
    status === 'ok'
      ? 'border-emerald-300/35 bg-emerald-500/10 text-emerald-100'
      : status === 'warn'
        ? 'border-amber-300/35 bg-amber-500/10 text-amber-100'
        : 'border-white/20 bg-white/[0.03] text-white/75';

  let selectedPlateMaterial = $derived(getPreloadMaterial(form.selectedPlateMaterialId));
  let selectedWasherMaterial = $derived(getPreloadMaterial(form.selectedWasherMaterialId));
  let selectedFastener = $derived(getPreloadFastener(form.selectedFastenerId));
  let selectedFastenerDashVariant =
    $derived(selectedFastener.dashVariants.find((variant) => variant.dash === form.selectedFastenerDash) ??
    selectedFastener.dashVariants[0] ??
    null);
  let selectedFastenerGripVariant =
    $derived(selectedFastener.gripTable.find((entry) => entry.gripCode === form.selectedFastenerGrip) ??
    selectedFastener.gripTable[0] ??
    null);
  let selectedFastenerMaterial = $derived(getPreloadMaterial(form.selectedFastenerMaterialId));
  $effect(() => {
    if (selectedFastenerDashVariant && !form.useCustomBoltSegments) {
      form.nominalDiameter = selectedFastenerDashVariant.nominalDiameterIn;
      form.tensileStressArea = estimateThreadedArea(selectedFastenerDashVariant.nominalDiameterIn);
    }
  });
  $effect(() => {
    if (!form.useCustomBoltSegments) {
      const gripLength = selectedFastenerGripVariant?.nominalGripIn ?? 0.5;
      const nextSegments = buildAutoBoltSegments(
        form.nominalDiameter,
        form.boltModulus,
        gripLength,
        Number(form.engagedThreadLength ?? 0.45)
      );
      if (JSON.stringify(form.boltSegments) !== JSON.stringify(nextSegments)) {
        form.boltSegments = nextSegments;
      }
    }
  });
  $effect(() => {
    if (!form.useCustomPlateLayers) {
      const nextSegments = buildAutoPlateLayers(
        form.defaultPlateWidth,
        form.defaultPlateLength,
        form.defaultTopPlateThickness,
        form.defaultBottomPlateThickness,
        selectedPlateMaterial.modulusPsi,
        form.nominalDiameter,
        form.defaultPlateCompressionModel,
        form.compressionConeHalfAngleDeg
      );
      if (JSON.stringify(form.memberSegments) !== JSON.stringify(nextSegments)) {
        form.memberSegments = nextSegments;
      }
    }
  });
  $effect(() => {
    let changed = false;
    const nextSegments = form.memberSegments.map((segment) => {
      const sanitized = sanitizeMemberSegment(segment);
      if (sanitized.changed) changed = true;
      return sanitized.segment;
    });
    if (changed) form.memberSegments = nextSegments;
  });
  $effect(() => {
    if (form.conicalGeometryManualOverride || !form.useCustomPlateLayers) return;
    const signature = JSON.stringify({
      nominalDiameter: Number(form.nominalDiameter),
      compressionConeHalfAngleDeg: Number(form.compressionConeHalfAngleDeg ?? 30),
      segments: form.memberSegments
        .filter((segment) => segment.compressionModel === 'conical_frustum_annulus')
        .map((segment) => ({
          id: segment.id,
          plateWidth: Number(segment.plateWidth),
          plateLength: Number(segment.plateLength),
          length: Number(segment.length),
          innerDiameter: Number(segment.innerDiameter)
        }))
    });
    if (signature === lastConicalAutoSignature) return;
    lastConicalAutoSignature = signature;
    let changed = false;
    const nextSegments = form.memberSegments.map((segment) => {
      if (segment.compressionModel !== 'conical_frustum_annulus') return segment;
      const auto = deriveConicalProxyDiameters(segment);
      if (
        Math.abs(Number(segment.outerDiameterStart) - auto.start) <= 1e-9 &&
        Math.abs(Number(segment.outerDiameterEnd) - auto.end) <= 1e-9
      ) {
        return segment;
      }
      changed = true;
      return {
        ...segment,
        outerDiameterStart: auto.start,
        outerDiameterEnd: auto.end
      };
    });
    if (changed) form.memberSegments = nextSegments;
  });
  $effect(() => {
    const current = form.washerStack;
    const autoGeom = deriveAutoWasherGeometry();
    const globalInnerSource = Number.isFinite(Number(current.innerDiameter)) ? Number(current.innerDiameter) : autoGeom.inner;
    const globalOuterSource = Number.isFinite(Number(current.outerDiameter)) && Number(current.outerDiameter) > 0
      ? Number(current.outerDiameter)
      : autoGeom.outer;
    const global = enforceAnnulusGap(globalOuterSource, globalInnerSource);
    const headOuterSource = Number.isFinite(Number(current.underHeadOuterDiameter))
      ? Number(current.underHeadOuterDiameter)
      : global.outer;
    const headInnerSource = Number.isFinite(Number(current.underHeadInnerDiameter))
      ? Number(current.underHeadInnerDiameter)
      : global.inner;
    const nutOuterSource = Number.isFinite(Number(current.underNutOuterDiameter))
      ? Number(current.underNutOuterDiameter)
      : global.outer;
    const nutInnerSource = Number.isFinite(Number(current.underNutInnerDiameter))
      ? Number(current.underNutInnerDiameter)
      : global.inner;
    const head = enforceAnnulusGap(headOuterSource, headInnerSource);
    const nut = enforceAnnulusGap(nutOuterSource, nutInnerSource);
    if (!head.changed && !nut.changed && !global.changed) return;
    form.washerStack = {
      ...current,
      outerDiameter: global.outer,
      innerDiameter: global.inner,
      underHeadOuterDiameter: head.outer,
      underHeadInnerDiameter: head.inner,
      underNutOuterDiameter: nut.outer,
      underNutInnerDiameter: nut.inner
    };
  });
  $effect(() => {
    if (form.washerGeometryManualOverride) return;
    const current = form.washerStack;
    const autoGeom = deriveAutoWasherGeometry();
    const next = {
      ...current,
      outerDiameter: autoGeom.outer,
      innerDiameter: autoGeom.inner,
      // Washer rows should use washer OD/ID, not hardware face diameters.
      underHeadOuterDiameter: autoGeom.outer,
      underHeadInnerDiameter: autoGeom.inner,
      underNutOuterDiameter: autoGeom.outer,
      underNutInnerDiameter: autoGeom.inner
    };
    const currSig = JSON.stringify({
      outerDiameter: current.outerDiameter,
      innerDiameter: current.innerDiameter,
      underHeadOuterDiameter: current.underHeadOuterDiameter,
      underHeadInnerDiameter: current.underHeadInnerDiameter,
      underNutOuterDiameter: current.underNutOuterDiameter,
      underNutInnerDiameter: current.underNutInnerDiameter
    });
    const nextSig = JSON.stringify({
      outerDiameter: next.outerDiameter,
      innerDiameter: next.innerDiameter,
      underHeadOuterDiameter: next.underHeadOuterDiameter,
      underHeadInnerDiameter: next.underHeadInnerDiameter,
      underNutOuterDiameter: next.underNutOuterDiameter,
      underNutInnerDiameter: next.underNutInnerDiameter
    });
    if (currSig !== nextSig) form.washerStack = next;
  });

  let clampInstalled = $derived(output?.installation.preload ?? 0);
  let clampService = $derived(Math.max(0, output?.service?.clampForceService ?? 0));
  let clampMax = $derived(Math.max(clampInstalled, clampService, 1));
  let separationUtil = $derived(Math.max(0, Math.min(1.4, output?.checks.serviceLimits.separation.utilization ?? 0)));
  let slipUtil = $derived(Math.max(0, Math.min(1.4, output?.checks.serviceLimits.slip.utilization ?? 0)));
  let scatterMin = $derived(output?.installation.preloadMin ?? 0);
  let scatterMax = $derived(output?.installation.preloadMax ?? 0);
  let representativeCone = $derived(
    form.memberSegments.find(
      (segment) =>
        segment.compressionModel === 'conical_frustum_annulus' ||
        segment.compressionModel === 'calibrated_vdi_equivalent'
    ) ?? null
  );
  let washerTopCount = $derived(Math.max(0, Math.round(form.washerStack.underHeadCount ?? 0)));
  let washerBottomCount = $derived(Math.max(0, Math.round(form.washerStack.underNutCount ?? 0)));
  let effectiveWasherCount = $derived(form.washerStack.enabled ? washerTopCount + washerBottomCount : 0);
  let inferredBearingOuterDiameter =
    $derived(form.installation.model === 'exact_torque' && Number(form.installation.bearingMeanDiameter) > 0
      ? Math.max(
          form.nominalDiameter,
          2 * Number(form.installation.bearingMeanDiameter) - form.nominalDiameter
        )
      : Math.max(form.nominalDiameter * 1.8, form.nominalDiameter + 0.08));
  let styleRaw = $derived(String(selectedFastener?.headStyle ?? '').toLowerCase());
  let isFlushHead = $derived(styleRaw.includes('flush'));
  let isTensionHead = $derived(styleRaw.includes('tension'));
  let activeHeadStyleKey = $derived<'protrudingShear' | 'reducedFlushShear' | 'protrudingTension' | 'flushTension'>(
    isTensionHead ? (isFlushHead ? 'flushTension' : 'protrudingTension') : (isFlushHead ? 'reducedFlushShear' : 'protrudingShear')
  );
  let dashGeometry = $derived(selectedFastenerDashVariant?.geometry ?? null);
  let fastenerHeadFaceOuterDiameter = $derived(
    Number(dashGeometry?.headFaceDiametersIn?.[activeHeadStyleKey] ?? inferredBearingOuterDiameter)
  );
  let fastenerNutFaceOuterDiameter = $derived(
    Number(dashGeometry?.nutFaceDiameterIn ?? inferredBearingOuterDiameter)
  );
  let topBearingFaceInnerDiameter =
    $derived(form.washerStack.enabled && washerTopCount > 0
      ? Number(form.washerStack.underHeadInnerDiameter ?? form.washerStack.innerDiameter)
      : form.nominalDiameter);
  let bottomBearingFaceInnerDiameter =
    $derived(form.washerStack.enabled && washerBottomCount > 0
      ? Number(form.washerStack.underNutInnerDiameter ?? form.washerStack.innerDiameter)
      : form.nominalDiameter);
  let topBearingFaceOuterDiameter =
    $derived(form.washerStack.enabled && washerTopCount > 0 && Number(form.washerStack.underHeadOuterDiameter ?? form.washerStack.outerDiameter) > 0
      ? Number(form.washerStack.underHeadOuterDiameter ?? form.washerStack.outerDiameter)
      : fastenerHeadFaceOuterDiameter);
  let bottomBearingFaceOuterDiameter =
    $derived(form.washerStack.enabled && washerBottomCount > 0 && Number(form.washerStack.underNutOuterDiameter ?? form.washerStack.outerDiameter) > 0
      ? Number(form.washerStack.underNutOuterDiameter ?? form.washerStack.outerDiameter)
      : fastenerNutFaceOuterDiameter);
  let topBearingFaceArea = $derived(annulusArea(topBearingFaceOuterDiameter, topBearingFaceInnerDiameter) ?? 0);
  let bottomBearingFaceArea = $derived(annulusArea(bottomBearingFaceOuterDiameter, bottomBearingFaceInnerDiameter) ?? 0);
  let topBearingMeanDiameter =
    $derived(annularFrictionMeanDiameter(topBearingFaceOuterDiameter, topBearingFaceInnerDiameter) ??
    form.nominalDiameter);
  let bottomBearingMeanDiameter =
    $derived(annularFrictionMeanDiameter(bottomBearingFaceOuterDiameter, bottomBearingFaceInnerDiameter) ??
    form.nominalDiameter);
  let effectiveBearingMeanDiameter = $derived(Math.min(topBearingMeanDiameter, bottomBearingMeanDiameter));
  let autoComputedBearingArea =
    $derived(topBearingFaceArea > 0 && bottomBearingFaceArea > 0
      ? Math.min(topBearingFaceArea, bottomBearingFaceArea)
      : Math.max(topBearingFaceArea, bottomBearingFaceArea, 0));
  $effect(() => {
    if (stepPrefs.autoBearingArea && Math.abs(Number(form.underHeadBearingArea ?? 0) - autoComputedBearingArea) > 1e-9) {
      form.underHeadBearingArea = autoComputedBearingArea;
    }
  });
  $effect(() => {
    if (
      stepPrefs.autoBearingArea &&
      form.installation.model === 'exact_torque' &&
      Math.abs(Number(form.installation.bearingMeanDiameter ?? 0) - effectiveBearingMeanDiameter) > 1e-9
    ) {
      form.installation.bearingMeanDiameter = effectiveBearingMeanDiameter;
    }
  });
  let compressionConeHalfAngleDeg = $derived(Math.max(10, Math.min(45, Number(form.compressionConeHalfAngleDeg ?? 30))));
  let compressionConeSlope = $derived(Math.tan((compressionConeHalfAngleDeg * Math.PI) / 180));
  $effect(() => {
    if (form.washerStack.enabled && form.washerStack.count !== effectiveWasherCount) {
      form.washerStack.count = effectiveWasherCount;
    }
  });
  let stackRows = $derived([
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
    ...form.memberSegments.map((segment) => {
      const preview = memberPreview(segment);
      const innerDiameter =
        segment.compressionModel === 'explicit_area' ? Number(form.nominalDiameter) : Number(segment.innerDiameter);
      const outerDiameter =
        segment.compressionModel === 'cylindrical_annulus'
          ? Number(segment.outerDiameter)
          : segment.compressionModel === 'conical_frustum_annulus'
            ? Math.max(Number(segment.outerDiameterStart), Number(segment.outerDiameterEnd))
            : segment.compressionModel === 'calibrated_vdi_equivalent'
              ? (equivalentOuterDiameter(preview?.averageAreaEquivalent, innerDiameter) ?? topBearingFaceOuterDiameter)
              : topBearingFaceOuterDiameter;
      return {
        id: segment.id,
        kind: 'member' as const,
        length: Number(segment.length),
        modulus: Number(segment.modulus),
        compressionModel: segment.compressionModel,
        preview,
        outerDiameter,
        innerDiameter
      };
    }),
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
  ].filter((row) => Number.isFinite(row.length) && row.length > 0));
  let stackTotalLength = $derived(Math.max(
    0.0001,
    stackRows.reduce((sum, row) => sum + row.length, 0)
  ));
  let topWasherStackLength = $derived(
    form.washerStack.enabled ? washerTopCount * Number(form.washerStack.thicknessPerWasher) : 0
  );
  let bottomWasherStackLength = $derived(
    form.washerStack.enabled ? washerBottomCount * Number(form.washerStack.thicknessPerWasher) : 0
  );
  let adjacentFastenerCount = $derived(Math.max(
    1,
    Math.round(form.adjacentFastenerScreen.rowCount) * Math.round(form.adjacentFastenerScreen.columnCount)
  ));
  let adjacentNeighborCount = $derived(Math.max(0, adjacentFastenerCount - 1));
  let fastenerGroupCaseResult =
    $derived(form.adjacentFastenerScreen.enabled && output
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
      : null);
  let activeFastenerGroupCase =
    $derived(fastenerGroupCaseResult?.cases.find((entry) => entry.caseId === fastenerGroupCaseResult.governingCaseId) ??
    fastenerGroupCaseResult?.cases[0] ??
    null);
  let fastenerGroupResult = $derived(activeFastenerGroupCase?.result ?? null);
  let adjacentTransferAttenuation = $derived(fastenerGroupResult
    ? Math.max(...fastenerGroupResult.fasteners.slice(1).map((row) => row.edgeAmplification), 0)
    : 0);
  let adjacentAxialPerNeighbor = $derived(fastenerGroupResult?.fasteners[1]?.axialLoad ?? 0);
  let adjacentTransversePerNeighbor = $derived(fastenerGroupResult
    ? Math.hypot(fastenerGroupResult.fasteners[1]?.totalShearX ?? 0, fastenerGroupResult.fasteners[1]?.totalShearY ?? 0)
    : 0);
  let currentFastenerEquivalentLoad = $derived(fastenerGroupResult?.fasteners[0]?.equivalentDemand ?? Math.hypot(
    output?.service?.boltLoadService ?? output?.installation.preload ?? 0,
    output?.service?.externalTransverseLoad ?? 0
  ));
  let adjacentFastenerEquivalentLoad = $derived(fastenerGroupResult?.fasteners[1]?.equivalentDemand ?? 0);
  let criticalFastenerLabel = $derived(fastenerGroupResult
    ? `F${fastenerGroupResult.criticalFastenerIndex + 1}`
    : 'Current fastener');
  let governingLoadCaseLabel = $derived(fastenerGroupCaseResult?.governingCaseLabel ?? '—');
  let caseEnvelopeScale = $derived(Math.max(
    1,
    ...(fastenerGroupCaseResult?.cases.map((entry) => entry.result.criticalEquivalentDemand) ?? [1])
  ));
  let fastenerCaseEnvelopeRows =
    $derived(fastenerGroupCaseResult?.cases.map((entry, index) => ({
      index,
      label: entry.label,
      criticalFastenerLabel: `F${entry.result.criticalFastenerIndex + 1}`,
      demand: entry.result.criticalEquivalentDemand,
      ratio: entry.result.criticalEquivalentDemand / caseEnvelopeScale,
      isGoverning: entry.caseId === fastenerGroupCaseResult.governingCaseId
    })) ?? []);
  let coneReachLength = $derived(Math.min(stackTotalLength / 2, (Math.max(topBearingFaceOuterDiameter, bottomBearingFaceOuterDiameter) - form.nominalDiameter) / Math.max(compressionConeSlope, 1e-6)));
  let heatmapValues = $derived(fastenerGroupResult ? fastenerGroupResult.geometryInfluenceMatrix.flat() : []);
  let heatmapMin = $derived(heatmapValues.length ? Math.min(...heatmapValues) : 0);
  let heatmapMax = $derived(heatmapValues.length ? Math.max(...heatmapValues) : 1);
  let heatmapIsFlat = $derived(heatmapValues.length ? Math.abs(heatmapMax - heatmapMin) < 1e-9 : false);
  let envelopeChartHeight = $derived(Math.max(196, 70 + fastenerCaseEnvelopeRows.length * 34));
  let envelopeChartInnerHeight = $derived(Math.max(116, 26 + fastenerCaseEnvelopeRows.length * 28));

  function heatmapDisplayRatio(rowIndex: number, columnIndex: number, cell: number): number {
    if (!fastenerGroupResult) return 0;
    if (!heatmapIsFlat) {
      return heatmapMax > heatmapMin ? (cell - heatmapMin) / (heatmapMax - heatmapMin) : 1;
    }
    const size = Math.max(1, fastenerGroupResult.geometryInfluenceMatrix.length - 1);
    const distance = Math.abs(rowIndex - columnIndex);
    return rowIndex === columnIndex ? 1 : Math.max(0.2, 1 - distance / size);
  }
  let jointDisplayMaxDiameter = $derived(Math.max(
    topBearingFaceOuterDiameter,
    bottomBearingFaceOuterDiameter,
    ...stackRows.map((row) =>
      visualizationMode === 'equivalent_annulus' && row.kind === 'member' && row.preview
        ? equivalentOuterDiameter(row.preview.averageAreaEquivalent, row.innerDiameter) ?? row.outerDiameter
        : row.outerDiameter
    ),
    form.nominalDiameter + 2 * compressionConeSlope * coneReachLength
  ));
  let jointViewport = $derived({
    left: 22,
    top: 68,
    width: 516,
    height: 452,
    centerX: 200,
    rowTop: 136,
    rowBottom: 430,
    halfWidthLimit: 124,
    legendX: 372
  });
  let jointVerticalScale = $derived((jointViewport.rowBottom - jointViewport.rowTop) / Math.max(stackTotalLength, 0.0001));
  let jointHorizontalScale = $derived((jointViewport.halfWidthLimit * 2) / Math.max(jointDisplayMaxDiameter, 0.001));
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
  const buildConeBoundaryPoints = (
    slices: Array<{ sliceStart: number; sliceEnd: number; topRadius: number; bottomRadius: number }>,
    side: 'left' | 'right'
  ) => {
    if (!slices.length) return '';
    const sign = side === 'left' ? -1 : 1;
    const points: string[] = [];
    const first = slices[0];
    points.push(`${jointViewport.centerX + sign * jointRadiusPx(first.topRadius * 2)},${jointY(first.sliceStart)}`);
    for (const slice of slices) {
      points.push(`${jointViewport.centerX + sign * jointRadiusPx(slice.bottomRadius * 2)},${jointY(slice.sliceEnd)}`);
    }
    return points.join(' ');
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
  let jointBoltWidthPx = $derived(Math.max(10, jointDiameterPx(form.nominalDiameter)));
  let headBlock = $derived({
    width: Math.max(jointBoltWidthPx * 1.8, jointDiameterPx(topBearingFaceOuterDiameter)),
    height: 34,
    y: 102
  });
  let nutBlock = $derived({
    width: Math.max(jointBoltWidthPx * 1.8, jointDiameterPx(bottomBearingFaceOuterDiameter)),
    height: 34,
    y: 430
  });
  let stackVisualRows = $derived((() => {
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
  })());
  let memberApexPosition = $derived((() => {
    const topMember = stackVisualRows.find((row) => row.id === 'plate-a' && row.kind === 'member');
    return topMember ? topMember.end : stackTotalLength / 2;
  })());
  let stackTableRows = $derived(stackVisualRows.map((row) => ({
    id: row.id,
    kind: row.kind,
    thickness: row.length,
    displayOuterDiameter: row.displayOuterDiameter,
    stiffnessContribution: row.stiffnessContribution
  })));
  let coneVisualTop = $derived(stackVisualRows.length
    ? (() => {
        const apex = memberApexPosition;
        const start = Math.max(0, topWasherStackLength);
        const end = Math.min(apex, start + coneReachLength);
        return stackVisualRows
          .filter((row) => row.kind === 'member' && row.end > start && row.start < end)
          .map((row) => {
            const sliceStart = Math.max(row.start, start);
            const sliceEnd = Math.min(row.end, end);
            const topRadius = Math.min(
              topBearingFaceOuterDiameter / 2 + compressionConeSlope * (sliceStart - start),
              row.displayOuterDiameter / 2
            );
            const bottomRadius = Math.min(
              topBearingFaceOuterDiameter / 2 + compressionConeSlope * (sliceEnd - start),
              row.displayOuterDiameter / 2
            );
            return {
              sliceStart,
              sliceEnd,
              topRadius,
              bottomRadius
            };
          });
      })()
    : []);
  let coneVisualBottom = $derived(stackVisualRows.length
    ? (() => {
        const apex = memberApexPosition;
        const end = Math.min(stackTotalLength, Math.max(apex, stackTotalLength - bottomWasherStackLength));
        const start = Math.max(apex, end - coneReachLength);
        return stackVisualRows
          .filter((row) => row.kind === 'member' && row.end > start && row.start < end)
          .map((row) => {
            const sliceStart = Math.max(row.start, start);
            const sliceEnd = Math.min(row.end, end);
            const topRadius = Math.min(
              bottomBearingFaceOuterDiameter / 2 + compressionConeSlope * (end - sliceStart),
              row.displayOuterDiameter / 2
            );
            const bottomRadius = Math.min(
              bottomBearingFaceOuterDiameter / 2 + compressionConeSlope * (end - sliceEnd),
              row.displayOuterDiameter / 2
            );
            return {
              sliceStart,
              sliceEnd,
              topRadius,
              bottomRadius
            };
          });
      })()
    : []);
  let topConeEnvelopePoints = $derived(buildConeEnvelopePoints(coneVisualTop));
  let bottomConeEnvelopePoints = $derived(buildConeEnvelopePoints(coneVisualBottom));
  let topConeLeftBoundaryPoints = $derived(buildConeBoundaryPoints(coneVisualTop, 'left'));
  let topConeRightBoundaryPoints = $derived(buildConeBoundaryPoints(coneVisualTop, 'right'));
  let bottomConeLeftBoundaryPoints = $derived(buildConeBoundaryPoints(coneVisualBottom, 'left'));
  let bottomConeRightBoundaryPoints = $derived(buildConeBoundaryPoints(coneVisualBottom, 'right'));
  let stackRenderRows = $derived(stackVisualRows.map((row, index) => ({
    ...row,
    ...rowTint(row, index),
    displayLabel: rowDisplayLabel(row, index),
    labelY: jointY((row.start + row.end) / 2),
    pixelHeight: Math.max(row.kind === 'washer' ? 14 : 6, (row.end - row.start) * jointVerticalScale),
    outerWidthPx: Math.max(10, jointDiameterPx(row.displayOuterDiameter)),
    innerWidthPx: Math.max(4, jointDiameterPx(row.innerDiameter))
  })));
  let splitPlaneY = $derived((() => {
    const topMember = stackVisualRows.find((row) => row.id === 'plate-a');
    return topMember ? jointY(topMember.end) : null;
  })());
  let threadTickYs = $derived((() => {
    const start = jointY(stackTotalLength) + 6;
    const end = nutBlock.y + nutBlock.height - 10;
    const ticks: number[] = [];
    for (let y = start + 18; y <= end - 10; y += 12) ticks.push(y);
    return ticks;
  })());
  let rightThreadHelixPath = $derived(buildThreadHelixPath('right', threadTickYs, jointBoltWidthPx));
  let leftThreadHelixPath = $derived(buildThreadHelixPath('left', threadTickYs, jointBoltWidthPx));
  let reserveEnvelopeRows = $derived(output
    ? [
        { label: 'Separation', envelope: output.checks.envelopes.separationUtilization, color: '#34d399' },
        { label: 'Slip', envelope: output.checks.envelopes.slipUtilization, color: '#22d3ee' },
        { label: 'Proof', envelope: output.checks.envelopes.proofUtilization, color: '#a78bfa' },
        { label: 'Bearing', envelope: output.checks.envelopes.bearingUtilization, color: '#f59e0b' },
        { label: 'Fatigue', envelope: output.checks.envelopes.fatigueUtilization, color: '#fb7185' }
      ]
    : []);
  let guideDerivedChecks = $derived.by<GuideDerivedCheck[]>(() => {
    const checks: GuideDerivedCheck[] = [];
    const hasExactTorque = form.installation.model === 'exact_torque';
    const scatterSet = Number(form.installationScatterPercent ?? 0) > 0;
    const frictionSet = Number(form.fayingSurfaceSlipCoeff ?? 0) > 0 && Number(form.frictionInterfaceCount ?? 0) > 0;
    const hasServiceLoads =
      Number(form.serviceCase?.externalAxialLoad ?? 0) !== 0 ||
      Number(form.serviceCase?.externalTransverseLoad ?? 0) !== 0;
    const hasStiffness = Boolean(output) && (output?.stiffness.bolt.stiffness ?? 0) > 0 && (output?.stiffness.members.stiffness ?? 0) > 0;
    const hasPattern = Boolean(form.adjacentFastenerScreen.enabled);
    const hasPatternCases = (form.adjacentFastenerScreen.loadCases?.length ?? 0) > 0;
    const hasEdgeEffects =
      Number(form.adjacentFastenerScreen.bypassLoadFactor ?? 0) > 0 ||
      Number(form.adjacentFastenerScreen.edgeDistanceX ?? 0) > 0 ||
      Number(form.adjacentFastenerScreen.edgeDistanceY ?? 0) > 0;

    checks.push({
      id: 'install-method-quality',
      source: 'Bolt Council 2nd Ed.',
      principle: 'Installation method quality controls preload reliability',
      status: hasExactTorque ? 'ok' : 'warn',
      mappedInputs: ['installation.model', 'installation.appliedTorque', 'installation.prevailingTorque'],
      rationale: hasExactTorque
        ? 'Exact torque decomposition is active; preload is not treated as a single coarse K-factor guess.'
        : 'Nut-factor/direct-preload mode is active; reliability depends more on field calibration and verification.',
      action: hasExactTorque ? undefined : 'Use exact torque mode when installation friction terms are known.'
    });

    checks.push({
      id: 'friction-scatter',
      source: 'Bolt Council 2nd Ed.',
      principle: 'Friction + tightening scatter dominate preload variability',
      status: scatterSet && frictionSet ? 'ok' : 'warn',
      mappedInputs: ['installationScatterPercent', 'fayingSurfaceSlipCoeff', 'frictionInterfaceCount'],
      rationale: scatterSet && frictionSet
        ? 'Preload scatter and faying friction are explicitly represented in the reserve envelope.'
        : 'At least one uncertainty/friction term is missing or zero, reducing confidence in reserve predictions.',
      action: scatterSet && frictionSet ? undefined : 'Set realistic scatter and friction values for your tooling + surface condition.'
    });

    checks.push({
      id: 'load-path',
      source: 'Bolt Council 2nd Ed.',
      principle: 'Joint behavior must be evaluated under actual service load path',
      status: hasServiceLoads ? 'ok' : 'todo',
      mappedInputs: ['serviceCase.externalAxialLoad', 'serviceCase.externalTransverseLoad', 'serviceCase.temperatureChange'],
      rationale: hasServiceLoads
        ? 'Service loading is defined and checks (separation/slip/fatigue) are evaluated against it.'
        : 'No nonzero service load is defined; checks may reflect installation-only state.',
      action: hasServiceLoads ? undefined : 'Enter expected axial/transverse service loads before sign-off.'
    });

    checks.push({
      id: 'stiffness-sharing',
      source: 'Bolt Council 2nd Ed.',
      principle: 'Bolt/member stiffness ratio governs load transfer and separation risk',
      status: hasStiffness ? 'ok' : 'todo',
      mappedInputs: ['boltSegments', 'memberSegments', 'washerStack'],
      rationale: hasStiffness
        ? `Stiffness solved (Cb=${fmt(output?.stiffness.jointConstant, 3)}); redistribution is explicitly computed.`
        : 'Stiffness result unavailable, so redistribution quality cannot be confirmed.',
      action: hasStiffness ? undefined : 'Complete bolt/member segment data so joint stiffness can be solved.'
    });

    checks.push({
      id: 'multifastener-distribution',
      source: 'VT Multi-Bolt Joint Chapter',
      principle: 'Critical-fastener ranking requires group geometry + edge/eccentric effects',
      status: hasPattern && hasPatternCases && hasEdgeEffects ? 'ok' : hasPattern ? 'warn' : 'todo',
      mappedInputs: [
        'adjacentFastenerScreen.rowCount/columnCount',
        'adjacentFastenerScreen.edgeDistanceX/Y',
        'adjacentFastenerScreen.eccentricityX/Y',
        'adjacentFastenerScreen.bypassLoadFactor',
        'adjacentFastenerScreen.loadCases'
      ],
      rationale: hasPattern && hasPatternCases && hasEdgeEffects
        ? `Pattern solver is active with case envelope; current critical fastener: ${criticalFastenerLabel}.`
        : hasPattern
          ? 'Pattern solver is on, but edge/bypass/eccentric definitions are too weak for robust critical-fastener ranking.'
          : 'Pattern solver is disabled, so adjacent-fastener load migration is not being assessed.',
      action:
        hasPattern && hasPatternCases && hasEdgeEffects
          ? undefined
          : 'Enable pattern screening and populate edge distances, eccentricity, bypass factor, and multiple load cases.'
    });

    return checks;
  });
</script>

<div class="grid h-[calc(100vh-6rem)] grid-cols-1 gap-4 overflow-hidden p-1 lg:grid-cols-[560px_1fr]" data-route-ready="preload">
  <div class="flex flex-col gap-4 overflow-y-auto pb-24 pr-2 scrollbar-hide">
    <div class="flex items-center justify-between px-1">
      <div>
        <h2 class="text-lg font-semibold tracking-tight text-white">Fastened Joint Preload Analysis</h2>
        <div class="mt-1 text-xs text-white/55">Core flow: installation -> plate layers -> joint inputs -> results. Advanced inputs are optional.</div>
      </div>
      <div class="flex items-center gap-2">
        <Badge variant="outline" class="border-white/20 text-white/60">explicit solver</Badge>
        <button
          type="button"
          class={localButtonClass('secondary', 'sm')}
          onclick={() => {
            const next = !showAdvancedInputs;
            showAdvancedInputs = next;
            if (next) setWorkflowStep('review');
          }}
        >
          {showAdvancedInputs ? 'Hide Advanced' : 'Show Advanced'}
        </button>
      </div>
    </div>

    <Card class="glass-card">
      <CardHeader class="pb-2 pt-4 flex flex-col items-stretch justify-start gap-2">
        <CardTitle class="text-[10px] font-bold uppercase tracking-widest text-indigo-300">Workflow</CardTitle>
      </CardHeader>
      <CardContent class="space-y-3">
        <div class="space-y-1">
          <div class="flex items-center justify-between text-[10px] uppercase tracking-widest text-white/55">
            <span>Validity Progress</span>
            <span>{validStepCount}/{workflowOrder.length}</span>
          </div>
          <div class="h-2 rounded-full border border-white/15 bg-black/25">
            <div
              class="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-300 transition-[width] duration-300 ease-out"
              style={`width: ${validityProgressPct.toFixed(1)}%`}
            ></div>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2 xl:grid-cols-4">
          <button type="button" aria-label="Pick Fastener" class={localButtonClass(workflowStep === 'fastener' ? 'primary' : 'secondary', 'sm')} onclick={() => setWorkflowStep('fastener')}>1. Pick Fastener</button>
          <button type="button" aria-label="Pick Materials" class={localButtonClass(workflowStep === 'materials' ? 'primary' : 'secondary', 'sm')} onclick={() => setWorkflowStep('materials')} disabled={!canNavigateToStep('materials')}>2. Pick Materials</button>
          <button type="button" aria-label="Define Geometry" class={localButtonClass(workflowStep === 'geometry' ? 'primary' : 'secondary', 'sm')} onclick={() => setWorkflowStep('geometry')} disabled={!canNavigateToStep('geometry')}>3. Define Geometry</button>
          <button type="button" aria-label="Review" class={localButtonClass(workflowStep === 'review' ? 'primary' : 'secondary', 'sm')} onclick={() => setWorkflowStep('review')} disabled={!canNavigateToStep('review')}>4. Review</button>
        </div>
        <div class="rounded-lg border border-white/10 bg-black/15 p-3 text-xs text-white/65">
          {#if workflowStep === 'fastener'}
            Start from the catalog-backed fastener. The route derives nominal diameter, grip shank, and engaged thread automatically unless you explicitly switch to custom segmentation.
          {:else if workflowStep === 'materials'}
            Select the fastener, plate, and washer materials. The solver updates modulus, thermal expansion, and allowables from the selected library entries.
          {:else if workflowStep === 'geometry'}
            Define the rectangular clamped plate geometry and choose the compression proxy. Only enable custom plate rows if the stack is more complex than a simple two-plate joint.
          {:else}
            Review the joint section, preload chart, spring analogy, and fastener-pattern screening. Open advanced only when you need service/load-case detail.
          {/if}
        </div>
        {#if !currentStepValid}
          <div class="rounded-lg border border-amber-400/30 bg-amber-500/10 p-2 text-xs text-amber-100">
            Complete required inputs in this step to unlock the next step.
          </div>
        {/if}
        <div class="flex items-center justify-between">
          <div class="text-xs text-white/50">Advanced is optional. Shortcuts: <span class="text-cyan-200">Alt + ← / Alt + →</span>.</div>
          <div class="flex gap-2">
            <button type="button" class={localButtonClass('ghost', 'sm')} onclick={() => setWorkflowStep(previousWorkflowStep(workflowStep))} disabled={!canGoBack}>Back</button>
            <button type="button" class={localButtonClass('secondary', 'sm')} onclick={handleNextClick}>Next</button>
          </div>
        </div>
        {#if workflowStep !== 'review' && blockedPrereqs.length}
          <div class="rounded-lg border border-amber-400/20 bg-amber-500/8 p-2 text-xs text-amber-100">
            <div class="font-semibold">Review readiness blockers</div>
            <div class="mt-1 space-y-1">
              {#each blockedPrereqs as blocker}
                <div>
                  <button class="text-amber-200 underline underline-offset-2" onclick={() => setWorkflowStep(blocker.step)}>
                    {blocker.label}
                  </button>
                  <span class="text-amber-100/90"> · {blocker.remaining.length} remaining</span>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </CardContent>
    </Card>

    {#if showAdvancedInputs}
    <Card class="glass-card">
      <CardHeader class="pb-2 pt-4 !flex-col !items-stretch !justify-start">
        <CardTitle class="text-[10px] font-bold uppercase tracking-widest text-indigo-300">Import Provenance</CardTitle>
      </CardHeader>
      <CardContent class="grid gap-2 md:grid-cols-2">
        {#each PRELOAD_IMPORT_PROVENANCE as catalog}
          <div class="rounded-lg border border-white/8 bg-black/20 p-3 text-xs text-white/70">
            <div class="font-semibold text-white/85">{catalog.manufacturer}</div>
            <div class="text-white/60">{catalog.family}</div>
            <div class="mt-1 text-cyan-200">{catalog.entryCount} imported entries</div>
            <div class="mt-1 text-white/55">Provenance: <span class="text-cyan-200">{catalog.liveDiscovery}</span></div>
            <div class="text-white/55">Imported: <span class="text-cyan-200">{catalog.importedAt ?? 'unknown'}</span></div>
            <div class="text-white/55">Source file: <span class="text-cyan-200">{catalog.sourcePath ?? 'fixture only'}</span></div>
            <div class="text-white/55">{catalog.referenceOnly ? 'Fixture-backed reference catalog' : 'Primary active catalog'}</div>
          </div>
        {/each}
      </CardContent>
    </Card>
    {/if}

    <Card class="glass-card">
      <CardHeader class="pb-2 pt-4 flex flex-col items-stretch justify-start gap-2">
        <CardTitle class="text-[10px] font-bold uppercase tracking-widest text-indigo-300">
          {workflowStep === 'fastener'
            ? 'Step 1 · Pick Fastener'
            : workflowStep === 'materials'
              ? 'Step 2 · Pick Materials'
              : workflowStep === 'geometry'
                ? 'Step 3 · Define Geometry'
                : 'Step 4 · Review'}
        </CardTitle>
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-white/70">
          <div>
            Required fields complete:
            <span class="font-semibold text-cyan-200">{currentChecklistDone}/{currentChecklistTotal}</span>
          </div>
          <div class="text-white/55">Time on step: {telemetryMinutes.toFixed(2)} min</div>
          {#if stepCompletedAt[workflowStep]}
            <div class="text-[10px] text-white/50">Completed: {new Date(stepCompletedAt[workflowStep]!).toLocaleTimeString()}</div>
          {/if}
        </div>
        {#if currentSnapshot}
          <div class="text-[10px] text-white/50">Autosave snapshot: {new Date(currentSnapshot.savedAt).toLocaleTimeString()}</div>
        {/if}
        <div class="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="ghost"
            onclick={() => showStepHintToast(workflowStep)}
          >
            Show tip
          </Button>
          <Button size="sm" variant="secondary" onclick={() => revertStepSnapshot(workflowStep)} disabled={!currentSnapshot}>
            Revert Step
          </Button>
          <Button size="sm" variant="ghost" onclick={() => revertPreviousStepSnapshot(workflowStep)} disabled={currentSnapshotHistory.length < 2}>
            Restore Previous
          </Button>
        </div>
        {#if stepToast.open}
          <div
            in:fly={{ duration: 160, y: -8, opacity: 0.3 }}
            out:fly={{ duration: 180, y: -4, opacity: 0.1 }}
            class={`rounded-lg border p-2 text-xs ${
              stepToast.tone === 'ok'
                ? 'border-emerald-300/30 bg-emerald-500/12 text-emerald-100'
                : stepToast.tone === 'warn'
                  ? 'border-amber-300/35 bg-amber-500/12 text-amber-100'
                  : 'border-cyan-300/25 bg-cyan-500/10 text-cyan-100'
            }`}
          >
            {stepToast.text}
          </div>
        {/if}
        <div class="rounded-lg border border-white/10 bg-black/15 p-2 text-xs text-white/70">
          <div class="mb-1 font-semibold text-white/80">Step Checklist</div>
          <div class="grid gap-1">
            {#each currentChecklist as item}
              <button
                id={`${item.id}-jump`}
                class={`inline-flex min-w-0 items-center gap-1 rounded-md border px-2 py-1 text-left text-[11px] break-words ${item.valid ? 'border-emerald-300/35 bg-emerald-500/10 text-emerald-100' : 'border-amber-300/35 bg-amber-500/10 text-amber-100'} ${walkthroughItem?.id === item.id ? 'ring-2 ring-cyan-300/55' : ''}`}
                onclick={() => focusByFieldId(item.id)}
              >
                {item.valid ? '✓' : '•'} {item.label}
              </button>
            {/each}
          </div>
        </div>
        <div class="grid gap-2 rounded-lg border border-white/10 bg-black/15 p-2 text-xs text-white/65 sm:grid-cols-2">
          <label class="inline-flex items-center gap-2">
            <input type="checkbox" class="checkbox checkbox-xs border-white/25 bg-black/30" bind:checked={stepPrefs.autoAdvance} />
            Auto-advance when step becomes valid
          </label>
          <label class="inline-flex items-center gap-2">
            <input type="checkbox" class="checkbox checkbox-xs border-white/25 bg-black/30" bind:checked={stepPrefs.walkthrough} />
            Walkthrough highlight
          </label>
          <label class="inline-flex items-center gap-2">
            <input type="checkbox" class="checkbox checkbox-xs border-white/25 bg-black/30" bind:checked={stepPrefs.autoBearingArea} />
            Auto bearing area
          </label>
        </div>
      </CardHeader>
      <CardContent class="space-y-3">
        {#if currentChecklist.some((item) => !item.valid)}
          <div class="rounded-lg border border-amber-400/30 bg-amber-500/12 p-2 text-xs text-amber-100">
            <span class="font-semibold">Missing:</span>
            {#each currentChecklist.filter((item) => !item.valid) as missing, idx}
              <button class="ml-2 underline underline-offset-2" onclick={() => focusByFieldId(missing.id)}>{missing.label}</button>{idx < currentChecklist.filter((item) => !item.valid).length - 1 ? ',' : ''}
            {/each}
          </div>
        {/if}
        {#key workflowStep}
        <div
          class="space-y-3"
          in:fly={{ duration: 180, y: 10, opacity: 0.2 }}
          out:fly={{ duration: 120, y: -8, opacity: 0.1 }}
        >

    {#if workflowStep === 'fastener'}
    <Card class="glass-card !border-0 !bg-transparent !shadow-none wizard-subcard">
      <CardHeader class="pb-2 pt-4">
        <CardTitle class="text-[10px] font-bold uppercase tracking-widest text-indigo-300">Installation Model</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="space-y-1">
          <Label class="text-white/70">Model</Label>
          <Select
            id={fieldId('installation-model')}
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
            <div class="space-y-1">
              <Label class="text-white/70">Bearing Mean Dia</Label>
              <Input type="number" step="0.0001" bind:value={form.installation.bearingMeanDiameter} disabled={stepPrefs.autoBearingArea} />
              {#if stepPrefs.autoBearingArea}
                <div class="text-[10px] text-white/55">Auto from governing bearing annulus: {fmt(effectiveBearingMeanDiameter, 4)}</div>
              {/if}
            </div>
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
    {/if}

    {#if workflowStep === 'fastener' || workflowStep === 'materials'}
    <Card class="glass-card !border-0 !bg-transparent !shadow-none wizard-subcard">
      <CardHeader class="pb-2 pt-4">
        <CardTitle class="text-[10px] font-bold uppercase tracking-widest text-indigo-300">Catalog Defaults</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        {#if workflowStep === 'fastener'}
          <div class="rounded-lg border border-white/10 bg-black/15 p-3 text-xs text-white/60">
            Step 1 only selects the fastener definition. Materials for plates/washers are handled in Step 2.
          </div>
          <div class="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <div class="space-y-1">
              <Label class="text-white/70">Fastener family</Label>
              <Select
                id={fieldId('fastener-family')}
                bind:value={form.selectedFastenerId}
                items={PRELOAD_FASTENER_CATALOG.map((item) => ({ value: item.id, label: item.label }))}
              />
              <div class="text-xs text-white/50">{selectedFastener.notes}</div>
            </div>
            <div class="space-y-1">
              <Label class="text-white/70">Hi-Lok dash diameter</Label>
              <Select
                id={fieldId('fastener-dash')}
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
                id={fieldId('fastener-grip')}
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
                id={fieldId('fastener-material')}
                bind:value={form.selectedFastenerMaterialId}
                items={PRELOAD_MATERIAL_LIBRARY.map((item) => ({ value: item.id, label: item.name }))}
              />
              <div class="text-xs text-white/50">Updates bolt modulus and fastener strength defaults. Explicit geometry remains user-entered.</div>
            </div>
          </div>
        {:else}
          <div class="rounded-lg border border-white/10 bg-black/15 p-3 text-xs text-white/60">
            Step 2 assigns materials. By default all plate layers share one material and both washer sides share one material.
          </div>
          <div class="space-y-3 rounded-xl border border-white/10 bg-black/20 p-3">
            <label class="flex items-center gap-2 text-sm text-white/75">
              <input type="checkbox" class="checkbox checkbox-sm border-white/20 bg-black/30" bind:checked={form.useSamePlateMaterial} />
              Use same material for all plate layers
            </label>
            {#if form.useSamePlateMaterial}
              <div class="space-y-1">
                <Label class="text-white/70">Plate material (all layers)</Label>
                <Select
                  id={fieldId('plate-material')}
                  bind:value={form.selectedPlateMaterialId}
                  items={PRELOAD_MATERIAL_LIBRARY.map((item) => ({ value: item.id, label: item.name }))}
                />
              </div>
            {:else}
              <div class="grid grid-cols-1 gap-3 xl:grid-cols-2">
                <div class="space-y-1">
                  <Label class="text-white/70">Top plate material</Label>
                  <Select
                    id={fieldId('plate-material')}
                    bind:value={form.selectedTopPlateMaterialId}
                    items={PRELOAD_MATERIAL_LIBRARY.map((item) => ({ value: item.id, label: item.name }))}
                  />
                </div>
                <div class="space-y-1">
                  <Label class="text-white/70">Bottom plate material</Label>
                  <Select
                    bind:value={form.selectedBottomPlateMaterialId}
                    items={PRELOAD_MATERIAL_LIBRARY.map((item) => ({ value: item.id, label: item.name }))}
                  />
                </div>
              </div>
            {/if}
          </div>
          <div class="space-y-3 rounded-xl border border-white/10 bg-black/20 p-3">
            <label class="flex items-center gap-2 text-sm text-white/75">
              <input type="checkbox" class="checkbox checkbox-sm border-white/20 bg-black/30" bind:checked={form.useSameWasherMaterial} />
              Use same material for head-side and nut-side washers
            </label>
            {#if form.useSameWasherMaterial}
              <div class="space-y-1">
                <Label class="text-white/70">Washer material (both sides)</Label>
                <Select
                  id={fieldId('washer-material')}
                  bind:value={form.selectedWasherMaterialId}
                  items={PRELOAD_MATERIAL_LIBRARY.map((item) => ({ value: item.id, label: item.name }))}
                />
              </div>
            {:else}
              <div class="grid grid-cols-1 gap-3 xl:grid-cols-2">
                <div class="space-y-1">
                  <Label class="text-white/70">Head-side washer material</Label>
                  <Select
                    id={fieldId('washer-material')}
                    bind:value={form.selectedHeadWasherMaterialId}
                    items={PRELOAD_MATERIAL_LIBRARY.map((item) => ({ value: item.id, label: item.name }))}
                  />
                </div>
                <div class="space-y-1">
                  <Label class="text-white/70">Nut-side washer material</Label>
                  <Select
                    bind:value={form.selectedNutWasherMaterialId}
                    items={PRELOAD_MATERIAL_LIBRARY.map((item) => ({ value: item.id, label: item.name }))}
                  />
                </div>
              </div>
              <div class="text-xs text-white/50">
                Solver currently uses one equivalent washer stiffness, so mixed washer materials are combined into an explicit averaged equivalent.
              </div>
            {/if}
          </div>
        {/if}
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
    {/if}

    {#if workflowStep === 'geometry'}
    <Card class="glass-card !border-0 !bg-transparent !shadow-none wizard-subcard">
      <CardHeader class="pb-2 pt-4">
        <CardTitle class="text-[10px] font-bold uppercase tracking-widest text-indigo-300">Joint Inputs</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        {#if form.useCustomPlateLayers}
          <div class="rounded-lg border border-white/10 bg-black/15 p-3 text-xs text-white/60">
            Plate width/plan length/top thickness/bottom thickness are currently defined directly in <span class="text-cyan-200">Clamped Plate Layers</span> because custom layer editing is enabled.
          </div>
        {/if}
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1"><Label class="text-white/70">Nominal Dia</Label><Input id={fieldId('nominal-dia')} type="number" step="0.0001" bind:value={form.nominalDiameter} disabled={!form.useCustomBoltSegments} /></div>
          <div class="space-y-1"><Label class="text-white/70">Tensile Stress Area</Label><Input id={fieldId('stress-area')} type="number" step="0.0001" bind:value={form.tensileStressArea} disabled={!form.useCustomBoltSegments} /></div>
          {#if !form.useCustomPlateLayers}
            <div class="space-y-1"><Label class="text-white/70">Plate Width</Label><Input id={fieldId('plate-width')} type="number" step="0.0001" bind:value={form.defaultPlateWidth} /></div>
            <div class="space-y-1"><Label class="text-white/70">Plate Plan Length</Label><Input id={fieldId('plate-length')} type="number" step="0.0001" bind:value={form.defaultPlateLength} /></div>
            <div class="space-y-1"><Label class="text-white/70">Top Plate Thickness</Label><Input id={fieldId('top-thk')} type="number" step="0.0001" bind:value={form.defaultTopPlateThickness} /></div>
            <div class="space-y-1"><Label class="text-white/70">Bottom Plate Thickness</Label><Input id={fieldId('bot-thk')} type="number" step="0.0001" bind:value={form.defaultBottomPlateThickness} /></div>
          {/if}
          <div class="space-y-1"><Label class="text-white/70">Legacy Scatter %</Label><Input type="number" step="0.1" bind:value={form.installationScatterPercent} /></div>
          <div class="space-y-1"><Label class="text-white/70">Cone Half-Angle (visual)</Label><Input type="number" step="0.1" bind:value={form.compressionConeHalfAngleDeg} /></div>
          <div class="space-y-1"><Label class="text-white/70">Slip Coeff</Label><Input type="number" step="0.01" bind:value={form.fayingSurfaceSlipCoeff} /></div>
          <div class="space-y-1"><Label class="text-white/70">Interface Count</Label><Input type="number" step="1" bind:value={form.frictionInterfaceCount} /></div>
          <div class="space-y-1"><Label class="text-white/70">Proof Strength</Label><Input type="number" step="1000" bind:value={form.boltProofStrength} /></div>
          <div class="space-y-1"><Label class="text-white/70">Ultimate Strength</Label><Input type="number" step="1000" bind:value={form.boltUltimateStrength} /></div>
          <div class="space-y-1"><Label class="text-white/70">Endurance Limit</Label><Input type="number" step="1000" bind:value={form.boltEnduranceLimit} /></div>
          <div class="space-y-1"><Label class="text-white/70">Bearing Allowable</Label><Input type="number" step="1000" bind:value={form.memberBearingAllowable} /></div>
          <div class="space-y-1">
            <Label class="text-white/70">Under-Head / Nut Governing Bearing Area</Label>
            <Input id={fieldId('bearing-area')} type="number" step="0.0001" bind:value={form.underHeadBearingArea} disabled={stepPrefs.autoBearingArea} />
            <div class="text-[10px] text-white/55">
              {stepPrefs.autoBearingArea
                ? `Auto: min(head ${fmt(topBearingFaceArea, 4)}, nut ${fmt(bottomBearingFaceArea, 4)}) = ${fmt(autoComputedBearingArea, 4)}`
                : 'Manual override enabled.'}
            </div>
          </div>
          <div class="space-y-1"><Label class="text-white/70">Engaged Thread Length</Label><Input type="number" step="0.0001" bind:value={form.engagedThreadLength} /></div>
        </div>
        <div class="rounded-lg border border-cyan-400/15 bg-cyan-500/5 p-3 text-xs text-cyan-100">
          Installation uncertainty now combines the legacy scatter band with explicit contributor percentages using root-sum-square aggregation.
        </div>
        <div class="grid grid-cols-2 gap-3 xl:grid-cols-3">
          <div class="space-y-1"><Label class="text-white/70">Tool Accuracy %</Label><Input type="number" step="0.1" bind:value={form.installationUncertainty.toolAccuracyPercent} /></div>
          <div class="space-y-1"><Label class="text-white/70">Thread Friction %</Label><Input type="number" step="0.1" bind:value={form.installationUncertainty.threadFrictionPercent} /></div>
          <div class="space-y-1"><Label class="text-white/70">Bearing Friction %</Label><Input type="number" step="0.1" bind:value={form.installationUncertainty.bearingFrictionPercent} /></div>
          <div class="space-y-1"><Label class="text-white/70">Prevailing Torque %</Label><Input type="number" step="0.1" bind:value={form.installationUncertainty.prevailingTorquePercent} /></div>
          <div class="space-y-1"><Label class="text-white/70">Thread Geometry %</Label><Input type="number" step="0.1" bind:value={form.installationUncertainty.threadGeometryPercent} /></div>
          <div class="space-y-1">
            <Label class="text-white/70">Combined RSS %</Label>
            <Input type="number" step="0.001" value={output?.installation.uncertainty.combinedPercent ?? 0} disabled />
          </div>
        </div>
      </CardContent>
    </Card>
    {/if}

    {#if workflowStep === 'materials'}
    <Card class="glass-card !border-0 !bg-transparent !shadow-none wizard-subcard">
      <CardHeader class="pb-2 pt-4">
        <CardTitle class="text-[10px] font-bold uppercase tracking-widest text-indigo-300">Washer / Under-Head Stack</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <label class="flex items-center gap-2 text-sm text-white/75">
          <input type="checkbox" class="checkbox checkbox-sm border-white/20 bg-black/30" bind:checked={form.washerStack.enabled} />
          Include explicit washer stack in member compliance
        </label>
        {#if form.washerStack.enabled}
          <label class="flex items-center gap-2 text-xs text-white/70">
            <input type="checkbox" class="checkbox checkbox-xs border-white/25 bg-black/30" bind:checked={form.washerGeometryManualOverride} />
            Manual washer/head/nut face geometry override (Advanced)
          </label>
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1"><Label class="text-white/70">Under Head Count</Label><Input type="number" step="1" bind:value={form.washerStack.underHeadCount} /></div>
            <div class="space-y-1"><Label class="text-white/70">Under Nut Count</Label><Input type="number" step="1" bind:value={form.washerStack.underNutCount} /></div>
            <div class="space-y-1"><Label class="text-white/70">Thickness / Washer</Label><Input type="number" step="0.0001" bind:value={form.washerStack.thicknessPerWasher} /></div>
            <div class="space-y-1"><Label class="text-white/70">Modulus</Label><Input type="number" step="1000" bind:value={form.washerStack.modulus} /></div>
            <div class="space-y-1"><Label class="text-white/70">Head Outer Dia</Label><Input type="number" step="0.0001" bind:value={form.washerStack.underHeadOuterDiameter} disabled={!form.washerGeometryManualOverride} /></div>
            <div class="space-y-1"><Label class="text-white/70">Head Inner Dia</Label><Input type="number" step="0.0001" bind:value={form.washerStack.underHeadInnerDiameter} disabled={!form.washerGeometryManualOverride} /></div>
            <div class="space-y-1"><Label class="text-white/70">Nut Outer Dia</Label><Input type="number" step="0.0001" bind:value={form.washerStack.underNutOuterDiameter} disabled={!form.washerGeometryManualOverride} /></div>
            <div class="space-y-1"><Label class="text-white/70">Nut Inner Dia</Label><Input type="number" step="0.0001" bind:value={form.washerStack.underNutInnerDiameter} disabled={!form.washerGeometryManualOverride} /></div>
            <div class="space-y-1"><Label class="text-white/70">Thermal α</Label><Input type="number" step="0.0000001" bind:value={form.washerStack.thermalExpansionCoeff} /></div>
          </div>
          {#if !form.washerGeometryManualOverride}
            <div class="rounded-lg border border-cyan-400/15 bg-cyan-500/8 p-2 text-xs text-cyan-100">
              Face diameters are auto-derived from selected fastener diameter + washer stack and kept physically valid (inner &lt; outer).
            </div>
          {/if}
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
    {/if}

    {#if workflowStep === 'fastener'}
    <Card class="glass-card !border-0 !bg-transparent !shadow-none wizard-subcard">
      <CardHeader class="pb-2 pt-4">
        <CardTitle class="text-[10px] font-bold uppercase tracking-widest text-indigo-300">Bolt Geometry</CardTitle>
      </CardHeader>
      <CardContent class="space-y-3">
        <label class="flex items-center gap-2 text-sm text-white/75">
          <input type="checkbox" class="checkbox checkbox-sm border-white/20 bg-black/30" bind:checked={form.useCustomBoltSegments} />
          Use custom bolt segmentation (otherwise derive grip shank + engaged thread automatically from the selected fastener and grip)
        </label>
        {#if form.useCustomBoltSegments}
          {#each form.boltSegments as segment, index}
            <div class={`rounded-xl border p-3 ${boltValidation(segment).length ? 'border-amber-400/30 bg-amber-500/8' : 'border-white/10 bg-black/20'}`}>
              <div class="mb-3 flex items-center justify-between gap-2">
                <div class="text-xs font-semibold text-white/75">{segment.id}</div>
                <div class="flex items-center gap-1 rounded-lg border border-white/10 bg-black/20 p-1">
                  <Button size="sm" variant="ghost" class="min-w-12 px-2 text-[10px]" aria-label="Move bolt segment up" onclick={() => moveBoltSegment(index, -1)} disabled={index === 0}>Up</Button>
                  <Button size="sm" variant="ghost" class="min-w-12 px-2 text-[10px]" aria-label="Move bolt segment down" onclick={() => moveBoltSegment(index, 1)} disabled={index === form.boltSegments.length - 1}>Down</Button>
                  <Button size="sm" variant="ghost" class="min-w-16 px-2 text-[10px]" aria-label="Duplicate bolt segment" onclick={() => duplicateBoltSegment(index)}>Duplicate</Button>
                  <Button size="sm" variant="ghost" class="min-w-14 px-2 text-[10px]" aria-label="Remove bolt segment" onclick={() => removeBoltSegment(index)} disabled={form.boltSegments.length <= 1}>Remove</Button>
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
          <Button size="sm" variant="secondary" onclick={addBoltSegment}>Add Bolt Segment</Button>
        {:else}
          <div class="rounded-lg border border-white/10 bg-black/15 p-3 text-xs text-white/60">
            The selected catalog fastener automatically defines a smooth grip segment and an engaged threaded segment. Switch on custom segmentation only when you need to override the catalog-derived split.
          </div>
          <div class="space-y-2">
            {#each form.boltSegments as segment}
              <div class="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/72">
                <div class="flex items-center justify-between gap-2">
                  <div class="font-semibold text-white/82">{segment.id}</div>
                  <div class="text-cyan-200">Auto-derived</div>
                </div>
                <div class="mt-2 grid grid-cols-2 gap-2">
                  <div>Length <span class="font-mono text-white/85">{fmt(segment.length, 4)}</span></div>
                  <div>Area <span class="font-mono text-white/85">{fmt(segment.area, 4)}</span></div>
                  <div>Modulus <span class="font-mono text-white/85">{fmt(segment.modulus, 0)}</span></div>
                  <div>
                    k <span class="font-mono text-cyan-200">{segmentPreview(segment) ? fmt(segmentPreview(segment), 3) : '—'}</span>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </CardContent>
    </Card>
    {/if}

    {#if workflowStep === 'geometry'}
    <Card class="glass-card !border-0 !bg-transparent !shadow-none wizard-subcard">
      <CardHeader class="pb-2 pt-4">
        <CardTitle class="text-[10px] font-bold uppercase tracking-widest text-indigo-300">Clamped Plate Layers</CardTitle>
      </CardHeader>
      <CardContent class="space-y-3">
        <div class="rounded-lg border border-cyan-400/15 bg-cyan-500/5 p-3 text-xs text-cyan-100">
          Physical layers remain rectangular plates. The selector below changes only the compression proxy used to estimate the compressed zone inside each plate.
        </div>
        <div class="rounded-lg border border-white/10 bg-black/15 p-3 text-xs text-white/70">
          <div class="font-semibold text-white/85">Compression proxy quick guide</div>
          <div class="mt-1"><span class="text-cyan-200">Constant effective compression diameter</span>: one constant compressed zone through thickness.</div>
          <div><span class="text-cyan-200">Tapered effective compression diameter</span>: explicit start/end compressed zone diameters through thickness.</div>
          <div><span class="text-cyan-200">Equivalent compressed area</span>: you enter the equivalent compressed area directly and skip diameter proxies.</div>
          <div><span class="text-cyan-200">Calibrated cone / VDI-style equivalent stiffness</span>: the solver auto-derives a tapered annulus from plate footprint and cone half-angle.</div>
        </div>
        <label class="flex items-center gap-2 text-sm text-white/75" id={fieldId('plate-layers')}>
          <input type="checkbox" class="checkbox checkbox-sm border-white/20 bg-black/30" bind:checked={form.useCustomPlateLayers} />
          Use custom plate layers (otherwise derive two rectangular clamped plates from the main geometry inputs and selected material)
        </label>
        {#if form.useCustomPlateLayers}
        <label class="flex items-center gap-2 text-xs text-white/70">
          <input type="checkbox" class="checkbox checkbox-xs border-white/25 bg-black/30" bind:checked={form.conicalGeometryManualOverride} />
          Manual conical proxy diameters override (Advanced)
        </label>
        {#if !form.conicalGeometryManualOverride}
          <div class="rounded-lg border border-cyan-400/15 bg-cyan-500/8 p-2 text-xs text-cyan-100">
            For tapered proxy rows, start/end effective zone diameters are auto-derived from hole diameter, row thickness, and cone half-angle.
          </div>
        {/if}
        {#each form.memberSegments as segment, index}
          <div class={`rounded-xl border p-3 ${memberValidation(segment).length ? 'border-amber-400/30 bg-amber-500/8' : 'border-white/10 bg-black/20'}`}>
            <div class="mb-3 flex items-center justify-between gap-2">
              <div class="text-xs font-semibold text-white/75">{segment.id}</div>
              <div class="flex flex-wrap items-center gap-1 rounded-lg border border-white/10 bg-black/20 p-1">
                <Select
                  class="min-w-[220px]"
                  value={segment.compressionModel}
                  items={[
                    { value: 'cylindrical_annulus', label: 'Constant effective compression diameter' },
                    { value: 'conical_frustum_annulus', label: 'Tapered effective compression diameter' },
                    { value: 'explicit_area', label: 'Equivalent compressed area' },
                    { value: 'calibrated_vdi_equivalent', label: 'Calibrated cone / VDI-style equivalent stiffness' }
                  ]}
                  on:change={(event) =>
                    changeCompressionModel(
                      index,
                      readSelectValue(event, segment.compressionModel) as MemberSegmentInput['compressionModel']
                    )}
                />
                {#if form.useCustomPlateLayers}
                  <Button size="sm" variant="ghost" class="min-w-12 px-2 text-[10px]" aria-label="Move member segment up" onclick={() => moveMemberSegment(index, -1)} disabled={index === 0}>Up</Button>
                  <Button size="sm" variant="ghost" class="min-w-12 px-2 text-[10px]" aria-label="Move member segment down" onclick={() => moveMemberSegment(index, 1)} disabled={index === form.memberSegments.length - 1}>Down</Button>
                  <Button size="sm" variant="ghost" class="min-w-16 px-2 text-[10px]" aria-label="Duplicate member segment" onclick={() => duplicateMemberSegment(index)}>Duplicate</Button>
                  <Button size="sm" variant="ghost" class="min-w-14 px-2 text-[10px]" aria-label="Remove member segment" onclick={() => removeMemberSegment(index)} disabled={form.memberSegments.length <= 1}>Remove</Button>
                {/if}
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1"><Label class="text-white/60">ID</Label><Input bind:value={segment.id} disabled={!form.useCustomPlateLayers} /></div>
              <div class="space-y-1"><Label class="text-white/60">Plate Thickness</Label><Input type="number" step="0.0001" bind:value={segment.length} disabled={!form.useCustomPlateLayers} /></div>
              <div class="space-y-1"><Label class="text-white/60">Plate Width</Label><Input type="number" step="0.0001" bind:value={segment.plateWidth} disabled={!form.useCustomPlateLayers} /></div>
              <div class="space-y-1"><Label class="text-white/60">Plate Plan Length</Label><Input type="number" step="0.0001" bind:value={segment.plateLength} disabled={!form.useCustomPlateLayers} /></div>
              <div class="space-y-1"><Label class="text-white/60">Modulus</Label><Input type="number" step="1000" bind:value={segment.modulus} disabled={!form.useCustomPlateLayers} /></div>
              <div class="space-y-1"><Label class="text-white/60">Thermal α</Label><Input type="number" step="0.0000001" bind:value={segment.thermalExpansionCoeff} disabled={!form.useCustomPlateLayers} /></div>

              {#if segment.compressionModel === 'cylindrical_annulus'}
                <div class="space-y-1"><Label class="text-white/60">Effective compressed-zone OD</Label><Input type="number" step="0.0001" bind:value={segment.outerDiameter} disabled={!form.useCustomPlateLayers} /></div>
                <div class="space-y-1"><Label class="text-white/60">Bolt hole dia</Label><Input type="number" step="0.0001" bind:value={segment.innerDiameter} disabled={!form.useCustomPlateLayers} /></div>
              {:else if segment.compressionModel === 'conical_frustum_annulus'}
                <div class="space-y-1"><Label class="text-white/60">Effective zone OD (start face)</Label><Input type="number" step="0.0001" bind:value={segment.outerDiameterStart} disabled={!form.useCustomPlateLayers || !form.conicalGeometryManualOverride} /></div>
                <div class="space-y-1"><Label class="text-white/60">Effective zone OD (end face)</Label><Input type="number" step="0.0001" bind:value={segment.outerDiameterEnd} disabled={!form.useCustomPlateLayers || !form.conicalGeometryManualOverride} /></div>
                <div class="space-y-1"><Label class="text-white/60">Bolt hole dia</Label><Input type="number" step="0.0001" bind:value={segment.innerDiameter} disabled={!form.useCustomPlateLayers} /></div>
                <div class="rounded-lg border border-cyan-400/20 bg-cyan-500/5 p-2 text-xs text-cyan-100">Exact annular-frustum compliance integration is used for the compressed-zone representation only. The physical part is still a plate layer.</div>
              {:else if segment.compressionModel === 'calibrated_vdi_equivalent'}
                <div class="space-y-1"><Label class="text-white/60">Bolt hole dia</Label><Input type="number" step="0.0001" bind:value={segment.innerDiameter} disabled={!form.useCustomPlateLayers} /></div>
                <div class="rounded-lg border border-cyan-400/20 bg-cyan-500/5 p-2 text-xs text-cyan-100">The solver auto-derives the tapered compression annulus from the row footprint and the active cone half-angle.</div>
              {:else}
                <div class="space-y-1"><Label class="text-white/60">Explicit Equivalent Area</Label><Input type="number" step="0.0001" bind:value={segment.effectiveArea} disabled={!form.useCustomPlateLayers} /></div>
                <div class="space-y-1"><Label class="text-white/60">Note</Label><Input bind:value={segment.note} disabled={!form.useCustomPlateLayers} /></div>
              {/if}
            </div>
            <div class="mt-2 rounded-lg border border-white/8 bg-white/[0.02] p-2 text-xs text-white/60">
              Physical layer: rectangular plate footprint <span class="font-mono text-white/80">{fmt(segment.plateWidth, 3)} × {fmt(segment.plateLength, 3)}</span> with thickness <span class="font-mono text-white/80">{fmt(segment.length, 3)}</span>. The selected compression model only controls the effective compressed-zone stiffness abstraction.
            </div>
            <div class="mt-2 rounded-lg border border-white/8 bg-white/[0.02] p-2">
              <div class="mb-1 text-[10px] font-semibold uppercase tracking-widest text-cyan-200">Row Footprint</div>
              <svg viewBox="0 0 160 72" class="h-16 w-full">
                <rect x="18" y="12" width="90" height="46" rx="6" fill="rgba(34,211,238,0.12)" stroke="rgba(34,211,238,0.55)" />
                <circle cx="63" cy="35" r="9" fill="rgba(8,16,32,0.95)" stroke="rgba(250,204,21,0.65)" />
                <line x1="118" y1="14" x2="142" y2="14" stroke="rgba(255,255,255,0.45)" stroke-width="1.5" />
                <line x1="118" y1="58" x2="142" y2="58" stroke="rgba(255,255,255,0.45)" stroke-width="1.5" />
                <line x1="136" y1="14" x2="136" y2="58" stroke="rgba(255,255,255,0.45)" stroke-width="1.5" />
                <text x="146" y="37" fill="rgba(255,255,255,0.8)" font-size="8" dominant-baseline="middle">W {fmt(segment.plateWidth, 3)}</text>
                <line x1="20" y1="66" x2="108" y2="66" stroke="rgba(255,255,255,0.45)" stroke-width="1.5" />
                <line x1="20" y1="62" x2="20" y2="70" stroke="rgba(255,255,255,0.45)" stroke-width="1.5" />
                <line x1="108" y1="62" x2="108" y2="70" stroke="rgba(255,255,255,0.45)" stroke-width="1.5" />
                <text x="64" y="70" fill="rgba(255,255,255,0.8)" font-size="8" text-anchor="middle">L {fmt(segment.plateLength, 3)}</text>
              </svg>
              <div class="mt-1 text-[10px] text-white/55">Centered-hole rectangular plate footprint used as the physical row assumption.</div>
            </div>
            <div class="mt-3 rounded-lg border border-cyan-400/15 bg-cyan-500/5 p-2 text-xs text-cyan-100">
              {#if memberPreview(segment)}
                Segment stiffness preview: <span class="font-mono">{fmt(memberPreview(segment)?.stiffness, 3)}</span>
                <span class="text-white/55"> • compliance {fmt(memberPreview(segment)?.compliance, 8)}</span>
                <div class="mt-1 text-white/65">Compression proxy: {compressionModelLabel(segment.compressionModel)}</div>
              {:else}
                Segment stiffness preview unavailable until the current compression-model proxy inputs are valid.
              {/if}
            </div>
            <div class="mt-2 rounded-lg border border-white/8 bg-white/[0.02] p-2 text-[11px] text-white/62">
              {#if segment.compressionModel === 'cylindrical_annulus'}
                Constant effective compression diameter: keeps one compressed-zone diameter through the plate thickness.
              {:else if segment.compressionModel === 'conical_frustum_annulus'}
                Tapered effective compression diameter: lets the compressed zone widen through the plate thickness.
              {:else if segment.compressionModel === 'calibrated_vdi_equivalent'}
                Calibrated cone / VDI-style equivalent stiffness: auto-derived tapered annulus from the plate footprint and active cone angle.
              {:else}
                Equivalent compressed area: you enter the effective area directly instead of using a diameter-based proxy.
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
          <Button size="sm" variant="secondary" onclick={() => addMemberSegment('cylindrical_annulus')}>Add Plate Layer (Constant Diameter)</Button>
          <Button size="sm" variant="secondary" onclick={() => addMemberSegment('conical_frustum_annulus')}>Add Plate Layer (Tapered Diameter)</Button>
          <Button size="sm" variant="secondary" onclick={() => addMemberSegment('calibrated_vdi_equivalent')}>Add Plate Layer (Calibrated Cone)</Button>
          <Button size="sm" variant="secondary" onclick={() => addMemberSegment('explicit_area')}>Add Plate Layer (Equivalent Area)</Button>
        </div>
        {:else}
          <div class="space-y-2">
            {#each form.memberSegments as segment}
              <div class="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/72">
                <div class="flex items-center justify-between gap-2">
                  <div class="font-semibold text-white/82">{segment.id}</div>
                  <div class="text-cyan-200">{compressionModelLabel(segment.compressionModel)}</div>
                </div>
                <div class="mt-2 grid grid-cols-2 gap-2">
                  <div>Thickness <span class="font-mono text-white/85">{fmt(segment.length, 4)}</span></div>
                  <div>Width <span class="font-mono text-white/85">{fmt(segment.plateWidth, 4)}</span></div>
                  <div>Plan length <span class="font-mono text-white/85">{fmt(segment.plateLength, 4)}</span></div>
                  <div>Modulus <span class="font-mono text-white/85">{fmt(segment.modulus, 0)}</span></div>
                </div>
                <div class="mt-2 rounded-lg border border-cyan-400/15 bg-cyan-500/5 p-2 text-cyan-100">
                  {#if segment.compressionModel === 'cylindrical_annulus'}
                    Constant effective compression diameter: constant compressed-zone diameter through the plate thickness.
                  {:else if segment.compressionModel === 'conical_frustum_annulus'}
                    Tapered effective compression diameter: explicit widening through thickness.
                  {:else if segment.compressionModel === 'calibrated_vdi_equivalent'}
                    Calibrated cone / VDI-style equivalent stiffness: auto-derived tapered annulus using row footprint and cone angle.
                  {:else}
                    Equivalent compressed area: explicit area replaces the diameter proxy.
                  {/if}
                </div>
              </div>
            {/each}
          </div>
          <div class="space-y-1">
            <Label class="text-white/70">Default compression proxy for auto-generated plate layers</Label>
            <Select
              bind:value={form.defaultPlateCompressionModel}
              items={[
                { value: 'cylindrical_annulus', label: 'Constant effective compression diameter' },
                { value: 'conical_frustum_annulus', label: 'Tapered effective compression diameter' },
                { value: 'calibrated_vdi_equivalent', label: 'Calibrated cone / VDI-style equivalent stiffness' },
                { value: 'explicit_area', label: 'Equivalent compressed area' }
              ]}
            />
          </div>
          <div class="rounded-lg border border-white/10 bg-black/15 p-3 text-xs text-white/60">
            Two plate rows are generated automatically from the main geometry inputs. Turn on custom plate layers only when the joint stack is more complex than a simple two-plate clampup.
          </div>
        {/if}
      </CardContent>
    </Card>
    {/if}

    {#if preloadIssues.length}
    <Card class="glass-card !border-0 !bg-transparent !shadow-none wizard-subcard">
      <CardHeader class="pb-2 pt-4">
        <CardTitle class="text-[10px] font-bold uppercase tracking-widest text-amber-300">Attention Required</CardTitle>
      </CardHeader>
      <CardContent class="space-y-3">
        <div class="rounded-lg border border-amber-300/30 bg-amber-500/10 p-3 text-xs text-amber-100">
          Select an issue to see concrete fix options. These actions update the current input set directly instead of leaving you with raw solver text.
        </div>
        <div class="space-y-2">
          {#each preloadIssues as issue, index}
            <button
              type="button"
              class={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                activePreloadIssueIndex === index
                  ? 'border-amber-300/45 bg-amber-500/12 text-white'
                  : 'border-white/10 bg-black/20 text-white/80 hover:border-white/20 hover:bg-white/[0.04]'
              }`}
              onclick={() => (activePreloadIssueIndex = index)}>
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="font-semibold">{issue.title}</div>
                  <div class="mt-1 text-[11px] text-white/70">{issue.description}</div>
                </div>
                <div class={`shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] ${issue.severity === 'error' ? 'bg-amber-500/20 text-amber-100' : 'bg-cyan-500/20 text-cyan-100'}`}>
                  {issue.severity}
                </div>
              </div>
            </button>
          {/each}
        </div>
        {#if selectedPreloadIssue}
          <div class="rounded-lg border border-cyan-300/20 bg-cyan-500/10 p-3 text-xs text-cyan-100">
            <div class="font-semibold uppercase tracking-wide text-[10px]">Possible Solutions</div>
            <div class="mt-1 text-white/78">{selectedPreloadIssue.description}</div>
            <div class="mt-3 flex flex-wrap gap-2">
              {#each selectedPreloadIssue.actions as action}
                <Button
                  size="sm"
                  variant="secondary"
                  onclick={() => {
                    action.run();
                    focusIssueTarget(action.target);
                  }}>
                  {action.label}
                </Button>
              {/each}
            </div>
          </div>
        {/if}
      </CardContent>
    </Card>
    {/if}

    {#if showAdvancedInputs && workflowStep === 'review'}
    <Card class="glass-card !border-0 !bg-transparent !shadow-none wizard-subcard">
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
        <div class="space-y-1"><Label class="text-white/70">Coating Crush Loss</Label><Input type="number" step="0.00001" bind:value={form.serviceCase.coatingCrushLoss} /></div>
        <div class="space-y-1"><Label class="text-white/70">Washer Seating Loss</Label><Input type="number" step="0.00001" bind:value={form.serviceCase.washerSeatingLoss} /></div>
        <div class="space-y-1"><Label class="text-white/70">Relaxation Loss %</Label><Input type="number" step="0.1" bind:value={form.serviceCase.relaxationLossPercent} /></div>
        <div class="space-y-1"><Label class="text-white/70">Creep Loss %</Label><Input type="number" step="0.1" bind:value={form.serviceCase.creepLossPercent} /></div>
      </CardContent>
    </Card>
    {/if}

    {#if workflowStep === 'review'}
    <Card class="glass-card !border-0 !bg-transparent !shadow-none wizard-subcard">
      <CardHeader class="pb-2 pt-4">
        <CardTitle class="text-[10px] font-bold uppercase tracking-widest text-indigo-300">Guide-Derived Checks</CardTitle>
      </CardHeader>
      <CardContent class="space-y-2">
        <div class="rounded-lg border border-white/10 bg-black/20 p-2 text-xs text-white/65">
          Mapped to installation guidance (Bolt Council) plus multi-fastener distribution behavior (VT chapter).
        </div>
        {#each guideDerivedChecks as check}
          <div class={`rounded-lg border p-2 text-xs ${guideTone(check.status)}`}>
            <div class="flex items-center justify-between gap-2">
              <div class="font-semibold">{check.principle}</div>
              <Badge variant="outline" class="border-white/20 text-[10px]">{check.source}</Badge>
            </div>
            <div class="mt-1 text-white/80">{check.rationale}</div>
            <div class="mt-1 text-[10px] text-white/60">Mapped inputs: {check.mappedInputs.join(' • ')}</div>
            {#if check.action}
              <div class="mt-1 text-[10px] text-amber-100">Action: {check.action}</div>
            {/if}
          </div>
        {/each}
      </CardContent>
    </Card>

    <Card class="glass-card !border-0 !bg-transparent !shadow-none wizard-subcard" id={fieldId('adjacent-screening')}>
      <CardHeader class="pb-2 pt-4">
        <CardTitle class="text-[10px] font-bold uppercase tracking-widest text-indigo-300">Adjacent Fastener Screening</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <label class="flex items-center gap-2 text-sm text-white/75">
          <input type="checkbox" class="checkbox checkbox-sm border-white/20 bg-black/30" bind:checked={form.adjacentFastenerScreen.enabled} />
          Enable fastener-pattern load-transfer screening
        </label>
        {#if !showAdvancedInputs}
          <div class="rounded-lg border border-white/10 bg-black/15 p-3 text-xs text-white/60">
            Pattern-input controls are hidden to keep the main workflow simpler. Use <span class="text-cyan-200">Show Advanced</span> to edit rows, columns, eccentricity, and load cases.
          </div>
        {/if}
        {#if showAdvancedInputs}
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
              <Button size="sm" variant="secondary" onclick={addLoadCase}>Add Load Case</Button>
            </div>
            <div class="space-y-2">
              {#each form.adjacentFastenerScreen.loadCases as loadCase, index}
                <div class="rounded-lg border border-white/8 bg-white/[0.02] p-2">
                  <div class="mb-2 flex items-center justify-between gap-2">
                    <Input bind:value={loadCase.label} class="max-w-[220px]" />
                    <div class="flex items-center gap-1 rounded-lg border border-white/10 bg-black/20 p-1">
                      <Button size="sm" variant="ghost" class="min-w-12 px-2 text-[10px]" aria-label="Move load case up" onclick={() => moveLoadCase(index, -1)} disabled={index === 0}>Up</Button>
                      <Button size="sm" variant="ghost" class="min-w-12 px-2 text-[10px]" aria-label="Move load case down" onclick={() => moveLoadCase(index, 1)} disabled={index === form.adjacentFastenerScreen.loadCases.length - 1}>Down</Button>
                      <Button size="sm" variant="ghost" class="min-w-16 px-2 text-[10px]" aria-label="Duplicate load case" onclick={() => duplicateLoadCase(index)}>Duplicate</Button>
                      <Button size="sm" variant="ghost" class="min-w-14 px-2 text-[10px]" aria-label="Remove load case" onclick={() => removeLoadCase(index)} disabled={form.adjacentFastenerScreen.loadCases.length <= 1}>Remove</Button>
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
        {/if}
        {#if form.adjacentFastenerScreen.enabled}
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
              <svg role="img" viewBox={`0 0 320 ${envelopeChartHeight}`} class="h-auto w-full rounded-lg border border-white/8 bg-black/20 p-2" aria-label="Preload fastener-group case envelopes">
                <rect x="16" y="16" width="288" height={envelopeChartHeight - 32} rx="12" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.08)" />
                {#each fastenerCaseEnvelopeRows as row}
                  {@const y = 42 + row.index * 28}
                  <text x="26" y={y} fill={row.isGoverning ? 'rgba(253,230,138,0.92)' : 'rgba(255,255,255,0.78)'} font-size="10" font-weight={row.isGoverning ? '700' : '400'}>{row.label}</text>
                  <text x="26" y={y + 12} fill="rgba(255,255,255,0.48)" font-size="8">{row.criticalFastenerLabel}</text>
                  <rect x="108" y={y - 8} width="140" height="12" rx="6" fill="rgba(255,255,255,0.08)" />
                  <rect x="108" y={y - 8} width={Math.max(6, row.ratio * 140)} height="12" rx="6" fill={row.isGoverning ? '#fde68a' : '#22d3ee'} />
                  <text x="286" y={y + 1} text-anchor="end" fill="rgba(255,255,255,0.70)" font-size="9">{fmt(row.demand, 2)}</text>
                {/each}
                <text x="24" y={envelopeChartHeight - 22} fill="rgba(255,255,255,0.55)" font-size="10">Each bar shows the peak equivalent fastener demand in that load case. The highlighted bar is the governing case.</text>
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
              <svg role="img" viewBox="0 0 320 220" class="h-auto w-full rounded-lg border border-white/8 bg-black/20 p-2" aria-label="Preload bolt pattern map">
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
              <svg role="img" viewBox="0 0 320 320" class="h-auto w-full rounded-lg border border-white/8 bg-black/20 p-2" aria-label="Preload geometry influence matrix heatmap" data-preload-heatmap-svg="true">
                <rect x="40" y="24" width="248" height="248" rx="10" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.08)" />
                {#each fastenerGroupResult.geometryInfluenceMatrix as row, rowIndex}
                  {#each row as cell, columnIndex}
                    {@const size = 248 / Math.max(fastenerGroupResult.geometryInfluenceMatrix.length, 1)}
                    {@const x = 40 + columnIndex * size}
                    {@const y = 24 + rowIndex * size}
                    {@const normalized = heatmapDisplayRatio(rowIndex, columnIndex, cell)}
                    <rect
                      x={x}
                      y={y}
                      width={size}
                      height={size}
                      fill={`rgba(${Math.round(34 + 210 * normalized)}, ${Math.round(90 + 150 * (1 - Math.abs(normalized - 0.5) * 0.7))}, ${Math.round(240 - 180 * normalized)}, ${0.16 + normalized * 0.72})`}
                      stroke="rgba(255,255,255,0.06)"
                    />
                  {/each}
                {/each}
                {#each fastenerGroupResult.fasteners as fastener}
                  {@const size = 248 / Math.max(fastenerGroupResult.geometryInfluenceMatrix.length, 1)}
                  <text x={52 + fastener.index * size} y="16" fill="rgba(255,255,255,0.5)" font-size="9">F{fastener.index + 1}</text>
                  <text x="10" y={40 + fastener.index * size} fill="rgba(255,255,255,0.5)" font-size="9">F{fastener.index + 1}</text>
                {/each}
                <text x="40" y="296" fill="rgba(255,255,255,0.55)" font-size="10">Color is normalized across the current matrix. Dark = weakest coupling, hot = strongest coupling.</text>
              </svg>
            </div>
          {/if}
        {/if}
      </CardContent>
    </Card>
    {/if}
        </div>
        {/key}
      </CardContent>
    </Card>
  </div>

  <div class="flex flex-col gap-4 overflow-y-auto pb-24 pr-2 scrollbar-hide">
    {#if $safeModeStore && !loadFullWorkspace}
      <Card class="glass-card">
        <CardHeader class="pb-2 pt-4">
          <CardTitle class="text-[10px] font-bold uppercase tracking-widest text-amber-300">Safe Mode Deferred Panels</CardTitle>
        </CardHeader>
        <CardContent class="space-y-3">
          <div class="rounded-xl border border-amber-300/30 bg-amber-500/10 p-3 text-sm text-amber-100">
            Heavy review visualizations are deferred in Safe mode to keep startup reliable on slower systems.
          </div>
          <Button size="sm" variant="secondary" onclick={() => (loadFullWorkspace = true)}>
            Load Full Review Panels
          </Button>
        </CardContent>
      </Card>
    {:else}
    {#if workflowStep !== 'review'}
      <Card class="glass-card">
        <CardHeader class="pb-2 pt-4">
          <CardTitle class="text-[10px] font-bold uppercase tracking-widest text-emerald-300">Review Step</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/72">
            Complete the first three workflow stages, then switch to <span class="text-cyan-200">4. Review</span> to inspect the joint section, preload chart, spring analogy, and fastener-pattern outputs.
          </div>
          {#if output}
            <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div class="rounded-xl border border-white/10 bg-black/20 p-4">
                <div class="text-[10px] uppercase tracking-widest text-white/45">Installed preload</div>
                <div class="mt-2 text-lg font-semibold text-cyan-300">{fmt(output.installation.preload, 2)}</div>
              </div>
              <div class="rounded-xl border border-white/10 bg-black/20 p-4">
                <div class="text-[10px] uppercase tracking-widest text-white/45">Joint constant</div>
                <div class="mt-2 text-lg font-semibold text-cyan-300">{fmt(output.stiffness.jointConstant, 4)}</div>
              </div>
              <div class="rounded-xl border border-white/10 bg-black/20 p-4">
                <div class="text-[10px] uppercase tracking-widest text-white/45">Current status</div>
                <div class="mt-2 text-sm font-semibold {output.service?.separationState === 'post_separation' ? 'text-rose-300' : output.service?.separationState === 'incipient' ? 'text-amber-300' : 'text-emerald-300'}">
                  {output.service?.separationState === 'post_separation'
                    ? 'Post-separation'
                    : output.service?.separationState === 'incipient'
                      ? 'Incipient separation'
                      : 'Still clamped'}
                </div>
              </div>
            </div>
          {/if}
        </CardContent>
      </Card>
    {:else}
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
              Classical view: pressure cones originate where compression enters the clamped members (washer-member interfaces when washers are present).
            {:else}
              Equivalent annulus view: rows scale to the explicit equivalent annulus used by the stiffness model.
            {/if}
          </div>
        </div>
        {#if output}
          <svg role="img" bind:this={jointSectionSvg} viewBox="0 0 560 560" class="h-auto w-full rounded-xl border border-white/10 bg-black/20 p-2" aria-label="Preload joint section panel">
            <defs>
              <linearGradient id="joint-frustum-fill" x1="0" x2="1">
                <stop offset="0%" stop-color="rgba(14,165,233,0.18)" />
                <stop offset="50%" stop-color="rgba(34,211,238,0.34)" />
                <stop offset="100%" stop-color="rgba(14,165,233,0.18)" />
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
                  stroke="none"
                />
                <polyline points={topConeLeftBoundaryPoints} fill="none" stroke="rgba(34,211,238,0.52)" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" />
                <polyline points={topConeRightBoundaryPoints} fill="none" stroke="rgba(34,211,238,0.52)" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" />
              {/if}
              {#if bottomConeEnvelopePoints}
                <polygon
                  points={bottomConeEnvelopePoints}
                  fill="url(#joint-frustum-fill)"
                  stroke="none"
                />
                <polyline points={bottomConeLeftBoundaryPoints} fill="none" stroke="rgba(34,211,238,0.52)" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" />
                <polyline points={bottomConeRightBoundaryPoints} fill="none" stroke="rgba(34,211,238,0.52)" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" />
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
            <button type="button" class={localButtonClass('secondary', 'md')} onclick={exportJointSectionSvg} disabled={!output}>Export Joint Section SVG</button>
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
          <svg role="img" bind:this={summarySvg} viewBox="0 0 560 340" class="h-auto w-full rounded-xl border border-white/10 bg-black/20 p-2" data-preload-summary-svg="true" aria-label="Preload summary panel">
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
            <text x="366" y="102" fill="#fde68a" font-size="11">Combined uncertainty ±{fmt(output.installation.uncertainty.combinedPercent, 1)}%</text>
            <text x="366" y="122" fill="rgba(255,255,255,0.64)" font-size="11">Bolt rise = {fmt(output.service?.boltLoadIncrease, 2)}</text>
            <text x="366" y="139" fill="rgba(255,255,255,0.64)" font-size="11">Clamp loss = {fmt(output.service?.clampForceLoss, 2)}</text>
            <text x="366" y="156" fill="rgba(255,255,255,0.64)" font-size="11">Mech. loss = {fmt(output.service?.preloadLossBreakdown.mechanicalLossTotal, 2)}</text>
            <text x="366" y="173" fill="rgba(255,255,255,0.64)" font-size="11">Thermal shift = {fmt(output.service?.preloadLossBreakdown.thermalPreloadShift, 2)}</text>

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
          <button type="button" class={localButtonClass('primary', 'md')} onclick={exportSummarySvg} disabled={!output}>Export Summary SVG</button>
          <button type="button" class={localButtonClass('secondary', 'md')} onclick={exportPdfReport} disabled={!output}>Export PDF Equation Sheet</button>
          <button type="button" class={localButtonClass('secondary', 'md')} onclick={exportAuditCsv} disabled={!output}>Export Audit CSV</button>
          <button type="button" class={localButtonClass('secondary', 'md')} onclick={exportAuditJson} disabled={!output}>Export Audit JSON</button>
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
          <svg role="img" viewBox="0 0 560 250" class="h-auto w-full rounded-xl border border-white/10 bg-black/20 p-2" aria-label="Preload spring analogy panel">
            <text x="18" y="24" fill="rgba(255,255,255,0.82)" font-size="15" font-weight="700">Equivalent Springs</text>
            <text x="18" y="42" fill="rgba(255,255,255,0.55)" font-size="11">The bolt acts like one tensile spring. The clamped parts act like two mirrored compression spring branches reacting at the bearing faces.</text>
            <rect x="110" y="52" width="340" height="14" rx="7" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.10)" />
            <rect x="110" y="184" width="340" height="14" rx="7" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.10)" />
            <line x1="280" y1="56" x2="280" y2="194" stroke="rgba(255,255,255,0.08)" stroke-dasharray="4 4" />
            {#each [170, 390] as springX}
              <path
                d={`M ${springX} 68
                    C ${springX + 16} 76, ${springX - 16} 84, ${springX} 92
                    C ${springX + 16} 100, ${springX - 16} 108, ${springX} 116
                    C ${springX + 16} 124, ${springX - 16} 132, ${springX} 140
                    C ${springX + 16} 148, ${springX - 16} 156, ${springX} 164
                    C ${springX + 16} 172, ${springX - 16} 178, ${springX} 184`}
                fill="none"
                stroke="#34d399"
                stroke-width="2.8"
                stroke-linecap="round"
              />
            {/each}
            <path
              d="M 280 68
                 C 300 78, 260 88, 280 98
                 C 300 108, 260 118, 280 128
                 C 300 138, 260 148, 280 158
                 C 300 168, 260 176, 280 184"
              fill="none"
              stroke="#cbd5e1"
              stroke-width="3.4"
              stroke-linecap="round"
            />
            <line x1="170" y1="112" x2="250" y2="112" stroke="rgba(52,211,153,0.24)" stroke-width="2" />
            <line x1="310" y1="112" x2="390" y2="112" stroke="rgba(52,211,153,0.24)" stroke-width="2" />
            <polygon points="280,36 272,50 288,50" fill="#fde68a" />
            <polygon points="280,214 272,200 288,200" fill="#a7f3d0" />
            <text x="280" y="30" text-anchor="middle" fill="#fde68a" font-size="10">Preload stretches bolt</text>
            <text x="280" y="230" text-anchor="middle" fill="#a7f3d0" font-size="10">Members compress equally at the faces</text>
            <text x="170" y="206" text-anchor="middle" fill="rgba(52,211,153,0.82)" font-size="11">Member branch A</text>
            <text x="280" y="206" text-anchor="middle" fill="rgba(203,213,225,0.88)" font-size="11">Bolt spring</text>
            <text x="390" y="206" text-anchor="middle" fill="rgba(52,211,153,0.82)" font-size="11">Member branch B</text>
            <text x="18" y="244" fill="rgba(255,255,255,0.60)" font-size="10">k_b = {fmt(output.stiffness.bolt.stiffness, 2)} • k_m = {fmt(output.stiffness.members.stiffness, 2)} • C = {fmt(output.stiffness.jointConstant, 4)}</text>
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

    <Card class="glass-card" id={fieldId('review-main')}>
      <CardHeader class="pb-2 pt-4">
        <CardTitle class="text-[10px] font-bold uppercase tracking-widest text-emerald-300">Computed State</CardTitle>
      </CardHeader>
      <CardContent class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div class="rounded-xl border border-white/10 bg-black/20 p-4">
          <div class="text-[10px] uppercase tracking-widest text-white/45">Installation</div>
          {#if output}
            <div class="mt-3 text-sm text-white/85">Preload: <span class="font-mono text-cyan-300">{fmt(output.installation.preload)}</span></div>
            <div class="mt-1 text-sm text-white/70">Uncertainty Range: {fmt(output.installation.preloadMin)} → {fmt(output.installation.preloadMax)}</div>
            <div class="mt-1 text-sm text-white/70">Model: {output.installation.model}</div>
            <div class="mt-1 text-sm text-white/70">Combined RSS %: {fmt(output.installation.uncertainty.combinedPercent, 2)}</div>
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
            <div class="mt-1 text-sm text-white/70">{output.modelBasis.compressionModelSummary}</div>
          {/if}
        </div>

        <div class="rounded-xl border border-white/10 bg-black/20 p-4">
          <div class="text-[10px] uppercase tracking-widest text-white/45">Preload Loss Breakdown</div>
          {#if output?.service}
            <div class="mt-3 text-sm text-white/85">Embedment: <span class="font-mono text-cyan-300">{fmt(output.service.preloadLossBreakdown.embedmentLoss)}</span></div>
            <div class="mt-1 text-sm text-white/85">Coating crush: <span class="font-mono text-cyan-300">{fmt(output.service.preloadLossBreakdown.coatingCrushLoss)}</span></div>
            <div class="mt-1 text-sm text-white/85">Washer seating: <span class="font-mono text-cyan-300">{fmt(output.service.preloadLossBreakdown.washerSeatingLoss)}</span></div>
            <div class="mt-1 text-sm text-white/70">Relaxation: {fmt(output.service.preloadLossBreakdown.relaxationLoss)}</div>
            <div class="mt-1 text-sm text-white/70">Creep: {fmt(output.service.preloadLossBreakdown.creepLoss)}</div>
            <div class="mt-1 text-sm text-white/70">Thermal shift: {fmt(output.service.preloadLossBreakdown.thermalPreloadShift)}</div>
          {/if}
        </div>

        <div class="rounded-xl border border-white/10 bg-black/20 p-4">
          <div class="text-[10px] uppercase tracking-widest text-white/45">Model Basis</div>
          {#if output}
            <div class="mt-3 text-sm text-white/85">{output.modelBasis.compressionModelSummary}</div>
            <div class="mt-1 text-sm text-white/70">{output.modelBasis.uncertaintySummary}</div>
            <div class="mt-1 text-sm text-white/70">{output.modelBasis.preloadLossSummary}</div>
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
    {/if}
    {/if}
  </div>
</div>
