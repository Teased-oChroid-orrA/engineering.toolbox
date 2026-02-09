<script lang="ts">
  type SelectionMode = 'none' | 'box' | 'lasso';

  export let selectionMode: SelectionMode;
  export let curveMode: boolean;
  export let selectedCount: number;

  export let setSelectionMode: (m: SelectionMode) => void;
  export let clearSelection: () => void;
  export let invertSelection: () => void;
</script>

<div class="glass-panel rounded-xl px-3 py-2 flex items-center gap-2">
  <div class="text-[11px] text-white/60 uppercase tracking-widest">Select</div>
  <button
    class={selectionMode === 'none' ? 'btn btn-xs variant-soft' : 'btn btn-xs variant-soft opacity-70'}
    onclick={() => setSelectionMode('none')}
    title="Selection off"
  >
    Off
  </button>
  <button
    class={selectionMode === 'box' ? 'btn btn-xs variant-soft' : 'btn btn-xs variant-soft opacity-70'}
    onclick={() => setSelectionMode(selectionMode === 'box' ? 'none' : 'box')}
    disabled={curveMode}
    title="Box select (drag). Hold Shift=add, Alt=subtract"
  >
    Box
  </button>
  <button
    class={selectionMode === 'lasso' ? 'btn btn-xs variant-soft' : 'btn btn-xs variant-soft opacity-70'}
    onclick={() => setSelectionMode(selectionMode === 'lasso' ? 'none' : 'lasso')}
    disabled={curveMode}
    title="Lasso select (draw). Hold Shift=add, Alt=subtract"
  >
    Lasso
  </button>
  <div class="text-[11px] text-white/50 font-mono px-2">{selectedCount}</div>
  <button class="btn btn-xs variant-soft" onclick={clearSelection} disabled={selectedCount === 0} title="Clear selection">
    Clear
  </button>
  <button class="btn btn-xs variant-soft" onclick={invertSelection} title="Invert selection">
    Invert
  </button>
</div>
