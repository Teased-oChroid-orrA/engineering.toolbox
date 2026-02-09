<script lang="ts">
  // UI-only extraction: Interpolation slider + readout.
  export let interpPct: number;
  export let interpPoint: { x: number; y: number; z: number } | null;
</script>

<div class="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
  <div class="flex items-center justify-between">
    <div class="text-[11px] font-semibold uppercase tracking-widest text-white/60">Interpolation</div>
    <div class="text-[11px] font-mono text-white/60">{interpPct}%</div>
  </div>

  <input type="range" min="0" max="100" bind:value={interpPct} class="w-full accent-indigo-400" />

  {#if interpPoint}
    <div class="grid grid-cols-3 gap-2 text-[11px] font-mono">
      <div class="rounded-xl bg-black/25 border border-white/10 px-2 py-2">X {interpPoint.x.toFixed(3)}</div>
      <div class="rounded-xl bg-black/25 border border-white/10 px-2 py-2">Y {interpPoint.y.toFixed(3)}</div>
      <div class="rounded-xl bg-black/25 border border-white/10 px-2 py-2">Z {interpPoint.z.toFixed(3)}</div>
    </div>
  {:else}
    <div class="text-[11px] text-white/40 italic">Select an edge to interpolate along.</div>
  {/if}
</div>
