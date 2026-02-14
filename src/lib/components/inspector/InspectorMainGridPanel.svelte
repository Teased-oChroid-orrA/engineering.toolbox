<script lang="ts">
  import InspectorQueryRow from '$lib/components/inspector/InspectorQueryRow.svelte';
  import InspectorMergedGrid from '$lib/components/inspector/InspectorMergedGrid.svelte';
  import InspectorVirtualGrid from '$lib/components/inspector/InspectorVirtualGrid.svelte';
  import type { MultiQueryClause } from '$lib/components/inspector/InspectorStateTypes';

  export let hasLoaded = false;
  export let matchMode: 'fuzzy' | 'exact' | 'regex' = 'fuzzy';
  export let queryScope: 'current' | 'all' | 'ask' = 'current';
  export let query = '';
  export let queryError: string | null = '';
  export let multiQueryEnabled = false;
  export let multiQueryExpanded = false;
  export let multiQueryClauses: MultiQueryClause[] = [];
  export let isMergedView = false;

  export let mergedDisplayHeaders: string[] = [];
  export let mergedGroupedRows: { source: string; rows: string[][] }[] = [];
  export let mergedRowFxEnabled = false;
  export let uiAnimDur = 160;

  export let headers: string[] = [];
  export let visibleRows: string[][] = [];
  export let visibleColIdxs: number[] = [];
  export let totalFilteredCount = 0;
  export let ROW_HEIGHT: number = 36;
  export let OVERSCAN: number = 10;
  export let MAX_WINDOW_ABS: number = 600;
  export let sortColIdx: number | null = null;
  export let sortDir: 'asc' | 'desc' = 'asc';
  export let sortPriority: Record<number, number> = {};
  export let pinnedLeft: number[] = [];
  export let pinnedRight: number[] = [];
  export let hiddenColumns: number[] = [];
  export let columnWidths: Record<number, number> = {};
  export let activeDatasetLabel: string | null = null;

  export let onMatchModeChange: (value: 'fuzzy' | 'exact' | 'regex') => void = () => {};
  export let onQueryScopeChange: (value: 'current' | 'all' | 'ask') => void = () => {};
  export let onQueryChange: (value: string) => void = () => {};
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
  export let onRequestSort: (idx: number, opts?: { multi?: boolean }) => void = () => {};
  export let onOpenRow: (visualIdx: number) => void = () => {};
  export let onColumnResize: (idx: number, width: number) => void = () => {};
  export let highlightCell: (value: string) => string = (v) => v;
  export let onGridWindowChange: (info: {
    startIdx: number;
    endIdx: number;
    renderedCount: number;
    translateY: number;
    phantomHeight: number;
    maxWindow: number;
    sliceLabel: string;
  }) => void = () => {};
  export let onGridScrollTrace: (info: {
    scrollTop: number;
    dy: number;
    dtMs: number;
    velocity: number;
    fastScroll: boolean;
  }) => void = () => {};
</script>

<div class="order-40">
  <InspectorQueryRow
    {hasLoaded}
    {matchMode}
    {queryScope}
    {query}
    {queryError}
    {multiQueryEnabled}
    {multiQueryExpanded}
    multiQueryCount={multiQueryClauses.filter((c) => (c.query ?? '').trim().length > 0).length}
    {multiQueryClauses}
    {onMatchModeChange}
    {onQueryScopeChange}
    {onQueryChange}
    {onOpenBuilder}
    {onSetRegexMode}
    {onOpenHelp}
    {onOpenGenerator}
    {onOpenRecipes}
    {onMultiQueryEnabledChange}
    {onMultiQueryExpandedChange}
    {onAddMultiQueryClause}
    {onRemoveMultiQueryClause}
    {onUpdateMultiQueryClause}
  />
</div>

<div class="order-50">
  {#if isMergedView}
    <InspectorMergedGrid
      {mergedDisplayHeaders}
      {mergedGroupedRows}
      {mergedRowFxEnabled}
      {uiAnimDur}
    />
  {:else}
    <InspectorVirtualGrid
      {headers}
      {visibleRows}
      {visibleColIdxs}
      {totalFilteredCount}
      rowHeight={ROW_HEIGHT}
      overscan={OVERSCAN}
      maxWindowAbs={MAX_WINDOW_ABS}
      {sortColIdx}
      {sortDir}
      {sortPriority}
      {pinnedLeft}
      {pinnedRight}
      {hiddenColumns}
      {columnWidths}
      onRequestSort={onRequestSort}
      onOpenRow={onOpenRow}
      onColumnResize={onColumnResize}
      {highlightCell}
      onWindowChange={onGridWindowChange}
      onScrollTrace={onGridScrollTrace}
      topBanner={activeDatasetLabel}
    />
  {/if}
</div>
