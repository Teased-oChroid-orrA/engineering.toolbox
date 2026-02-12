<script lang="ts">
  /**
   * BushingSortableLane - A wrapper component for svelte-dnd-action that provides drag-and-drop functionality.
   * 
   * IMPORTANT: Consumers should only update their state in response to the 'finalize' event, NOT the 'consider' event.
   * - The 'consider' event is for visual preview only and fires during drag operations
   * - The 'finalize' event fires when the drag operation completes
   * - Updating state in 'consider' will cause DOM re-renders that break the drag operation
   * 
   * Example usage:
   * ```svelte
   * <BushingSortableLane
   *   {items}
   *   on:finalize={(ev) => items = ev.detail.items}
   *   let:item>
   *   <YourCard {item} />
   * </BushingSortableLane>
   * ```
   */
  import { dndzone, type DndEvent } from 'svelte-dnd-action';
  import { createEventDispatcher } from 'svelte';

  export let items: Array<{ id: string }> = [];
  export let listClass = '';
  export let laneType = 'default';
  export let enabled = true;
  
  const dispatch = createEventDispatcher<{
    consider: { items: Array<{ id: string }> };
    finalize: { items: Array<{ id: string }> };
  }>();
  
  const flipDurationMs = 200;
  
  // Internal state for drag operations
  let workingItems = items;
  let isDragging = false;
  
  // Sync working items when the prop changes, but NOT during active drag
  $: if (!isDragging) {
    workingItems = items;
  }
  
  function handleConsider(ev: CustomEvent<DndEvent<{ id: string }>>) {
    // Mark as dragging to prevent external updates
    isDragging = true;
    // Update internal state for smooth drag preview
    workingItems = ev.detail.items;
    // Dispatch event to parent (parent should NOT update its state yet)
    dispatch('consider', { items: ev.detail.items });
  }
  
  function handleFinalize(ev: CustomEvent<DndEvent<{ id: string }>>) {
    // Update internal state
    workingItems = ev.detail.items;
    // Defer dispatch to allow FLIP animation to complete
    // Add 50ms buffer to ensure animation finishes
    setTimeout(() => {
      isDragging = false;
      dispatch('finalize', { items: ev.detail.items });
    }, flipDurationMs + 50);
  }
</script>

<div
  class={listClass}
  use:dndzone={{
    items: workingItems,
    flipDurationMs,
    type: laneType,
    dragDisabled: !enabled
  }}
  on:consider={handleConsider}
  on:finalize={handleFinalize}
>
  {#each workingItems as item (item.id)}
    <slot {item} />
  {/each}
</div>
