import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { themeLogger } from '$lib/utils/loggers';

export type ThemeMode = 'technical' | 'studio' | 'high-contrast' | 'aurora';

const THEME_KEY = 'scd.theme.mode.v2';
const LEGACY_THEME_KEY = 'scd.theme.mode.v1';
const DEFAULT_THEME: ThemeMode = 'technical';
const VALID_THEMES: ThemeMode[] = ['technical', 'studio', 'high-contrast', 'aurora'];

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

function applyTheme(mode: ThemeMode) {
  if (!browser) return;
  const root = document.documentElement;
  root.setAttribute('data-theme', mode);
  root.classList.remove('theme-technical', 'theme-studio', 'theme-high-contrast', 'theme-aurora');
  root.classList.add(`theme-${mode}`);
}

export const themeStore = createThemeStore();
