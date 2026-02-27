<script lang="ts">
  import { hasMACData } from '$lib/core/weight-balance/mac';
  import type { BallastSolution } from '$lib/core/weight-balance/ballast';
  import type {
    AircraftProfile,
    CGEnvelope,
    EnvelopeInputMode,
    FuelBurnConfig,
    FuelBurnResults,
    LoadingItem,
    LoadingItemType,
    LoadingResults
  } from '$lib/core/weight-balance/types';
  import type { ValidationError } from '$lib/core/weight-balance/validation';
  import type { ItemTemplate } from '$lib/core/weight-balance/templates';
  import type { UnitSystem } from '$lib/core/weight-balance/units';
  import WbSaveDialog from '$lib/components/weight-balance/dialogs/WbSaveDialog.svelte';
  import WbAddItemDialog from '$lib/components/weight-balance/dialogs/WbAddItemDialog.svelte';
  import WbAircraftDialog from '$lib/components/weight-balance/dialogs/WbAircraftDialog.svelte';
  import WbItemLibraryDialog from '$lib/components/weight-balance/dialogs/WbItemLibraryDialog.svelte';
  import WbTemplatesDialog from '$lib/components/weight-balance/dialogs/WbTemplatesDialog.svelte';
  import WbSaveTemplateDialog from '$lib/components/weight-balance/dialogs/WbSaveTemplateDialog.svelte';
  import WbBallastDialog from '$lib/components/weight-balance/dialogs/WbBallastDialog.svelte';
  import WbMacDialog from '$lib/components/weight-balance/dialogs/WbMacDialog.svelte';
  import WbFuelBurnDialog from '$lib/components/weight-balance/dialogs/WbFuelBurnDialog.svelte';
  import WbEnvelopeDialog from '$lib/components/weight-balance/dialogs/WbEnvelopeDialog.svelte';

  let {
    showSaveDialog,
    configName = $bindable(),
    showAddItemDialog,
    showAircraftDialog,
    showEnvelopeDialog,
    editingEnvelope,
    envelopeValidationErrors,
    envelopeInputMode,
    showItemLibraryDialog,
    selectedCategory,
    showTemplatesDialog,
    userTemplates,
    showSaveTemplateDialog,
    selectedItemForTemplate,
    showBallastDialog,
    ballastSolution,
    showMACDialog,
    showFuelBurnDialog,
    fuelBurnConfig,
    fuelBurnResults,
    fuelBurnRate = $bindable(),
    fuelBurnDuration = $bindable(),
    selectedFuelProfile = $bindable(),
    displayUnits,
    aircraft,
    results,
    newItemName = $bindable(),
    newItemType = $bindable(),
    newItemWeight = $bindable(),
    newItemArm = $bindable(),
    templateName = $bindable(),
    templateDescription = $bindable(),
    templateCategory = $bindable(),
    onCloseSave,
    onConfirmSave,
    onCloseAddItem,
    onConfirmAddItem,
    onCloseAircraft,
    onSelectAircraft,
    onToggleEnvelopeMode,
    onAddEnvelopeVertex,
    onRemoveEnvelopeVertex,
    onValidateEnvelope,
    onSaveEnvelope,
    onCloseEnvelope,
    onCloseItemLibrary,
    onSelectCategory,
    onSelectLibraryItem,
    onCloseTemplates,
    onDeleteTemplate,
    onAddFromTemplate,
    onCancelSaveTemplate,
    onConfirmSaveTemplate,
    onCloseBallast,
    onAddBallast,
    onCloseMAC,
    onSaveMAC,
    onCloseFuelBurn,
    onRunFuelBurn,
    onApplyFuelProfile,
    onExportFuelBurn
  } = $props<{
    showSaveDialog: boolean;
    configName: string;
    showAddItemDialog: boolean;
    showAircraftDialog: boolean;
    showEnvelopeDialog: boolean;
    editingEnvelope: CGEnvelope | null;
    envelopeValidationErrors: ValidationError[];
    envelopeInputMode: EnvelopeInputMode;
    showItemLibraryDialog: boolean;
    selectedCategory: 'occupants' | 'fuel' | 'baggage' | 'equipment' | 'cargo';
    showTemplatesDialog: boolean;
    userTemplates: ItemTemplate[];
    showSaveTemplateDialog: boolean;
    selectedItemForTemplate: LoadingItem | null;
    showBallastDialog: boolean;
    ballastSolution: BallastSolution | null;
    showMACDialog: boolean;
    showFuelBurnDialog: boolean;
    fuelBurnConfig: FuelBurnConfig | null;
    fuelBurnResults: FuelBurnResults | null;
    fuelBurnRate: number;
    fuelBurnDuration: number;
    selectedFuelProfile: string | null;
    displayUnits: UnitSystem;
    aircraft: AircraftProfile;
    results: LoadingResults | null;
    newItemName: string;
    newItemType: LoadingItemType;
    newItemWeight: number;
    newItemArm: number;
    templateName: string;
    templateDescription: string;
    templateCategory: ItemTemplate['category'];
    onCloseSave: () => void;
    onConfirmSave: () => void;
    onCloseAddItem: () => void;
    onConfirmAddItem: () => void;
    onCloseAircraft: () => void;
    onSelectAircraft: (profileKey: string) => void;
    onToggleEnvelopeMode: () => void;
    onAddEnvelopeVertex: () => void;
    onRemoveEnvelopeVertex: (index: number) => void;
    onValidateEnvelope: () => void;
    onSaveEnvelope: () => void;
    onCloseEnvelope: () => void;
    onCloseItemLibrary: () => void;
    onSelectCategory: (category: 'occupants' | 'fuel' | 'baggage' | 'equipment' | 'cargo') => void;
    onSelectLibraryItem: (index: number) => void;
    onCloseTemplates: () => void;
    onDeleteTemplate: (id: string) => void;
    onAddFromTemplate: (template: ItemTemplate) => void;
    onCancelSaveTemplate: () => void;
    onConfirmSaveTemplate: () => void;
    onCloseBallast: () => void;
    onAddBallast: () => void;
    onCloseMAC: () => void;
    onSaveMAC: () => void;
    onCloseFuelBurn: () => void;
    onRunFuelBurn: () => void;
    onApplyFuelProfile: (profileKey: string) => void;
    onExportFuelBurn: () => void;
  }>();
