import {
  LEFT_DEFAULT_ORDER,
  RIGHT_DEFAULT_ORDER,
  normalizeOrder,
  type LeftCardId,
  type RightCardId
} from './BushingCardLayoutController';
import { bushingLogger } from '$lib/utils/loggers';

export const LAYOUT_KEY_V2 = 'scd.bushing.layout.v2';
export const LAYOUT_KEY_V3 = 'scd.bushing.layout.v3';
export const LAYOUT_KEY_V4 = 'scd.bushing.layout.v4';
export const NESTED_LAYOUT_KEY_V2 = 'scd.bushing.layout.v2.diagnostics';
export const NESTED_LAYOUT_KEY_V3 = 'scd.bushing.layout.v3.diagnostics';
export const DND_ENABLED_KEY = 'scd.bushing.dnd.enabled';
export const BUSHING_UI_KEY_V1 = 'scd.bushing.ui.v1';
export const BUSHING_WORKSPACE_KEY_V1 = 'scd.bushing.workspace.v1';

export type BushingUxMode = 'guided' | 'advanced';
export type BushingUiState = {
  uxMode: BushingUxMode;
  useFreePositioning: boolean;
};
export type BushingWorkspaceState = {
  ui: BushingUiState;
  layout: { leftCardOrder: LeftCardId[]; rightCardOrder: RightCardId[] };
  diagnosticsOrder: string[];
  dndEnabled: boolean;
  runtime: {
    useLegacyRenderer: boolean;
    traceEnabled: boolean;
  };
};

function parseJson(raw: string | null): any | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function readWorkspace(): BushingWorkspaceState | null {
  if (typeof window === 'undefined') return null;
  const parsed = parseJson(localStorage.getItem(BUSHING_WORKSPACE_KEY_V1));
  if (!parsed || typeof parsed !== 'object') return null;
  try {
    const leftCardOrder = normalizeOrder(parsed?.layout?.leftCardOrder, LEFT_DEFAULT_ORDER);
    const rightCardOrder = normalizeOrder(parsed?.layout?.rightCardOrder, RIGHT_DEFAULT_ORDER);
    const diagnosticsOrder = Array.isArray(parsed?.diagnosticsOrder) ? parsed.diagnosticsOrder.filter((x: unknown) => typeof x === 'string') : [];
    const uxMode: BushingUxMode = parsed?.ui?.uxMode === 'advanced' ? 'advanced' : 'guided';
    const useFreePositioning = Boolean(parsed?.ui?.useFreePositioning);
    const dndEnabled = typeof parsed?.dndEnabled === 'boolean' ? parsed.dndEnabled : true;
    const runtime = {
      useLegacyRenderer: Boolean(parsed?.runtime?.useLegacyRenderer),
      traceEnabled: Boolean(parsed?.runtime?.traceEnabled)
    };
    return {
      ui: { uxMode, useFreePositioning },
      layout: { leftCardOrder, rightCardOrder },
      diagnosticsOrder,
      dndEnabled,
      runtime
    };
  } catch (err) {
    bushingLogger.warn('Malformed bushing workspace state; clearing to defaults', err);
    try {
      localStorage.removeItem(BUSHING_WORKSPACE_KEY_V1);
    } catch {
      // no-op
    }
    return null;
  }
}

function writeWorkspacePatch(patch: Partial<BushingWorkspaceState>): void {
  if (typeof window === 'undefined') return;
  try {
    const current = readWorkspace() ?? {
      ui: { uxMode: 'guided' as BushingUxMode, useFreePositioning: false },
      layout: { leftCardOrder: [...LEFT_DEFAULT_ORDER], rightCardOrder: [...RIGHT_DEFAULT_ORDER] },
      diagnosticsOrder: [],
      dndEnabled: true,
      runtime: { useLegacyRenderer: false, traceEnabled: false }
    };
    const next: BushingWorkspaceState = {
      ...current,
      ...patch,
      ui: { ...current.ui, ...(patch.ui ?? {}) },
      layout: { ...current.layout, ...(patch.layout ?? {}) },
      runtime: { ...current.runtime, ...(patch.runtime ?? {}) }
    };
    localStorage.setItem(BUSHING_WORKSPACE_KEY_V1, JSON.stringify(next));
  } catch (err) {
    bushingLogger.error('Error persisting workspace state', err);
  }
}

