<script lang="ts">
  import { FUEL_BURN_PROFILES } from '$lib/core/weight-balance/fuelBurn';
  import type { FuelBurnConfig, FuelBurnResults } from '$lib/core/weight-balance/types';

  export let fuelBurnConfig: FuelBurnConfig;
  export let fuelBurnResults: FuelBurnResults | null;
  export let fuelBurnRate: number;
  export let fuelBurnDuration: number;
  export let selectedFuelProfile: string | null;
  export let onClose: () => void;
  export let onRun: () => void;
  export let onApplyProfile: (key: string) => void;
  export let onExport: () => void;
</script>

<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="button" tabindex="0" onclick={(e) => e.target === e.currentTarget && onClose()} onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget && onClose()} aria-label="Close dialog">
  <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
    <h2 class="text-xl font-semibold text-white mb-4">🔥 Fuel Burn Simulator</h2>
    <div class="mb-4 p-3 bg-amber-500/10 border border-amber-500 rounded text-xs text-amber-200">
      <strong>Purpose:</strong> Simulate fuel consumption over flight time and visualize CG travel as fuel burns from tanks.
    </div>
    <div class="mb-6">
      <div class="text-sm text-gray-400 mb-2">Quick Profiles</div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
        {#each Object.entries(FUEL_BURN_PROFILES) as [key, profile]}
          <button onclick={() => onApplyProfile(key)} class="px-3 py-2 text-xs rounded transition-colors {selectedFuelProfile === key ? 'bg-amber-500/30 border-2 border-amber-500 text-amber-200' : 'bg-slate-700 hover:bg-slate-600 border border-slate-600 text-gray-300'}">
            {profile.name}
          </button>
        {/each}
      </div>
    </div>
    <div class="grid grid-cols-2 gap-4 mb-6">
      <div>
        <label for="fuel-burn-rate" class="block text-sm text-gray-400 mb-2">Fuel Burn Rate (gal/hr)</label>
        <input id="fuel-burn-rate" type="number" bind:value={fuelBurnRate} oninput={onRun} class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-amber-500 focus:outline-none font-mono" min="1" step="0.5" />
      </div>
      <div>
        <label for="fuel-burn-duration" class="block text-sm text-gray-400 mb-2">Flight Duration (minutes)</label>
        <input id="fuel-burn-duration" type="number" bind:value={fuelBurnDuration} oninput={onRun} class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-amber-500 focus:outline-none font-mono" min="1" step="15" />
      </div>
    </div>
    <div class="mb-6">
      <div class="text-sm text-gray-400 mb-2">Fuel Tanks (from current loading)</div>
      {#if fuelBurnConfig.tanks.length > 0}
        <div class="space-y-2 max-h-48 overflow-y-auto">
          {#each fuelBurnConfig.tanks as tank}
            <div class="flex items-center justify-between p-3 bg-slate-700/50 rounded">
              <div class="flex-1">
                <div class="text-sm text-white font-medium">{tank.name}</div>
                <div class="text-xs text-gray-400">Priority: {tank.burnPriority} | Arm: {tank.arm.toFixed(1)}" | Type: {tank.fuelType}</div>
              </div>
              <div class="text-right">
                <div class="text-sm text-white font-mono">{tank.currentFuel.toFixed(1)} gal</div>
                <div class="text-xs text-gray-400">({(tank.currentFuel * 6).toFixed(0)} lbs)</div>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <div class="p-4 bg-yellow-500/10 border border-yellow-500 rounded text-sm text-yellow-200">⚠️ No fuel items found in current loading. Add fuel items first.</div>
      {/if}
    </div>
    {#if fuelBurnResults}
      <div class="mb-6">
        <div class="text-sm text-gray-400 mb-3">Simulation Summary</div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div class="p-3 bg-slate-700/50 rounded"><div class="text-xs text-gray-400">Initial Weight</div><div class="text-lg text-white font-mono">{fuelBurnResults.summary.initialWeight.toFixed(0)} lbs</div></div>
          <div class="p-3 bg-slate-700/50 rounded"><div class="text-xs text-gray-400">Final Weight</div><div class="text-lg text-white font-mono">{fuelBurnResults.summary.finalWeight.toFixed(0)} lbs</div></div>
          <div class="p-3 bg-slate-700/50 rounded"><div class="text-xs text-gray-400">Fuel Burned</div><div class="text-lg text-white font-mono">{fuelBurnResults.summary.fuelBurned.toFixed(1)} gal</div></div>
          <div class="p-3 bg-slate-700/50 rounded"><div class="text-xs text-gray-400">CG Travel</div><div class="text-lg text-white font-mono">{fuelBurnResults.summary.cgTravel.toFixed(2)}"</div></div>
        </div>
        {#if !fuelBurnResults.summary.allStepsValid}
          <div class="mt-3 p-3 bg-red-500/10 border border-red-500 rounded"><div class="text-sm text-red-200 font-semibold mb-1">⚠️ Envelope Violations Detected</div><div class="text-xs text-red-300">Aircraft goes out of envelope during flight. See warnings below.</div></div>
        {/if}
        {#if fuelBurnResults.warnings.length > 0}
          <div class="mt-3 space-y-1">
            {#each fuelBurnResults.warnings as warning}
              <div class="p-2 bg-yellow-500/10 border-l-2 border-yellow-500 text-xs text-yellow-200">⚠️ {warning}</div>
            {/each}
          </div>
        {/if}
      </div>
      <div class="mb-6">
        <div class="flex items-center justify-between mb-2">
          <div class="text-sm text-gray-400">Flight Sequence ({fuelBurnResults.steps.length} steps)</div>
          <button onclick={onExport} class="px-2 py-1 bg-green-500/20 hover:bg-green-500/30 border border-green-500 text-green-300 rounded text-xs transition-colors">📥 Export CSV</button>
        </div>
        <div class="max-h-64 overflow-y-auto border border-slate-600 rounded">
          <table class="w-full text-xs">
            <thead class="bg-slate-700 sticky top-0">
              <tr><th class="px-2 py-2 text-left text-gray-300">Time (min)</th><th class="px-2 py-2 text-right text-gray-300">Fuel (gal)</th><th class="px-2 py-2 text-right text-gray-300">Weight (lbs)</th><th class="px-2 py-2 text-right text-gray-300">CG (in)</th><th class="px-2 py-2 text-center text-gray-300">Valid</th></tr>
            </thead>
            <tbody>
              {#each fuelBurnResults.steps as step, idx}
                <tr class="{idx % 2 === 0 ? 'bg-slate-800/50' : 'bg-slate-800/30'} {!step.inEnvelope ? 'bg-red-500/10' : ''}">
                  <td class="px-2 py-2 text-white font-mono">{step.time.toFixed(0)}</td><td class="px-2 py-2 text-right text-white font-mono">{step.fuelRemaining.toFixed(1)}</td><td class="px-2 py-2 text-right text-white font-mono">{step.totalWeight.toFixed(0)}</td><td class="px-2 py-2 text-right text-white font-mono">{step.cgPosition.toFixed(2)}</td>
                  <td class="px-2 py-2 text-center">{#if step.inEnvelope}<span class="text-green-400">✓</span>{:else}<span class="text-red-400">✗</span>{/if}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}
    <div class="flex gap-2 justify-end">
      <button onclick={onClose} class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors">Close</button>
      {#if fuelBurnConfig.tanks.length > 0}<button onclick={onRun} class="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded transition-colors">🔄 Run Simulation</button>{/if}
    </div>
  </div>
</div>
