<script lang="ts">
  import { onMount } from 'svelte';
  import { Card, CardContent, CardHeader, CardTitle, Input, Label, Select, Separator } from '$lib/components/ui';
  import { cn } from '$lib/utils';
  import { MATERIALS } from '$lib/core/bushing/materials';
  import type { BushingInputs } from '$lib/core/bushing';
  import type { BabylonRenderDiagnostic } from '$lib/drafting/bushing/BushingBabylonRuntime';
  import { BUSHING_SCENE_MODULE_SENTINEL, type BushingRenderMode } from '$lib/drafting/bushing/bushingSceneModel';
  import { evaluateBushingPipeline, getBushingPipelineCacheStats } from './BushingComputeController';
  import BushingHelperGuidance from './BushingHelperGuidance.svelte';
  import BushingProfileCard from './BushingProfileCard.svelte';
  import BushingInterferencePolicyControls from './BushingInterferencePolicyControls.svelte';
  import BushingDraggableCard from './BushingDraggableCard.svelte';
  import BushingSortableLane from './BushingSortableLane.svelte';
  import BushingInformationPage from './BushingInformationPage.svelte';
  import BushingPageHeader from './BushingPageHeader.svelte';
  import BushingDraftingPanel from './BushingDraftingPanel.svelte';
  import BushingResultSummary from './BushingResultSummary.svelte';
  import BushingDiagnosticsPanel from './BushingDiagnosticsPanel.svelte';
  import BushingFreePositionContainer from './BushingFreePositionContainer.svelte';
  import { mountBushingContextMenu, updateBushingContextMenu } from './BushingContextMenuController';
  import { exportBushingPdf, exportBushingSvg } from './BushingExportController';
  import { buildBushingTraceRecord, emitBushingTrace } from './BushingTraceLogger';
  import { runBushingVisualDiagnostics } from './BushingVisualDiagnostics';
  import { canMoveInList, LEFT_DEFAULT_ORDER, RIGHT_DEFAULT_ORDER, moveCardInList, normalizeOrder, reorderList, type LeftCardId, type RightCardId } from './BushingCardLayoutController';
  import { loadTopLevelLayout, persistTopLevelLayout, readBushingDndEnabled } from './BushingLayoutPersistence';
  import { safeGetItem, safeSetItem, safeParseJSON } from './BushingStorageHelper';
  const KEY = 'scd.bushing.inputs.v15';
  const FREE_POSITIONING_KEY = 'scd.bushing.freePositioning.enabled';
  const TOL_MODE_ITEMS = [{ value: 'nominal_tol', label: 'Nominal +/- Tol' }, { value: 'limits', label: 'Lower / Upper' }];
  const END_CONSTRAINT_ITEMS = [
    { value: 'free', label: 'Free Ends' },
    { value: 'one_end', label: 'One End Constrained' },
    { value: 'both_ends', label: 'Both Ends Constrained' }
  ];
  let leftCardOrder: LeftCardId[] = [...LEFT_DEFAULT_ORDER];
  let rightCardOrder: RightCardId[] = [...RIGHT_DEFAULT_ORDER];
  let dndEnabled = true;
  let useFreePositioning = false; // Feature flag for free positioning mode
  let leftLaneItems: Array<{ id: string }> = [];
  let rightLaneItems: Array<{ id: string }> = [];
  $: leftLaneItems = leftCardOrder.map((id) => ({ id }));
  $: rightLaneItems = rightCardOrder.map((id) => ({ id }));
  const commitLeftLane = (items: Array<{ id: string }>) => { leftCardOrder = normalizeOrder(items.map((i) => i.id) as LeftCardId[], LEFT_DEFAULT_ORDER); };
  const commitRightLane = (items: Array<{ id: string }>) => { rightCardOrder = normalizeOrder(items.map((i) => i.id) as RightCardId[], RIGHT_DEFAULT_ORDER); };
  const moveLeftCard = (cardId: LeftCardId, direction: -1 | 1) => { leftCardOrder = normalizeOrder(moveCardInList(leftCardOrder, cardId, direction), LEFT_DEFAULT_ORDER); };
  const moveRightCard = (cardId: RightCardId, direction: -1 | 1) => { rightCardOrder = normalizeOrder(moveCardInList(rightCardOrder, cardId, direction), RIGHT_DEFAULT_ORDER); };
  const leftMoveProps = (cardId: LeftCardId) => ({
    dragEnabled: dndEnabled,
    canMoveUp: canMoveInList(leftCardOrder, cardId, -1),
    canMoveDown: canMoveInList(leftCardOrder, cardId, 1),
    onMoveUp: () => moveLeftCard(cardId, -1),
    onMoveDown: () => moveLeftCard(cardId, 1)
  });
  const rightMoveProps = (cardId: RightCardId) => ({
    dragEnabled: dndEnabled,
    canMoveUp: canMoveInList(rightCardOrder, cardId, -1),
    canMoveDown: canMoveInList(rightCardOrder, cardId, 1),
    onMoveUp: () => moveRightCard(cardId, -1),
    onMoveDown: () => moveRightCard(cardId, 1)
  });
  let form: BushingInputs = {
    units: 'imperial',
    boreDia: 0.5,
    interference: 0.0015,
    boreTolMode: 'nominal_tol',
    boreNominal: 0.5,
    boreTolPlus: 0,
    boreTolMinus: 0,
    boreLower: 0.5,
    boreUpper: 0.5,
    interferenceTolMode: 'nominal_tol',
    interferenceNominal: 0.0015,
    interferenceTolPlus: 0,
    interferenceTolMinus: 0,
    interferenceLower: 0.0015,
    interferenceUpper: 0.0015,
    interferencePolicy: {
      enabled: false,
      lockBore: true,
      preserveBoreNominal: true,
      allowBoreNominalShift: false
    },
    boreCapability: {
      mode: 'unspecified'
    },
    enforceInterferenceTolerance: false,
    lockBoreForInterference: true,
    housingLen: 0.5,
    housingWidth: 1.5,
    edgeDist: 0.75,
    bushingType: 'straight',
    flangeOd: 0.75,
    flangeThk: 0.063,
    idType: 'straight',
    idBushing: 0.375,
    csMode: 'depth_angle',
    csDia: 0.5,
    csDepth: 0.125,
    csAngle: 100,
    extCsMode: 'depth_angle',
    extCsDia: 0.625,
    extCsDepth: 0.125,
    extCsAngle: 100,
    matHousing: MATERIALS[0].id,
    matBushing: 'bronze',
    friction: 0.15,
    dT: 0,
    minWallStraight: 0.05,
    minWallNeck: 0.04,
    endConstraint: 'free'
  };

  let initError: string | null = null;
  
  if (typeof window !== 'undefined') {
    try {
      form = { ...form, ...safeParseJSON(safeGetItem(KEY), {}) };
      ({ leftCardOrder, rightCardOrder } = loadTopLevelLayout());
      dndEnabled = readBushingDndEnabled();
    } catch (e) {
      console.error('[Bushing] Init error:', e);
      initError = `Init error: ${e instanceof Error ? e.message : String(e)}`;
    }
  }
  $: {
    if (!form.interferencePolicy) {
      form.interferencePolicy = {
        enabled: Boolean(form.enforceInterferenceTolerance),
        lockBore: Boolean(form.lockBoreForInterference),
        preserveBoreNominal: true,
        allowBoreNominalShift: false
      };
    }
    if (!form.boreCapability) {
      form.boreCapability = { mode: 'unspecified' };
    }
    if (form.boreCapability.mode === 'reamer_fixed') {
      form.interferencePolicy.lockBore = true;
    }
    if (form.interferencePolicy.lockBore && form.interferencePolicy.allowBoreNominalShift) {
      form.interferencePolicy.allowBoreNominalShift = false;
    }
    if (form.interferencePolicy.preserveBoreNominal && form.interferencePolicy.allowBoreNominalShift) {
      form.interferencePolicy.allowBoreNominalShift = false;
    }
    if (!form.interferencePolicy.allowBoreNominalShift) {
      form.interferencePolicy.maxBoreNominalShift = undefined;
    } else if (!Number.isFinite(form.interferencePolicy.maxBoreNominalShift as number)) {
      form.interferencePolicy.maxBoreNominalShift = 0.0002;
    }
    const policyEnabled = Boolean(form.interferencePolicy.enabled);
    const policyLock = Boolean(form.interferencePolicy.lockBore);
    if (form.enforceInterferenceTolerance !== policyEnabled) form.enforceInterferenceTolerance = policyEnabled;
    if (form.lockBoreForInterference !== policyLock) form.lockBoreForInterference = policyLock;
    if (form.interferencePolicy.enabled !== form.enforceInterferenceTolerance) form.interferencePolicy.enabled = Boolean(form.enforceInterferenceTolerance);
    if (form.interferencePolicy.lockBore !== form.lockBoreForInterference) form.interferencePolicy.lockBore = Boolean(form.lockBoreForInterference);
  }
  $: safeSetItem(KEY, JSON.stringify(form));
  $: if (typeof window !== 'undefined') {
    try {
      persistTopLevelLayout(leftCardOrder, rightCardOrder);
    } catch (e) {
      console.error('[Bushing] Failed to save layout:', e);
    }
  }
  $: pipeline = evaluateBushingPipeline(form);
  $: results = pipeline.results;
  $: draftingView = pipeline.draftingView;
  $: scene = pipeline.scene;
  $: cacheStats = getBushingPipelineCacheStats();
  $: visualDiagnostics = runBushingVisualDiagnostics(scene, results);
  let babylonDiagnostics: BabylonRenderDiagnostic[] = [];
  $: isFailed = results.governing.margin < 0 || results.physics.marginHousing < 0 || results.physics.marginBushing < 0;
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    const runtimeSentinel = (globalThis as any).__SCD_BUSHING_SCENE_SENTINEL__;
    if (runtimeSentinel !== BUSHING_SCENE_MODULE_SENTINEL) {
      console.error('[SC][Bushing][path-integrity]', {
        expected: BUSHING_SCENE_MODULE_SENTINEL,
        actual: runtimeSentinel
      });
    }
  }
  const LEGACY_RENDERER_KEY = 'scd.bushing.legacyRenderer';
  const TRACE_MODE_KEY = 'scd.bushing.traceEnabled';
  let useLegacyRenderer = false;
  let renderMode: BushingRenderMode = 'section';
  let traceEnabled = false;
  let babylonInitNotice: string | null = null;
  let showInformationView = false;
  if (typeof window !== 'undefined') {
    useLegacyRenderer = safeGetItem(LEGACY_RENDERER_KEY) === '1';
    renderMode = useLegacyRenderer ? 'legacy' : 'section';
    traceEnabled = safeGetItem(TRACE_MODE_KEY) === '1';
  }

  function toggleRendererMode() {
    useLegacyRenderer = !useLegacyRenderer;
    renderMode = useLegacyRenderer ? 'legacy' : 'section';
    safeSetItem(LEGACY_RENDERER_KEY, useLegacyRenderer ? '1' : '0');
  }

  function handleBabylonInitFailure(reason: string) {
    babylonInitNotice = reason || 'Babylon initialization failed.';
    if (typeof window !== 'undefined') {
      const payload = { at: new Date().toISOString(), reason: babylonInitNotice };
      try {
        const prior = Number(safeGetItem('scd.bushing.babylonInitFailCount') ?? '0');
        safeSetItem('scd.bushing.babylonInitFailCount', String(prior + 1));
        safeSetItem('scd.bushing.babylonInitLast', JSON.stringify(payload));
      } catch {}
      console.warn('[Bushing][Babylon][init-failed]', payload);
    }
  }
  function toggleTraceMode() {
    traceEnabled = !traceEnabled;
    safeSetItem(TRACE_MODE_KEY, traceEnabled ? '1' : '0');
  }
  async function onExportSvg() {
    await exportBushingSvg({ form, results, draftingView });
  }
  async function onExportPdf() {
    try {
      await exportBushingPdf({ form, results, draftingView });
    } catch (err) {
      console.warn('[Bushing][Export][PDF] failed', err);
    }
  }
  $: if (typeof window !== 'undefined' && traceEnabled) {
    const trace = buildBushingTraceRecord({
      rawInput: form,
      solved: results,
      scene,
      source: 'BushingOrchestrator'
    });
    emitBushingTrace(trace);
  }
  onMount(() => {
    console.log('[Bushing] Mounted', { initError, units: form.units, cards: leftCardOrder.length + rightCardOrder.length });
    mountBushingContextMenu({ onExportSvg: () => { void onExportSvg(); }, onExportPdf: () => { void onExportPdf(); }, toggleRendererMode, toggleTraceMode });
    
    // Load free positioning flag
    try {
      const stored = localStorage.getItem(FREE_POSITIONING_KEY);
      useFreePositioning = stored === '1' || stored === 'true';
    } catch (e) {
      console.error('[Bushing] Failed to load free positioning flag:', e);
    }
    
    if (typeof window !== 'undefined') {
      (window as any).__SCD_BUSHING_TEST_REORDER__ = (lane: 'left' | 'right', sourceId: string, targetId: string) => {
        if (lane === 'left') leftCardOrder = normalizeOrder(reorderList(leftCardOrder, sourceId as LeftCardId, targetId as LeftCardId), LEFT_DEFAULT_ORDER);
        else rightCardOrder = normalizeOrder(reorderList(rightCardOrder, sourceId as RightCardId, targetId as RightCardId), RIGHT_DEFAULT_ORDER);
      };
      // Enable free positioning by default for testing
      (window as any).__ENABLE_FREE_POSITIONING__ = () => {
        localStorage.setItem(FREE_POSITIONING_KEY, '1');
        window.location.reload();
      };
      (window as any).__DISABLE_FREE_POSITIONING__ = () => {
        localStorage.setItem(FREE_POSITIONING_KEY, '0');
        window.location.reload();
      };
    }
  });
  $: updateBushingContextMenu(useLegacyRenderer, traceEnabled);
