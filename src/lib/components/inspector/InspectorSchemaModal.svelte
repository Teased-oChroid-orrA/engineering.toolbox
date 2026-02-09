<script lang="ts">
  import NumberFlow from '@number-flow/svelte';
  import { fade, scale } from 'svelte/transition';

  let {
    open = false,
    uiAnimDur = 160,
    floatingStyle = '',
    datasetLabel = '',
    schemaSampleN = 2000,
    totalFilteredCount = 0,
    totalRowCount = 0,
    schemaScopeLabel = 'full',
    schemaError = null,
    hasLoaded = false,
    schemaLoading = false,
    schemaSampleTier = 'balanced',
    schemaSearch = '',
    schemaSuggested = { categorical: [], numeric: [], date: [], identifier: [] },
    schemaOutliers = [],
    schemaRelationshipHints = [],
    schemaDrift = [],
    colTypes = [],
    headers = [],
    schemaFiltered = [],
    catSelected = new Set<string>(),
    onClose,
    onReset,
    onBeginDrag,
    onRefresh,
    onSetSampleTier,
    onSetSampleN,
    onSetSearch,
    onSetDriftBaseline,
    onActionTarget,
    onActionCategory,
    onActionNumeric,
    onActionDate,
    onAddTopToCategory
  } = $props<any>();
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-6 relative" transition:fade={{ duration: uiAnimDur }}>
    <button type="button" class="absolute inset-0 modal-backdrop p-0 m-0 border-0" onclick={onClose} aria-label="Close schema dialog"></button>
    <div class="relative z-10 glass-panel w-full max-w-6xl rounded-2xl border border-white/10 p-5" transition:scale={{ duration: uiAnimDur, start: 0.96 }} style={floatingStyle}>
      <div class="mb-2 flex items-center justify-between gap-2 border-b border-white/10 pb-2 cursor-move" role="button" tabindex="0" onmousedown={onBeginDrag}>
        <span class="text-[11px] uppercase tracking-widest text-white/50">Drag</span>
        <button class="btn btn-xs variant-soft" onclick={onReset}>Reset position</button>
      </div>
      <div class="flex items-center justify-between gap-3">
        <div>
          <div class="text-sm font-semibold text-white">Schema stats</div>
          <div class="text-xs text-white/60 mt-1">Dataset: <span class="font-mono text-white/75">{datasetLabel}</span> • Sample: <span class="font-mono text-white/75"><NumberFlow value={Math.min(schemaSampleN, totalFilteredCount || totalRowCount)} /></span> • Scope: <span class="font-mono text-white/75">{schemaScopeLabel}</span></div>
          {#if schemaError}<div class="text-xs text-red-300 mt-2">{schemaError}</div>{/if}
        </div>
        <div class="flex gap-2 items-start">
          <button class="btn btn-sm variant-soft" onclick={onRefresh} disabled={!hasLoaded || schemaLoading}>Refresh</button>
          <button class="btn btn-sm variant-soft" onclick={onClose}>Close</button>
        </div>
      </div>
      <div class="mt-4 flex flex-wrap gap-3 items-end">
        <label class="flex flex-col gap-1">
          <span class="text-[10px] uppercase tracking-widest text-white/50">Tier</span>
          <select class="select select-sm glass-input w-[140px]" value={schemaSampleTier} onchange={(e) => onSetSampleTier((e.currentTarget as HTMLSelectElement).value)}>
            <option value="fast">fast</option>
            <option value="balanced">balanced</option>
            <option value="full">full</option>
          </select>
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-[10px] uppercase tracking-widest text-white/50">Sample N</span>
          <input class="input input-sm glass-input w-[140px]" inputmode="numeric" value={schemaSampleN} oninput={(e) => onSetSampleN(Number((e.currentTarget as HTMLInputElement).value || 0))} />
        </label>
        <label class="flex-1 flex flex-col gap-1">
          <span class="text-[10px] uppercase tracking-widest text-white/50">Search columns</span>
          <input class="input input-sm glass-input" value={schemaSearch} oninput={(e) => onSetSearch((e.currentTarget as HTMLInputElement).value)} />
        </label>
      </div>
      <div class="mt-3 flex flex-wrap gap-2">
        <button class="btn btn-xs variant-soft" onclick={onSetDriftBaseline}>Set drift baseline</button>
      </div>
      <div class="mt-4 max-h-[60vh] overflow-auto rounded-xl border border-white/10">
        <table class="min-w-full text-xs">
          <thead class="sticky top-0 z-10 bg-surface-900/80 backdrop-blur border-b border-white/10">
            <tr>
              <th class="text-left px-3 py-2 text-[10px] uppercase tracking-widest text-white/55">#</th>
              <th class="text-left px-3 py-2 text-[10px] uppercase tracking-widest text-white/55">Name</th>
              <th class="text-left px-3 py-2 text-[10px] uppercase tracking-widest text-white/55">Actions</th>
              <th class="text-left px-3 py-2 text-[10px] uppercase tracking-widest text-white/55">Type</th>
            </tr>
          </thead>
          <tbody>
            {#if schemaLoading}
              <tr><td class="px-3 py-4 text-white/60" colspan="4">Computing…</td></tr>
            {:else if (schemaFiltered?.length ?? 0) === 0}
              <tr><td class="px-3 py-4 text-white/60" colspan="4">No columns match.</td></tr>
            {:else}
              {#each schemaFiltered as s (s.idx)}
                <tr class="border-b border-white/5 hover:bg-white/5">
                  <td class="px-3 py-2 font-mono text-white/60"><NumberFlow value={s.idx} /></td>
                  <td class="px-3 py-2 text-white/85">{s.name}</td>
                  <td class="px-3 py-2">
                    <div class="flex flex-wrap gap-1">
                      <button class="btn btn-xs variant-soft" onclick={() => onActionTarget(s.idx)}>Target</button>
                      <button class="btn btn-xs variant-soft" onclick={() => onActionCategory(s.idx, true)}>Cat</button>
                      {#if s.type === 'numeric'}
                        <button class="btn btn-xs variant-soft" onclick={() => onActionNumeric(s.idx, true)}>Num</button>
                      {:else if s.type === 'date'}
                        <button class="btn btn-xs variant-soft" onclick={() => onActionDate(s.idx, true)}>Date</button>
                      {/if}
                    </div>
                  </td>
                  <td class="px-3 py-2"><span class="px-2 py-0.5 rounded-full text-[10px] border border-white/10 bg-white/5 text-white/70 font-mono">{s.type}</span></td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>
    </div>
  </div>
{/if}