</script>

{#if showSaveDialog}
  <WbSaveDialog bind:configName onCancel={onCloseSave} onConfirm={onConfirmSave} />
{/if}

{#if showAddItemDialog}
  <WbAddItemDialog
    {displayUnits}
    bind:newItemName
    bind:newItemType
    bind:newItemWeight
    bind:newItemArm
    onCancel={onCloseAddItem}
    onConfirm={onConfirmAddItem}
  />
{/if}

{#if showAircraftDialog}
  <WbAircraftDialog onClose={onCloseAircraft} onSelect={onSelectAircraft} />
{/if}

{#if showEnvelopeDialog && editingEnvelope}
  <WbEnvelopeDialog
    {editingEnvelope}
    {envelopeValidationErrors}
    {envelopeInputMode}
    hasMACConfig={hasMACData(aircraft.lemac, aircraft.mac)}
    useMACDisplay={false}
    onToggleMode={onToggleEnvelopeMode}
    onAddVertex={onAddEnvelopeVertex}
    onRemoveVertex={onRemoveEnvelopeVertex}
    onValidate={onValidateEnvelope}
    onSave={onSaveEnvelope}
    onCancel={onCloseEnvelope}
  />
{/if}

{#if showItemLibraryDialog}
  <WbItemLibraryDialog
    {selectedCategory}
    onSelectCategory={onSelectCategory}
    onSelectItem={onSelectLibraryItem}
    onClose={onCloseItemLibrary}
  />
{/if}

{#if showTemplatesDialog}
  <WbTemplatesDialog {userTemplates} onClose={onCloseTemplates} onDelete={onDeleteTemplate} onAdd={onAddFromTemplate} />
{/if}

{#if showSaveTemplateDialog && selectedItemForTemplate}
  <WbSaveTemplateDialog
    {selectedItemForTemplate}
    bind:templateName
    bind:templateDescription
    bind:templateCategory
    onCancel={onCancelSaveTemplate}
    onConfirm={onConfirmSaveTemplate}
  />
{/if}

{#if showBallastDialog && ballastSolution}
  <WbBallastDialog {ballastSolution} {displayUnits} onClose={onCloseBallast} onAddBallast={onAddBallast} />
{/if}

{#if showMACDialog}
  <WbMacDialog {aircraft} {results} onClose={onCloseMAC} onSave={onSaveMAC} />
{/if}

{#if showFuelBurnDialog && fuelBurnConfig}
  <WbFuelBurnDialog
    {fuelBurnConfig}
    {fuelBurnResults}
    bind:fuelBurnRate
    bind:fuelBurnDuration
    bind:selectedFuelProfile
    onClose={onCloseFuelBurn}
    onRun={onRunFuelBurn}
    onApplyProfile={onApplyFuelProfile}
    onExport={onExportFuelBurn}
  />
{/if}
