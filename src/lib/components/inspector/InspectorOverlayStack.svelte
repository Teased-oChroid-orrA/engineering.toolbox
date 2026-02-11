<script lang="ts">
  import { type IFilterSet } from '@svar-ui/svelte-filter';
  import InspectorRowDrawer from './InspectorRowDrawer.svelte';
  import InspectorHeaderPromptModal from './InspectorHeaderPromptModal.svelte';
  import InspectorColumnPickerModal from './InspectorColumnPickerModal.svelte';
  import InspectorShortcutsModal from './InspectorShortcutsModal.svelte';
  import InspectorRecipesModal from './InspectorRecipesModal.svelte';
  import InspectorSchemaModal from './InspectorSchemaModal.svelte';
  import InspectorSvarBuilderModal from './InspectorSvarBuilderModal.svelte';
  import InspectorRegexGeneratorModal from './InspectorRegexGeneratorModal.svelte';
  import InspectorOverlayPortal from './InspectorOverlayPortal.svelte';
  import { newClause, type BuildMode, type Clause, type ClauseKind, type GenTab } from './InspectorRegexController';
  import type { Recipe } from './InspectorRecipesController';
  import type { MultiQueryClause } from './InspectorMultiQueryController';

  export let uiAnimDur: number;
  export let showRecipeModal: boolean;
  export let showSchemaModal: boolean;
  export let showRowDrawer: boolean;
  export let showHeaderPrompt: boolean;
  export let showColumnPicker: boolean;
  export let showSvarBuilder: boolean;
  export let showRegexGenerator: boolean;
  export let showShortcuts: boolean;
  export let hasLoaded: boolean;
  export let recipeNotice: string | null;
  export let recipeName: string;
  export let recipeTags: string;
  export let importMode: 'current' | 'file';
  export let recipes: Recipe[];
  export let datasetLabel: string;
  export let schemaSampleN: number;
  export let totalFilteredCount: number;
  export let totalRowCount: number;
  export let schemaScopeLabel: 'full' | 'filtered';
  export let schemaError: string | null;
  export let schemaLoading: boolean;
  export let schemaSampleTier: string;
  export let schemaSearch: string;
  export let schemaSuggested: any;
  export let schemaOutliers: any[];
  export let schemaRelationshipHints: any[];
  export let schemaDrift: any;
  export let colTypes: any[];
  export let headers: string[];
  export let schemaFiltered: any[];
  export let catF: { selected: Set<string> };
  export let drawerVisualIdx: number | null;
  export let drawerSearch: string;
  export let drawerLoading: boolean;
  export let drawerError: string | null;
  export let drawerList: any[];
  export let drawerExplain: any;
  export let headerHeuristicReason: string;
  export let visibleColumns: Set<number>;
  export let columnPickerNotice: string | null;
  export let svarFields: any[];
  export let svarOptions: Record<string, any[]>;
  export let svarFilterSet: IFilterSet;
  export let genTab: GenTab;
  export let genFlagI: boolean;
  export let genFlagM: boolean;
  export let genFlagS: boolean;
  export let genOut: string;
  export let genErr: string | null;
  export let genWarn: any;
  export let regexTemplates: any[];
  export let testText: string;
  export let testMatches: { count: number; sample: string[] };
  export let genBuildMode: BuildMode;
  export let genClauses: Clause[];
  export let genAddKind: ClauseKind;

  export let floatingStyle: (key: string) => string;
  export let resetModalPos: (key: string) => void;
  export let beginDragModal: (key: string, e: MouseEvent) => void;
  export let computeSchemaStats: () => Promise<void>;
  export let runFilterNow: () => Promise<void>;
  export let closeRowDrawer: () => void;
  export let navRow: (d: number) => void;
  export let copyDrawerAsJson: () => Promise<void>;
  export let applyHeaderChoice: (choice: boolean) => Promise<void>;
  export let cancelHeaderPrompt: () => void;
  export let smartSelectColumns: () => void;
  export let selectAllColumns: () => void;
  export let clearColumnSelection: () => void;
  export let toggleVisibleCol: (idx: number) => void;
  export let saveCurrentAsRecipe: () => void;
  export let exportRecipesCurrent: () => Promise<void>;
  export let importRecipesFile: (file: File, mode: 'current' | 'file') => Promise<void>;
  export let toggleRecipeFavorite: (id: string) => void;
  export let applyRecipe: (r: Recipe) => Promise<void>;
  export let deleteRecipe: (id: string) => void;
  export let setSchemaDriftBaseline: () => void;
  export let schemaActionTarget: (idx: number) => void;
  export let schemaActionCategory: (idx: number, autoSelectTop?: boolean) => void;
  export let schemaActionNumericRange: (idx: number, useMinMax?: boolean) => void;
  export let schemaActionDateRange: (idx: number, useMinMax?: boolean) => void;
  export let drawerApplyTarget: (idx: number) => void;
  export let drawerApplyCategory: (idx: number, value: string) => void;
  export let drawerApplyNumericExact: (idx: number, value: string) => void;
  export let drawerApplyDateExact: (idx: number, value: string) => void;
  export let applySvarBuilderToFilters: () => void;
  export let applyGeneratedRegex: (pat: string) => void;
  export let moveClause: (idx: number, dir: -1 | 1) => void;
  export let removeClause: (idx: number) => void;
  export let addClause: (kind: ClauseKind) => void;
