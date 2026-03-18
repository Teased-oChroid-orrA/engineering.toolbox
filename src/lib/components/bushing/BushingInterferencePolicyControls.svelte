<script lang="ts">
  import { Input, Label, Select } from '$lib/components/ui';
  import type { BushingInputs, BushingOutput } from '$lib/core/bushing';

  let {
    form = $bindable(),
    results
  }: {
    form: BushingInputs;
    results: BushingOutput;
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

  const capabilitySummary = (mode: NonNullable<BushingInputs['boreCapability']>['mode']) => {
    if (mode === 'reamer_fixed') return 'Bore is tooling-fixed. The solver keeps the bore locked.';
    if (mode === 'adjustable') return 'Bore width may be tightened if process capability allows it.';
    return 'No manufacturing constraint has been declared.';
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
  let showNominalPreserve = $derived(enforcementEnabled && !Boolean(policy.lockBore));
  let showNominalShiftToggle = $derived(showNominalPreserve && !Boolean(policy.preserveBoreNominal));
  let showMaxShift = $derived(showNominalShiftToggle && Boolean(policy.allowBoreNominalShift));
  let showCapabilityWidths = $derived(enforcementEnabled && adjustableCapability);
  let controlSummary = $derived.by(() => {
    if (!enforcementEnabled) return 'Strict containment is off. The solver reports the fit window but does not try to reshape the bore band.';
    if (reamerFixed) return 'Strict containment is on. Bore stays locked because the bore process is reamer-fixed.';
    if (policy.lockBore) return 'Strict containment is on. Bore stays locked to the entered nominal and width.';
    if (policy.preserveBoreNominal) return 'Strict containment is on. The solver may tighten bore width but will keep bore nominal fixed.';
    if (policy.allowBoreNominalShift) return 'Strict containment is on. The solver may tighten bore width and shift bore nominal within the allowed limit.';
    return 'Strict containment is on. The solver may tighten bore width only.';
  });
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
  {#if showBoreLock}
    <label class="flex items-center justify-between rounded-md border border-white/10 bg-black/25 px-2 py-1.5 text-xs text-white/85">
      <span>Keep Bore Locked</span>
      <input
        type="checkbox"
        class="h-4 w-4"
        bind:checked={form.interferencePolicy!.lockBore}
      />
    </label>
  {/if}
  {#if showNominalPreserve}
    <label class="flex items-center justify-between rounded-md border border-white/10 bg-black/25 px-2 py-1.5 text-xs text-white/85">
      <span>Preserve Bore Nominal</span>
      <input
        type="checkbox"
        class="h-4 w-4"
        bind:checked={form.interferencePolicy!.preserveBoreNominal}
      />
    </label>
  {/if}
  {#if showNominalShiftToggle}
    <label class="flex items-center justify-between rounded-md border border-white/10 bg-black/25 px-2 py-1.5 text-xs text-white/85">
      <span>Allow Bore Nominal Shift</span>
      <input
        type="checkbox"
        class="h-4 w-4"
        bind:checked={form.interferencePolicy!.allowBoreNominalShift}
      />
    </label>
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
    Hidden controls are not applicable under the currently selected capability and lock rules.
  </div>
  {#if results.tolerance.enforcement.enabled}
    <div class="rounded-md border border-white/10 bg-black/35 px-2 py-1 text-[10px] text-cyan-100/85">
      Enforcement: {results.tolerance.enforcement.satisfied ? 'Satisfied' : 'Blocked'} • Bore width avail/req: {results.tolerance.enforcement.availableBoreTolWidth.toFixed(4)}/{results.tolerance.enforcement.requiredBoreTolWidth.toFixed(4)}
    </div>
  {/if}
</div>
