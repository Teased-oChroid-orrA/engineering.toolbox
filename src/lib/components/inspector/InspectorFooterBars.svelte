<script lang="ts">
  import InspectorLoadedFilesBar from '$lib/components/inspector/InspectorLoadedFilesBar.svelte';
  import InspectorMetricsBar from '$lib/components/inspector/InspectorMetricsBar.svelte';

  export let loadedDatasets: { id: string; label: string }[] = [];
  export let activeDatasetId = '';
  export let crossQueryBusy = false;
  export let isMergedView = false;
  export let mergedRowsCount = 0;

  export let columns = 0;
  export let rows = 0;
  export let filtered = 0;
  export let rendered = 0;
  export let startIdx = 0;
  export let endIdx = 0;
  export let overscan = 0;
  export let maxWindow = 0;
  export let parseDiagnostics: Array<{ idx: number; name: string; numericFail: number; dateFail: number }> = [];

  export let onActivateDataset: (id: string) => void = () => {};
  export let onUnloadDataset: (id: string) => void = () => {};
</script>

<div class="order-20">
  <InspectorLoadedFilesBar
    {loadedDatasets}
    {activeDatasetId}
    {crossQueryBusy}
    {isMergedView}
    {mergedRowsCount}
    on:activate={(e) => onActivateDataset(e.detail.id)}
    on:unload={(e) => onUnloadDataset(e.detail.id)}
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
