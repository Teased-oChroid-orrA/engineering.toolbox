<script lang="ts">
  type Point3D = { x: number; y: number; z: number };
  type Edge = [number, number];
  type IntersectionRes = { p: Point3D; skew: number };
  type IntersectionDiag = {
    severity: 'info' | 'warning' | 'error' | null;
    message: string | null;
    angleDeg: number | null;
    skew: number | null;
    recommendations: { label: string; confidence: number; rationale: string }[];
  };

  export let edges: Edge[] = [];
  export let points: Point3D[] = [];

  // Bound state
  export let selEdgeA: number | null;
  export let selEdgeB: number | null;
  export let offsetDist: number;
  export let refPointIdx: number;

  export let intersection: IntersectionRes | null = null;
  export let intersectionBusy: boolean = false;
  export let intersectionDiagnostics: IntersectionDiag = {
    severity: null,
    message: null,
    angleDeg: null,
    skew: null,
    recommendations: []
  };
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

  <button class="btn variant-filled-primary w-full" onclick={calcOffsetIntersection} disabled={intersectionBusy}>
    {intersectionBusy ? 'Computing...' : 'Compute intersection'}
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

  {#if intersectionDiagnostics.message}
    <div
      class={`rounded-xl border p-3 space-y-2 ${
        intersectionDiagnostics.severity === 'error'
          ? 'border-rose-400/35 bg-rose-500/10 text-rose-200'
          : intersectionDiagnostics.severity === 'warning'
            ? 'border-amber-300/30 bg-amber-400/10 text-amber-100'
            : 'border-cyan-300/25 bg-cyan-400/10 text-cyan-100'
      }`}
    >
      <div class="text-[11px] font-semibold uppercase tracking-widest">{intersectionDiagnostics.severity ?? 'info'}</div>
      <div class="text-[12px]">{intersectionDiagnostics.message}</div>
      {#if intersectionDiagnostics.angleDeg != null}
        <div class="text-[11px] font-mono opacity-90">Angle: {intersectionDiagnostics.angleDeg.toFixed(4)}°</div>
      {/if}
      {#if intersectionDiagnostics.recommendations.length > 0}
        <div class="space-y-1">
          <div class="text-[10px] uppercase tracking-widest opacity-80">Recommendations</div>
          {#each intersectionDiagnostics.recommendations as rec (rec.label)}
            <div class="rounded-lg border border-white/15 bg-black/20 p-2 space-y-1">
              <div class="flex items-center justify-between text-[11px]">
                <span>{rec.label}</span>
                <span class="font-mono">{Math.round(rec.confidence * 100)}%</span>
              </div>
              <div class="h-1.5 rounded bg-white/10 overflow-hidden">
                <div class="h-full bg-cyan-300/80" style={`width:${Math.max(0, Math.min(100, rec.confidence * 100))}%`}></div>
              </div>
              <div class="text-[10px] opacity-80">{rec.rationale}</div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>
