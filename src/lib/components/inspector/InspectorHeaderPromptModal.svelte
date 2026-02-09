<script lang="ts">
  import { fade, scale } from 'svelte/transition';

  let {
    open = false,
    uiAnimDur = 160,
    headerHeuristicReason = '',
    onCancel,
    onChoose
  } = $props<{
    open: boolean;
    uiAnimDur: number;
    headerHeuristicReason: string;
    onCancel: () => void;
    onChoose: (value: boolean) => void;
  }>();
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-6 relative" transition:fade={{ duration: uiAnimDur }}>
    <button type="button" class="absolute inset-0 modal-backdrop p-0 m-0 border-0" onclick={onCancel} aria-label="Close headers prompt"></button>
    <div class="relative z-10 glass-panel w-full max-w-xl rounded-2xl border border-white/10 p-5" transition:scale={{ duration: uiAnimDur, start: 0.96 }}>
      <div class="text-sm font-semibold text-white">Headers ambiguous</div>
      {#if headerHeuristicReason}
        <div class="mt-2 text-[11px] text-white/45 font-mono break-words">{headerHeuristicReason}</div>
      {/if}
      <div class="mt-4 flex flex-wrap gap-2 justify-end">
        <button class="btn btn-sm variant-soft" onclick={onCancel}>Cancel</button>
        <button class="btn btn-sm variant-soft" onclick={() => onChoose(false)}>No headers</button>
        <button class="btn btn-sm variant-filled" onclick={() => onChoose(true)}>Headers present</button>
      </div>
    </div>
  </div>
{/if}