</script>

{#if initError}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
    <div class="max-w-md rounded-lg bg-red-900/90 p-6 text-white shadow-xl">
      <h2 class="mb-4 text-xl font-bold">Initialization Error</h2>
      <p class="mb-2">{initError}</p>
      <p class="mb-2 text-sm text-red-200">Try restarting the app or clearing data.</p>
      <button type="button" class="mt-2 rounded bg-red-700 px-4 py-2 hover:bg-red-600"
        on:click={() => { if (typeof window !== 'undefined') { try { localStorage.clear(); window.location.reload(); } catch {} } }}>
        Clear Data & Reload
      </button>
    </div>
  </div>
{:else if showInformationView}
  <BushingInformationPage {form} {results} onBack={() => (showInformationView = false)} />
{:else if useFreePositioning}
  <!-- Free positioning mode -->
  <BushingFreePositionContainer
    {form}
    {results}
    {draftingView}
    {useLegacyRenderer}
    {renderMode}
    {traceEnabled}
    {cacheStats}
    {babylonInitNotice}
    {visualDiagnostics}
    {babylonDiagnostics}
    {onExportSvg}
    {onExportPdf}
    {toggleRendererMode}
    {toggleTraceMode}
    {handleBabylonInitFailure}
    {dndEnabled}
    {showInformationView}
    {isFailed}>
    <!-- Header card -->
    <svelte:fragment slot="header">
      <BushingPageHeader {isFailed} onShowInformation={() => (showInformationView = true)} />
    </svelte:fragment>
    
    <!-- Guidance card -->
    <svelte:fragment slot="guidance">
      <BushingHelperGuidance {form} {results} />
    </svelte:fragment>
    
    <!-- Setup card -->
    <svelte:fragment slot="setup">
      <Card id="bushing-setup-card" class="glass-card bushing-pop-card bushing-depth-2">
        <CardHeader class="pb-2 pt-4">
          <CardTitle class="text-[10px] font-bold uppercase text-indigo-300">1. Setup</CardTitle>
        </CardHeader>
        <CardContent class="grid grid-cols-1 gap-4">
          <div class="space-y-1">
            <Label class="text-white/70">Units</Label>
            <div class="flex rounded-lg border border-white/10 bg-black/30 p-1 bushing-pop-sub bushing-depth-0">
              <button class={cn('flex-1 rounded-md py-1 text-xs font-medium transition-all', form.units === 'imperial' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/70')} on:click={() => (form.units = 'imperial')}>Imperial</button>
              <button class={cn('flex-1 rounded-md py-1 text-xs font-medium transition-all', form.units === 'metric' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/70')} on:click={() => (form.units = 'metric')}>Metric</button>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <Label class="text-white/70">Housing Material</Label>
              <Select bind:value={form.matHousing} items={MATERIALS.map((m) => ({ value: m.id, label: m.name }))} />
            </div>
            <div class="space-y-1">
              <Label class="text-white/70">Bushing Material</Label>
              <Select bind:value={form.matBushing} items={MATERIALS.map((m) => ({ value: m.id, label: m.name }))} />
            </div>
          </div>
        </CardContent>
      </Card>
    </svelte:fragment>
    
    <!-- Geometry card -->
    <svelte:fragment slot="geometry">
      <Card id="bushing-geometry-card" class="glass-card bushing-pop-card bushing-depth-2">
        <CardHeader class="pb-2 pt-4">
          <CardTitle class="text-[10px] font-bold uppercase text-indigo-300">2. Geometry</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <!-- Simplified geometry content - just key fields -->
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <Label class="text-white/70">Bore Input Mode</Label>
              <Select bind:value={form.boreTolMode} items={TOL_MODE_ITEMS} />
            </div>
            <div class="space-y-1">
              <Label class="text-white/70">Interference Input Mode</Label>
              <Select bind:value={form.interferenceTolMode} items={TOL_MODE_ITEMS} />
            </div>
          </div>
        </CardContent>
      </Card>
    </svelte:fragment>
    
    <!-- Profile card -->
    <svelte:fragment slot="profile">
      <BushingProfileCard {form} />
    </svelte:fragment>
    
    <!-- Process card -->
    <svelte:fragment slot="process">
      <Card id="bushing-process-card" class="glass-card bushing-pop-card bushing-depth-2">
        <CardHeader class="pb-2 pt-4">
          <CardTitle class="text-[10px] font-bold uppercase text-indigo-300">4. Process / Limits</CardTitle>
        </CardHeader>
        <CardContent>
          <BushingInterferencePolicyControls {form} {results} />
        </CardContent>
      </Card>
    </svelte:fragment>
    
    <!-- Drafting card -->
    <svelte:fragment slot="drafting">
      <BushingDraftingPanel
        {draftingView}
        {useLegacyRenderer}
        {renderMode}
        {traceEnabled}
        cacheHits={cacheStats.hits}
        cacheMisses={cacheStats.misses}
        isInfinitePlate={Boolean(results.geometry?.isSaturationActive)}
        {babylonInitNotice}
        {visualDiagnostics}
        {babylonDiagnostics}
        onExportSvg={onExportSvg}
        onExportPdf={onExportPdf}
        onToggleRendererMode={toggleRendererMode}
        onToggleTraceMode={toggleTraceMode}
        onBabylonDiagnostics={(diag) => { babylonDiagnostics = diag; }}
        onBabylonInitFailure={handleBabylonInitFailure}
      />
    </svelte:fragment>
    
    <!-- Summary card -->
    <svelte:fragment slot="summary">
      <BushingResultSummary {form} {results} />
    </svelte:fragment>
    
    <!-- Diagnostics card -->
    <svelte:fragment slot="diagnostics">
      <BushingDiagnosticsPanel {results} {dndEnabled} />
    </svelte:fragment>
  </BushingFreePositionContainer>
{:else}
  <!-- Lane-based layout (legacy) -->
<div class="grid grid-cols-1 gap-4 p-1 pt-4 lg:grid-cols-[450px_1fr]">
  <div class="flex flex-col gap-4 pb-8 pr-2">
    <BushingSortableLane
      listClass="flex flex-col gap-4"
      laneType="bushing-top-left"
      enabled={dndEnabled}
      items={leftLaneItems}
      on:finalize={(ev) => commitLeftLane(ev.detail.items)}
      let:item>
      {#if item.id === 'header'}
        <BushingDraggableCard column="left" cardId="header" title="Header" {...leftMoveProps('header')}>
          <BushingPageHeader {isFailed} onShowInformation={() => (showInformationView = true)} />
        </BushingDraggableCard>
      {:else if item.id === 'guidance'}
        <BushingDraggableCard column="left" cardId="guidance" title="Helper Guidance" {...leftMoveProps('guidance')}>
          <BushingHelperGuidance {form} {results} />
        </BushingDraggableCard>
      {:else if item.id === 'setup'}
        <BushingDraggableCard column="left" cardId="setup" title="Setup" {...leftMoveProps('setup')}>
          <Card id="bushing-setup-card" class="glass-card bushing-pop-card bushing-depth-2">
            <CardHeader class="pb-2 pt-4">
              <CardTitle class="text-[10px] font-bold uppercase text-indigo-300">1. Setup</CardTitle>
            </CardHeader>
            <CardContent class="grid grid-cols-1 gap-4">
              <div class="space-y-1">
                <Label class="text-white/70">Units</Label>
                <div class="flex rounded-lg border border-white/10 bg-black/30 p-1 bushing-pop-sub bushing-depth-0">
                  <button class={cn('flex-1 rounded-md py-1 text-xs font-medium transition-all', form.units === 'imperial' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/70')} on:click={() => (form.units = 'imperial')}>Imperial</button>
                  <button class={cn('flex-1 rounded-md py-1 text-xs font-medium transition-all', form.units === 'metric' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/70')} on:click={() => (form.units = 'metric')}>Metric</button>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1">
                  <Label class="text-white/70">Housing Material</Label>
                  <Select bind:value={form.matHousing} items={MATERIALS.map((m) => ({ value: m.id, label: m.name }))} />
                </div>
                <div class="space-y-1">
                  <Label class="text-white/70">Bushing Material</Label>
                  <Select bind:value={form.matBushing} items={MATERIALS.map((m) => ({ value: m.id, label: m.name }))} />
                </div>
              </div>
            </CardContent>
          </Card>
        </BushingDraggableCard>
      {:else if item.id === 'geometry'}
        <BushingDraggableCard column="left" cardId="geometry" title="Geometry" {...leftMoveProps('geometry')}>
          <Card id="bushing-geometry-card" class="glass-card bushing-pop-card bushing-depth-2">
            <CardHeader class="pb-2 pt-4">
              <CardTitle class="text-[10px] font-bold uppercase text-indigo-300">2. Geometry</CardTitle>
            </CardHeader>
            <CardContent class="space-y-4">
              <div class="rounded-lg border border-white/10 bg-black/20 p-3 space-y-3 bushing-pop-sub bushing-depth-0">
                <div class="grid grid-cols-2 gap-3">
                  <div class="space-y-1">
                    <Label class="text-white/70">Bore Input Mode</Label>
                    <Select bind:value={form.boreTolMode} items={TOL_MODE_ITEMS} />
                  </div>
                  <div class="space-y-1">
                    <Label class="text-white/70">Interference Input Mode</Label>
                    <Select bind:value={form.interferenceTolMode} items={TOL_MODE_ITEMS} />
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                  {#if form.boreTolMode === 'limits'}
                    <div class="space-y-1"><Label class="text-white/70">Bore Lower</Label><Input type="number" step="0.0001" bind:value={form.boreLower} /></div>
                    <div class="space-y-1"><Label class="text-white/70">Bore Upper</Label><Input type="number" step="0.0001" bind:value={form.boreUpper} /></div>
                  {:else}
                    <div class="space-y-1"><Label class="text-white/70">Bore Nominal</Label><Input type="number" step="0.0001" bind:value={form.boreNominal} /></div>
                    <div class="grid grid-cols-2 gap-2">
                      <div class="space-y-1"><Label class="text-white/70">Bore +Tol</Label><Input type="number" min="0" step="0.0001" bind:value={form.boreTolPlus} /></div>
                      <div class="space-y-1"><Label class="text-white/70">Bore -Tol</Label><Input type="number" min="0" step="0.0001" bind:value={form.boreTolMinus} /></div>
                    </div>
                  {/if}
                </div>
                <div class="grid grid-cols-2 gap-3">
                  {#if form.interferenceTolMode === 'limits'}
                    <div class="space-y-1"><Label class="text-white/70">Interference Lower</Label><Input type="number" step="0.0001" bind:value={form.interferenceLower} class="text-amber-200" /></div>
                    <div class="space-y-1"><Label class="text-white/70">Interference Upper</Label><Input type="number" step="0.0001" bind:value={form.interferenceUpper} class="text-amber-200" /></div>
                  {:else}
                    <div class="space-y-1"><Label class="text-white/70">Interference Nominal</Label><Input type="number" step="0.0001" bind:value={form.interferenceNominal} class="text-amber-200" /></div>
                    <div class="grid grid-cols-2 gap-2">
                      <div class="space-y-1"><Label class="text-white/70">Interference +Tol</Label><Input type="number" min="0" step="0.0001" bind:value={form.interferenceTolPlus} class="text-amber-200" /></div>
                      <div class="space-y-1"><Label class="text-white/70">Interference -Tol</Label><Input type="number" min="0" step="0.0001" bind:value={form.interferenceTolMinus} class="text-amber-200" /></div>
                    </div>
                  {/if}
                </div>
                <div class="text-[10px] font-mono text-cyan-200/70">
                  Solved OD range: {results.tolerance.odBushing.lower.toFixed(4)} .. {results.tolerance.odBushing.upper.toFixed(4)} (nom {results.tolerance.odBushing.nominal.toFixed(4)})
                </div>
              </div>
              <div class="grid grid-cols-3 gap-2">
                <div class="space-y-1"><Label class="text-white/70">Housing Thk</Label><Input type="number" step="0.001" bind:value={form.housingLen} /></div>
                <div class="space-y-1"><Label class="text-white/70">Plate Width</Label><Input type="number" step="0.001" bind:value={form.housingWidth} /></div>
                <div class="space-y-1"><Label class="text-white/70">Edge Dist</Label><Input type="number" step="0.001" bind:value={form.edgeDist} /></div>
              </div>
            </CardContent>
          </Card>
        </BushingDraggableCard>
      {:else if item.id === 'profile'}
        <BushingDraggableCard column="left" cardId="profile" title="Profile + Settings" {...leftMoveProps('profile')}>
          <div id="bushing-profile-card">
            <BushingProfileCard bind:form odInstalled={results.odInstalled} />
          </div>
        </BushingDraggableCard>
      {:else if item.id === 'process'}
        <BushingDraggableCard column="left" cardId="process" title="Process / Limits" {...leftMoveProps('process')}>
          <Card id="bushing-process-card" class="glass-card bushing-pop-card bushing-depth-2">
            <CardHeader class="pb-2 pt-4">
              <CardTitle class="text-[10px] font-bold uppercase text-indigo-300">4. Process / Limits</CardTitle>
            </CardHeader>
            <CardContent class="space-y-3">
              <details class="rounded-lg border border-white/10 bg-white/5 p-3 bushing-pop-sub bushing-depth-1">
                <summary class="cursor-pointer text-xs font-semibold text-white/80">Advanced Process Controls</summary>
                <div class="mt-3 space-y-3">
                  <div class="grid grid-cols-2 gap-3">
                    <div class="space-y-1"><Label class="text-white/70">dT</Label><Input type="number" step="5" bind:value={form.dT} class="text-amber-200" /></div>
                    <div class="space-y-1"><Label class="text-white/70">Friction</Label><Input type="number" step="0.01" bind:value={form.friction} /></div>
                  </div>
                  <div class="space-y-1">
                    <Label class="text-white/70">Axial End Constraint</Label>
                    <Select bind:value={form.endConstraint} items={END_CONSTRAINT_ITEMS} />
                    <div class="text-[10px] text-cyan-200/70">
                      Controls axial stress development: free ends -> near plane-stress axial response, constrained ends -> higher axial stress coupling.
                    </div>
                  </div>
                  <Separator class="bg-white/10" />
                  <BushingInterferencePolicyControls bind:form {results} />
                  <Separator class="bg-white/10" />
                  <div class="grid grid-cols-2 gap-3">
                    <div class="space-y-1"><Label class="text-white/70">Min Straight Wall</Label><Input type="number" step="0.001" bind:value={form.minWallStraight} /></div>
                    <div class="space-y-1"><Label class="text-white/70">Min Neck Wall</Label><Input type="number" step="0.001" bind:value={form.minWallNeck} /></div>
                  </div>
                </div>
              </details>
            </CardContent>
          </Card>
        </BushingDraggableCard>
      {/if}
    </BushingSortableLane>
  </div>

  <div class="flex flex-col gap-4 pb-8 pr-1">
    <BushingSortableLane
      listClass="flex flex-col gap-4"
      laneType="bushing-top-right"
      enabled={dndEnabled}
      items={rightLaneItems}
      on:finalize={(ev) => commitRightLane(ev.detail.items)}
      let:item>
      {#if item.id === 'drafting'}
        <BushingDraggableCard column="right" cardId="drafting" title="Drafting View" {...rightMoveProps('drafting')}>
          <BushingDraftingPanel
            {draftingView}
            {useLegacyRenderer}
            {renderMode}
            {traceEnabled}
            cacheHits={cacheStats.hits}
            cacheMisses={cacheStats.misses}
            isInfinitePlate={Boolean(results.geometry?.isSaturationActive)}
            {babylonInitNotice}
            {visualDiagnostics}
            {babylonDiagnostics}
            onExportSvg={onExportSvg}
            onExportPdf={onExportPdf}
            onToggleRendererMode={toggleRendererMode}
            onToggleTraceMode={toggleTraceMode}
            onBabylonDiagnostics={(diag) => { babylonDiagnostics = diag; }}
            onBabylonInitFailure={handleBabylonInitFailure}
          />
        </BushingDraggableCard>
      {:else if item.id === 'summary'}
        <BushingDraggableCard column="right" cardId="summary" title="Results Panel" {...rightMoveProps('summary')}>
          <BushingResultSummary {form} {results} />
        </BushingDraggableCard>
      {:else if item.id === 'diagnostics'}
        <BushingDraggableCard column="right" cardId="diagnostics" title="Diagnostics" {...rightMoveProps('diagnostics')}>
          <BushingDiagnosticsPanel {results} {dndEnabled} />
        </BushingDraggableCard>
      {/if}
    </BushingSortableLane>
  </div>
</div>
{/if}
