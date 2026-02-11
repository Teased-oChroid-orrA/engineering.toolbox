<script lang="ts">
  export let open = false;
  export let panelEl: HTMLElement | null = null;
  export let pointsCount = 0;
  export let minLinePoints = 2;
  export let minSurfacePoints = 3;
  export let creatorHint = '';
  export let surfaceFlowHint = '';
  export let surfaceDraft: number[] = [];
  export let surfaceDraftRequired = 3;
  export let surfaceCreateKind: 'triangle' | 'quad' | 'contour' = 'triangle';
  export let creatorPick: { kind: 'line' | 'surface'; slot: 'A' | 'B' | number } | null = null;
  export let createLineA: number | null = null;
  export let createLineB: number | null = null;
  export let createPtX = 0;
  export let createPtY = 0;
  export let createPtZ = 0;
  export let onClose: () => void;
  export let beginLinePick: (slot: 'A' | 'B') => void;
  export let beginSurfacePick: (slot: number) => void;
  export let addPoint: () => void;
  export let finishContourSurface: () => void;
</script>

{#if open}
  <div class="fixed inset-0 z-[300] flex items-center justify-center bg-black/55 backdrop-blur-[1px]" role="button" tabindex="0" onpointerdown={(e) => { if (e.target === e.currentTarget) onClose(); }} onkeydown={(e) => { if (e.key === 'Escape') onClose(); }}>
    <div class="w-[620px] max-w-[94vw] rounded-2xl border border-white/15 bg-slate-950/95 shadow-2xl p-4 space-y-4" bind:this={panelEl}>
      <div class="flex items-center justify-between"><div class="text-sm font-semibold tracking-wide text-white/90">Create Geometry</div><button class="btn btn-xs variant-soft" onclick={onClose}>Close</button></div>
      <div class="text-[11px] text-white/45">{creatorHint}</div>
      {#if pointsCount < minSurfacePoints}
        <div class="rounded-lg border border-amber-300/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-100/90">Point-first rule: add points before creating lines/surfaces. Current points: {pointsCount}</div>
      {/if}
      <div class="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
        <div class="text-[11px] text-white/50 uppercase tracking-widest">Point</div>
        <div class="grid grid-cols-3 gap-2">
          <input type="number" step="0.1" class="input input-sm glass-input" bind:value={createPtX} placeholder="X" />
          <input type="number" step="0.1" class="input input-sm glass-input" bind:value={createPtY} placeholder="Y" />
          <input type="number" step="0.1" class="input input-sm glass-input" bind:value={createPtZ} placeholder="Z" />
        </div>
        <button class="btn btn-sm variant-soft w-full" onclick={addPoint}>+ Add point</button>
      </div>
      <div class="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
        <div class="text-[11px] text-white/50 uppercase tracking-widest">Line</div>
        <div class="grid grid-cols-2 gap-2">
          <button class={creatorPick?.kind === 'line' && creatorPick.slot === 'A' ? 'btn btn-xs variant-soft' : 'btn btn-xs variant-soft opacity-70'} onclick={() => beginLinePick('A')} disabled={pointsCount < minLinePoints}>Pick A ({createLineA == null ? '-' : `P${createLineA + 1}`})</button>
          <button class={creatorPick?.kind === 'line' && creatorPick.slot === 'B' ? 'btn btn-xs variant-soft' : 'btn btn-xs variant-soft opacity-70'} onclick={() => beginLinePick('B')} disabled={pointsCount < minLinePoints}>Pick B ({createLineB == null ? '-' : `P${createLineB + 1}`})</button>
        </div>
      </div>
      <div class="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
        <div class="flex items-center justify-between">
          <div class="text-[11px] text-white/50 uppercase tracking-widest">Surface</div>
          <select class="select select-xs glass-input w-28" bind:value={surfaceCreateKind}><option value="triangle">Triangle</option><option value="quad">Quad</option><option value="contour">Contour</option></select>
        </div>
        <div class="rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-[11px] text-white/70">{surfaceFlowHint}</div>
        <div class="flex items-center gap-2">
          <button class={creatorPick?.kind === 'surface' ? 'btn btn-xs variant-soft' : 'btn btn-xs variant-soft opacity-70'} onclick={() => beginSurfacePick(surfaceDraft.length)} disabled={pointsCount < minSurfacePoints}>Pick sequence</button>
          <button class="btn btn-xs variant-soft opacity-80" onclick={() => { surfaceDraft = []; creatorPick = null; }}>Reset</button>
          <button class="btn btn-xs variant-soft opacity-80" disabled={surfaceCreateKind !== 'contour' || surfaceDraft.length < 3} onclick={finishContourSurface}>Finish contour</button>
        </div>
        <div class="flex items-center justify-between text-[11px] font-mono text-white/65">
          <span>Draft: {surfaceDraft.length === 0 ? 'none' : surfaceDraft.map((p) => `P${p + 1}`).join(' -> ')}</span>
          <span>{#if surfaceCreateKind === 'contour'}min 3{:else}{surfaceDraft.length}/{surfaceDraftRequired}{/if}</span>
        </div>
      </div>
    </div>
  </div>
{/if}
