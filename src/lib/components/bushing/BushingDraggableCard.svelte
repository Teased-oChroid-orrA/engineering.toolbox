<script lang="ts">
  import { onMount } from 'svelte';

  // Svelte 5 props destructuring with snippet
  let {
    column,
    cardId,
    title = '',
    collapseKey = '',
    dragEnabled = true,
    canMoveUp = false,
    canMoveDown = false,
    onMoveUp = null,
    onMoveDown = null,
    children
  }: {
    column: 'left' | 'right';
    cardId: string;
    title?: string;
    collapseKey?: string;
    dragEnabled?: boolean;
    canMoveUp?: boolean;
    canMoveDown?: boolean;
    onMoveUp?: (() => void) | null;
    onMoveDown?: (() => void) | null;
    children?: import('svelte').Snippet;
  } = $props();

  // Svelte 5 $state rune for reactive local state
  let collapsed = $state(false);

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
      <span>{title}</span>
    </div>
    <div class="flex items-center gap-1">
      {#if dragEnabled}
        <button type="button" class="rounded border border-white/15 px-1 py-0.5 text-[10px] text-white/80 disabled:opacity-35" onclick={() => onMoveUp?.()} disabled={!canMoveUp} aria-label={`Move ${title} up`}>Up</button>
        <button type="button" class="rounded border border-white/15 px-1 py-0.5 text-[10px] text-white/80 disabled:opacity-35" onclick={() => onMoveDown?.()} disabled={!canMoveDown} aria-label={`Move ${title} down`}>Down</button>
      {/if}
      <button class="rounded border border-white/15 px-1.5 py-0.5 text-[10px] text-white/80" onclick={toggleCollapsed}>
        {collapsed ? 'Expand' : 'Collapse'}
      </button>
    </div>
  </div>
  {#if !collapsed}
    {#if children}
      {@render children()}
    {/if}
  {/if}
</div>
