<script lang="ts">
  import InspectorQueryRow from '$lib/components/inspector/InspectorQueryRow.svelte';
  import InspectorMergedGrid from '$lib/components/inspector/InspectorMergedGrid.svelte';
  import InspectorVirtualGrid from '$lib/components/inspector/InspectorVirtualGrid.svelte';
  import InspectorMetricsBar from '$lib/components/inspector/InspectorMetricsBar.svelte';
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
  export let columns = 0;
  export let rows = 0;
  export let filtered = 0;
  export let aggregateFileCount = 1;
  export let aggregateLabel = '';
  export let rendered = 0;
  export let startIdx = 0;
  export let endIdx = 0;
  export let overscan = 0;
  export let maxWindow = 0;
  export let parseDiagnostics: Array<{ idx: number; name: string; numericFail: number; dateFail: number }> = [];

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
  <div class="space-y-3 inspector-theme-stack">
    <div>
      <InspectorMetricsBar
        {columns}
        {rows}
        {filtered}
        {aggregateFileCount}
        {aggregateLabel}
        {rendered}
        {startIdx}
        {endIdx}
        {overscan}
        {maxWindow}
        {parseDiagnostics}
      />
    </div>
    <div>
      {#if isMergedView && mergedGroupedRows.length > 0}
        <InspectorMergedGrid
          {mergedDisplayHeaders}
          {mergedGroupedRows}
          {mergedRowFxEnabled}
          {uiAnimDur}
          rowHeight={ROW_HEIGHT}
          overscan={OVERSCAN}
          maxWindowAbs={MAX_WINDOW_ABS}
          onWindowChange={onGridWindowChange}
          onScrollTrace={onGridScrollTrace}
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
          topBanner={isMergedView ? null : activeDatasetLabel}
        />
      {/if}
    </div>
  </div>
</div>

<style>
  .inspector-theme-stack :global(.glass-panel),
  .inspector-theme-stack :global(.rounded-2xl),
  .inspector-theme-stack :global(.rounded-xl) {
    border-color: color-mix(in srgb, var(--accent-primary) 18%, rgba(255, 255, 255, 0.08));
  }

  .inspector-theme-stack :global([data-inspector-top-banner="true"]),
  .inspector-theme-stack :global(.inspector-source-banner) {
    color: color-mix(in srgb, white 62%, var(--accent-primary));
  }
</style>
