import { writable } from 'svelte/store';

export type ToastKind = 'success' | 'warning' | 'error' | 'info';

export type ToastItem = {
  id: string;
  kind: ToastKind;
  title: string;
  detail?: string;
  timeoutMs: number;
};

export const toasts = writable<ToastItem[]>([]);

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function pushToast(kind: ToastKind, title: string, detail?: string, timeoutMs = 2500) {
  const id = uid();
  const item: ToastItem = { id, kind, title, detail, timeoutMs };
  toasts.update((arr) => [item, ...arr].slice(0, 5));
  setTimeout(() => {
    toasts.update((arr) => arr.filter((t) => t.id !== id));
  }, timeoutMs);
}

export const toast = {
  success: (title: string, detail?: string) => pushToast('success', title, detail),
  warning: (title: string, detail?: string) => pushToast('warning', title, detail, 4000),
  error: (title: string, detail?: string) => pushToast('error', title, detail, 6000),
  info: (title: string, detail?: string) => pushToast('info', title, detail)
};
