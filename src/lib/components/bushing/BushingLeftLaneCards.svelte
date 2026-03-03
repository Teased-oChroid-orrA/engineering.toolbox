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

  // Svelte 5: Convert props to $props()
  let {
    itemId,
    form = $bindable(),
    results,
    normalized,
    isFailed,
    dndEnabled,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    onShowInformation,
    uxMode = 'guided',
    onSetUxMode = () => {},
    moveProps
  }: {
    itemId: string;
    form: BushingInputs;
    results: BushingPipelineState['results'];
    normalized: BushingPipelineState['normalized'];
    isFailed: boolean;
    dndEnabled: boolean;
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
    onShowInformation: () => void;
    uxMode?: 'guided' | 'advanced';
    onSetUxMode?: (mode: 'guided' | 'advanced') => void;
    moveProps: any;
  } = $props();

  const TOL_MODE_ITEMS = [
    { value: 'nominal_tol', label: 'Nominal +/- Tol' },
    { value: 'limits', label: 'Lower / Upper' }
  ];
  
  const END_CONSTRAINT_ITEMS = [
    { value: 'free', label: 'Free Ends' },
    { value: 'one_end', label: 'One End Constrained' },
    { value: 'both_ends', label: 'Both Ends Constrained' }
  ];

  const differs = (a: unknown, b: unknown) => {
    const an = Number(a);
    const bn = Number(b);
    if (Number.isFinite(an) && Number.isFinite(bn)) return Math.abs(an - bn) > 1e-9;
    return a !== b;
  };

  let prerequisiteGuidance = $derived.by(() => {
    if (!form.matHousing || !form.matBushing) return 'Choose units and materials first.';
    if (results.tolerance.status === 'infeasible') return 'Define bore and interference intent again before continuing to profile.';
    if (results.tolerance.status === 'clamped') return 'Review fit intent before opening advanced process overrides.';
    if (results.governing.margin < 0) return 'Review geometry and profile before relying on Drafting / Export.';
    return 'Geometry intent is coherent. Continue to profile, then review results.';
  });

  let geometryActionNotice = $derived.by(() => {
    if (results.tolerance.status === 'infeasible') {
      return {
        tone: 'warning',
        title: 'Tolerance bands are incompatible',
        detail: 'What failed: the bore band is wider than the requested interference window.',
        action: 'Next: widen the interference band or narrow the bore tolerance band.'
      };
    }
    if (results.tolerance.status === 'clamped') {
      return {
        tone: 'info',
        title: 'OD nominal was clamped',
        detail: 'Why: the solver shifted the OD nominal to keep the fit inside the requested interference window.',
        action: 'Next: review the fit intent summary, then adjust bore width or interference if this was not intended.'
      };
    }
    return null;
  });

  let normalizationFeedback = $derived.by(() => {
    const notices: string[] = [];
    if (differs(form.boreDia, normalized.boreDia)) notices.push(`Bore diameter normalized to ${Number(normalized.boreDia).toFixed(4)}.`);
    if (differs(form.interference, normalized.interference)) notices.push(`Interference normalized to ${Number(normalized.interference).toFixed(4)}.`);
    if (differs(form.edgeDist, normalized.edgeDist)) notices.push(`Edge distance normalized to ${Number(normalized.edgeDist).toFixed(4)}.`);
    if (differs(form.housingLen, normalized.housingLen)) notices.push(`Housing thickness normalized to ${Number(normalized.housingLen).toFixed(4)}.`);
    return notices.slice(0, 4);
  });

  let lastSaturationTrigger = $state<'plateWidth' | 'edgeDist' | 'both' | null>(null);
  let previousSaturationSig = $state('');

  $effect(() => {
    const active = Boolean(results.geometry?.isSaturationActive);
    const nextObj = {
      active,
      housingWidth: Number(form.housingWidth ?? 0),
      edgeDist: Number(form.edgeDist ?? 0)
    };
    const next = JSON.stringify(nextObj);
    if (!previousSaturationSig) {
      previousSaturationSig = next;
      if (!active) lastSaturationTrigger = null;
      return;
    }
    const prev = JSON.parse(previousSaturationSig) as typeof nextObj;
    if (!active) {
      lastSaturationTrigger = null;
      previousSaturationSig = next;
      return;
    }
    const widthIncreased = nextObj.housingWidth > prev.housingWidth + 1e-9;
    const edgeIncreased = nextObj.edgeDist > prev.edgeDist + 1e-9;
    if (widthIncreased && edgeIncreased) lastSaturationTrigger = 'both';
    else if (widthIncreased) lastSaturationTrigger = 'plateWidth';
    else if (edgeIncreased) lastSaturationTrigger = 'edgeDist';
    else if (!lastSaturationTrigger) lastSaturationTrigger = 'both';
    previousSaturationSig = next;
  });

  let saturationNotice = $derived.by(() => {
    if (!results.geometry?.isSaturationActive) return null;
    const triggerText =
      lastSaturationTrigger === 'plateWidth'
        ? 'Plate Width'
        : lastSaturationTrigger === 'edgeDist'
          ? 'Edge Dist'
          : 'Plate Width and/or Edge Dist';
    return {
      triggerText,
      detail: `${triggerText} has reached the infinite-plate threshold. Increasing that input further will not materially change the edge-effect response.`
    };
  });
