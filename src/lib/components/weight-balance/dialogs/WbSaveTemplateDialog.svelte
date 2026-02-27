<script lang="ts">
  import type { ItemTemplate } from '$lib/core/weight-balance/templates';
  import type { LoadingItem } from '$lib/core/weight-balance/types';
  export let selectedItemForTemplate: LoadingItem;
  export let templateName: string;
  export let templateDescription: string;
  export let templateCategory: ItemTemplate['category'];
  export let onCancel: () => void;
  export let onConfirm: () => void;
</script>

<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="button" tabindex="0" onclick={(e) => e.target === e.currentTarget && onCancel()} onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget && onCancel()} aria-label="Close dialog">
  <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md w-full mx-4">
    <h2 class="text-xl font-semibold text-white mb-4">Save as Template</h2>
    <div class="space-y-4">
      <div>
        <label for="template-name" class="block text-sm text-gray-400 mb-2">Template Name</label>
        <input id="template-name" type="text" bind:value={templateName} class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-blue-500 focus:outline-none" placeholder="Enter template name" />
      </div>
      <div>
        <label for="template-description" class="block text-sm text-gray-400 mb-2">Description (optional)</label>
        <textarea id="template-description" bind:value={templateDescription} class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-blue-500 focus:outline-none" rows="2" placeholder="Add description"></textarea>
      </div>
      <div>
        <label for="template-category" class="block text-sm text-gray-400 mb-2">Category</label>
        <select id="template-category" bind:value={templateCategory} class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-blue-500 focus:outline-none">
          <option value="occupant">👤 Occupant</option><option value="fuel">⛽ Fuel</option><option value="baggage">🧳 Baggage</option><option value="equipment">🔧 Equipment</option><option value="cargo">📦 Cargo</option><option value="custom">✨ Custom</option>
        </select>
      </div>
      <div class="text-xs text-gray-400 bg-slate-700/30 p-3 rounded">
        <strong>Preview:</strong><br />Weight: {selectedItemForTemplate.weight} lbs<br />Arm: {selectedItemForTemplate.arm} inches
      </div>
    </div>
    <div class="flex gap-2 justify-end mt-6">
      <button onclick={onCancel} class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors">Cancel</button>
      <button onclick={onConfirm} class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors">Save Template</button>
    </div>
  </div>
</div>
