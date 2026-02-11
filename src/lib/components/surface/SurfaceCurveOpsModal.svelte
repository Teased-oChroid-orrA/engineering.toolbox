<script lang="ts">
  import type { ToolCursorMode } from './controllers/SurfaceCursorController';

  export let open = false;
  export let panelEl: HTMLElement | null = null;
  export let selectedEntity: { kind: 'point' | 'line' | 'surface' | 'plane' | 'csys'; index: number } | null = null;
  export let lineInsertT = 0.5;
  export let lineInsertPickMode = false;
  export let toolCursor: ToolCursorMode = 'select';
  export let offsetSurfaceIdx = 0;
  export let offsetSurfaceDist = 0;
  export let offsetCurveIdx = 0;
  export let offsetCurveSurfaceIdx = 0;
  export let offsetCurveDist = 0;
  export let offsetCurveFlip = false;
  export let offsetCurveStatus: { method: string | null; severity: 'info' | 'warning' | 'error' | null; message: string | null };

  export let onClose: () => void;
  export let insertPointOnEdge: (edgeIdx: number, tRaw: number) => void;
  export let setToolCursor: (mode: ToolCursorMode) => void;
  export let offsetSurfaceCreate: () => void;
  export let offsetCurveOnSurfaceCreate: () => void;
</script>

{#if open}
  <div class="fixed inset-0 z-[300] flex items-center justify-center bg-black/55 backdrop-blur-[1px]" role="button" tabindex="0" onpointerdown={(e) => { if (e.target === e.currentTarget) onClose(); }} onkeydown={(e) => { if (e.key === 'Escape') onClose(); }}>
    <div class="w-[620px] max-w-[94vw] rounded-2xl border border-white/15 bg-slate-950/95 shadow-2xl p-4 space-y-4" bind:this={panelEl}>
      <div class="flex items-center justify-between">
        <div class="text-sm font-semibold tracking-wide text-white/90">Surface / Curve Operations</div>
        <button class="btn btn-xs variant-soft" onclick={onClose}>Close</button>
      </div>
      <div class="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
        <div class="text-[11px] text-white/50 uppercase tracking-widest">Selected Line Actions</div>
        <div class="text-[11px] text-white/45">{selectedEntity?.kind === 'line' ? `L${selectedEntity.index + 1}` : 'No line selected'}</div>
        <div class="grid grid-cols-[1fr_auto] gap-2 items-center"><input type="range" min="0" max="1" step="0.01" bind:value={lineInsertT} /><div class="text-[11px] font-mono text-white/70">{(lineInsertT * 100).toFixed(0)}%</div></div>
        <div class="flex items-center gap-2">
          <button class="btn btn-xs variant-soft" disabled={selectedEntity?.kind !== 'line'} onclick={() => selectedEntity?.kind === 'line' && insertPointOnEdge(selectedEntity.index, 0.5)}>Insert midpoint</button>
          <button class="btn btn-xs variant-soft" disabled={selectedEntity?.kind !== 'line'} onclick={() => selectedEntity?.kind === 'line' && insertPointOnEdge(selectedEntity.index, lineInsertT)}>Insert at %</button>
          <button class={lineInsertPickMode ? 'btn btn-xs variant-soft' : 'btn btn-xs variant-soft opacity-70'} onclick={() => { if (toolCursor === 'insert') setToolCursor('select'); else setToolCursor('insert'); }}>Insert from click</button>
        </div>
      </div>
      <div class="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
        <div class="text-[11px] text-white/50 uppercase tracking-widest">Offset Surface</div>
        <div class="grid grid-cols-2 gap-2"><input class="input input-xs glass-input" type="number" min="0" bind:value={offsetSurfaceIdx} title="Surface index" /><input class="input input-xs glass-input" type="number" step="0.1" bind:value={offsetSurfaceDist} title="Offset distance" /></div>
        <button class="btn btn-xs variant-soft w-full" onclick={offsetSurfaceCreate}>Create Offset Surface</button>
      </div>
      <div class="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
        <div class="text-[11px] text-white/50 uppercase tracking-widest">Offset Curve On Surface</div>
        <div class="grid grid-cols-3 gap-2"><input class="input input-xs glass-input" type="number" min="0" bind:value={offsetCurveIdx} title="Curve index" /><input class="input input-xs glass-input" type="number" min="0" bind:value={offsetCurveSurfaceIdx} title="Surface index" /><input class="input input-xs glass-input" type="number" step="0.1" bind:value={offsetCurveDist} title="Offset distance" /></div>
        <label class="flex items-center justify-between text-[11px] text-white/60"><span>Flip</span><input type="checkbox" class="checkbox checkbox-xs" bind:checked={offsetCurveFlip} /></label>
        <button class="btn btn-xs variant-soft w-full" onclick={offsetCurveOnSurfaceCreate}>Create Offset Curve</button>
        {#if offsetCurveStatus.method}
          <div class={`rounded-lg border px-2 py-2 text-[11px] ${offsetCurveStatus.severity === 'error' ? 'border-rose-400/35 bg-rose-500/10 text-rose-200' : offsetCurveStatus.severity === 'warning' ? 'border-amber-300/30 bg-amber-400/10 text-amber-100' : 'border-cyan-300/25 bg-cyan-400/10 text-cyan-100'}`}>
            <div class="font-mono uppercase tracking-widest text-[10px]">Method: {offsetCurveStatus.method}</div>
            {#if offsetCurveStatus.message}<div class="mt-1">{offsetCurveStatus.message}</div>{/if}
            {#if offsetCurveStatus.severity === 'error'}<div class="mt-1 text-[10px] opacity-90">Recommendation: reduce offset distance, simplify curve, or use a smoother support surface patch.</div>{:else if offsetCurveStatus.severity === 'warning'}<div class="mt-1 text-[10px] opacity-90">Recommendation: inspect deviation and reduce local curvature for higher fidelity.</div>{/if}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
