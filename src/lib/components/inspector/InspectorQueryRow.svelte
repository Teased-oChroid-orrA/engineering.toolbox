<script lang="ts">
  import QueryToolsDropdown from '$lib/components/inspector/QueryToolsDropdown.svelte';
  import type { MultiQueryClause } from '$lib/components/inspector/InspectorStateTypes';

  type QueryScope = 'current' | 'all' | 'ask';
  type MatchMode = 'fuzzy' | 'exact' | 'regex';

  let {
    hasLoaded = false,
    matchMode = 'fuzzy',
    queryScope = 'current',
    query = '',
    queryError = null,
    multiQueryEnabled = false,
    multiQueryExpanded = false,
    multiQueryCount = 0,
    multiQueryClauses = [],
    onMatchModeChange,
    onQueryScopeChange,
    onQueryChange,
    onOpenBuilder,
    onSetRegexMode,
    onOpenHelp,
    onOpenGenerator,
    onOpenRecipes,
    onMultiQueryEnabledChange,
    onMultiQueryExpandedChange,
    onAddMultiQueryClause,
    onRemoveMultiQueryClause,
    onUpdateMultiQueryClause
  } = $props<{
    hasLoaded?: boolean;
    matchMode?: MatchMode;
    queryScope?: QueryScope;
    query?: string;
    queryError?: string | null;
    multiQueryEnabled?: boolean;
    multiQueryExpanded?: boolean;
    multiQueryCount?: number;
    multiQueryClauses?: MultiQueryClause[];
    onMatchModeChange: (v: MatchMode) => void;
    onQueryScopeChange: (v: QueryScope) => void;
    onQueryChange: (v: string) => void;
    onOpenBuilder: () => void;
    onSetRegexMode: () => void;
    onOpenHelp: () => void;
    onOpenGenerator: () => void;
    onOpenRecipes: () => void;
    onMultiQueryEnabledChange: (v: boolean) => void;
    onMultiQueryExpandedChange: (v: boolean) => void;
    onAddMultiQueryClause: () => void;
    onRemoveMultiQueryClause: (id: string) => void;
    onUpdateMultiQueryClause: (id: string, patch: Partial<MultiQueryClause>) => void;
  }>();
</script>

<div class="glass-panel rounded-2xl p-2 border border-white/10 sticky top-2 z-40 inspector-panel-slide inspector-pop-card inspector-depth-1" data-testid="inspector-query-row">
  <div class="grid grid-cols-12 gap-2 items-center">
    <div class="col-span-6 md:col-span-2">
      <select class="select select-sm w-full glass-input" disabled={!hasLoaded} value={matchMode} onchange={(e) => onMatchModeChange((e.currentTarget as HTMLSelectElement).value as MatchMode)}>
        <option value="fuzzy">Fuzzy</option>
        <option value="exact">Exact</option>
        <option value="regex">Regex</option>
      </select>
    </div>
    <div class="col-span-6 md:col-span-2">
      <select class="select select-sm w-full glass-input" value={queryScope} title="Query scope" onchange={(e) => onQueryScopeChange((e.currentTarget as HTMLSelectElement).value as QueryScope)}>
        <option value="current">Current file</option>
        <option value="all">All loaded files</option>
        <option value="ask">Ask each time</option>
      </select>
    </div>
    <div class="col-span-12 md:col-span-6">
      <div class="relative">
        <input data-inspector-query-input="true" class="input input-sm w-full glass-input pr-28" disabled={!hasLoaded} placeholder={matchMode === 'regex' ? 'Regex pattern…' : 'Type to filter…'} value={query} oninput={(e) => onQueryChange((e.currentTarget as HTMLInputElement).value)} />
        <QueryToolsDropdown
          disabled={!hasLoaded}
          onBuilder={onOpenBuilder}
          onRegexMode={onSetRegexMode}
          onHelp={onOpenHelp}
          onGenerator={onOpenGenerator}
          onRecipes={onOpenRecipes}
        />
      </div>
    </div>
    <div class="col-span-12 md:col-span-2 flex items-center justify-end gap-1">
      <label class="flex items-center gap-1 text-[11px] text-white/80 px-2">
        <input
          class="toggle toggle-xs"
          type="checkbox"
          disabled={!hasLoaded}
          checked={multiQueryEnabled}
          onchange={(e) => onMultiQueryEnabledChange((e.currentTarget as HTMLInputElement).checked)}
        />
        <span>MQ</span>
      </label>
      <button class="btn btn-xs variant-soft" disabled={!hasLoaded || !multiQueryEnabled} onclick={() => onMultiQueryExpandedChange(!multiQueryExpanded)}>
        {multiQueryExpanded ? 'Compact' : `Multi (${multiQueryCount})`}
      </button>
      <button class="btn btn-xs variant-soft" disabled={!hasLoaded || !multiQueryEnabled} onclick={onAddMultiQueryClause}>+ Clause</button>
    </div>
  </div>

  {#if multiQueryEnabled && multiQueryExpanded}
    <div class="mt-2 grid grid-cols-1 gap-2">
      {#each multiQueryClauses as clause, idx (clause.id)}
        <div class="grid grid-cols-[148px_minmax(0,1fr)_24px] gap-2 items-center">
          <select
            class="select select-sm w-full min-w-0 glass-input"
            value={clause.mode}
            disabled={!hasLoaded}
            title={`Clause ${idx + 1} filter type`}
            onchange={(e) => onUpdateMultiQueryClause(clause.id, { mode: (e.currentTarget as HTMLSelectElement).value as MatchMode })}
          >
            <option value="fuzzy">Fuzzy</option>
            <option value="exact">Exact</option>
            <option value="regex">Regex</option>
          </select>
          <input class="input input-xs w-full min-w-0 glass-input" disabled={!hasLoaded} placeholder={clause.mode === 'regex' ? `Regex clause ${idx + 1}` : `Clause ${idx + 1}`} value={clause.query} oninput={(e) => onUpdateMultiQueryClause(clause.id, { query: (e.currentTarget as HTMLInputElement).value })} />
          <button class="btn btn-xs variant-soft px-0" disabled={!hasLoaded || (multiQueryClauses?.length ?? 0) <= 1} title="Remove clause" onclick={() => onRemoveMultiQueryClause(clause.id)}>
            ×
          </button>
        </div>
      {/each}
    </div>
  {/if}

  {#if queryError}
    <div class="mt-1 text-[11px] text-red-300">{queryError}</div>
  {/if}
</div>
