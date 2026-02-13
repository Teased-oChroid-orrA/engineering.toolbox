<script lang="ts">
  /**
   * Undo/Redo controls for layout management
   */
  export let canUndo = false;
  export let canRedo = false;
  export let onUndo: () => void;
  export let onRedo: () => void;
</script>

<div class="mt-2 flex gap-2 justify-center">
  <button
    disabled={!canUndo}
    onclick={onUndo}
    class="px-3 py-1.5 text-xs rounded transition-all
           {canUndo 
             ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-400/40' 
             : 'bg-gray-700/20 text-gray-500 border border-gray-600/20 cursor-not-allowed'}"
    title="Undo layout change (Ctrl+Z)">
    ← Undo
  </button>
  <button
    disabled={!canRedo}
    onclick={onRedo}
    class="px-3 py-1.5 text-xs rounded transition-all
           {canRedo 
             ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-400/40' 
             : 'bg-gray-700/20 text-gray-500 border border-gray-600/20 cursor-not-allowed'}"
    title="Redo layout change (Ctrl+Y)">
    Redo →
  </button>
</div>
