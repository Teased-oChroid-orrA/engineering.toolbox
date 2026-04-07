<script lang="ts">
  import { Input, Label, Select } from '$lib/components/ui';
  import type { BushingInputs, BushingOutput } from '$lib/core/bushing';
  import {
    describeReamerEntryForDisplay,
    type ReamerCatalogEntry
  } from '$lib/core/bushing/reamerCatalog';

  let {
    form = $bindable(),
    results,
    reamerCatalogEntries = [],
    selectedReamerEntry = null,
    hasCustomReamerCatalog = false,
    onImportReamerCsv = async (_file: File) => {}
  }: {
    form: BushingInputs;
    results: BushingOutput;
    reamerCatalogEntries?: ReamerCatalogEntry[];
    selectedReamerEntry?: ReamerCatalogEntry | null;
    hasCustomReamerCatalog?: boolean;
    onImportReamerCsv?: (file: File) => Promise<void> | void;
  } = $props();

  const CAPABILITY_MODE_ITEMS = [
    { value: 'unspecified', label: 'Unspecified' },
    { value: 'reamer_fixed', label: 'Reamer Fixed' },
    { value: 'adjustable', label: 'Adjustable Process' }
  ];

  const DEFAULT_INTERFERENCE_POLICY: NonNullable<BushingInputs['interferencePolicy']> = {
    enabled: false,
    lockBore: true,
    preserveBoreNominal: true,
    allowBoreNominalShift: false
  };
  const DEFAULT_BORE_CAPABILITY: NonNullable<BushingInputs['boreCapability']> = { mode: 'unspecified' };
  type PolicyPreset = 'hold_requested_range' | 'tighten_bore_only' | 'tighten_and_shift';

  const capabilitySummary = (mode: NonNullable<BushingInputs['boreCapability']>['mode']) => {
    if (mode === 'reamer_fixed') return 'Bore is tooling-fixed. The solver keeps the bore locked.';
    if (mode === 'adjustable') return 'Bore width may be tightened if process capability allows it.';
    return 'No manufacturing constraint has been declared.';
  };

  const presetLabel = (preset: PolicyPreset) => {
    if (preset === 'hold_requested_range') return 'Hold requested range';
    if (preset === 'tighten_bore_only') return 'Tighten bore only';
    return 'Tighten + shift nominal';
  };

  const presetDescription = (preset: PolicyPreset) => {
    if (preset === 'hold_requested_range') return 'Do not reshape the bore band. Report any conflict directly.';
    if (preset === 'tighten_bore_only') return 'Tighten from the upper side only so the entered minimum bore is preserved.';
    return 'Tighten from the upper side, then allow an upward-only shift within the permitted limit.';
  };

  const resolvePreset = (policy: NonNullable<BushingInputs['interferencePolicy']>): PolicyPreset => {
    if (policy.lockBore) return 'hold_requested_range';
    if (policy.allowBoreNominalShift) return 'tighten_and_shift';
    return 'tighten_bore_only';
  };

  const applyPreset = (preset: PolicyPreset) => {
    if (!form.interferencePolicy) form = { ...form, interferencePolicy: { ...DEFAULT_INTERFERENCE_POLICY } };
    const next = { ...(form.interferencePolicy ?? DEFAULT_INTERFERENCE_POLICY) };
    if (preset === 'hold_requested_range') {
      next.lockBore = true;
      next.preserveBoreNominal = true;
      next.allowBoreNominalShift = false;
    } else if (preset === 'tighten_bore_only') {
      next.lockBore = false;
      next.preserveBoreNominal = true;
      next.allowBoreNominalShift = false;
    } else {
      next.lockBore = false;
      next.preserveBoreNominal = false;
      next.allowBoreNominalShift = true;
    }
    form = { ...form, interferencePolicy: next };
  };

  $effect(() => {
    if (!form.interferencePolicy) {
      form = { ...form, interferencePolicy: { ...DEFAULT_INTERFERENCE_POLICY } };
    }
    if (!form.boreCapability) {
      form = { ...form, boreCapability: { ...DEFAULT_BORE_CAPABILITY } };
    }
  });

  let policy = $derived(form.interferencePolicy ?? DEFAULT_INTERFERENCE_POLICY);
  let capability = $derived(form.boreCapability ?? DEFAULT_BORE_CAPABILITY);
  let enforcementEnabled = $derived(Boolean(policy.enabled));
  let reamerFixed = $derived(capability.mode === 'reamer_fixed');
  let adjustableCapability = $derived(capability.mode === 'adjustable');
  let showBoreLock = $derived(enforcementEnabled && !reamerFixed);
  let showMaxShift = $derived(enforcementEnabled && !reamerFixed && Boolean(policy.allowBoreNominalShift));
  let showCapabilityWidths = $derived(enforcementEnabled && adjustableCapability);
  let activePreset = $derived(resolvePreset(policy));
  let controlSummary = $derived.by(() => {
    if (!enforcementEnabled) return 'Strict containment is off. The solver reports the fit window but does not try to reshape the bore band.';
    if (reamerFixed) return 'Strict containment is on. Bore stays locked because the bore process is reamer-fixed.';
    if (activePreset === 'hold_requested_range') return 'Strict containment is on. The solver will hold the requested bore limits and report a conflict if they cannot satisfy the target interference window.';
    if (activePreset === 'tighten_bore_only') return 'Strict containment is on. The solver may tighten the bore from the upper side, but it will not reduce the entered minimum bore.';
    return 'Strict containment is on. The solver may tighten the bore from the upper side and then shift the tightened band upward within the allowed limit.';
  });
  let builtinEntries = $derived(reamerCatalogEntries.filter((entry) => entry.source === 'builtin'));
  let customEntries = $derived(reamerCatalogEntries.filter((entry) => entry.source === 'custom'));