export function loadTopLevelLayout(): { leftCardOrder: LeftCardId[]; rightCardOrder: RightCardId[] } {
  if (typeof window === 'undefined') {
    return { leftCardOrder: [...LEFT_DEFAULT_ORDER], rightCardOrder: [...RIGHT_DEFAULT_ORDER] };
  }
  
  try {
    const workspace = readWorkspace();
    if (workspace) {
      const leftCardOrder = normalizeOrder(workspace.layout.leftCardOrder, LEFT_DEFAULT_ORDER);
      const rightCardOrder = normalizeOrder(workspace.layout.rightCardOrder, RIGHT_DEFAULT_ORDER);
      if (leftCardOrder.length !== new Set(leftCardOrder).size ||
          rightCardOrder.length !== new Set(rightCardOrder).size) {
        bushingLogger.warn('Detected duplicate keys in workspace layout, using defaults');
        return { leftCardOrder: [...LEFT_DEFAULT_ORDER], rightCardOrder: [...RIGHT_DEFAULT_ORDER] };
      }
      return { leftCardOrder, rightCardOrder };
    }
    const v4 = parseJson(localStorage.getItem(LAYOUT_KEY_V4));
    if (v4) {
      const leftCardOrder = normalizeOrder(v4?.leftCardOrder, LEFT_DEFAULT_ORDER);
      const rightCardOrder = normalizeOrder(v4?.rightCardOrder, RIGHT_DEFAULT_ORDER);
      if (leftCardOrder.length !== new Set(leftCardOrder).size ||
          rightCardOrder.length !== new Set(rightCardOrder).size) {
        bushingLogger.warn('Detected duplicate keys in v4 layout, clearing corrupted data');
        localStorage.removeItem(LAYOUT_KEY_V4);
        return { leftCardOrder: [...LEFT_DEFAULT_ORDER], rightCardOrder: [...RIGHT_DEFAULT_ORDER] };
      }
      return { leftCardOrder, rightCardOrder };
    }
    const v3 = parseJson(localStorage.getItem(LAYOUT_KEY_V3));
    if (v3) {
      const leftCardOrder = normalizeOrder(v3?.leftCardOrder, LEFT_DEFAULT_ORDER);
      const rightCardOrder = normalizeOrder(v3?.rightCardOrder, RIGHT_DEFAULT_ORDER);
      
      // Failsafe: detect duplicates and clear corrupted data
      if (leftCardOrder.length !== new Set(leftCardOrder).size || 
          rightCardOrder.length !== new Set(rightCardOrder).size) {
        bushingLogger.warn('Detected duplicate keys in layout, clearing corrupted data');
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
      bushingLogger.warn('Detected duplicates during migration, using defaults');
      return { leftCardOrder: [...LEFT_DEFAULT_ORDER], rightCardOrder: [...RIGHT_DEFAULT_ORDER] };
    }
  } catch (err) {
    bushingLogger.error('Error loading layout, using defaults', err);
    return { leftCardOrder: [...LEFT_DEFAULT_ORDER], rightCardOrder: [...RIGHT_DEFAULT_ORDER] };
  }
}

export function persistTopLevelLayout(leftCardOrder: LeftCardId[], rightCardOrder: RightCardId[]): void {
  if (typeof window === 'undefined') return;
  
  // Failsafe: validate before persisting to prevent corruption
  if (leftCardOrder.length !== new Set(leftCardOrder).size) {
    bushingLogger.error('Attempted to persist duplicate left card order, aborting');
    return;
  }
  if (rightCardOrder.length !== new Set(rightCardOrder).size) {
    bushingLogger.error('Attempted to persist duplicate right card order, aborting');
    return;
  }
  
  try {
    const payload = JSON.stringify({ leftCardOrder, rightCardOrder });
    writeWorkspacePatch({ layout: { leftCardOrder, rightCardOrder } });
    localStorage.setItem(LAYOUT_KEY_V4, payload);
    localStorage.setItem(LAYOUT_KEY_V3, payload);
  } catch (err) {
    bushingLogger.error('Error persisting layout', err);
  }
}

export function loadNestedDiagnosticsLayout(defaults: string[]): string[] {
  if (typeof window === 'undefined') return [...defaults];
  const workspace = readWorkspace();
  if (workspace?.diagnosticsOrder?.length) return normalizeOrder(workspace.diagnosticsOrder, defaults);
  const v3 = parseJson(localStorage.getItem(NESTED_LAYOUT_KEY_V3));
  if (v3) return normalizeOrder(v3, defaults);
  const migrated = normalizeOrder(parseJson(localStorage.getItem(NESTED_LAYOUT_KEY_V2)), defaults);
  localStorage.setItem(NESTED_LAYOUT_KEY_V3, JSON.stringify(migrated));
  return migrated;
}

export function persistNestedDiagnosticsLayout(order: string[]): void {
  if (typeof window === 'undefined') return;
  writeWorkspacePatch({ diagnosticsOrder: [...order] });
  localStorage.setItem(NESTED_LAYOUT_KEY_V3, JSON.stringify(order));
}

export function readBushingDndEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const workspace = readWorkspace();
  if (workspace) return workspace.dndEnabled;
  const raw = localStorage.getItem(DND_ENABLED_KEY);
  if (raw == null) return true;
  return raw !== '0' && raw !== 'false';
}