</script>

<InspectorOverlayPortal>
  <InspectorRecipesModal
    open={showRecipeModal}
    {uiAnimDur}
    floatingStyle={floatingStyle('recipes')}
    {recipeNotice}
    {recipeName}
    {recipeTags}
    {hasLoaded}
    {importMode}
    {recipes}
    onClose={() => (showRecipeModal = false)}
    onReset={() => resetModalPos('recipes')}
    onBeginDrag={(e: MouseEvent) => beginDragModal('recipes', e)}
    onSetRecipeName={(v: string) => (recipeName = v)}
    onSetRecipeTags={(v: string) => (recipeTags = v)}
    onSave={saveCurrentAsRecipe}
    onExport={exportRecipesCurrent}
    onImport={importRecipesFile}
    onSetImportMode={(v: 'current' | 'file') => (importMode = v)}
    onToggleFavorite={toggleRecipeFavorite}
    onApply={applyRecipe}
    onDelete={deleteRecipe}
  />
</InspectorOverlayPortal>

<InspectorOverlayPortal>
  <InspectorSchemaModal
    open={showSchemaModal}
    {uiAnimDur}
    floatingStyle={floatingStyle('schema')}
    {datasetLabel}
    {schemaSampleN}
    {totalFilteredCount}
    {totalRowCount}
    {schemaScopeLabel}
    {schemaError}
    {hasLoaded}
    {schemaLoading}
    {schemaSampleTier}
    {schemaSearch}
    {schemaSuggested}
    {schemaOutliers}
    {schemaRelationshipHints}
    {schemaDrift}
    {colTypes}
    {headers}
    {schemaFiltered}
    catSelected={catF.selected}
    onClose={() => (showSchemaModal = false)}
    onReset={() => resetModalPos('schema')}
    onBeginDrag={(e: MouseEvent) => beginDragModal('schema', e)}
    onRefresh={() => void computeSchemaStats()}
    onSetSampleTier={(v: string) => (schemaSampleTier = v as any)}
    onSetSampleN={(v: number) => (schemaSampleN = v)}
    onSetSearch={(v: string) => (schemaSearch = v)}
    onSetDriftBaseline={setSchemaDriftBaseline}
    onActionTarget={schemaActionTarget}
    onActionCategory={schemaActionCategory}
    onActionNumeric={schemaActionNumericRange}
    onActionDate={schemaActionDateRange}
    onAddTopToCategory={(idx: number, val: string) => {
      schemaActionCategory(idx, false);
      const s2 = new Set(catF.selected);
      s2.add(val);
      catF.selected = s2;
      void runFilterNow();
    }}
  />
</InspectorOverlayPortal>

