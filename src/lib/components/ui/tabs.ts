import { writable } from 'svelte/store';
import { setContext, getContext } from 'svelte';

const KEY = Symbol('tabs');

export function createTabs(initial: string) {
  const value = writable(initial);
  setContext(KEY, { value });
  return { value };
}

export function useTabs() {
  const ctx = getContext<{ value: ReturnType<typeof writable<string>> }>(KEY);
  if (!ctx) throw new Error('Tabs context not found');
  return ctx;
}
