<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui';
  import {
    LEFT_CARD_LABELS,
    RIGHT_CARD_LABELS,
    reorderList,
    type LeftCardId,
    type RightCardId
  } from './BushingCardLayoutController';

  export let leftCardOrder: LeftCardId[];
  export let rightCardOrder: RightCardId[];

  const dispatch = createEventDispatcher<{ reorder: { column: 'left' | 'right'; order: Array<LeftCardId | RightCardId> } }>();

  let dragLeft: LeftCardId | null = null;
  let dragRight: RightCardId | null = null;

  function onDragStartLeft(id: LeftCardId) {
    dragLeft = id;
  }
  function onDragStartRight(id: RightCardId) {
    dragRight = id;
  }
  function onDropLeft(target: LeftCardId) {
    if (!dragLeft) return;
    dispatch('reorder', { column: 'left', order: reorderList(leftCardOrder, dragLeft, target) });
    dragLeft = null;
  }
  function onDropRight(target: RightCardId) {
    if (!dragRight) return;
    dispatch('reorder', { column: 'right', order: reorderList(rightCardOrder, dragRight, target) });
    dragRight = null;
  }
</script>

<Card class="glass-card bushing-pop-card bushing-depth-1">
  <CardHeader class="pb-2 pt-4">
    <CardTitle class="text-[10px] font-bold uppercase text-indigo-300">Card Layout</CardTitle>
  </CardHeader>
  <CardContent class="space-y-3 text-xs">
    <div class="space-y-2">
      <div class="text-[10px] font-semibold uppercase tracking-wide text-white/70">Left Column</div>
      {#each leftCardOrder as id}
        <div
          class="flex items-center justify-between rounded-md border border-white/10 bg-black/25 px-2 py-1.5"
          role="listitem"
          draggable="true"
          on:dragstart={() => onDragStartLeft(id)}
          on:dragover|preventDefault
          on:drop={() => onDropLeft(id)}>
          <span class="text-white/85">{LEFT_CARD_LABELS[id]}</span>
          <span class="text-[10px] text-white/50">Drag</span>
        </div>
      {/each}
    </div>
    <div class="space-y-2">
      <div class="text-[10px] font-semibold uppercase tracking-wide text-white/70">Right Column</div>
      {#each rightCardOrder as id}
        <div
          class="flex items-center justify-between rounded-md border border-white/10 bg-black/25 px-2 py-1.5"
          role="listitem"
          draggable="true"
          on:dragstart={() => onDragStartRight(id)}
          on:dragover|preventDefault
          on:drop={() => onDropRight(id)}>
          <span class="text-white/85">{RIGHT_CARD_LABELS[id]}</span>
          <span class="text-[10px] text-white/50">Drag</span>
        </div>
      {/each}
    </div>
  </CardContent>
</Card>
