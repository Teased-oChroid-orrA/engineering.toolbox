<script lang="ts">
  export let configName: string;
  export let onCancel: () => void;
  export let onConfirm: () => void;
</script>

<div
  class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
  role="button"
  tabindex="0"
  onclick={(e) => e.target === e.currentTarget && onCancel()}
  onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget && onCancel()}
  aria-label="Close dialog"
>
  <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md w-full mx-4">
    <h2 class="text-xl font-semibold text-white mb-4">Save Configuration</h2>
    <div class="mb-4">
      <label for="config-name" class="block text-sm text-gray-400 mb-2">Configuration Name</label>
      <input
        id="config-name"
        type="text"
        bind:value={configName}
        class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-blue-500 focus:outline-none"
        placeholder="Enter configuration name"
      />
    </div>
    <div class="flex gap-2 justify-end">
      <button
        onclick={onCancel}
        class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
      >
        Cancel
      </button>
      <button
        onclick={onConfirm}
        class="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
      >
        Save
      </button>
    </div>
  </div>
</div>
