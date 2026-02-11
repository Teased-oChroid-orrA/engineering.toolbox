<script lang="ts">
  import { Badge, Card } from '$lib/components/ui';
  import { cn } from '$lib/utils';
  import BushingDrafting from '$lib/drafting/bushing/BushingDrafting.svelte';
  import type { BushingRenderMode } from '$lib/drafting/bushing/bushingSceneModel';
  import type { BabylonRenderDiagnostic } from '$lib/drafting/bushing/BushingBabylonRuntime';

  export let draftingView: any;
  export let useLegacyRenderer = false;
  export let renderMode: BushingRenderMode = 'section';
  export let traceEnabled = false;
  export let cacheHits = 0;
  export let cacheMisses = 0;
  export let isInfinitePlate = false;
  export let babylonInitNotice: string | null = null;
  export let visualDiagnostics: Array<{ severity: 'error' | 'warning' | 'info'; message: string }> = [];
  export let babylonDiagnostics: BabylonRenderDiagnostic[] = [];
  export let onExportSvg: () => void = () => {};
  export let onExportPdf: () => void = () => {};
  export let onToggleRendererMode: () => void = () => {};
  export let onToggleTraceMode: () => void = () => {};
  export let onBabylonDiagnostics: (diag: BabylonRenderDiagnostic[]) => void = () => {};
  export let onBabylonInitFailure: (reason: string) => void = () => {};
</script>

<Card class="min-h-[620px] flex flex-col overflow-hidden border-teal-500/20 bg-teal-500/10 backdrop-blur-sm relative group p-0 bushing-pop-card bushing-no-tilt bushing-depth-2">
  <div class="border-b border-teal-500/10 bg-teal-900/20 px-4 py-3 z-10 backdrop-blur-sm shrink-0 flex justify-between items-center">
    <div class="relative z-20 flex items-center gap-2">
      <span class="font-medium text-teal-100/90 text-sm">5. Drafting / Export</span>
      {#if isInfinitePlate}
        <Badge variant="outline" class="text-[9px] bg-indigo-500/20 text-indigo-300 border-indigo-400/30 animate-pulse">INFINITE PLATE</Badge>
      {/if}
    </div>
    <div class="flex items-center gap-2">
      <button class="rounded-md border border-teal-200/10 bg-teal-500/5 px-2 py-1 text-[10px] font-mono text-teal-100/80 hover:bg-teal-500/10" on:click={onExportSvg}>Export SVG</button>
      <button class="rounded-md border border-teal-200/10 bg-teal-500/5 px-2 py-1 text-[10px] font-mono text-teal-100/80 hover:bg-teal-500/10" on:click={onExportPdf}>Export PDF</button>
      <button class="rounded-md border border-teal-200/10 bg-teal-500/5 px-2 py-1 text-[10px] font-mono text-teal-100/80 hover:bg-teal-500/10" on:click={onToggleRendererMode}>
        {useLegacyRenderer ? 'Draft Renderer: Legacy' : 'Draft Renderer: Section'}
      </button>
      <Badge variant="outline" class="text-[10px] border-teal-500/30 text-teal-200">Draft Engine: Babylon</Badge>
      <button
        class={cn(
          'rounded-md border px-2 py-1 text-[10px] font-mono hover:bg-teal-500/10',
          traceEnabled
            ? 'border-cyan-300/45 bg-cyan-500/15 text-cyan-100'
            : 'border-teal-200/10 bg-teal-500/5 text-teal-100/80'
        )}
        on:click={onToggleTraceMode}>
        {traceEnabled ? 'Trace: On' : 'Trace: Off'}
      </button>
      {#if traceEnabled}
        <Badge variant="outline" class="text-[10px] border-cyan-400/40 text-cyan-200">
          Cache H/M: {cacheHits}/{cacheMisses}
        </Badge>
      {/if}
      <Badge variant="outline" class="text-[10px] border-teal-500/30 text-teal-200">SECTION A-A</Badge>
    </div>
  </div>
  <div class="flex h-full min-h-0 w-full flex-col gap-2 p-3">
    <div class="relative mx-auto aspect-square w-full max-w-[1100px] min-h-[620px] min-w-[620px] rounded-xl border border-teal-400/20 bg-[#031624]/55 backdrop-blur-sm overflow-auto [resize:both]">
      <div class="absolute inset-0 opacity-[0.06] pointer-events-none" style="background-image: radial-gradient(#2dd4bf 1px, transparent 1px); background-size: 18px 18px;"></div>
      <div class="h-full w-full min-h-[620px] min-w-[620px]">
        <BushingDrafting
          inputs={draftingView}
          legacyMode={useLegacyRenderer}
          {renderMode}
          onBabylonDiagnostics={(diag) => onBabylonDiagnostics(diag)}
          onBabylonInitFailure={onBabylonInitFailure}
        />
      </div>
      <div class="absolute right-2 bottom-2 text-[10px] font-mono text-cyan-200/65 pointer-events-none">
        Drag corner to resize
      </div>
    </div>
    {#if babylonInitNotice}
      <div class="rounded-md border border-rose-300/45 bg-rose-500/15 px-2 py-1 text-[10px] font-mono text-rose-100">
        Babylon init issue: {babylonInitNotice}
      </div>
    {/if}
    <div class="grid grid-cols-1 gap-2 lg:grid-cols-2">
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
      {#if babylonDiagnostics.length}
        <div class="space-y-1">
          {#each babylonDiagnostics.slice(0, 4) as diag}
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
  </div>
</Card>
