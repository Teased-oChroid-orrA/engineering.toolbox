import { beginDragModalState, floatingStyleForKey, resetModalPosForKey } from './InspectorUiState';

type ModalCtx = {
  withViewTransition: (fn: () => void) => void;
  modalPos: Record<string, { x: number; y: number }>;
  setModalPos: (next: Record<string, { x: number; y: number }>) => void;
  dragState: any;
  setDragState: (next: any) => void;
  setRecipeNotice: (v: string | null) => void;
  setShowRecipeModal: (v: boolean) => void;
  setShowShortcuts: (v: boolean) => void;
  setShowSvarBuilder: (v: boolean) => void;
  setShowRegexGenerator: (v: boolean) => void;
  setGenTab: (v: any) => void;
};

export function openRecipesModal(ctx: ModalCtx): void {
  ctx.setRecipeNotice(null);
  ctx.setModalPos(resetModalPosForKey(ctx.modalPos, 'recipes'));
  ctx.withViewTransition(() => ctx.setShowRecipeModal(true));
}

export function openShortcutsModal(ctx: ModalCtx): void {
  ctx.setModalPos(resetModalPosForKey(ctx.modalPos, 'shortcuts'));
  ctx.setShowShortcuts(true);
}

export function openSvarBuilderModal(ctx: ModalCtx): void {
  ctx.setModalPos(resetModalPosForKey(ctx.modalPos, 'svar'));
  ctx.setShowSvarBuilder(true);
}

export function openRegexGeneratorModal(ctx: ModalCtx): void {
  ctx.setShowRegexGenerator(true);
  ctx.setGenTab('builder');
}

export function floatingModalStyle(modalPos: Record<string, { x: number; y: number }>, key: string): string {
  return floatingStyleForKey(modalPos, key);
}

export function beginModalDrag(
  ctx: ModalCtx,
  key: string,
  e: MouseEvent
): void {
  beginDragModalState({
    key,
    event: e,
    modalPos: ctx.modalPos,
    setModalPos: ctx.setModalPos,
    setDragState: ctx.setDragState,
    getDragState: () => ctx.dragState
  });
}

export function resetModalPosition(
  modalPos: Record<string, { x: number; y: number }>,
  key: string
): Record<string, { x: number; y: number }> {
  return resetModalPosForKey(modalPos, key);
}
