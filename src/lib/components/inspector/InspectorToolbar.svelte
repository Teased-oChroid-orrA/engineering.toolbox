<script lang="ts">
  import NumberFlow from '@number-flow/svelte';
  import { Badge as FlowBadge } from 'flowbite-svelte';
  import { createEventDispatcher } from 'svelte';

  let {
    totalRowCount = 0,
    totalFilteredCount = 0,
    headers = [],
    sortColIdx = null,
    sortDir = 'asc',
    query = '',
    targetColIdx = null,
    numericEnabled = false,
    dateEnabled = false,
    categoryEnabled = false,
    isMergedView = false,
    hasLoaded = false,
    schemaLoading = false,
    quietBackendLogs = true,
    autoRestoreEnabled = true,
    svarNotice = null,
    debugLogPath = '',
    showInspectorMenu = false,
    canOpenPath = false
  } = $props<{
    totalRowCount?: number;
    totalFilteredCount?: number;
    headers?: string[];
    sortColIdx?: number | null;
    sortDir?: 'asc' | 'desc';
    query?: string;
    targetColIdx?: number | null;
    numericEnabled?: boolean;
    dateEnabled?: boolean;
    categoryEnabled?: boolean;
    isMergedView?: boolean;
    hasLoaded?: boolean;
    schemaLoading?: boolean;
    quietBackendLogs?: boolean;
    autoRestoreEnabled?: boolean;
    svarNotice?: string | null;
    debugLogPath?: string;
    showInspectorMenu?: boolean;
    canOpenPath?: boolean;
  }>();

  const dispatch = createEventDispatcher<{
    toggleMenu: void;
    openStream: void;
    openFallback: void;
    openSchema: void;
    openRecipes: void;
    toggleRegexHelp: void;
    openRegexGenerator: void;
    openBuilder: void;
    openColumnPicker: void;
    openShortcuts: void;
    exportAnalysisBundle: void;
    clearQuery: void;
    clearTarget: void;
    clearNumeric: void;
    clearDate: void;
    clearCategory: void;
    clearAllFilters: void;
    rerunSchema: void;
    toggleQuietLogs: { value: boolean };
    toggleAutoRestore: { value: boolean };
    exportCurrentView: void;
    exportFilteredRows: void;
    exportSelectedColumns: void;
  }>();
</script>

