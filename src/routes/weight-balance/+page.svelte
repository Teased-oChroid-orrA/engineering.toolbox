<script lang="ts">
  import { onMount } from 'svelte';
  import { calculateWeightAndBalance, validateInput } from '$lib/core/weight-balance/solve';
  import { SAMPLE_CESSNA_172S, createSampleLoading } from '$lib/core/weight-balance/sampleData';
  import { renderCGEnvelope } from '$lib/drafting/weight-balance/envelopeRenderer';
  import type { AircraftProfile, LoadingItem, LoadingResults } from '$lib/core/weight-balance/types';
  
  let aircraft = $state<AircraftProfile>(SAMPLE_CESSNA_172S);
  let items = $state<LoadingItem[]>(createSampleLoading());
  let results = $state<LoadingResults | null>(null);
  let showDisclaimer = $state(true);
  let envelopeContainer = $state<HTMLElement | null>(null);
  
  function recalculate() {
    const validation = validateInput(aircraft, items);
    if (!validation.valid) {
      console.error('Validation errors:', validation.errors);
      return;
    }
    
    results = calculateWeightAndBalance(aircraft, items);
    updateEnvelopeChart();
  }
  
  function updateEnvelopeChart() {
    if (!envelopeContainer || !results) return;
    
    renderCGEnvelope(envelopeContainer, aircraft.envelopes, {
      width: envelopeContainer.clientWidth,
      height: 400,
      margin: { top: 20, right: 20, bottom: 50, left: 60 },
      currentCG: {
        weight: results.totalWeight,
        cgPosition: results.cgPosition
      },
      category: results.category || undefined
    });
  }
  
  function updateItemWeight(itemId: string, newWeight: number) {
    const item = items.find(i => i.id === itemId);
    if (item) {
      item.weight = newWeight;
      recalculate();
    }
  }
  
  function addBasicEmptyWeight() {
    const bewItem = items.find(i => i.id === 'bew');
    if (!bewItem) {
      items.push({
        id: 'bew',
        type: 'equipment_fixed',
        name: 'Basic Empty Weight',
        weight: aircraft.basicEmptyWeight,
        arm: aircraft.basicEmptyWeightArm,
        editable: false
      });
    }
    recalculate();
  }
  
  function resetToSample() {
    aircraft = SAMPLE_CESSNA_172S;
    items = createSampleLoading();
    addBasicEmptyWeight();
    recalculate();
  }
  
  onMount(() => {
    addBasicEmptyWeight();
    recalculate();
    
    // Re-render on window resize
    const handleResize = () => updateEnvelopeChart();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  });
  
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'bg-red-500/20 border-red-500 text-red-200';
      case 'warning': return 'bg-yellow-500/20 border-yellow-500 text-yellow-200';
      case 'info': return 'bg-blue-500/20 border-blue-500 text-blue-200';
      default: return 'bg-gray-500/20 border-gray-500 text-gray-200';
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'safe': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };
</script>