</script>

{#if itemId === 'header'}
  <BushingDraggableCard column="left" cardId="header" title="Header" {...moveProps}>
    <BushingPageHeader {isFailed} {onShowInformation} {uxMode} {onSetUxMode} />
    {#if dndEnabled}
      <BushingUndoRedoControls {canUndo} {canRedo} {onUndo} {onRedo} />
    {/if}
  </BushingDraggableCard>
{:else if itemId === 'guidance'}
  <BushingDraggableCard column="left" cardId="guidance" title="Helper Guidance" {...moveProps}>
    <BushingHelperGuidance {form} {results} {uxMode} />
    <div class="mt-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[11px] text-white/75 bushing-pop-sub bushing-depth-0">
      {prerequisiteGuidance}
    </div>
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
        {#if geometryActionNotice}
          <div class={`rounded-lg border p-3 text-[11px] ${
            geometryActionNotice.tone === 'warning'
              ? 'border-amber-300/40 bg-amber-500/10 text-amber-100'
              : 'border-cyan-300/30 bg-cyan-500/10 text-cyan-100'
          }`}>
            <div class="font-semibold uppercase tracking-wide text-[10px]">{geometryActionNotice.title}</div>
            <div class="mt-1">{geometryActionNotice.detail}</div>
            <div class="mt-1 font-medium">{geometryActionNotice.action}</div>
          </div>
        {/if}
        <div class="rounded-lg border border-cyan-300/15 bg-cyan-500/8 p-3 text-[11px] text-cyan-100/85">
          <div class="font-semibold uppercase tracking-wide text-[10px] text-cyan-100">Fit Intent Summary</div>
          <div class="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
            <div>Target band: {results.tolerance.interferenceTarget.lower.toFixed(4)} .. {results.tolerance.interferenceTarget.upper.toFixed(4)}</div>
            <div>Solved OD: {results.tolerance.odBushing.lower.toFixed(4)} .. {results.tolerance.odBushing.upper.toFixed(4)}</div>
            <div>Achieved interference: {results.tolerance.achievedInterference.lower.toFixed(4)} .. {results.tolerance.achievedInterference.upper.toFixed(4)}</div>
            <div class={results.tolerance.status === 'infeasible' ? 'text-amber-200' : 'text-emerald-200'}>
              Status: {results.tolerance.status}
            </div>
          </div>
        </div>
        {#if saturationNotice}
          <div class="rounded-lg border border-indigo-300/35 bg-indigo-500/10 p-3 text-[11px] text-indigo-100">
            <div class="font-semibold uppercase tracking-wide text-[10px]">Infinite-Plate Saturation Active</div>
            <div class="mt-1">{saturationNotice.detail}</div>
          </div>
        {/if}
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
          {#if normalizationFeedback.length}
            <div class="rounded-md border border-white/10 bg-black/25 p-2 text-[10px] text-white/75">
              <div class="font-semibold uppercase tracking-wide text-[9px] text-cyan-100/80">Input Normalization</div>
              <div class="mt-1 space-y-1">
                {#each normalizationFeedback as notice}
                  <div>{notice}</div>
                {/each}
              </div>
            </div>
          {/if}
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
        <details class="rounded-lg border border-white/10 bg-white/5 p-3 bushing-pop-sub bushing-depth-1" open={uxMode === 'advanced'}>
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
