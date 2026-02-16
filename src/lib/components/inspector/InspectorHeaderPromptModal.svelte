<script lang="ts">
  import { fade, scale } from 'svelte/transition';

  let {
    open = false,
    uiAnimDur = 160,
    headerHeuristicReason = '',
    headerConfidence = null,
    autoDecision = null,
    onCancel,
    onChoose
  } = $props<{
    open: boolean;
    uiAnimDur: number;
    headerHeuristicReason: string;
    headerConfidence: number | null;
    autoDecision: boolean | null;
    onCancel: () => void;
    onChoose: (value: boolean) => void;
  }>();
  
  // Calculate confidence percentage and color
  const confidencePercent = $derived(headerConfidence ? Math.round(headerConfidence * 100) : null);
  const confidenceColor = $derived.by(() => {
    if (!confidencePercent) return 'text-gray-400';
    if (confidencePercent >= 75) return 'text-green-400';
    if (confidencePercent >= 50) return 'text-yellow-400';
    return 'text-red-400';
  });
  const confidenceLabel = $derived.by(() => {
    if (!confidencePercent) return 'Unknown';
    if (confidencePercent >= 75) return 'High';
    if (confidencePercent >= 50) return 'Medium';
    return 'Low';
  });
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-6 relative" role="dialog" aria-modal="true" aria-label="Headers prompt" tabindex="-1" transition:fade={{ duration: uiAnimDur }}>
    <button type="button" class="absolute inset-0 modal-backdrop p-0 m-0 border-0" onclick={onCancel} aria-label="Close headers prompt"></button>
    <div class="relative z-10 glass-panel w-full max-w-xl rounded-2xl border border-white/10 p-5 inspector-pop-layer" transition:scale={{ duration: uiAnimDur, start: 0.96 }}>
      <div class="text-lg font-semibold text-white mb-3">CSV Header Detection</div>
      <div class="text-sm text-white/70 mb-4">
        Please confirm whether this CSV file has a header row.
      </div>
      
      {#if autoDecision !== null && headerConfidence !== null}
        <div class="mb-4 p-3 bg-slate-700/50 rounded-lg border border-white/10">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs text-white/60">Auto-Detection Result:</span>
            <span class={`text-xs font-semibold ${confidenceColor}`}>
              {confidenceLabel} Confidence ({confidencePercent}%)
            </span>
          </div>
          <div class="text-sm text-white">
            Detected: <span class="font-semibold">{autoDecision ? 'Headers Present' : 'No Headers'}</span>
          </div>
          {#if headerHeuristicReason}
            <div class="mt-2 text-[10px] text-white/45 font-mono break-words border-t border-white/10 pt-2">
              {headerHeuristicReason}
            </div>
          {/if}
        </div>
      {/if}
      
      <div class="text-xs text-white/50 mb-3">
        💡 Tip: Headers are typically descriptive column names in the first row.
      </div>
      
      <div class="mt-4 flex flex-wrap gap-2 justify-end">
        <button class="btn btn-sm variant-soft" onclick={onCancel}>Cancel</button>
        <button class="btn btn-sm variant-soft" onclick={() => onChoose(false)}>No Headers</button>
        <button class="btn btn-sm variant-filled" onclick={() => onChoose(true)}>Has Headers</button>
      </div>
    </div>
  </div>
{/if}
