<script lang="ts">
  import { Input, Label, Select } from '$lib/components/ui';
  import type { BushingInputs, BushingOutput } from '$lib/core/bushing';

  export let form: BushingInputs;
  export let results: BushingOutput;

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

  function ensurePolicyObjects() {
    if (!form.interferencePolicy) {
      form = { ...form, interferencePolicy: { ...DEFAULT_INTERFERENCE_POLICY } };
    }
    if (!form.boreCapability) {
      form = { ...form, boreCapability: { ...DEFAULT_BORE_CAPABILITY } };
    }
  }

  $: ensurePolicyObjects();
</script>

<div class="space-y-2">
  <Label class="text-white/70">Tolerance Priority Controls</Label>
  <label class="flex items-center justify-between rounded-md border border-white/10 bg-black/25 px-2 py-1.5 text-xs text-white/85">
    <span>Enforce Interference Tolerance</span>
    <input type="checkbox" class="h-4 w-4" bind:checked={form.interferencePolicy!.enabled} />
  </label>
  <label class="flex items-center justify-between rounded-md border border-white/10 bg-black/25 px-2 py-1.5 text-xs text-white/85">
    <span>Lock Bore (Reamer Fixed)</span>
    <input
      type="checkbox"
      class="h-4 w-4"
      bind:checked={form.interferencePolicy!.lockBore}
      disabled={form.boreCapability!.mode === 'reamer_fixed'}
    />
  </label>
  <label class="flex items-center justify-between rounded-md border border-white/10 bg-black/25 px-2 py-1.5 text-xs text-white/85">
    <span>Preserve Bore Nominal</span>
    <input
      type="checkbox"
      class="h-4 w-4"
      bind:checked={form.interferencePolicy!.preserveBoreNominal}
    />
  </label>
  <label class="flex items-center justify-between rounded-md border border-white/10 bg-black/25 px-2 py-1.5 text-xs text-white/85">
    <span>Allow Bore Nominal Shift</span>
    <input
      type="checkbox"
      class="h-4 w-4"
      bind:checked={form.interferencePolicy!.allowBoreNominalShift}
      disabled={form.interferencePolicy!.preserveBoreNominal || form.interferencePolicy!.lockBore}
    />
  </label>
  {#if form.interferencePolicy!.allowBoreNominalShift}
    <div class="space-y-1">
      <Label class="text-white/70">Max Bore Nominal Shift</Label>
      <Input type="number" min="0" step="0.0001" bind:value={form.interferencePolicy!.maxBoreNominalShift} />
    </div>
  {/if}
  <div class="grid grid-cols-1 gap-2">
    <div class="space-y-1">
      <Label class="text-white/70">Bore Capability Mode</Label>
      <Select bind:value={form.boreCapability!.mode} items={CAPABILITY_MODE_ITEMS} />
    </div>
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
  <div class="text-[10px] text-cyan-200/70">
    If enforcement is enabled and bore lock is off, the solver can auto-adjust bore tolerance band to satisfy interference containment.
    Keep bore lock on when bore nominal/tolerance are fixed by tooling.
  </div>
  {#if results.tolerance.enforcement.enabled}
    <div class="rounded-md border border-white/10 bg-black/35 px-2 py-1 text-[10px] text-cyan-100/85">
      Enforcement: {results.tolerance.enforcement.satisfied ? 'Satisfied' : 'Blocked'} • Bore width avail/req: {results.tolerance.enforcement.availableBoreTolWidth.toFixed(4)}/{results.tolerance.enforcement.requiredBoreTolWidth.toFixed(4)}
    </div>
  {/if}
</div>
