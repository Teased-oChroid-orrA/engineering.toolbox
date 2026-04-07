<script lang="ts">
  import { onMount } from 'svelte';
  import type { BushingInputs, BushingOutput } from '$lib/core/bushing';
  import { BUSHING_SCENE_MODULE_SENTINEL } from '$lib/drafting/bushing/bushingSceneModel';
  import { evaluateBushingPipeline, getBushingPipelineCacheStats } from './BushingComputeController';
  import BushingLeftLaneCards from './BushingLeftLaneCards.svelte';
  import BushingDraggableCard from './BushingDraggableCard.svelte';
  import BushingDraftingPanel from './BushingDraftingPanel.svelte';
  import BushingResultSummary from './BushingResultSummary.svelte';
  import BushingDiagnosticsPanel from './BushingDiagnosticsPanel.svelte';
  import BushingReamerPickerModal from './BushingReamerPickerModal.svelte';
  import BushingInformationPage from './BushingInformationPage.svelte';
  import { mountBushingContextMenu, updateBushingContextMenu } from './BushingContextMenuController';
  import { exportBushingJson, exportBushingPdf, exportBushingSvg } from './BushingExportController';
  import { buildBushingTraceRecord, emitBushingTrace } from './BushingTraceLogger';
  import { runBushingVisualDiagnostics } from './BushingVisualDiagnostics';
  import { LEFT_DEFAULT_ORDER, RIGHT_DEFAULT_ORDER, normalizeOrder, type LeftCardId, type RightCardId } from './BushingCardLayoutController';
  import {
    loadTopLevelLayout,
    persistTopLevelLayout,
    loadBushingUiState,
    persistBushingUiState,
    loadBushingRuntimeState,
    persistBushingRuntimeState,
    loadBushingEngineeringState,
    persistBushingEngineeringState,
    type BushingScenarioPreset,
    type BushingRepairStrategyId,
    type BushingUxMode,
    type BushingWorkflowMode
  } from './BushingLayoutPersistence';
  import { safeGetItem, safeSetItem, safeParseJSON } from './BushingStorageHelper';
  import {
    AIRCRAFT_REAMER_CATALOG,
    applyReamerEntryToBushingId,
    applyReamerEntryToBushingInputs,
    removeCustomReamerEntryFromCsv,
    parseReamerCatalogCsv,
    upsertCustomReamerCatalogCsv,
    type ReamerCatalogEntry
  } from '$lib/core/bushing/reamerCatalog';
  import { MATERIALS } from '$lib/core/bushing/materials';
  import { bushingLogger, bushingExportLogger } from '$lib/utils/loggers';

  const KEY = 'scd.bushing.inputs.v16';
  const LEGACY_RENDERER_KEY = 'scd.bushing.legacyRenderer';
  const TRACE_MODE_KEY = 'scd.bushing.traceEnabled';
  
  // Svelte 5: Convert local state to $state runes
  let leftCardOrder = $state<LeftCardId[]>([...LEFT_DEFAULT_ORDER]);
  let rightCardOrder = $state<RightCardId[]>([...RIGHT_DEFAULT_ORDER]);
  let uxMode = $state<BushingUxMode>('guided');
  let workflowMode = $state<BushingWorkflowMode>('quick');
  let leftMoveProps = $derived.by(() => (_cardId: LeftCardId) => ({
    dragEnabled: false,
    canMoveUp: false,
    canMoveDown: false,
    onMoveUp: () => {},
    onMoveDown: () => {}
  }));
  let rightMoveProps = $derived.by(() => (_cardId: RightCardId) => ({
    dragEnabled: false,
    canMoveUp: false,
    canMoveDown: false,
    onMoveUp: () => {},
    onMoveDown: () => {}
  }));
  
  // Svelte 5: Convert form to $state
  let form = $state<BushingInputs>({
    units: 'imperial', boreDia: 0.5, interference: 0.0015, boreTolMode: 'nominal_tol',
    boreNominal: 0.5, boreTolPlus: 0, boreTolMinus: 0, boreLower: 0.5, boreUpper: 0.5,
    interferenceTolMode: 'nominal_tol', interferenceNominal: 0.0015, interferenceTolPlus: 0,
    interferenceTolMinus: 0, interferenceLower: 0.0015, interferenceUpper: 0.0015,
    interferencePolicy: { enabled: false, lockBore: true, preserveBoreNominal: true, allowBoreNominalShift: false },
    boreCapability: { mode: 'unspecified' }, enforceInterferenceTolerance: false, lockBoreForInterference: true,
    housingLen: 0.5, housingWidth: 1.5, edgeDist: 0.75, bushingType: 'straight',
    flangeOd: 0.75, flangeThk: 0.063, idType: 'straight', idBushing: 0.375,
    csMode: 'depth_angle', csDia: 0.5, csDepth: 0.125, csDepthTolPlus: 0, csDepthTolMinus: 0, csAngle: 100,
    extCsMode: 'depth_angle', extCsDia: 0.625, extCsDepth: 0.125, extCsDepthTolPlus: 0, extCsDepthTolMinus: 0, extCsAngle: 100,
    matHousing: MATERIALS[0].id, matBushing: 'bronze', friction: 0.15, dT: 0, assemblyHousingTemperature: undefined, assemblyBushingTemperature: undefined,
    processRouteId: 'press_fit_only', standardsBasis: 'shop_default', standardsRevision: 'current',
    processSpec: '', approvalNotes: '', criticality: 'general',
    minWallStraight: 0.05, minWallNeck: 0.04, endConstraint: 'free',
    load: 1000, edgeLoadAngleDeg: 40, serviceTemperatureHot: 75, serviceTemperatureCold: -65,
    finishReamAllowance: 0, wearAllowance: 0, loadSpectrum: 'oscillating',
    oscillationAngleDeg: 20, oscillationFreqHz: 0.5, dutyCyclePct: 60, lubricationMode: 'dry',
    contaminationLevel: 'shop', surfaceRoughnessRaUm: 0.8, shaftHardnessHrc: 38, misalignmentDeg: 0.05,
    measuredPart: { enabled: false, basis: 'nominal', bore: {}, id: {} }
  });

  // Svelte 5: Convert remaining state variables to $state
  let initError = $state<string | null>(null);
  let useLegacyRenderer = $state(false);
  let renderMode = $state<'section' | 'legacy'>('section');
  let traceEnabled = $state(false);
  let renderInitNotice = $state<string | null>(null);
  let renderDiagnostics = $state<any[]>([]);
  let showInformationView = $state(false);
  let initialized = $state(false);
  let scenarioDraftName = $state('');
  let scenarioPresets = $state<BushingScenarioPreset[]>([]);
  let activeComparePresetIds = $state<string[]>([]);
  let repairCompareEnabled = $state(false);
  let activeRepairStrategies = $state<BushingRepairStrategyId[]>(['light_cleanup_ream', 'finish_ream_after_install', 'oversize_repair', 'thermal_assist']);
  let cleanupDelta = $state(0.0005);
  let oversizeStep = $state(0.015625);
  let customReamerCsv = $state<string | null>(null);
  let customReamerEntries = $state<ReamerCatalogEntry[]>([]);
  let selectedReamerEntryId = $state<string | null>(null);
  let selectedIdReamerEntryId = $state<string | null>(null);
  let reamerPickerTarget = $state<'bore' | 'id' | null>(null);
  let previousLiveSnapshot = $state<{ key: string; label: string; results: BushingOutput } | null>(null);
  let currentLiveSnapshot = $state<{ key: string; label: string; results: BushingOutput } | null>(null);

  const cloneForm = (input: BushingInputs): BushingInputs => JSON.parse(JSON.stringify(input));
  const newScenarioId = () =>
    `${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`;
  const stableStringify = (value: unknown): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'number' || typeof value === 'boolean') return JSON.stringify(value);
    if (typeof value === 'string') return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map((v) => stableStringify(v)).join(',')}]`;
    if (typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
      return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
    }
    return JSON.stringify(String(value));
  };
  
  // Svelte 5: Use $effect for initialization to ensure proper reactivity
  $effect(() => {
    if (!initialized && typeof window !== 'undefined') {
      try {
        form = { ...form, ...safeParseJSON(safeGetItem(KEY), {}) };
        ({ leftCardOrder, rightCardOrder } = loadTopLevelLayout());
        const runtimeState = loadBushingRuntimeState();
        useLegacyRenderer = runtimeState.useLegacyRenderer;
        renderMode = useLegacyRenderer ? 'legacy' : 'section';
        traceEnabled = runtimeState.traceEnabled;
        const uiState = loadBushingUiState();
        uxMode = uiState.uxMode;
        workflowMode = uiState.workflowMode;
        const engineeringState = loadBushingEngineeringState();
        scenarioPresets = engineeringState.scenarioPresets ?? [];
        activeComparePresetIds = engineeringState.activeComparePresetIds ?? [];
        repairCompareEnabled = engineeringState.repairCompareEnabled ?? false;
        activeRepairStrategies = engineeringState.activeRepairStrategies ?? activeRepairStrategies;
        cleanupDelta = engineeringState.cleanupDelta ?? cleanupDelta;
        oversizeStep = engineeringState.oversizeStep ?? oversizeStep;
        customReamerCsv = engineeringState.customReamerCsv ?? null;
        customReamerEntries = customReamerCsv ? parseReamerCatalogCsv(customReamerCsv, 'custom') : [];
        selectedReamerEntryId = engineeringState.selectedReamerEntryId ?? null;
        selectedIdReamerEntryId = engineeringState.selectedIdReamerEntryId ?? null;
        initialized = true;
      } catch (e) {
        bushingLogger.error('Init error', e);
        initError = `Init error: ${e instanceof Error ? e.message : String(e)}`;
        initialized = true;
      }
    }
  });
  
  // Svelte 5: Convert reactive statement to $effect for policy synchronization
  $effect(() => {
    const p = form.interferencePolicy || (form.interferencePolicy = { enabled: Boolean(form.enforceInterferenceTolerance), lockBore: Boolean(form.lockBoreForInterference), preserveBoreNominal: true, allowBoreNominalShift: false });
    if (!form.boreCapability) form.boreCapability = { mode: 'unspecified' };
    if (form.boreCapability.mode === 'reamer_fixed') p.lockBore = true;
    if (p.lockBore && p.allowBoreNominalShift) p.allowBoreNominalShift = false;
    if (p.preserveBoreNominal && p.allowBoreNominalShift) p.allowBoreNominalShift = false;
    if (!p.allowBoreNominalShift) p.maxBoreNominalShift = undefined;
    else if (!Number.isFinite(p.maxBoreNominalShift as number)) p.maxBoreNominalShift = 0.0002;
    const policyEnabled = Boolean(p.enabled), policyLock = Boolean(p.lockBore);
    if (form.enforceInterferenceTolerance !== policyEnabled) form.enforceInterferenceTolerance = policyEnabled;
    if (form.lockBoreForInterference !== policyLock) form.lockBoreForInterference = policyLock;
    if (p.enabled !== form.enforceInterferenceTolerance) p.enabled = Boolean(form.enforceInterferenceTolerance);
    if (p.lockBore !== form.lockBoreForInterference) p.lockBore = Boolean(form.lockBoreForInterference);
  });
  
  // Svelte 5: Convert reactive statements to $effect for side effects
  $effect(() => {
    safeSetItem(KEY, JSON.stringify(form));
  });
  
  $effect(() => {
    if (typeof window !== 'undefined') { 
      try { 
        persistTopLevelLayout(leftCardOrder, rightCardOrder); 
      } catch (e) { 
        bushingLogger.error('Failed to save layout', e); 
      } 
    }
  });

  $effect(() => {
    if (!initialized || typeof window === 'undefined') return;
    persistBushingUiState({ uxMode, workflowMode, useFreePositioning: false });
  });

  $effect(() => {
    if (!initialized || typeof window === 'undefined') return;
    persistBushingRuntimeState({ useLegacyRenderer, traceEnabled });
  });

  $effect(() => {
    if (!initialized || typeof window === 'undefined') return;
    persistBushingEngineeringState({
      scenarioPresets,
      activeComparePresetIds,
      repairCompareEnabled,
      activeRepairStrategies,
      cleanupDelta,
      oversizeStep,
      customReamerCsv,
      selectedReamerEntryId,
      selectedIdReamerEntryId
    });
  });

  // Svelte 5: Convert reactive statements to $derived for computed values
  let pipeline = $derived(evaluateBushingPipeline(form));
  let results = $derived(pipeline.results);
  let draftingView = $derived(pipeline.draftingView);
  let scene = $derived(pipeline.scene);
  let cacheStats = $derived(getBushingPipelineCacheStats());
  let visualDiagnostics = $derived(runBushingVisualDiagnostics(scene, results));
  let isFailed = $derived(results.governing.margin < 0 || results.physics.marginHousing < 0 || results.physics.marginBushing < 0);
  let reamerCatalogEntries = $derived([...AIRCRAFT_REAMER_CATALOG, ...customReamerEntries]);
  let selectedReamerEntry = $derived(
    reamerCatalogEntries.find((entry) => entry.id === selectedReamerEntryId) ?? null
  );
  let selectedIdReamerEntry = $derived(
    reamerCatalogEntries.find((entry) => entry.id === selectedIdReamerEntryId) ?? null
  );
  let compareCases = $derived.by(() =>
    activeComparePresetIds
      .map((id) => scenarioPresets.find((preset) => preset.id === id))
      .filter((preset): preset is BushingScenarioPreset => Boolean(preset))
      .slice(0, 4)
      .map((preset) => {
        const comparePipeline = evaluateBushingPipeline(cloneForm(preset.form));
        return {
          id: preset.id,
          name: preset.name,
          results: comparePipeline.results,
          deltaMargin: comparePipeline.results.governing.margin - results.governing.margin,
          deltaInstallForce:
            (form.units === 'metric'
              ? comparePipeline.results.physics.installForce * 4.4482216152605
              : comparePipeline.results.physics.installForce) -
            (form.units === 'metric' ? results.physics.installForce * 4.4482216152605 : results.physics.installForce),
          deltaContactPressure:
            (form.units === 'metric'
              ? comparePipeline.results.physics.contactPressure * 0.006894757
              : comparePipeline.results.physics.contactPressure / 1000) -
            (form.units === 'metric'
              ? results.physics.contactPressure * 0.006894757
              : results.physics.contactPressure / 1000)
        };
      })
  );
  let repairCompareCases = $derived.by(() => {
    if (!repairCompareEnabled) return [];
    const strategies = Array.from(new Set(activeRepairStrategies)).slice(0, 4);
    return strategies.map((strategy) => {
      const next = cloneForm(form);
      if (strategy === 'light_cleanup_ream') {
        const cleanup = Math.max(0, cleanupDelta);
        if (next.boreTolMode === 'limits') {
          next.boreLower = (next.boreLower ?? next.boreDia) + cleanup;
          next.boreUpper = (next.boreUpper ?? next.boreDia) + cleanup;
        } else {
          next.boreNominal = (next.boreNominal ?? next.boreDia) + cleanup;
        }
        next.processRouteId = 'line_ream_repair';
      } else if (strategy === 'finish_ream_after_install') {
        next.processRouteId = 'press_fit_finish_ream';
        next.finishReamAllowance = Math.max(next.finishReamAllowance ?? 0, Math.max(0, cleanupDelta) * 0.5);
      } else if (strategy === 'oversize_repair') {
        const oversize = Math.max(0, oversizeStep);
        if (next.boreTolMode === 'limits') {
          next.boreLower = (next.boreLower ?? next.boreDia) + oversize;
          next.boreUpper = (next.boreUpper ?? next.boreDia) + oversize;
        } else {
          next.boreNominal = (next.boreNominal ?? next.boreDia) + oversize;
        }
        next.processRouteId = 'line_ream_repair';
        next.criticality = 'repair';
      } else if (strategy === 'thermal_assist') {
        next.processRouteId = 'thermal_assist_install';
        if (!Number.isFinite(Number(next.assemblyHousingTemperature))) {
          next.assemblyHousingTemperature = next.units === 'metric' ? 50 : 140;
        }
        if (!Number.isFinite(Number(next.assemblyBushingTemperature))) {
          next.assemblyBushingTemperature = next.units === 'metric' ? -20 : 0;
        }
      }
      const comparePipeline = evaluateBushingPipeline(next);
      return {
        id: `strategy:${strategy}`,
        name:
          strategy === 'light_cleanup_ream'
            ? 'Light Cleanup Ream'
            : strategy === 'finish_ream_after_install'
              ? 'Finish Ream After Install'
              : strategy === 'oversize_repair'
                ? 'Oversize Repair'
                : 'Thermal Assist',
        results: comparePipeline.results,
        deltaMargin: comparePipeline.results.governing.margin - results.governing.margin,
        deltaInstallForce:
          (form.units === 'metric'
            ? comparePipeline.results.physics.installForce * 4.4482216152605
            : comparePipeline.results.physics.installForce) -
          (form.units === 'metric' ? results.physics.installForce * 4.4482216152605 : results.physics.installForce),
        deltaContactPressure:
          (form.units === 'metric'
            ? comparePipeline.results.physics.contactPressure * 0.006894757
            : comparePipeline.results.physics.contactPressure / 1000) -
          (form.units === 'metric'
            ? results.physics.contactPressure * 0.006894757
            : results.physics.contactPressure / 1000)
      };
    });
  });
  let allCompareCases = $derived([...repairCompareCases, ...compareCases]);

  $effect(() => {
    const key = stableStringify(pipeline.normalized);
    const next = { key, label: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), results };
    if (!currentLiveSnapshot) {
      currentLiveSnapshot = next;
      return;
    }
    if (currentLiveSnapshot.key === key) return;
    previousLiveSnapshot = currentLiveSnapshot;
    currentLiveSnapshot = next;
  });
  
  $effect(() => {
    updateBushingContextMenu(useLegacyRenderer, traceEnabled);
  });
  
  $effect(() => {
    if (typeof window !== 'undefined' && traceEnabled) {
      emitBushingTrace(buildBushingTraceRecord({ rawInput: form, solved: results, scene, source: 'BushingOrchestrator' }));
    }
  });
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    const runtimeSentinel = (globalThis as any).__SCD_BUSHING_SCENE_SENTINEL__;
    if (runtimeSentinel !== BUSHING_SCENE_MODULE_SENTINEL) bushingLogger.error('Path integrity check failed', { expected: BUSHING_SCENE_MODULE_SENTINEL, actual: runtimeSentinel });
  }

  function toggleRendererMode() { useLegacyRenderer = !useLegacyRenderer; renderMode = useLegacyRenderer ? 'legacy' : 'section'; safeSetItem(LEGACY_RENDERER_KEY, useLegacyRenderer ? '1' : '0'); }
  function toggleTraceMode() { traceEnabled = !traceEnabled; safeSetItem(TRACE_MODE_KEY, traceEnabled ? '1' : '0'); }
  async function onExportSvg() {
    await exportBushingSvg({
      form,
      results,
      draftingView,
      selectedReamer: selectedReamerEntry,
      selectedIdReamer: selectedIdReamerEntry,
      compareCases
    });
  }
  async function onExportPdf() {
    try {
      await exportBushingPdf({
        form,
        results,
        draftingView,
        selectedReamer: selectedReamerEntry,
        selectedIdReamer: selectedIdReamerEntry,
        compareCases
      });
    } catch (err) { bushingExportLogger.warn('PDF export failed', err); }
  }

  async function onExportJson() {
    try {
      await exportBushingJson({
        form,
        results,
        draftingView,
        selectedReamer: selectedReamerEntry,
        selectedIdReamer: selectedIdReamerEntry,
        compareCases
      });
    } catch (err) {
      bushingExportLogger.warn('JSON export failed', err);
    }
  }

  async function handleImportReamerCsv(file: File) {
    const text = await file.text();
    const parsed = parseReamerCatalogCsv(text, 'custom');
    if (!parsed.length) {
      bushingLogger.warn('No valid reamer entries found in imported CSV');
      return;
    }
    customReamerCsv = text;
    customReamerEntries = parsed;
  }

  function openReamerPicker(target: 'bore' | 'id') {
    reamerPickerTarget = target;
  }

  function closeReamerPicker() {
    reamerPickerTarget = null;
  }

  function applyCatalogReamerEntry(target: 'bore' | 'id', entry: ReamerCatalogEntry) {
    if (target === 'bore') {
      selectedReamerEntryId = entry.id;
      form = applyReamerEntryToBushingInputs(form, entry);
      return;
    }
    selectedIdReamerEntryId = entry.id;
    form = applyReamerEntryToBushingId(form, entry);
  }

  function applyCustomReamerEntry(target: 'bore' | 'id', entry: ReamerCatalogEntry) {
    const persisted = upsertCustomReamerCatalogCsv(customReamerCsv, entry);
    customReamerCsv = persisted.csvText;
    customReamerEntries = persisted.entries;
    applyCatalogReamerEntry(target, persisted.appliedEntry);
  }

  function clearReamerEntry() {
    selectedReamerEntryId = null;
  }

  function clearIdReamerEntry() {
    selectedIdReamerEntryId = null;
  }

  function handlePickerCatalogSelect(entry: ReamerCatalogEntry) {
    if (!reamerPickerTarget) return;
    applyCatalogReamerEntry(reamerPickerTarget, entry);
  }

  function handlePickerCustomSelect(entry: ReamerCatalogEntry) {
    if (!reamerPickerTarget) return;
    applyCustomReamerEntry(reamerPickerTarget, entry);
  }

  function deleteCustomCatalogEntry(entryId: string) {
    const next = removeCustomReamerEntryFromCsv(customReamerCsv, entryId);
    customReamerCsv = next.csvText;
    customReamerEntries = next.entries;
    if (selectedReamerEntryId === entryId) selectedReamerEntryId = null;
    if (selectedIdReamerEntryId === entryId) selectedIdReamerEntryId = null;
  }

  function saveScenarioPreset() {
    const name = scenarioDraftName.trim() || `Scenario ${scenarioPresets.length + 1}`;
    const nextPreset: BushingScenarioPreset = {
      id: newScenarioId(),
      name,
      createdAt: Date.now(),
      form: cloneForm(form)
    };
    scenarioPresets = [nextPreset, ...scenarioPresets].slice(0, 12);
    scenarioDraftName = '';
  }

  function loadScenarioPreset(id: string) {
    const preset = scenarioPresets.find((entry) => entry.id === id);
    if (!preset) return;
    form = cloneForm(preset.form);
  }

  function toggleCompareScenario(id: string) {
    if (activeComparePresetIds.includes(id)) {
      activeComparePresetIds = activeComparePresetIds.filter((entry) => entry !== id);
      return;
    }
    activeComparePresetIds = [...activeComparePresetIds.slice(-3), id];
  }

  function deleteScenarioPreset(id: string) {
    scenarioPresets = scenarioPresets.filter((entry) => entry.id !== id);
    activeComparePresetIds = activeComparePresetIds.filter((entry) => entry !== id);
  }
  function toggleRepairStrategy(id: BushingRepairStrategyId) {
    if (activeRepairStrategies.includes(id)) {
      activeRepairStrategies = activeRepairStrategies.filter((entry) => entry !== id);
      return;
    }
    activeRepairStrategies = [...activeRepairStrategies, id];
  }
  
  function handleRenderInitFailure(reason: string) {
    renderInitNotice = reason || 'Renderer initialization failed.';
    if (typeof window !== 'undefined') {
      const payload = { at: new Date().toISOString(), reason: renderInitNotice };
      try {
        const prior = Number(safeGetItem('scd.bushing.renderInitFailCount') ?? '0');
        safeSetItem('scd.bushing.renderInitFailCount', String(prior + 1));
        safeSetItem('scd.bushing.renderInitLast', JSON.stringify(payload));
      } catch {}
      bushingLogger.warn('Render init failed', payload);
    }
  }

  onMount(() => {
    bushingLogger.debug('Mounted', { initError, units: form.units, cards: leftCardOrder.length + rightCardOrder.length });
    mountBushingContextMenu({ onExportSvg: () => { void onExportSvg(); }, onExportPdf: () => { void onExportPdf(); }, toggleRendererMode, toggleTraceMode });
    if (typeof window !== 'undefined') {
    }
  });

</script>

{#if initError}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
    <div class="max-w-md rounded-lg bg-red-900/90 p-6 text-white shadow-xl">
      <h2 class="mb-4 text-xl font-bold">Initialization Error</h2>
      <p class="mb-2">{initError}</p>
      <p class="mb-2 text-sm text-red-200">Try restarting the app or clearing data.</p>
      <button type="button" class="mt-2 rounded bg-red-700 px-4 py-2 hover:bg-red-600"
        onclick={() => { if (typeof window !== 'undefined') { try { localStorage.clear(); window.location.reload(); } catch {} } }}>
        Clear Data & Reload
      </button>
    </div>
  </div>
{:else if showInformationView}
  <BushingInformationPage {form} {results} onBack={() => (showInformationView = false)} />
{:else}
  <!-- Lane-based layout (legacy) -->
<div class="grid grid-cols-1 gap-4 p-1 pt-4 lg:grid-cols-[450px_1fr]" data-route-ready="bushing">
  <div class="flex flex-col gap-4 pb-8 pr-2">
      {#each leftCardOrder as item}
        <BushingLeftLaneCards 
          itemId={item}
          bind:form
          {results}
          normalized={pipeline.normalized}
          {isFailed}
          dndEnabled={false}
          canUndo={false}
          canRedo={false}
          onUndo={() => {}}
          onRedo={() => {}}
          onShowInformation={() => (showInformationView = true)}
          {uxMode}
          onSetUxMode={(mode) => (uxMode = mode)}
          {workflowMode}
          onSetWorkflowMode={(mode) => (workflowMode = mode)}
          moveProps={leftMoveProps(item as LeftCardId)}
          {reamerCatalogEntries}
          {selectedReamerEntry}
          {selectedIdReamerEntry}
          hasCustomReamerCatalog={customReamerEntries.length > 0}
          onOpenReamerPicker={openReamerPicker}
          onClearReamerEntry={clearReamerEntry}
          onClearIdReamerEntry={clearIdReamerEntry}
          onImportReamerCsv={handleImportReamerCsv}
          {scenarioDraftName}
          {scenarioPresets}
          {activeComparePresetIds}
          {repairCompareEnabled}
          {activeRepairStrategies}
          {cleanupDelta}
          {oversizeStep}
          onSetScenarioDraftName={(value) => (scenarioDraftName = value)}
          onSaveScenarioPreset={saveScenarioPreset}
          onLoadScenarioPreset={loadScenarioPreset}
          onToggleCompareScenario={toggleCompareScenario}
          onDeleteScenarioPreset={deleteScenarioPreset}
          onSetRepairCompareEnabled={(value) => (repairCompareEnabled = value)}
          onToggleRepairStrategy={toggleRepairStrategy}
          onSetCleanupDelta={(value) => (cleanupDelta = value)}
          onSetOversizeStep={(value) => (oversizeStep = value)}
        />
      {/each}
  </div>

  <div class="flex flex-col gap-4 pb-8 pr-1">
      {#each rightCardOrder as item}
        {#if item === 'drafting'}
          <BushingDraggableCard column="right" cardId="drafting" title="Drafting View" {...rightMoveProps('drafting' as RightCardId)}>
            {#snippet children()}
              <BushingDraftingPanel
                {draftingView}
                {useLegacyRenderer}
                {renderMode}
                {traceEnabled}
                advancedMode={uxMode === 'advanced'}
                cacheHits={cacheStats.hits}
                cacheMisses={cacheStats.misses}
                isInfinitePlate={Boolean(results.geometry?.isSaturationActive)}
                {renderInitNotice}
                {visualDiagnostics}
                {renderDiagnostics}
                onExportSvg={onExportSvg}
                onExportPdf={onExportPdf}
                onExportJson={onExportJson}
                onToggleRendererMode={toggleRendererMode}
                onToggleTraceMode={toggleTraceMode}
                onRenderDiagnostics={(diag) => { renderDiagnostics = diag; }}
                onRenderInitFailure={handleRenderInitFailure}
              />
            {/snippet}
          </BushingDraggableCard>
        {:else if item === 'summary'}
          <BushingDraggableCard column="right" cardId="summary" title="Results Panel" {...rightMoveProps('summary' as RightCardId)}>
            {#snippet children()}
              <BushingResultSummary
                {form}
                {results}
                guidedMode={uxMode === 'guided'}
                compareCases={allCompareCases}
                selectedReamer={selectedReamerEntry}
                selectedIdReamer={selectedIdReamerEntry}
                {workflowMode}
                previousSnapshot={previousLiveSnapshot}
              />
            {/snippet}
          </BushingDraggableCard>
        {:else if item === 'diagnostics'}
          {#if workflowMode === 'review'}
            <BushingDraggableCard column="right" cardId="diagnostics" title="Diagnostics" {...rightMoveProps('diagnostics' as RightCardId)}>
              {#snippet children()}
                <BushingDiagnosticsPanel bind:form {results} dndEnabled={false} {uxMode} />
              {/snippet}
            </BushingDraggableCard>
          {/if}
        {/if}
      {/each}
  </div>
</div>
<BushingReamerPickerModal
  open={reamerPickerTarget !== null}
  target={reamerPickerTarget ?? 'bore'}
  units={form.units}
  entries={reamerCatalogEntries}
  activeEntry={reamerPickerTarget === 'id' ? selectedIdReamerEntry : selectedReamerEntry}
  hasCustomCatalog={customReamerEntries.length > 0}
  onClose={closeReamerPicker}
  onSelectEntry={handlePickerCatalogSelect}
  onApplyCustom={handlePickerCustomSelect}
  onDeleteEntry={deleteCustomCatalogEntry}
/>
{/if}
