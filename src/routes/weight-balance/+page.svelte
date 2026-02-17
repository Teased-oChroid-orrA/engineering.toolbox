<script lang="ts">
  import { onMount } from 'svelte';
  import { calculateWeightAndBalance, validateInput } from '$lib/core/weight-balance/solve';
  import { SAMPLE_CESSNA_172S, SAMPLE_C17_GLOBEMASTER, SAMPLE_PIPER_CHEROKEE, SAMPLE_BEECHCRAFT_BONANZA, AIRCRAFT_PROFILES, createSampleLoading, ITEM_LIBRARY } from '$lib/core/weight-balance/sampleData';
  import { renderCGEnvelope } from '$lib/drafting/weight-balance/envelopeRenderer';
  import { validateEnvelope, getValidationSummary, type ValidationError } from '$lib/core/weight-balance/validation';
  import { 
    loadTemplates, 
    addTemplate, 
    deleteTemplate, 
    createItemFromTemplate, 
    createTemplateFromItem,
    getTemplatesByCategory,
    type ItemTemplate 
  } from '$lib/core/weight-balance/templates';
  import {
    type UnitSystem,
    formatWeight,
    formatArm,
    formatMoment,
    getWeightUnit,
    getArmUnit,
    displayWeight,
    displayArm,
    displayMoment
  } from '$lib/core/weight-balance/units';
  import { 
    stationToPercentMAC, 
    percentMACToStation, 
    formatPercentMAC, 
    hasMACData 
  } from '$lib/core/weight-balance/mac';
  import { 
    mapCGToDisplay, 
    mapInputDisplayToStation,
    getCGPositionLabel,
    formatCGDisplay
  } from '$lib/core/weight-balance/displayAdapters';
  import { calculateBallast, type BallastSolution } from '$lib/core/weight-balance/ballast';
  import type { AircraftProfile, LoadingItem, LoadingResults, LoadingItemType, CGEnvelope } from '$lib/core/weight-balance/types';
  import { 
    saveConfigurationToFile,
    loadConfigurationFromFile,
    saveToLocalStorage,
    loadFromLocalStorage,
    addToRecentConfigurations,
    type SavedConfiguration
  } from '$lib/core/weight-balance/storage';
  import { wbLogger } from '$lib/utils/loggers';
  
  let aircraft = $state<AircraftProfile>(SAMPLE_CESSNA_172S);
  let items = $state<LoadingItem[]>(createSampleLoading('c172s'));
  let results = $state<LoadingResults | null>(null);
  let showDisclaimer = $state(true);
  let envelopeContainer = $state<HTMLElement | null>(null);
  let fileInput = $state<HTMLInputElement | null>(null);
  let showSaveDialog = $state(false);
  let configName = $state('');
  let showAddItemDialog = $state(false);
  let showAircraftDialog = $state(false);
  let showEnvelopeDialog = $state(false);
  let showItemLibraryDialog = $state(false);
  let showTemplatesDialog = $state(false);
  let showSaveTemplateDialog = $state(false);
  let showBallastDialog = $state(false);
  let showMACDialog = $state(false);
  let selectedCategory = $state<'occupants' | 'fuel' | 'baggage' | 'equipment' | 'cargo'>('occupants');
  let newItemName = $state('');
  let newItemType = $state<LoadingItemType>('occupant');
  let newItemWeight = $state(0);
  let newItemArm = $state(0);
  let nextItemId = $state(100);
  let editingEnvelope = $state<CGEnvelope | null>(null);
  let envelopeValidationErrors = $state<ValidationError[]>([]);
  let userTemplates = $state<ItemTemplate[]>([]);
  let selectedItemForTemplate = $state<LoadingItem | null>(null);
  let templateName = $state('');
  let templateDescription = $state('');
  let templateCategory = $state<ItemTemplate['category']>('custom');
  let displayUnits = $state<UnitSystem>('imperial');
  let useMACDisplay = $state(false);
  let ballastSolution = $state<BallastSolution | null>(null);
  
  function recalculate() {
    const validation = validateInput(aircraft, items);
    if (!validation.valid) {
      wbLogger.error('Validation errors', { errors: validation.errors });
      return;
    }
    
    results = calculateWeightAndBalance(aircraft, items);
    updateEnvelopeChart();
    
    // Auto-save to localStorage
    saveToLocalStorage(aircraft, items);
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
      category: results.category || undefined,
      useMACDisplay,
      lemac: aircraft.lemac,
      mac: aircraft.mac
    });
  }
  
  function updateItemWeight(itemId: string, newWeight: number) {
    const item = items.find(i => i.id === itemId);
    if (item) {
      item.weight = newWeight;
      recalculate();
    }
  }
  
  function updateItemArm(itemId: string, newArm: number) {
    const item = items.find(i => i.id === itemId);
    if (item) {
      item.arm = newArm;
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
    items = createSampleLoading('c172s');
    addBasicEmptyWeight();
    recalculate();
  }
  
  // Aircraft selection functions
  function handleAircraftSelect(profileKey: string) {
    const profile = AIRCRAFT_PROFILES[profileKey];
    if (profile) {
      aircraft = profile;
      items = createSampleLoading(profileKey);
      addBasicEmptyWeight();
      recalculate();
      showAircraftDialog = false;
    }
  }
  
  // Envelope editing functions
  function handleEditEnvelope(envelope: CGEnvelope | null) {
    if (!envelope) return;
    editingEnvelope = JSON.parse(JSON.stringify(envelope)); // Deep copy
    envelopeValidationErrors = validateEnvelope(editingEnvelope!);
    showEnvelopeDialog = true;
  }
  
  function handleSaveEnvelope() {
    if (!editingEnvelope) return;
    
    // Validate envelope before saving
    const errors = validateEnvelope(editingEnvelope);
    const summary = getValidationSummary(errors);
    
    if (!summary.isValid) {
      // Still allow saving but show warning
      if (!confirm(`Envelope has validation errors:\n${summary.message}\n\nDo you want to save anyway?`)) {
        return;
      }
    }
    
    const envelopeIndex = aircraft.envelopes.findIndex(e => e.category === editingEnvelope!.category);
    if (envelopeIndex >= 0) {
      aircraft.envelopes[envelopeIndex] = editingEnvelope;
    } else {
      aircraft.envelopes.push(editingEnvelope);
    }
    
    showEnvelopeDialog = false;
    editingEnvelope = null;
    envelopeValidationErrors = [];
    recalculate();
  }
  
  function addEnvelopeVertex() {
    if (!editingEnvelope) return;
    editingEnvelope.vertices.push({ weight: 0, cgPosition: 0 });
    envelopeValidationErrors = validateEnvelope(editingEnvelope);
  }
  
  function removeEnvelopeVertex(index: number) {
    if (!editingEnvelope) return;
    editingEnvelope.vertices.splice(index, 1);
    envelopeValidationErrors = validateEnvelope(editingEnvelope);
  }
  
  function validateCurrentEnvelope() {
    if (!editingEnvelope) return;
    envelopeValidationErrors = validateEnvelope(editingEnvelope);
  }
  
  // Item library functions
  function handleItemLibrarySelect(category: typeof selectedCategory, index: number) {
    const libraryItem = ITEM_LIBRARY[category][index];
    newItemName = libraryItem.name;
    newItemWeight = libraryItem.defaultWeight;
    newItemArm = libraryItem.defaultArm;
    
    // Set appropriate type based on category
    const typeMap: Record<typeof category, LoadingItemType> = {
      occupants: 'occupant',
      fuel: 'fuel_main',
      baggage: 'baggage_aft',
      equipment: 'equipment_removable',
      cargo: 'cargo'
    };
    newItemType = typeMap[category];
    
    showItemLibraryDialog = false;
    showAddItemDialog = true;
  }
  
  // Save/Load Functions
  function handleSaveClick() {
    configName = `${aircraft.registration || aircraft.name} - ${new Date().toLocaleDateString()}`;
    showSaveDialog = true;
  }
  
  function handleSaveConfirm() {
    saveConfigurationToFile(aircraft, items, configName);
    addToRecentConfigurations({
      version: '1.0',
      type: 'weight-balance-configuration',
      name: configName,
      timestamp: new Date().toISOString(),
      aircraft,
      items: items.filter(item => item.id !== 'bew')
    });
    showSaveDialog = false;
  }
  
  function handleLoadClick() {
    fileInput?.click();
  }
  
  async function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    
    try {
      const config = await loadConfigurationFromFile(file);
      aircraft = config.aircraft;
      items = config.items;
      addBasicEmptyWeight();
      recalculate();
      addToRecentConfigurations(config);
    } catch (error) {
      alert(`Error loading configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Reset file input
    input.value = '';
  }
  
  // Item Management Functions
  function handleAddItemClick() {
    newItemName = '';
    newItemType = 'occupant';
    newItemWeight = 0;
    newItemArm = 0;
    showAddItemDialog = true;
  }
  
  function handleAddItemConfirm() {
    if (!newItemName.trim()) {
      alert('Please enter an item name');
      return;
    }
    
    const newItem: LoadingItem = {
      id: `item-${nextItemId}`,
      type: newItemType,
      name: newItemName,
      weight: newItemWeight,
      arm: newItemArm,
      editable: true
    };
    
    items.push(newItem);
    nextItemId++;
    showAddItemDialog = false;
    recalculate();
  }
  
  function handleRemoveItem(itemId: string) {
    if (itemId === 'bew') {
      alert('Cannot remove Basic Empty Weight');
      return;
    }
    
    if (confirm('Remove this item?')) {
      items = items.filter(item => item.id !== itemId);
      recalculate();
    }
  }
  
  // Template functions
  function handleSaveAsTemplate(item: LoadingItem) {
    selectedItemForTemplate = item;
    templateName = item.name;
    templateDescription = item.notes || '';
    templateCategory = 'custom';
    showSaveTemplateDialog = true;
  }
  
  function handleSaveTemplateConfirm() {
    if (!selectedItemForTemplate || !templateName.trim()) return;
    
    const templateData = createTemplateFromItem(
      selectedItemForTemplate,
      templateName,
      templateDescription,
      templateCategory
    );
    
    addTemplate(templateData);
    userTemplates = loadTemplates();
    
    showSaveTemplateDialog = false;
    selectedItemForTemplate = null;
    templateName = '';
    templateDescription = '';
  }
  
  function handleAddFromTemplate(template: ItemTemplate) {
    const newItem = createItemFromTemplate(template, `item-${nextItemId}`);
    items.push(newItem);
    nextItemId++;
    showTemplatesDialog = false;
    recalculate();
  }
  
  function handleDeleteTemplate(id: string) {
    if (confirm('Delete this template?')) {
      deleteTemplate(id);
      userTemplates = loadTemplates();
    }
  }
  
  // Ballast calculation functions
  function handleCalculateBallast() {
    if (!results) return;
    
    const envelope = aircraft.envelopes[0]; // Use first envelope
    if (!envelope) return;
    
    ballastSolution = calculateBallast({
      currentWeight: results.totalWeight,
      currentCG: results.cgPosition,
      maxWeight: aircraft.maxTakeoffWeight,
      forwardLimit: envelope.forwardLimit,
      aftLimit: envelope.aftLimit,
      envelopes: aircraft.envelopes
    });
    
    showBallastDialog = true;
  }
  
  function handleAddBallast() {
    if (!ballastSolution || !ballastSolution.feasible) return;
    
    const ballastItem: LoadingItem = {
      id: `ballast-${nextItemId}`,
      type: 'equipment_removable',
      name: 'Ballast (Auto-calculated)',
      weight: ballastSolution.weight,
      arm: ballastSolution.arm,
      editable: true
    };
    
    items.push(ballastItem);
    nextItemId++;
    showBallastDialog = false;
    recalculate();
  }
  
  // MAC configuration functions
  function handleEditMAC() {
    showMACDialog = true;
  }
  
  function handleSaveMAC(lemac: number, mac: number) {
    aircraft.lemac = lemac;
    aircraft.mac = mac;
    showMACDialog = false;
    recalculate();
  }
  
  onMount(() => {
    // Try to load from localStorage
    const saved = loadFromLocalStorage();
    if (saved) {
      aircraft = saved.aircraft;
      items = saved.items;
    }
    
    // Load user templates
    userTemplates = loadTemplates();
    
    addBasicEmptyWeight();
    recalculate();
    
    // Re-render on window resize
    const handleResize = () => updateEnvelopeChart();
    window.addEventListener('resize', handleResize);
    
    // Keyboard shortcuts
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveClick();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        handleLoadClick();
      }
    };
    window.addEventListener('keydown', handleKeydown);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeydown);
    };
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
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-4xl font-bold text-white mb-2">
            ✈️ Aircraft Weight & Balance Calculator
          </h1>
          <p class="text-gray-400">
            FAA-H-8083-1B Compliant • Tabular Method
          </p>
        </div>
        <div class="flex gap-2 flex-wrap">
          {#if hasMACData(aircraft.lemac, aircraft.mac)}
            <button 
              onclick={() => {
                useMACDisplay = !useMACDisplay;
                updateEnvelopeChart();
              }}
              class="px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500 text-indigo-300 rounded transition-colors flex items-center gap-2"
              title="Toggle Station/%MAC Display"
              aria-pressed={useMACDisplay}
            >
              {useMACDisplay ? '📐 %MAC' : '📏 Station'}
            </button>
          {/if}
          <button 
            onclick={handleEditMAC}
            class="px-3 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500 text-cyan-300 rounded transition-colors text-sm"
            title="Configure MAC Reference"
          >
            ⚙️ MAC
          </button>
          {#if results && results.overallStatus !== 'safe'}
            <button 
              onclick={handleCalculateBallast}
              class="px-3 py-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500 text-orange-300 rounded transition-colors text-sm animate-pulse"
              title="Calculate Required Ballast"
            >
              ⚖️ Ballast
            </button>
          {/if}
          <button 
            onclick={() => displayUnits = displayUnits === 'imperial' ? 'metric' : 'imperial'}
            class="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500 text-purple-300 rounded transition-colors flex items-center gap-2"
            title="Toggle Units"
          >
            {displayUnits === 'imperial' ? '🇺🇸 lbs/in' : '🌍 kg/cm'}
          </button>
          <button 
            onclick={handleSaveClick}
            class="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500 text-green-300 rounded transition-colors flex items-center gap-2"
            title="Save Configuration (Ctrl+S)"
          >
            💾 Save
          </button>
          <button 
            onclick={handleLoadClick}
            class="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500 text-blue-300 rounded transition-colors flex items-center gap-2"
            title="Load Configuration (Ctrl+O)"
          >
            📁 Load
          </button>
          <input 
            type="file" 
            accept=".json"
            bind:this={fileInput}
            onchange={handleFileSelect}
            class="hidden"
          />
        </div>
      </div>
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
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-semibold text-white">Aircraft Profile</h2>
            <div class="flex gap-2">
              <button 
                onclick={() => showAircraftDialog = true}
                class="px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500 text-purple-300 rounded text-sm transition-colors"
                title="Change Aircraft"
              >
                ✈️ Change Aircraft
              </button>
              <button 
                onclick={() => handleEditEnvelope(aircraft.envelopes[0])}
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
                oninput={(e) => {
                  aircraft.basicEmptyWeight = Number(e.currentTarget.value);
                  recalculate();
                }}
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
                oninput={(e) => {
                  aircraft.basicEmptyWeightArm = Number(e.currentTarget.value);
                  recalculate();
                }}
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
                oninput={(e) => {
                  aircraft.maxTakeoffWeight = Number(e.currentTarget.value);
                  recalculate();
                }}
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
        
        <!-- Loading Table Card -->
        <div class="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-semibold text-white">Loading Configuration</h2>
            <div class="flex gap-2">
              <button 
                onclick={() => showItemLibraryDialog = true}
                class="px-3 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500 text-indigo-300 rounded text-sm transition-colors"
              >
                📚 Item Library
              </button>
              <button 
                onclick={() => showTemplatesDialog = true}
                class="px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500 text-purple-300 rounded text-sm transition-colors"
              >
                ⭐ My Templates
              </button>
              <button 
                onclick={handleAddItemClick}
                class="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 border border-green-500 text-green-300 rounded text-sm transition-colors"
              >
                + Add Custom
              </button>
              <button 
                onclick={resetToSample}
                class="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500 text-blue-300 rounded text-sm transition-colors"
              >
                Reset
              </button>
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
                      {#if !item.editable}
                        <span class="ml-2 text-xs text-gray-500">(fixed)</span>
                      {/if}
                    </td>
                    <td class="py-2 pr-4 text-right">
                      {#if item.editable}
                        <input 
                          type="number" 
                          value={displayWeight(item.weight, displayUnits).toFixed(displayUnits === 'metric' ? 1 : 0)}
                          oninput={(e) => updateItemWeight(item.id, Number(e.currentTarget.value))}
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
                          oninput={(e) => updateItemArm(item.id, Number(e.currentTarget.value))}
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
                          <button
                            onclick={() => handleSaveAsTemplate(item)}
                            class="text-blue-400 hover:text-blue-300 text-xs px-2"
                            title="Save as template"
                          >
                            💾
                          </button>
                          <button
                            onclick={() => handleRemoveItem(item.id)}
                            class="text-red-400 hover:text-red-300 text-xs px-2"
                            title="Remove item"
                          >
                            ✕
                          </button>
                        {/if}
                      </div>
                    </td>
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
                  <div class="text-lg font-mono text-white">{formatWeight(results.totalWeight, displayUnits, 1)}</div>
                </div>
                <div>
                  <div class="text-xs text-gray-400 mb-1">CG Position</div>
                  <div class="text-lg font-mono text-white">{formatArm(results.cgPosition, displayUnits, 2)}</div>
                </div>
              </div>
              
              <!-- Zero Fuel Weight -->
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
                <div class="text-sm font-mono text-white">{formatMoment(results.totalMoment, displayUnits, 1)}</div>
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

<!-- Save Dialog -->
{#if showSaveDialog}
  <div 
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" 
    role="button"
    tabindex="0"
    onclick={(e) => e.target === e.currentTarget && (showSaveDialog = false)}
    onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget && (showSaveDialog = false)}
    aria-label="Close dialog">
    <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md w-full mx-4">
      <h2 class="text-xl font-semibold text-white mb-4">Save Configuration</h2>
      <div class="mb-4">
        <label for="config-name" class="block text-sm text-gray-400 mb-2">Configuration Name</label>
        <input 
          id="config-name"
          type="text"
          bind:value={configName}
          class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-blue-500 focus:outline-none"
          placeholder="Enter configuration name"
        />
      </div>
      <div class="flex gap-2 justify-end">
        <button
          onclick={() => showSaveDialog = false}
          class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
        >
          Cancel
        </button>
        <button
          onclick={handleSaveConfirm}
          class="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
        >
          Save
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Add Item Dialog -->
{#if showAddItemDialog}
  <div 
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" 
    role="button"
    tabindex="0"
    onclick={(e) => e.target === e.currentTarget && (showAddItemDialog = false)}
    onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget && (showAddItemDialog = false)}
    aria-label="Close dialog">
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
          onclick={() => showAddItemDialog = false}
          class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
        >
          Cancel
        </button>
        <button
          onclick={handleAddItemConfirm}
          class="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
        >
          Add Item
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Aircraft Selection Dialog -->
{#if showAircraftDialog}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="button" tabindex="0" onclick={(e) => e.target === e.currentTarget && (showAircraftDialog = false)} onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget && (showAircraftDialog = false)} aria-label="Close dialog">
    <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
      <h2 class="text-xl font-semibold text-white mb-4">Select Aircraft</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <button
          onclick={() => handleAircraftSelect('c172s')}
          class="p-4 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg text-left transition-colors"
        >
          <div class="text-white font-semibold mb-1">Cessna 172S Skyhawk</div>
          <div class="text-xs text-gray-400">Light Single-Engine • 2,550 lbs MTOW</div>
        </button>
        <button
          onclick={() => handleAircraftSelect('pa28')}
          class="p-4 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg text-left transition-colors"
        >
          <div class="text-white font-semibold mb-1">Piper PA-28 Cherokee</div>
          <div class="text-xs text-gray-400">Light Single-Engine • 2,400 lbs MTOW</div>
        </button>
        <button
          onclick={() => handleAircraftSelect('sr22')}
          class="p-4 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg text-left transition-colors"
        >
          <div class="text-white font-semibold mb-1">Cirrus SR22 G6</div>
          <div class="text-xs text-gray-400">High-Performance Single • 3,600 lbs MTOW</div>
        </button>
        <button
          onclick={() => handleAircraftSelect('be36')}
          class="p-4 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg text-left transition-colors"
        >
          <div class="text-white font-semibold mb-1">Beechcraft A36 Bonanza</div>
          <div class="text-xs text-gray-400">High-Performance Single • 3,650 lbs MTOW</div>
        </button>
        <button
          onclick={() => handleAircraftSelect('ka350')}
          class="p-4 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg text-left transition-colors"
        >
          <div class="text-white font-semibold mb-1">Beechcraft King Air 350</div>
          <div class="text-xs text-gray-400">Twin Turboprop • 15,000 lbs MTOW</div>
        </button>
        <button
          onclick={() => handleAircraftSelect('c17')}
          class="p-4 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg text-left transition-colors"
        >
          <div class="text-white font-semibold mb-1">Boeing C-17 Globemaster III</div>
          <div class="text-xs text-gray-400">Military Cargo • 585,000 lbs MTOW</div>
        </button>
      </div>
      <div class="flex justify-end mt-6">
        <button
          onclick={() => showAircraftDialog = false}
          class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Envelope Editor Dialog -->
{#if showEnvelopeDialog && editingEnvelope}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="button" tabindex="0" onclick={(e) => e.target === e.currentTarget && (showEnvelopeDialog = false)} onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget && (showEnvelopeDialog = false)} aria-label="Close dialog">
    <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
      <h2 class="text-xl font-semibold text-white mb-4">Edit W&B Envelope</h2>
      {#if useMACDisplay && hasMACData(aircraft.lemac, aircraft.mac)}
        <div class="mb-4 p-3 bg-indigo-500/10 border border-indigo-500/30 rounded text-sm text-indigo-300">
          📐 <strong>%MAC Display Active:</strong> Inputs below are in station units (inches). Display values shown for reference.
        </div>
      {/if}
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="envelope-category" class="block text-sm text-gray-400 mb-2">Category</label>
            <select 
              id="envelope-category"
              bind:value={editingEnvelope.category}
              class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="normal">Normal</option>
              <option value="utility">Utility</option>
              <option value="acrobatic">Acrobatic</option>
            </select>
          </div>
          <div>
            <label for="envelope-max-weight" class="block text-sm text-gray-400 mb-2">Max Weight (lbs)</label>
            <input 
              id="envelope-max-weight"
              type="number"
              bind:value={editingEnvelope.maxWeight}
              class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-blue-500 focus:outline-none"
              min="0"
              step="1"
            />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="envelope-forward-limit" class="block text-sm text-gray-400 mb-2">
              Forward Limit ({getCGPositionLabel(useMACDisplay)})
            </label>
            <input 
              id="envelope-forward-limit"
              type="number"
              bind:value={editingEnvelope.forwardLimit}
              class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-blue-500 focus:outline-none"
              step="0.1"
            />
            {#if useMACDisplay && hasMACData(aircraft.lemac, aircraft.mac) && editingEnvelope.forwardLimit}
              <div class="text-xs text-gray-500 mt-1">
                Display: {mapCGToDisplay(editingEnvelope.forwardLimit, useMACDisplay, aircraft.lemac, aircraft.mac).toFixed(1)}% MAC
              </div>
            {/if}
          </div>
          <div>
            <label for="envelope-aft-limit" class="block text-sm text-gray-400 mb-2">
              Aft Limit ({getCGPositionLabel(useMACDisplay)})
            </label>
            <input 
              id="envelope-aft-limit"
              type="number"
              bind:value={editingEnvelope.aftLimit}
              class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-blue-500 focus:outline-none"
              step="0.1"
            />
            {#if useMACDisplay && hasMACData(aircraft.lemac, aircraft.mac) && editingEnvelope.aftLimit}
              <div class="text-xs text-gray-500 mt-1">
                Display: {mapCGToDisplay(editingEnvelope.aftLimit, useMACDisplay, aircraft.lemac, aircraft.mac).toFixed(1)}% MAC
              </div>
            {/if}
          </div>
        </div>
        <div>
          <div class="flex items-center justify-between mb-2">
            <div class="text-sm text-gray-400">Envelope Vertices</div>
            <button
              onclick={addEnvelopeVertex}
              class="px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500 text-blue-300 rounded text-xs transition-colors"
            >
              + Add Vertex
            </button>
          </div>
          <div class="space-y-2 max-h-60 overflow-y-auto">
            {#each editingEnvelope.vertices as vertex, idx}
              <div class="flex gap-2 items-center bg-slate-700/50 p-2 rounded">
                <div class="flex-1">
                  <input 
                    type="number"
                    bind:value={vertex.weight}
                    class="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="Weight (lbs)"
                    min="0"
                    step="1"
                  />
                </div>
                <div class="flex-1">
                  <input 
                    type="number"
                    bind:value={vertex.cgPosition}
                    class="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:border-blue-500 focus:outline-none"
                    placeholder={`CG Position (${useMACDisplay ? '% MAC' : 'in'})`}
                    step="0.1"
                  />
                  {#if useMACDisplay && hasMACData(aircraft.lemac, aircraft.mac) && vertex.cgPosition}
                    <div class="text-xs text-gray-500 mt-0.5">
                      {mapCGToDisplay(vertex.cgPosition, useMACDisplay, aircraft.lemac, aircraft.mac).toFixed(1)}%
                    </div>
                  {/if}
                </div>
                <button
                  onclick={() => removeEnvelopeVertex(idx)}
                  class="text-red-400 hover:text-red-300 text-sm px-2"
                  title="Remove vertex"
                >
                  ✕
                </button>
              </div>
            {/each}
          </div>
        </div>
        
        <!-- Validation Results -->
        {#if envelopeValidationErrors.length > 0}
          <div class="mt-4 p-4 bg-slate-700/50 rounded-lg border-l-4 {getValidationSummary(envelopeValidationErrors).errorCount > 0 ? 'border-red-500' : 'border-yellow-500'}">
            <h3 class="text-sm font-semibold text-white mb-2">Validation Results</h3>
            <div class="space-y-2">
              {#each envelopeValidationErrors as error}
                <div class="text-xs">
                  <span class={`font-semibold ${error.severity === 'error' ? 'text-red-400' : error.severity === 'warning' ? 'text-yellow-400' : 'text-blue-400'}`}>
                    {error.severity.toUpperCase()}:
                  </span>
                  <span class="text-gray-300 ml-2">{error.message}</span>
                  {#if error.suggestion}
                    <div class="ml-6 mt-1 text-gray-400 italic">💡 {error.suggestion}</div>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
      <div class="flex gap-2 justify-between mt-6">
        <button
          onclick={validateCurrentEnvelope}
          class="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500 text-green-300 rounded transition-colors"
        >
          ✓ Validate
        </button>
        <div class="flex gap-2">
          <button
            onclick={() => { showEnvelopeDialog = false; editingEnvelope = null; envelopeValidationErrors = []; }}
            class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onclick={handleSaveEnvelope}
            class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
          >
            Save Envelope
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Item Library Dialog -->
{#if showItemLibraryDialog}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="button" tabindex="0" onclick={(e) => e.target === e.currentTarget && (showItemLibraryDialog = false)} onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget && (showItemLibraryDialog = false)} aria-label="Close dialog">
    <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
      <h2 class="text-xl font-semibold text-white mb-4">Item Library</h2>
      <div class="mb-4">
        <div class="flex gap-2 flex-wrap">
          <button
            onclick={() => selectedCategory = 'occupants'}
            class={`px-3 py-1 rounded text-sm transition-colors ${selectedCategory === 'occupants' ? 'bg-blue-500 text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'}`}
          >
            👤 Occupants
          </button>
          <button
            onclick={() => selectedCategory = 'fuel'}
            class={`px-3 py-1 rounded text-sm transition-colors ${selectedCategory === 'fuel' ? 'bg-blue-500 text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'}`}
          >
            ⛽ Fuel
          </button>
          <button
            onclick={() => selectedCategory = 'baggage'}
            class={`px-3 py-1 rounded text-sm transition-colors ${selectedCategory === 'baggage' ? 'bg-blue-500 text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'}`}
          >
            🧳 Baggage
          </button>
          <button
            onclick={() => selectedCategory = 'equipment'}
            class={`px-3 py-1 rounded text-sm transition-colors ${selectedCategory === 'equipment' ? 'bg-blue-500 text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'}`}
          >
            🔧 Equipment
          </button>
          <button
            onclick={() => selectedCategory = 'cargo'}
            class={`px-3 py-1 rounded text-sm transition-colors ${selectedCategory === 'cargo' ? 'bg-blue-500 text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'}`}
          >
            📦 Cargo
          </button>
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        {#each ITEM_LIBRARY[selectedCategory] as item, idx}
          <button
            onclick={() => handleItemLibrarySelect(selectedCategory, idx)}
            class="p-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg text-left transition-colors"
          >
            <div class="text-white font-medium mb-1">{item.name}</div>
            <div class="text-xs text-gray-400">
              Weight: {item.defaultWeight} lbs • Arm: {item.defaultArm}"
            </div>
          </button>
        {/each}
      </div>
      <div class="flex justify-end mt-6">
        <button
          onclick={() => showItemLibraryDialog = false}
          class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- My Templates Dialog -->
{#if showTemplatesDialog}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="button" tabindex="0" onclick={(e) => e.target === e.currentTarget && (showTemplatesDialog = false)} onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget && (showTemplatesDialog = false)} aria-label="Close dialog">
    <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
      <h2 class="text-xl font-semibold text-white mb-4">My Templates</h2>
      {#if userTemplates.length === 0}
        <div class="text-center py-8">
          <p class="text-gray-400 mb-4">No templates saved yet.</p>
          <p class="text-sm text-gray-500">Use the 💾 button on any item to save it as a template.</p>
        </div>
      {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          {#each userTemplates as template}
            <div class="p-3 bg-slate-700/50 border border-slate-600 rounded-lg">
              <div class="flex items-start justify-between mb-2">
                <div class="flex-1">
                  <div class="text-white font-medium mb-1">{template.name}</div>
                  {#if template.description}
                    <div class="text-xs text-gray-400 mb-1">{template.description}</div>
                  {/if}
                  <div class="text-xs text-gray-400">
                    Weight: {template.defaultWeight} lbs • Arm: {template.defaultArm}"
                  </div>
                  {#if template.category}
                    <span class="inline-block mt-1 px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded">
                      {template.category}
                    </span>
                  {/if}
                </div>
                <button
                  onclick={() => handleDeleteTemplate(template.id)}
                  class="text-red-400 hover:text-red-300 text-sm ml-2"
                  title="Delete template"
                >
                  ✕
                </button>
              </div>
              <button
                onclick={() => handleAddFromTemplate(template)}
                class="w-full px-3 py-1 bg-green-500/20 hover:bg-green-500/30 border border-green-500 text-green-300 rounded text-sm transition-colors"
              >
                + Add to Loading
              </button>
            </div>
          {/each}
        </div>
      {/if}
      <div class="flex justify-end mt-6">
        <button
          onclick={() => showTemplatesDialog = false}
          class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Save Template Dialog -->
{#if showSaveTemplateDialog && selectedItemForTemplate}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="button" tabindex="0" onclick={(e) => e.target === e.currentTarget && (showSaveTemplateDialog = false)} onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget && (showSaveTemplateDialog = false)} aria-label="Close dialog">
    <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md w-full mx-4">
      <h2 class="text-xl font-semibold text-white mb-4">Save as Template</h2>
      <div class="space-y-4">
        <div>
          <label for="template-name" class="block text-sm text-gray-400 mb-2">Template Name</label>
          <input 
            id="template-name"
            type="text"
            bind:value={templateName}
            class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-blue-500 focus:outline-none"
            placeholder="Enter template name"
          />
        </div>
        <div>
          <label for="template-description" class="block text-sm text-gray-400 mb-2">Description (optional)</label>
          <textarea 
            id="template-description"
            bind:value={templateDescription}
            class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-blue-500 focus:outline-none"
            rows="2"
            placeholder="Add description"
          ></textarea>
        </div>
        <div>
          <label for="template-category" class="block text-sm text-gray-400 mb-2">Category</label>
          <select 
            id="template-category"
            bind:value={templateCategory}
            class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="occupant">👤 Occupant</option>
            <option value="fuel">⛽ Fuel</option>
            <option value="baggage">🧳 Baggage</option>
            <option value="equipment">🔧 Equipment</option>
            <option value="cargo">📦 Cargo</option>
            <option value="custom">✨ Custom</option>
          </select>
        </div>
        <div class="text-xs text-gray-400 bg-slate-700/30 p-3 rounded">
          <strong>Preview:</strong><br/>
          Weight: {selectedItemForTemplate.weight} lbs<br/>
          Arm: {selectedItemForTemplate.arm} inches
        </div>
      </div>
      <div class="flex gap-2 justify-end mt-6">
        <button
          onclick={() => { showSaveTemplateDialog = false; selectedItemForTemplate = null; }}
          class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
        >
          Cancel
        </button>
        <button
          onclick={handleSaveTemplateConfirm}
          class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
        >
          Save Template
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Ballast Calculation Dialog -->
{#if showBallastDialog && ballastSolution}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="button" tabindex="0" onclick={(e) => e.target === e.currentTarget && (showBallastDialog = false)} onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget && (showBallastDialog = false)} aria-label="Close dialog">
    <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-lg w-full mx-4">
      <h2 class="text-xl font-semibold text-white mb-4">⚖️ Ballast Calculation</h2>
      
      <div class="mb-6 p-4 rounded-lg {ballastSolution.feasible ? 'bg-green-500/10 border border-green-500' : 'bg-red-500/10 border border-red-500'}">
        <div class="text-sm text-white font-semibold mb-2">
          {ballastSolution.feasible ? '✅ Solution Found' : '❌ Cannot Add Ballast'}
        </div>
        <div class="text-sm {ballastSolution.feasible ? 'text-green-200' : 'text-red-200'}">
          {ballastSolution.description}
        </div>
        {#if ballastSolution.reason}
          <div class="text-xs {ballastSolution.feasible ? 'text-green-300' : 'text-red-300'} mt-2">
            Reason: {ballastSolution.reason}
          </div>
        {/if}
      </div>
      
      {#if ballastSolution.feasible && ballastSolution.weight > 0}
        <div class="space-y-3 mb-6">
          <div class="flex justify-between">
            <span class="text-sm text-gray-400">Ballast Weight:</span>
            <span class="text-white font-mono">{formatWeight(ballastSolution.weight, displayUnits)}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-400">Ballast Arm:</span>
            <span class="text-white font-mono">{formatArm(ballastSolution.arm, displayUnits)}</span>
          </div>
        </div>
      {/if}
      
      <div class="flex gap-2 justify-end">
        <button
          onclick={() => showBallastDialog = false}
          class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
        >
          Cancel
        </button>
        {#if ballastSolution.feasible && ballastSolution.weight > 0}
          <button
            onclick={handleAddBallast}
            class="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded transition-colors"
          >
            Add Ballast Item
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}

<!-- MAC Configuration Dialog -->
{#if showMACDialog}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="button" tabindex="0" onclick={(e) => e.target === e.currentTarget && (showMACDialog = false)} onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget && (showMACDialog = false)} aria-label="Close dialog">
    <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md w-full mx-4">
      <h2 class="text-xl font-semibold text-white mb-4">⚙️ MAC Reference Configuration</h2>
      
      <div class="mb-4 p-3 bg-blue-500/10 border border-blue-500 rounded text-xs text-blue-200">
        <strong>What is MAC?</strong><br/>
        Mean Aerodynamic Chord (MAC) is a reference chord used for CG calculations.
        %MAC = ((STATION - LEMAC) / MAC) × 100
      </div>
      
      <div class="space-y-4 mb-6">
        <div>
          <label for="mac-lemac" class="block text-sm text-gray-400 mb-2">
            LEMAC - Leading Edge MAC (inches from datum)
          </label>
          <input 
            id="mac-lemac"
            type="number"
            value={aircraft.lemac || 0}
            oninput={(e) => {
              const val = Number(e.currentTarget.value);
              if (!isNaN(val)) aircraft.lemac = val;
            }}
            class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-blue-500 focus:outline-none font-mono"
            step="0.1"
            placeholder="e.g., 35.5"
          />
        </div>
        <div>
          <label for="mac-length" class="block text-sm text-gray-400 mb-2">
            MAC Length (inches)
          </label>
          <input 
            id="mac-length"
            type="number"
            value={aircraft.mac || 0}
            oninput={(e) => {
              const val = Number(e.currentTarget.value);
              if (!isNaN(val)) aircraft.mac = val;
            }}
            class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-blue-500 focus:outline-none font-mono"
            step="0.1"
            min="0.1"
            placeholder="e.g., 59.5"
          />
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
        <button
          onclick={() => showMACDialog = false}
          class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
        >
          Cancel
        </button>
        <button
          onclick={() => {
            showMACDialog = false;
            recalculate();
          }}
          class="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded transition-colors"
        >
          Save MAC Config
        </button>
      </div>
    </div>
  </div>
{/if}
