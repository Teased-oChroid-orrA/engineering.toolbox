export type LaneId = 'left' | 'right';

export type LaneState = { id: LaneId; cardIds: string[] };

export function moveLaneBetweenPositions(lanes: LaneState[], sourceLaneId: LaneId, targetLaneId: LaneId): LaneState[] {
    const sourceIdx = lanes.findIndex(l => l.id === sourceLaneId);
    const targetIdx = lanes.findIndex(l => l.id === targetLaneId);
    
    if (sourceIdx < 0 || targetIdx < 0) return lanes;
    
    const next = [...lanes];
    [next[sourceIdx], next[targetIdx]] = [next[targetIdx], next[sourceIdx]];
    return next;
}

export function moveCardBetweenLanes(lanes: LaneState[], cardId: string, sourceLaneId: LaneId, targetLaneId: LaneId): LaneState[] {
    const next = lanes.map(lane => ({ ...lane, cardIds: [...lane.cardIds] }));
    const sourceLane = next.find(l => l.id === sourceLaneId);
    const targetLane = next.find(l => l.id === targetLaneId);
    
    if (!sourceLane || !targetLane) return lanes;
    
    const idx = sourceLane.cardIds.indexOf(cardId);
    if (idx < 0) return lanes;
    
    sourceLane.cardIds.splice(idx, 1);
    targetLane.cardIds.push(cardId);
    
    return next;
}