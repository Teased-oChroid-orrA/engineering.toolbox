<script lang="ts">
  import { onMount } from 'svelte';
  import type { BushingInputs } from '$lib/core/bushing';
  import { BUSHING_SCENE_MODULE_SENTINEL } from '$lib/drafting/bushing/bushingSceneModel';
  import { evaluateBushingPipeline, getBushingPipelineCacheStats } from './BushingComputeController';
  import BushingLeftLaneCards from './BushingLeftLaneCards.svelte';
  import BushingDraggableCard from './BushingDraggableCard.svelte';
  import BushingDraftingPanel from './BushingDraftingPanel.svelte';
  import BushingResultSummary from './BushingResultSummary.svelte';
  import BushingDiagnosticsPanel from './BushingDiagnosticsPanel.svelte';
  import { mountBushingContextMenu, updateBushingContextMenu } from './BushingContextMenuController';
  import { exportBushingPdf, exportBushingSvg } from './BushingExportController';
  import { buildBushingTraceRecord, emitBushingTrace } from './BushingTraceLogger';
  import { runBushingVisualDiagnostics } from './BushingVisualDiagnostics';
  import { LEFT_DEFAULT_ORDER, RIGHT_DEFAULT_ORDER, normalizeOrder, type LeftCardId, type RightCardId } from './BushingCardLayoutController';
  import { loadTopLevelLayout, persistTopLevelLayout, loadBushingUiState, persistBushingUiState, loadBushingRuntimeState, persistBushingRuntimeState, type BushingUxMode } from './BushingLayoutPersistence';
  import { safeGetItem, safeSetItem, safeParseJSON } from './BushingStorageHelper';
  import { MATERIALS } from '$lib/core/bushing/materials';
  import { bushingLogger, bushingExportLogger } from '$lib/utils/loggers';

  const KEY = 'scd.bushing.inputs.v15';
  const LEGACY_RENDERER_KEY = 'scd.bushing.legacyRenderer';
  const TRACE_MODE_KEY = 'scd.bushing.traceEnabled';
  
  // Svelte 5: Convert local state to $state runes
  let leftCardOrder = $state<LeftCardId[]>([...LEFT_DEFAULT_ORDER]);
  let rightCardOrder = $state<RightCardId[]>([...RIGHT_DEFAULT_ORDER]);
  let uxMode = $state<BushingUxMode>('guided');
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
    matHousing: MATERIALS[0].id, matBushing: 'bronze', friction: 0.15, dT: 0,
    minWallStraight: 0.05, minWallNeck: 0.04, endConstraint: 'free'
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
    persistBushingUiState({ uxMode, useFreePositioning: false });
  });

  $effect(() => {
    if (!initialized || typeof window === 'undefined') return;
    persistBushingRuntimeState({ useLegacyRenderer, traceEnabled });
  });

  // Svelte 5: Convert reactive statements to $derived for computed values
  let pipeline = $derived(evaluateBushingPipeline(form));
  let results = $derived(pipeline.results);
  let draftingView = $derived(pipeline.draftingView);
  let scene = $derived(pipeline.scene);
  let cacheStats = $derived(getBushingPipelineCacheStats());
  let visualDiagnostics = $derived(runBushingVisualDiagnostics(scene, results));
  let isFailed = $derived(results.governing.margin < 0 || results.physics.marginHousing < 0 || results.physics.marginBushing < 0);
  
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
  async function onExportSvg() { await exportBushingSvg({ form, results, draftingView }); }
  async function onExportPdf() { try { await exportBushingPdf({ form, results, draftingView }); } catch (err) { bushingExportLogger.warn('PDF export failed', err); } }
  
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
  {#await import('./BushingInformationPage.svelte') then mod}
    <mod.default {form} {results} onBack={() => (showInformationView = false)} />
  {/await}
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
          moveProps={leftMoveProps(item as LeftCardId)}
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
              <BushingResultSummary {form} {results} guidedMode={uxMode === 'guided'} />
            {/snippet}
          </BushingDraggableCard>
        {:else if item === 'diagnostics'}
          <BushingDraggableCard column="right" cardId="diagnostics" title="Diagnostics" {...rightMoveProps('diagnostics' as RightCardId)}>
            {#snippet children()}
              <BushingDiagnosticsPanel bind:form {results} dndEnabled={false} {uxMode} />
            {/snippet}
          </BushingDraggableCard>
        {/if}
      {/each}
  </div>
</div>
{/if}
