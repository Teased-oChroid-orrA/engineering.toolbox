<script lang="ts">
  import { onMount } from 'svelte';
  import { calculateWeightAndBalance, validateInput } from '$lib/core/weight-balance/solve';
  import { SAMPLE_CESSNA_172S, AIRCRAFT_PROFILES, createSampleLoading, ITEM_LIBRARY } from '$lib/core/weight-balance/sampleData';
  import { renderCGEnvelope } from '$lib/drafting/weight-balance/envelopeRenderer';
  import { validateEnvelope, getValidationSummary, type ValidationError } from '$lib/core/weight-balance/validation';
  import {
    loadTemplates,
    addTemplate,
    deleteTemplate,
    createItemFromTemplate,
    createTemplateFromItem,
    type ItemTemplate
  } from '$lib/core/weight-balance/templates';
  import {
    type UnitSystem,
    parseWeightInput,
    parseArmInput
  } from '$lib/core/weight-balance/units';
  import {
    convertEnvelopeInputToStation,
    convertStationToEnvelopeInput
  } from '$lib/core/weight-balance/displayAdapters';
  import { hasMACData } from '$lib/core/weight-balance/mac';
  import { calculateBallast, type BallastSolution } from '$lib/core/weight-balance/ballast';
  import {
    simulateFuelBurn,
    createFuelBurnConfigFromItems,
    FUEL_BURN_PROFILES
  } from '$lib/core/weight-balance/fuelBurn';
  import type {
    AircraftProfile,
    LoadingItem,
    LoadingResults,
    LoadingItemType,
    CGEnvelope,
    EnvelopeInputMode,
    FuelBurnConfig,
    FuelBurnResults
  } from '$lib/core/weight-balance/types';
  import {
    saveConfigurationToFile,
    loadConfigurationFromFile,
    saveToLocalStorage,
    loadFromLocalStorage,
    addToRecentConfigurations
  } from '$lib/core/weight-balance/storage';
  import { wbLogger } from '$lib/utils/loggers';
  import WbWorkbenchHeader from '$lib/components/weight-balance/workbench/WbWorkbenchHeader.svelte';
  import WbWorkbenchAircraftCard from '$lib/components/weight-balance/workbench/WbWorkbenchAircraftCard.svelte';
  import WbWorkbenchLoadingTable from '$lib/components/weight-balance/workbench/WbWorkbenchLoadingTable.svelte';
  import WbWorkbenchResultsRail from '$lib/components/weight-balance/workbench/WbWorkbenchResultsRail.svelte';
  import WbWorkbenchDialogs from '$lib/components/weight-balance/workbench/WbWorkbenchDialogs.svelte';

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
  let uncertaintyWeightTolerance = $state(2);
  let uncertaintyArmTolerance = $state(0.2);
  let sensitivityDeltaWeight = $state(10);
  let envelopeInputMode = $state<EnvelopeInputMode>('station');
  let showFuelBurnDialog = $state(false);
  let fuelBurnConfig = $state<FuelBurnConfig | null>(null);
  let fuelBurnResults = $state<FuelBurnResults | null>(null);
  let fuelBurnRate = $state(10);
  let fuelBurnDuration = $state(180);
  let selectedFuelProfile = $state<string | null>(null);

  function recalculate() {
    const validation = validateInput(aircraft, items);
    if (!validation.valid) {
      wbLogger.error('Validation errors', { errors: validation.errors });
      return;
    }

    results = calculateWeightAndBalance(aircraft, items, {
      uncertaintyWeightTolerance,
      uncertaintyArmTolerance,
      sensitivityDeltaWeight
    });
    updateEnvelopeChart();
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
      uncertaintyBand: {
        cgMin: results.analysis.uncertaintyBand.cgMin,
        cgMax: results.analysis.uncertaintyBand.cgMax
      },
      category: results.category || undefined,
      useMACDisplay,
      lemac: aircraft.lemac,
      mac: aircraft.mac
    });
  }

  function updateItemWeight(itemId: string, newWeight: number) {
    const item = items.find((entry) => entry.id === itemId);
    if (!item) return;
    item.weight = newWeight;
    recalculate();
  }

  function updateItemArm(itemId: string, newArm: number) {
    const item = items.find((entry) => entry.id === itemId);
    if (!item) return;
    item.arm = newArm;
    recalculate();
  }

  function addBasicEmptyWeight() {
    const bewItem = items.find((entry) => entry.id === 'bew');
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

  function handleAircraftSelect(profileKey: string) {
    const profile = AIRCRAFT_PROFILES[profileKey];
    if (!profile) return;

    aircraft = profile;
    items = createSampleLoading(profileKey);
    addBasicEmptyWeight();
    recalculate();
    showAircraftDialog = false;
  }

  function handleEditEnvelope(envelope: CGEnvelope | null) {
    if (!envelope) return;
    editingEnvelope = JSON.parse(JSON.stringify(envelope));
    convertEditingEnvelopeToInputMode(envelopeInputMode);
    envelopeValidationErrors = validateEnvelope(editingEnvelope!);
    showEnvelopeDialog = true;
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

  function convertEditingEnvelopeToInputMode(targetMode: EnvelopeInputMode) {
    if (!editingEnvelope || !hasMACData(aircraft.lemac, aircraft.mac)) return;

    for (const vertex of editingEnvelope.vertices) {
      vertex.cgPosition = convertStationToEnvelopeInput(vertex.cgPosition, targetMode, aircraft.lemac, aircraft.mac);
    }

    if (editingEnvelope.forwardLimit) {
      editingEnvelope.forwardLimit = convertStationToEnvelopeInput(
        editingEnvelope.forwardLimit,
        targetMode,
        aircraft.lemac,
        aircraft.mac
      );
    }

    if (editingEnvelope.aftLimit) {
      editingEnvelope.aftLimit = convertStationToEnvelopeInput(
        editingEnvelope.aftLimit,
        targetMode,
        aircraft.lemac,
        aircraft.mac
      );
    }
  }

  function toggleEnvelopeInputMode() {
    const newMode: EnvelopeInputMode = envelopeInputMode === 'station' ? 'mac' : 'station';
    convertEditingEnvelopeToInputMode(newMode);
    envelopeInputMode = newMode;
  }

  function handleSaveEnvelope() {
    if (!editingEnvelope) return;
    const envelopeToSave = JSON.parse(JSON.stringify(editingEnvelope));

    for (const vertex of envelopeToSave.vertices) {
      vertex.cgPosition = convertEnvelopeInputToStation(vertex.cgPosition, envelopeInputMode, aircraft.lemac, aircraft.mac);
    }
    if (envelopeToSave.forwardLimit) {
      envelopeToSave.forwardLimit = convertEnvelopeInputToStation(
        envelopeToSave.forwardLimit,
        envelopeInputMode,
        aircraft.lemac,
        aircraft.mac
      );
    }
    if (envelopeToSave.aftLimit) {
      envelopeToSave.aftLimit = convertEnvelopeInputToStation(
        envelopeToSave.aftLimit,
        envelopeInputMode,
        aircraft.lemac,
        aircraft.mac
      );
    }

    const errors = validateEnvelope(envelopeToSave);
    const summary = getValidationSummary(errors);
    if (!summary.isValid) {
      if (!confirm(`Envelope has validation errors:\n${summary.message}\n\nDo you want to save anyway?`)) {
        return;
      }
    }

    const envelopeIndex = aircraft.envelopes.findIndex((entry) => entry.category === envelopeToSave.category);
    if (envelopeIndex >= 0) aircraft.envelopes[envelopeIndex] = envelopeToSave;
    else aircraft.envelopes.push(envelopeToSave);

    showEnvelopeDialog = false;
    editingEnvelope = null;
    envelopeValidationErrors = [];
    envelopeInputMode = 'station';
    recalculate();
  }

  function openFuelBurnSimulator() {
    fuelBurnConfig = createFuelBurnConfigFromItems(items, fuelBurnRate, fuelBurnDuration);
    showFuelBurnDialog = true;
  }

  function runFuelBurnSimulation() {
    if (!fuelBurnConfig) return;
    fuelBurnConfig.burnRate = fuelBurnRate;
    fuelBurnConfig.duration = fuelBurnDuration;
    fuelBurnResults = simulateFuelBurn(aircraft, items, fuelBurnConfig);
    updateEnvelopeChart();
  }

  function applyFuelProfile(profileKey: string) {
    const profile = FUEL_BURN_PROFILES[profileKey as keyof typeof FUEL_BURN_PROFILES];
    if (!profile) return;

    fuelBurnRate = profile.burnRate;
    fuelBurnDuration = profile.duration;
    selectedFuelProfile = profileKey;
    runFuelBurnSimulation();
  }

  function exportFuelBurnReport() {
    if (!fuelBurnResults) return;

    let csv = 'Time (min),Fuel Remaining (gal),Weight (lbs),CG Position (in),Moment (lb-in),Category,In Envelope\n';
    for (const step of fuelBurnResults.steps) {
      csv += `${step.time.toFixed(1)},${step.fuelRemaining.toFixed(1)},${step.totalWeight.toFixed(1)},${step.cgPosition.toFixed(2)},${step.totalMoment.toFixed(1)},${step.category || 'N/A'},${step.inEnvelope ? 'Yes' : 'No'}\n`;
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fuel-burn-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleItemLibrarySelect(category: typeof selectedCategory, index: number) {
    const libraryItem = ITEM_LIBRARY[category][index];
    newItemName = libraryItem.name;
    newItemWeight = libraryItem.defaultWeight;
    newItemArm = libraryItem.defaultArm;

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
      items: items.filter((item) => item.id !== 'bew')
    });
    showSaveDialog = false;
  }

  function handleLoadClick() {
    fileInput?.click();
  }

  async function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
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

    input.value = '';
  }

  function handleAddItemConfirm() {
    if (!newItemName.trim()) {
      alert('Please enter an item name');
      return;
    }

    items.push({
      id: `item-${nextItemId}`,
      type: newItemType,
      name: newItemName,
      weight: newItemWeight,
      arm: newItemArm,
      editable: true
    });
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
      items = items.filter((item) => item.id !== itemId);
      recalculate();
    }
  }

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
    items.push(createItemFromTemplate(template, `item-${nextItemId}`));
    nextItemId++;
    showTemplatesDialog = false;
    recalculate();
  }

  function handleDeleteTemplate(id: string) {
    if (!confirm('Delete this template?')) return;
    deleteTemplate(id);
    userTemplates = loadTemplates();
  }

  function handleCalculateBallast() {
    if (!results) return;

    const envelope = aircraft.envelopes[0];
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

    items.push({
      id: `ballast-${nextItemId}`,
      type: 'equipment_removable',
      name: 'Ballast (Auto-calculated)',
      weight: ballastSolution.weight,
      arm: ballastSolution.arm,
      editable: true
    });
    nextItemId++;
    showBallastDialog = false;
    recalculate();
  }

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

  const finiteOr = (value: number, fallback: number): number => Number.isFinite(value) ? value : fallback;

  function handleUncertaintyWeightInput(rawValue: number) {
    uncertaintyWeightTolerance = Math.max(0, finiteOr(parseWeightInput(rawValue, displayUnits), uncertaintyWeightTolerance));
    recalculate();
  }

  function handleUncertaintyArmInput(rawValue: number) {
    uncertaintyArmTolerance = Math.max(0, finiteOr(parseArmInput(rawValue, displayUnits), uncertaintyArmTolerance));
    recalculate();
  }

  function handleSensitivityDeltaInput(rawValue: number) {
    sensitivityDeltaWeight = Math.max(0.1, finiteOr(parseWeightInput(rawValue, displayUnits), sensitivityDeltaWeight));
    recalculate();
  }

  onMount(() => {
    const saved = loadFromLocalStorage();
    if (saved) {
      aircraft = saved.aircraft;
      items = saved.items;
    }

    userTemplates = loadTemplates();
    addBasicEmptyWeight();
    recalculate();

    const handleResize = () => updateEnvelopeChart();
    window.addEventListener('resize', handleResize);

    const handleKeydown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        handleSaveClick();
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'o') {
        event.preventDefault();
        handleLoadClick();
      }
    };
    window.addEventListener('keydown', handleKeydown);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeydown);
    };
  });
