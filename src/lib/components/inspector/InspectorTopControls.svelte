<script lang="ts">
  import NumberFlow from '@number-flow/svelte';
  import ControlCard from '$lib/components/inspector/ControlCard.svelte';
  import QueryToolsDropdown from '$lib/components/inspector/QueryToolsDropdown.svelte';
  import InspectorDebugBadge from '$lib/components/inspector/InspectorDebugBadge.svelte';
  import type { MultiQueryClause } from '$lib/components/inspector/InspectorMultiQueryController';
  import { safeAutoAnimate, isWebKitRuntime } from '$lib/utils/safeAutoAnimate';

  function aa(node: HTMLElement, opts?: { duration?: number }) {
    try {
      if (isWebKitRuntime()) return {} as any;
    } catch {
      if (isWebKitRuntime()) return {} as any;
    }
    const ctl = safeAutoAnimate(node, { duration: opts?.duration ?? 160 });
    return { destroy() { try { (ctl as any)?.disable?.(); } catch {} } };
  }

  type HeaderMode = 'auto' | 'yes' | 'no';
  type QueryScope = 'current' | 'all' | 'ask';
  type MatchMode = 'fuzzy' | 'exact' | 'regex';

  let {
    topControlSpans = {},
    headerMode = 'auto',
    hasLoaded = false,
    isLoading = false,
    headers = [],
    targetColIdx = null,
    matchMode = 'fuzzy',
    queryScope = 'current',
    query = '',
    maxRowsScanText = '',
    tier2Open = false,
    visibleColCount = 0,
    queryError = null,
    showControlsDebug = false,
    showDataControls = false,
    loadedDatasets = 0,
    activeDatasetId = '',
    datasetId = '',
    totalRowCount = 0,
    onHeaderModeChange,
    onTargetColChange,
    onMatchModeChange,
    onQueryScopeChange,
    onQueryChange,
    onMaxRowsScanTextChange,
    onTier2Toggle,
    onOpenColumnPicker,
    onOpenBuilder,
    onSetRegexMode,
    onOpenHelp,
    onOpenGenerator,
    onOpenRecipes,
    multiQueryEnabled = false,
    multiQueryCount = 0,
    multiQueryClauses = [],
    onMultiQueryEnabledChange,
    onAddMultiQueryClause,
    onRemoveMultiQueryClause,
    onUpdateMultiQueryClause,
    children
  } = $props<{
    topControlSpans?: Record<string, string>;
    headerMode?: HeaderMode;
    hasLoaded?: boolean;
    isLoading?: boolean;
    headers?: string[];
    targetColIdx?: number | null;
    matchMode?: MatchMode;
    queryScope?: QueryScope;
    query?: string;
    maxRowsScanText?: string;
    tier2Open?: boolean;
    visibleColCount?: number;
    queryError?: string | null;
    showControlsDebug?: boolean;
    showDataControls?: boolean;
    loadedDatasets?: number;
    activeDatasetId?: string;
    datasetId?: string;
    totalRowCount?: number;
    onHeaderModeChange: (value: HeaderMode) => void;
    onTargetColChange: (value: number | null) => void;
    onMatchModeChange: (value: MatchMode) => void;
    onQueryScopeChange: (value: QueryScope) => void;
    onQueryChange: (value: string) => void;
    onMaxRowsScanTextChange: (value: string) => void;
    onTier2Toggle: (value: boolean) => void;
    onOpenColumnPicker: () => void;
    onOpenBuilder: () => void;
    onSetRegexMode: () => void;
    onOpenHelp: () => void;
    onOpenGenerator: () => void;
    onOpenRecipes: () => void;
    multiQueryEnabled?: boolean;
    multiQueryCount?: number;
    multiQueryClauses?: MultiQueryClause[];
    onMultiQueryEnabledChange: (value: boolean) => void;
    onAddMultiQueryClause: () => void;
    onRemoveMultiQueryClause: (id: string) => void;
    onUpdateMultiQueryClause: (id: string, patch: Partial<MultiQueryClause>) => void;
    children?: () => any;
  }>();
</script>

