<script lang="ts">
  import NumberFlow from '@number-flow/svelte';
  import { fade, slide } from 'svelte/transition';
  import { safeAutoAnimate, isWebKitRuntime } from '$lib/utils/safeAutoAnimate';

  function aa(node: HTMLElement) {
    try {
      if (isWebKitRuntime()) return {} as any;
    } catch {
      if (isWebKitRuntime()) return {} as any;
    }
    const ctl = safeAutoAnimate(node, { duration: 160 });
    return { destroy() { try { (ctl as any)?.disable?.(); } catch {} } };
  }

  type NumericFilterState = {
    enabled: boolean;
    colIdx: number | null;
    minText: string;
    maxText: string;
    error: string | null;
  };
  type DateFilterState = {
    enabled: boolean;
    colIdx: number | null;
    minIso: string;
    maxIso: string;
    error: string | null;
  };
  type CategoryFilterState = {
    enabled: boolean;
    colIdx: number | null;
    selected: Set<string>;
  };
  type CatAvailItem = { value: string; count: number };

  let {
    tier2Open = false,
    tier2Tab = 'numeric',
    hasLoaded = false,
    headers = [],
    numericF,
    dateF,
    catF,
    catSearch = '',
    catAvailSearch = '',
    catAvailItems = [],
    catAvailDistinctTotal = 0,
    catAvailRowsScanned = 0,
    catAvailTotalRowsInView = 0,
    catAvailPartial = false,
    catAvailLoading = false,
    catAvailError = null,
    uiAnimDur = 160,
    scheduleFilter,
    runFilterNow,
    fetchCategoryValues,
    onSetTier2Tab
  } = $props<{
    tier2Open: boolean;
    tier2Tab: 'numeric' | 'date' | 'category';
    hasLoaded: boolean;
    headers: string[];
    numericF: NumericFilterState;
    dateF: DateFilterState;
    catF: CategoryFilterState;
    catSearch: string;
    catAvailSearch: string;
    catAvailItems: CatAvailItem[];
    catAvailDistinctTotal: number;
    catAvailRowsScanned: number;
    catAvailTotalRowsInView: number;
    catAvailPartial: boolean;
    catAvailLoading: boolean;
    catAvailError: string | null;
    uiAnimDur: number;
    scheduleFilter: () => void;
    runFilterNow: () => Promise<void> | void;
    fetchCategoryValues: (reset?: boolean) => Promise<void> | void;
    onSetTier2Tab: (tab: 'numeric' | 'date' | 'category') => void;
  }>();
</script>

