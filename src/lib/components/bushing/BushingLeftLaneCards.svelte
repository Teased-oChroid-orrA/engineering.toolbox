<script lang="ts">
  import { Badge, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, Separator } from '$lib/components/ui';
  import { cn } from '$lib/utils';
  import { MATERIALS } from '$lib/core/bushing/materials';
  import type { BushingInputs } from '$lib/core/bushing';
  import { BUSHING_PROCESS_ROUTES, BUSHING_STANDARDS_BASIS_OPTIONS } from '$lib/core/bushing/processLibrary';
  import { describeReamerEntryForDisplay, type ReamerCatalogEntry } from '$lib/core/bushing/reamerCatalog';
  import { formatToleranceRange } from '$lib/core/bushing/tolerancePresentation';
  import type { BushingPipelineState } from './BushingComputeController';
  import type { BushingRepairStrategyId, BushingScenarioPreset, BushingWorkflowMode } from './BushingLayoutPersistence';
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
    workflowMode = 'quick',
    onSetWorkflowMode = () => {},
    moveProps,
    reamerCatalogEntries = [],
    selectedReamerEntry = null,
    selectedIdReamerEntry = null,
    hasCustomReamerCatalog = false,
    onOpenReamerPicker = () => {},
    onClearReamerEntry = () => {},
    onClearIdReamerEntry = () => {},
    onImportReamerCsv = async (_file: File) => {},
    scenarioDraftName = '',
    scenarioPresets = [],
    activeComparePresetIds = [],
    repairCompareEnabled = false,
    activeRepairStrategies = [],
    cleanupDelta = 0.0005,
    oversizeStep = 0.015625,
    onSetScenarioDraftName = () => {},
    onSaveScenarioPreset = () => {},
    onLoadScenarioPreset = () => {},
    onToggleCompareScenario = () => {},
    onDeleteScenarioPreset = () => {},
    onSetRepairCompareEnabled = () => {},
    onToggleRepairStrategy = () => {},
    onSetCleanupDelta = () => {},
    onSetOversizeStep = () => {}
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
    workflowMode?: BushingWorkflowMode;
    onSetWorkflowMode?: (mode: BushingWorkflowMode) => void;
    moveProps: any;
    reamerCatalogEntries?: ReamerCatalogEntry[];
    selectedReamerEntry?: ReamerCatalogEntry | null;
    selectedIdReamerEntry?: ReamerCatalogEntry | null;
    hasCustomReamerCatalog?: boolean;
    onOpenReamerPicker?: (target: 'bore' | 'id') => void;
    onClearReamerEntry?: () => void;
    onClearIdReamerEntry?: () => void;
    onImportReamerCsv?: (file: File) => Promise<void> | void;
    scenarioDraftName?: string;
    scenarioPresets?: BushingScenarioPreset[];
    activeComparePresetIds?: string[];
    repairCompareEnabled?: boolean;
    activeRepairStrategies?: BushingRepairStrategyId[];
    cleanupDelta?: number;
    oversizeStep?: number;
    onSetScenarioDraftName?: (value: string) => void;
    onSaveScenarioPreset?: () => void;
    onLoadScenarioPreset?: (id: string) => void;
    onToggleCompareScenario?: (id: string) => void;
    onDeleteScenarioPreset?: (id: string) => void;
    onSetRepairCompareEnabled?: (value: boolean) => void;
    onToggleRepairStrategy?: (id: BushingRepairStrategyId) => void;
    onSetCleanupDelta?: (value: number) => void;
    onSetOversizeStep?: (value: number) => void;
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

  const LOAD_SPECTRUM_ITEMS = [
    { value: 'static', label: 'Static' },
    { value: 'oscillating', label: 'Oscillating' },
    { value: 'rotating', label: 'Rotating' }
  ];

  const LUBRICATION_ITEMS = [
    { value: 'dry', label: 'Dry' },
    { value: 'greased', label: 'Greased' },
    { value: 'oiled', label: 'Oiled' },
    { value: 'solid_film', label: 'Solid Film' }
  ];

  const CONTAMINATION_ITEMS = [
    { value: 'clean', label: 'Clean' },
    { value: 'shop', label: 'Shop' },
    { value: 'dirty', label: 'Dirty' },
    { value: 'abrasive', label: 'Abrasive' }
  ];

  const CRITICALITY_ITEMS = [
    { value: 'general', label: 'General' },
    { value: 'primary_structure', label: 'Primary Structure' },
    { value: 'repair', label: 'Repair' }
  ];
  const MEASURED_BASIS_ITEMS = [
    { value: 'nominal', label: 'Design Intent' },
    { value: 'measured', label: 'As-Measured' }
  ];
  const REPAIR_STRATEGY_ITEMS: Array<{ value: BushingRepairStrategyId; label: string; detail: string }> = [
    { value: 'light_cleanup_ream', label: 'Light Cleanup Ream', detail: 'Shift the bore upward by the cleanup allowance and compare against repair routing.' },
    { value: 'finish_ream_after_install', label: 'Finish Ream After Install', detail: 'Compare against a route that recovers ID after installation.' },
    { value: 'oversize_repair', label: 'Oversize Repair', detail: 'Compare against an oversize step and repair criticality.' },
    { value: 'thermal_assist', label: 'Thermal Assist', detail: 'Compare against a temperature-assisted install route.' }
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

  let boreReamerActive = $derived(Boolean(selectedReamerEntry));
  let measuredPartEnabled = $derived(Boolean(form.measuredPart?.enabled));

  $effect(() => {
    if (!form.measuredPart) form.measuredPart = { enabled: false, basis: 'nominal', bore: {}, id: {} };
    if (!form.measuredPart.bore) form.measuredPart.bore = {};
    if (!form.measuredPart.id) form.measuredPart.id = {};
  });
</script>

{#if itemId === 'header'}
  <BushingDraggableCard column="left" cardId="header" title="Header" {...moveProps}>
    <BushingPageHeader {isFailed} {onShowInformation} {uxMode} {onSetUxMode} {workflowMode} {onSetWorkflowMode} />
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
            <div>Target band: {formatToleranceRange(results.tolerance.interferenceTarget)}</div>
            <div>Solved OD: {formatToleranceRange(results.tolerance.odBushing)}</div>
            <div>Achieved interference: {formatToleranceRange(results.tolerance.achievedInterference)}</div>
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
          <div class="rounded-2xl border border-cyan-300/18 bg-cyan-500/10 p-3 text-[11px] text-cyan-100/88">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div class="font-semibold uppercase tracking-[0.18em] text-[10px] text-cyan-100/90">Bore Definition Source</div>
                <div class="mt-1 text-sm font-semibold text-white">
                  {#if selectedReamerEntry}
                    Reamer-defined bore band
                  {:else}
                    Manual bore input
                  {/if}
                </div>
                <div class="mt-1 text-white/70">
                  {#if selectedReamerEntry}
                    {describeReamerEntryForDisplay(selectedReamerEntry, form.units)}
                  {:else}
                    Choose a preferred/common reamer when bore size is tooling-driven, or stay manual for direct entry.
                  {/if}
                </div>
              </div>
              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  class="rounded-full bg-cyan-300 px-3 py-1.5 text-[11px] font-semibold text-slate-950 transition-colors hover:bg-cyan-200"
                  data-testid="bushing-bore-reamer-open"
                  onclick={() => onOpenReamerPicker('bore')}
                >
                  {selectedReamerEntry ? 'Change reamer' : 'Select reamer'}
                </button>
                {#if selectedReamerEntry}
                  <button
                    type="button"
                    class="rounded-full border border-white/14 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-white/80 transition-colors hover:bg-white/[0.08]"
                    onclick={onClearReamerEntry}
                  >
                    Manual
                  </button>
                {/if}
              </div>
            </div>
            {#if selectedReamerEntry}
              <div class="mt-3 rounded-xl border border-white/10 bg-slate-950/35 px-3 py-2 text-[10px] text-white/65">
                Bore limits are locked to the selected tooling band. Switch back to `Manual` to edit bore limits directly.
              </div>
            {/if}
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <Label class="text-white/70">Bore Input Mode</Label>
              <Select bind:value={form.boreTolMode} items={TOL_MODE_ITEMS} disabled={boreReamerActive} />
            </div>
            <div class="space-y-1">
              <Label class="text-white/70">Interference Input Mode</Label>
              <Select bind:value={form.interferenceTolMode} items={TOL_MODE_ITEMS} />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            {#if form.boreTolMode === 'limits'}
              <div class="space-y-1"><Label class="text-white/70">Bore Lower</Label><Input type="number" step="0.0001" bind:value={form.boreLower} disabled={boreReamerActive} /></div>
              <div class="space-y-1"><Label class="text-white/70">Bore Upper</Label><Input type="number" step="0.0001" bind:value={form.boreUpper} disabled={boreReamerActive} /></div>
            {:else}
              <div class="space-y-1"><Label class="text-white/70">Bore Nominal</Label><Input type="number" step="0.0001" bind:value={form.boreNominal} disabled={boreReamerActive} /></div>
              <div class="grid grid-cols-2 gap-2">
                <div class="space-y-1"><Label class="text-white/70">Bore +Tol</Label><Input type="number" min="0" step="0.0001" bind:value={form.boreTolPlus} disabled={boreReamerActive} /></div>
                <div class="space-y-1"><Label class="text-white/70">Bore -Tol</Label><Input type="number" min="0" step="0.0001" bind:value={form.boreTolMinus} disabled={boreReamerActive} /></div>
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
            Solved OD: {formatToleranceRange(results.tolerance.odBushing)}
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
        <div class="rounded-xl border border-white/10 bg-black/20 p-3 space-y-3 bushing-pop-sub bushing-depth-0">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div class="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100/85">Measured Part Mode</div>
              <div class="mt-1 text-[10px] text-white/60">Switch this on when actual inspection values should override the design-intent bore, edge distance, or surrounding width.</div>
            </div>
            <button
              type="button"
              class={cn('rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors', measuredPartEnabled ? 'bg-cyan-300 text-slate-950' : 'border border-white/14 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]')}
              onclick={() => {
                form.measuredPart = {
                  ...(form.measuredPart ?? {}),
                  enabled: !form.measuredPart?.enabled,
                  basis: !form.measuredPart?.enabled ? 'measured' : 'nominal',
                  bore: form.measuredPart?.bore ?? {},
                  id: form.measuredPart?.id ?? {}
                };
                form = { ...form };
              }}
            >
              {measuredPartEnabled ? 'Measured Active' : 'Enable Measured'}
            </button>
          </div>
          {#if measuredPartEnabled}
            <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div class="space-y-1">
                <Label class="text-white/70">Basis</Label>
                <Select bind:value={form.measuredPart!.basis} items={MEASURED_BASIS_ITEMS} />
              </div>
              <div class="rounded-lg border border-white/10 bg-slate-950/25 px-3 py-2 text-[10px] text-white/62">
                Enter only the measured values you trust. Missing measured fields leave the solve on nominal intent.
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1"><Label class="text-white/70">Measured Bore</Label><Input type="number" step="0.0001" bind:value={form.measuredPart!.bore!.actual} /></div>
              <div class="grid grid-cols-2 gap-2">
                <div class="space-y-1"><Label class="text-white/70">Bore +Tol</Label><Input type="number" min="0" step="0.0001" bind:value={form.measuredPart!.bore!.tolPlus} /></div>
                <div class="space-y-1"><Label class="text-white/70">Bore -Tol</Label><Input type="number" min="0" step="0.0001" bind:value={form.measuredPart!.bore!.tolMinus} /></div>
              </div>
              <div class="space-y-1"><Label class="text-white/70">Measured Edge Dist</Label><Input type="number" step="0.0001" bind:value={form.measuredPart!.edgeDist} /></div>
              <div class="space-y-1"><Label class="text-white/70">Measured Width</Label><Input type="number" step="0.0001" bind:value={form.measuredPart!.housingWidth} /></div>
            </div>
            <div class="space-y-1">
              <Label class="text-white/70">Measured Notes</Label>
              <Input type="text" bind:value={form.measuredPart!.notes} placeholder="Inspection source, cleanup requirement, local notes" />
            </div>
          {/if}
        </div>
      </CardContent>
    </Card>
  </BushingDraggableCard>
{:else if itemId === 'profile'}
  <BushingDraggableCard column="left" cardId="profile" title="Profile + Settings" {...moveProps}>
    <div id="bushing-profile-card">
      <BushingProfileCard
        bind:form
        odInstalled={results.odInstalled}
        selectedIdReamerEntry={selectedIdReamerEntry}
        onOpenReamerPicker={onOpenReamerPicker}
        onClearIdReamerEntry={onClearIdReamerEntry}
      />
    </div>
  </BushingDraggableCard>
{:else if itemId === 'process'}
  <BushingDraggableCard column="left" cardId="process" title="Process / Limits" {...moveProps}>
    <Card id="bushing-process-card" class="glass-card bushing-pop-card bushing-depth-1">
      <CardHeader class="pb-2 pt-4">
        <CardTitle class="text-[10px] font-bold uppercase text-indigo-300">4. Process / Limits</CardTitle>
      </CardHeader>
      <CardContent class="space-y-3">
        {#if workflowMode === 'quick'}
          <div class="rounded-xl border border-cyan-300/18 bg-cyan-500/8 px-3 py-2 text-[11px] text-cyan-100/82">
            Quick Solve keeps the full review controls out of the way. Switch to `Engineering Review` in the header when you want service-envelope, duty-screen, approval, and diagnostics depth on this page.
          </div>
        {/if}
        <div class="rounded-2xl border border-cyan-300/18 bg-[linear-gradient(135deg,rgba(12,40,63,0.62),rgba(7,25,42,0.92))] p-3 text-[11px] text-cyan-100/88">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div class="font-semibold uppercase tracking-[0.18em] text-[10px] text-cyan-100/90">Primary Process Route</div>
              <div class="mt-1 text-sm font-semibold text-white">
                {BUSHING_PROCESS_ROUTES.find((route) => route.id === form.processRouteId)?.label ?? 'Press Fit Only'}
              </div>
              <div class="mt-1 text-white/70">
                This route is not just a label. It drives finish-machining expectation, install/removal force guidance, recommended finish targets, and the report review language.
              </div>
            </div>
            <div class="min-w-[220px] flex-1">
              <Select
                bind:value={form.processRouteId}
                items={BUSHING_PROCESS_ROUTES.map((route) => ({ value: route.id, label: route.label }))}
              />
            </div>
          </div>
          <div class="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
            <div class="rounded-xl border border-white/10 bg-slate-950/35 px-3 py-2 text-[10px] text-white/70">
              <div class="font-semibold uppercase tracking-wide text-[9px] text-cyan-100/80">Uses</div>
              <div class="mt-1">Service envelope, install/removal guidance, finish targets, and report traceability.</div>
            </div>
            <div class="rounded-xl border border-white/10 bg-slate-950/35 px-3 py-2 text-[10px] text-white/70">
              <div class="font-semibold uppercase tracking-wide text-[9px] text-cyan-100/80">When To Change It</div>
              <div class="mt-1">Change this when the real manufacturing route changes, not just to chase a passing result.</div>
            </div>
            <div class="rounded-xl border border-white/10 bg-slate-950/35 px-3 py-2 text-[10px] text-white/70">
              <div class="font-semibold uppercase tracking-wide text-[9px] text-cyan-100/80">Current Route Effect</div>
              <div class="mt-1">{BUSHING_PROCESS_ROUTES.find((route) => route.id === form.processRouteId)?.notes[0] ?? 'No route note available.'}</div>
            </div>
          </div>
        </div>
        {#if workflowMode === 'review' || uxMode === 'advanced'}
        <div class="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <div class="rounded-xl border border-white/10 bg-black/20 p-3 space-y-3 bushing-pop-sub bushing-depth-0">
            <div>
              <div class="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100/85">Service Envelope</div>
              <div class="mt-1 text-[10px] text-white/60">Use this only for fit-lifecycle state changes: hot/cold service, post-install finish recovery, and end-of-life wear allowance.</div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1"><Label class="text-white/70">Hot dT</Label><Input type="number" step="5" bind:value={form.serviceTemperatureHot} /></div>
              <div class="space-y-1"><Label class="text-white/70">Cold dT</Label><Input type="number" step="5" bind:value={form.serviceTemperatureCold} /></div>
              <div class="space-y-1"><Label class="text-white/70">Finish Ream Allow.</Label><Input type="number" step="0.0001" bind:value={form.finishReamAllowance} /></div>
              <div class="space-y-1"><Label class="text-white/70">Wear Allow.</Label><Input type="number" step="0.0001" bind:value={form.wearAllowance} /></div>
            </div>
            <div class="rounded-lg border border-white/10 bg-slate-950/25 px-3 py-2 text-[10px] leading-relaxed text-white/62">
              Service envelope does not use load direction. It is a fit-state screen built from interference, thermal drift, finish recovery, and wear allowance.
            </div>
          </div>
          <div class="rounded-xl border border-white/10 bg-black/20 p-3 space-y-3 bushing-pop-sub bushing-depth-0">
            <div>
              <div class="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100/85">Duty Screen</div>
              <div class="mt-1 text-[10px] text-white/60">Use this as a service-risk screen. It combines applied load, motion, lubrication, contamination, finish, hardness, and misalignment to flag wear-sensitive cases.</div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1"><Label class="text-white/70">Applied Load</Label><Input type="number" step="10" bind:value={form.load} /></div>
              <div class="space-y-1"><Label class="text-white/70">Load Spectrum</Label><Select bind:value={form.loadSpectrum} items={LOAD_SPECTRUM_ITEMS} /></div>
              <div class="space-y-1"><Label class="text-white/70">Lubrication</Label><Select bind:value={form.lubricationMode} items={LUBRICATION_ITEMS} /></div>
              <div class="space-y-1"><Label class="text-white/70">Oscillation Angle</Label><Input type="number" step="1" bind:value={form.oscillationAngleDeg} /></div>
              <div class="space-y-1"><Label class="text-white/70">Frequency (Hz)</Label><Input type="number" step="0.1" bind:value={form.oscillationFreqHz} /></div>
              <div class="space-y-1"><Label class="text-white/70">Duty Cycle %</Label><Input type="number" min="0" max="100" step="5" bind:value={form.dutyCyclePct} /></div>
              <div class="space-y-1"><Label class="text-white/70">Contamination</Label><Select bind:value={form.contaminationLevel} items={CONTAMINATION_ITEMS} /></div>
              <div class="space-y-1"><Label class="text-white/70">Surface Ra um</Label><Input type="number" step="0.1" bind:value={form.surfaceRoughnessRaUm} /></div>
              <div class="space-y-1"><Label class="text-white/70">Shaft Hardness HRC</Label><Input type="number" step="1" bind:value={form.shaftHardnessHrc} /></div>
              <div class="space-y-1 xl:col-span-2"><Label class="text-white/70">Misalignment deg</Label><Input type="number" step="0.01" bind:value={form.misalignmentDeg} /></div>
            </div>
          </div>
        </div>
        {/if}
        <div class="rounded-xl border border-white/10 bg-black/20 p-3 space-y-3 bushing-pop-sub bushing-depth-0">
          <div>
            <div class="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100/85">Edge Distance Sequencing</div>
            <div class="mt-1 text-[10px] text-white/60">This angle is separate from service duty. It is the assumed failure-plane or ligament angle referenced from the applied load direction for the edge-distance sequence check.</div>
          </div>
          <div class="grid grid-cols-1 gap-3 xl:grid-cols-[220px_1fr] xl:items-start">
            <div class="space-y-1">
              <Label class="text-white/70">Failure Plane Angle</Label>
              <Input type="number" min="1" step="1" bind:value={form.edgeLoadAngleDeg} />
            </div>
            <div class="rounded-lg border border-white/10 bg-slate-950/25 px-3 py-2 text-[10px] leading-relaxed text-white/62">
              `40 deg` is a practical default, not a service-envelope input. Lowering this angle sharply increases the required sequencing edge distance because the check scales with `1 / sin(theta)`.
            </div>
          </div>
        </div>
        <div class="rounded-xl border border-white/10 bg-black/20 p-3 space-y-3 bushing-pop-sub bushing-depth-0">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div class="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100/85">Approval Basis</div>
              <div class="mt-1 text-[10px] text-white/60">Use this when the job needs a declared basis, review authority, or repair trail in the export instead of relying on tribal knowledge.</div>
            </div>
            <Badge variant="outline" class="border-white/15 text-white/70">
              {form.criticality === 'primary_structure' ? 'Critical Review' : form.criticality === 'repair' ? 'Repair Flow' : 'General'}
            </Badge>
          </div>
          <div class="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <div class="space-y-1"><Label class="text-white/70">Standards Basis</Label><Select bind:value={form.standardsBasis} items={BUSHING_STANDARDS_BASIS_OPTIONS.map((entry) => ({ value: entry.value, label: entry.label }))} /></div>
            <div class="space-y-1"><Label class="text-white/70">Criticality</Label><Select bind:value={form.criticality} items={CRITICALITY_ITEMS} /></div>
            <div class="space-y-1"><Label class="text-white/70">Revision</Label><Input type="text" bind:value={form.standardsRevision} placeholder="e.g. current / Rev C" /></div>
            <div class="space-y-1"><Label class="text-white/70">Process Spec</Label><Input type="text" bind:value={form.processSpec} placeholder="e.g. local route or traveler ref" /></div>
            <div class="space-y-1 xl:col-span-2"><Label class="text-white/70">Approval Notes</Label><Input type="text" bind:value={form.approvalNotes} placeholder="Authority, assumptions, or repair notes" /></div>
          </div>
        </div>
        <details class="rounded-lg border border-white/10 bg-white/5 p-3 bushing-pop-sub bushing-depth-0" open={uxMode === 'advanced'}>
          <summary class="cursor-pointer text-xs font-semibold text-white/80">Advanced Process Controls</summary>
          <div class="mt-3 space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1"><Label class="text-white/70">Current Fit dT</Label><Input type="number" step="5" bind:value={form.dT} class="text-amber-200" /></div>
              <div class="space-y-1"><Label class="text-white/70">Friction</Label><Input type="number" step="0.01" bind:value={form.friction} /></div>
            </div>
            <div class="space-y-2 rounded-lg border border-white/10 bg-black/20 p-3 bushing-pop-sub bushing-depth-0">
              <div>
                <div class="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100/85">Assembly Thermal Assist</div>
                <div class="mt-1 text-[10px] text-white/60">
                  Enter install-time temperatures here to reduce assembly interference physically. Heating the housing or cooling the bushing lowers press force during installation, but the retained fit after equilibrium still uses the settled state.
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1"><Label class="text-white/70">Housing Install Temp</Label><Input type="number" step="5" bind:value={form.assemblyHousingTemperature} placeholder={form.units === 'metric' ? '20' : '70'} /></div>
                <div class="space-y-1"><Label class="text-white/70">Bushing Install Temp</Label><Input type="number" step="5" bind:value={form.assemblyBushingTemperature} placeholder={form.units === 'metric' ? '20' : '70'} /></div>
              </div>
              <div class="text-[10px] text-cyan-200/70">
                Reference temperature is {form.units === 'metric' ? '20 C' : '70 F'}. Leave blank to ignore explicit thermal-assist physics and use only the settled-fit thermal delta above.
              </div>
            </div>
            <div class="space-y-1">
              <Label class="text-white/70">Axial End Constraint</Label>
              <Select bind:value={form.endConstraint} items={END_CONSTRAINT_ITEMS} />
              <div class="text-[10px] text-cyan-200/70">
                Controls axial stress development: free ends -> near plane-stress axial response, constrained ends -> higher axial stress coupling.
              </div>
            </div>
            <Separator class="bg-white/10" />
            <BushingInterferencePolicyControls
              bind:form
              {results}
              {reamerCatalogEntries}
              {selectedReamerEntry}
              {hasCustomReamerCatalog}
              {onImportReamerCsv}
            />
            <Separator class="bg-white/10" />
            <div class="space-y-2 rounded-lg border border-white/10 bg-black/20 p-3 bushing-pop-sub bushing-depth-0">
              <div class="flex items-center justify-between gap-2">
                <div>
                  <div class="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100/85">Repair Strategy Compare</div>
                  <div class="mt-1 text-[10px] text-white/60">
                    Build common repair alternatives automatically and show them in the compare strip on the results panel.
                  </div>
                </div>
                <button
                  type="button"
                  class={cn('rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors', repairCompareEnabled ? 'bg-cyan-300 text-slate-950' : 'border border-white/14 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]')}
                  onclick={() => onSetRepairCompareEnabled(!repairCompareEnabled)}
                >
                  {repairCompareEnabled ? 'Compare On' : 'Compare Off'}
                </button>
              </div>
              <div class="grid grid-cols-1 gap-2 md:grid-cols-2">
                {#each REPAIR_STRATEGY_ITEMS as item}
                  <button
                    type="button"
                    class={cn('rounded-xl border px-3 py-2 text-left text-[11px] transition-colors', activeRepairStrategies.includes(item.value) ? 'border-cyan-300/30 bg-cyan-500/10 text-cyan-100' : 'border-white/10 bg-black/25 text-white/72 hover:bg-white/[0.05]')}
                    onclick={() => onToggleRepairStrategy(item.value)}
                  >
                    <div class="font-semibold">{item.label}</div>
                    <div class="mt-1 text-[10px] opacity-75">{item.detail}</div>
                  </button>
                {/each}
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1"><Label class="text-white/70">Cleanup Delta</Label><Input type="number" min="0" step="0.0001" value={cleanupDelta} oninput={(event: Event) => onSetCleanupDelta(Number((event.currentTarget as HTMLInputElement).value))} /></div>
                <div class="space-y-1"><Label class="text-white/70">Oversize Step</Label><Input type="number" min="0" step="0.0001" value={oversizeStep} oninput={(event: Event) => onSetOversizeStep(Number((event.currentTarget as HTMLInputElement).value))} /></div>
              </div>
            </div>
            <Separator class="bg-white/10" />
            <div class="space-y-2 rounded-lg border border-white/10 bg-black/20 p-3 bushing-pop-sub bushing-depth-0">
              <div class="flex items-center justify-between gap-2">
                <div>
                  <div class="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100/85">Scenario Presets</div>
                  <div class="mt-1 text-[10px] text-white/60">
                    Save named working points and promote selected ones into the compare strip on the results panel.
                  </div>
                </div>
                <button
                  type="button"
                  class="btn btn-xs variant-soft"
                  data-testid="bushing-save-scenario"
                  onclick={onSaveScenarioPreset}
                >
                  Save current
                </button>
              </div>
              <label class="space-y-1">
                <span class="text-[10px] uppercase tracking-widest text-white/50">Scenario name</span>
                <Input
                  type="text"
                  data-testid="bushing-scenario-name"
                  value={scenarioDraftName}
                  oninput={(event: Event) => onSetScenarioDraftName((event.currentTarget as HTMLInputElement).value)}
                  placeholder="e.g. Hot fit / repair bore"
                />
              </label>
              {#if scenarioPresets.length}
                <div class="space-y-2">
                  {#each scenarioPresets as preset (preset.id)}
                    <div class="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-[11px] text-white/78">
                      <div class="flex items-center justify-between gap-2">
                        <div class="font-medium text-white/88">{preset.name}</div>
                        <div class="flex gap-2">
                          <button type="button" class="btn btn-xs variant-soft" onclick={() => onLoadScenarioPreset(preset.id)}>
                            Load
                          </button>
                          <button
                            type="button"
                            class="btn btn-xs variant-soft"
                            aria-label={`Compare ${preset.name}`}
                            onclick={() => onToggleCompareScenario(preset.id)}
                          >
                            {activeComparePresetIds.includes(preset.id) ? 'Comparing' : 'Compare'}
                          </button>
                          <button type="button" class="btn btn-xs variant-soft" onclick={() => onDeleteScenarioPreset(preset.id)}>
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  {/each}
                </div>
              {:else}
                <div class="text-[10px] text-white/50">No saved scenario presets yet.</div>
              {/if}
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
  </BushingDraggableCard>
{/if}
