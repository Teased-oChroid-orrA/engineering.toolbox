/**
 * Layout history management hook
 */
import { DragDropHistory } from './dragHistory';
import type { LeftCardId, RightCardId } from './BushingCardLayoutController';

export type LayoutState = { left: LeftCardId[]; right: RightCardId[] };

export function createLayoutHistory(initialLeft: LeftCardId[], initialRight: RightCardId[]) {
  const history = new DragDropHistory<LayoutState>(50);
  let canUndo = $state(false);
  let canRedo = $state(false);
  
  // Initialize with current state
  if (typeof window !== 'undefined' && history.size() === 0) {
    history.push({ left: [...initialLeft], right: [...initialRight] });
    updateFlags();
  }
  
  function updateFlags() {
    canUndo = history.canUndo();
    canRedo = history.canRedo();
  }
  
  function push(left: LeftCardId[], right: RightCardId[]) {
    history.push({ left: [...left], right: [...right] });
    updateFlags();
  }
  
  function undo(): LayoutState | null {
    const prev = history.undo();
    if (prev) updateFlags();
    return prev;
  }
  
  function redo(): LayoutState | null {
    const next = history.redo();
    if (next) updateFlags();
    return next;
  }
  
  return {
    get canUndo() { return canUndo; },
    get canRedo() { return canRedo; },
    push,
    undo,
    redo
  };
}