export function loadBushingUiState(): BushingUiState {
  if (typeof window === 'undefined') return { uxMode: 'guided', useFreePositioning: false };
  const parsed = parseJson(localStorage.getItem(BUSHING_UI_KEY_V1));
  const uxMode: BushingUxMode = parsed?.uxMode === 'advanced' ? 'advanced' : 'guided';
  const useFreePositioning =
    typeof parsed?.useFreePositioning === 'boolean'
      ? parsed.useFreePositioning
      : localStorage.getItem('scd.bushing.freePositioning.enabled') === '1' ||
        localStorage.getItem('scd.bushing.freePositioning.enabled') === 'true';
  return { uxMode, useFreePositioning };
}

export function persistBushingUiState(state: BushingUiState): void {
  if (typeof window === 'undefined') return;
  try {
    writeWorkspacePatch({ ui: state });
    localStorage.setItem(BUSHING_UI_KEY_V1, JSON.stringify(state));
  } catch (err) {
    bushingLogger.error('Error persisting UI state', err);
  }
}

export function loadBushingRuntimeState(): { useLegacyRenderer: boolean; traceEnabled: boolean } {
  const workspace = readWorkspace();
  if (workspace) return workspace.runtime;
  if (typeof window === 'undefined') return { useLegacyRenderer: false, traceEnabled: false };
  return {
    useLegacyRenderer: localStorage.getItem('scd.bushing.legacyRenderer') === '1',
    traceEnabled: localStorage.getItem('scd.bushing.traceEnabled') === '1'
  };
}

export function persistBushingRuntimeState(state: { useLegacyRenderer: boolean; traceEnabled: boolean }): void {
  if (typeof window === 'undefined') return;
  writeWorkspacePatch({ runtime: state });
}

export function persistBushingDndEnabled(v: boolean): void {
  if (typeof window === 'undefined') return;
  writeWorkspacePatch({ dndEnabled: v });
  localStorage.setItem(DND_ENABLED_KEY, v ? '1' : '0');
}
