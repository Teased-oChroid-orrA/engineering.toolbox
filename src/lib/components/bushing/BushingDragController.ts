import { reorderList } from './BushingCardLayoutController';

export type BushingLaneId = 'left' | 'right';

export type DragSession = {
  lane: BushingLaneId;
  sourceId: string;
  baseOrder: string[];
  previewOrder: string[];
};

export function beginDrag(lane: BushingLaneId, sourceId: string, order: string[]): DragSession {
  const base = [...order];
  return {
    lane,
    sourceId,
    baseOrder: base,
    previewOrder: base
  };
}

export function hoverDrag(session: DragSession, lane: BushingLaneId, targetId: string): DragSession {
  if (session.lane !== lane) return session;
  if (targetId === session.sourceId) return session;
  return {
    ...session,
    previewOrder: reorderList(session.previewOrder, session.sourceId, targetId)
  };
}

export function dropDrag(session: DragSession, lane: BushingLaneId): string[] {
  if (session.lane !== lane) return session.baseOrder;
  return [...session.previewOrder];
}

export function cancelDrag(session: DragSession): string[] {
  return [...session.baseOrder];
}
