<script lang="ts">
  export let performanceMode = false;
  export let workerAvailable = false;
  export let workerTimeoutCount = 0;
  export let hoverSource: 'idle' | 'worker' | 'fallback' = 'idle';
  export let frameMsAvg = 0;
  export let hitTestMsAvg = 0;
  export let pointCount = 0;
  export let edgeCount = 0;
  export let renderedPointCount = 0;
  export let renderedEdgeCount = 0;
  export let selectedPoints = 0;
  export let selectedLines = 0;
  export let isolatedPoints = 0;
  export let isolatedLines = 0;
  export let autoDegradeLevel = 0;
</script>

<div class="pointer-events-none absolute top-4 right-4 rounded-xl border border-white/10 bg-slate-950/78 backdrop-blur-sm px-3 py-2 text-[11px] text-white/80 font-mono leading-5">
  perf {performanceMode ? 'on' : 'off'} • worker {workerAvailable ? 'ready' : 'fallback'}
  {#if workerTimeoutCount > 0}
    <span class="text-amber-300"> • timeout {workerTimeoutCount}</span>
  {/if}
  <br />
  frame {frameMsAvg.toFixed(1)}ms • hit {hitTestMsAvg.toFixed(1)}ms • src {hoverSource}
  <br />
  draw P{renderedPointCount}/{pointCount} • E{renderedEdgeCount}/{edgeCount}
  <br />
  sel P{selectedPoints} • L{selectedLines} • iso P{isolatedPoints} • L{isolatedLines}
  {#if autoDegradeLevel > 0}
    <br />
    <span class="text-amber-300">auto-degrade L{autoDegradeLevel}</span>
  {/if}
</div>
