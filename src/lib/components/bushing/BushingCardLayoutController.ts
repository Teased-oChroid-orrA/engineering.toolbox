export type LeftCardId = 'header' | 'guidance' | 'setup' | 'geometry' | 'profile' | 'process';
export type RightCardId = 'drafting' | 'summary' | 'diagnostics';

export const LAYOUT_KEY = 'scd.bushing.layout.v3';
export const LEFT_DEFAULT_ORDER: LeftCardId[] = ['header', 'guidance', 'setup', 'geometry', 'profile', 'process'];
export const RIGHT_DEFAULT_ORDER: RightCardId[] = ['drafting', 'summary', 'diagnostics'];

export const LEFT_CARD_LABELS: Record<LeftCardId, string> = {
  header: 'Header',
  guidance: 'Helper Guidance',
  setup: 'Setup',
  geometry: 'Geometry',
  profile: 'Profile + Settings',
  process: 'Process / Limits'
};

export const RIGHT_CARD_LABELS: Record<RightCardId, string> = {
  drafting: 'Drafting View',
  summary: 'Results Panel',
  diagnostics: 'Diagnostics'
};

export function normalizeOrder<T extends string>(raw: unknown, defaults: T[]): T[] {
  // Failsafe: if raw is invalid or corrupted, return defaults
  if (!Array.isArray(raw)) return [...defaults];
  
  const arr = raw.filter((v): v is T => typeof v === 'string' && defaults.includes(v as T));
  
  // Deduplicate to prevent duplicate key errors
  const deduped = Array.from(new Set(arr));
  
  // Add missing defaults
  for (const key of defaults) {
    if (!deduped.includes(key)) deduped.push(key);
  }
  
  // Final failsafe: if deduplication failed, return defaults
  if (deduped.length !== new Set(deduped).size) {
    console.warn('[BushingCardLayout] Detected duplicates after normalization, returning defaults');
    return [...defaults];
  }
  
  return deduped;
}

export function cardOrder(arr: string[], id: string): number {
  const idx = arr.indexOf(id);
  return idx >= 0 ? idx + 1 : 999;
}

export function moveCardInList<T extends string>(arr: T[], id: T, direction: -1 | 1): T[] {
  const next = [...arr];
  const idx = next.indexOf(id);
  if (idx < 0) return next;
  const swap = idx + direction;
  if (swap < 0 || swap >= next.length) return next;
  [next[idx], next[swap]] = [next[swap], next[idx]];
  return next;
}

export function canMoveInList<T extends string>(arr: T[], id: T, direction: -1 | 1): boolean {
  const idx = arr.indexOf(id);
  if (idx < 0) return false;
  const next = idx + direction;
  return next >= 0 && next < arr.length;
}

export function reorderList<T extends string>(arr: T[], dragId: T, targetId: T): T[] {
  if (dragId === targetId) return arr;
  const next = [...arr];
  const from = next.indexOf(dragId);
  const to = next.indexOf(targetId);
  if (from < 0 || to < 0) return arr;
  next.splice(from, 1);
  next.splice(to, 0, dragId);
  return next;
}
