<script lang="ts">
  import WbUncertaintySensitivityPanel from '$lib/components/weight-balance/WbUncertaintySensitivityPanel.svelte';
  import type { LoadingResults } from '$lib/core/weight-balance/types';
  import type { UnitSystem } from '$lib/core/weight-balance/units';
  import { formatArm, formatMoment, formatWeight } from '$lib/core/weight-balance/units';

  let {
    results,
    displayUnits,
    uncertaintyWeightTolerance,
    uncertaintyArmTolerance,
    sensitivityDeltaWeight,
    onWeightToleranceInput,
    onArmToleranceInput,
    onSensitivityDeltaInput,
    getSeverityColor,
    getStatusColor
  } = $props<{
    results: LoadingResults | null;
    displayUnits: UnitSystem;
    uncertaintyWeightTolerance: number;
    uncertaintyArmTolerance: number;
    sensitivityDeltaWeight: number;
    onWeightToleranceInput: (value: number) => void;
    onArmToleranceInput: (value: number) => void;
    onSensitivityDeltaInput: (value: number) => void;
    getSeverityColor: (severity: string) => string;
    getStatusColor: (status: string) => string;
  }>();
</script>

<div class="space-y-6">
  {#if results}
    <div class="wb-theme-panel rounded-lg p-6">
      <h2 class="text-xl font-semibold text-white mb-4">Results</h2>
      <div class="space-y-4">
        <div class="wb-theme-subpanel p-4 rounded-lg">
          <div class="text-sm text-gray-400 mb-1">Status</div>
          <div class="text-2xl font-bold {getStatusColor(results.overallStatus)} capitalize">{results.overallStatus}</div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <div class="text-xs text-gray-400 mb-1">Total Weight</div>
            <div class="text-lg font-mono text-white">{formatWeight(results.totalWeight, displayUnits, 1)}</div>
          </div>
          <div>
            <div class="text-xs text-gray-400 mb-1">CG Position</div>
            <div class="text-lg font-mono text-white">{formatArm(results.cgPosition, displayUnits, 2)}</div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <div class="text-xs text-gray-400 mb-1">Zero Fuel Wt</div>
            <div class="text-sm font-mono text-white">{formatWeight(results.zeroFuelWeight, displayUnits, 1)}</div>
          </div>
          <div>
            <div class="text-xs text-gray-400 mb-1">Zero Fuel CG</div>
            <div class="text-sm font-mono text-white">{formatArm(results.zeroFuelCG, displayUnits, 2)}</div>
          </div>
        </div>

        <div>
          <div class="text-xs text-gray-400 mb-1">Category</div>
          <div class="text-sm font-mono text-white capitalize">{results.category || 'Out of Envelope'}</div>
        </div>

        <div>
          <div class="text-xs text-gray-400 mb-1">Total Moment</div>
          <div class="text-sm font-mono text-white">{formatMoment(results.totalMoment, displayUnits, 1)}</div>
        </div>

        <div class="pt-2 border-t wb-theme-divider">
          <div class="text-xs text-gray-400 mb-1">Calculation Audit</div>
          <div class="text-xs font-mono text-white/90">Hash {results.audit.inputHash} • {results.audit.generatedAt}</div>
          <div class="text-xs text-gray-400 mt-1">Checks: {results.audit.checks.errors} errors • {results.audit.checks.warnings} warnings • {results.audit.checks.info} info</div>
        </div>

        <details class="pt-1">
          <summary class="wb-theme-summary cursor-pointer text-xs transition-colors select-none">Per-item moment trace ({results.calculationTrace.length})</summary>
          <div class="mt-2 max-h-56 overflow-auto wb-theme-frame rounded-md">
            <table class="w-full text-xs">
              <thead class="sticky top-0 bg-slate-900/95 border-b wb-theme-divider text-gray-300">
                <tr class="text-left">
                  <th class="px-2 py-1">Item</th>
                  <th class="px-2 py-1 text-right">Weight</th>
                  <th class="px-2 py-1 text-right">Arm</th>
                  <th class="px-2 py-1 text-right">Moment</th>
                </tr>
              </thead>
              <tbody class="text-white" style="--tw-divide-opacity: 1; border-color: transparent;">
                {#each results.calculationTrace as entry (entry.id)}
                  <tr class="wb-theme-row">
                    <td class="px-2 py-1">
                      {entry.name}
                      {#if entry.isFuel}<span class="ml-1 text-[10px] text-amber-300">(fuel)</span>{/if}
                    </td>
                    <td class="px-2 py-1 text-right font-mono">{formatWeight(entry.weight, displayUnits, 1)}</td>
                    <td class="px-2 py-1 text-right font-mono">{formatArm(entry.arm, displayUnits, 2)}</td>
                    <td class="px-2 py-1 text-right font-mono">{formatMoment(entry.moment, displayUnits, 1)}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </details>

        <WbUncertaintySensitivityPanel
          {results}
          {displayUnits}
          {uncertaintyWeightTolerance}
          {uncertaintyArmTolerance}
          {sensitivityDeltaWeight}
          onWeightToleranceInput={onWeightToleranceInput}
          onArmToleranceInput={onArmToleranceInput}
          onSensitivityDeltaInput={onSensitivityDeltaInput}
        />
      </div>
    </div>

    {#if results.validations.length > 0}
      <div class="wb-theme-panel rounded-lg p-6">
        <h2 class="text-xl font-semibold text-white mb-4">Validations</h2>
        <div class="space-y-2">
          {#each results.validations as validation}
            <div class="p-3 border rounded {getSeverityColor(validation.severity)}">
              <div class="font-semibold text-sm mb-1">{validation.code}</div>
              <div class="text-xs">{validation.message}</div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .wb-theme-panel {
    background: color-mix(in srgb, var(--bg-secondary) 68%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent-primary) 20%, rgba(255, 255, 255, 0.08));
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent-primary) 10%, transparent);
  }

  .wb-theme-subpanel {
    background: color-mix(in srgb, var(--accent-primary) 8%, rgba(15, 23, 42, 0.58));
  }

  .wb-theme-divider {
    border-color: color-mix(in srgb, var(--accent-primary) 18%, rgba(148, 163, 184, 0.22));
  }

  .wb-theme-summary {
    color: color-mix(in srgb, white 64%, var(--accent-primary));
  }

  .wb-theme-summary:hover {
    color: color-mix(in srgb, white 74%, var(--accent-primary));
  }

  .wb-theme-frame {
    border: 1px solid color-mix(in srgb, var(--accent-primary) 16%, rgba(148, 163, 184, 0.18));
  }

  .wb-theme-row {
    background: color-mix(in srgb, var(--bg-primary) 74%, transparent);
    border-top: 1px solid color-mix(in srgb, var(--accent-primary) 8%, transparent);
  }
</style>
