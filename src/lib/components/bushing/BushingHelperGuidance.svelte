<script lang="ts">
  import type { BushingInputs, BushingOutput } from '$lib/core/bushing';

  export let form: BushingInputs;
  export let results: BushingOutput;

  $: guidance = (() => {
    if (results.warningCodes?.length) {
      return {
        tone: 'warning',
        title: 'Attention Required',
        lines: [
          ...results.warningCodes.map((w) => `${w.code}: ${w.message}`).slice(0, 4),
          `Governing check: ${results.governing.name} (margin ${Number(results.governing.margin).toFixed(3)})`
        ]
      };
    }
    if (form.idType === 'countersink' || form.bushingType === 'countersink') {
      return {
        tone: 'info',
        title: 'Countersink Active',
        lines: ['Check wall thickness and neck margin after changing countersink depth/angle.', 'Use Results details to confirm the governing check.']
      };
    }
    return {
      tone: 'ok',
      title: 'Core Flow',
      lines: ['Set Setup and Geometry first, then choose profile, then review results.', 'Use Drafting/Export once governing margin is positive.']
    };
  })();
</script>

<div
  id="bushing-attention-card"
  class={`glass-card bushing-pop-card bushing-depth-1 rounded-xl border p-3 text-xs ${guidance.tone === 'warning' ? 'border-amber-400/30 bg-amber-500/10' : 'border-teal-400/25 bg-teal-500/10'}`}>
  <div class="flex items-center justify-between gap-2">
    <div class="font-semibold uppercase tracking-wide text-[10px]">{guidance.title}</div>
    <div class="text-[10px] text-white/60">Inline Guidance</div>
  </div>
  <div class="mt-2 space-y-1.5">
    {#each guidance.lines as line}
      <div class="rounded-md border border-white/10 bg-black/20 px-2 py-1.5 bushing-pop-sub bushing-depth-0 text-white/80">{line}</div>
    {/each}
  </div>
</div>
