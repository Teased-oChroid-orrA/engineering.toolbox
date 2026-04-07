import { expect, test } from '@playwright/test';
import {
  loadWorkspaceSnapshots,
  persistWorkspaceSnapshots
} from '../src/lib/components/inspector/InspectorRecipesController';

class LocalStorageMock {
  private store = new Map<string, string>();

  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
}

function withMockWindow(fn: (storage: LocalStorageMock) => void) {
  const storage = new LocalStorageMock();
  const priorWindow = (globalThis as Record<string, unknown>).window;
  const priorLocalStorage = (globalThis as Record<string, unknown>).localStorage;
  Object.defineProperty(globalThis, 'window', { value: { localStorage: storage }, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true, writable: true });
  try {
    fn(storage);
  } finally {
    if (priorWindow === undefined) delete (globalThis as Record<string, unknown>).window;
    else Object.defineProperty(globalThis, 'window', { value: priorWindow, configurable: true, writable: true });
    if (priorLocalStorage === undefined) delete (globalThis as Record<string, unknown>).localStorage;
    else Object.defineProperty(globalThis, 'localStorage', { value: priorLocalStorage, configurable: true, writable: true });
  }
}

test('inspector workspace snapshots persist and load in descending recency order', () => {
  withMockWindow(() => {
    persistWorkspaceSnapshots('inspector.workspace.snapshots.v1', [
      { id: 'older', name: 'Older', createdAt: 1, datasetId: 'alpha', datasetLabel: 'Alpha', state: { query: '', matchMode: 'fuzzy', targetColIdx: null, maxRowsScanText: '', visibleColumns: [] } as any },
      { id: 'newer', name: 'Newer', createdAt: 2, datasetId: 'alpha', datasetLabel: 'Alpha', state: { query: 'foo', matchMode: 'exact', targetColIdx: 1, maxRowsScanText: '1000', visibleColumns: [0, 1] } as any }
    ]);

    const loaded = loadWorkspaceSnapshots('inspector.workspace.snapshots.v1');
    expect(loaded.map((entry) => entry.id)).toEqual(['newer', 'older']);
  });
});
