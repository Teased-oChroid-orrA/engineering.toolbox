<script lang="ts">
  import type { DatumPlane } from '../../surface/types';
  import type { DatumSliceMode, DatumSliceRunResult, DatumSliceWarning } from './controllers/SurfaceSlicingExportController';

  export let datumPlaneChoices: DatumPlane[] = [];
  export let datumSlicePlaneIdx: number;
  export let datumSliceMode: DatumSliceMode;
  export let datumSliceSpacing: number;
  export let datumSliceCount: number;
  export let datumSliceThickness: number;
  export let datumSliceUseSelection: boolean;
  export let includeOptionalSliceColumns: boolean;
  export let datumSliceBusy: boolean;
  export let datumSliceErr: string | null;
  export let datumSliceRes: DatumSliceRunResult | null;
  export let computeDatumPlaneSlices: () => void | Promise<void>;
  export let exportDatumSliceCombined: () => void;

  const warningTone = (sev: DatumSliceWarning['severity']) => {
    if (sev === 'error') return 'border-rose-400/35 bg-rose-500/10 text-rose-200';
    if (sev === 'warning') return 'border-amber-300/30 bg-amber-400/10 text-amber-100';
    return 'border-cyan-300/25 bg-cyan-400/10 text-cyan-100';
  };
</script>

<div class="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
  <div class="flex items-center justify-between">
    <div class="text-[11px] font-semibold uppercase tracking-widest text-white/60">Datum Slicing + Export</div>
    <label class="text-[11px] text-white/50 flex items-center gap-2">
      <input type="checkbox" class="checkbox checkbox-xs" bind:checked={datumSliceUseSelection} />
      Use selection
    </label>
  </div>

  <div class="grid grid-cols-2 gap-2">
    <label class="text-[11px] text-white/50">
      Datum plane
      <select class="mt-1 w-full select select-sm glass-input" bind:value={datumSlicePlaneIdx}>
        {#each datumPlaneChoices as p, i (i)}
          <option value={i}>{p.name}</option>
        {/each}
      </select>
    </label>

    <label class="text-[11px] text-white/50">
      Mode
      <select class="mt-1 w-full select select-sm glass-input" bind:value={datumSliceMode}>
        <option value="fixed_spacing">Fixed spacing (default)</option>
        <option value="fixed_count">Fixed count</option>
      </select>
    </label>
  </div>

  <div class="grid grid-cols-3 gap-2">
    <label class="text-[11px] text-white/50">
      Spacing
      <input type="number" min="0" step="0.001" class="mt-1 w-full input input-sm glass-input" bind:value={datumSliceSpacing} disabled={datumSliceMode !== 'fixed_spacing'} />
    </label>
    <label class="text-[11px] text-white/50">
      Count
      <input type="number" min="2" max="500" step="1" class="mt-1 w-full input input-sm glass-input" bind:value={datumSliceCount} disabled={datumSliceMode !== 'fixed_count'} />
    </label>
    <label class="text-[11px] text-white/50">
      Thickness (0=auto)
      <input type="number" min="0" step="0.001" class="mt-1 w-full input input-sm glass-input" bind:value={datumSliceThickness} />
    </label>
  </div>

  <label class="text-[11px] text-white/50 flex items-center gap-2">
    <input type="checkbox" class="checkbox checkbox-xs" bind:checked={includeOptionalSliceColumns} />
    Include optional columns (source_entity, residual, method, warning_code)
  </label>

  <div class="grid grid-cols-2 gap-2">
    <button class="btn btn-sm variant-soft" onclick={computeDatumPlaneSlices} disabled={datumSliceBusy || datumPlaneChoices.length === 0}>
      {datumSliceBusy ? 'Computing…' : 'Compute slices'}
    </button>
    <button class="btn btn-sm variant-filled-primary" onclick={exportDatumSliceCombined} disabled={!datumSliceRes || datumSliceRes.pointsExportedCount === 0}>
      Export Combined (CSV + JSON)
    </button>
  </div>

  {#if datumSliceErr}
    <div class="text-[11px] text-rose-200 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">{datumSliceErr}</div>
  {/if}

  {#if datumSliceRes}
    <div class="rounded-xl bg-black/25 border border-white/10 p-3 space-y-2">
      <div class="grid grid-cols-2 gap-2 text-[11px] font-mono text-white/70">
        <div>Plane {datumSliceRes.planeName}</div>
        <div>Mode {datumSliceRes.mode}</div>
        <div>Slices {datumSliceRes.stations.length}</div>
        <div>Points {datumSliceRes.pointsExportedCount}/{datumSliceRes.pointsInputCount}</div>
        <div>Spacing {datumSliceRes.spacingUsed.toExponential(3)}</div>
        <div>Thickness {datumSliceRes.thicknessUsed.toExponential(3)}</div>
      </div>
      {#if datumSliceRes.warnings.length > 0}
        <div class="space-y-1">
          <div class="text-[10px] uppercase tracking-widest text-white/55">Warnings</div>
          {#each datumSliceRes.warnings.slice(0, 8) as w, i (`${w.code}:${w.sliceId ?? 'x'}:${i}`)}
            <div class={`rounded-lg border px-2 py-1 text-[11px] ${warningTone(w.severity)}`}>
              <span class="font-mono uppercase mr-1">{w.code}</span>{w.message}
            </div>
          {/each}
          {#if datumSliceRes.warnings.length > 8}
            <div class="text-[10px] text-white/45">+ {datumSliceRes.warnings.length - 8} more warnings in JSON sidecar.</div>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>
