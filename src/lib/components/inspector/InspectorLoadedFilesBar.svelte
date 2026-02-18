<script lang="ts">
  type Dataset = {
    id: string;
    label: string;
  };

  let {
    loadedDatasets = [],
    activeDatasetId = '',
    crossQueryBusy = false,
    isMergedView = false,
    mergedRowsCount = 0,
    onActivate = () => {},
    onUnload = () => {}
  } = $props<{
    loadedDatasets?: Dataset[];
    activeDatasetId?: string;
    crossQueryBusy?: boolean;
    isMergedView?: boolean;
    mergedRowsCount?: number;
    onActivate?: (id: string) => void;
    onUnload?: (id: string) => void;
  }>();
</script>

<div class="glass-panel rounded-2xl p-3 border border-white/10 inspector-panel-slide inspector-pop-card" data-testid="inspector-loaded-files">
  <div class="flex items-center justify-between gap-2">
    <div class="text-[10px] uppercase tracking-widest text-white/50">Loaded files</div>
    <div class="text-[10px] text-white/40">Click filename to unload</div>
  </div>
  <div class="mt-2 flex flex-wrap gap-2">
    {#if (loadedDatasets?.length ?? 0) === 0}
      <span class="text-[11px] text-white/45">No file loaded yet.</span>
    {:else}
      {#each loadedDatasets as ds (ds.id)}
        <div class={`inline-flex items-center rounded-lg border inspector-pop-sub ${activeDatasetId === ds.id ? 'border-emerald-300/40 bg-emerald-500/15' : 'border-white/10 bg-white/5'}`}>
          <button
            class={`btn btn-xs border-0 ${activeDatasetId === ds.id ? 'variant-filled' : 'variant-soft'}`}
            onclick={() => onUnload(ds.id)}
            title={`Click to unload: ${ds.label}`}
            data-testid={`inspector-loaded-file-unload-${ds.id}`}
          >
            {ds.label || 'Unknown File'}
          </button>
          <button
            class="btn btn-xs variant-ghost border-0 px-2 text-white/70 hover:text-white"
            onclick={() => onUnload(ds.id)}
            title={`Close file: ${ds.label}`}
            aria-label={`Close file ${ds.label || 'Unknown File'}`}
            data-testid={`inspector-loaded-file-close-${ds.id}`}
          >
            ×
          </button>
        </div>
      {/each}
    {/if}
  </div>
  {#if crossQueryBusy}
    <div class="mt-2 text-[11px] text-white/65">Running cross-file query…</div>
  {:else if isMergedView}
    <div class="mt-2 text-[11px] text-white/65">
      Merged rows in table: {mergedRowsCount} across {loadedDatasets.length} files.
    </div>
  {/if}
</div>
