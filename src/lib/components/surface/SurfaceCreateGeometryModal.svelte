<script lang="ts">
  import type { Point3D } from './SurfaceOrchestratorDeps';

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
  export let points: Point3D[] = [];
  export let edges: [number, number][] = [];
  export let surfaces: { pts: number[]; name?: string }[] = [];
  export let onClose: () => void;
  export let beginSurfacePick: (slot: number) => void;
  export let finishContourSurface: () => void;
  export let createSurfaceFromDraft: () => void;
  export let onAddPointsBatch: (points: Point3D[]) => void;
  export let onConnectPoints: (a: number, b: number) => void;
  export let onDeletePoint: (idx: number) => void;
  export let onDeleteLine: (idx: number) => void;
  export let onDeleteSurface: (idx: number) => void;
  export let onToggleSurfacePoint: (idx: number) => void;
  export let onAddSurfaceFromLine: (lineIdx: number) => void;

  let xyzInput = '';
  let stagedPoints: Point3D[] = [];
  let parseError: string | null = null;
  let lineStartIdx: number | null = null;
  let lineEndIdx: number | null = null;

  const parseCoordinate = (raw: string): Point3D | null => {
    const normalized = raw.trim().replace(/^\(/, '').replace(/\)$/, '');
    const parts = normalized.split(/[\s,]+/).filter(Boolean);
    if (parts.length !== 3) return null;
    const nums = parts.map((part) => Number(part));
    if (nums.some((value) => !Number.isFinite(value))) return null;
    return { x: nums[0], y: nums[1], z: nums[2] };
  };

  const addStagedPoint = () => {
    const parsed = parseCoordinate(xyzInput);
    if (!parsed) {
      parseError = 'Use format (X, Y, Z), e.g. (12.4, -3, 0)';
      return false;
    }
    stagedPoints = [...stagedPoints, parsed];
    xyzInput = '';
    parseError = null;
    return true;
  };

  const saveStagedPoints = () => {
    if (stagedPoints.length === 0) return;
    onAddPointsBatch(stagedPoints);
    stagedPoints = [];
  };

  const handleInputKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();

    if ((event.metaKey || event.ctrlKey) && xyzInput.trim()) {
      if (addStagedPoint()) saveStagedPoints();
      return;
    }
    if (!xyzInput.trim() && stagedPoints.length > 0) {
      saveStagedPoints();
      return;
    }
    addStagedPoint();
  };

  const toggleLinePoint = (idx: number) => {
    if (lineStartIdx === idx) {
      lineStartIdx = null;
      return;
    }
    if (lineEndIdx === idx) {
      lineEndIdx = null;
      return;
    }
    if (lineStartIdx === null) {
      lineStartIdx = idx;
      return;
    }
    if (lineEndIdx === null) {
      lineEndIdx = idx;
      return;
    }
    lineStartIdx = lineEndIdx;
    lineEndIdx = idx;
  };

  const connectSelectedPoints = () => {
    if (lineStartIdx === null || lineEndIdx === null || lineStartIdx === lineEndIdx) return;
    onConnectPoints(lineStartIdx, lineEndIdx);
    lineStartIdx = lineEndIdx;
    lineEndIdx = null;
  };
</script>

