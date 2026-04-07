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
    schemaBaselineCount = 0,
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

  let driftSummary = $derived.by(() => ({
    added: (schemaDrift ?? []).filter((entry: any) => entry.kind === 'added').length,
    removed: (schemaDrift ?? []).filter((entry: any) => entry.kind === 'removed').length,
    changed: (schemaDrift ?? []).filter((entry: any) => entry.kind === 'changed').length
  }));
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-6 relative" role="dialog" aria-modal="true" aria-label="Schema stats" tabindex="-1" transition:fade={{ duration: uiAnimDur }}>
    <button type="button" class="absolute inset-0 modal-backdrop p-0 m-0 border-0" onclick={onClose} aria-label="Close schema dialog"></button>
    <div class="relative z-10 glass-panel w-full max-w-6xl rounded-2xl border border-white/10 p-5 inspector-pop-layer" transition:scale={{ duration: uiAnimDur, start: 0.96 }} style={floatingStyle}>
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
      <div class="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[1.3fr_1fr]">
        <div class="rounded-xl border border-white/10 inspector-pop-sub p-4" data-testid="inspector-schema-drift-summary">
          <div class="flex items-center justify-between gap-2">
            <div>
              <div class="text-[10px] uppercase tracking-widest text-white/50">Schema drift</div>
              <div class="mt-1 text-sm font-semibold text-white">Baseline compare</div>
            </div>
            <div class="text-[11px] text-white/60">
              {schemaBaselineCount ? `${schemaBaselineCount} baseline columns captured` : 'No baseline captured yet'}
            </div>
          </div>
          {#if !schemaBaselineCount}
            <div class="mt-3 text-xs text-white/60">Capture a baseline, then refresh after a dataset or filter change to see type, null-rate, and cardinality drift.</div>
          {:else}
            <div class="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div class="rounded-lg border border-cyan-300/20 bg-cyan-500/10 px-2 py-2 text-cyan-100">
                <div class="text-[10px] uppercase tracking-wide text-cyan-100/70">Changed</div>
                <div class="mt-1 text-lg font-semibold">{driftSummary.changed}</div>
              </div>
              <div class="rounded-lg border border-emerald-300/20 bg-emerald-500/10 px-2 py-2 text-emerald-100">
                <div class="text-[10px] uppercase tracking-wide text-emerald-100/70">Added</div>
                <div class="mt-1 text-lg font-semibold">{driftSummary.added}</div>
              </div>
              <div class="rounded-lg border border-amber-300/20 bg-amber-500/10 px-2 py-2 text-amber-100">
                <div class="text-[10px] uppercase tracking-wide text-amber-100/70">Removed</div>
                <div class="mt-1 text-lg font-semibold">{driftSummary.removed}</div>
              </div>
            </div>
            <div class="mt-3 space-y-2">
              {#if (schemaDrift?.length ?? 0) === 0}
                <div class="text-xs text-white/60">No drift above threshold in the current sample.</div>
              {:else}
                {#each schemaDrift as drift (drift.kind + ':' + drift.idx)}
                  <div class="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/78">
                    <div class="flex items-center justify-between gap-2">
                      <div class="font-medium text-white/88">{drift.name}</div>
                      <div class="font-mono text-white/60">{drift.kind} • {drift.drift}</div>
                    </div>
                    <div class="mt-1 text-white/62">{drift.reason}</div>
                  </div>
                {/each}
              {/if}
            </div>
          {/if}
        </div>
        <div class="rounded-xl border border-white/10 inspector-pop-sub p-4">
          <div class="text-[10px] uppercase tracking-widest text-white/50">Suggested actions</div>
          <div class="mt-3 space-y-2 text-xs text-white/75">
            <div>Category candidates: {(schemaSuggested?.categorical?.length ?? 0)}</div>
            <div>Numeric candidates: {(schemaSuggested?.numeric?.length ?? 0)}</div>
            <div>Date candidates: {(schemaSuggested?.date?.length ?? 0)}</div>
            <div>Relationship hints: {(schemaRelationshipHints?.length ?? 0)}</div>
            <div>Outlier hints: {(schemaOutliers?.length ?? 0)}</div>
          </div>
        </div>
      </div>
      <div class="mt-4 max-h-[60vh] overflow-auto rounded-xl border border-white/10 inspector-pop-sub">
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
