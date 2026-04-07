<script lang="ts">
  import { onMount } from 'svelte';
  import { Badge, Card } from '$lib/components/ui';
  import { cn } from '$lib/utils';
  import BushingDrafting from '$lib/drafting/bushing/BushingDrafting.svelte';
  import type { BushingRenderMode } from '$lib/drafting/bushing/bushingSceneModel';
  import type { BushingRenderDiagnostic } from '$lib/drafting/bushing/BushingRenderTypes';

  let {
    draftingView,
    useLegacyRenderer = false,
    renderMode = 'section' as BushingRenderMode,
    traceEnabled = false,
    advancedMode = false,
    cacheHits = 0,
    cacheMisses = 0,
    isInfinitePlate = false,
    renderInitNotice = null,
    visualDiagnostics = [],
    renderDiagnostics = [],
    onExportSvg = () => {},
    onExportPdf = () => {},
    onExportJson = () => {},
    onToggleRendererMode = () => {},
    onToggleTraceMode = () => {},
    onRenderDiagnostics = () => {},
    onRenderInitFailure = () => {}
  }: {
    draftingView: any;
    useLegacyRenderer?: boolean;
    renderMode?: BushingRenderMode;
    traceEnabled?: boolean;
    advancedMode?: boolean;
    cacheHits?: number;
    cacheMisses?: number;
    isInfinitePlate?: boolean;
    renderInitNotice?: string | null;
    visualDiagnostics?: Array<{ severity: 'error' | 'warning' | 'info'; message: string }>;
    renderDiagnostics?: BushingRenderDiagnostic[];
    onExportSvg?: () => void;
    onExportPdf?: () => void;
    onExportJson?: () => void;
    onToggleRendererMode?: () => void;
    onToggleTraceMode?: () => void;
    onRenderDiagnostics?: (diag: BushingRenderDiagnostic[]) => void;
    onRenderInitFailure?: (reason: string) => void;
  } = $props();

  let renderHealth = $derived.by(() => {
    const issues = [...visualDiagnostics, ...renderDiagnostics];
    if (!issues.length && !renderInitNotice) return null;
    const severity = issues.some((diag) => diag.severity === 'error') || renderInitNotice ? 'error' : 'warning';
    const primary = renderInitNotice ?? issues[0]?.message ?? 'Renderer reported an issue.';
    return {
      severity,
      primary,
      detailCount: issues.length
    };
  });

  let draftingHost = $state<HTMLDivElement | null>(null);
  let draftingActivated = $state(false);
  let draftingVisibleRatio = $state(0);
  let draftingPinned = $state(false);
  let draftingShouldRender = $derived(draftingActivated && (draftingPinned || draftingVisibleRatio >= 0.38));

  function activateDraftingWhenIdle() {
    if (draftingActivated) return;
    const idleScheduler =
      typeof window !== 'undefined' && 'requestIdleCallback' in window
        ? (window.requestIdleCallback as (callback: IdleRequestCallback, options?: IdleRequestOptions) => number)
        : null;
    if (idleScheduler) {
      idleScheduler(() => {
        draftingActivated = true;
      }, { timeout: 250 });
      return;
    }
    setTimeout(() => {
      draftingActivated = true;
    }, 80);
  }

  onMount(() => {
    if (!draftingHost || typeof IntersectionObserver === 'undefined') {
      activateDraftingWhenIdle();
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const ratio = Math.max(...entries.map((entry) => entry.intersectionRatio), 0);
        draftingVisibleRatio = ratio;
        if (entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.42)) {
          activateDraftingWhenIdle();
        }
      },
      { rootMargin: '40px 0px', threshold: [0, 0.18, 0.42] }
    );
    observer.observe(draftingHost);
    return () => observer.disconnect();
  });
</script>

