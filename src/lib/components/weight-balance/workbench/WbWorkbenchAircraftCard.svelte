<script lang="ts">
  import type { AircraftProfile, CGEnvelope } from '$lib/core/weight-balance/types';
  import type { UnitSystem } from '$lib/core/weight-balance/units';
  import { displayArm, displayWeight } from '$lib/core/weight-balance/units';

  let {
    aircraft,
    displayUnits,
    onOpenAircraftDialog,
    onEditEnvelope,
    onBasicEmptyWeightInput,
    onBasicEmptyArmInput,
    onMaxTakeoffWeightInput
  } = $props<{
    aircraft: AircraftProfile;
    displayUnits: UnitSystem;
    onOpenAircraftDialog: () => void;
    onEditEnvelope: (envelope: CGEnvelope | null) => void;
    onBasicEmptyWeightInput: (value: number) => void;
    onBasicEmptyArmInput: (value: number) => void;
    onMaxTakeoffWeightInput: (value: number) => void;
  }>();
</script>

<div class="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
  <div class="flex items-center justify-between mb-4">
    <h2 class="text-xl font-semibold text-white">Aircraft Profile</h2>
    <div class="flex gap-2">
      <button
        onclick={onOpenAircraftDialog}
        class="px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500 text-purple-300 rounded text-sm transition-colors"
        title="Change Aircraft"
      >
        ✈️ Change Aircraft
      </button>
      <button
        onclick={() => onEditEnvelope(aircraft.envelopes[0])}
        class="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500 text-blue-300 rounded text-sm transition-colors"
        title="Edit W&B Envelope"
      >
        📊 Edit Envelope
      </button>
    </div>
  </div>
  <div class="grid grid-cols-2 gap-4">
    <div>
      <div class="text-sm text-gray-400">Aircraft</div>
      <div class="text-white font-mono">{aircraft.name}</div>
    </div>
    <div>
      <div class="text-sm text-gray-400">Model</div>
      <div class="text-white font-mono">{aircraft.model}</div>
    </div>
    <div>
      <label for="basic-empty-weight" class="text-sm text-gray-400">Basic Empty Weight</label>
      <input
        id="basic-empty-weight"
        type="number"
        value={displayWeight(aircraft.basicEmptyWeight, displayUnits).toFixed(displayUnits === 'metric' ? 1 : 0)}
        oninput={(e) => onBasicEmptyWeightInput(Number(e.currentTarget.value))}
        class="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white font-mono text-sm focus:border-blue-500 focus:outline-none"
        min="0"
        step={displayUnits === 'metric' ? '0.1' : '1'}
      />
    </div>
    <div>
      <label for="bew-arm" class="text-sm text-gray-400">BEW Arm</label>
      <input
        id="bew-arm"
        type="number"
        value={displayArm(aircraft.basicEmptyWeightArm, displayUnits).toFixed(1)}
        oninput={(e) => onBasicEmptyArmInput(Number(e.currentTarget.value))}
        class="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white font-mono text-sm focus:border-blue-500 focus:outline-none"
        step="0.1"
      />
    </div>
    <div>
      <label for="max-takeoff-weight" class="text-sm text-gray-400">Max Takeoff Weight</label>
      <input
        id="max-takeoff-weight"
        type="number"
        value={displayWeight(aircraft.maxTakeoffWeight, displayUnits).toFixed(displayUnits === 'metric' ? 1 : 0)}
        oninput={(e) => onMaxTakeoffWeightInput(Number(e.currentTarget.value))}
        class="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white font-mono text-sm focus:border-blue-500 focus:outline-none"
        min="0"
        step={displayUnits === 'metric' ? '0.1' : '1'}
      />
    </div>
    <div>
      <div class="text-sm text-gray-400">Datum</div>
      <div class="text-white font-mono capitalize">{aircraft.datumLocation.type.replace('_', ' ')}</div>
    </div>
  </div>
</div>
