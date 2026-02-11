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
  import BushingDraftingPanel from './BushingDraftingPanel.svelte';
  import BushingProfileCard from './BushingProfileCard.svelte';
  import BushingResultSummary from './BushingResultSummary.svelte';
  import BushingDiagnosticsPanel from './BushingDiagnosticsPanel.svelte';
  import BushingInformationPage from './BushingInformationPage.svelte';
  import BushingPageHeader from './BushingPageHeader.svelte';
  import { mountBushingContextMenu, updateBushingContextMenu } from './BushingContextMenuController';
  import { exportBushingPdf, exportBushingSvg } from './BushingExportController';
  import { buildBushingTraceRecord, emitBushingTrace } from './BushingTraceLogger';
  import { runBushingVisualDiagnostics } from './BushingVisualDiagnostics';

  const KEY = 'scd.bushing.inputs.v15';
  const TOL_MODE_ITEMS = [{ value: 'nominal_tol', label: 'Nominal +/- Tol' }, { value: 'limits', label: 'Lower / Upper' }];
  const END_CONSTRAINT_ITEMS = [
    { value: 'free', label: 'Free Ends' },
    { value: 'one_end', label: 'One End Constrained' },
    { value: 'both_ends', label: 'Both Ends Constrained' }
  ];
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

  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      try {
        form = { ...form, ...JSON.parse(raw) };
      } catch (e) {
        console.error(e);
      }
    }
  }
  $: if (typeof window !== 'undefined') localStorage.setItem(KEY, JSON.stringify(form));
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
    useLegacyRenderer = localStorage.getItem(LEGACY_RENDERER_KEY) === '1';
    renderMode = useLegacyRenderer ? 'legacy' : 'section';
    traceEnabled = localStorage.getItem(TRACE_MODE_KEY) === '1';
  }

  function toggleRendererMode() {
    useLegacyRenderer = !useLegacyRenderer;
    renderMode = useLegacyRenderer ? 'legacy' : 'section';
    if (typeof window !== 'undefined') localStorage.setItem(LEGACY_RENDERER_KEY, useLegacyRenderer ? '1' : '0');
  }

  function handleBabylonInitFailure(reason: string) {
    babylonInitNotice = reason || 'Babylon initialization failed.';
    if (typeof window !== 'undefined') {
      const payload = {
        at: new Date().toISOString(),
        reason: babylonInitNotice
      };
      try {
        const prior = Number(localStorage.getItem('scd.bushing.babylonInitFailCount') ?? '0');
        localStorage.setItem('scd.bushing.babylonInitFailCount', String(prior + 1));
        localStorage.setItem('scd.bushing.babylonInitLast', JSON.stringify(payload));
      } catch {}
      console.warn('[Bushing][Babylon][init-failed]', payload);
    }
  }
  function toggleTraceMode() {
    traceEnabled = !traceEnabled;
    if (typeof window !== 'undefined') localStorage.setItem(TRACE_MODE_KEY, traceEnabled ? '1' : '0');
  }
  async function onExportSvg() {
    await exportBushingSvg({ form, results, draftingView });
  }
  async function onExportPdf() {
    await exportBushingPdf({ form, results, draftingView });
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

  onMount(() => mountBushingContextMenu({
    onExportSvg: () => {
      void onExportSvg();
    },
    onExportPdf: () => {
      void onExportPdf();
    },
    toggleRendererMode,
    toggleTraceMode
  }));

  $: updateBushingContextMenu(useLegacyRenderer, traceEnabled);
</script>

{#if showInformationView}
  <BushingInformationPage {form} {results} onBack={() => (showInformationView = false)} />
{:else}
<div class="grid grid-cols-1 gap-4 p-1 pt-4 lg:grid-cols-[450px_1fr]">
  <div class="flex flex-col gap-4 pb-8 pr-2">
    <BushingPageHeader {isFailed} onShowInformation={() => (showInformationView = true)} />

    <BushingHelperGuidance {form} {results} />

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

    <div id="bushing-profile-card">
      <BushingProfileCard bind:form odInstalled={results.odInstalled} />
    </div>

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
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1"><Label class="text-white/70">Min Straight Wall</Label><Input type="number" step="0.001" bind:value={form.minWallStraight} /></div>
              <div class="space-y-1"><Label class="text-white/70">Min Neck Wall</Label><Input type="number" step="0.001" bind:value={form.minWallNeck} /></div>
            </div>
          </div>
        </details>
      </CardContent>
    </Card>
  </div>

  <div class="flex flex-col gap-4 pb-8 pr-1">
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
      onBabylonDiagnostics={(diag) => {
        babylonDiagnostics = diag;
      }}
      onBabylonInitFailure={handleBabylonInitFailure}
    />

    <BushingResultSummary {form} {results} />
    <BushingDiagnosticsPanel {results} />
  </div>
</div>
{/if}
