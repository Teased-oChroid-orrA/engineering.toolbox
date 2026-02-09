<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import { INSPECTOR_THEME } from '$lib/components/inspector/InspectorThemeTokens';

  type WindowInfo = {
    startIdx: number;
    endIdx: number;
    renderedCount: number;
    translateY: number;
    phantomHeight: number;
    maxWindow: number;
    sliceLabel: string;
  };

  export let headers: string[] = [];
  export let visibleRows: string[][] = [];
  export let visibleColIdxs: number[] = [];
  export let totalFilteredCount = 0;

  export let rowHeight = INSPECTOR_THEME.grid.rowHeight;
  export let overscan: number = INSPECTOR_THEME.grid.overscan;
  export let maxWindowAbs = INSPECTOR_THEME.grid.maxWindowAbs;
  export let initialHeight = 560;

  export let sortColIdx: number | null = null;
  export let sortDir: 'asc' | 'desc' = 'asc';
  export let sortPriority: Record<number, number> = {};

  export let pinnedLeft: number[] = [];
  export let pinnedRight: number[] = [];
  export let columnWidths: Record<number, number> = {};
  export let hiddenColumns: number[] = [];

  export let onRequestSort: (idx: number, opts?: { multi?: boolean }) => void = () => {};
  export let onOpenRow: (visualIdx: number) => void = () => {};
  export let onWindowChange: (info: WindowInfo) => void = () => {};
  export let onColumnResize: (idx: number, width: number) => void = () => {};
  export let highlightCell: (value: string) => string = (v) => v;
  export let topBanner: string | null = null;
  $: bannerText = (topBanner ?? '').trim() || 'Active dataset';

  let containerEl: HTMLElement | null = null;
  let scrollTop = 0;
  let scrollLeft = 0;
  let viewportHeight = initialHeight;
  let viewportWidth = 1200;
  let focusVisualIdx = 0;
  let prefersReducedMotion = false;
  let fastScroll = false;
  let fastScrollTimer: ReturnType<typeof setTimeout> | null = null;
  let lastScrollTopSample = 0;
  let lastScrollAt = 0;

  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const EST_COL_WIDTH = 170;
  const COL_OVERSCAN = 2;
  const HEADER_HEIGHT = INSPECTOR_THEME.grid.headerHeight;
  const BANNER_HEIGHT = INSPECTOR_THEME.grid.bannerHeight;

  const normalizeWidth = (w: number) => clamp(Math.floor(w), 90, 480);
  const isHidden = (idx: number) => hiddenColumns.includes(idx);
  const getColWidth = (idx: number) => normalizeWidth(columnWidths[idx] ?? EST_COL_WIDTH);

  $: visibleCols = visibleColIdxs.filter((idx) => !isHidden(idx));
  $: leftPins = pinnedLeft.filter((idx) => visibleCols.includes(idx));
  $: rightPins = pinnedRight.filter((idx) => visibleCols.includes(idx));
  $: pinnedSet = new Set<number>([...leftPins, ...rightPins]);
  $: centerCols = visibleCols.filter((idx) => !pinnedSet.has(idx));

  $: leftWidth = leftPins.reduce((acc, idx) => acc + getColWidth(idx), 0);
  $: rightWidth = rightPins.reduce((acc, idx) => acc + getColWidth(idx), 0);

  $: centerViewportWidth = Math.max(320, viewportWidth - leftWidth - rightWidth);
  $: colStart = Math.max(0, Math.floor(scrollLeft / EST_COL_WIDTH) - COL_OVERSCAN);
  $: colCount = Math.max(1, Math.ceil(centerViewportWidth / EST_COL_WIDTH) + COL_OVERSCAN * 2);
  $: colEnd = Math.min(centerCols.length, colStart + colCount);
  $: virtualCenterCols = centerCols.slice(colStart, colEnd);

  $: startIdx = (() => {
    const raw = Math.floor(scrollTop / rowHeight);
    if (!Number.isFinite(raw) || raw < 0) return 0;
    if (totalFilteredCount <= 0) return 0;
    return clamp(raw, 0, Math.max(0, totalFilteredCount - 1));
  })();

  // Progressive rendering for huge datasets and high-velocity scroll.
  $: effectiveOverscan = (() => {
    let base = overscan;
    if (totalFilteredCount > 500_000) base = Math.max(4, Math.floor(base * 0.6));
    if (fastScroll) base = Math.max(3, Math.floor(base * 0.7));
    return base;
  })();

  $: maxWindow = (() => {
    const visible = Math.ceil(viewportHeight / rowHeight);
    return Math.min(maxWindowAbs, visible + effectiveOverscan * 2);
  })();

  $: endIdx = (() => {
    if (totalFilteredCount <= 0) return 0;
    const rawEnd = startIdx + maxWindow;
    return clamp(rawEnd, 0, totalFilteredCount);
  })();

  $: renderedCount = Math.max(0, endIdx - startIdx);
  $: translateY = startIdx * rowHeight;
  $: phantomHeight = totalFilteredCount * rowHeight;
  $: sliceLabel = `Slice: ${startIdx}-${endIdx} • overscan ${effectiveOverscan} • maxWindow ${maxWindow} • rendered ${renderedCount}`;
  // Re-enable row transitions with safety guards to avoid animation thrash on huge windows.
  $: enableRowFx = !prefersReducedMotion && !fastScroll && renderedCount <= 120 && totalFilteredCount <= 50_000;
  $: rowInDuration = renderedCount <= 80 ? 95 : 70;
  $: rowOutDuration = renderedCount <= 80 ? 70 : 50;

  let lastWindowSig = '';
  $: {
    const next: WindowInfo = {
      startIdx,
      endIdx,
      renderedCount,
      translateY,
      phantomHeight,
      maxWindow,
      sliceLabel,
    };
    const sig = `${next.startIdx}:${next.endIdx}:${next.renderedCount}:${next.maxWindow}:${next.translateY}:${next.phantomHeight}`;
    if (sig !== lastWindowSig) {
      lastWindowSig = sig;
      onWindowChange(next);
    }
  }

  function onScroll(e: Event) {
    const el = e.currentTarget as HTMLElement;
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const dy = Math.abs(el.scrollTop - lastScrollTopSample);
    const dt = Math.max(1, now - lastScrollAt);
    const velocity = dy / dt;
    if (velocity > 1.2) {
      fastScroll = true;
      if (fastScrollTimer) clearTimeout(fastScrollTimer);
      fastScrollTimer = setTimeout(() => {
        fastScroll = false;
      }, 130);
    }
    lastScrollTopSample = el.scrollTop;
    lastScrollAt = now;
    scrollTop = el.scrollTop;
    scrollLeft = el.scrollLeft;
  }

  function ensureFocusedRowInView() {
    if (!containerEl) return;
    const top = focusVisualIdx * rowHeight;
    const bottom = top + rowHeight;
    const viewTop = containerEl.scrollTop;
    const viewBottom = viewTop + containerEl.clientHeight;
    if (top < viewTop) containerEl.scrollTop = top;
    else if (bottom > viewBottom) containerEl.scrollTop = Math.max(0, bottom - containerEl.clientHeight);
  }

  function onGridKeydown(e: KeyboardEvent) {
    if (totalFilteredCount <= 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusVisualIdx = clamp(focusVisualIdx + 1, 0, totalFilteredCount - 1);
      ensureFocusedRowInView();
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusVisualIdx = clamp(focusVisualIdx - 1, 0, totalFilteredCount - 1);
      ensureFocusedRowInView();
      return;
    }
    if (e.key === 'PageDown') {
      e.preventDefault();
      const jump = Math.max(1, Math.floor((viewportHeight / rowHeight) * 0.9));
      focusVisualIdx = clamp(focusVisualIdx + jump, 0, totalFilteredCount - 1);
      ensureFocusedRowInView();
      return;
    }
    if (e.key === 'PageUp') {
      e.preventDefault();
      const jump = Math.max(1, Math.floor((viewportHeight / rowHeight) * 0.9));
      focusVisualIdx = clamp(focusVisualIdx - jump, 0, totalFilteredCount - 1);
      ensureFocusedRowInView();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      onOpenRow(focusVisualIdx);
      return;
    }
  }

  function beginResize(e: MouseEvent, colIdx: number) {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const baseWidth = getColWidth(colIdx);

    const onMove = (ev: MouseEvent) => {
      const nextW = normalizeWidth(baseWidth + (ev.clientX - startX));
      onColumnResize(colIdx, nextW);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function sortLabel(idx: number): string {
    const p = sortPriority[idx];
    return p != null ? `#${p + 1}` : '';
  }

  onMount(() => {
    try {
      prefersReducedMotion =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        !!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      prefersReducedMotion = false;
    }
    if (!containerEl) return;
    lastScrollTopSample = containerEl.scrollTop;
    lastScrollAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const ro = new ResizeObserver((entries) => {
      for (const ent of entries) {
        viewportHeight = Math.max(200, Math.floor(ent.contentRect.height));
        viewportWidth = Math.max(480, Math.floor(ent.contentRect.width));
      }
    });
    ro.observe(containerEl);
    return () => {
      if (fastScrollTimer) clearTimeout(fastScrollTimer);
      ro.disconnect();
    };
  });
</script>

<div
  bind:this={containerEl}
  class="glass-panel rounded-2xl border border-white/10 overflow-auto relative focus:outline-none"
  style="height: 60vh;"
  onscroll={onScroll}
  onkeydown={onGridKeydown}
  tabindex="0"
  role="grid"
  aria-label="Inspector grid"
>
  {#if headers.length > 0}
    {#if topBanner !== null}
      <div class="sticky left-0 z-[25] w-full text-center px-4 py-2 text-[11px] uppercase tracking-[0.14em] text-emerald-200/95 bg-surface-900 border-y border-white/10 pointer-events-none" style={`top:${INSPECTOR_THEME.grid.stickyOffsetTop}px;`}>
        {bannerText}
      </div>
    {/if}

    <table class="min-w-full text-xs whitespace-nowrap">
      <thead class="sticky top-0 z-20 bg-surface-900/80 backdrop-blur border-b border-white/10">
        <tr>
          {#each leftPins as idx}
            <th class="text-left px-3 py-2 text-[10px] uppercase tracking-widest text-white/55 select-none" style={`min-width:${getColWidth(idx)}px`}>
              <div class="inline-flex items-center gap-1">
                <button class="hover:text-white/85" title="Sort" onclick={(e) => onRequestSort(idx, { multi: e.shiftKey })}>{headers[idx]}</button>
                {#if sortColIdx === idx}
                  <span class="text-[10px] text-white/55">{sortDir === 'asc' ? '▲' : '▼'}</span>
                {/if}
                {#if sortLabel(idx)}
                  <span class="text-[10px] text-emerald-200/80">{sortLabel(idx)}</span>
                {/if}
              </div>
            </th>
          {/each}

          {#if colStart > 0}
            <th class="px-0 py-0" style={`width:${colStart * EST_COL_WIDTH}px`}></th>
          {/if}
          {#each virtualCenterCols as idx}
            <th class="text-left px-3 py-2 text-[10px] uppercase tracking-widest text-white/55 select-none relative group" style={`min-width:${getColWidth(idx)}px`}>
              <div class="inline-flex items-center gap-1">
                <button
                  class="group inline-flex items-center gap-1 hover:text-white/80"
                  title="Sort (Shift+click for multi-sort)"
                  onclick={(e) => onRequestSort(idx, { multi: e.shiftKey })}
                >
                  <span class="truncate">{headers[idx]}</span>
                  {#if sortColIdx === idx}
                    <span class="text-[10px] text-white/50 group-hover:text-white/70">{sortDir === 'asc' ? '▲' : '▼'}</span>
                  {:else}
                    <span class="text-[10px] text-white/20 group-hover:text-white/40">↕</span>
                  {/if}
                </button>
                {#if sortLabel(idx)}
                  <span class="text-[10px] text-emerald-200/80">{sortLabel(idx)}</span>
                {/if}
              </div>
              <button
                type="button"
                class="absolute right-0 top-0 h-full w-1 cursor-col-resize opacity-0 group-hover:opacity-100 bg-white/20"
                aria-label={`Resize ${headers[idx]}`}
                onmousedown={(e) => beginResize(e, idx)}
              ></button>
            </th>
          {/each}
          {#if colEnd < centerCols.length}
            <th class="px-0 py-0" style={`width:${Math.max(0, centerCols.length - colEnd) * EST_COL_WIDTH}px`}></th>
          {/if}

          {#each rightPins as idx}
            <th class="text-left px-3 py-2 text-[10px] uppercase tracking-widest text-white/55 select-none" style={`min-width:${getColWidth(idx)}px`}>
              <div class="inline-flex items-center gap-1">
                <button class="hover:text-white/85" title="Sort" onclick={(e) => onRequestSort(idx, { multi: e.shiftKey })}>{headers[idx]}</button>
                {#if sortColIdx === idx}
                  <span class="text-[10px] text-white/55">{sortDir === 'asc' ? '▲' : '▼'}</span>
                {/if}
                {#if sortLabel(idx)}
                  <span class="text-[10px] text-emerald-200/80">{sortLabel(idx)}</span>
                {/if}
              </div>
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        <tr aria-hidden="true" style="height: {phantomHeight}px;"></tr>
      </tbody>
    </table>

    <table class="absolute left-0 min-w-full text-xs whitespace-nowrap" style="top: {HEADER_HEIGHT + (topBanner !== null ? BANNER_HEIGHT : 0)}px; transform: translateY({translateY}px);">
      <tbody>
        {#each visibleRows as row, i (startIdx + i)}
          {@const visualIdx = startIdx + i}
          {#if enableRowFx}
            <tr
              class={`border-b border-white/5 cursor-pointer row-enter ${visualIdx === focusVisualIdx ? 'bg-emerald-400/10' : 'hover:bg-white/5'}`}
              onclick={() => { focusVisualIdx = visualIdx; onOpenRow(visualIdx); }}
              in:fade={{ duration: rowInDuration }}
              out:fade={{ duration: rowOutDuration }}
            >
              {#each leftPins as c}
                {@const cell = row?.[c] ?? ''}
                <td class="px-3 py-2" style={`min-width:${getColWidth(c)}px`}>
                  {#if (cell ?? '').trim().length === 0}
                    <span class="italic text-white/35">∅</span>
                  {:else}
                    <span class="font-mono cell-smooth">{@html highlightCell(String(cell))}</span>
                  {/if}
                </td>
              {/each}

              {#if colStart > 0}
                <td class="px-0 py-0" style={`width:${colStart * EST_COL_WIDTH}px`}></td>
              {/if}
              {#each virtualCenterCols as c}
                {@const cell = row?.[c] ?? ''}
                <td class="px-3 py-2" style={`min-width:${getColWidth(c)}px`}>
                  {#if (cell ?? '').trim().length === 0}
                    <span class="italic text-white/35">∅</span>
                  {:else}
                    <span class="font-mono cell-smooth">{@html highlightCell(String(cell))}</span>
                  {/if}
                </td>
              {/each}
              {#if colEnd < centerCols.length}
                <td class="px-0 py-0" style={`width:${Math.max(0, centerCols.length - colEnd) * EST_COL_WIDTH}px`}></td>
              {/if}

              {#each rightPins as c}
                {@const cell = row?.[c] ?? ''}
                <td class="px-3 py-2" style={`min-width:${getColWidth(c)}px`}>
                  {#if (cell ?? '').trim().length === 0}
                    <span class="italic text-white/35">∅</span>
                  {:else}
                    <span class="font-mono cell-smooth">{@html highlightCell(String(cell))}</span>
                  {/if}
                </td>
              {/each}
            </tr>
          {:else}
            <tr
              class={`border-b border-white/5 cursor-pointer ${visualIdx === focusVisualIdx ? 'bg-emerald-400/10' : 'hover:bg-white/5'}`}
              onclick={() => { focusVisualIdx = visualIdx; onOpenRow(visualIdx); }}
            >
              {#each leftPins as c}
                {@const cell = row?.[c] ?? ''}
                <td class="px-3 py-2" style={`min-width:${getColWidth(c)}px`}>
                  {#if (cell ?? '').trim().length === 0}
                    <span class="italic text-white/35">∅</span>
                  {:else}
                    <span class="font-mono">{@html highlightCell(String(cell))}</span>
                  {/if}
                </td>
              {/each}

              {#if colStart > 0}
                <td class="px-0 py-0" style={`width:${colStart * EST_COL_WIDTH}px`}></td>
              {/if}
              {#each virtualCenterCols as c}
                {@const cell = row?.[c] ?? ''}
                <td class="px-3 py-2" style={`min-width:${getColWidth(c)}px`}>
                  {#if (cell ?? '').trim().length === 0}
                    <span class="italic text-white/35">∅</span>
                  {:else}
                    <span class="font-mono">{@html highlightCell(String(cell))}</span>
                  {/if}
                </td>
              {/each}
              {#if colEnd < centerCols.length}
                <td class="px-0 py-0" style={`width:${Math.max(0, centerCols.length - colEnd) * EST_COL_WIDTH}px`}></td>
              {/if}

              {#each rightPins as c}
                {@const cell = row?.[c] ?? ''}
                <td class="px-3 py-2" style={`min-width:${getColWidth(c)}px`}>
                  {#if (cell ?? '').trim().length === 0}
                    <span class="italic text-white/35">∅</span>
                  {:else}
                    <span class="font-mono">{@html highlightCell(String(cell))}</span>
                  {/if}
                </td>
              {/each}
            </tr>
          {/if}
        {/each}
      </tbody>
    </table>
  {:else}
    <div class="p-10 text-white/50 text-sm">Load a CSV to begin.</div>
  {/if}
</div>

<style>
  .row-enter {
    will-change: opacity, transform;
  }
  .cell-smooth {
    display: inline-block;
  }
</style>
