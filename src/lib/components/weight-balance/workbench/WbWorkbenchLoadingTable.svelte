<script lang="ts">
  import type { LoadingItem } from '$lib/core/weight-balance/types';
  import type { UnitSystem } from '$lib/core/weight-balance/units';
  import { displayArm, displayMoment, displayWeight, getArmUnit, getWeightUnit } from '$lib/core/weight-balance/units';

  let {
    items,
    displayUnits,
    onOpenItemLibrary,
    onOpenTemplates,
    onAddCustom,
    onReset,
    onUpdateItemWeight,
    onUpdateItemArm,
    onSaveAsTemplate,
    onRemoveItem
  } = $props<{
    items: LoadingItem[];
    displayUnits: UnitSystem;
    onOpenItemLibrary: () => void;
    onOpenTemplates: () => void;
    onAddCustom: () => void;
    onReset: () => void;
    onUpdateItemWeight: (itemId: string, value: number) => void;
    onUpdateItemArm: (itemId: string, value: number) => void;
    onSaveAsTemplate: (item: LoadingItem) => void;
    onRemoveItem: (itemId: string) => void;
  }>();
</script>

<div class="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
  <div class="flex items-center justify-between mb-4">
    <h2 class="text-xl font-semibold text-white">Loading Configuration</h2>
    <div class="flex gap-2">
      <button onclick={onOpenItemLibrary} class="px-3 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500 text-indigo-300 rounded text-sm transition-colors">📚 Item Library</button>
      <button onclick={onOpenTemplates} class="px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500 text-purple-300 rounded text-sm transition-colors">⭐ My Templates</button>
      <button onclick={onAddCustom} class="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 border border-green-500 text-green-300 rounded text-sm transition-colors">+ Add Custom</button>
      <button onclick={onReset} class="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500 text-blue-300 rounded text-sm transition-colors">Reset</button>
    </div>
  </div>

  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead class="border-b border-slate-600">
        <tr class="text-left text-gray-400">
          <th class="pb-2 pr-4">Item</th>
          <th class="pb-2 pr-4 text-right">Weight ({getWeightUnit(displayUnits)})</th>
          <th class="pb-2 pr-4 text-right">Arm ({getArmUnit(displayUnits)})</th>
          <th class="pb-2 pr-4 text-right">Moment ({displayUnits === 'imperial' ? 'lb-in' : 'kg-cm'})</th>
          <th class="pb-2 text-right w-16">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-700">
        {#each items as item}
          <tr class="text-white">
            <td class="py-2 pr-4">
              <span class="font-mono text-sm">{item.name}</span>
              {#if !item.editable}<span class="ml-2 text-xs text-gray-500">(fixed)</span>{/if}
            </td>
            <td class="py-2 pr-4 text-right">
              {#if item.editable}
                <input
                  type="number"
                  value={displayWeight(item.weight, displayUnits).toFixed(displayUnits === 'metric' ? 1 : 0)}
                  oninput={(e) => onUpdateItemWeight(item.id, Number(e.currentTarget.value))}
                  class="w-24 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-right font-mono text-sm focus:border-blue-500 focus:outline-none"
                  min="0"
                  step={displayUnits === 'metric' ? '0.1' : '1'}
                />
              {:else}
                <span class="font-mono">{displayWeight(item.weight, displayUnits).toFixed(displayUnits === 'metric' ? 1 : 0)}</span>
              {/if}
            </td>
            <td class="py-2 pr-4 text-right">
              {#if item.editable}
                <input
                  type="number"
                  value={displayArm(item.arm, displayUnits).toFixed(1)}
                  oninput={(e) => onUpdateItemArm(item.id, Number(e.currentTarget.value))}
                  class="w-24 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-right font-mono text-sm focus:border-blue-500 focus:outline-none"
                  step="0.1"
                />
              {:else}
                <span class="font-mono">{displayArm(item.arm, displayUnits).toFixed(1)}</span>
              {/if}
            </td>
            <td class="py-2 pr-4 text-right font-mono">{displayMoment(item.weight * item.arm, displayUnits).toFixed(0)}</td>
            <td class="py-2 text-right">
              <div class="flex gap-1 justify-end">
                {#if item.id !== 'bew' && item.editable}
                  <button onclick={() => onSaveAsTemplate(item)} class="text-blue-400 hover:text-blue-300 text-xs px-2" title="Save as template">💾</button>
                  <button onclick={() => onRemoveItem(item.id)} class="text-red-400 hover:text-red-300 text-xs px-2" title="Remove item">✕</button>
                {/if}
              </div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
