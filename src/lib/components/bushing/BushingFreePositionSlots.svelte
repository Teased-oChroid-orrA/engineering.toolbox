<script lang="ts">
  import { Card, CardContent, CardHeader, CardTitle, Select, Label } from '$lib/components/ui';
  import { cn } from '$lib/utils';
  import { MATERIALS } from '$lib/core/bushing/materials';
  import type { BushingInputs } from '$lib/core/bushing';
  import type { BushingPipelineState } from './BushingComputeController';
  import BushingPageHeader from './BushingPageHeader.svelte';
  import BushingHelperGuidance from './BushingHelperGuidance.svelte';
  import BushingProfileCard from './BushingProfileCard.svelte';
  import BushingInterferencePolicyControls from './BushingInterferencePolicyControls.svelte';
  import BushingDraftingPanel from './BushingDraftingPanel.svelte';
  import BushingResultSummary from './BushingResultSummary.svelte';
  import BushingDiagnosticsPanel from './BushingDiagnosticsPanel.svelte';

  export let slot: string;
  export let form: BushingInputs;
  export let results: BushingPipelineState['results'];
  export let isFailed: boolean;
  export let onShowInformation: () => void;
  export let draftingView: any;
  export let useLegacyRenderer: boolean;
  export let renderMode: any;
  export let traceEnabled: boolean;
  export let cacheStats: any;
  export let babylonInitNotice: string | null;
  export let visualDiagnostics: any[];
  export let babylonDiagnostics: any[];
  export let onExportSvg: () => Promise<void>;
  export let onExportPdf: () => Promise<void>;
  export let toggleRendererMode: () => void;
  export let toggleTraceMode: () => void;
  export let handleBabylonInitFailure: (reason: string) => void;
  export let dndEnabled: boolean;

  const TOL_MODE_ITEMS = [{ value: 'nominal_tol', label: 'Nominal +/- Tol' }, { value: 'limits', label: 'Lower / Upper' }];
</script>

{#if slot === 'header'}
  <BushingPageHeader {isFailed} {onShowInformation} />
{:else if slot === 'guidance'}
  <BushingHelperGuidance {form} {results} />
{:else if slot === 'setup'}
  <Card id="bushing-setup-card" class="glass-card bushing-pop-card bushing-depth-2">
    <CardHeader class="pb-2 pt-4">
      <CardTitle class="text-[10px] font-bold uppercase text-indigo-300">1. Setup</CardTitle>
    </CardHeader>
    <CardContent class="grid grid-cols-1 gap-4">
      <div class="space-y-1">
        <Label class="text-white/70">Units</Label>
        <div class="flex rounded-lg border border-white/10 bg-black/30 p-1 bushing-pop-sub bushing-depth-0">
          <button class={cn('flex-1 rounded-md py-1 text-xs font-medium transition-all', form.units === 'imperial' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/70')} onclick={() => (form.units = 'imperial')}>Imperial</button>
          <button class={cn('flex-1 rounded-md py-1 text-xs font-medium transition-all', form.units === 'metric' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/70')} onclick={() => (form.units = 'metric')}>Metric</button>
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
{:else if slot === 'geometry'}
  <Card id="bushing-geometry-card" class="glass-card bushing-pop-card bushing-depth-2">
    <CardHeader class="pb-2 pt-4">
      <CardTitle class="text-[10px] font-bold uppercase text-indigo-300">2. Geometry</CardTitle>
    </CardHeader>
    <CardContent class="space-y-4">
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
{:else if slot === 'profile'}
  <BushingProfileCard {form} />
{:else if slot === 'process'}
  <Card id="bushing-process-card" class="glass-card bushing-pop-card bushing-depth-2">
    <CardHeader class="pb-2 pt-4">
      <CardTitle class="text-[10px] font-bold uppercase text-indigo-300">4. Process / Limits</CardTitle>
    </CardHeader>
    <CardContent>
      <BushingInterferencePolicyControls {form} {results} />
    </CardContent>
  </Card>
{:else if slot === 'drafting'}
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
    {onExportSvg}
    {onExportPdf}
    onToggleRendererMode={toggleRendererMode}
    onToggleTraceMode={toggleTraceMode}
    onBabylonDiagnostics={(diag) => { babylonDiagnostics = diag; }}
    onBabylonInitFailure={handleBabylonInitFailure}
  />
{:else if slot === 'summary'}
  <BushingResultSummary {form} {results} />
{:else if slot === 'diagnostics'}
  <BushingDiagnosticsPanel {results} {dndEnabled} />
{/if}
