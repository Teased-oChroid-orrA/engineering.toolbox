<script lang="ts">
  import type { LoadingResults } from '$lib/core/weight-balance/types';
  import type { UnitSystem } from '$lib/core/weight-balance/units';
  import { displayWeight, getWeightUnit, getArmUnit, formatArm } from '$lib/core/weight-balance/units';

  export let results: LoadingResults;
  export let displayUnits: UnitSystem;
  export let uncertaintyWeightTolerance: number;
  export let uncertaintyArmTolerance: number;
  export let sensitivityDeltaWeight: number;
  export let onWeightToleranceInput: (raw: number) => void;
  export let onArmToleranceInput: (raw: number) => void;
  export let onSensitivityDeltaInput: (raw: number) => void;
</script>

<div class="pt-2 border-t border-slate-700 space-y-2">
  <div class="text-xs text-gray-400">Uncertainty & Sensitivity</div>
  <div class="grid grid-cols-3 gap-2">
    <label class="text-[11px] text-gray-400">
      ±Weight ({getWeightUnit(displayUnits)})
      <input
        type="number"
        min="0"
        step={displayUnits === 'metric' ? '0.1' : '0.1'}
        value={displayWeight(uncertaintyWeightTolerance, displayUnits).toFixed(displayUnits === 'metric' ? 2 : 1)}
        oninput={(e) => onWeightToleranceInput(Number(e.currentTarget.value))}
        class="mt-1 w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white font-mono text-xs"
      />
    </label>
    <label class="text-[11px] text-gray-400">
      ±Arm ({getArmUnit(displayUnits)})
      <input
        type="number"
        min="0"
        step="0.1"
        value={(displayUnits === 'imperial' ? uncertaintyArmTolerance : uncertaintyArmTolerance * 2.54).toFixed(2)}
        oninput={(e) => onArmToleranceInput(Number(e.currentTarget.value))}
        class="mt-1 w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white font-mono text-xs"
      />
    </label>
    <label class="text-[11px] text-gray-400">
      Sensitivity ΔW ({getWeightUnit(displayUnits)})
      <input
        type="number"
        min="0.1"
        step={displayUnits === 'metric' ? '0.1' : '1'}
        value={displayWeight(sensitivityDeltaWeight, displayUnits).toFixed(displayUnits === 'metric' ? 1 : 0)}
        oninput={(e) => onSensitivityDeltaInput(Number(e.currentTarget.value))}
        class="mt-1 w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white font-mono text-xs"
      />
    </label>
  </div>

  <div class="text-xs text-gray-300">
    CG uncertainty band: {formatArm(results.analysis.uncertaintyBand.cgMin, displayUnits, 2)}
    to {formatArm(results.analysis.uncertaintyBand.cgMax, displayUnits, 2)}
    (span {formatArm(results.analysis.uncertaintyBand.cgSpan, displayUnits, 2)})
  </div>

  <details>
    <summary class="cursor-pointer text-xs text-cyan-300 hover:text-cyan-200 transition-colors select-none">
      CG sensitivity ranking
    </summary>
    <div class="mt-2 max-h-44 overflow-auto border border-slate-700 rounded-md">
      <table class="w-full text-xs">
        <thead class="sticky top-0 bg-slate-900/95 border-b border-slate-700 text-gray-300">
          <tr class="text-left">
            <th class="px-2 py-1">Item</th>
            <th class="px-2 py-1 text-right">ΔCG (step)</th>
            <th class="px-2 py-1 text-right">∂CG/∂W</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-700/60 text-white">
          {#each [...results.analysis.sensitivity].sort((a, b) => Math.abs(b.deltaCGForStep) - Math.abs(a.deltaCGForStep)) as sensitivity (sensitivity.itemId)}
            <tr class="bg-slate-900/30">
              <td class="px-2 py-1">{sensitivity.itemName}</td>
              <td class="px-2 py-1 text-right font-mono">{formatArm(sensitivity.deltaCGForStep, displayUnits, 4)}</td>
              <td class="px-2 py-1 text-right font-mono">
                {displayUnits === 'imperial'
                  ? `${sensitivity.cgPerUnitWeight.toFixed(6)} in/lb`
                  : `${(sensitivity.cgPerUnitWeight * 2.54 / 0.453592).toFixed(6)} cm/kg`}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </details>
</div>
