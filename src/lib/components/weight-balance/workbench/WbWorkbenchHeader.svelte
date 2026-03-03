<script lang="ts">
  import { hasMACData } from '$lib/core/weight-balance/mac';
  import type { AircraftProfile, LoadingResults } from '$lib/core/weight-balance/types';
  import type { UnitSystem } from '$lib/core/weight-balance/units';

  let {
    aircraft,
    results,
    displayUnits,
    useMACDisplay,
    showDisclaimer,
    fileInput,
    onToggleMacDisplay,
    onEditMAC,
    onCalculateBallast,
    onOpenFuelBurn,
    onToggleUnits,
    onSave,
    onLoad,
    onFileSelect,
    onDismissDisclaimer
  } = $props<{
    aircraft: AircraftProfile;
    results: LoadingResults | null;
    displayUnits: UnitSystem;
    useMACDisplay: boolean;
    showDisclaimer: boolean;
    fileInput: HTMLInputElement | null;
    onToggleMacDisplay: () => void;
    onEditMAC: () => void;
    onCalculateBallast: () => void;
    onOpenFuelBurn: () => void;
    onToggleUnits: () => void;
    onSave: () => void;
    onLoad: () => void;
    onFileSelect: (event: Event) => void;
    onDismissDisclaimer: () => void;
  }>();
</script>

<div class="wb-theme-shell mb-8">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-4xl font-bold text-white mb-2">✈️ Aircraft Weight & Balance Calculator</h1>
      <p class="wb-theme-subtitle">FAA-H-8083-1B Compliant • Tabular Method</p>
    </div>
    <div class="flex gap-2 flex-wrap">
      {#if hasMACData(aircraft.lemac, aircraft.mac)}
        <button
          onclick={onToggleMacDisplay}
          class="wb-theme-action px-4 py-2 rounded transition-colors flex items-center gap-2"
          title="Toggle Station/%MAC Display"
          aria-pressed={useMACDisplay}
        >
          {useMACDisplay ? '📐 %MAC' : '📏 Station'}
        </button>
      {/if}
      <button
        onclick={onEditMAC}
        class="wb-theme-action px-3 py-2 rounded transition-colors text-sm"
        title="Configure MAC Reference"
      >
        ⚙️ MAC
      </button>
      {#if results && results.overallStatus !== 'safe'}
        <button
          onclick={onCalculateBallast}
          class="px-3 py-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500 text-orange-300 rounded transition-colors text-sm animate-pulse"
          title="Calculate Required Ballast"
        >
          ⚖️ Ballast
        </button>
      {/if}
      {#if results}
        <button
          onclick={onOpenFuelBurn}
          class="wb-theme-action px-3 py-2 rounded transition-colors text-sm"
          title="Simulate Fuel Burn & CG Travel"
        >
          🔥 Fuel Burn
        </button>
      {/if}
      <button
        onclick={onToggleUnits}
        class="wb-theme-action px-4 py-2 rounded transition-colors flex items-center gap-2"
        title="Toggle Units"
      >
        {displayUnits === 'imperial' ? '🇺🇸 lbs/in' : '🌍 kg/cm'}
      </button>
      <button
        onclick={onSave}
        class="wb-theme-action px-4 py-2 rounded transition-colors flex items-center gap-2"
        title="Save Configuration (Ctrl+S)"
      >
        💾 Save
      </button>
      <button
        onclick={onLoad}
        class="wb-theme-action px-4 py-2 rounded transition-colors flex items-center gap-2"
        title="Load Configuration (Ctrl+O)"
      >
        📁 Load
      </button>
      <input
        type="file"
        accept=".json"
        bind:this={fileInput}
        onchange={onFileSelect}
        class="hidden"
      />
    </div>
  </div>
</div>

{#if showDisclaimer}
  <div class="mb-6 p-6 bg-red-500/10 border-2 border-red-500 rounded-lg">
    <div class="flex items-start gap-4">
      <span class="text-3xl">⚠️</span>
      <div class="flex-1">
        <h2 class="text-xl font-bold text-red-400 mb-2">IMPORTANT SAFETY NOTICE</h2>
        <ul class="space-y-1 text-red-200 text-sm">
          <li>• This calculator is for reference only</li>
          <li>• NOT a substitute for your aircraft POH</li>
          <li>• NOT FAA certified</li>
          <li>• Always verify calculations with official data</li>
          <li>• Manufacturer data takes precedence</li>
        </ul>
      </div>
      <button onclick={onDismissDisclaimer} class="text-red-400 hover:text-red-300">✕</button>
    </div>
  </div>
{/if}

<style>
  .wb-theme-shell {
    --wb-accent-border: color-mix(in srgb, var(--accent-primary) 38%, transparent);
    --wb-accent-fill: color-mix(in srgb, var(--accent-primary) 12%, transparent);
    --wb-accent-fill-hover: color-mix(in srgb, var(--accent-primary) 18%, transparent);
    --wb-accent-text: color-mix(in srgb, white 72%, var(--accent-primary));
  }

  .wb-theme-subtitle {
    color: color-mix(in srgb, white 40%, var(--accent-primary));
  }

  .wb-theme-action {
    background: var(--wb-accent-fill);
    border: 1px solid var(--wb-accent-border);
    color: var(--wb-accent-text);
  }

  .wb-theme-action:hover {
    background: var(--wb-accent-fill-hover);
  }
</style>
