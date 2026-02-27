<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { INSPECTOR_THEME } from '$lib/components/inspector/InspectorThemeTokens';
  import { computeStartIdx, normalizeRowHeight } from '$lib/components/inspector/InspectorGridWindowController';

  let {
    mergedDisplayHeaders = [],
    mergedGroupedRows = [],
    mergedRowFxEnabled = true,
    uiAnimDur = 160,
    rowHeight = INSPECTOR_THEME.grid.rowHeight,
    overscan = INSPECTOR_THEME.grid.overscan,
    maxWindowAbs = INSPECTOR_THEME.grid.maxWindowAbs,
    onWindowChange = () => {},
    onScrollTrace = () => {}
  } = $props<{
    mergedDisplayHeaders: string[];
    mergedGroupedRows: { source: string; rows: string[][] }[];
    mergedRowFxEnabled: boolean;
    uiAnimDur: number;
    rowHeight?: number;
    overscan?: number;
    maxWindowAbs?: number;
    onWindowChange?: (info: {
      startIdx: number;
      endIdx: number;
      renderedCount: number;
      translateY: number;
      phantomHeight: number;
      maxWindow: number;
      sliceLabel: string;
    }) => void;
    onScrollTrace?: (info: {
      scrollTop: number;
      dy: number;
      dtMs: number;
      velocity: number;
      fastScroll: boolean;
    }) => void;
  }>();
  let containerEl = $state<HTMLDivElement | null>(null);
  let scrollTop = $state(0);
  let viewportHeight = $state(560);
  let lastScrollTopSample = $state(0);
  let lastScrollAt = $state(0);

  const normalizeSourceLabel = (source: string): string => {
    const raw = (source ?? '').trim();
    const dequoted = raw.replace(/^["']+|["']+$/g, '').trim();
    if (!dequoted || /^\[?\s*none\s*\]?$/i.test(dequoted) || /^\(\s*none\s*\)$/i.test(dequoted)) {
      return 'Unnamed file';
    }
    const base = dequoted.split(/[\\/]/).pop() ?? dequoted;
    return base.replace(/\.csv$/i, '').trim() || 'Unnamed file';
  };
  const sectionStickyTop = INSPECTOR_THEME.grid.headerHeight;
  let currentSource = $state('Unnamed file');
  const refreshCurrentSource = () => {
    const host = containerEl;
    if (!host) {
      currentSource = normalizeSourceLabel((mergedGroupedRows?.[0]?.source as string) ?? '');
      return;
    }
    const markers = Array.from(host.querySelectorAll<HTMLElement>('[data-source-marker="true"]'));
    if (!markers.length) {
      currentSource = normalizeSourceLabel((mergedGroupedRows?.[0]?.source as string) ?? '');
      return;
    }
    const hostTop = host.getBoundingClientRect().top;
    const threshold = hostTop + sectionStickyTop + 10;
    let selected = markers[0].dataset.source ?? '';
    for (const marker of markers) {
      if (marker.getBoundingClientRect().top <= threshold) {
        selected = marker.dataset.source ?? selected;
      } else {
        break;
      }
    }
    currentSource = normalizeSourceLabel(selected);
  };
  $effect(() => {
    mergedGroupedRows;
    requestAnimationFrame(() => refreshCurrentSource());
  });
  const totalRows = $derived.by(() =>
    (mergedGroupedRows ?? []).reduce((sum: number, g: { source: string; rows: string[][] }) => sum + (g.rows?.length ?? 0), 0)
  );
  const safeRowHeight = $derived.by(() => normalizeRowHeight(rowHeight));
  const startIdx = $derived.by(() => computeStartIdx(scrollTop, safeRowHeight, totalRows));
  const maxWindow = $derived.by(() => {
    const visible = Math.ceil(viewportHeight / safeRowHeight);
    return Math.min(maxWindowAbs, visible + overscan * 2);
  });
  const endIdx = $derived.by(() => Math.min(totalRows, startIdx + maxWindow));
  const renderedCount = $derived.by(() => Math.max(0, endIdx - startIdx));
  const translateY = $derived.by(() => Math.round(startIdx * safeRowHeight));
  const phantomHeight = $derived.by(() => totalRows * safeRowHeight);

  let lastWindowSig = '';
  $effect(() => {
    const next = {
      startIdx,
      endIdx,
      renderedCount,
      translateY,
      phantomHeight,
      maxWindow,
      sliceLabel: `Slice: ${startIdx}-${endIdx} • overscan ${overscan} • maxWindow ${maxWindow} • rendered ${renderedCount}`
    };
    const sig = `${next.startIdx}:${next.endIdx}:${next.renderedCount}:${next.maxWindow}:${next.translateY}:${next.phantomHeight}`;
    if (sig !== lastWindowSig) {
      lastWindowSig = sig;
      onWindowChange(next);
    }
  });

  const onScroll = (e: Event) => {
    refreshCurrentSource();
    const el = e.currentTarget as HTMLElement;
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const dy = Math.abs(el.scrollTop - lastScrollTopSample);
    const dt = Math.max(1, now - lastScrollAt);
    const velocity = dy / dt;
    lastScrollTopSample = el.scrollTop;
    lastScrollAt = now;
    scrollTop = el.scrollTop;
    onScrollTrace({ scrollTop, dy, dtMs: dt, velocity, fastScroll: velocity > 1.2 });
  };

  onMount(() => {
    if (!containerEl) return;
    lastScrollTopSample = containerEl.scrollTop;
    lastScrollAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const ro = new ResizeObserver((entries) => {
      for (const ent of entries) viewportHeight = Math.max(200, Math.floor(ent.contentRect.height));
    });
    ro.observe(containerEl);
    return () => ro.disconnect();
  });
</script>

<div
  class="glass-panel rounded-2xl border border-white/10 overflow-auto relative inspector-panel-slide inspector-pop-card"
  style="height: 60vh;"
  bind:this={containerEl}
  onscroll={onScroll}
>
  <div
    class="sticky z-50 px-3 py-1.5 text-center text-[10px] uppercase tracking-[0.14em] text-emerald-200/90 bg-surface-900/95 border-b border-white/10 backdrop-blur"
    style={`top:${sectionStickyTop}px;`}
    data-testid="inspector-merged-current-source"
  >
    {#key currentSource}
      <span in:fade={{ duration: 120 }} out:fade={{ duration: 90 }}>{currentSource}</span>
    {/key}
  </div>
  <table class="min-w-full text-xs whitespace-nowrap">
    <thead class="sticky top-0 z-40 bg-surface-900/95 backdrop-blur border-b border-white/10">
      <tr>
        {#each mergedDisplayHeaders as h, i (i)}
          <th class="text-left px-3 py-2 text-[10px] uppercase tracking-widest text-white/55">{h}</th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each mergedGroupedRows as group, gi (`group-${gi}-${group.source}`)}
        <tr aria-hidden="true">
          <td colspan={Math.max(1, mergedDisplayHeaders.length)} class="p-0 border-0">
            <div
              class="h-px overflow-hidden opacity-0 pointer-events-none"
              data-source-marker="true"
              data-source={normalizeSourceLabel(group.source)}
            >
              {normalizeSourceLabel(group.source)}
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
