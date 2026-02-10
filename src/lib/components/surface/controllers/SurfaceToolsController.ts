type SelectionMode = 'none' | 'box' | 'lasso';
type CreateMode = 'idle' | 'point' | 'line' | 'surface';

type CreatorPick =
  | null
  | { kind: 'line'; slot: 'A' | 'B' }
  | { kind: 'surface'; slot: number };

export function nextSelectionModeState(args: {
  nextMode: SelectionMode;
  curveMode: boolean;
  createMode: CreateMode;
  pendingPointIdx: number | null;
}) {
  if (args.nextMode === 'none') {
    return {
      selectionMode: 'none' as SelectionMode,
      curveMode: args.curveMode,
      createMode: args.createMode,
      pendingPointIdx: args.pendingPointIdx
    };
  }
  return {
    selectionMode: args.nextMode,
    curveMode: false,
    createMode: 'idle' as CreateMode,
    pendingPointIdx: null
  };
}

export function nextCreateModeState(args: {
  nextMode: CreateMode;
  selectionMode: SelectionMode;
  curveMode: boolean;
  pendingPointIdx: number | null;
  creatorPick: CreatorPick;
  surfaceDraft: number[];
}) {
  return {
    createMode: args.nextMode,
    selectionMode: args.nextMode !== 'idle' ? ('none' as SelectionMode) : args.selectionMode,
    curveMode: args.nextMode !== 'idle' ? false : args.curveMode,
    pendingPointIdx: args.nextMode !== 'idle' ? null : args.pendingPointIdx,
    creatorPick: (args.nextMode === 'idle' || args.nextMode === 'point') ? null : args.creatorPick,
    surfaceDraft: args.nextMode !== 'surface' ? [] : args.surfaceDraft
  };
}

export function linePickState(slot: 'A' | 'B') {
  return {
    createMode: 'line' as CreateMode,
    selectionMode: 'none' as SelectionMode,
    curveMode: false,
    pendingPointIdx: null,
    creatorPick: { kind: 'line', slot } as CreatorPick
  };
}

export function surfacePickState(slot: number) {
  return {
    createMode: 'surface' as CreateMode,
    selectionMode: 'none' as SelectionMode,
    curveMode: false,
    pendingPointIdx: null,
    creatorPick: { kind: 'surface', slot } as CreatorPick
  };
}
