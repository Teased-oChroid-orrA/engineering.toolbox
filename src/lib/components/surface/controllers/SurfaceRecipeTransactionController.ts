import type { Snapshot } from '../../../surface/state/SurfaceStore';
import { pushHistoryUndo, type SurfaceHistoryStacks } from '../../../surface/state/SurfaceHistoryController';

export type RecipeTransaction = {
  id: string;
  startedAt: string;
  before: Snapshot;
  pushedUndo: boolean;
};

function signatureOfSnapshot(s: Snapshot) {
  return JSON.stringify({
    points: s.points,
    edges: s.edges,
    curves: s.curves,
    surfaces: s.surfaces,
    csys: s.csys,
    planes: s.planes,
    activeEdgeIdx: s.activeEdgeIdx
  });
}

function uid() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function beginRecipeTransaction(current: Snapshot): RecipeTransaction {
  return {
    id: uid(),
    startedAt: new Date().toISOString(),
    before: current,
    pushedUndo: false
  };
}

export function finalizeRecipeTransaction(args: {
  tx: RecipeTransaction;
  current: Snapshot;
  stacks: SurfaceHistoryStacks;
  historyLimit?: number;
}) {
  const beforeSig = signatureOfSnapshot(args.tx.before);
  const afterSig = signatureOfSnapshot(args.current);
  const changed = beforeSig !== afterSig;

  if (!changed) {
    return {
      stacks: args.stacks,
      tx: { ...args.tx, pushedUndo: false },
      changed: false
    };
  }

  const next = pushHistoryUndo(args.stacks, args.tx.before, args.historyLimit ?? 100);
  return {
    stacks: next,
    tx: { ...args.tx, pushedUndo: true },
    changed: true
  };
}

export function rollbackRecipeTransaction(tx: RecipeTransaction): Snapshot {
  return tx.before;
}
