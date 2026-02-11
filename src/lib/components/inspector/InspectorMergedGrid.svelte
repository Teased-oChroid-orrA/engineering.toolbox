<script lang="ts">
  import { fade } from 'svelte/transition';
  import { INSPECTOR_THEME } from '$lib/components/inspector/InspectorThemeTokens';

  let {
    mergedDisplayHeaders = [],
    mergedGroupedRows = [],
    mergedRowFxEnabled = true,
    uiAnimDur = 160
  } = $props<{
    mergedDisplayHeaders: string[];
    mergedGroupedRows: { source: string; rows: string[][] }[];
    mergedRowFxEnabled: boolean;
    uiAnimDur: number;
  }>();
</script>

<div class="glass-panel rounded-2xl border border-white/10 overflow-auto relative inspector-panel-slide inspector-pop-card" style="height: 60vh;">
  <table class="min-w-full text-xs whitespace-nowrap">
    <thead class="sticky top-0 z-20 bg-surface-900/80 backdrop-blur border-b border-white/10">
      <tr>
        {#each mergedDisplayHeaders as h, i (i)}
          <th class="text-left px-3 py-2 text-[10px] uppercase tracking-widest text-white/55">{h}</th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each mergedGroupedRows as group, gi (`group-${gi}-${group.source}`)}
        <tr class="sticky z-10 border-y border-white/10 bg-white/[0.03]" style={`top:${INSPECTOR_THEME.grid.headerHeight}px;`}>
          <td colspan={Math.max(1, mergedDisplayHeaders.length)} class="px-0 py-0">
            <div class="sticky left-0 w-screen text-center px-4 py-2 text-[11px] uppercase tracking-[0.14em] text-emerald-200/90 bg-surface-900/90 backdrop-blur-sm border-y border-white/10">
              {group.source}
            </div>
          </td>
        </tr>
        {#each group.rows as row, ri (`row-${gi}-${ri}`)}
          {#if mergedRowFxEnabled}
            <tr class="border-b border-white/5" in:fade={{ duration: Math.max(70, uiAnimDur - 20) }} out:fade={{ duration: Math.max(50, uiAnimDur - 50) }}>
              {#each mergedDisplayHeaders as _h, c (c)}
                {@const cell = row?.[c] ?? ''}
                <td class="px-3 py-2">
                  {#if (cell ?? '').trim().length === 0}
                    <span class="italic text-white/35">∅</span>
                  {:else}
                    <span class="font-mono inspector-pop-value">{cell}</span>
                  {/if}
                </td>
              {/each}
            </tr>
          {:else}
            <tr class="border-b border-white/5">
              {#each mergedDisplayHeaders as _h, c (c)}
                {@const cell = row?.[c] ?? ''}
                <td class="px-3 py-2">
                  {#if (cell ?? '').trim().length === 0}
                    <span class="italic text-white/35">∅</span>
                  {:else}
                    <span class="font-mono inspector-pop-value">{cell}</span>
                  {/if}
                </td>
              {/each}
            </tr>
          {/if}
        {/each}
      {/each}
    </tbody>
  </table>
</div>