<div class="glass-panel rounded-2xl p-4 border border-white/10 inspector-panel-slide inspector-pop-card" data-testid="inspector-top-controls">
  <div use:aa>
    <div class="grid grid-cols-12 gap-3">
      <div class={topControlSpans.headers ?? 'col-span-12 md:col-span-2'}>
        <ControlCard label="Headers">
          <select class="select select-sm w-full glass-input" value={headerMode} disabled={isLoading} onchange={(e) => onHeaderModeChange((e.currentTarget as HTMLSelectElement).value as HeaderMode)}>
            <option value="auto">Auto</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </ControlCard>
      </div>
      <div class={topControlSpans.target ?? 'col-span-12 md:col-span-2'}>
        <ControlCard label="Target">
          <select class="select select-sm w-full glass-input" disabled={!hasLoaded} value={targetColIdx ?? ''} onchange={(e) => {
            const v = (e.currentTarget as HTMLSelectElement).value;
            onTargetColChange(v === '' ? null : Number(v));
          }}>
            <option value="">All columns</option>
            {#each headers as h, i (i)}
              <option value={i}>{h}</option>
            {/each}
          </select>
        </ControlCard>
      </div>
      <div class={topControlSpans.match ?? 'col-span-6 md:col-span-2'}>
        <ControlCard label="Match">
          <select class="select select-sm w-full glass-input" disabled={!hasLoaded} value={matchMode} onchange={(e) => onMatchModeChange((e.currentTarget as HTMLSelectElement).value as MatchMode)}>
            <option value="fuzzy">Fuzzy</option>
            <option value="exact">Exact</option>
            <option value="regex">Regex</option>
          </select>
        </ControlCard>
      </div>
      <div class={topControlSpans.scope ?? 'col-span-6 md:col-span-2'}>
        <ControlCard label="Query Scope">
          <select class="select select-sm w-full glass-input" value={queryScope} title="Query scope" onchange={(e) => onQueryScopeChange((e.currentTarget as HTMLSelectElement).value as QueryScope)}>
            <option value="current">Current file</option>
            <option value="all">All loaded files</option>
            <option value="ask">Ask each time</option>
          </select>
        </ControlCard>
      </div>
      <div class={topControlSpans.query ?? 'col-span-12 md:col-span-3'}>
        <ControlCard label="Query">
          <div class="relative">
            <input class="input input-sm w-full glass-input pr-28" disabled={!hasLoaded} placeholder={matchMode === 'regex' ? 'Regex pattern…' : 'Type to filter…'} value={query} oninput={(e) => onQueryChange((e.currentTarget as HTMLInputElement).value)} />
            <QueryToolsDropdown
              disabled={!hasLoaded}
              onBuilder={onOpenBuilder}
              onRegexMode={onSetRegexMode}
              onHelp={onOpenHelp}
              onGenerator={onOpenGenerator}
              onRecipes={onOpenRecipes}
            />
          </div>
          <div class="mt-2 rounded-lg border border-white/10 bg-white/5 px-2 py-2">
            <div class="flex items-center justify-between gap-2">
              <label class="flex items-center gap-2 text-[11px] text-white/85 select-none">
                <input
                  class="toggle toggle-xs"
                  type="checkbox"
                  disabled={!hasLoaded}
                  checked={multiQueryEnabled}
                  onchange={(e) => onMultiQueryEnabledChange((e.currentTarget as HTMLInputElement).checked)}
                />
                <span>Multi-query chain</span>
              </label>
              <button class="btn btn-xs variant-soft" disabled={!hasLoaded} onclick={onAddMultiQueryClause}>+ Clause</button>
            </div>
            {#if multiQueryEnabled}
              <div class="mt-1 text-[10px] text-cyan-200/90">Multi-query active ({multiQueryCount})</div>
            {/if}
            {#if multiQueryEnabled}
              <div class="mt-2 flex flex-col gap-2">
                {#each multiQueryClauses as clause, idx (clause.id)}
                  <div class="grid grid-cols-[78px_1fr_24px] gap-1 items-center">
                    <select
                      class="select select-xs w-full glass-input"
                      value={clause.mode}
                      disabled={!hasLoaded}
                      onchange={(e) => onUpdateMultiQueryClause(clause.id, { mode: (e.currentTarget as HTMLSelectElement).value as MatchMode })}
                    >
                      <option value="fuzzy">Fuzzy</option>
                      <option value="exact">Exact</option>
                      <option value="regex">Regex</option>
                    </select>
                    <input
                      class="input input-xs w-full glass-input"
                      disabled={!hasLoaded}
                      placeholder={clause.mode === 'regex' ? `Regex clause ${idx + 1}` : `Clause ${idx + 1}`}
                      value={clause.query}
                      oninput={(e) => onUpdateMultiQueryClause(clause.id, { query: (e.currentTarget as HTMLInputElement).value })}
                    />
                    <button
                      class="btn btn-xs variant-soft px-0"
                      disabled={!hasLoaded || (multiQueryClauses?.length ?? 0) <= 1}
                      title="Remove clause"
                      onclick={() => onRemoveMultiQueryClause(clause.id)}
                    >
                      ×
                    </button>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </ControlCard>
      </div>
      <div class={topControlSpans.options ?? 'col-span-12 md:col-span-2'}>
        <ControlCard label="Tier-2">
          <div class="glass-panel rounded-xl border border-white/10 px-2 min-h-[38px] flex items-center justify-between gap-2 inspector-pop-sub">
            <button class="btn btn-sm variant-soft flex items-center gap-2" disabled={!hasLoaded} title="Pick visible columns" onclick={onOpenColumnPicker}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="opacity-90">
                <path d="M4 5h16v14H4V5Z" stroke="currentColor" stroke-width="1.8" />
                <path d="M4 9h16" stroke="currentColor" stroke-width="1.8" />
                <path d="M8 5v14" stroke="currentColor" stroke-width="1.8" />
                <path d="M14 5v14" stroke="currentColor" stroke-width="1.8" />
              </svg>
              <span>Columns</span>
              <span class="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-white/10 border border-white/10 text-[10px] text-white/80 px-1">
                <NumberFlow value={hasLoaded ? visibleColCount : 0} />
              </span>
            </button>
            <div class="h-5 w-px bg-white/10"></div>
            <label class="flex items-center gap-2 text-[12px] text-white/85 select-none">
              <span class="whitespace-nowrap">Tier-2</span>
              <span class={`text-[10px] ${tier2Open ? 'text-emerald-200/80' : 'text-white/45'}`}>{tier2Open ? 'On' : 'Off'}</span>
              <input class="toggle toggle-sm" type="checkbox" checked={tier2Open} disabled={!hasLoaded} title="Toggle Tier-2 filters" onchange={(e) => onTier2Toggle((e.currentTarget as HTMLInputElement).checked)} />
            </label>
          </div>
        </ControlCard>
      </div>
      <div class={topControlSpans.maxScan ?? 'col-span-12 md:col-span-1'}>
        <ControlCard label="Max Scan">
          <div class="relative group z-50">
            <input class="input input-sm w-full glass-input" disabled={!hasLoaded} placeholder="MAX SCAN" value={maxRowsScanText} oninput={(e) => onMaxRowsScanTextChange((e.currentTarget as HTMLInputElement).value)} />
            <div class="pointer-events-none absolute left-2 top-full mt-2 w-60 rounded-lg border border-white/10 bg-black/85 p-2 text-[10px] text-white/80 opacity-0 shadow-2xl backdrop-blur-md transition-opacity duration-150 group-hover:opacity-100 z-[1200] inspector-pop-layer">
              Leave blank to use the backend default cap.
            </div>
          </div>
        </ControlCard>
      </div>
    </div>
  </div>

  <div class="mt-1 min-h-[14px]">
    {#if queryError}
      <div class="text-[11px] text-red-300">{queryError}</div>
    {:else if matchMode === 'regex' && (query?.trim()?.length ?? 0) > 0 && (query?.length ?? 0) > 256}
      <div class="text-[11px] text-yellow-200/80">Regex capped at 256 chars (backend will reject longer patterns).</div>
    {/if}
  </div>

  <InspectorDebugBadge
    visible={showControlsDebug}
    {showDataControls}
    {hasLoaded}
    loadedDatasets={loadedDatasets}
    {activeDatasetId}
    {datasetId}
    headers={headers.length}
    rows={totalRowCount}
  />

  {@render children?.()}
</div>
