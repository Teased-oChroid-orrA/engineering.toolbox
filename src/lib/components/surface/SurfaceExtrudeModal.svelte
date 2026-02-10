<script lang="ts">
  import type { Point3D } from '../../surface/types';

  let {
    open,
    onClose,
    extrudeTarget = $bindable('line' as 'line' | 'curve'),
    extrudeLineIdx = $bindable(0),
    extrudeCurveIdx = $bindable(0),
    extrudeDirMode = $bindable('vector' as 'vector' | 'curve' | 'surfaceNormal'),
    extrudeDistance = $bindable(20),
    extrudeVector = $bindable({ x: 0, y: 0, z: 1 } as Point3D),
    extrudeSurfaceIdx = $bindable(0),
    extrudeFlip = $bindable(false),
    onExtrudePath
  } = $props<{
    open: boolean;
    onClose: () => void;
    extrudeTarget?: 'line' | 'curve';
    extrudeLineIdx?: number;
    extrudeCurveIdx?: number;
    extrudeDirMode?: 'vector' | 'curve' | 'surfaceNormal';
    extrudeDistance?: number;
    extrudeVector?: Point3D;
    extrudeSurfaceIdx?: number;
    extrudeFlip?: boolean;
    onExtrudePath: () => void;
  }>();
</script>

{#if open}
  <div
    class="fixed inset-0 z-[300] flex items-center justify-center bg-black/55 backdrop-blur-[1px]"
    role="button"
    tabindex="0"
    onpointerdown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    onkeydown={(e) => { if (e.key === 'Escape') onClose(); }}
  >
    <div class="w-[560px] max-w-[92vw] rounded-2xl border border-white/15 bg-slate-950/95 shadow-2xl p-4 space-y-4">
      <div class="flex items-center justify-between">
        <div class="text-sm font-semibold tracking-wide text-white/90">Extrude</div>
        <button class="btn btn-xs variant-soft" onclick={onClose}>Close</button>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <select class="select select-xs glass-input" bind:value={extrudeTarget}>
          <option value="line">Line</option>
          <option value="curve">Curve</option>
        </select>
        {#if extrudeTarget === 'line'}
          <input class="input input-xs glass-input" type="number" min="0" bind:value={extrudeLineIdx} title="Line index" />
        {:else}
          <input class="input input-xs glass-input" type="number" min="0" bind:value={extrudeCurveIdx} title="Curve index" />
        {/if}
      </div>
      <div class="grid grid-cols-2 gap-2">
        <select class="select select-xs glass-input" bind:value={extrudeDirMode}>
          <option value="vector">Vector</option>
          <option value="curve">Along Curve</option>
          <option value="surfaceNormal">Surface Normal</option>
        </select>
        <input class="input input-xs glass-input" type="number" step="0.1" bind:value={extrudeDistance} title="Distance" />
      </div>
      {#if extrudeDirMode === 'vector'}
        <div class="grid grid-cols-3 gap-2">
          <input class="input input-xs glass-input" type="number" step="0.1" bind:value={extrudeVector.x} title="Vx" />
          <input class="input input-xs glass-input" type="number" step="0.1" bind:value={extrudeVector.y} title="Vy" />
          <input class="input input-xs glass-input" type="number" step="0.1" bind:value={extrudeVector.z} title="Vz" />
        </div>
      {:else if extrudeDirMode === 'surfaceNormal'}
        <input class="input input-xs glass-input w-full" type="number" min="0" bind:value={extrudeSurfaceIdx} title="Surface index" />
      {/if}
      <label class="flex items-center justify-between text-[11px] text-white/60"><span>Flip Direction</span><input type="checkbox" class="checkbox checkbox-xs" bind:checked={extrudeFlip} /></label>
      <button class="btn btn-xs variant-soft w-full" onclick={onExtrudePath}>Extrude Path</button>
    </div>
  </div>
{/if}
