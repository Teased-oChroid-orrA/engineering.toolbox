<script>
import { onMount } from 'svelte';

let items = [];

function onDragEnd(event) {
    const { draggedItem, targetItem } = event.detail;
    // Update items only on finalize
    const index = items.indexOf(draggedItem);
    if (index > -1) {
        items.splice(index, 1);
    }
    items.splice(items.indexOf(targetItem), 0, draggedItem);
}

onMount(() => {
    // initialization code here
});
</script>

<template>
    <div class="bushing-right-lane-cards">
        {#each items as item}
            <div class="card" draggable on:dragend={onDragEnd}>{item}</div>
        {/each}
    </div>
</template>