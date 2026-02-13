/**
 * Utility functions for native HTML5 drag-and-drop
 */

export interface DragItem {
  id: string;
  [key: string]: any;
}

/**
 * Reorder items by moving dragged item to target position
 */
export function reorderItems<T extends DragItem>(
  items: T[],
  draggedId: string,
  targetId: string
): T[] {
  const draggedIdx = items.findIndex((i) => i.id === draggedId);
  const targetIdx = items.findIndex((i) => i.id === targetId);

  if (draggedIdx === -1 || targetIdx === -1 || draggedIdx === targetIdx) {
    return items;
  }

  const newItems = [...items];
  const [removed] = newItems.splice(draggedIdx, 1);
  newItems.splice(targetIdx, 0, removed);
  return newItems;
}

/**
 * Move item by offset (-1 for up, +1 for down)
 */
export function moveItemByOffset<T extends DragItem>(
  items: T[],
  itemId: string,
  offset: number
): T[] {
  const currentIdx = items.findIndex((i) => i.id === itemId);
  if (currentIdx === -1) return items;

  const newIdx = currentIdx + offset;
  if (newIdx < 0 || newIdx >= items.length) return items;

  const newItems = [...items];
  const [removed] = newItems.splice(currentIdx, 1);
  newItems.splice(newIdx, 0, removed);
  return newItems;
}

/**
 * Keyboard navigation: get next focusable item
 */
export function getNextFocusableId<T extends DragItem>(
  items: T[],
  currentId: string | null,
  direction: 'up' | 'down'
): string | null {
  if (items.length === 0) return null;
  if (!currentId) return items[0].id;

  const currentIdx = items.findIndex((i) => i.id === currentId);
  if (currentIdx === -1) return items[0].id;

  if (direction === 'up') {
    return currentIdx > 0 ? items[currentIdx - 1].id : null;
  } else {
    return currentIdx < items.length - 1 ? items[currentIdx + 1].id : null;
  }
}
