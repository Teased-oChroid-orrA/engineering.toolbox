import { expect, test } from '@playwright/test';
import {
  BUSHING_UI_KEY_V1,
  BUSHING_WORKSPACE_KEY_V1,
  loadBushingEngineeringState,
  loadBushingRuntimeState,
  loadBushingUiState,
  loadTopLevelLayout,
  persistBushingEngineeringState,
  persistBushingRuntimeState,
  persistBushingUiState
} from '../src/lib/components/bushing/BushingLayoutPersistence';

class LocalStorageMock {
  private store = new Map<string, string>();

  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

function withMockWindow(fn: (storage: LocalStorageMock) => void) {
  const storage = new LocalStorageMock();
  const priorWindow = (globalThis as Record<string, unknown>).window;
  const priorLocalStorage = (globalThis as Record<string, unknown>).localStorage;
  Object.defineProperty(globalThis, 'window', {
    value: { localStorage: storage },
    configurable: true,
    writable: true
  });
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    configurable: true,
    writable: true
  });
  try {
    fn(storage);
  } finally {
    if (priorWindow === undefined) {
      delete (globalThis as Record<string, unknown>).window;
    } else {
      Object.defineProperty(globalThis, 'window', {
        value: priorWindow,
        configurable: true,
        writable: true
      });
    }
    if (priorLocalStorage === undefined) {
      delete (globalThis as Record<string, unknown>).localStorage;
    } else {
      Object.defineProperty(globalThis, 'localStorage', {
        value: priorLocalStorage,
        configurable: true,
        writable: true
      });
    }
  }
}

test.describe('bushing workspace persistence', () => {
  test('persists UI and runtime into the unified workspace object', () => {
    withMockWindow((storage) => {
      persistBushingUiState({ uxMode: 'advanced', workflowMode: 'review', useFreePositioning: true });
      persistBushingRuntimeState({ useLegacyRenderer: true, traceEnabled: true });
      persistBushingEngineeringState({
        selectedReamerEntryId: 'builtin:1_4:0.2500',
        selectedIdReamerEntryId: 'builtin:3_16:0.1875',
        sessionCustomReamerEntry: {
          id: 'session:bore:test',
          source: 'custom',
          sizeLabel: 'Custom Bore',
          nominalIn: 0.3125,
          toolTolerancePlusIn: 0.0002,
          toolToleranceMinusIn: 0,
          availabilityTier: 'special',
          preferredRank: null,
          sourceFamily: 'session_custom',
          sourceUrls: [],
          notes: 'session'
        },
        sessionCustomIdReamerEntry: {
          id: 'session:id:test',
          source: 'custom',
          sizeLabel: 'Custom ID',
          nominalIn: 0.1875,
          toolTolerancePlusIn: 0.0002,
          toolToleranceMinusIn: 0,
          availabilityTier: 'special',
          preferredRank: null,
          sourceFamily: 'session_custom',
          sourceUrls: [],
          notes: 'session'
        },
        customReamerCsv: 'size_label,nominal_in,tool_tolerance_plus_in,tool_tolerance_minus_in,availability_tier,preferred_rank,source_family,source_urls,notes',
        activeComparePresetIds: ['baseline'],
        scenarioPresets: [
          {
            id: 'baseline',
            name: 'Baseline',
            createdAt: 1,
            form: { units: 'imperial' } as any
          }
        ]
      });

      expect(loadBushingUiState()).toEqual({ uxMode: 'advanced', workflowMode: 'review', useFreePositioning: true });
      expect(loadBushingRuntimeState()).toEqual({ useLegacyRenderer: true, traceEnabled: true });
      expect(loadBushingEngineeringState().selectedReamerEntryId).toBe('builtin:1_4:0.2500');
      expect(loadBushingEngineeringState().selectedIdReamerEntryId).toBe('builtin:3_16:0.1875');
      expect(loadBushingEngineeringState().activeComparePresetIds).toEqual(['baseline']);
      expect(loadBushingEngineeringState().sessionCustomReamerEntry?.sizeLabel).toBe('Custom Bore');
      expect(loadBushingEngineeringState().sessionCustomIdReamerEntry?.sizeLabel).toBe('Custom ID');

      const workspace = JSON.parse(storage.getItem(BUSHING_WORKSPACE_KEY_V1) ?? '{}');
      expect(workspace.ui).toEqual({ uxMode: 'advanced', workflowMode: 'review', useFreePositioning: true });
      expect(workspace.runtime).toEqual({ useLegacyRenderer: true, traceEnabled: true });
      expect(workspace.engineering.selectedReamerEntryId).toBe('builtin:1_4:0.2500');
      expect(workspace.engineering.selectedIdReamerEntryId).toBe('builtin:3_16:0.1875');
      expect(JSON.parse(storage.getItem(BUSHING_UI_KEY_V1) ?? '{}')).toEqual({ uxMode: 'advanced', workflowMode: 'review', useFreePositioning: true });
    });
  });

  test('falls back safely when workspace layout is malformed', () => {
    withMockWindow((storage) => {
      storage.setItem(BUSHING_WORKSPACE_KEY_V1, JSON.stringify({
        ui: { uxMode: 'guided', useFreePositioning: false },
        layout: {
          leftCardOrder: ['header', 'header'],
          rightCardOrder: ['drafting', 'summary', 'diagnostics']
        },
        diagnosticsOrder: ['edge'],
        dndEnabled: true,
        runtime: { useLegacyRenderer: false, traceEnabled: false }
      }));

      const layout = loadTopLevelLayout();
      expect(layout.leftCardOrder).toEqual(['header', 'guidance', 'setup', 'geometry', 'profile', 'process']);
      expect(layout.rightCardOrder).toEqual(['drafting', 'summary', 'diagnostics']);
    });
  });
});
