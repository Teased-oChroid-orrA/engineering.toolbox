<script lang="ts">
  import { Badge, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, Separator } from '$lib/components/ui';
  import { cn } from '$lib/utils';
  import { MATERIALS } from '$lib/core/bushing/materials';
  import type { BushingInputs } from '$lib/core/bushing';
  import BushingDrafting from '$lib/drafting/bushing/BushingDrafting.svelte';
  import {
    BUSHING_SCENE_MODULE_SENTINEL,
    type BushingRenderMode
  } from '$lib/drafting/bushing/bushingSceneModel';
  import { evaluateBushingPipeline, getBushingPipelineCacheStats } from './BushingComputeController';
  import BushingHelperGuidance from './BushingHelperGuidance.svelte';
  import BushingResultSummary from './BushingResultSummary.svelte';
  import BushingDiagnosticsPanel from './BushingDiagnosticsPanel.svelte';
  import { exportBushingPdf, exportBushingSvg } from './BushingExportController';
  import { buildBushingTraceRecord, emitBushingTrace } from './BushingTraceLogger';
  import { runBushingVisualDiagnostics } from './BushingVisualDiagnostics';

  const KEY = 'scd.bushing.inputs.v15';
  const CS_MODES = [
    { value: 'depth_angle', label: 'Depth & Angle' },
    { value: 'dia_angle', label: 'Dia & Angle' },
    { value: 'dia_depth', label: 'Dia & Depth' }
  ];

  let form: BushingInputs = {
    units: 'imperial',
    boreDia: 0.5,
    interference: 0.0015,
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
    minWallNeck: 0.04
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
</script>

<div class="grid h-[calc(100vh-6rem)] grid-cols-1 gap-4 overflow-hidden p-1 lg:grid-cols-[450px_1fr]">
  <div class="flex flex-col gap-4 overflow-y-auto pb-24 pr-2 scrollbar-hide">
    <div class="flex items-center justify-between px-1">
      <h2 class="text-lg font-semibold tracking-tight text-white">Bushing Toolbox</h2>
      <Badge variant="outline" class={cn('text-[10px]', isFailed ? 'border-amber-400/40 text-amber-200' : 'border-emerald-400/35 text-emerald-200')}>
        {isFailed ? 'ATTN' : 'PASS'}
      </Badge>
    </div>

    <BushingHelperGuidance {form} {results} />

    <Card class="glass-card bushing-pop-card">
      <CardHeader class="pb-2 pt-4">
        <CardTitle class="text-[10px] font-bold uppercase text-indigo-300">1. Setup</CardTitle>
      </CardHeader>
      <CardContent class="grid grid-cols-1 gap-4">
        <div class="space-y-1">
          <Label class="text-white/70">Units</Label>
          <div class="flex rounded-lg border border-white/10 bg-black/30 p-1 bushing-pop-sub">
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

    <Card class="glass-card bushing-pop-card">
      <CardHeader class="pb-2 pt-4">
        <CardTitle class="text-[10px] font-bold uppercase text-indigo-300">2. Geometry</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1"><Label class="text-white/70">Bore Dia</Label><Input type="number" step="0.0001" bind:value={form.boreDia} /></div>
          <div class="space-y-1"><Label class="text-white/70">Interference</Label><Input type="number" step="0.0001" bind:value={form.interference} class="text-amber-200" /></div>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <div class="space-y-1"><Label class="text-white/70">Housing Thk</Label><Input type="number" step="0.001" bind:value={form.housingLen} /></div>
          <div class="space-y-1"><Label class="text-white/70">Plate Width</Label><Input type="number" step="0.001" bind:value={form.housingWidth} /></div>
          <div class="space-y-1"><Label class="text-white/70">Edge Dist</Label><Input type="number" step="0.001" bind:value={form.edgeDist} /></div>
        </div>
      </CardContent>
    </Card>

    <Card class="glass-card bushing-pop-card">
      <CardHeader class="pb-2 pt-4">
        <CardTitle class="text-[10px] font-bold uppercase text-indigo-300">3. Profile</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="rounded-lg border border-white/10 bg-black/30 p-1 text-xs font-medium bushing-pop-sub">
          <div class="text-[10px] text-white/45 mb-1 uppercase">External</div>
          <div class="flex gap-1">
            <button class={cn('flex-1 rounded-md py-1 transition-all', form.bushingType === 'straight' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/70')} on:click={() => (form.bushingType = 'straight')}>Straight</button>
            <button class={cn('flex-1 rounded-md py-1 transition-all', form.bushingType === 'flanged' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/70')} on:click={() => (form.bushingType = 'flanged')}>Flanged</button>
            <button class={cn('flex-1 rounded-md py-1 transition-all', form.bushingType === 'countersink' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/70')} on:click={() => (form.bushingType = 'countersink')}>C'Sink</button>
          </div>
        </div>

        <div class="rounded-lg border border-white/10 bg-black/30 p-1 text-xs font-medium bushing-pop-sub">
          <div class="text-[10px] text-white/45 mb-1 uppercase">Internal</div>
          <div class="flex gap-1">
            <button class={cn('flex-1 rounded-md py-1 transition-all', form.idType === 'straight' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/70')} on:click={() => (form.idType = 'straight')}>Straight</button>
            <button class={cn('flex-1 rounded-md py-1 transition-all', form.idType === 'countersink' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/70')} on:click={() => (form.idType = 'countersink')}>C'Sink</button>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-2">
          <div class="space-y-1"><Label class="text-white/70">ID</Label><Input type="number" step="0.0001" bind:value={form.idBushing} /></div>
          <div class="space-y-1"><Label class="text-white/70">CS Dia</Label><Input type="number" step="0.001" bind:value={form.csDia} disabled={form.idType !== 'countersink'} /></div>
          <div class="space-y-1"><Label class="text-white/70">CS Depth</Label><Input type="number" step="0.001" bind:value={form.csDepth} disabled={form.idType !== 'countersink'} /></div>
        </div>

        {#if form.bushingType === 'flanged'}
          <div class="grid grid-cols-2 gap-3 bushing-pop-sub rounded-lg border border-white/10 bg-white/5 p-3">
            <div class="space-y-1"><Label class="text-white/70">Flange OD</Label><Input type="number" step="0.001" bind:value={form.flangeOd} /></div>
            <div class="space-y-1"><Label class="text-white/70">Flange Thk</Label><Input type="number" step="0.001" bind:value={form.flangeThk} /></div>
          </div>
        {/if}

        <details class="rounded-lg border border-white/10 bg-white/5 p-3 bushing-pop-sub">
          <summary class="cursor-pointer text-xs font-semibold text-white/80">Advanced Profile Controls</summary>
          <div class="mt-3 space-y-3">
            <div class="grid grid-cols-2 gap-2">
              <div><Label class="text-white/50 text-xs">Internal CS Mode</Label><Select bind:value={form.csMode} items={CS_MODES} /></div>
              <div><Label class="text-white/50 text-xs">Internal CS Angle</Label><Input type="number" step="1" bind:value={form.csAngle} /></div>
            </div>
            <div class="grid grid-cols-3 gap-2 text-xs">
              <div><Label class="text-white/50">External CS Dia</Label><Input type="number" step="0.001" bind:value={form.extCsDia} /></div>
              <div><Label class="text-white/50">External CS Depth</Label><Input type="number" step="0.001" bind:value={form.extCsDepth} /></div>
              <div><Label class="text-white/50">External CS Angle</Label><Input type="number" step="1" bind:value={form.extCsAngle} /></div>
            </div>
            <div><Label class="text-white/50 text-xs">External CS Mode</Label><Select bind:value={form.extCsMode} items={CS_MODES} /></div>
          </div>
        </details>
      </CardContent>
    </Card>

    <Card class="glass-card bushing-pop-card">
      <CardHeader class="pb-2 pt-4">
        <CardTitle class="text-[10px] font-bold uppercase text-indigo-300">4. Process / Limits</CardTitle>
      </CardHeader>
      <CardContent class="space-y-3">
        <details class="rounded-lg border border-white/10 bg-white/5 p-3 bushing-pop-sub">
          <summary class="cursor-pointer text-xs font-semibold text-white/80">Advanced Process Controls</summary>
          <div class="mt-3 space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1"><Label class="text-white/70">dT</Label><Input type="number" step="5" bind:value={form.dT} class="text-amber-200" /></div>
              <div class="space-y-1"><Label class="text-white/70">Friction</Label><Input type="number" step="0.01" bind:value={form.friction} /></div>
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

  <div class="flex h-full flex-col gap-4 overflow-hidden">
    <Card class="flex-1 flex flex-col overflow-hidden border-teal-500/20 bg-teal-500/10 backdrop-blur-sm relative group p-0 bushing-pop-card">
      <div class="border-b border-teal-500/10 bg-teal-900/20 px-4 py-3 z-10 backdrop-blur-sm shrink-0 flex justify-between items-center">
        <div class="flex items-center gap-2">
          <span class="font-medium text-teal-100/90 text-sm">5. Drafting / Export</span>
          {#if results.geometry?.isSaturationActive}
            <Badge variant="outline" class="text-[9px] bg-indigo-500/20 text-indigo-300 border-indigo-400/30 animate-pulse">INFINITE PLATE</Badge>
          {/if}
        </div>
        <div class="flex items-center gap-2">
          <button class="rounded-md border border-teal-200/10 bg-teal-500/5 px-2 py-1 text-[10px] font-mono text-teal-100/80 hover:bg-teal-500/10 bushing-pop-sub" on:click={onExportSvg}>Export SVG</button>
          <button class="rounded-md border border-teal-200/10 bg-teal-500/5 px-2 py-1 text-[10px] font-mono text-teal-100/80 hover:bg-teal-500/10 bushing-pop-sub" on:click={onExportPdf}>Export PDF</button>
          <button class="rounded-md border border-teal-200/10 bg-teal-500/5 px-2 py-1 text-[10px] font-mono text-teal-100/80 hover:bg-teal-500/10 bushing-pop-sub" on:click={toggleRendererMode}>
            {useLegacyRenderer ? 'Draft Renderer: Legacy' : 'Draft Renderer: Section'}
          </button>
          <button
            class={cn(
              'rounded-md border px-2 py-1 text-[10px] font-mono hover:bg-teal-500/10 bushing-pop-sub',
              traceEnabled
                ? 'border-cyan-300/45 bg-cyan-500/15 text-cyan-100'
                : 'border-teal-200/10 bg-teal-500/5 text-teal-100/80'
            )}
            on:click={toggleTraceMode}>
            {traceEnabled ? 'Trace: On' : 'Trace: Off'}
          </button>
          {#if traceEnabled}
            <Badge variant="outline" class="text-[10px] border-cyan-400/40 text-cyan-200">
              Cache H/M: {cacheStats.hits}/{cacheStats.misses}
            </Badge>
          {/if}
          <Badge variant="outline" class="text-[10px] border-teal-500/30 text-teal-200">SECTION A-A</Badge>
        </div>
      </div>
      <div class="flex-1 min-h-0 w-full relative">
        <div class="absolute inset-0 opacity-[0.06] pointer-events-none" style="background-image: radial-gradient(#2dd4bf 1px, transparent 1px); background-size: 18px 18px;"></div>
        <BushingDrafting inputs={draftingView} legacyMode={useLegacyRenderer} {renderMode} />
        {#if visualDiagnostics.length}
          <div class="absolute left-2 bottom-2 space-y-1 z-20">
            {#each visualDiagnostics as diag}
              <div class={`rounded-md border px-2 py-1 text-[10px] font-mono bushing-pop-sub ${
                diag.severity === 'error'
                  ? 'border-rose-300/45 bg-rose-500/15'
                  : diag.severity === 'warning'
                    ? 'border-amber-300/45 bg-amber-500/10'
                    : 'border-cyan-300/40 bg-cyan-500/10'
              }`}>
                {diag.message}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </Card>

    <BushingResultSummary {form} {results} />
    <BushingDiagnosticsPanel {results} />
  </div>
</div>
