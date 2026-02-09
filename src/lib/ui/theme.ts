export type AppTheme = 'modern' | 'seafoam';
export type AppMode = 'light' | 'dark';

export const THEMES: { id: AppTheme; label: string }[] = [
  { id: 'modern', label: 'Modern' },
  { id: 'seafoam', label: 'Seafoam (Teal)' }
];

const KEY_THEME = 'scd.theme';
const KEY_MODE = 'scd.mode';

function getRoot(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.documentElement;
}

export function getThemeFromDom(): { theme: AppTheme; mode: AppMode } {
  const root = getRoot();
  const theme = (root?.getAttribute('data-theme') as AppTheme) || 'modern';
  const mode = (root?.getAttribute('data-mode') as AppMode) || 'dark';
  return { theme, mode };
}

export function setTheme(theme: AppTheme) {
  const root = getRoot();
  if (!root) return;
  root.setAttribute('data-theme', theme);
  try { localStorage.setItem(KEY_THEME, theme); } catch {}
}

export function setMode(mode: AppMode) {
  const root = getRoot();
  if (!root) return;
  root.setAttribute('data-mode', mode);
  try { localStorage.setItem(KEY_MODE, mode); } catch {}
}

export function toggleMode() {
  const { mode } = getThemeFromDom();
  setMode(mode === 'dark' ? 'light' : 'dark');
}

export function initTheme() {
  const root = getRoot();
  if (!root) return;

  // If app.html inline script already applied values, keep them.
  // Otherwise, read persisted settings.
  try {
    const theme = (localStorage.getItem(KEY_THEME) as AppTheme | null) || null;
    const mode = (localStorage.getItem(KEY_MODE) as AppMode | null) || null;
    if (theme) root.setAttribute('data-theme', theme);
    if (mode) root.setAttribute('data-mode', mode);
  } catch {
    // ignore
  }
}
