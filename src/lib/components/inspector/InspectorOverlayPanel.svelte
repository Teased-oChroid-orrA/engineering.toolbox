<script lang="ts">
  // @ts-nocheck
  import InspectorOverlayStack from '$lib/components/inspector/InspectorOverlayStack.svelte';

  export let showRecipeModal = false;
  export let showSchemaModal = false;
  export let showRowDrawer = false;
  export let showHeaderPrompt = false;
  export let showColumnPicker = false;
  export let showSvarBuilder = false;
  export let showRegexGenerator = false;
  export let showShortcuts = false;
  export let uiAnimDur = 160;
  export let hasLoaded = false;
  export let recipeNotice: any = '';
  export let recipeName = '';
  export let recipeTags = '';
  export let importMode: any = 'merge';
  export let recipes: any[] = [];
  export let datasetLabel = '(none)';
  export let schemaSampleN = 5000;
  export let totalFilteredCount = 0;
  export let totalRowCount = 0;
  export let schemaScopeLabel = '';
  export let schemaError: string | null = null;
  export let schemaLoading = false;
  export let schemaSampleTier: any = 'filtered';
  export let schemaSearch = '';
  export let schemaSuggested: any = [];
  export let schemaOutliers: any = [];
  export let schemaRelationshipHints: any = [];
  export let schemaDrift: any = null;
  export let colTypes: any[] = [];
  export let headers: string[] = [];
  export let schemaFiltered: any = [];
  export let catF: any = {};
  export let drawerVisualIdx: any = 0;
  export let drawerSearch = '';
  export let drawerLoading = false;
  export let drawerError: string | null = null;
  export let drawerList: any[] = [];
  export let drawerExplain: any = null;
  export let headerHeuristicReason: string | null = null;
  export let visibleColumns: any = [];
  export let columnPickerNotice: string | null = null;
  export let svarFields: any[] = [];
  export let svarOptions: any = {};
  export let svarFilterSet: any = {};
  export let genTab: any = 'generate';
  export let genFlagI = false;
  export let genFlagM = false;
  export let genFlagS = false;
  export let genOut = '';
  export let genErr: string | null = null;
  export let genWarn: any = [];
  export let regexTemplates: any[] = [];
  export let testText = '';
  export let testMatches: any = { count: 0, sample: [] };
  export let genBuildMode: any = 'clauses';
  export let genClauses: any[] = [];
  export let genAddKind: any = 'literal';
  export let floatingStyle: (key: string) => string = () => '';
  export let resetModalPos: (key: string) => void = () => {};
  export let beginDragModal: (key: string, e: MouseEvent) => void = () => {};
  export let computeSchemaStats: any = () => {};
  export let runFilterNow: any = () => {};
  export let closeRowDrawer: () => void = () => {};
  export let navRow: (delta: number) => void = () => {};
  export let copyDrawerAsJson: any = () => {};
  export let applyHeaderChoice: any = () => {};
  export let cancelHeaderPrompt: () => void = () => {};
  export let smartSelectColumns: () => void = () => {};
  export let selectAllColumns: () => void = () => {};
  export let clearColumnSelection: () => void = () => {};
  export let toggleVisibleCol: (i: number) => void = () => {};
  export let saveCurrentAsRecipe: any = () => {};
  export let exportRecipesCurrent: () => void = () => {};
  export let importRecipesFile: any = () => {};
  export let toggleRecipeFavorite: (id: string) => void = () => {};
  export let applyRecipe: any = () => {};
  export let deleteRecipe: (id: string) => void = () => {};
  export let setSchemaDriftBaseline: () => void = () => {};
  export let schemaActionTarget: (idx: number) => void = () => {};
  export let schemaActionCategory: (idx: number, autoSelectTop?: boolean) => void = () => {};
  export let schemaActionNumericRange: (idx: number, useMinMax?: boolean) => void = () => {};
  export let schemaActionDateRange: (idx: number, useMinMax?: boolean) => void = () => {};
  export let drawerApplyTarget: (idx: number) => void = () => {};
  export let drawerApplyCategory: (idx: number, value: string) => void = () => {};
  export let drawerApplyNumericExact: (idx: number, value: string) => void = () => {};
  export let drawerApplyDateExact: (idx: number, value: string) => void = () => {};
  export let applySvarBuilderToFilters: () => void = () => {};
  export let applyGeneratedRegex: (pat: string) => void = () => {};
  export let moveClause: (idx: number, dir: -1 | 1) => void = () => {};
  export let removeClause: (idx: number) => void = () => {};
  export let addClause: (kind: any) => void = () => {};
</script>

<InspectorOverlayStack
  bind:showRecipeModal
  bind:showSchemaModal
  bind:showRowDrawer
  bind:showHeaderPrompt
  bind:showColumnPicker
  bind:showSvarBuilder
  bind:showRegexGenerator
  bind:showShortcuts
  {uiAnimDur}
  {hasLoaded}
  bind:recipeNotice
  bind:recipeName
  bind:recipeTags
  bind:importMode
  {recipes}
  {datasetLabel}
  bind:schemaSampleN
  {totalFilteredCount}
  {totalRowCount}
  {schemaScopeLabel}
  {schemaError}
  {schemaLoading}
  bind:schemaSampleTier
  bind:schemaSearch
  {schemaSuggested}
  {schemaOutliers}
  {schemaRelationshipHints}
  {schemaDrift}
  {colTypes}
  {headers}
  {schemaFiltered}
  bind:catF
  {drawerVisualIdx}
  bind:drawerSearch
  {drawerLoading}
  {drawerError}
  {drawerList}
  {drawerExplain}
  {headerHeuristicReason}
  {visibleColumns}
  {columnPickerNotice}
  {svarFields}
  {svarOptions}
  bind:svarFilterSet
  bind:genTab
  bind:genFlagI
  bind:genFlagM
  bind:genFlagS
  {genOut}
  {genErr}
  {genWarn}
  {regexTemplates}
  bind:testText
  {testMatches}
  bind:genBuildMode
  bind:genClauses
  {genAddKind}
  {floatingStyle}
  {resetModalPos}
  {beginDragModal}
  {computeSchemaStats}
  {runFilterNow}
  {closeRowDrawer}
  {navRow}
  {copyDrawerAsJson}
  {applyHeaderChoice}
  {cancelHeaderPrompt}
  {smartSelectColumns}
  {selectAllColumns}
  {clearColumnSelection}
  {toggleVisibleCol}
  {saveCurrentAsRecipe}
  {exportRecipesCurrent}
  {importRecipesFile}
  {toggleRecipeFavorite}
  {applyRecipe}
  {deleteRecipe}
  {setSchemaDriftBaseline}
  {schemaActionTarget}
  {schemaActionCategory}
  {schemaActionNumericRange}
  {schemaActionDateRange}
  {drawerApplyTarget}
  {drawerApplyCategory}
  {drawerApplyNumericExact}
  {drawerApplyDateExact}
  {applySvarBuilderToFilters}
  {applyGeneratedRegex}
  {moveClause}
  {removeClause}
  {addClause}
/>
