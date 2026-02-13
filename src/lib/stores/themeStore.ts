/**
 * Theme Store - Light/Dark mode with Teal color scheme
 * Persists to localStorage: scd.theme.mode
 */
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type ThemeMode = 'light' | 'dark' | 'teal-light' | 'teal-dark';

const THEME_KEY = 'scd.theme.mode.v1';
const DEFAULT_THEME: ThemeMode = 'dark';

function loadTheme(): ThemeMode {
  if (!browser) return DEFAULT_THEME;
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved && ['light', 'dark', 'teal-light', 'teal-dark'].includes(saved)) {
      return saved as ThemeMode;
    }
  } catch (e) {
    console.warn('[Theme] Failed to load theme:', e);
  }
  return DEFAULT_THEME;
}

function saveTheme(mode: ThemeMode) {
  if (!browser) return;
  try {
    localStorage.setItem(THEME_KEY, mode);
  } catch (e) {
    console.warn('[Theme] Failed to save theme:', e);
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
        const next = current === 'dark' ? 'light' : 'dark';
        saveTheme(next);
        applyTheme(next);
        return next;
      });
    },
    setTealLight: () => {
      set('teal-light');
      saveTheme('teal-light');
      applyTheme('teal-light');
    },
    setTealDark: () => {
      set('teal-dark');
      saveTheme('teal-dark');
      applyTheme('teal-dark');
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
  
  // Remove all theme classes
  root.classList.remove('theme-light', 'theme-dark', 'theme-teal-light', 'theme-teal-dark');
  
  // Add current theme class
  root.classList.add(`theme-${mode}`);
}

export const themeStore = createThemeStore();
