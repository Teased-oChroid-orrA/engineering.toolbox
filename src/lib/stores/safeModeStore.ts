import { writable } from 'svelte/store';

const KEY = 'scd.safe-mode.v1';

type SafeModeStore = {
  subscribe: (run: (value: boolean) => void) => () => void;
  init: () => void;
  set: (value: boolean) => void;
  toggle: () => void;
};

function createSafeModeStore(): SafeModeStore {
  const store = writable(false);

  const persist = (value: boolean) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(KEY, JSON.stringify(value));
      window.dispatchEvent(new CustomEvent('safe-mode-change', { detail: { enabled: value } }));
    } catch {
      // ignore persistence errors
    }
  };

  return {
    subscribe: store.subscribe,
    init: () => {
      if (typeof window === 'undefined') return;
      try {
        const raw = localStorage.getItem(KEY);
        const parsed = raw ? JSON.parse(raw) : false;
        store.set(Boolean(parsed));
      } catch {
        store.set(false);
      }
    },
    set: (value: boolean) => {
      store.set(Boolean(value));
      persist(Boolean(value));
    },
    toggle: () => {
      let next = false;
      const unsub = store.subscribe((value) => {
        next = !value;
      });
      unsub();
      store.set(next);
      persist(next);
    }
  };
}

export const safeModeStore = createSafeModeStore();
