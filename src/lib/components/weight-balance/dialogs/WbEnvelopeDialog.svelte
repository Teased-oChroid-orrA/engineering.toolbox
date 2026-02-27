<script lang="ts">
  import { getValidationSummary, type ValidationError } from '$lib/core/weight-balance/validation';
  import type { CGEnvelope, EnvelopeInputMode } from '$lib/core/weight-balance/types';
  import { getEnvelopeCGInputPlaceholder, getEnvelopeCGInputUnit } from '$lib/core/weight-balance/displayAdapters';

  export let editingEnvelope: CGEnvelope;
  export let envelopeValidationErrors: ValidationError[];
  export let envelopeInputMode: EnvelopeInputMode;
  export let hasMACConfig: boolean;
  export let useMACDisplay: boolean;
  export let onToggleMode: () => void;
  export let onAddVertex: () => void;
  export let onRemoveVertex: (idx: number) => void;
  export let onValidate: () => void;
  export let onSave: () => void;
  export let onCancel: () => void;
</script>

<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="button" tabindex="0" onclick={(e) => e.target === e.currentTarget && onCancel()} onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget && onCancel()} aria-label="Close dialog">
  <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-semibold text-white">Edit W&B Envelope</h2>
      {#if hasMACConfig}
        <button onclick={onToggleMode} class="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500 text-blue-300 rounded text-sm transition-colors" title="Toggle input mode between station and %MAC">
          <span class="text-xs font-mono">{envelopeInputMode === 'station' ? '📏 Station' : '📐 %MAC'}</span>
          <span class="text-xs opacity-70">⇄</span>
        </button>
      {/if}
    </div>

    {#if hasMACConfig}
      <div class="mb-4 p-3 bg-indigo-500/10 border border-indigo-500/30 rounded text-sm text-indigo-300">
        {#if envelopeInputMode === 'station'}
          📏 <strong>Station Mode:</strong> Input CG positions in inches from datum. {useMACDisplay ? 'Display will show %MAC on chart.' : ''}
        {:else}
          📐 <strong>%MAC Mode:</strong> Input CG positions as % MAC. Values are converted to station for storage.
        {/if}
      </div>
    {/if}

    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label for="envelope-category" class="block text-sm text-gray-400 mb-2">Category</label>
          <select id="envelope-category" bind:value={editingEnvelope.category} class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-blue-500 focus:outline-none">
            <option value="normal">Normal</option><option value="utility">Utility</option><option value="acrobatic">Acrobatic</option>
          </select>
        </div>
        <div>
          <label for="envelope-max-weight" class="block text-sm text-gray-400 mb-2">Max Weight (lbs)</label>
          <input id="envelope-max-weight" type="number" bind:value={editingEnvelope.maxWeight} class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-blue-500 focus:outline-none" min="0" step="1" />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label for="envelope-forward-limit" class="block text-sm text-gray-400 mb-2">Forward Limit ({getEnvelopeCGInputUnit(envelopeInputMode)})</label>
          <input id="envelope-forward-limit" type="number" bind:value={editingEnvelope.forwardLimit} class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-blue-500 focus:outline-none" step="0.1" placeholder={getEnvelopeCGInputPlaceholder(envelopeInputMode)} />
        </div>
        <div>
          <label for="envelope-aft-limit" class="block text-sm text-gray-400 mb-2">Aft Limit ({getEnvelopeCGInputUnit(envelopeInputMode)})</label>
          <input id="envelope-aft-limit" type="number" bind:value={editingEnvelope.aftLimit} class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-blue-500 focus:outline-none" step="0.1" placeholder={getEnvelopeCGInputPlaceholder(envelopeInputMode)} />
        </div>
      </div>
      <div>
        <div class="flex items-center justify-between mb-2">
          <div class="text-sm text-gray-400">Envelope Vertices</div>
          <button onclick={onAddVertex} class="px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500 text-blue-300 rounded text-xs transition-colors">+ Add Vertex</button>
        </div>
        <div class="space-y-2 max-h-60 overflow-y-auto">
          {#each editingEnvelope.vertices as vertex, idx}
            <div class="flex gap-2 items-center bg-slate-700/50 p-2 rounded">
              <div class="flex-1"><input type="number" bind:value={vertex.weight} class="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:border-blue-500 focus:outline-none" placeholder="Weight (lbs)" min="0" step="1" /></div>
              <div class="flex-1"><input type="number" bind:value={vertex.cgPosition} class="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:border-blue-500 focus:outline-none" placeholder={getEnvelopeCGInputPlaceholder(envelopeInputMode)} step="0.1" /></div>
              <button onclick={() => onRemoveVertex(idx)} class="text-red-400 hover:text-red-300 text-sm px-2" title="Remove vertex">✕</button>
            </div>
          {/each}
        </div>
      </div>

      {#if envelopeValidationErrors.length > 0}
        <div class="mt-4 p-4 bg-slate-700/50 rounded-lg border-l-4 {getValidationSummary(envelopeValidationErrors).errorCount > 0 ? 'border-red-500' : 'border-yellow-500'}">
          <h3 class="text-sm font-semibold text-white mb-2">Validation Results</h3>
          <div class="space-y-2">
            {#each envelopeValidationErrors as error}
              <div class="text-xs">
                <span class={`font-semibold ${error.severity === 'error' ? 'text-red-400' : error.severity === 'warning' ? 'text-yellow-400' : 'text-blue-400'}`}>{error.severity.toUpperCase()}:</span>
                <span class="text-gray-300 ml-2">{error.message}</span>
                {#if error.suggestion}<div class="ml-6 mt-1 text-gray-400 italic">💡 {error.suggestion}</div>{/if}
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>

    <div class="flex gap-2 justify-between mt-6">
      <button onclick={onValidate} class="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500 text-green-300 rounded transition-colors">✓ Validate</button>
      <div class="flex gap-2">
        <button onclick={onCancel} class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors">Cancel</button>
        <button onclick={onSave} class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors">Save Envelope</button>
      </div>
    </div>
  </div>
</div>