{#if tier2Open}
  <div class="mt-4 border-t border-white/10 pt-4" transition:slide={{ duration: uiAnimDur }}>
    <div class="flex flex-wrap items-center justify-between gap-2" use:aa>
      <div class="text-[10px] uppercase tracking-widest text-white/50">Tier-2 filters</div>
      <div class="flex flex-wrap gap-2">
        <button class="btn btn-xs variant-soft" onclick={() => onSetTier2Tab('numeric')}>Numeric</button>
        <button class="btn btn-xs variant-soft" onclick={() => onSetTier2Tab('date')}>Date</button>
        <button class="btn btn-xs variant-soft" onclick={() => onSetTier2Tab('category')}>Category</button>
        <button
          class="btn btn-xs variant-soft"
          title="Disable all Tier-2 filters"
          onclick={() => {
            numericF.enabled = false;
            dateF.enabled = false;
            catF.enabled = false;
            catF.selected = new Set();
            void runFilterNow();
          }}
        >
          Clear
        </button>
      </div>
    </div>

    {#if tier2Tab === 'numeric'}
      <div class="mt-3 grid grid-cols-12 gap-3 items-end" transition:fade={{ duration: uiAnimDur }}>
        <div class="col-span-12 md:col-span-2">
          <label class="flex items-center gap-2 text-xs text-white/75">
            <input class="checkbox checkbox-sm" type="checkbox" bind:checked={numericF.enabled} onchange={() => void runFilterNow()} />
            <span>Enabled</span>
          </label>
        </div>
        <div class="col-span-12 md:col-span-4">
          <span class="text-[10px] uppercase tracking-widest text-white/50">Column</span>
          <select
            class="select select-sm w-full glass-input"
            bind:value={numericF.colIdx}
            disabled={!hasLoaded}
            onchange={() => {
              numericF.enabled = true;
              void runFilterNow();
            }}
          >
            <option value={null}>Select numeric column…</option>
            {#each headers as h, i (i)}
              <option value={i}>{h}</option>
            {/each}
          </select>
        </div>
        <div class="col-span-6 md:col-span-3">
          <span class="text-[10px] uppercase tracking-widest text-white/50">Min</span>
          <input class="input input-sm w-full glass-input" placeholder="-∞" bind:value={numericF.minText} oninput={scheduleFilter} />
        </div>
        <div class="col-span-6 md:col-span-3">
          <span class="text-[10px] uppercase tracking-widest text-white/50">Max</span>
          <input class="input input-sm w-full glass-input" placeholder="+∞" bind:value={numericF.maxText} oninput={scheduleFilter} />
        </div>
        {#if numericF.error}
          <div class="col-span-12 text-[11px] text-red-300">{numericF.error}</div>
        {/if}
      </div>
    {:else if tier2Tab === 'date'}
      <div class="mt-3 grid grid-cols-12 gap-3 items-end" transition:fade={{ duration: uiAnimDur }}>
        <div class="col-span-12 md:col-span-2">
          <label class="flex items-center gap-2 text-xs text-white/75">
            <input class="checkbox checkbox-sm" type="checkbox" bind:checked={dateF.enabled} onchange={() => void runFilterNow()} />
            <span>Enabled</span>
          </label>
        </div>
        <div class="col-span-12 md:col-span-4">
          <span class="text-[10px] uppercase tracking-widest text-white/50">Column</span>
          <select
            class="select select-sm w-full glass-input"
            bind:value={dateF.colIdx}
            disabled={!hasLoaded}
            onchange={() => {
              dateF.enabled = true;
              void runFilterNow();
            }}
          >
            <option value={null}>Select date column…</option>
            {#each headers as h, i (i)}
              <option value={i}>{h}</option>
            {/each}
          </select>
        </div>
        <div class="col-span-6 md:col-span-3">
          <span class="text-[10px] uppercase tracking-widest text-white/50">Min</span>
          <input class="input input-sm w-full glass-input" placeholder="1900-01-01" bind:value={dateF.minIso} oninput={scheduleFilter} />
        </div>
        <div class="col-span-6 md:col-span-3">
          <span class="text-[10px] uppercase tracking-widest text-white/50">Max</span>
          <input class="input input-sm w-full glass-input" placeholder="3000-01-01" bind:value={dateF.maxIso} oninput={scheduleFilter} />
        </div>
        {#if dateF.error}
          <div class="col-span-12 text-[11px] text-red-300">{dateF.error}</div>
        {/if}
      </div>
    {:else}
      <div class="mt-3 grid grid-cols-12 gap-3 items-end" transition:fade={{ duration: uiAnimDur }}>
        <div class="col-span-12 md:col-span-2">
          <label class="flex items-center gap-2 text-xs text-white/75">
            <input class="checkbox checkbox-sm" type="checkbox" bind:checked={catF.enabled} onchange={() => void runFilterNow()} />
            <span>Enabled</span>
          </label>
        </div>
        <div class="col-span-12 md:col-span-4">
          <span class="text-[10px] uppercase tracking-widest text-white/50">Column</span>
          <select
            class="select select-sm w-full glass-input"
            bind:value={catF.colIdx}
            disabled={!hasLoaded}
            onchange={() => {
              catF.enabled = true;
              catF.selected = new Set();
              void runFilterNow();
            }}
          >
            <option value={null}>Select category column…</option>
            {#each headers as h, i (i)}
              <option value={i}>{h}</option>
            {/each}
          </select>
        </div>
        <div class="col-span-12 md:col-span-6">
          <span class="text-[10px] uppercase tracking-widest text-white/50">Selected values</span>
          <input class="input input-sm w-full glass-input" placeholder="Search within selected…" bind:value={catSearch} />
          <div class="mt-2 flex flex-wrap gap-2" use:aa>
            {#each [...(catF.selected ?? new Set())].filter((v) => (catSearch ? (v ?? '').toLowerCase().includes(catSearch.toLowerCase()) : true)).slice(0, 40) as v}
              <button
                class="btn btn-xs variant-soft"
                title="Click to remove"
                onclick={() => {
                  const s = new Set(catF.selected);
                  s.delete(v);
                  catF.selected = s;
                  void runFilterNow();
                }}
              >
                {v}
                <span class="ml-1 text-white/40">×</span>
              </button>
            {/each}
          </div>
        </div>
        <div class="col-span-12 md:col-span-6 md:col-start-7">
          <span class="text-[10px] uppercase tracking-widest text-white/50">Available values</span>
          <input class="input input-sm w-full glass-input" placeholder="Search available…" bind:value={catAvailSearch} />
          <div class="mt-2 text-[11px] text-white/45 flex flex-wrap gap-x-3 gap-y-1">
            {#if catAvailLoading}
              <span>Loading…</span>
            {:else if catAvailError}
              <span class="text-red-300">{catAvailError}</span>
            {:else if catF.colIdx == null}
              <span>(select a column)</span>
            {:else}
              <span>Distinct: <span class="text-white/70 font-mono"><NumberFlow value={catAvailDistinctTotal} /></span></span>
              <span>Showing: <span class="text-white/70 font-mono"><NumberFlow value={catAvailItems.length} /></span></span>
              {#if catAvailPartial}
                <span class="text-yellow-200/80">Partial (scanned <NumberFlow value={catAvailRowsScanned} />/<NumberFlow value={catAvailTotalRowsInView} />)</span>
              {/if}
            {/if}
          </div>
          <div class="mt-2 flex flex-wrap gap-2 max-h-44 overflow-auto pr-1" use:aa>
            {#each (catAvailItems ?? []) as it (it.value)}
              <button
                class="btn btn-xs variant-soft"
                onclick={() => {
                  const s = new Set(catF.selected);
                  s.add(it.value);
                  catF.selected = s;
                  catF.enabled = true;
                  void runFilterNow();
                }}
              >
                + {it.value}
                <span class="ml-1 text-white/35 font-mono">×<NumberFlow value={it.count} /></span>
              </button>
            {/each}
          </div>
          <div class="mt-2 flex gap-2 justify-end">
            <button class="btn btn-xs variant-soft" onclick={() => void fetchCategoryValues(true)} disabled={!hasLoaded || catAvailLoading}>Refresh</button>
            <button class="btn btn-xs variant-soft" onclick={() => void fetchCategoryValues(false)} disabled={catAvailLoading}>Load more</button>
          </div>
        </div>
      </div>
    {/if}
  </div>
{/if}
