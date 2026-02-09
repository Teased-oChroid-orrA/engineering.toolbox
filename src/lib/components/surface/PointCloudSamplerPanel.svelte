<script lang="ts">
  export let samplerAppend: boolean;
  export let samplerMode: 'quad' | 'edges';
  export let samplerNu: number;
  export let samplerNv: number;
  export let samplerEdgeSegs: number;
  export let samplerErr: string | null;

  export let onGenerate: () => void | Promise<void>;
</script>

<div class="glass-panel rounded-xl p-3 space-y-2">
  <div class="flex items-center justify-between">
    <div class="text-[11px] text-white/60 uppercase tracking-widest">Point Cloud Sampler</div>
    <label class="flex items-center gap-2 text-[11px] text-white/50">
      <input type="checkbox" class="checkbox checkbox-xs" bind:checked={samplerAppend} />
      Append
    </label>
  </div>

  <label class="text-[11px] text-white/50">
    Mode
    <select class="mt-1 w-full select select-sm glass-input" bind:value={samplerMode}>
      <option value="quad">Quad grid (from P0–P3)</option>
      <option value="edges">Subdivide edges</option>
    </select>
  </label>

  {#if samplerMode === 'quad'}
    <div class="grid grid-cols-2 gap-2">
      <label class="text-[11px] text-white/50">
        Nu
        <input type="number" min="2" step="1" class="mt-1 w-full input input-sm glass-input" bind:value={samplerNu} />
      </label>
      <label class="text-[11px] text-white/50">
        Nv
        <input type="number" min="2" step="1" class="mt-1 w-full input input-sm glass-input" bind:value={samplerNv} />
      </label>
    </div>
  {:else}
    <label class="text-[11px] text-white/50">
      Segments / edge
      <input type="number" min="1" step="1" class="mt-1 w-full input input-sm glass-input" bind:value={samplerEdgeSegs} />
    </label>
  {/if}

  <button class="btn variant-filled-primary w-full" onclick={onGenerate}>
    Generate points
  </button>

  {#if samplerErr}
    <div class="text-[11px] text-rose-200 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
      {samplerErr}
    </div>
  {/if}

  <div class="text-[11px] text-white/40">
    Uses P0–P3 as a bilinear patch or perimeter. This is meant to quickly densify the point cloud so fits & slicing have enough data.
  </div>
</div>
