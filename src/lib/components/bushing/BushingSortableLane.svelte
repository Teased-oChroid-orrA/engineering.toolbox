<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { dndzone, type DndEvent } from 'svelte-dnd-action';

  export let items: Array<{ id: string }> = [];
  export let laneType = 'bushing-lane';
  export let enabled = true;
  export let dropFromOthersDisabled = false;
  export let flipDurationMs = 140;
  export let listClass = '';

  const dispatch = createEventDispatcher<{
    consider: { items: Array<{ id: string }> };
    finalize: { items: Array<{ id: string }> };
  }>();

  function onConsider(ev: CustomEvent<DndEvent<{ id: string }>>) {
    items = ev.detail.items; // FIX: UPDATE LOCAL STATE
    dispatch('consider', { items: ev.detail.items });
  }

  function onFinalize(ev: CustomEvent<DndEvent<{ id: string }>>) {
    items = ev.detail.items; // FIX: UPDATE LOCAL STATE
    dispatch('finalize', { items: ev.detail.items });
  }
</script>

<div
  class={listClass}
  use:dndzone={{
    items,
    type: laneType,
    flipDurationMs,
    dropFromOthersDisabled,
    dragDisabled: !enabled
  }}
  on:consider={onConsider}
  on:finalize={onFinalize}>
  {#each items as item (item.id)}
    <div data-bushing-sortable-item={item.id}>
      <slot {item} />
    </div>
  {/each}
</div>