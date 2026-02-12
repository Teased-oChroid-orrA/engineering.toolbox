<script lang="ts">
  import { onMount } from 'svelte';

  export let column: 'left' | 'right';
  export let cardId: string;
  export let title = '';
  export let collapseKey = '';
  export let dragEnabled = true;
  export let canMoveUp = false;
  export let canMoveDown = false;
  export let onMoveUp: (() => void) | null = null;
  export let onMoveDown: (() => void) | null = null;

  let collapsed = false;

  function storageKey(): string {
    return collapseKey || `scd.bushing.collapse.${column}.${cardId}.v1`;
  }

  function toggleCollapsed() {
    collapsed = !collapsed;
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey(), collapsed ? '1' : '0');
    }
  }

  onMount(() => {
    if (typeof window === 'undefined') return;
    collapsed = localStorage.getItem(storageKey()) === '1';
  });
</script>

<div class="rounded-md" data-dnd-card={cardId} data-dnd-lane={column} role="listitem" data-drag-enabled={dragEnabled ? '1' : '0'}>
  <div class="mb-1 flex items-center justify-between rounded-md border border-white/10 bg-black/20 px-2 py-1 text-[10px] text-white/70">
    <div class="flex items-center gap-2">
      <span class="rounded border border-white/15 px-1.5 py-0.5 text-[10px] text-white/70 select-none">Drag</span>
      <span>{title}</span>
    </div>
    <div class="flex items-center gap-1">
      <button type="button" class="rounded border border-white/15 px-1 py-0.5 text-[10px] text-white/80 disabled:opacity-35" on:click={() => onMoveUp?.()} disabled={!canMoveUp} aria-label={`Move ${title} up`}>Up</button>
      <button type="button" class="rounded border border-white/15 px-1 py-0.5 text-[10px] text-white/80 disabled:opacity-35" on:click={() => onMoveDown?.()} disabled={!canMoveDown} aria-label={`Move ${title} down`}>Down</button>
      <button class="rounded border border-white/15 px-1.5 py-0.5 text-[10px] text-white/80" on:click={toggleCollapsed}>
        {collapsed ? 'Expand' : 'Collapse'}
      </button>
    </div>
  </div>
  {#if !collapsed}
    <slot />
  {/if}
</div>