<div class="glass-panel rounded-2xl p-3 border border-white/10 sticky top-2 z-30" data-testid="inspector-toolbar">
  <div class="flex flex-wrap items-center gap-2 text-xs text-white/70">
    <div class="relative" data-inspector-menu-root="true">
      <button class="btn btn-xs variant-soft" onclick={() => dispatch('toggleMenu')}>Menu ▾</button>
      {#if showInspectorMenu}
        <div class="absolute left-0 top-full mt-2 z-[1400] w-64 rounded-xl border border-white/10 bg-surface-900/95 p-2 shadow-2xl">
          <div class="px-2 py-1 text-[10px] uppercase tracking-widest text-white/45">Load</div>
          <button class="w-full text-left px-2 py-1 rounded hover:bg-white/10 text-xs" onclick={() => dispatch('openStream')} disabled={!canOpenPath}>Stream…</button>
          <button class="w-full text-left px-2 py-1 rounded hover:bg-white/10 text-xs" onclick={() => dispatch('openFallback')}>Fallback upload…</button>
          <div class="my-1 h-px bg-white/10"></div>
          <button class="w-full text-left px-2 py-1 rounded hover:bg-white/10 text-xs" onclick={() => dispatch('openSchema')}>Open Schema</button>
          <button class="w-full text-left px-2 py-1 rounded hover:bg-white/10 text-xs" onclick={() => dispatch('openRecipes')}>Open Recipes</button>
          <button class="w-full text-left px-2 py-1 rounded hover:bg-white/10 text-xs" onclick={() => dispatch('toggleRegexHelp')}>Regex help</button>
          <button class="w-full text-left px-2 py-1 rounded hover:bg-white/10 text-xs" onclick={() => dispatch('openRegexGenerator')} disabled={!hasLoaded}>Regex generator</button>
          <button class="w-full text-left px-2 py-1 rounded hover:bg-white/10 text-xs" onclick={() => dispatch('openBuilder')} disabled={!hasLoaded}>Advanced builder</button>
          <button class="w-full text-left px-2 py-1 rounded hover:bg-white/10 text-xs" onclick={() => dispatch('openColumnPicker')}>Column Picker</button>
          <button class="w-full text-left px-2 py-1 rounded hover:bg-white/10 text-xs" onclick={() => dispatch('openShortcuts')}>Shortcuts</button>
          <button class="w-full text-left px-2 py-1 rounded hover:bg-white/10 text-xs" onclick={() => dispatch('exportAnalysisBundle')} disabled={!hasLoaded}>Export Analysis Bundle</button>
        </div>
      {/if}
    </div>
    <FlowBadge color="light">Rows: <NumberFlow value={totalRowCount} /></FlowBadge>
    <FlowBadge color="light">Filtered: <NumberFlow value={totalFilteredCount} /></FlowBadge>
    {#if sortColIdx != null}
      <FlowBadge color="light">Sort: {headers?.[sortColIdx] ?? sortColIdx} ({sortDir})</FlowBadge>
    {/if}
    {#if (query ?? '').trim().length > 0}
      <button class="btn btn-xs variant-soft" onclick={() => dispatch('clearQuery')}>
        Query: {query} <span class="text-white/40">×</span>
      </button>
    {/if}
    {#if targetColIdx != null}
      <button class="btn btn-xs variant-soft" onclick={() => dispatch('clearTarget')}>
        Target: {headers?.[targetColIdx] ?? targetColIdx} <span class="text-white/40">×</span>
      </button>
    {/if}
    {#if numericEnabled}
      <button class="btn btn-xs variant-soft" onclick={() => dispatch('clearNumeric')}>Numeric <span class="text-white/40">×</span></button>
    {/if}
    {#if dateEnabled}
      <button class="btn btn-xs variant-soft" onclick={() => dispatch('clearDate')}>Date <span class="text-white/40">×</span></button>
    {/if}
    {#if categoryEnabled}
      <button class="btn btn-xs variant-soft" onclick={() => dispatch('clearCategory')}>Category <span class="text-white/40">×</span></button>
    {/if}
    {#if isMergedView}
      <FlowBadge color="success">Merged view: all files</FlowBadge>
    {/if}
    <span class="ml-auto flex items-center gap-2">
      <button class="btn btn-xs variant-soft" onclick={() => dispatch('clearAllFilters')} disabled={!hasLoaded}>Clear all filters</button>
      <button class="btn btn-xs variant-soft" onclick={() => dispatch('rerunSchema')} disabled={!hasLoaded || schemaLoading}>Re-run schema</button>
      <button class="btn btn-xs variant-soft" onclick={() => dispatch('exportAnalysisBundle')} disabled={!hasLoaded}>Analysis bundle</button>
      <span class="text-[11px] text-white/60">Quiet logs</span>
      <input class="toggle toggle-sm" type="checkbox" checked={quietBackendLogs} onchange={(e) => dispatch('toggleQuietLogs', { value: (e.currentTarget as HTMLInputElement).checked })} />
      <span class="text-[11px] text-white/60">Auto-restore</span>
      <input class="toggle toggle-sm" type="checkbox" checked={autoRestoreEnabled} onchange={(e) => dispatch('toggleAutoRestore', { value: (e.currentTarget as HTMLInputElement).checked })} />
    </span>
  </div>
  <div class="mt-2 flex flex-wrap gap-2 text-[11px] text-white/60">
    <button class="btn btn-xs variant-soft" onclick={() => dispatch('exportCurrentView')} disabled={!hasLoaded}>Export current view</button>
    <button class="btn btn-xs variant-soft" onclick={() => dispatch('exportFilteredRows')} disabled={!hasLoaded}>Export filtered rows</button>
    <button class="btn btn-xs variant-soft" onclick={() => dispatch('exportSelectedColumns')} disabled={!hasLoaded}>Export selected columns</button>
    <button class="btn btn-xs variant-soft" onclick={() => dispatch('openShortcuts')}>Shortcuts</button>
  </div>
  {#if svarNotice}
    <div class="mt-2 text-[11px] text-emerald-200/80">{svarNotice}</div>
  {/if}
  {#if debugLogPath}
    <div class="mt-1 text-[10px] text-white/45 font-mono truncate" title={debugLogPath}>
      Debug log: {debugLogPath}
    </div>
  {/if}
</div>
