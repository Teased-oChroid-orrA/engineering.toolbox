<script lang="ts">
  import InspectorTopControls from '$lib/components/inspector/InspectorTopControls.svelte';
  import InspectorTier2Panel from '$lib/components/inspector/InspectorTier2Panel.svelte';
  import InspectorRegexHelpPanel from '$lib/components/inspector/InspectorRegexHelpPanel.svelte';
  import type { MultiQueryClause } from '$lib/components/inspector/InspectorStateTypes';

  export let topControlSpans: Record<string, string> = {};
  export let headerMode: 'auto' | 'yes' | 'no' = 'auto';
  export let hasLoaded = false;
  export let isLoading = false;
  export let headers: string[] = [];
  export let targetColIdx: number | null = null;
  export let matchMode: 'fuzzy' | 'exact' | 'regex' = 'fuzzy';
  export let queryScope: 'current' | 'all' | 'ask' = 'current';
  export let query = '';
  export let multiQueryEnabled = false;
  export let multiQueryExpanded = false;
  export let multiQueryClauses: MultiQueryClause[] = [];
  export let maxRowsScanText = '';
  export let tier2Open = false;
  export let visibleColCount = 0;
  export let queryError: string | null = '';
  export let showControlsDebug = false;
  export let showDataControls = true;
  export let loadedDatasets = 0;
  export let activeDatasetId = '';
  export let datasetId = '';
  export let totalRowCount = 0;
  export let canOpenPath = false;
  export let showRegexHelp = false;
  export let uiAnimDur = 160;
  export let tier2Tab: any = 'category';
  export let numericF: any = {};
  export let dateF: any = {};
  export let catF: any = {};
  export let catSearch = '';
  export let catAvailSearch = '';
  export let catAvailItems: any[] = [];
  export let catAvailDistinctTotal = 0;
  export let catAvailRowsScanned = 0;
  export let catAvailTotalRowsInView = 0;
  export let catAvailPartial = false;
  export let catAvailLoading = false;
  export let catAvailError: string | null = '';

  export let onHeaderModeChange: (value: 'auto' | 'yes' | 'no') => void = () => {};
  export let onTargetColChange: (value: number | null) => void = () => {};
  export let onMatchModeChange: (value: 'fuzzy' | 'exact' | 'regex') => void = () => {};
  export let onQueryScopeChange: (value: 'current' | 'all' | 'ask') => void = () => {};
  export let onQueryChange: (value: string) => void = () => {};
  export let onMaxRowsScanTextChange: (value: string) => void = () => {};
  export let onTier2Toggle: (value: boolean) => void = () => {};
  export let onOpenColumnPicker: () => void = () => {};
  export let onOpenBuilder: () => void = () => {};
  export let onSetRegexMode: () => void = () => {};
  export let onOpenHelp: () => void = () => {};
  export let onOpenGenerator: () => void = () => {};
  export let onOpenRecipes: () => void = () => {};
  export let onMultiQueryEnabledChange: (enabled: boolean) => void = () => {};
  export let onMultiQueryExpandedChange: (expanded: boolean) => void = () => {};
  export let onAddMultiQueryClause: () => void = () => {};
  export let onRemoveMultiQueryClause: (id: string) => void = () => {};
  export let onUpdateMultiQueryClause: (id: string, patch: Partial<MultiQueryClause>) => void = () => {};
  export let onSetTier2Tab: (tab: any) => void = () => {};
  export let scheduleFilter: (reason?: string) => void = () => {};
  export let runFilterNow: () => Promise<void> | void = () => {};
  export let fetchCategoryValues: (reset?: boolean) => Promise<void> | void = () => {};
</script>

<div class="order-35">
  <details class="glass-panel rounded-2xl border border-white/10 bg-white/[0.03] inspector-pop-sub inspector-depth-0 p-2" open>
    <summary class="cursor-pointer list-none px-2 py-1 text-[11px] uppercase tracking-widest text-white/60">
      Query & Filter Controls
    </summary>
    <div class="mt-2">
      <InspectorTopControls
        {topControlSpans}
        {headerMode}
        {hasLoaded}
        {isLoading}
        {headers}
        {targetColIdx}
        {matchMode}
        {queryScope}
        {query}
        {multiQueryEnabled}
        {multiQueryExpanded}
        multiQueryCount={multiQueryClauses.filter((c) => (c.query ?? '').trim().length > 0).length}
        {maxRowsScanText}
        {tier2Open}
        {visibleColCount}
        {queryError}
        {showControlsDebug}
        {showDataControls}
        {loadedDatasets}
        {activeDatasetId}
        {datasetId}
        {totalRowCount}
        {onHeaderModeChange}
        {onTargetColChange}
        {onMatchModeChange}
        {onQueryScopeChange}
        {onQueryChange}
        {onMaxRowsScanTextChange}
        {onTier2Toggle}
        {onOpenColumnPicker}
        {onOpenBuilder}
        {onSetRegexMode}
        {onOpenHelp}
        {onOpenGenerator}
        {onOpenRecipes}
        {multiQueryClauses}
        {onMultiQueryEnabledChange}
        {onMultiQueryExpandedChange}
        {onAddMultiQueryClause}
        {onRemoveMultiQueryClause}
        {onUpdateMultiQueryClause}
      >
        <InspectorRegexHelpPanel open={showRegexHelp} {uiAnimDur} />
        <InspectorTier2Panel
          {tier2Open}
          {tier2Tab}
          {hasLoaded}
          {headers}
          {numericF}
          {dateF}
          {catF}
          {catSearch}
          {catAvailSearch}
          {catAvailItems}
          {catAvailDistinctTotal}
          {catAvailRowsScanned}
          {catAvailTotalRowsInView}
          {catAvailPartial}
          {catAvailLoading}
          {catAvailError}
          {uiAnimDur}
          {scheduleFilter}
          {runFilterNow}
          fetchCategoryValues={fetchCategoryValues}
          onSetTier2Tab={onSetTier2Tab}
        />
      </InspectorTopControls>
    </div>
  </details>
</div>
