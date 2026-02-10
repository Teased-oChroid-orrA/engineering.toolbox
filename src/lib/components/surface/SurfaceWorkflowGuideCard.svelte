<script lang="ts">
  export let pointsCount = 0;
  export let datumSliceBusy = false;
</script>

<div class="rounded-xl border border-cyan-300/15 bg-cyan-400/5 px-3 py-2 text-[11px] text-cyan-100/85 space-y-1">
  {#if pointsCount === 0}
    <div class="font-semibold">Load a CSV/STEP file to begin.</div>
    <div class="text-cyan-100/70">Use File → Load, then create a datum plane and run slicing.</div>
  {:else if pointsCount < 3}
    <div class="font-semibold">Need more points for robust analysis.</div>
    <div class="text-cyan-100/70">Add points/edges or run the sampler before fitting and slicing.</div>
  {:else if datumSliceBusy}
    <div class="font-semibold">Computing datum slices...</div>
    <div class="text-cyan-100/70">Review the recommendation rail after completion for best-next adjustments.</div>
  {:else}
    <div class="font-semibold">Recommended workflow:</div>
    <div class="text-cyan-100/70">Offset intersection → datum slicing → review rail confidence → export combined CSV + JSON.</div>
  {/if}
</div>
