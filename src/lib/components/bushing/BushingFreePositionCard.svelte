<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { CardPosition } from './BushingCardPositionController';
  import { snapToGrid } from './BushingCardPositionController';
  
  export let cardId: string;
  export let position: CardPosition;
  export let isDraggable: boolean = true;
  export let isOverlapping: boolean = false;
  
  const dispatch = createEventDispatcher<{
    positionChange: { cardId: string; position: CardPosition };
    dragStart: { cardId: string };
    dragEnd: { cardId: string };
  }>();
  
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let offsetX = 0;
  let offsetY = 0;
  
  // Current position during drag (before snap)
  let currentX = position.x;
  let currentY = position.y;
  
  // Update current position when prop changes
  $: {
    if (!isDragging) {
      currentX = position.x;
      currentY = position.y;
    }
  }
  
  function handleDragStart(e: DragEvent) {
    if (!isDraggable) return;
    
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    offsetX = position.x;
    offsetY = position.y;
    
    // Set drag image to be transparent (we'll show our own visual feedback)
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      const img = new Image();
      img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      e.dataTransfer.setDragImage(img, 0, 0);
    }
    
    dispatch('dragStart', { cardId });
  }
  
  function handleDrag(e: DragEvent) {
    if (!isDragging) return;
    
    // DragEvent fires with clientX=0, clientY=0 at the end, ignore those
    if (e.clientX === 0 && e.clientY === 0) return;
    
    // Calculate new position
    const deltaX = e.clientX - dragStartX;
    const deltaY = e.clientY - dragStartY;
    
    currentX = offsetX + deltaX;
    currentY = offsetY + deltaY;
  }
  
  function handleDragEnd(e: DragEvent) {
    if (!isDragging) return;
    
    isDragging = false;
    
    // Apply grid snapping to final position
    const snappedX = snapToGrid(currentX);
    const snappedY = snapToGrid(currentY);
    
    // Constrain to reasonable bounds (prevent negative positions)
    const finalX = Math.max(0, snappedX);
    const finalY = Math.max(0, snappedY);
    
    // Dispatch position change
    dispatch('positionChange', {
      cardId,
      position: {
        x: finalX,
        y: finalY,
        width: position.width,
        height: position.height
      }
    });
    
    dispatch('dragEnd', { cardId });
  }
  
  // Prevent default dragover behavior to allow drop
  function handleDragOver(e: DragEvent) {
    e.preventDefault();
  }
</script>

<div
  class="bushing-free-card absolute transition-shadow"
  class:dragging={isDragging}
  class:overlapping={isOverlapping}
  style="left: {isDragging ? currentX : position.x}px; top: {isDragging ? currentY : position.y}px; width: {position.width}px; z-index: {isDragging ? 1000 : 1};"
  data-card-id={cardId}
  draggable={isDraggable}
  on:dragstart={handleDragStart}
  on:drag={handleDrag}
  on:dragend={handleDragEnd}
  on:dragover={handleDragOver}
  role="article"
  aria-label="Draggable card {cardId}">
  
  <!-- Drag handle -->
  {#if isDraggable}
    <div class="drag-handle" title="Drag to reposition">
      <span class="drag-icon">⋮⋮</span>
      <span class="drag-text">Drag to reposition</span>
    </div>
  {/if}
  
  <!-- Card content -->
  <div class="card-content">
    <slot />
  </div>
</div>

<style>
  .bushing-free-card {
    position: absolute;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    background: transparent;
    cursor: default;
  }
  
  .bushing-free-card.dragging {
    opacity: 0.7;
    cursor: grabbing !important;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    z-index: 1000;
  }
  
  .bushing-free-card.overlapping {
    outline: 2px solid #ef4444;
    outline-offset: 2px;
  }
  
  .drag-handle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.75rem;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1));
    border-radius: 0.5rem 0.5rem 0 0;
    cursor: grab;
    user-select: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .bushing-free-card.dragging .drag-handle {
    cursor: grabbing;
  }
  
  .drag-icon {
    font-size: 1rem;
    color: rgba(139, 92, 246, 0.7);
    font-weight: bold;
  }
  
  .drag-text {
    font-size: 0.75rem;
    color: rgba(139, 92, 246, 0.9);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .card-content {
    /* Card content should not interfere with drag */
    pointer-events: auto;
  }
  
  /* Ensure drag handle is always on top */
  .drag-handle {
    position: relative;
    z-index: 10;
  }
</style>
