<script lang="ts">
  import type { SliceSyncModel } from './controllers/SurfaceSlicingInsightsController';

  export let model: SliceSyncModel;
  export let onSelectSlice: (id: number) => void;

  const pct = (v: number) => `${Math.max(0, Math.min(100, Math.round(v * 100)))}%`;
</script>

<div class="rounded-2xl border border-white/10 bg-black/20 p-3 space-y-3 surface-panel-slide">
  <div class="text-[11px] font-semibold uppercase tracking-widest text-white/60">Recommendation Rail</div>

  {#if model.summary.slices === 0}
    <div class="text-[11px] text-white/45">Run datum slicing to populate synchronized insights.</div>
  {:else}
    <div class="text-[11px] text-white/55 grid grid-cols-2 gap-1 font-mono">
      <div>Slices {model.summary.slices}</div>
      <div>Empty {model.summary.emptySlices}</div>
      <div>Sparse {model.summary.sparseSlices}</div>
      <div>Max {model.summary.maxResidual.toExponential(2)}</div>
    </div>

    <svg viewBox="0 0 240 66" class="w-full h-[66px] rounded-lg bg-black/25 border border-white/10">
      <polyline
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        class="text-cyan-200/85"
        points={model.sparkline.map((p) => `${p.x},${p.y}`).join(' ')}
      />
      {#each model.sparkline as p (`s_${p.sliceId}`)}
        <circle
          cx={p.x}
          cy={p.y}
          r={model.selectedSliceId === p.sliceId ? 3.4 : 2.1}
          fill={model.selectedSliceId === p.sliceId ? 'rgba(251,191,36,0.95)' : 'rgba(125,211,252,0.85)'}
          class="cursor-pointer"
          role="button"
          tabindex="0"
          aria-label={`Select slice ${p.sliceId}`}
          onclick={() => onSelectSlice(p.sliceId)}
          onkeydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectSlice(p.sliceId);
            }
          }}
        />
      {/each}
    </svg>

    {#if model.selected}
      <div class="rounded-lg border border-white/10 bg-black/25 px-2 py-2 text-[11px] text-white/70 font-mono">
        <div>Slice {model.selected.sliceId} • n {model.selected.n}</div>
        <div>station {model.selected.station.toExponential(3)}</div>
        <div>max residual {(model.selected.maxResidual ?? 0).toExponential(3)}</div>
      </div>
    {/if}

    <div class="space-y-1">
      {#each model.recommendations as rec (rec.id)}
        <div class="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-2 text-[11px] text-white/70 space-y-1">
          <div class="flex items-center justify-between">
            <span>{rec.label}</span>
            <span class="font-mono text-[10px]">{pct(rec.confidence)}</span>
          </div>
          <div class="h-1.5 rounded bg-white/10 overflow-hidden">
            <div class="h-full bg-cyan-300/80" style={`width:${pct(rec.confidence)}`}></div>
          </div>
          <div class="text-[10px] text-white/50">{rec.rationale}</div>
        </div>
      {/each}
    </div>
  {/if}
</div>
