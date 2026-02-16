<script lang="ts">
  import InspectorLoadedFilesBar from '$lib/components/inspector/InspectorLoadedFilesBar.svelte';
  import InspectorMetricsBar from '$lib/components/inspector/InspectorMetricsBar.svelte';

  let {
    loadedDatasets = [],
    activeDatasetId = '',
    crossQueryBusy = false,
    isMergedView = false,
    mergedRowsCount = 0,
    columns = 0,
    rows = 0,
    filtered = 0,
    rendered = 0,
    startIdx = 0,
    endIdx = 0,
    overscan = 0,
    maxWindow = 0,
    parseDiagnostics = [],
    onActivateDataset = () => {},
    onUnloadDataset = () => {}
  } = $props<{
    loadedDatasets?: { id: string; label: string }[];
    activeDatasetId?: string;
    crossQueryBusy?: boolean;
    isMergedView?: boolean;
    mergedRowsCount?: number;
    columns?: number;
    rows?: number;
    filtered?: number;
    rendered?: number;
    startIdx?: number;
    endIdx?: number;
    overscan?: number;
    maxWindow?: number;
    parseDiagnostics?: Array<{ idx: number; name: string; numericFail: number; dateFail: number }>;
    onActivateDataset?: (id: string) => void;
    onUnloadDataset?: (id: string) => void;
  }>();
</script>

<div class="order-20">
  <InspectorLoadedFilesBar
    {loadedDatasets}
    {activeDatasetId}
    {crossQueryBusy}
    {isMergedView}
    {mergedRowsCount}
    onActivate={onActivateDataset}
    onUnload={onUnloadDataset}
  />
</div>

<div class="order-30">
  <InspectorMetricsBar
    {columns}
    {rows}
    {filtered}
    {rendered}
    {startIdx}
    {endIdx}
    {overscan}
    {maxWindow}
    {parseDiagnostics}
  />
</div>
