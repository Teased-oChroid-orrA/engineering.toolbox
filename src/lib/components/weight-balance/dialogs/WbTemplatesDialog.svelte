<script lang="ts">
  import type { ItemTemplate } from '$lib/core/weight-balance/templates';
  export let userTemplates: ItemTemplate[];
  export let onClose: () => void;
  export let onDelete: (id: string) => void;
  export let onAdd: (template: ItemTemplate) => void;
</script>

<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="button" tabindex="0" onclick={(e) => e.target === e.currentTarget && onClose()} onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget && onClose()} aria-label="Close dialog">
  <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
    <h2 class="text-xl font-semibold text-white mb-4">My Templates</h2>
    {#if userTemplates.length === 0}
      <div class="text-center py-8">
        <p class="text-gray-400 mb-4">No templates saved yet.</p>
        <p class="text-sm text-gray-500">Use the 💾 button on any item to save it as a template.</p>
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        {#each userTemplates as template}
          <div class="p-3 bg-slate-700/50 border border-slate-600 rounded-lg">
            <div class="flex items-start justify-between mb-2">
              <div class="flex-1">
                <div class="text-white font-medium mb-1">{template.name}</div>
                {#if template.description}<div class="text-xs text-gray-400 mb-1">{template.description}</div>{/if}
                <div class="text-xs text-gray-400">Weight: {template.defaultWeight} lbs • Arm: {template.defaultArm}"</div>
                {#if template.category}<span class="inline-block mt-1 px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded">{template.category}</span>{/if}
              </div>
              <button onclick={() => onDelete(template.id)} class="text-red-400 hover:text-red-300 text-sm ml-2" title="Delete template">✕</button>
            </div>
            <button onclick={() => onAdd(template)} class="w-full px-3 py-1 bg-green-500/20 hover:bg-green-500/30 border border-green-500 text-green-300 rounded text-sm transition-colors">+ Add to Loading</button>
          </div>
        {/each}
      </div>
    {/if}
    <div class="flex justify-end mt-6">
      <button onclick={onClose} class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors">Close</button>
    </div>
  </div>
</div>
