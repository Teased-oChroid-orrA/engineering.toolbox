export type ToolCursorMode = 'select' | 'line' | 'surface' | 'curve' | 'insert';
export type SelectionMode = 'none' | 'box' | 'lasso';
export type CreateMode = 'idle' | 'point' | 'line' | 'surface';
export type CreatorPick =
  | null
  | { kind: 'line'; slot: 'A' | 'B' }
  | { kind: 'surface'; slot: number };

export function transitionToolCursor(args: {
  mode: ToolCursorMode;
  surfaceDraft: number[];
}): {
  toolCursor: ToolCursorMode;
  selectionMode: SelectionMode;
  createMode: CreateMode;
  curveMode: boolean;
  lineInsertPickMode: boolean;
  creatorPick: CreatorPick;
  pendingPointIdx: number | null;
  surfaceDraft: number[];
} {
  const base = {
    toolCursor: args.mode,
    selectionMode: 'none' as SelectionMode,
    createMode: 'idle' as CreateMode,
    curveMode: false,
    lineInsertPickMode: false,
    creatorPick: null as CreatorPick,
    pendingPointIdx: null as number | null,
    surfaceDraft: args.surfaceDraft
  };

  if (args.mode === 'line') {
    return {
      ...base,
      createMode: 'line',
      creatorPick: { kind: 'line', slot: 'A' },
      surfaceDraft: []
    };
  }
  if (args.mode === 'surface') {
    return {
      ...base,
      createMode: 'surface',
      creatorPick: { kind: 'surface', slot: Math.max(0, args.surfaceDraft.length) }
    };
  }
  if (args.mode === 'curve') {
    return {
      ...base,
      curveMode: true
    };
  }
  if (args.mode === 'insert') {
    return {
      ...base,
      lineInsertPickMode: true
    };
  }
  return {
    ...base,
    surfaceDraft: []
  };
}

