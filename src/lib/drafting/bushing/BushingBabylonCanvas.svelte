<script lang="ts">
  import { onMount } from 'svelte';
  import type { CanonicalDraftScene } from './BushingDraftRenderer';
  import {
    mountBushingBabylonCanvas,
    type BabylonRenderDiagnostic,
    type BabylonRenderState
  } from './BushingBabylonRuntime';

  export let scene: CanonicalDraftScene;
  export let onDiagnostics: (diag: BabylonRenderDiagnostic[]) => void = () => {};
  export let onInitFailure: (reason: string) => void = () => {};

  let canvasEl: HTMLCanvasElement | null = null;
  let runtime: BabylonRenderState | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let statusLabel = 'Babylon renderer active';
  let statusDetail = '';
  let solidMode = false;
  let rotateDragEnabled = false;

  onMount(() => {
    let mounted = true;
    async function init() {
      if (!canvasEl) return;
      try {
        runtime = await mountBushingBabylonCanvas(canvasEl, scene, {
          onDiagnostics: (diag) => onDiagnostics(diag)
        });
        if (!mounted) runtime?.dispose();
        resizeObserver = new ResizeObserver(() => runtime?.updateViewport());
        resizeObserver.observe(canvasEl);
      } catch (err) {
        statusLabel = 'Babylon init failed';
        const reason = err instanceof Error ? err.message : 'Unknown Babylon initialization error.';
        statusDetail = reason;
        onInitFailure(reason);
      }
    }
    void init();
    return () => {
      mounted = false;
      resizeObserver?.disconnect();
      resizeObserver = null;
      runtime?.dispose();
      runtime = null;
    };
  });

  $: if (runtime) {
    runtime.updateScene(scene);
  }
</script>

<div class="relative h-full w-full overflow-hidden rounded-xl">
  <canvas bind:this={canvasEl} class="h-full w-full rounded-xl"></canvas>
  <div class="absolute left-3 top-3 rounded-md border border-cyan-300/30 bg-cyan-500/15 px-2 py-1 text-[10px] font-mono text-cyan-100">
    {statusLabel}
  </div>
  <div class="absolute left-3 top-10 rounded-md border border-cyan-300/20 bg-cyan-500/10 px-2 py-1 text-[10px] font-mono text-cyan-100/85">
    Drag pan • Rotate: Shift+drag or toggle button (3D) • Scroll/+/- zoom • Click center/realign
  </div>
  {#if statusDetail}
    <div class="absolute left-3 top-10 rounded-md border border-rose-300/35 bg-rose-500/15 px-2 py-1 text-[10px] font-mono text-rose-100 max-w-[60%] truncate">
      {statusDetail}
    </div>
  {/if}
  <div class="absolute right-3 top-3 flex gap-1">
    <button
      class="rounded-md border border-cyan-300/35 bg-cyan-500/15 px-2 py-1 text-[10px] font-mono text-cyan-100 hover:bg-cyan-500/25"
      on:click={() => runtime?.zoomOut()}>
      -
    </button>
    <button
      class="rounded-md border border-cyan-300/35 bg-cyan-500/15 px-2 py-1 text-[10px] font-mono text-cyan-100 hover:bg-cyan-500/25"
      on:click={() => runtime?.zoomIn()}>
      +
    </button>
    <button
      class="rounded-md border border-cyan-300/35 bg-cyan-500/15 px-2 py-1 text-[10px] font-mono text-cyan-100 hover:bg-cyan-500/25"
      on:click={() => runtime?.resetView()}>
      Reset
    </button>
    <button
      class="rounded-md border border-cyan-300/35 bg-cyan-500/15 px-2 py-1 text-[10px] font-mono text-cyan-100 hover:bg-cyan-500/25"
      on:click={() => {
        solidMode = !solidMode;
        if (!solidMode) rotateDragEnabled = false;
        runtime?.setSolidMode(solidMode);
        runtime?.setRotateDragEnabled(rotateDragEnabled);
        runtime?.resetView();
      }}>
      {solidMode ? '3D: On' : '3D: Off'}
    </button>
    <button
      class="rounded-md border border-cyan-300/35 bg-cyan-500/15 px-2 py-1 text-[10px] font-mono text-cyan-100 hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={!solidMode}
      on:click={() => {
        rotateDragEnabled = !rotateDragEnabled;
        runtime?.setRotateDragEnabled(rotateDragEnabled);
      }}>
      {rotateDragEnabled ? 'Rotate Drag: On' : 'Rotate Drag: Off'}
    </button>
  </div>
</div>