</script>

<div class="space-y-2">
  <Label class="text-white/70">Tolerance Priority Controls</Label>
  <div class="rounded-md border border-cyan-300/20 bg-cyan-500/10 px-3 py-2 text-[10px] text-cyan-100/85">
    <div class="font-semibold uppercase tracking-wide text-[9px] text-cyan-100">What this controls</div>
    <div class="mt-1">These settings tell the solver which tolerance rule wins when the requested interference band conflicts with the bore manufacturing band.</div>
  </div>
  <label class="flex items-center justify-between rounded-md border border-white/10 bg-black/25 px-2 py-1.5 text-xs text-white/85">
    <span>Strict fit containment</span>
    <input type="checkbox" class="h-4 w-4" bind:checked={form.interferencePolicy!.enabled} />
  </label>
  <div class="rounded-md border border-white/10 bg-black/20 px-2 py-1.5 text-[10px] text-white/75">
    {controlSummary}
  </div>
  <div class="space-y-1">
    <Label class="text-white/70">Bore Capability Mode</Label>
    <Select bind:value={form.boreCapability!.mode} items={CAPABILITY_MODE_ITEMS} />
    <div class="text-[10px] text-cyan-200/70">{capabilitySummary(capability.mode)}</div>
  </div>
  <div class="rounded-md border border-white/10 bg-black/20 px-3 py-3 text-xs text-white/80 space-y-2">
    <div class="flex items-center justify-between gap-2">
      <div>
        <div class="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100/85">Reamer Catalog</div>
        <div class="mt-1 text-[10px] text-white/60">
          Built-in aerospace catalog plus optional custom CSV import for shop-specific reamer inventories.
        </div>
      </div>
      <label class="btn btn-xs variant-soft cursor-pointer">
        Load CSV
        <input
          class="hidden"
          type="file"
          accept=".csv,text/csv"
          onchange={async (event) => {
            const file = (event.currentTarget as HTMLInputElement).files?.[0];
            if (!file) return;
            await onImportReamerCsv(file);
            (event.currentTarget as HTMLInputElement).value = '';
          }}
        />
      </label>
    </div>
    <div class="grid gap-2">
      <div class="flex items-center justify-between gap-2 text-[10px] text-white/60">
        <div>{hasCustomReamerCatalog ? `${customEntries.length} custom entries loaded.` : 'No custom reamer CSV loaded.'}</div>
        <div>{builtinEntries.length} built-in aerospace entries available.</div>
      </div>
        <div class="rounded-md border border-white/10 bg-black/25 px-2 py-2 text-[10px] text-white/65">
          Reamer selection now happens directly in the Geometry bore section and the Internal Profile `ID` section so tooling choice is made where the diameter is defined.
        </div>
      {#if selectedReamerEntry}
        <div class="rounded-md border border-cyan-300/20 bg-cyan-500/10 px-2 py-2 text-[10px] text-cyan-100/90">
          <div class="font-semibold uppercase tracking-wide text-[9px]">
            Active bore reamer • {selectedReamerEntry.sizeLabel} • {selectedReamerEntry.availabilityTier}
            {#if selectedReamerEntry.preferredRank}
              • Preferred #{selectedReamerEntry.preferredRank}
            {/if}
          </div>
          <div class="mt-1">{describeReamerEntryForDisplay(selectedReamerEntry, form.units)}</div>
        </div>
      {/if}
    </div>
  </div>
  {#if enforcementEnabled}
    <div class="space-y-1">
      <Label class="text-white/70">Solver behavior when limits conflict</Label>
      <div class="rounded-md border border-cyan-300/20 bg-cyan-500/10 px-2 py-2 text-[10px] text-cyan-100/85">
        If the entered bore minimum represents clean-up of a damaged hole, the solver now preserves that minimum and only tightens from the upper side. Upward nominal shift is only used when you explicitly allow it.
      </div>
      <div class="grid grid-cols-1 gap-2">
        {#each (['hold_requested_range', 'tighten_bore_only', 'tighten_and_shift'] satisfies PolicyPreset[]) as preset}
          {@const disabled = reamerFixed && preset !== 'hold_requested_range'}
          <button
            type="button"
            class={`rounded-md border px-3 py-2 text-left transition-colors ${
              activePreset === preset
                ? 'border-cyan-300/45 bg-cyan-500/12 text-cyan-100'
                : 'border-white/10 bg-black/20 text-white/80 hover:border-white/20 hover:bg-white/[0.04]'
            } ${disabled ? 'cursor-not-allowed opacity-45' : ''}`}
            disabled={disabled}
            onclick={() => applyPreset(preset)}
          >
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-medium">{presetLabel(preset)}</span>
              {#if activePreset === preset}
                <span class="rounded-full border border-cyan-300/40 px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] text-cyan-100">Active</span>
              {/if}
            </div>
            <div class="mt-1 text-[10px] text-white/60">{presetDescription(preset)}</div>
          </button>
        {/each}
      </div>
      {#if reamerFixed}
        <div class="rounded-md border border-amber-300/20 bg-amber-500/10 px-2 py-1.5 text-[10px] text-amber-100/90">
          Reamer-fixed capability locks the bore. Bore tightening and nominal shift presets are unavailable.
        </div>
      {/if}
    </div>
  {/if}
  {#if showMaxShift}
    <div class="space-y-1">
      <Label class="text-white/70">Max Bore Nominal Shift</Label>
      <Input type="number" min="0" step="0.0001" bind:value={form.interferencePolicy!.maxBoreNominalShift} />
    </div>
  {/if}
  {#if showCapabilityWidths}
    <div class="grid grid-cols-1 gap-2">
    <div class="grid grid-cols-2 gap-2">
      <div class="space-y-1">
        <Label class="text-white/70">Min Achievable Bore Tol Width</Label>
        <Input type="number" min="0" step="0.0001" bind:value={form.boreCapability!.minAchievableTolWidth} />
      </div>
      <div class="space-y-1">
        <Label class="text-white/70">Max Recommended Bore Tol Width</Label>
        <Input type="number" min="0" step="0.0001" bind:value={form.boreCapability!.maxRecommendedTolWidth} />
      </div>
    </div>
    <div class="space-y-1">
      <Label class="text-white/70">Preferred IT Class (optional)</Label>
      <Input type="text" bind:value={form.boreCapability!.preferredItClass} placeholder="e.g. IT7" />
    </div>
    </div>
  {/if}
  <div class="text-[10px] text-cyan-200/70">
    Only controls that affect the active solver behavior are shown.
  </div>
  {#if results.tolerance.enforcement.enabled}
    <div class="rounded-md border border-white/10 bg-black/35 px-2 py-1 text-[10px] text-cyan-100/85">
      Enforcement: {results.tolerance.enforcement.satisfied ? 'Satisfied' : 'Blocked'} • Bore width avail/req: {results.tolerance.enforcement.availableBoreTolWidth.toFixed(4)}/{results.tolerance.enforcement.requiredBoreTolWidth.toFixed(4)}
    </div>
  {/if}
</div>
