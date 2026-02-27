<script lang="ts">
  import type { AircraftProfile, LoadingResults } from '$lib/core/weight-balance/types';
  import { hasMACData, formatPercentMAC, stationToPercentMAC } from '$lib/core/weight-balance/mac';

  export let aircraft: AircraftProfile;
  export let results: LoadingResults | null;
  export let onClose: () => void;
  export let onSave: () => void;
</script>

<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="button" tabindex="0" onclick={(e) => e.target === e.currentTarget && onClose()} onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget && onClose()} aria-label="Close dialog">
  <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md w-full mx-4">
    <h2 class="text-xl font-semibold text-white mb-4">⚙️ MAC Reference Configuration</h2>
    <div class="mb-4 p-3 bg-blue-500/10 border border-blue-500 rounded text-xs text-blue-200">
      <strong>What is MAC?</strong><br />
      Mean Aerodynamic Chord (MAC) is a reference chord used for CG calculations.
      %MAC = ((STATION - LEMAC) / MAC) × 100
    </div>
    <div class="space-y-4 mb-6">
      <div>
        <label for="mac-lemac" class="block text-sm text-gray-400 mb-2">LEMAC - Leading Edge MAC (inches from datum)</label>
        <input id="mac-lemac" type="number" value={aircraft.lemac || 0} oninput={(e) => { const val = Number(e.currentTarget.value); if (!isNaN(val)) aircraft.lemac = val; }} class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-blue-500 focus:outline-none font-mono" step="0.1" placeholder="e.g., 35.5" />
      </div>
      <div>
        <label for="mac-length" class="block text-sm text-gray-400 mb-2">MAC Length (inches)</label>
        <input id="mac-length" type="number" value={aircraft.mac || 0} oninput={(e) => { const val = Number(e.currentTarget.value); if (!isNaN(val)) aircraft.mac = val; }} class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-blue-500 focus:outline-none font-mono" step="0.1" min="0.1" placeholder="e.g., 59.5" />
      </div>
      {#if hasMACData(aircraft.lemac, aircraft.mac) && results}
        <div class="p-3 bg-slate-700/50 rounded">
          <div class="text-xs text-gray-400 mb-1">Current CG Position:</div>
          <div class="text-sm text-white font-mono">
            {results.cgPosition.toFixed(2)}" = {formatPercentMAC(stationToPercentMAC(results.cgPosition, aircraft.lemac!, aircraft.mac!))}
          </div>
        </div>
      {/if}
    </div>
    <div class="flex gap-2 justify-end">
      <button onclick={onClose} class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors">Cancel</button>
      <button onclick={onSave} class="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded transition-colors">Save MAC Config</button>
    </div>
  </div>
</div>
