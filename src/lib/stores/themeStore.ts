import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { themeLogger } from '$lib/utils/loggers';

export type ThemeMode = 'technical' | 'studio' | 'high-contrast' | 'aurora';

/**
 * Color mode is an axis independent of the palette (ThemeMode).
 * - 'light' / 'dark' pin the appearance.
 * - 'auto' follows the OS via prefers-color-scheme and reacts to live changes.
 */
export type ColorMode = 'light' | 'dark' | 'auto';
export type ResolvedColorMode = 'light' | 'dark';

const THEME_KEY = 'scd.theme.mode.v2';
const LEGACY_THEME_KEY = 'scd.theme.mode.v1';
const COLOR_MODE_KEY = 'scd.color.mode.v1';
const DEFAULT_THEME: ThemeMode = 'technical';
const DEFAULT_COLOR_MODE: ColorMode = 'auto';
const VALID_THEMES: ThemeMode[] = ['technical', 'studio', 'high-contrast', 'aurora'];
const VALID_COLOR_MODES: ColorMode[] = ['light', 'dark', 'auto'];

function migrateLegacyTheme(saved: string | null): ThemeMode | null {
  switch (saved) {
    case 'dark':
    case 'teal-dark':
      return 'technical';
    case 'light':
      return 'high-contrast';
    case 'teal-light':
      return 'aurora';
    default:
      return null;
  }
}

function loadTheme(): ThemeMode {
  if (!browser) return DEFAULT_THEME;
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved && VALID_THEMES.includes(saved as ThemeMode)) {
      return saved as ThemeMode;
    }
    const migrated = migrateLegacyTheme(localStorage.getItem(LEGACY_THEME_KEY));
    if (migrated) return migrated;
  } catch (e) {
    themeLogger.warn('Failed to load theme', e);
  }
  return DEFAULT_THEME;
}

function saveTheme(mode: ThemeMode) {
  if (!browser) return;
  try {
    localStorage.setItem(THEME_KEY, mode);
  } catch (e) {
    themeLogger.warn('Failed to save theme', e);
  }
}

function loadColorMode(): ColorMode {
  if (!browser) return DEFAULT_COLOR_MODE;
  try {
    const saved = localStorage.getItem(COLOR_MODE_KEY);
    if (saved && VALID_COLOR_MODES.includes(saved as ColorMode)) {
      return saved as ColorMode;
    }
  } catch (e) {
    themeLogger.warn('Failed to load color mode', e);
  }
  return DEFAULT_COLOR_MODE;
}

function saveColorMode(mode: ColorMode) {
  if (!browser) return;
  try {
    localStorage.setItem(COLOR_MODE_KEY, mode);
  } catch (e) {
    themeLogger.warn('Failed to save color mode', e);
  }
}

function prefersDark(): boolean {
  if (!browser || !window.matchMedia) return true;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function resolveColorMode(mode: ColorMode): ResolvedColorMode {
  if (mode === 'auto') return prefersDark() ? 'dark' : 'light';
  return mode;
}

function applyTheme(mode: ThemeMode) {
  if (!browser) return;
  const root = document.documentElement;
  root.setAttribute('data-theme', mode);
  root.classList.remove('theme-technical', 'theme-studio', 'theme-high-contrast', 'theme-aurora');
  root.classList.add(`theme-${mode}`);
}

function applyColorMode(mode: ColorMode) {
  if (!browser) return;
  const resolved = resolveColorMode(mode);
  const root = document.documentElement;
  // Keep the chosen setting on the root for debugging/persistence, but drive
  // styling off the resolved value so [data-mode="light|dark"] selectors work.
  root.setAttribute('data-color-mode', mode);
  root.setAttribute('data-mode', resolved);
  root.style.colorScheme = resolved;
  return resolved;
}

function createThemeStore() {
  const { subscribe, set, update } = writable<ThemeMode>(loadTheme());

  return {
    subscribe,
    set: (mode: ThemeMode) => {
      set(mode);
      saveTheme(mode);
      applyTheme(mode);
    },
    toggle: () => {
      update((current) => {
        const currentIdx = VALID_THEMES.indexOf(current);
        const next = VALID_THEMES[(currentIdx + 1) % VALID_THEMES.length] ?? DEFAULT_THEME;
        saveTheme(next);
        applyTheme(next);
        return next;
      });
    },
    init: () => {
      const mode = loadTheme();
      set(mode);
      applyTheme(mode);
    }
  };
}

function createColorModeStore() {
  const { subscribe, set } = writable<ColorMode>(loadColorMode());
  let mediaQuery: MediaQueryList | null = null;
  let listening = false;

  const onSystemChange = () => {
    // Only re-apply when following the system; pinned modes ignore OS changes.
    const current = loadColorMode();
    if (current === 'auto') applyColorMode('auto');
  };

  const ensureListener = () => {
    if (!browser || listening || !window.matchMedia) return;
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', onSystemChange);
    listening = true;
  };

  return {
    subscribe,
    set: (mode: ColorMode) => {
      set(mode);
      saveColorMode(mode);
      applyColorMode(mode);
      ensureListener();
    },
    /** Cycle light -> dark -> auto -> light. */
    cycle: () => {
      const current = loadColorMode();
      const idx = VALID_COLOR_MODES.indexOf(current);
      const next = VALID_COLOR_MODES[(idx + 1) % VALID_COLOR_MODES.length] ?? DEFAULT_COLOR_MODE;
      set(next);
      saveColorMode(next);
      applyColorMode(next);
      ensureListener();
    },
    init: () => {
      const mode = loadColorMode();
      set(mode);
      applyColorMode(mode);
      ensureListener();
    }
  };
}

export const themeStore = createThemeStore();
export const colorModeStore = createColorModeStore();
