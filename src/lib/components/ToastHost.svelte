<script lang="ts">
  import { toasts } from '$lib/ui/toast';
  import { fly, fade } from 'svelte/transition';
  import type { ToastItem } from '$lib/ui/toast';

  function styles(kind: ToastItem['kind']) {
    switch (kind) {
      case 'success':
        return 'border border-success-300-900/40 bg-success-50-950/20';
      case 'warning':
        return 'border border-warning-300-900/40 bg-warning-50-950/20';
      case 'error':
        return 'border border-error-300-900/40 bg-error-50-950/20';
      default:
        return 'border border-surface-200-800 bg-surface-50-950';
    }
  }
</script>

<div class="fixed right-4 bottom-4 z-[70] w-[min(420px,calc(100%-2rem))] space-y-2 pointer-events-none">
  {#each $toasts as t (t.id)}
    <div
      class={`pointer-events-auto card rounded-2xl shadow-lg p-3 ${styles(t.kind)}`}
      in:fly={{ x: 12, duration: 180 }}
      out:fade={{ duration: 140 }}
    >
      <div class="text-sm font-semibold">{t.title}</div>
      {#if t.detail}
        <div class="mt-1 text-xs sc-muted">{t.detail}</div>
      {/if}
    </div>
  {/each}
</div>