</script>

<div data-route-ready="weight-balance">
  <div class="wb-theme-app min-h-screen p-8">
    <div class="max-w-7xl mx-auto">
      <WbWorkbenchHeader
        {aircraft}
        {results}
        {displayUnits}
        {useMACDisplay}
        {showDisclaimer}
        {fileInput}
        onToggleMacDisplay={() => {
          useMACDisplay = !useMACDisplay;
          updateEnvelopeChart();
        }}
        onEditMAC={() => (showMACDialog = true)}
        onCalculateBallast={handleCalculateBallast}
        onOpenFuelBurn={openFuelBurnSimulator}
        onToggleUnits={() => (displayUnits = displayUnits === 'imperial' ? 'metric' : 'imperial')}
        onSave={handleSaveClick}
        onLoad={handleLoadClick}
        onFileSelect={handleFileSelect}
        onDismissDisclaimer={() => (showDisclaimer = false)}
      />

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-6">
          <WbWorkbenchAircraftCard
            {aircraft}
            {displayUnits}
            onOpenAircraftDialog={() => (showAircraftDialog = true)}
            onEditEnvelope={handleEditEnvelope}
            onBasicEmptyWeightInput={(value) => {
              aircraft.basicEmptyWeight = value;
              recalculate();
            }}
            onBasicEmptyArmInput={(value) => {
              aircraft.basicEmptyWeightArm = value;
              recalculate();
            }}
            onMaxTakeoffWeightInput={(value) => {
              aircraft.maxTakeoffWeight = value;
              recalculate();
            }}
          />

          <WbWorkbenchLoadingTable
            {items}
            {displayUnits}
            onOpenItemLibrary={() => (showItemLibraryDialog = true)}
            onOpenTemplates={() => (showTemplatesDialog = true)}
            onAddCustom={() => {
              newItemName = '';
              newItemType = 'occupant';
              newItemWeight = 0;
              newItemArm = 0;
              showAddItemDialog = true;
            }}
            onReset={resetToSample}
            onUpdateItemWeight={updateItemWeight}
            onUpdateItemArm={updateItemArm}
            onSaveAsTemplate={handleSaveAsTemplate}
            onRemoveItem={handleRemoveItem}
          />
        </div>

        <WbWorkbenchResultsRail
          {results}
          {displayUnits}
          {uncertaintyWeightTolerance}
          {uncertaintyArmTolerance}
          {sensitivityDeltaWeight}
          onWeightToleranceInput={handleUncertaintyWeightInput}
          onArmToleranceInput={handleUncertaintyArmInput}
          onSensitivityDeltaInput={handleSensitivityDeltaInput}
          {getSeverityColor}
          {getStatusColor}
        />
      </div>

      {#if results}
        <div class="wb-theme-panel mt-6 rounded-lg p-6">
          <h2 class="text-xl font-semibold text-white mb-4">CG Envelope Chart</h2>
          <div class="wb-theme-frame rounded-lg overflow-hidden" bind:this={envelopeContainer}></div>
        </div>
      {/if}
    </div>
  </div>
</div>

<WbWorkbenchDialogs
  {showSaveDialog}
  bind:configName
  {showAddItemDialog}
  {showAircraftDialog}
  {showEnvelopeDialog}
  {editingEnvelope}
  {envelopeValidationErrors}
  {envelopeInputMode}
  {showItemLibraryDialog}
  {selectedCategory}
  {showTemplatesDialog}
  {userTemplates}
  {showSaveTemplateDialog}
  {selectedItemForTemplate}
  {showBallastDialog}
  {ballastSolution}
  {showMACDialog}
  {showFuelBurnDialog}
  {fuelBurnConfig}
  {fuelBurnResults}
  bind:fuelBurnRate
  bind:fuelBurnDuration
  bind:selectedFuelProfile
  {displayUnits}
  {aircraft}
  {results}
  bind:newItemName
  bind:newItemType
  bind:newItemWeight
  bind:newItemArm
  bind:templateName
  bind:templateDescription
  bind:templateCategory
  onCloseSave={() => (showSaveDialog = false)}
  onConfirmSave={handleSaveConfirm}
  onCloseAddItem={() => (showAddItemDialog = false)}
  onConfirmAddItem={handleAddItemConfirm}
  onCloseAircraft={() => (showAircraftDialog = false)}
  onSelectAircraft={handleAircraftSelect}
  onToggleEnvelopeMode={toggleEnvelopeInputMode}
  onAddEnvelopeVertex={addEnvelopeVertex}
  onRemoveEnvelopeVertex={removeEnvelopeVertex}
  onValidateEnvelope={validateCurrentEnvelope}
  onSaveEnvelope={handleSaveEnvelope}
  onCloseEnvelope={() => {
    showEnvelopeDialog = false;
    editingEnvelope = null;
    envelopeValidationErrors = [];
  }}
  onCloseItemLibrary={() => (showItemLibraryDialog = false)}
  onSelectCategory={(category: typeof selectedCategory) => (selectedCategory = category)}
  onSelectLibraryItem={(index: number) => handleItemLibrarySelect(selectedCategory, index)}
  onCloseTemplates={() => (showTemplatesDialog = false)}
  onDeleteTemplate={handleDeleteTemplate}
  onAddFromTemplate={handleAddFromTemplate}
  onCancelSaveTemplate={() => {
    showSaveTemplateDialog = false;
    selectedItemForTemplate = null;
  }}
  onConfirmSaveTemplate={handleSaveTemplateConfirm}
  onCloseBallast={() => (showBallastDialog = false)}
  onAddBallast={handleAddBallast}
  onCloseMAC={() => (showMACDialog = false)}
  onSaveMAC={() => {
    showMACDialog = false;
    recalculate();
  }}
  onCloseFuelBurn={() => {
    showFuelBurnDialog = false;
    fuelBurnResults = null;
  }}
  onRunFuelBurn={runFuelBurnSimulation}
  onApplyFuelProfile={applyFuelProfile}
  onExportFuelBurn={exportFuelBurnReport}
/>

<style>
  .wb-theme-app {
    background:
      radial-gradient(circle at 14% 18%, color-mix(in srgb, var(--accent-primary) 12%, transparent), transparent 32%),
      linear-gradient(135deg, color-mix(in srgb, var(--bg-primary) 88%, black), color-mix(in srgb, var(--bg-secondary) 92%, black), color-mix(in srgb, var(--bg-primary) 86%, black));
  }

  .wb-theme-panel {
    background: color-mix(in srgb, var(--bg-secondary) 66%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent-primary) 18%, rgba(255, 255, 255, 0.08));
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent-primary) 8%, transparent);
  }

  .wb-theme-frame {
    border: 1px solid color-mix(in srgb, var(--accent-primary) 16%, rgba(148, 163, 184, 0.18));
  }
</style>
