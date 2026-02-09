<script lang="ts">
  type Point3D = { x: number; y: number; z: number };
  type Edge = [number, number];
  type IntersectionRes = { p: Point3D; skew: number };

  export let edges: Edge[] = [];
  export let points: Point3D[] = [];

  // Bound state
  export let selEdgeA: number | null;
  export let selEdgeB: number | null;
  export let offsetDist: number;
  export let refPointIdx: number;

  export let intersection: IntersectionRes | null = null;
  export let calcOffsetIntersection: () => void;
</script>

<div class="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
  <div class="text-[11px] font-semibold uppercase tracking-widest text-white/60">Offset–Intersection</div>

  <div class="grid grid-cols-2 gap-2">
    <label class="text-[11px] text-white/50">
      Edge A
      <select
        class="mt-1 w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-xs"
        bind:value={selEdgeA}
      >
        {#each edges as e, i (i)}
          <option value={i}>{i}: P{e[0]}→P{e[1]}</option>
        {/each}
      </select>
    </label>

    <label class="text-[11px] text-white/50">
      Edge B
      <select
        class="mt-1 w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-xs"
        bind:value={selEdgeB}
      >
        {#each edges as e, i (i)}
          <option value={i}>{i}: P{e[0]}→P{e[1]}</option>
        {/each}
      </select>
    </label>
  </div>

  <div class="grid grid-cols-[1fr_120px] gap-2 items-end">
    <label class="text-[11px] text-white/50">
      Offset distance
      <input
        type="number"
        step="0.1"
        class="mt-1 w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-xs"
        bind:value={offsetDist}
      />
    </label>

    <label class="text-[11px] text-white/50">
      Ref Pt
      <select
        class="mt-1 w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-xs"
        bind:value={refPointIdx}
        title="Reference point used to choose offset side"
      >
        {#each points as p, i (i)}
          <option value={i}>P{i}</option>
        {/each}
      </select>
    </label>
  </div>

  <button class="btn variant-filled-primary w-full" onclick={calcOffsetIntersection}>
    Compute intersection
  </button>

  {#if intersection}
    <div class="rounded-xl bg-black/25 border border-white/10 p-3 space-y-1">
      <div class="text-[11px] text-white/60 uppercase tracking-widest">Result</div>
      <div class="font-mono text-xs">X {intersection.p.x.toFixed(4)}</div>
      <div class="font-mono text-xs">Y {intersection.p.y.toFixed(4)}</div>
      <div class="font-mono text-xs">Z {intersection.p.z.toFixed(4)}</div>
      <div class="font-mono text-[11px] text-white/50">
        skew Δ {Number.isFinite(intersection.skew) ? intersection.skew.toExponential(2) : '—'}
      </div>
    </div>
  {/if}
</div>
