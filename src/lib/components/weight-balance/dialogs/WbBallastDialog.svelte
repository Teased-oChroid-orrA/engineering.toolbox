<script lang="ts">
  import type { BallastSolution } from '$lib/core/weight-balance/ballast';
  import type { UnitSystem } from '$lib/core/weight-balance/units';
  import { formatArm, formatWeight } from '$lib/core/weight-balance/units';
  export let ballastSolution: BallastSolution;
  export let displayUnits: UnitSystem;
  export let onClose: () => void;
  export let onAddBallast: () => void;
</script>

<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="button" tabindex="0" onclick={(e) => e.target === e.currentTarget && onClose()} onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget && onClose()} aria-label="Close dialog">
  <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-lg w-full mx-4">
    <h2 class="text-xl font-semibold text-white mb-4">⚖️ Ballast Calculation</h2>
    <div class="mb-6 p-4 rounded-lg {ballastSolution.feasible ? 'bg-green-500/10 border border-green-500' : 'bg-red-500/10 border border-red-500'}">
      <div class="text-sm text-white font-semibold mb-2">{ballastSolution.feasible ? '✅ Solution Found' : '❌ Cannot Add Ballast'}</div>
      <div class="text-sm {ballastSolution.feasible ? 'text-green-200' : 'text-red-200'}">{ballastSolution.description}</div>
      {#if ballastSolution.reason}<div class="text-xs {ballastSolution.feasible ? 'text-green-300' : 'text-red-300'} mt-2">Reason: {ballastSolution.reason}</div>{/if}
    </div>
    {#if ballastSolution.feasible && ballastSolution.weight > 0}
      <div class="space-y-3 mb-6">
        <div class="flex justify-between"><span class="text-sm text-gray-400">Ballast Weight:</span><span class="text-white font-mono">{formatWeight(ballastSolution.weight, displayUnits)}</span></div>
        <div class="flex justify-between"><span class="text-sm text-gray-400">Ballast Arm:</span><span class="text-white font-mono">{formatArm(ballastSolution.arm, displayUnits)}</span></div>
      </div>
    {/if}
    <div class="flex gap-2 justify-end">
      <button onclick={onClose} class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors">Cancel</button>
      {#if ballastSolution.feasible && ballastSolution.weight > 0}
        <button onclick={onAddBallast} class="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded transition-colors">Add Ballast Item</button>
      {/if}
    </div>
  </div>
</div>
