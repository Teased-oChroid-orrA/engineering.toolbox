/**
 * BushingCardPositionController - Manages free positioning of bushing cards
 * Supports absolute positioning anywhere on screen with grid snapping and collision detection
 */

export type CardId = 
  | 'header' | 'guidance' | 'setup' | 'geometry' | 'profile' | 'process'
  | 'drafting' | 'summary' | 'diagnostics';

export interface CardPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FreeLayoutV4 {
  version: 4;
  mode: 'free';
  cards: Record<CardId, CardPosition>;
}

export const LAYOUT_V4_KEY = 'scd.bushing.layout.v4';
export const GRID_SNAP_SIZE = 10;

// Default card widths
export const DEFAULT_LEFT_CARD_WIDTH = 450;
export const DEFAULT_RIGHT_CARD_WIDTH = 750;

// Default positions for all cards
export const DEFAULT_CARD_POSITIONS: Record<CardId, CardPosition> = {
  // Left column cards
  header: { x: 10, y: 10, width: DEFAULT_LEFT_CARD_WIDTH, height: 120 },
  guidance: { x: 10, y: 140, width: DEFAULT_LEFT_CARD_WIDTH, height: 180 },
  setup: { x: 10, y: 330, width: DEFAULT_LEFT_CARD_WIDTH, height: 240 },
  geometry: { x: 10, y: 580, width: DEFAULT_LEFT_CARD_WIDTH, height: 290 },
  profile: { x: 10, y: 880, width: DEFAULT_LEFT_CARD_WIDTH, height: 290 },
  process: { x: 10, y: 1180, width: DEFAULT_LEFT_CARD_WIDTH, height: 180 },
  
  // Right column cards
  drafting: { x: 480, y: 10, width: DEFAULT_RIGHT_CARD_WIDTH, height: 550 },
  summary: { x: 480, y: 570, width: DEFAULT_RIGHT_CARD_WIDTH, height: 490 },
  diagnostics: { x: 480, y: 1070, width: DEFAULT_RIGHT_CARD_WIDTH, height: 350 }
};

/**
 * Snap position to grid
 */
export function snapToGrid(value: number, gridSize: number = GRID_SNAP_SIZE): number {
  return Math.round(value / gridSize) * gridSize;
}

/**
 * Check if two rectangles overlap
 */
export function rectanglesOverlap(
  rect1: { x: number; y: number; width: number; height: number },
  rect2: { x: number; y: number; width: number; height: number }
): boolean {
  return !(
    rect1.x + rect1.width <= rect2.x ||
    rect2.x + rect2.width <= rect1.x ||
    rect1.y + rect1.height <= rect2.y ||
    rect2.y + rect2.height <= rect1.y
  );
}

/**
 * Find overlapping cards for a given position
 */
export function findOverlappingCards(
  cardId: CardId,
  position: CardPosition,
  allCards: Record<CardId, CardPosition>
): CardId[] {
  const overlapping: CardId[] = [];
  
  for (const [id, cardPos] of Object.entries(allCards)) {
    if (id === cardId) continue;
    if (rectanglesOverlap(position, cardPos)) {
      overlapping.push(id as CardId);
    }
  }
  
  return overlapping;
}

/**
 * Constrain position to viewport bounds
 */
export function constrainToViewport(
  position: CardPosition,
  viewportWidth: number = 1920,
  viewportHeight: number = 2000
): CardPosition {
  return {
    x: Math.max(0, Math.min(position.x, viewportWidth - position.width)),
    y: Math.max(0, Math.min(position.y, viewportHeight - position.height)),
    width: position.width,
    height: position.height
  };
}

/**
 * Migrate v3 layout to v4
 */
export function migrateV3toV4(v3Layout: {
  leftCardOrder?: string[];
  rightCardOrder?: string[];
}): FreeLayoutV4 {
  const cards: Record<CardId, CardPosition> = { ...DEFAULT_CARD_POSITIONS };
  
  // Map v3 order to default positions
  // Left cards maintain their order, just use default positions
  const leftIds: CardId[] = ['header', 'guidance', 'setup', 'geometry', 'profile', 'process'];
  const rightIds: CardId[] = ['drafting', 'summary', 'diagnostics'];
  
  // If custom order exists, adjust y positions accordingly
  if (v3Layout.leftCardOrder) {
    let currentY = 10;
    for (const id of v3Layout.leftCardOrder) {
      if (leftIds.includes(id as CardId)) {
        const cardId = id as CardId;
        cards[cardId] = {
          ...DEFAULT_CARD_POSITIONS[cardId],
          y: currentY
        };
        currentY += DEFAULT_CARD_POSITIONS[cardId].height + 10;
      }
    }
  }
  
  if (v3Layout.rightCardOrder) {
    let currentY = 10;
    for (const id of v3Layout.rightCardOrder) {
      if (rightIds.includes(id as CardId)) {
        const cardId = id as CardId;
        cards[cardId] = {
          ...DEFAULT_CARD_POSITIONS[cardId],
          y: currentY
        };
        currentY += DEFAULT_CARD_POSITIONS[cardId].height + 10;
      }
    }
  }
  
  return {
    version: 4,
    mode: 'free',
    cards
  };
}

/**
 * Load layout from localStorage
 */
export function loadFreeLayout(): FreeLayoutV4 {
  try {
    const stored = localStorage.getItem(LAYOUT_V4_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.version === 4 && parsed.mode === 'free') {
        return parsed as FreeLayoutV4;
      }
    }
    
    // Try to migrate from v3
    const v3Stored = localStorage.getItem('scd.bushing.layout.v3');
    if (v3Stored) {
      const v3 = JSON.parse(v3Stored);
      return migrateV3toV4(v3);
    }
  } catch (e) {
    console.error('[BushingFreePosition] Failed to load layout:', e);
  }
  
  // Return default layout
  return {
    version: 4,
    mode: 'free',
    cards: { ...DEFAULT_CARD_POSITIONS }
  };
}

/**
 * Save layout to localStorage
 */
export function saveFreeLayout(layout: FreeLayoutV4): void {
  try {
    localStorage.setItem(LAYOUT_V4_KEY, JSON.stringify(layout));
  } catch (e) {
    console.error('[BushingFreePosition] Failed to save layout:', e);
  }
}

/**
 * Reset to default layout
 */
export function resetToDefaultLayout(): FreeLayoutV4 {
  const defaultLayout: FreeLayoutV4 = {
    version: 4,
    mode: 'free',
    cards: { ...DEFAULT_CARD_POSITIONS }
  };
  saveFreeLayout(defaultLayout);
  return defaultLayout;
}