{#if open}
  <div class="fixed inset-0 z-[300] flex items-center justify-center bg-black/55 backdrop-blur-[1px]" role="button" tabindex="0" onpointerdown={(e) => { if (e.target === e.currentTarget) onClose(); }} onkeydown={(e) => { if (e.key === 'Escape') onClose(); }}>
    <div class="w-[760px] max-w-[96vw] rounded-2xl border border-cyan-300/25 bg-slate-950/95 shadow-2xl p-4 space-y-4" bind:this={panelEl}>
      <div class="flex items-center justify-between">
        <div>
          <div class="text-sm font-semibold tracking-wide text-white/90">Surface Builder</div>
          <div class="text-[11px] text-white/50">Quick path: Add points -> Connect lines -> Select surface points -> Create surface. {creatorHint}</div>
        </div>
        <button class="btn btn-xs variant-soft" onclick={onClose}>Close</button>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div class="rounded-xl border border-white/10 bg-white/5 p-3 space-y-3">
          <div class="text-[11px] text-cyan-200/80 uppercase tracking-widest">Coordinate Input</div>
          <div class="text-[11px] text-white/60">Enter one coordinate at a time: <span class="font-mono text-white/80">(X, Y, Z)</span></div>
          <div class="flex gap-2">
            <input
              type="text"
              class="input input-sm glass-input flex-1"
              placeholder="(12.4, -3, 0)"
              bind:value={xyzInput}
              onkeydown={handleInputKeydown}
            />
            <button class="btn btn-sm variant-soft" onclick={addStagedPoint}>+ Add</button>
          </div>
          {#if parseError}
            <div class="text-[11px] text-amber-200/90">{parseError}</div>
          {/if}
          <div class="rounded-lg border border-white/10 bg-black/20 p-2 max-h-40 overflow-auto space-y-1">
            {#if stagedPoints.length === 0}
              <div class="text-[11px] text-white/40">No staged coordinates yet.</div>
            {:else}
              {#each stagedPoints as point, i}
                <div class="flex items-center justify-between text-[11px] font-mono text-white/75">
                  <span>P{pointsCount + i + 1}: ({point.x}, {point.y}, {point.z})</span>
                  <button class="text-white/50 hover:text-white" onclick={() => { stagedPoints = stagedPoints.filter((_, idx) => idx !== i); }}>✕</button>
                </div>
              {/each}
            {/if}
          </div>
          <div class="flex items-center gap-2">
            <button class="btn btn-sm variant-soft" onclick={saveStagedPoints} disabled={stagedPoints.length === 0}>Save Coordinates</button>
            <div class="text-[11px] text-white/45">Press Enter to add, or Enter on empty input to save.</div>
          </div>
        </div>

        {#if points.length > 0}
          <div class="rounded-xl border border-white/10 bg-white/5 p-3 space-y-3">
            <div class="text-[11px] text-cyan-200/80 uppercase tracking-widest">Connect Lines</div>
            <div class="text-[11px] text-white/60">Only shown when points exist. Click two points to connect a line.</div>
            <div class="rounded-lg border border-white/10 bg-black/20 p-2 max-h-44 overflow-auto flex flex-wrap gap-2">
              {#each points as point, idx}
                {@const selected = idx === lineStartIdx || idx === lineEndIdx}
                <button
                  class={selected ? 'px-2 py-1 rounded border border-cyan-300/70 bg-cyan-500/15 text-cyan-100 text-[11px] font-mono' : 'px-2 py-1 rounded border border-white/15 bg-white/5 hover:bg-white/10 text-white/70 text-[11px] font-mono'}
                  onclick={() => toggleLinePoint(idx)}
                >
                  P{idx + 1} ({point.x}, {point.y}, {point.z})
                </button>
              {/each}
            </div>
            <div class="flex items-center justify-between text-[11px] text-white/60 font-mono">
              <span>A: {lineStartIdx === null ? '-' : `P${lineStartIdx + 1}`}</span>
              <span>B: {lineEndIdx === null ? '-' : `P${lineEndIdx + 1}`}</span>
            </div>
            <button class="btn btn-sm variant-soft w-full" onclick={connectSelectedPoints} disabled={lineStartIdx === null || lineEndIdx === null || lineStartIdx === lineEndIdx || points.length < minLinePoints}>Connect Selected Points</button>
          </div>
        {/if}
      </div>

      {#if surfaces.length > 0}
      <div class="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
        <div class="text-[11px] text-cyan-200/80 uppercase tracking-widest">Surfaces In Grid</div>
        <div class="rounded-lg border border-white/10 bg-black/20 p-2 max-h-36 overflow-auto space-y-1">
          {#each surfaces as sf, idx}
            <div class="flex items-center justify-between text-[11px] font-mono text-white/75">
              <span>S{idx + 1}: {sf.pts.map((p) => `P${p + 1}`).join(' → ')}</span>
              <button
                class="px-2 py-0.5 rounded border border-orange-300/30 bg-orange-500/10 text-orange-100/90 hover:bg-orange-500/20"
                onclick={() => onDeleteSurface(idx)}
                title="Delete surface"
              >
                Delete
              </button>
            </div>
          {/each}
        </div>
      </div>
      {/if}

      {#if points.length > 0 || edges.length > 0}
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {#if points.length > 0}
        <div class="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
          <div class="text-[11px] text-cyan-200/80 uppercase tracking-widest">Points In Grid</div>
          <div class="rounded-lg border border-white/10 bg-black/20 p-2 max-h-40 overflow-auto space-y-1">
            {#each points as point, idx}
              <div class="flex items-center justify-between text-[11px] font-mono text-white/75">
                <span>P{idx + 1}: ({point.x}, {point.y}, {point.z})</span>
                <button
                  class="px-2 py-0.5 rounded border border-rose-300/30 bg-rose-500/10 text-rose-200/90 hover:bg-rose-500/20"
                  onclick={() => onDeletePoint(idx)}
                  title="Delete point (connected lines will be removed automatically)"
                >
                  Delete
                </button>
              </div>
            {/each}
          </div>
        </div>
        {/if}

        {#if edges.length > 0}
        <div class="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
          <div class="text-[11px] text-cyan-200/80 uppercase tracking-widest">Lines In Grid</div>
          <div class="rounded-lg border border-white/10 bg-black/20 p-2 max-h-40 overflow-auto space-y-1">
            {#each edges as edge, idx}
              <div class="flex items-center justify-between text-[11px] font-mono text-white/75">
                <span>L{idx + 1}: P{edge[0] + 1} -> P{edge[1] + 1}</span>
                <button
                  class="px-2 py-0.5 rounded border border-amber-300/30 bg-amber-500/10 text-amber-100/90 hover:bg-amber-500/20"
                  onclick={() => onDeleteLine(idx)}
                  title="Delete line only (points remain)"
                >
                  Delete
                </button>
              </div>
            {/each}
          </div>
        </div>
        {/if}
      </div>
      {/if}

      {#if points.length >= minSurfacePoints}
      <div class="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
        <div class="flex items-center justify-between">
          <div class="text-[11px] text-white/50 uppercase tracking-widest">Surface</div>
          <select class="select select-xs glass-input w-28" bind:value={surfaceCreateKind}><option value="triangle">Triangle</option><option value="quad">Quad</option><option value="contour">Contour</option></select>
        </div>
        <div class="rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-[11px] text-white/70">{surfaceFlowHint || 'Pick points or lines to build a valid surface draft.'}</div>
        <div class="text-[11px] text-white/60">Only shown when there are enough points for a surface.</div>
        <div class="rounded-lg border border-white/10 bg-black/20 p-2 max-h-28 overflow-auto flex flex-wrap gap-2">
          {#each points as _, idx}
            {@const active = surfaceDraft.includes(idx)}
            <button
              class={active ? 'px-2 py-1 rounded border border-cyan-300/70 bg-cyan-500/15 text-cyan-100 text-[11px] font-mono' : 'px-2 py-1 rounded border border-white/15 bg-white/5 hover:bg-white/10 text-white/70 text-[11px] font-mono'}
              onclick={() => onToggleSurfacePoint(idx)}
            >
              P{idx + 1}
            </button>
          {/each}
        </div>
        {#if edges.length > 0}
          <div class="rounded-lg border border-white/10 bg-black/20 p-2 max-h-24 overflow-auto flex flex-wrap gap-2">
            {#each edges as edge, idx}
              <button
                class="px-2 py-1 rounded border border-white/15 bg-white/5 hover:bg-white/10 text-white/70 text-[11px] font-mono"
                onclick={() => onAddSurfaceFromLine(idx)}
              >
                L{idx + 1} (P{edge[0] + 1}→P{edge[1] + 1})
              </button>
            {/each}
          </div>
        {/if}
        <div class="flex items-center gap-2">
          <button class={creatorPick?.kind === 'surface' ? 'btn btn-xs variant-soft' : 'btn btn-xs variant-soft opacity-70'} onclick={() => beginSurfacePick(surfaceDraft.length)} disabled={pointsCount < minSurfacePoints}>Pick sequence</button>
          <button class="btn btn-xs variant-soft opacity-80" onclick={() => { surfaceDraft = []; creatorPick = null; }}>Reset</button>
          <button class="btn btn-xs variant-soft opacity-90" disabled={surfaceDraft.length < surfaceDraftRequired} onclick={createSurfaceFromDraft}>Create surface</button>
          <button class="btn btn-xs variant-soft opacity-80" disabled={surfaceCreateKind !== 'contour' || surfaceDraft.length < 3} onclick={finishContourSurface}>Finish contour</button>
        </div>
        <div class="flex items-center justify-between text-[11px] font-mono text-white/65">
          <span>Draft: {surfaceDraft.length === 0 ? 'none' : surfaceDraft.map((p) => `P${p + 1}`).join(' -> ')}</span>
          <span>{#if surfaceCreateKind === 'contour'}min 3{:else}{surfaceDraft.length}/{surfaceDraftRequired}{/if}</span>
        </div>
      </div>
      {/if}
    </div>
  </div>
{/if}
