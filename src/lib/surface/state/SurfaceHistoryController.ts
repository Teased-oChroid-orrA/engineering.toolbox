import type { Snapshot } from './SurfaceStore';

export type SurfaceHistoryStacks = {
  undoStack: Snapshot[];
  redoStack: Snapshot[];
};

export type SurfaceHistoryTransition = {
  stacks: SurfaceHistoryStacks;
  snapshot: Snapshot | null;
};

export function canHistoryUndo(stacks: SurfaceHistoryStacks) {
  return stacks.undoStack.length > 0;
}

export function canHistoryRedo(stacks: SurfaceHistoryStacks) {
  return stacks.redoStack.length > 0;
}

export function pushHistoryUndo(
  stacks: SurfaceHistoryStacks,
  current: Snapshot,
  limit = 100
): SurfaceHistoryStacks {
  const undoStack = [...stacks.undoStack, current];
  const trimmed = undoStack.length > limit ? undoStack.slice(undoStack.length - limit) : undoStack;
  return {
    undoStack: trimmed,
    redoStack: []
  };
}

export function popHistoryUndo(
  stacks: SurfaceHistoryStacks,
  current: Snapshot
): SurfaceHistoryTransition {
  if (stacks.undoStack.length === 0) {
    return { stacks, snapshot: null };
  }
  const snapshot = stacks.undoStack[stacks.undoStack.length - 1];
  return {
    stacks: {
      undoStack: stacks.undoStack.slice(0, -1),
      redoStack: [...stacks.redoStack, current]
    },
    snapshot
  };
}

export function popHistoryRedo(
  stacks: SurfaceHistoryStacks,
  current: Snapshot
): SurfaceHistoryTransition {
  if (stacks.redoStack.length === 0) {
    return { stacks, snapshot: null };
  }
  const snapshot = stacks.redoStack[stacks.redoStack.length - 1];
  return {
    stacks: {
      undoStack: [...stacks.undoStack, current],
      redoStack: stacks.redoStack.slice(0, -1)
    },
    snapshot
  };
}

