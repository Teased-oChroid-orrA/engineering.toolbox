import {
  LEFT_DEFAULT_ORDER,
  RIGHT_DEFAULT_ORDER,
  normalizeOrder,
  type LeftCardId,
  type RightCardId
} from './BushingCardLayoutController';

export const LAYOUT_KEY_V2 = 'scd.bushing.layout.v2';
export const LAYOUT_KEY_V3 = 'scd.bushing.layout.v3';
export const NESTED_LAYOUT_KEY_V2 = 'scd.bushing.layout.v2.diagnostics';
export const NESTED_LAYOUT_KEY_V3 = 'scd.bushing.layout.v3.diagnostics';
export const DND_ENABLED_KEY = 'scd.bushing.dnd.enabled';

function parseJson(raw: string | null): any | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function loadTopLevelLayout(): { leftCardOrder: LeftCardId[]; rightCardOrder: RightCardId[] } {
  if (typeof window === 'undefined') {
    return { leftCardOrder: [...LEFT_DEFAULT_ORDER], rightCardOrder: [...RIGHT_DEFAULT_ORDER] };
  }
  
  try {
    const v3 = parseJson(localStorage.getItem(LAYOUT_KEY_V3));
    if (v3) {
      const leftCardOrder = normalizeOrder(v3?.leftCardOrder, LEFT_DEFAULT_ORDER);
      const rightCardOrder = normalizeOrder(v3?.rightCardOrder, RIGHT_DEFAULT_ORDER);
      
      // Failsafe: detect duplicates and clear corrupted data
      if (leftCardOrder.length !== new Set(leftCardOrder).size || 
          rightCardOrder.length !== new Set(rightCardOrder).size) {
        console.warn('[BushingLayout] Detected duplicate keys in layout, clearing corrupted data');
        localStorage.removeItem(LAYOUT_KEY_V3);
        return { leftCardOrder: [...LEFT_DEFAULT_ORDER], rightCardOrder: [...RIGHT_DEFAULT_ORDER] };
      }
      
      return { leftCardOrder, rightCardOrder };
    }
    
    const v2 = parseJson(localStorage.getItem(LAYOUT_KEY_V2));
    const migrated = {
      leftCardOrder: normalizeOrder(v2?.leftCardOrder, LEFT_DEFAULT_ORDER),
      rightCardOrder: normalizeOrder(v2?.rightCardOrder, RIGHT_DEFAULT_ORDER)
    };
    
    // Failsafe: check migrated data before persisting
    if (migrated.leftCardOrder.length === new Set(migrated.leftCardOrder).size &&
        migrated.rightCardOrder.length === new Set(migrated.rightCardOrder).size) {
      localStorage.setItem(LAYOUT_KEY_V3, JSON.stringify(migrated));
      return migrated;
    } else {
      console.warn('[BushingLayout] Detected duplicates during migration, using defaults');
      return { leftCardOrder: [...LEFT_DEFAULT_ORDER], rightCardOrder: [...RIGHT_DEFAULT_ORDER] };
    }
  } catch (err) {
    console.error('[BushingLayout] Error loading layout, using defaults:', err);
    return { leftCardOrder: [...LEFT_DEFAULT_ORDER], rightCardOrder: [...RIGHT_DEFAULT_ORDER] };
  }
}

export function persistTopLevelLayout(leftCardOrder: LeftCardId[], rightCardOrder: RightCardId[]): void {
  if (typeof window === 'undefined') return;
  
  // Failsafe: validate before persisting to prevent corruption
  if (leftCardOrder.length !== new Set(leftCardOrder).size) {
    console.error('[BushingLayout] Attempted to persist duplicate left card order, aborting');
    return;
  }
  if (rightCardOrder.length !== new Set(rightCardOrder).size) {
    console.error('[BushingLayout] Attempted to persist duplicate right card order, aborting');
    return;
  }
  
  try {
    localStorage.setItem(LAYOUT_KEY_V3, JSON.stringify({ leftCardOrder, rightCardOrder }));
  } catch (err) {
    console.error('[BushingLayout] Error persisting layout:', err);
  }
}

export function loadNestedDiagnosticsLayout(defaults: string[]): string[] {
  if (typeof window === 'undefined') return [...defaults];
  const v3 = parseJson(localStorage.getItem(NESTED_LAYOUT_KEY_V3));
  if (v3) return normalizeOrder(v3, defaults);
  const migrated = normalizeOrder(parseJson(localStorage.getItem(NESTED_LAYOUT_KEY_V2)), defaults);
  localStorage.setItem(NESTED_LAYOUT_KEY_V3, JSON.stringify(migrated));
  return migrated;
}

export function persistNestedDiagnosticsLayout(order: string[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(NESTED_LAYOUT_KEY_V3, JSON.stringify(order));
}

export function readBushingDndEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const raw = localStorage.getItem(DND_ENABLED_KEY);
  if (raw == null) return true;
  return raw !== '0' && raw !== 'false';
}
