<script lang="ts">
  import { onMount } from 'svelte';
  import { INSPECTOR_THEME } from '$lib/components/inspector/InspectorThemeTokens';
  import InspectorVirtualGridHeader from './InspectorVirtualGridHeader.svelte';
  import InspectorVirtualGridRows from './InspectorVirtualGridRows.svelte';
  import {
    computeStartIdx,
    normalizeRowHeight,
    snapTranslateY
  } from '$lib/components/inspector/InspectorGridWindowController';
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
  export let rowHeight: number = INSPECTOR_THEME.grid.rowHeight;
  export let overscan: number = INSPECTOR_THEME.grid.overscan;
  export let maxWindowAbs: number = INSPECTOR_THEME.grid.maxWindowAbs;
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
  export let onScrollTrace: (info: { scrollTop: number; dy: number; dtMs: number; velocity: number; fastScroll: boolean }) => void = () => {};
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

  $: safeRowHeight = normalizeRowHeight(rowHeight);
  $: startIdx = computeStartIdx(scrollTop, safeRowHeight, totalFilteredCount);

  // Progressive rendering for huge datasets and high-velocity scroll.
  $: effectiveOverscan = (() => {
    let base = overscan;
    if (totalFilteredCount > 500_000) base = Math.max(4, Math.floor(base * 0.6));
    if (fastScroll) base = Math.max(3, Math.floor(base * 0.7));
    return base;
  })();

  $: maxWindow = (() => {
    const visible = Math.ceil(viewportHeight / safeRowHeight);
    return Math.min(maxWindowAbs, visible + effectiveOverscan * 2);
  })();

  $: endIdx = (() => {
    if (totalFilteredCount <= 0) return 0;
    const rawEnd = startIdx + maxWindow;
    return clamp(rawEnd, 0, totalFilteredCount);
  })();

  $: renderedCount = Math.max(0, endIdx - startIdx);
  $: translateY = snapTranslateY(startIdx, safeRowHeight);
  $: phantomHeight = totalFilteredCount * safeRowHeight;
  $: sliceLabel = `Slice: ${startIdx}-${endIdx} • overscan ${effectiveOverscan} • maxWindow ${maxWindow} • rendered ${renderedCount}`;
  $: enableRowFx = false;

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
    onScrollTrace({ scrollTop, dy, dtMs: dt, velocity, fastScroll });
  }

  function ensureFocusedRowInView() {
    if (!containerEl) return;
    const top = focusVisualIdx * safeRowHeight;
    const bottom = top + safeRowHeight;
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
      const jump = Math.max(1, Math.floor((viewportHeight / safeRowHeight) * 0.9));
      focusVisualIdx = clamp(focusVisualIdx + jump, 0, totalFilteredCount - 1);
      ensureFocusedRowInView();
      return;
    }
    if (e.key === 'PageUp') {
      e.preventDefault();
      const jump = Math.max(1, Math.floor((viewportHeight / safeRowHeight) * 0.9));
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

  function onActivateRow(visualIdx: number) {
    focusVisualIdx = visualIdx;
    onOpenRow(visualIdx);
  }

  onMount(() => {
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
  class="glass-panel rounded-2xl border border-white/10 overflow-auto relative focus:outline-none inspector-panel-slide inspector-pop-card"
  style="height: 60vh;"
  onscroll={onScroll}
  onkeydown={onGridKeydown}
  tabindex="0"
  role="grid"
  aria-label="Inspector grid"
>
  {#if headers.length > 0}
    {#if topBanner !== null}
      <div class="sticky left-0 z-[25] w-full text-center px-4 py-2 text-[11px] uppercase tracking-[0.14em] text-emerald-200/95 bg-surface-900 border-y border-white/10 pointer-events-none" style={`top:${HEADER_HEIGHT}px;`}>
        {bannerText}
      </div>
    {/if}

    <table class="min-w-full text-xs whitespace-nowrap">
      <InspectorVirtualGridHeader
        {headers}
        {leftPins}
        {rightPins}
        {centerCols}
        {virtualCenterCols}
        {colStart}
        {colEnd}
        {EST_COL_WIDTH}
        {getColWidth}
        {onRequestSort}
        {sortColIdx}
        {sortDir}
        {sortLabel}
        {beginResize}
      />
      <tbody>
        <tr aria-hidden="true" style="height: {phantomHeight}px;"></tr>
      </tbody>
    </table>
    <InspectorVirtualGridRows
      {visibleRows}
      {startIdx}
      {focusVisualIdx}
      {safeRowHeight}
      {translateY}
      {HEADER_HEIGHT}
      {BANNER_HEIGHT}
      {topBanner}
      {enableRowFx}
      {leftPins}
      {rightPins}
      {centerCols}
      {virtualCenterCols}
      {colStart}
      {colEnd}
      {EST_COL_WIDTH}
      {getColWidth}
      {highlightCell}
      onActivateRow={onActivateRow}
    />
  {:else}
    <div class="p-10 text-white/50 text-sm">Load a CSV to begin.</div>
  {/if}
</div>
