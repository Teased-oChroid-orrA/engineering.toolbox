<script lang="ts">
  type Point3D = { x: number; y: number; z: number };
  type Edge = [number, number];
  type Curve = { name: string; pts: number[] };

  export let edges: Edge[];
  export let activeEdgeIdx: number | null;
  export let setActiveEdgeIdx: (i: number) => void;
  export let deleteEdge: (i: number) => void;

  export let curves: Curve[];
  export let activeCurveIdx: number | null;
  export let setActiveCurveIdx: (i: number) => void;
  export let deleteCurve: (i: number) => void;
  export let createCurve: () => void;
  export let curveMode: boolean;
  export let toggleCurveMode: () => void;

  export let loftA: number | null;
  export let loftB: number | null;
  export let setLoftA: (v: number | null) => void;
  export let setLoftB: (v: number | null) => void;
  export let rebuildLoftSegments: () => void;
  export let loftSegmentsCount: number;
  export let loftErr: string | null;
</script>

<div class="space-y-2">
  <div class="text-[11px] text-white/50 uppercase tracking-widest">Edges</div>
  <div class="max-h-56 overflow-auto pr-1 custom-scrollbar space-y-1">
    {#each edges as e, i (i)}
      <div class="flex items-center gap-2">
        <button
          class={
            'w-full text-left px-3 py-2 rounded-xl border text-xs font-mono transition-all ' +
            (i === activeEdgeIdx
              ? 'bg-indigo-500/15 border-indigo-500/30 text-white'
              : 'bg-white/5 hover:bg-white/7 border-white/10 text-white/70')
          }
          onclick={() => setActiveEdgeIdx(i)}
          title="Click to activate for interpolation"
        >
          {i.toString().padStart(2, '0')}: P{e[0]} → P{e[1]}
        </button>
        <button class="btn btn-xs variant-soft opacity-80" onclick={() => deleteEdge(i)} title="Delete edge">✕</button>
      </div>
    {/each}
  </div>
</div>

<div class="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
  <div class="flex items-center justify-between">
    <div class="text-[11px] font-semibold uppercase tracking-widest text-white/60">Lofting</div>
    <div class="flex items-center gap-2">
      <button
        class={curveMode ? 'btn btn-xs variant-soft' : 'btn btn-xs variant-soft opacity-70'}
        onclick={toggleCurveMode}
        title="When ON, clicking points appends to the active curve"
      >
        Curve Mode
      </button>
      <button class="btn btn-xs variant-soft" onclick={createCurve}>+ Curve</button>
    </div>
  </div>

  {#if curves.length === 0}
    <div class="text-[11px] text-white/40 italic">
      Create two curves, enable Curve Mode, then click points in order to define each section curve.
    </div>
  {:else}
    <div class="space-y-2">
      {#each curves as c, ci (ci)}
        <div class="flex items-center justify-between gap-2 rounded-xl bg-black/20 border border-white/10 px-3 py-2">
          <button
            class={'text-left text-xs font-mono flex-1 ' + (ci === activeCurveIdx ? 'text-white' : 'text-white/70')}
            onclick={() => setActiveCurveIdx(ci)}
            title="Set active curve (for Curve Mode appends)"
          >
            {c.name} • {c.pts.length} pts
          </button>
          <button class="btn btn-xs variant-soft opacity-80" onclick={() => deleteCurve(ci)} title="Delete curve">✕</button>
        </div>
      {/each}
    </div>

    <div class="grid grid-cols-2 gap-2">
      <label class="text-[11px] text-white/50">
        Loft A
        <select
          class="mt-1 w-full select select-sm glass-input"
          value={loftA ?? ''}
          onchange={(e) => {
            const v = (e.currentTarget as HTMLSelectElement).value;
            setLoftA(v === '' ? null : Number(v));
            rebuildLoftSegments();
          }}
        >
          <option value="">—</option>
          {#each curves as c, ci (ci)}
            <option value={ci}>{c.name}</option>
          {/each}
        </select>
      </label>
      <label class="text-[11px] text-white/50">
        Loft B
        <select
          class="mt-1 w-full select select-sm glass-input"
          value={loftB ?? ''}
          onchange={(e) => {
            const v = (e.currentTarget as HTMLSelectElement).value;
            setLoftB(v === '' ? null : Number(v));
            rebuildLoftSegments();
          }}
        >
          <option value="">—</option>
          {#each curves as c, ci (ci)}
            <option value={ci}>{c.name}</option>
          {/each}
        </select>
      </label>
    </div>

    {#if loftErr}
      <div class="text-[11px] text-red-200/80 font-mono">{loftErr}</div>
    {/if}

    <div class="text-[11px] text-white/40">
      {#if loftSegmentsCount}
        Loft preview: {loftSegmentsCount} segments (drawn dashed in viewport)
      {:else}
        Select Loft A/B to preview a ruled loft (rail + connectors).
      {/if}
    </div>
  {/if}
</div>