<InspectorOverlayPortal>
  <InspectorRowDrawer
    open={showRowDrawer}
    {uiAnimDur}
    {drawerVisualIdx}
    {totalFilteredCount}
    {drawerSearch}
    {drawerLoading}
    {drawerError}
    drawerList={drawerList as any}
    {drawerExplain}
    onClose={closeRowDrawer}
    onNavRow={navRow}
    onCopyJson={copyDrawerAsJson}
    onSetSearch={(value) => (drawerSearch = value)}
    onApplyTarget={drawerApplyTarget}
    onApplyCategory={drawerApplyCategory}
    onApplyNumeric={drawerApplyNumericExact}
    onApplyDate={drawerApplyDateExact}
  />
</InspectorOverlayPortal>

<InspectorOverlayPortal><InspectorHeaderPromptModal open={showHeaderPrompt} {uiAnimDur} {headerHeuristicReason} onCancel={cancelHeaderPrompt} onChoose={applyHeaderChoice} /></InspectorOverlayPortal>
<InspectorOverlayPortal><InspectorColumnPickerModal open={showColumnPicker} {uiAnimDur} {headers} {visibleColumns} {columnPickerNotice} onClose={() => (showColumnPicker = false)} onSmartSelect={smartSelectColumns} onSelectAll={selectAllColumns} onAutoDefault={clearColumnSelection} onToggle={toggleVisibleCol} /></InspectorOverlayPortal>
<InspectorOverlayPortal>
  <InspectorSvarBuilderModal
    open={showSvarBuilder}
    {uiAnimDur}
    floatingStyle={floatingStyle('svar')}
    {hasLoaded}
    {svarFields}
    {svarOptions}
    {svarFilterSet}
    onClose={() => (showSvarBuilder = false)}
    onReset={() => resetModalPos('svar')}
    onBeginDrag={(e: MouseEvent) => beginDragModal('svar', e)}
    onApply={applySvarBuilderToFilters}
    onChange={(ev: any) => {
      const next = ev?.value ?? ev?.detail?.value;
      if (next) svarFilterSet = next as IFilterSet;
    }}
  />
</InspectorOverlayPortal>
<InspectorOverlayPortal>
  <InspectorRegexGeneratorModal
    open={showRegexGenerator}
    {uiAnimDur}
    {genTab}
    {genFlagI}
    {genFlagM}
    {genFlagS}
    {genOut}
    {genErr}
    {genWarn}
    {regexTemplates}
    {testText}
    {testMatches}
    {genBuildMode}
    {genClauses}
    {genAddKind}
    onClose={() => (showRegexGenerator = false)}
    onSetTab={(v: GenTab) => (genTab = v)}
    onToggleFlag={(k: 'i' | 'm' | 's') => {
      if (k === 'i') genFlagI = !genFlagI;
      if (k === 'm') genFlagM = !genFlagM;
      if (k === 's') genFlagS = !genFlagS;
    }}
    onApplyRegex={applyGeneratedRegex}
    onSetTestText={(v: string) => (testText = v)}
    onSetBuildMode={(v: BuildMode) => (genBuildMode = v)}
    onMoveClause={moveClause}
    onRemoveClause={removeClause}
    onUpdateClauseKind={(idx: number, v: ClauseKind) => (genClauses[idx].kind = v)}
    onUpdateClauseField={(idx: number, key: string, v: any) => ((genClauses[idx] as any)[key] = v)}
    onAddClause={(v: ClauseKind) => addClause(v)}
      onClearClauses={() => {
        genClauses = [newClause('contains', '')];
        testText = '';
      }}
  />
</InspectorOverlayPortal>
<InspectorOverlayPortal><InspectorShortcutsModal open={showShortcuts} {uiAnimDur} floatingStyle={floatingStyle('shortcuts')} onClose={() => (showShortcuts = false)} onReset={() => resetModalPos('shortcuts')} onBeginDrag={(e: MouseEvent) => beginDragModal('shortcuts', e)} /></InspectorOverlayPortal>
