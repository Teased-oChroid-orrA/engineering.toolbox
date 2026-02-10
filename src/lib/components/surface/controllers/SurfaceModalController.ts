export type ModalPos = { x: number; y: number };

export function centeredModalPos(args: { windowWidth: number; windowHeight: number; panelWidth: number; panelHeight: number; margin?: number }): ModalPos {
  const m = args.margin ?? 20;
  return {
    x: Math.max(m, args.windowWidth * 0.5 - args.panelWidth * 0.5),
    y: Math.max(m, args.windowHeight * 0.5 - args.panelHeight * 0.5)
  };
}

export function dragOffsetFromPointer(pointerX: number, pointerY: number, pos: ModalPos): ModalPos {
  return { x: pointerX - pos.x, y: pointerY - pos.y };
}

export function draggedModalPos(pointerX: number, pointerY: number, dragOffset: ModalPos, min = 12): ModalPos {
  return {
    x: Math.max(min, pointerX - dragOffset.x),
    y: Math.max(min, pointerY - dragOffset.y)
  };
}
