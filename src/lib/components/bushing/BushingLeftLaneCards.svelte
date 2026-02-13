<script lang="ts">
  import { Card, CardContent, CardHeader, CardTitle, Input, Label, Select, Separator } from '$lib/components/ui';
  import { cn } from '$lib/utils';
  import { MATERIALS } from '$lib/core/bushing/materials';
  import type { BushingInputs } from '$lib/core/bushing';
  import type { BushingPipelineState } from './BushingComputeController';
  import BushingHelperGuidance from './BushingHelperGuidance.svelte';
  import BushingProfileCard from './BushingProfileCard.svelte';
  import BushingInterferencePolicyControls from './BushingInterferencePolicyControls.svelte';
  import BushingDraggableCard from './BushingDraggableCard.svelte';
  import BushingPageHeader from './BushingPageHeader.svelte';
  import BushingUndoRedoControls from './BushingUndoRedoControls.svelte';

  export let itemId: string;
  export let form: BushingInputs;
  export let results: BushingPipelineState['results'];
  export let isFailed: boolean;
  export let dndEnabled: boolean;
  export let canUndo: boolean;
  export let canRedo: boolean;
  export let onUndo: () => void;
  export let onRedo: () => void;
  export let onShowInformation: () => void;
  export let moveProps: any;

  const TOL_MODE_ITEMS = [
    { value: 'nominal_tol', label: 'Nominal +/- Tol' },
    { value: 'limits', label: 'Lower / Upper' }
  ];
  
  const END_CONSTRAINT_ITEMS = [
    { value: 'free', label: 'Free Ends' },
    { value: 'one_end', label: 'One End Constrained' },
    { value: 'both_ends', label: 'Both Ends Constrained' }
  ];
</script>

{#if itemId === 'header'}
  <BushingDraggableCard column="left" cardId="header" title="Header" {...moveProps}>
    <BushingPageHeader {isFailed} {onShowInformation} />
    {#if dndEnabled}
      <BushingUndoRedoControls {canUndo} {canRedo} {onUndo} {onRedo} />
    {/if}
  </BushingDraggableCard>
{:else if itemId === 'guidance'}
  <BushingDraggableCard column="left" cardId="guidance" title="Helper Guidance" {...moveProps}>
    <BushingHelperGuidance {form} {results} />
  </BushingDraggableCard>
{:else if itemId === 'setup'}
  <BushingDraggableCard column="left" cardId="setup" title="Setup" {...moveProps}>
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
  </BushingDraggableCard>
{:else if itemId === 'geometry'}
  <BushingDraggableCard column="left" cardId="geometry" title="Geometry" {...moveProps}>
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
{:else if itemId === 'profile'}
  <BushingDraggableCard column="left" cardId="profile" title="Profile + Settings" {...moveProps}>
    <div id="bushing-profile-card">
      <BushingProfileCard bind:form odInstalled={results.odInstalled} />
    </div>
  </BushingDraggableCard>
{:else if itemId === 'process'}
  <BushingDraggableCard column="left" cardId="process" title="Process / Limits" {...moveProps}>
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
