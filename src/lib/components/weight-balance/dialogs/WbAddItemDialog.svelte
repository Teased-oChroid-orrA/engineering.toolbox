<script lang="ts">
  import type { LoadingItemType } from '$lib/core/weight-balance/types';
  import type { UnitSystem } from '$lib/core/weight-balance/units';
  import { getArmUnit, getWeightUnit } from '$lib/core/weight-balance/units';

  export let displayUnits: UnitSystem;
  export let newItemName: string;
  export let newItemType: LoadingItemType;
  export let newItemWeight: number;
  export let newItemArm: number;
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
    <h2 class="text-xl font-semibold text-white mb-4">Add Custom Item</h2>
    <div class="space-y-4">
      <div>
        <label for="item-name" class="block text-sm text-gray-400 mb-2">Item Name</label>
        <input
          id="item-name"
          type="text"
          bind:value={newItemName}
          class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-blue-500 focus:outline-none"
          placeholder="e.g., Extra Baggage"
        />
      </div>
      <div>
        <label for="item-type" class="block text-sm text-gray-400 mb-2">Item Type</label>
        <select
          id="item-type"
          bind:value={newItemType}
          class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-blue-500 focus:outline-none"
        >
          <option value="occupant">Occupant</option>
          <option value="fuel_main">Main Fuel</option>
          <option value="fuel_auxiliary">Auxiliary Fuel</option>
          <option value="baggage_nose">Nose Baggage</option>
          <option value="baggage_aft">Aft Baggage</option>
          <option value="baggage_external">External Baggage</option>
          <option value="cargo">Cargo</option>
          <option value="equipment_removable">Removable Equipment</option>
        </select>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label for="item-weight" class="block text-sm text-gray-400 mb-2">Weight ({getWeightUnit(displayUnits)})</label>
          <input
            id="item-weight"
            type="number"
            bind:value={newItemWeight}
            class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-blue-500 focus:outline-none"
            min="0"
            step={displayUnits === 'metric' ? '0.1' : '1'}
          />
        </div>
        <div>
          <label for="item-arm" class="block text-sm text-gray-400 mb-2">Arm ({getArmUnit(displayUnits)})</label>
          <input
            id="item-arm"
            type="number"
            bind:value={newItemArm}
            class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-blue-500 focus:outline-none"
            step="0.1"
          />
        </div>
      </div>
    </div>
    <div class="flex gap-2 justify-end mt-6">
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
        Add Item
      </button>
    </div>
  </div>
</div>
