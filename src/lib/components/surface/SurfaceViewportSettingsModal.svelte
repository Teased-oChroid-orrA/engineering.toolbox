<script lang="ts">
  let {
    open,
    onClose,
    showSelectionLabels = $bindable(true),
    showPointEntities = $bindable(true),
    showLineEntities = $bindable(true),
    showSurfaceEntities = $bindable(true),
    showDatumEntities = $bindable(true),
    snapEndpoints = $bindable(true),
    snapMidpoints = $bindable(false),
    snapCurveNearest = $bindable(false),
    snapSurfaceProjection = $bindable(false),
    snapThresholdPx = $bindable(16)
  } = $props<{
    open: boolean;
    onClose: () => void;
    showSelectionLabels?: boolean;
    showPointEntities?: boolean;
    showLineEntities?: boolean;
    showSurfaceEntities?: boolean;
    showDatumEntities?: boolean;
    snapEndpoints?: boolean;
    snapMidpoints?: boolean;
    snapCurveNearest?: boolean;
    snapSurfaceProjection?: boolean;
    snapThresholdPx?: number;
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
    <div class="w-[420px] max-w-[92vw] rounded-2xl border border-white/15 bg-slate-950/95 shadow-2xl p-4 space-y-4">
      <div class="flex items-center justify-between">
        <div class="text-sm font-semibold tracking-wide text-white/90">Viewport Settings</div>
        <button class="btn btn-xs variant-soft" onclick={onClose}>Close</button>
      </div>
      <div class="space-y-2">
        <div class="text-[11px] uppercase tracking-widest text-white/45">Labels</div>
        <label class="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
          <span>Show Selection Labels (P/L/S)</span>
          <input type="checkbox" class="checkbox checkbox-sm" bind:checked={showSelectionLabels} />
        </label>
      </div>
      <div class="space-y-2">
        <div class="text-[11px] uppercase tracking-widest text-white/45">Visibility</div>
        <label class="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"><span>Show Points</span><input type="checkbox" class="checkbox checkbox-sm" bind:checked={showPointEntities} /></label>
        <label class="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"><span>Show Lines</span><input type="checkbox" class="checkbox checkbox-sm" bind:checked={showLineEntities} /></label>
        <label class="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"><span>Show Surfaces</span><input type="checkbox" class="checkbox checkbox-sm" bind:checked={showSurfaceEntities} /></label>
        <label class="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"><span>Show Datums (CSYS/Planes)</span><input type="checkbox" class="checkbox checkbox-sm" bind:checked={showDatumEntities} /></label>
      </div>
      <div class="space-y-2">
        <div class="text-[11px] uppercase tracking-widest text-white/45">Snapping</div>
        <label class="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"><span>Endpoints</span><input type="checkbox" class="checkbox checkbox-sm" bind:checked={snapEndpoints} /></label>
        <label class="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"><span>Midpoints</span><input type="checkbox" class="checkbox checkbox-sm" bind:checked={snapMidpoints} /></label>
        <label class="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"><span>Curve Nearest</span><input type="checkbox" class="checkbox checkbox-sm" bind:checked={snapCurveNearest} /></label>
        <label class="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"><span>Surface Projection</span><input type="checkbox" class="checkbox checkbox-sm" bind:checked={snapSurfaceProjection} /></label>
        <label class="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"><span>Snap Radius (px)</span><input type="number" min="4" max="40" step="1" class="input input-xs glass-input w-20" bind:value={snapThresholdPx} /></label>
      </div>
    </div>
  </div>
{/if}
