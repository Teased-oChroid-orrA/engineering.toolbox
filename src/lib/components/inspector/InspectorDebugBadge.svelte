<script lang="ts">
  let {
    visible = false,
    showDataControls = false,
    hasLoaded = false,
    loadedDatasets = 0,
    activeDatasetId = '',
    datasetId = '',
    headers = 0,
    rows = 0
  } = $props<{
    visible?: boolean;
    showDataControls?: boolean;
    hasLoaded?: boolean;
    loadedDatasets?: number;
    activeDatasetId?: string;
    datasetId?: string;
    headers?: number;
    rows?: number;
  }>();
</script>

{#if visible}
  <div class="mt-2 rounded-lg border border-amber-300/35 bg-amber-500/10 px-3 py-2 text-[11px] font-mono text-amber-100/90">
    ctrlDebug:
    showDataControls=<span class="text-white">{String(showDataControls)}</span>
    hasLoaded=<span class="text-white">{String(hasLoaded)}</span>
    loadedDatasets=<span class="text-white">{loadedDatasets}</span>
    activeDatasetId=<span class="text-white">{activeDatasetId || '∅'}</span>
    datasetId=<span class="text-white">{datasetId || '∅'}</span>
    headers=<span class="text-white">{headers}</span>
    rows=<span class="text-white">{rows}</span>
  </div>
{/if}