<div class="min-h-screen p-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-4xl font-bold text-white mb-2">
        ✈️ Aircraft Weight & Balance Calculator
      </h1>
      <p class="text-gray-400">
        FAA-H-8083-1B Compliant • Tabular Method
      </p>
    </div>
    
    <!-- Disclaimer -->
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
          <button 
            onclick={() => showDisclaimer = false}
            class="text-red-400 hover:text-red-300"
          >✕</button>
        </div>
      </div>
    {/if}
    
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left Column: Aircraft & Loading -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Aircraft Info Card -->
        <div class="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <h2 class="text-xl font-semibold text-white mb-4">Aircraft Profile</h2>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-sm text-gray-400">Aircraft</label>
              <div class="text-white font-mono">{aircraft.name}</div>
            </div>
            <div>
              <label class="text-sm text-gray-400">Model</label>
              <div class="text-white font-mono">{aircraft.model}</div>
            </div>
            <div>
              <label class="text-sm text-gray-400">Basic Empty Weight</label>
              <div class="text-white font-mono">{aircraft.basicEmptyWeight} lbs</div>
            </div>
            <div>
              <label class="text-sm text-gray-400">BEW Arm</label>
              <div class="text-white font-mono">{aircraft.basicEmptyWeightArm}"</div>
            </div>
            <div>
              <label class="text-sm text-gray-400">Max Takeoff Weight</label>
              <div class="text-white font-mono">{aircraft.maxTakeoffWeight} lbs</div>
            </div>
            <div>
              <label class="text-sm text-gray-400">Datum</label>
              <div class="text-white font-mono capitalize">{aircraft.datumLocation.type.replace('_', ' ')}</div>
            </div>
          </div>
        </div>
        
        <!-- Loading Table Card -->
        <div class="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-semibold text-white">Loading Configuration</h2>
            <button 
              onclick={resetToSample}
              class="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500 text-blue-300 rounded text-sm transition-colors"
            >
              Reset
            </button>
          </div>
          
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="border-b border-slate-600">
                <tr class="text-left text-gray-400">
                  <th class="pb-2 pr-4">Item</th>
                  <th class="pb-2 pr-4 text-right">Weight (lbs)</th>
                  <th class="pb-2 pr-4 text-right">Arm (in)</th>
                  <th class="pb-2 text-right">Moment (lb-in)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-700">
                {#each items as item}
                  <tr class="text-white">
                    <td class="py-2 pr-4">
                      <span class="font-mono text-sm">{item.name}</span>
                      {#if !item.editable}
                        <span class="ml-2 text-xs text-gray-500">(fixed)</span>
                      {/if}
                    </td>
                    <td class="py-2 pr-4 text-right">
                      {#if item.editable}
                        <input 
                          type="number" 
                          value={item.weight}
                          oninput={(e) => updateItemWeight(item.id, Number(e.currentTarget.value))}
                          class="w-24 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-right font-mono text-sm focus:border-blue-500 focus:outline-none"
                          min="0"
                          step="1"
                        />
                      {:else}
                        <span class="font-mono">{item.weight}</span>
                      {/if}
                    </td>
                    <td class="py-2 pr-4 text-right font-mono">{item.arm}</td>
                    <td class="py-2 text-right font-mono">{(item.weight * item.arm).toFixed(1)}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <!-- Right Column: Results -->
      <div class="space-y-6">
        <!-- Results Card -->
        {#if results}
          <div class="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <h2 class="text-xl font-semibold text-white mb-4">Results</h2>
            
            <div class="space-y-4">
              <!-- Overall Status -->
              <div class="p-4 bg-slate-700/50 rounded-lg">
                <div class="text-sm text-gray-400 mb-1">Status</div>
                <div class="text-2xl font-bold {getStatusColor(results.overallStatus)} capitalize">
                  {results.overallStatus}
                </div>
              </div>
              
              <!-- Total Weight & CG -->
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <div class="text-xs text-gray-400 mb-1">Total Weight</div>
                  <div class="text-lg font-mono text-white">{results.totalWeight.toFixed(1)} lbs</div>
                </div>
                <div>
                  <div class="text-xs text-gray-400 mb-1">CG Position</div>
                  <div class="text-lg font-mono text-white">{results.cgPosition.toFixed(2)}"</div>
                </div>
              </div>
              
              <!-- Zero Fuel Weight -->
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <div class="text-xs text-gray-400 mb-1">Zero Fuel Wt</div>
                  <div class="text-sm font-mono text-white">{results.zeroFuelWeight.toFixed(1)} lbs</div>
                </div>
                <div>
                  <div class="text-xs text-gray-400 mb-1">Zero Fuel CG</div>
                  <div class="text-sm font-mono text-white">{results.zeroFuelCG.toFixed(2)}"</div>
                </div>
              </div>
              
              <!-- Category -->
              <div>
                <div class="text-xs text-gray-400 mb-1">Category</div>
                <div class="text-sm font-mono text-white capitalize">
                  {results.category || 'Out of Envelope'}
                </div>
              </div>
              
              <!-- Total Moment -->
              <div>
                <div class="text-xs text-gray-400 mb-1">Total Moment</div>
                <div class="text-sm font-mono text-white">{results.totalMoment.toFixed(1)} lb-in</div>
              </div>
            </div>
          </div>
          
          <!-- Validations Card -->
          {#if results.validations.length > 0}
            <div class="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
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
    </div>
    
    <!-- CG Envelope Visualization (Full Width) -->
    {#if results}
      <div class="mt-6 bg-slate-800/50 border border-slate-700 rounded-lg p-6">
        <h2 class="text-xl font-semibold text-white mb-4">CG Envelope Chart</h2>
        <div class="rounded-lg overflow-hidden border border-slate-600" bind:this={envelopeContainer}></div>
      </div>
    {/if}
  </div>
</div>
