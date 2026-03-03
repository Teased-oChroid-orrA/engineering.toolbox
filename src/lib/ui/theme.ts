export type AppTheme = 'technical' | 'studio' | 'high-contrast' | 'aurora';
export type AppMode = 'dark';

export const THEMES: { id: AppTheme; label: string }[] = [
  { id: 'technical', label: 'Technical' },
  { id: 'studio', label: 'Studio' },
  { id: 'high-contrast', label: 'High Contrast' },
  { id: 'aurora', label: 'Aurora' }
];

const KEY_THEME = 'scd.theme';
const KEY_MODE = 'scd.mode';

function getRoot(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.documentElement;
}

export function getThemeFromDom(): { theme: AppTheme; mode: AppMode } {
  const root = getRoot();
  const theme = (root?.getAttribute('data-theme') as AppTheme) || 'technical';
  const mode = 'dark';
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
  setMode('dark');
}

export function initTheme() {
  const root = getRoot();
  if (!root) return;

  // If app.html inline script already applied values, keep them.
  // Otherwise, read persisted settings.
  try {
    const theme = (localStorage.getItem(KEY_THEME) as AppTheme | null) || null;
    const mode = (localStorage.getItem(KEY_MODE) as AppMode | null) || 'dark';
    if (theme) root.setAttribute('data-theme', theme);
    if (mode) root.setAttribute('data-mode', mode);
  } catch {
    // ignore
  }
}
