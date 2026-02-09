export type InspectorModalKey =
  | 'recipes'
  | 'schema'
  | 'shortcuts'
  | 'svar';

export type InspectorModalPosition = Record<InspectorModalKey, { x: number; y: number }>;

export const defaultInspectorModalPosition = (): InspectorModalPosition => ({
  recipes: { x: 0, y: 0 },
  schema: { x: 0, y: 0 },
  shortcuts: { x: 0, y: 0 },
  svar: { x: 0, y: 0 }
});

export type InspectorUiState = {
  showShortcuts: boolean;
  showInspectorMenu: boolean;
  showRegexHelp: boolean;
  showRegexGenerator: boolean;
  showRecipeModal: boolean;
  showSchemaModal: boolean;
  showColumnPicker: boolean;
  showSvarBuilder: boolean;
  modalPos: InspectorModalPosition;
};

export const defaultInspectorUiState = (): InspectorUiState => ({
  showShortcuts: false,
  showInspectorMenu: false,
  showRegexHelp: false,
  showRegexGenerator: false,
  showRecipeModal: false,
  showSchemaModal: false,
  showColumnPicker: false,
  showSvarBuilder: false,
  modalPos: defaultInspectorModalPosition()
});

export const floatingStyleForKey = (modalPos: Record<string, { x: number; y: number }>, key: string) => {
  const p = modalPos[key] ?? { x: 0, y: 0 };
  return `transform: translate(${p.x}px, ${p.y}px);`;
};

export function beginDragModalState(
  args: {
    key: string;
    event: MouseEvent;
    modalPos: Record<string, { x: number; y: number }>;
    setModalPos: (next: Record<string, { x: number; y: number }>) => void;
    setDragState: (next: { key: string; sx: number; sy: number; ox: number; oy: number } | null) => void;
    getDragState: () => { key: string; sx: number; sy: number; ox: number; oy: number } | null;
  }
) {
  const { key, event, modalPos, setModalPos, setDragState, getDragState } = args;
  event.preventDefault();
  event.stopPropagation();
  const p = modalPos[key] ?? { x: 0, y: 0 };
  setDragState({ key, sx: event.clientX, sy: event.clientY, ox: p.x, oy: p.y });
  const onMove = (ev: MouseEvent) => {
    const dragState = getDragState();
    if (!dragState || dragState.key !== key) return;
    const nx = dragState.ox + (ev.clientX - dragState.sx);
    const ny = dragState.oy + (ev.clientY - dragState.sy);
    setModalPos({ ...modalPos, [key]: { x: nx, y: ny } });
  };
  const onUp = () => {
    setDragState(null);
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
  };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}

export const resetModalPosForKey = (modalPos: Record<string, { x: number; y: number }>, key: string) =>
  ({ ...modalPos, [key]: { x: 0, y: 0 } });
