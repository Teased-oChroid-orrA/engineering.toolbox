<script>
import { onMount } from 'svelte';

let items = [];

function finalize() {
    // Logic to finalize items
}

let isDragging = false;

function consider(item) {
    // Logic to consider the item.
    // Do not update items here to avoid disappearing issues.
}

function dragStart(event, item) {
    isDragging = true;
    event.dataTransfer.setData('text/plain', item.id);
}

function dragEnd() {
    isDragging = false;
    finalize(); // Update items only on finalize.
}

onMount(() => {
    // Load initial items
});
</script>

<style>
/* Add styles for drag-and-drop functionality */
</style>

<div>
    {#each items as item}
        <div
            on:dragstart={event => dragStart(event, item)}
            on:dragend={dragEnd}
            draggable="true"
        >
            {item.name}
        </div>
    {/each}
</div>