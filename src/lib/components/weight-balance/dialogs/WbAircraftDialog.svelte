<script lang="ts">
  export let onClose: () => void;
  export let onSelect: (profileKey: string) => void;
</script>

<div
  class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
  role="button"
  tabindex="0"
  onclick={(e) => e.target === e.currentTarget && onClose()}
  onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget && onClose()}
  aria-label="Close dialog"
>
  <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
    <h2 class="text-xl font-semibold text-white mb-4">Select Aircraft</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <button onclick={() => onSelect('c172s')} class="p-4 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg text-left transition-colors">
        <div class="text-white font-semibold mb-1">Cessna 172S Skyhawk</div>
        <div class="text-xs text-gray-400">Light Single-Engine • 2,550 lbs MTOW</div>
      </button>
      <button onclick={() => onSelect('pa28')} class="p-4 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg text-left transition-colors">
        <div class="text-white font-semibold mb-1">Piper PA-28 Cherokee</div>
        <div class="text-xs text-gray-400">Light Single-Engine • 2,400 lbs MTOW</div>
      </button>
      <button onclick={() => onSelect('be36')} class="p-4 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg text-left transition-colors">
        <div class="text-white font-semibold mb-1">Beechcraft A36 Bonanza</div>
        <div class="text-xs text-gray-400">Light Single-Engine • 3,650 lbs MTOW</div>
      </button>
      <button onclick={() => onSelect('sr22')} class="p-4 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg text-left transition-colors">
        <div class="text-white font-semibold mb-1">Cirrus SR22 G6</div>
        <div class="text-xs text-gray-400">High-Performance Single • 3,600 lbs MTOW</div>
      </button>
      <button onclick={() => onSelect('ka350')} class="p-4 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg text-left transition-colors">
        <div class="text-white font-semibold mb-1">King Air 350</div>
        <div class="text-xs text-gray-400">Twin Turboprop • 15,000 lbs MTOW</div>
      </button>
      <button onclick={() => onSelect('c17')} class="p-4 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg text-left transition-colors">
        <div class="text-white font-semibold mb-1">C-17 Globemaster III</div>
        <div class="text-xs text-gray-400">Military Cargo • 585,000 lbs MTOW</div>
      </button>
    </div>
    <div class="flex justify-end mt-6">
      <button onclick={onClose} class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors">
        Cancel
      </button>
    </div>
  </div>
</div>