<Card class="drafting-shell min-h-[560px] flex flex-col overflow-hidden border-teal-500/16 bg-[#071a26] relative group p-0 bushing-pop-card bushing-no-tilt bushing-depth-1">
  <div class="border-b border-teal-500/10 bg-[#0a2130] px-4 py-3 z-10 shrink-0 flex justify-between items-center">
    <div class="relative z-20 flex items-center gap-2">
      <span class="font-medium text-teal-100/90 text-sm">5. Drafting / Export</span>
      {#if isInfinitePlate}
        <div class="flex items-center gap-2 rounded-md border border-indigo-400/30 bg-indigo-500/14 px-2 py-1" title="Automatic solver state. This is enabled when plate width is large enough that widening the plate further no longer changes edge-effect behavior. There is no direct checkbox for this.">
          <Badge variant="outline" class="text-[9px] bg-indigo-500/20 text-indigo-200 border-indigo-400/30">INFINITE PLATE</Badge>
          <span class="text-[10px] font-mono text-indigo-100/85">auto solver state</span>
        </div>
      {/if}
    </div>
    <div class="flex flex-wrap items-center justify-end gap-2">
      <div class="flex items-center gap-2 rounded-md border border-teal-200/10 bg-teal-500/5 px-2 py-1">
        <span class="text-[10px] font-mono text-teal-100/60">Export</span>
        <button aria-label="Export SVG" class="rounded-md border border-teal-200/10 bg-teal-500/5 px-2 py-1 text-[10px] font-mono text-teal-100/80 hover:bg-teal-500/10" onclick={onExportSvg}>SVG</button>
        <button aria-label="Export PDF" class="rounded-md border border-teal-200/10 bg-teal-500/5 px-2 py-1 text-[10px] font-mono text-teal-100/80 hover:bg-teal-500/10" onclick={onExportPdf}>PDF</button>
        <button aria-label="Export JSON" class="rounded-md border border-teal-200/10 bg-teal-500/5 px-2 py-1 text-[10px] font-mono text-teal-100/80 hover:bg-teal-500/10" onclick={onExportJson}>JSON</button>
      </div>
      <div class="flex items-center gap-2 rounded-md border border-teal-200/10 bg-teal-500/5 px-2 py-1">
        <span class="text-[10px] font-mono text-teal-100/60">View</span>
        <button class="rounded-md border border-teal-200/10 bg-teal-500/5 px-2 py-1 text-[10px] font-mono text-teal-100/80 hover:bg-teal-500/10" onclick={onToggleRendererMode}>
          {useLegacyRenderer ? 'Draft Renderer: Legacy View' : 'Draft Renderer: Section View'}
        </button>
        <Badge variant="outline" class="text-[10px] border-teal-500/30 text-teal-200">Draft Engine: D3</Badge>
        <Badge variant="outline" class="text-[10px] border-teal-500/30 text-teal-200">SECTION A-A</Badge>
      </div>
      {#if advancedMode}
        <div class="flex items-center gap-2 rounded-md border border-teal-200/10 bg-teal-500/5 px-2 py-1">
          <span class="text-[10px] font-mono text-teal-100/60">Advanced</span>
          <button
            class={cn(
              'rounded-md border px-2 py-1 text-[10px] font-mono hover:bg-teal-500/10',
              traceEnabled
                ? 'border-cyan-300/45 bg-cyan-500/15 text-cyan-100'
                : 'border-teal-200/10 bg-teal-500/5 text-teal-100/80'
            )}
            onclick={onToggleTraceMode}>
            {traceEnabled ? 'Trace: On' : 'Trace: Off'}
          </button>
          {#if traceEnabled}
            <Badge variant="outline" class="text-[10px] border-cyan-400/40 text-cyan-200">
              Cache H/M: {cacheHits}/{cacheMisses}
            </Badge>
          {/if}
        </div>
      {/if}
    </div>
  </div>
  <div class="flex h-full min-h-0 w-full flex-col gap-2 p-3">
    {#if renderHealth}
      <div class={`rounded-md border px-3 py-2 text-[11px] font-medium ${
        renderHealth.severity === 'error'
          ? 'border-rose-300/45 bg-rose-500/12 text-rose-100'
          : 'border-amber-300/45 bg-amber-500/12 text-amber-100'
      }`}>
        <div>{renderHealth.severity === 'error' ? 'Drafting needs attention.' : 'Drafting has advisory notices.'}</div>
        <div class="mt-1 text-[10px] opacity-90">{renderHealth.primary}</div>
      </div>
    {/if}
    <div
      class="drafting-stage relative mx-auto w-full max-w-[1040px]"
      bind:this={draftingHost}
      role="presentation"
      onmouseenter={() => {
        draftingPinned = true;
        activateDraftingWhenIdle();
      }}
      onmouseleave={() => {
        draftingPinned = false;
      }}
      onfocusin={() => {
        draftingPinned = true;
        activateDraftingWhenIdle();
      }}
      onfocusout={() => {
        draftingPinned = false;
      }}
    >
      <div class="absolute inset-0 opacity-[0.055] pointer-events-none" style="background-image: radial-gradient(#2dd4bf 1px, transparent 1px); background-size: 18px 18px;"></div>
      <div class="drafting-viewport relative overflow-hidden rounded-xl border border-teal-400/18 bg-[#041724]">
        {#if draftingShouldRender}
          <div class="aspect-[1/1] w-full min-h-[520px]">
            <BushingDrafting
              inputs={draftingView}
              legacyMode={useLegacyRenderer}
              {renderMode}
              onRenderDiagnostics={(diag) => onRenderDiagnostics(diag)}
              onRenderInitFailure={onRenderInitFailure}
            />
          </div>
        {:else}
          <div class="flex min-h-[520px] items-center justify-center px-6 text-center">
            <div class="max-w-md rounded-2xl border border-teal-300/18 bg-black/24 px-5 py-4 text-[12px] leading-relaxed text-cyan-100/82">
              Interactive sketch will load when this card is mostly in view. Export actions already use the solved drafting model; the live renderer stays deferred offscreen to keep scrolling responsive.
            </div>
          </div>
        {/if}
      </div>
    </div>
    {#if advancedMode && (visualDiagnostics.length || renderDiagnostics.length)}
      <details class="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-[10px] font-mono text-white/75">
        <summary class="cursor-pointer font-semibold text-cyan-100">Detailed Renderer Diagnostics</summary>
        <div class="mt-2 grid grid-cols-1 gap-2 lg:grid-cols-2">
          {#if visualDiagnostics.length}
            <div class="space-y-1">
              {#each visualDiagnostics as diag}
                <div class={`rounded-md border px-2 py-1 text-[10px] font-mono bushing-pop-sub bushing-depth-0 ${
                  diag.severity === 'error'
                    ? 'border-rose-300/60 bg-rose-500/25 text-rose-50'
                    : diag.severity === 'warning'
                      ? 'border-amber-300/65 bg-amber-500/25 text-amber-50'
                      : 'border-cyan-300/60 bg-cyan-500/20 text-cyan-50'
                }`}>
                  {diag.message}
                </div>
              {/each}
            </div>
          {/if}
          {#if renderDiagnostics.length}
            <div class="space-y-1">
              {#each renderDiagnostics.slice(0, 4) as diag}
                <div class={`rounded-md border px-2 py-1 text-[10px] font-mono bushing-pop-sub bushing-depth-0 ${
                  diag.severity === 'error'
                    ? 'border-rose-300/60 bg-rose-500/25 text-rose-50'
                    : diag.severity === 'warning'
                      ? 'border-amber-300/65 bg-amber-500/25 text-amber-50'
                      : 'border-cyan-300/60 bg-cyan-500/20 text-cyan-50'
                }`}>
                  {diag.code}: {diag.message}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </details>
    {/if}
  </div>
</Card>

<style>
  .drafting-shell {
    contain: layout paint;
  }

  .drafting-stage {
    content-visibility: auto;
    contain-intrinsic-size: 760px 760px;
  }

  .drafting-viewport {
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.03),
      0 12px 30px rgba(2, 8, 23, 0.16);
  }
</style>
