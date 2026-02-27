<script lang="ts">
  import { ITEM_LIBRARY } from '$lib/core/weight-balance/sampleData';
  export let selectedCategory: 'occupants' | 'fuel' | 'baggage' | 'equipment' | 'cargo';
  export let onSelectCategory: (category: 'occupants' | 'fuel' | 'baggage' | 'equipment' | 'cargo') => void;
  export let onSelectItem: (index: number) => void;
  export let onClose: () => void;
</script>

<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="button" tabindex="0" onclick={(e) => e.target === e.currentTarget && onClose()} onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget && onClose()} aria-label="Close dialog">
  <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
    <h2 class="text-xl font-semibold text-white mb-4">Item Library</h2>
    <div class="flex flex-wrap gap-2 mb-4">
      {#each Object.keys(ITEM_LIBRARY) as category}
        <button
          onclick={() => onSelectCategory(category as typeof selectedCategory)}
          class="px-3 py-1 rounded text-sm transition-colors {selectedCategory === category ? 'bg-blue-500/30 border border-blue-500 text-blue-200' : 'bg-slate-700 border border-slate-600 text-gray-300 hover:bg-slate-600'}"
        >
          {category}
        </button>
      {/each}
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {#each ITEM_LIBRARY[selectedCategory] as item, idx}
        <button
          onclick={() => onSelectItem(idx)}
          class="p-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg text-left transition-colors"
        >
          <div class="text-white font-medium mb-1">{item.name}</div>
          <div class="text-xs text-gray-400">Weight: {item.defaultWeight} lbs • Arm: {item.defaultArm}"</div>
        </button>
      {/each}
    </div>
    <div class="flex justify-end mt-6">
      <button onclick={onClose} class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors">Cancel</button>
    </div>
  </div>
</div>
