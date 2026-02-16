<script lang="ts">
  import type { BushingInputs, BushingOutput } from '$lib/core/bushing';
  import { makeFriendlyMessage, getQuickFix } from '$lib/core/bushing/errorMessageUtils';

  // Svelte 5 props destructuring
  let { form, results }: { form: BushingInputs; results: BushingOutput } = $props();

  // Svelte 5 $derived rune for computed state
  let guidance = $derived.by(() => {
    if (results.warningCodes?.length) {
      // Get the most critical warning and make it user-friendly
      const primaryWarning = results.warningCodes[0];
      const friendly = makeFriendlyMessage(primaryWarning.code, {
        units: form.units === 'imperial' ? 'in' : 'mm'
      });
      
      const lines: string[] = [
        `⚠️ ${friendly.title}`,
        friendly.description,
        `💡 ${friendly.suggestion}`
      ];
      
      // Add governing check info
      const marginStr = Number(results.governing.margin).toFixed(3);
      lines.push(`Governing check: ${results.governing.name} (margin ${marginStr})`);
      
      // Add quick fix if available
      const quickFix = getQuickFix(primaryWarning.code);
      if (quickFix) {
        lines.push(`🔧 Quick fix: ${quickFix}`);
      }
      
      return {
        tone: 'warning',
        title: 'Attention Required',
        lines
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
  });
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
