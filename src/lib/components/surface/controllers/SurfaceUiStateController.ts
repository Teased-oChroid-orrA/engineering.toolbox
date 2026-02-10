export type SurfaceWorkspaceUiState = {
  coreMode: boolean;
  advancedOpen: boolean;
  rightRailCollapsed?: boolean;
};

const CORE_MODE_KEY = 'sc.surface.coreMode';
const CORE_MODE_PROMPT_SEEN_KEY = 'sc.surface.coreModePromptSeen';
const RIGHT_RAIL_KEY = 'sc.surface.rightRailCollapsed';
const SESSION_STATE_ROOT_KEY = '__scSurfaceSessionUiState';

function safeWindow(): Window | null {
  return typeof window !== 'undefined' ? window : null;
}

export function readPersistedCoreMode(): boolean | null {
  const w = safeWindow();
  if (!w) return null;
  try {
    const raw = w.localStorage.getItem(CORE_MODE_KEY);
    if (raw === '1') return true;
    if (raw === '0') return false;
    return null;
  } catch {
    return null;
  }
}

export function persistCoreMode(v: boolean) {
  const w = safeWindow();
  if (!w) return;
  try {
    w.localStorage.setItem(CORE_MODE_KEY, v ? '1' : '0');
  } catch {
    // no-op
  }
}

export function hasSeenCoreModePrompt() {
  const w = safeWindow();
  if (!w) return true;
  try {
    return w.localStorage.getItem(CORE_MODE_PROMPT_SEEN_KEY) === '1';
  } catch {
    return true;
  }
}

export function readPersistedRightRailCollapsed(): boolean | null {
  const w = safeWindow();
  if (!w) return null;
  try {
    const raw = w.localStorage.getItem(RIGHT_RAIL_KEY);
    if (raw === '1') return true;
    if (raw === '0') return false;
    return null;
  } catch {
    return null;
  }
}

export function persistRightRailCollapsed(v: boolean) {
  const w = safeWindow();
  if (!w) return;
  try {
    w.localStorage.setItem(RIGHT_RAIL_KEY, v ? '1' : '0');
  } catch {
    // no-op
  }
}

export function markCoreModePromptSeen() {
  const w = safeWindow();
  if (!w) return;
  try {
    w.localStorage.setItem(CORE_MODE_PROMPT_SEEN_KEY, '1');
  } catch {
    // no-op
  }
}

type SessionRoot = Record<string, SurfaceWorkspaceUiState>;

function readSessionRoot(): SessionRoot {
  const w = safeWindow() as any;
  if (!w) return {};
  const cur = w[SESSION_STATE_ROOT_KEY];
  if (cur && typeof cur === 'object') return cur as SessionRoot;
  w[SESSION_STATE_ROOT_KEY] = {};
  return w[SESSION_STATE_ROOT_KEY] as SessionRoot;
}

export function readWorkspaceUiState(workspaceKey: string): SurfaceWorkspaceUiState | null {
  const root = readSessionRoot();
  const x = root[workspaceKey];
  if (!x) return null;
  if (typeof x.coreMode !== 'boolean' || typeof x.advancedOpen !== 'boolean') return null;
  return x;
}

export function writeWorkspaceUiState(workspaceKey: string, state: SurfaceWorkspaceUiState) {
  const root = readSessionRoot();
  root[workspaceKey] = state;
}
