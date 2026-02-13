<script lang="ts">
  import { onMount } from 'svelte';
  import type { BushingInputs } from '$lib/core/bushing';
  import { BUSHING_SCENE_MODULE_SENTINEL } from '$lib/drafting/bushing/bushingSceneModel';
  import { evaluateBushingPipeline, getBushingPipelineCacheStats } from './BushingComputeController';
  import BushingLeftLaneCards from './BushingLeftLaneCards.svelte';
  import BushingFreePositionSlots from './BushingFreePositionSlots.svelte';
  import BushingDraggableCard from './BushingDraggableCard.svelte';
  import NativeDragLane from './NativeDragLane.svelte';
  import BushingInformationPage from './BushingInformationPage.svelte';
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
  import { DragDropHistory } from './dragHistory';
  import { MATERIALS } from '$lib/core/bushing/materials';

  const KEY = 'scd.bushing.inputs.v15';
  const FREE_POSITIONING_KEY = 'scd.bushing.freePositioning.enabled';
  const LEGACY_RENDERER_KEY = 'scd.bushing.legacyRenderer';
  const TRACE_MODE_KEY = 'scd.bushing.traceEnabled';
  let leftCardOrder: LeftCardId[] = [...LEFT_DEFAULT_ORDER];
  let rightCardOrder: RightCardId[] = [...RIGHT_DEFAULT_ORDER];
  let dndEnabled = true;
  let useFreePositioning = false;
  
  type LayoutState = { left: LeftCardId[]; right: RightCardId[] };
  const layoutHistory = new DragDropHistory<LayoutState>(50);
  let canUndo = false;
  let canRedo = false;
  
  $: if (typeof window !== 'undefined' && layoutHistory.size() === 0) {
    layoutHistory.push({ left: [...leftCardOrder], right: [...rightCardOrder] });
    canUndo = layoutHistory.canUndo();
    canRedo = layoutHistory.canRedo();
  }
  
  function pushHistory() { layoutHistory.push({ left: [...leftCardOrder], right: [...rightCardOrder] }); canUndo = layoutHistory.canUndo(); canRedo = layoutHistory.canRedo(); }
  function handleUndo() { const prev = layoutHistory.undo(); if (prev) { leftCardOrder = [...prev.left]; rightCardOrder = [...prev.right]; canUndo = layoutHistory.canUndo(); canRedo = layoutHistory.canRedo(); } }
  function handleRedo() { const next = layoutHistory.redo(); if (next) { leftCardOrder = [...next.left]; rightCardOrder = [...next.right]; canUndo = layoutHistory.canUndo(); canRedo = layoutHistory.canRedo(); } }
  
  $: leftLaneItems = leftCardOrder.map((id) => ({ id }));
  $: rightLaneItems = rightCardOrder.map((id) => ({ id }));
  
  const commitLane = (items: Array<{ id: string }>, isLeft: boolean) => {
    if (isLeft) {
      const newOrder = normalizeOrder(items.map((i) => i.id), LEFT_DEFAULT_ORDER);
      if (JSON.stringify(newOrder) !== JSON.stringify(leftCardOrder)) {
        leftCardOrder = newOrder;
        persistTopLevelLayout(leftCardOrder, rightCardOrder);
        pushHistory();
      }
    } else {
      const newOrder = normalizeOrder(items.map((i) => i.id), RIGHT_DEFAULT_ORDER);
      if (JSON.stringify(newOrder) !== JSON.stringify(rightCardOrder)) {
        rightCardOrder = newOrder;
        persistTopLevelLayout(leftCardOrder, rightCardOrder);
        pushHistory();
      }
    }
  };
  
  const commitLeftLane = (items: Array<{ id: string }>) => commitLane(items, true);
  const commitRightLane = (items: Array<{ id: string }>) => commitLane(items, false);
  
  const moveCard = (cardId: any, direction: -1 | 1, isLeft: boolean) => {
    if (isLeft) {
      const newOrder = normalizeOrder(moveCardInList(leftCardOrder, cardId, direction), LEFT_DEFAULT_ORDER);
      if (JSON.stringify(newOrder) !== JSON.stringify(leftCardOrder)) {
        leftCardOrder = newOrder;
        persistTopLevelLayout(leftCardOrder, rightCardOrder);
        pushHistory();
      }
    } else {
      const newOrder = normalizeOrder(moveCardInList(rightCardOrder, cardId, direction), RIGHT_DEFAULT_ORDER);
      if (JSON.stringify(newOrder) !== JSON.stringify(rightCardOrder)) {
        rightCardOrder = newOrder;
        persistTopLevelLayout(leftCardOrder, rightCardOrder);
        pushHistory();
      }
    }
  };
  
  const moveLeftCard = (cardId: LeftCardId, direction: -1 | 1) => moveCard(cardId, direction, true);
  const moveRightCard = (cardId: RightCardId, direction: -1 | 1) => moveCard(cardId, direction, false);

  const leftMoveProps = (cardId: LeftCardId) => ({ dragEnabled: dndEnabled, canMoveUp: canMoveInList(leftCardOrder, cardId, -1), canMoveDown: canMoveInList(leftCardOrder, cardId, 1), onMoveUp: () => moveLeftCard(cardId, -1), onMoveDown: () => moveLeftCard(cardId, 1) });
  const rightMoveProps = (cardId: RightCardId) => ({ dragEnabled: dndEnabled, canMoveUp: canMoveInList(rightCardOrder, cardId, -1), canMoveDown: canMoveInList(rightCardOrder, cardId, 1), onMoveUp: () => moveRightCard(cardId, -1), onMoveDown: () => moveRightCard(cardId, 1) });
  let form: BushingInputs = {
    units: 'imperial', boreDia: 0.5, interference: 0.0015, boreTolMode: 'nominal_tol',
    boreNominal: 0.5, boreTolPlus: 0, boreTolMinus: 0, boreLower: 0.5, boreUpper: 0.5,
    interferenceTolMode: 'nominal_tol', interferenceNominal: 0.0015, interferenceTolPlus: 0,
    interferenceTolMinus: 0, interferenceLower: 0.0015, interferenceUpper: 0.0015,
    interferencePolicy: { enabled: false, lockBore: true, preserveBoreNominal: true, allowBoreNominalShift: false },
    boreCapability: { mode: 'unspecified' }, enforceInterferenceTolerance: false, lockBoreForInterference: true,
    housingLen: 0.5, housingWidth: 1.5, edgeDist: 0.75, bushingType: 'straight',
    flangeOd: 0.75, flangeThk: 0.063, idType: 'straight', idBushing: 0.375,
    csMode: 'depth_angle', csDia: 0.5, csDepth: 0.125, csAngle: 100,
    extCsMode: 'depth_angle', extCsDia: 0.625, extCsDepth: 0.125, extCsAngle: 100,
    matHousing: MATERIALS[0].id, matBushing: 'bronze', friction: 0.15, dT: 0,
    minWallStraight: 0.05, minWallNeck: 0.04, endConstraint: 'free'
  };

  let initError: string | null = null;
  let useLegacyRenderer = false;
  let renderMode: 'section' | 'legacy' = 'section';
  let traceEnabled = false;
  let babylonInitNotice: string | null = null;
  let babylonDiagnostics: any[] = [];
  let showInformationView = false;
  
  if (typeof window !== 'undefined') {
    try {
      form = { ...form, ...safeParseJSON(safeGetItem(KEY), {}) };
      ({ leftCardOrder, rightCardOrder } = loadTopLevelLayout());
      dndEnabled = readBushingDndEnabled();
      useLegacyRenderer = safeGetItem(LEGACY_RENDERER_KEY) === '1';
      renderMode = useLegacyRenderer ? 'legacy' : 'section';
      traceEnabled = safeGetItem(TRACE_MODE_KEY) === '1';
      const stored = safeGetItem(FREE_POSITIONING_KEY);
      useFreePositioning = stored === '1' || stored === 'true';
    } catch (e) {
      console.error('[Bushing] Init error:', e);
      initError = `Init error: ${e instanceof Error ? e.message : String(e)}`;
    }
  }
  $: {
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
  }
  
  $: safeSetItem(KEY, JSON.stringify(form));
  $: if (typeof window !== 'undefined') { try { persistTopLevelLayout(leftCardOrder, rightCardOrder); } catch (e) { console.error('[Bushing] Failed to save layout:', e); } }
  $: pipeline = evaluateBushingPipeline(form);
  $: results = pipeline.results;
  $: draftingView = pipeline.draftingView;
  $: scene = pipeline.scene;
  $: cacheStats = getBushingPipelineCacheStats();
  $: visualDiagnostics = runBushingVisualDiagnostics(scene, results);
  $: isFailed = results.governing.margin < 0 || results.physics.marginHousing < 0 || results.physics.marginBushing < 0;
  $: updateBushingContextMenu(useLegacyRenderer, traceEnabled);
  $: if (typeof window !== 'undefined' && traceEnabled) emitBushingTrace(buildBushingTraceRecord({ rawInput: form, solved: results, scene, source: 'BushingOrchestrator' }));
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    const runtimeSentinel = (globalThis as any).__SCD_BUSHING_SCENE_SENTINEL__;
    if (runtimeSentinel !== BUSHING_SCENE_MODULE_SENTINEL) console.error('[SC][Bushing][path-integrity]', { expected: BUSHING_SCENE_MODULE_SENTINEL, actual: runtimeSentinel });
  }

  function toggleRendererMode() { useLegacyRenderer = !useLegacyRenderer; renderMode = useLegacyRenderer ? 'legacy' : 'section'; safeSetItem(LEGACY_RENDERER_KEY, useLegacyRenderer ? '1' : '0'); }
  function toggleTraceMode() { traceEnabled = !traceEnabled; safeSetItem(TRACE_MODE_KEY, traceEnabled ? '1' : '0'); }
  async function onExportSvg() { await exportBushingSvg({ form, results, draftingView }); }
  async function onExportPdf() { try { await exportBushingPdf({ form, results, draftingView }); } catch (err) { console.warn('[Bushing][Export][PDF] failed', err); } }
  
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

  $: if (typeof window !== 'undefined' && traceEnabled) {
    const trace = buildBushingTraceRecord({ rawInput: form, solved: results, scene, source: 'BushingOrchestrator' });
    emitBushingTrace(trace);
  }

  onMount(() => {
    console.log('[Bushing] Mounted', { initError, units: form.units, cards: leftCardOrder.length + rightCardOrder.length });
    mountBushingContextMenu({ onExportSvg: () => { void onExportSvg(); }, onExportPdf: () => { void onExportPdf(); }, toggleRendererMode, toggleTraceMode });
    if (typeof window !== 'undefined') {
      (window as any).__SCD_BUSHING_TEST_REORDER__ = (lane: 'left' | 'right', sourceId: string, targetId: string) => {
        if (lane === 'left') leftCardOrder = normalizeOrder(reorderList(leftCardOrder, sourceId as LeftCardId, targetId as LeftCardId), LEFT_DEFAULT_ORDER);
        else rightCardOrder = normalizeOrder(reorderList(rightCardOrder, sourceId as RightCardId, targetId as RightCardId), RIGHT_DEFAULT_ORDER);
      };
      (window as any).__ENABLE_FREE_POSITIONING__ = () => { localStorage.setItem(FREE_POSITIONING_KEY, '1'); window.location.reload(); };
      (window as any).__DISABLE_FREE_POSITIONING__ = () => { localStorage.setItem(FREE_POSITIONING_KEY, '0'); window.location.reload(); };
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
        onclick={() => { if (typeof window !== 'undefined') { try { localStorage.clear(); window.location.reload(); } catch {} } }}>
        Clear Data & Reload
      </button>
    </div>
  </div>
{:else if showInformationView}
  <BushingInformationPage {form} {results} onBack={() => (showInformationView = false)} />
{:else if useFreePositioning}
  <BushingFreePositionContainer
    {form} {results} {draftingView} {useLegacyRenderer} {renderMode} {traceEnabled}
    {cacheStats} {babylonInitNotice} {visualDiagnostics} {babylonDiagnostics}
    {onExportSvg} {onExportPdf} {toggleRendererMode} {toggleTraceMode}
    {handleBabylonInitFailure} {dndEnabled} {showInformationView} {isFailed}>
    <svelte:fragment slot="header"><BushingFreePositionSlots slot="header" bind:form {results} {isFailed} onShowInformation={() => (showInformationView = true)} {draftingView} {useLegacyRenderer} {renderMode} {traceEnabled} {cacheStats} {babylonInitNotice} {visualDiagnostics} {babylonDiagnostics} {onExportSvg} {onExportPdf} {toggleRendererMode} {toggleTraceMode} {handleBabylonInitFailure} {dndEnabled} /></svelte:fragment>
    <svelte:fragment slot="guidance"><BushingFreePositionSlots slot="guidance" bind:form {results} {isFailed} onShowInformation={() => (showInformationView = true)} {draftingView} {useLegacyRenderer} {renderMode} {traceEnabled} {cacheStats} {babylonInitNotice} {visualDiagnostics} {babylonDiagnostics} {onExportSvg} {onExportPdf} {toggleRendererMode} {toggleTraceMode} {handleBabylonInitFailure} {dndEnabled} /></svelte:fragment>
    <svelte:fragment slot="setup"><BushingFreePositionSlots slot="setup" bind:form {results} {isFailed} onShowInformation={() => (showInformationView = true)} {draftingView} {useLegacyRenderer} {renderMode} {traceEnabled} {cacheStats} {babylonInitNotice} {visualDiagnostics} {babylonDiagnostics} {onExportSvg} {onExportPdf} {toggleRendererMode} {toggleTraceMode} {handleBabylonInitFailure} {dndEnabled} /></svelte:fragment>
    <svelte:fragment slot="geometry"><BushingFreePositionSlots slot="geometry" bind:form {results} {isFailed} onShowInformation={() => (showInformationView = true)} {draftingView} {useLegacyRenderer} {renderMode} {traceEnabled} {cacheStats} {babylonInitNotice} {visualDiagnostics} {babylonDiagnostics} {onExportSvg} {onExportPdf} {toggleRendererMode} {toggleTraceMode} {handleBabylonInitFailure} {dndEnabled} /></svelte:fragment>
    <svelte:fragment slot="profile"><BushingFreePositionSlots slot="profile" bind:form {results} {isFailed} onShowInformation={() => (showInformationView = true)} {draftingView} {useLegacyRenderer} {renderMode} {traceEnabled} {cacheStats} {babylonInitNotice} {visualDiagnostics} {babylonDiagnostics} {onExportSvg} {onExportPdf} {toggleRendererMode} {toggleTraceMode} {handleBabylonInitFailure} {dndEnabled} /></svelte:fragment>
    <svelte:fragment slot="process"><BushingFreePositionSlots slot="process" bind:form {results} {isFailed} onShowInformation={() => (showInformationView = true)} {draftingView} {useLegacyRenderer} {renderMode} {traceEnabled} {cacheStats} {babylonInitNotice} {visualDiagnostics} {babylonDiagnostics} {onExportSvg} {onExportPdf} {toggleRendererMode} {toggleTraceMode} {handleBabylonInitFailure} {dndEnabled} /></svelte:fragment>
    <svelte:fragment slot="drafting"><BushingFreePositionSlots slot="drafting" bind:form {results} {isFailed} onShowInformation={() => (showInformationView = true)} {draftingView} {useLegacyRenderer} {renderMode} {traceEnabled} {cacheStats} {babylonInitNotice} {visualDiagnostics} {babylonDiagnostics} {onExportSvg} {onExportPdf} {toggleRendererMode} {toggleTraceMode} {handleBabylonInitFailure} {dndEnabled} /></svelte:fragment>
    <svelte:fragment slot="summary"><BushingFreePositionSlots slot="summary" bind:form {results} {isFailed} onShowInformation={() => (showInformationView = true)} {draftingView} {useLegacyRenderer} {renderMode} {traceEnabled} {cacheStats} {babylonInitNotice} {visualDiagnostics} {babylonDiagnostics} {onExportSvg} {onExportPdf} {toggleRendererMode} {toggleTraceMode} {handleBabylonInitFailure} {dndEnabled} /></svelte:fragment>
    <svelte:fragment slot="diagnostics"><BushingFreePositionSlots slot="diagnostics" bind:form {results} {isFailed} onShowInformation={() => (showInformationView = true)} {draftingView} {useLegacyRenderer} {renderMode} {traceEnabled} {cacheStats} {babylonInitNotice} {visualDiagnostics} {babylonDiagnostics} {onExportSvg} {onExportPdf} {toggleRendererMode} {toggleTraceMode} {handleBabylonInitFailure} {dndEnabled} /></svelte:fragment>
  </BushingFreePositionContainer>
{:else}
  <!-- Lane-based layout (legacy) -->
<div class="grid grid-cols-1 gap-4 p-1 pt-4 lg:grid-cols-[450px_1fr]">
  <div class="flex flex-col gap-4 pb-8 pr-2">
    <NativeDragLane
      listClass="flex flex-col gap-4"
      enabled={dndEnabled}
      items={leftLaneItems}
      columnId="left"
      allowCrossColumn={true}
      on:finalize={(ev) => commitLeftLane(ev.detail.items)}
      let:item>
      <BushingLeftLaneCards 
        itemId={item.id}
        bind:form
        {results}
        {isFailed}
        {dndEnabled}
        {canUndo}
        {canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onShowInformation={() => (showInformationView = true)}
        moveProps={leftMoveProps(item.id as LeftCardId)}
      />
    </NativeDragLane>
  </div>

  <div class="flex flex-col gap-4 pb-8 pr-1">
    <NativeDragLane
      listClass="flex flex-col gap-4"
      enabled={dndEnabled}
      items={rightLaneItems}
      columnId="right"
      allowCrossColumn={true}
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
    </NativeDragLane>
  </div>
</div>
{/if}
