<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  type Dataset = {
    id: string;
    label: string;
  };

  let {
    loadedDatasets = [],
    activeDatasetId = '',
    crossQueryBusy = false,
    isMergedView = false,
    mergedRowsCount = 0
  } = $props<{
    loadedDatasets?: Dataset[];
    activeDatasetId?: string;
    crossQueryBusy?: boolean;
    isMergedView?: boolean;
    mergedRowsCount?: number;
  }>();

  const dispatch = createEventDispatcher<{
    activate: { id: string };
    unload: { id: string };
  }>();
</script>

<div class="glass-panel rounded-2xl p-3 border border-white/10" data-testid="inspector-loaded-files">
  <div class="flex items-center justify-between gap-2">
    <div class="text-[10px] uppercase tracking-widest text-white/50">Loaded files</div>
    <div></div>
  </div>
  <div class="mt-2 flex flex-wrap gap-2">
    {#if (loadedDatasets?.length ?? 0) === 0}
      <span class="text-[11px] text-white/45">No file loaded yet.</span>
    {:else}
      {#each loadedDatasets as ds (ds.id)}
        <div class={`inline-flex items-center rounded-lg border ${activeDatasetId === ds.id ? 'border-emerald-300/40 bg-emerald-500/15' : 'border-white/10 bg-white/5'}`}>
          <button
            class={`btn btn-xs border-0 ${activeDatasetId === ds.id ? 'variant-filled' : 'variant-soft'}`}
            onclick={() => dispatch('activate', { id: ds.id })}
            title={ds.label}
          >
            {ds.label}
          </button>
          <button
            class="px-2 py-1 text-[11px] text-white/60 hover:text-white/90"
            title="Unload file"
            onclick={() => dispatch('unload', { id: ds.id })}
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
