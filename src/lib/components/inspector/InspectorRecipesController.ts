import { dedupeRecipesById, migrateRecipeState } from '$lib/components/inspector/InspectorDataStore';
import type { RecipeStateV3 } from '$lib/components/inspector/InspectorDataStore';
import { safeLocalStorageGet, safeLocalStorageSet } from '$lib/components/inspector/InspectorUtilsController';

export { dedupeRecipesById, migrateRecipeState };

export type RecipeState = {
  query: string;
  matchMode: 'fuzzy' | 'exact' | 'regex';
  targetColIdx: number | null;
  maxRowsScanText: string;
  numericF?: { enabled: boolean; colIdx: number | null; minText: string; maxText: string };
  dateF?: { enabled: boolean; colIdx: number | null; minIso: string; maxIso: string };
  catF?: { enabled: boolean; colIdx: number | null; selected: string[] };
  sortColIdx: number | null;
  sortDir: 'asc' | 'desc';
  sortSpecs?: { colIdx: number; dir: 'asc' | 'desc' }[];
  multiQueryEnabled?: boolean;
  multiQueryExpanded?: boolean;
  multiQueryClauses?: { id: string; query: string; mode: 'fuzzy' | 'exact' | 'regex' }[];
  visibleColumns: number[];
  pinnedLeft?: number[];
  pinnedRight?: number[];
  hiddenColumns?: number[];
  columnWidths?: Record<number, number>;
  version?: 3;
  autoRestore?: boolean;
};

export type Recipe = {
  id: string;
  name: string;
  createdAt: number;
  state: RecipeState;
  tags?: string[];
  favorite?: boolean;
  templateVars?: string[];
  provenance?: { datasetId: string; datasetLabel: string; createdAt: number };
};

export const normalizeRecipeTags = (value: string) =>
  (value ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

export type DatasetRecipePack = { label: string; recipes: Recipe[] };
export type RecipesStore = { v: 3; datasets: Record<string, DatasetRecipePack> };
export type LastStateStore = { v: 3; datasets: Record<string, { autoRestore: boolean; state: RecipeState }> };

export function getRecipesStore(recipesKey: string, legacyKeys: string[]): RecipesStore {
  const raw = safeLocalStorageGet(recipesKey);
  if (!raw) {
    for (const k of legacyKeys) {
      const legacy = safeLocalStorageGet(k);
      if (!legacy) continue;
      try {
        const obj = JSON.parse(legacy);
        if (obj && typeof obj.datasets === 'object') {
          return { v: 3, datasets: obj.datasets ?? {} };
        }
      } catch {}
    }
    return { v: 3, datasets: {} };
  }
  try {
    const obj = JSON.parse(raw);
    if (obj && obj.v === 3 && typeof obj.datasets === 'object') return obj as RecipesStore;
  } catch {}
  return { v: 3, datasets: {} };
}

export function setRecipesStore(recipesKey: string, store: RecipesStore) {
  safeLocalStorageSet(recipesKey, JSON.stringify(store));
}

export function loadRecipesForDataset(recipesKey: string, legacyKeys: string[], dsId: string): Recipe[] {
  if (!dsId) return [];
  const store = getRecipesStore(recipesKey, legacyKeys);
  return dedupeRecipesById(store.datasets?.[dsId]?.recipes ?? []);
}

export function persistRecipesForDataset(
  recipesKey: string,
  legacyKeys: string[],
  dsId: string,
  label: string,
  rs: Recipe[]
) {
  if (!dsId) return;
  const store = getRecipesStore(recipesKey, legacyKeys);
  store.datasets = store.datasets ?? {};
  store.datasets[dsId] = {
    label: label || store.datasets?.[dsId]?.label || dsId,
    recipes: dedupeRecipesById(rs ?? []).slice(0, 200)
  };
  setRecipesStore(recipesKey, store);
}

export function getLastStateStore(lastKey: string, legacyKeys: string[]): LastStateStore {
  const raw = safeLocalStorageGet(lastKey);
  if (!raw) {
    for (const k of legacyKeys) {
      const legacy = safeLocalStorageGet(k);
      if (!legacy) continue;
      try {
        const obj = JSON.parse(legacy);
        if (obj && typeof obj.datasets === 'object') {
          const migrated: LastStateStore = { v: 3, datasets: {} };
          for (const [ds, st] of Object.entries(obj.datasets as Record<string, unknown>)) {
            const next = migrateRecipeState(st);
            if (!next) continue;
            migrated.datasets[ds] = { autoRestore: true, state: next };
          }
          return migrated;
        }
      } catch {}
    }
    return { v: 3, datasets: {} };
  }
  try {
    const obj = JSON.parse(raw);
    if (obj && obj.v === 3 && typeof obj.datasets === 'object') return obj as LastStateStore;
  } catch {}
  return { v: 3, datasets: {} };
}

export function setLastStateStore(lastKey: string, store: LastStateStore) {
  safeLocalStorageSet(lastKey, JSON.stringify(store));
}

export function loadLastStateForDataset(lastKey: string, legacyKeys: string[], dsId: string): { state: RecipeState | null; autoRestore: boolean } {
  if (!dsId) return { state: null, autoRestore: true };
  const store = getLastStateStore(lastKey, legacyKeys);
  const entry = store.datasets?.[dsId];
  if (!entry || !entry.autoRestore) return { state: null, autoRestore: true };
  const st = migrateRecipeState((entry as any).state);
  return { state: (st as unknown as RecipeState) ?? null, autoRestore: !!entry.autoRestore };
}

export function persistLastStateForDataset(lastKey: string, legacyKeys: string[], dsId: string, st: RecipeState, autoRestoreEnabled: boolean) {
  if (!dsId) return;
  const store = getLastStateStore(lastKey, legacyKeys);
  store.datasets = store.datasets ?? {};
  store.datasets[dsId] = {
    autoRestore: !!autoRestoreEnabled,
    state: { ...st, version: 3, autoRestore: !!autoRestoreEnabled }
  };
  setLastStateStore(lastKey, store);
}

export function newRecipeId() {
  return Math.random().toString(16).slice(2) + '-' + Date.now().toString(16);
}

export function downloadText(name: string, text: string, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function migrateAndNormalizeRecipeState(st: RecipeState | RecipeStateV3 | unknown): RecipeState | null {
  const migrated = migrateRecipeState(st as RecipeStateV3);
  return (migrated as unknown as RecipeState) ?? null;
}

export function buildRecipeExportBlob(args: {
  datasetId: string;
  datasetLabel: string;
  recipes: Recipe[];
}) {
  return {
    v: 2,
    kind: 'inspector_recipes',
    exportedAt: Date.now(),
    datasetId: args.datasetId,
    datasetLabel: args.datasetLabel,
    recipes: args.recipes ?? []
  };
}

export function mergeImportedRecipes(args: {
  payload: any;
  targetId: string;
  targetLabel: string;
  existing: Recipe[];
}) {
  const seen = new Set(args.existing.map((r) => r.id));
  const incoming: Recipe[] = (args.payload?.recipes ?? []).map((r: any) => {
    const migrated = migrateAndNormalizeRecipeState(r?.state);
    if (!migrated) return null as any;
    const rr: Recipe = {
      id: typeof r.id === 'string' ? r.id : newRecipeId(),
      name: typeof r.name === 'string' ? r.name : 'Imported',
      createdAt: typeof r.createdAt === 'number' ? r.createdAt : Date.now(),
      state: migrated,
      tags: Array.isArray(r.tags) ? r.tags.filter((x: unknown) => typeof x === 'string') : [],
      favorite: !!r.favorite,
      templateVars: Array.isArray(r.templateVars) ? r.templateVars.filter((x: unknown) => typeof x === 'string') : [],
      provenance: r.provenance && typeof r.provenance === 'object'
        ? {
            datasetId: String((r.provenance as any).datasetId ?? args.targetId),
            datasetLabel: String((r.provenance as any).datasetLabel ?? args.targetLabel),
            createdAt: Number((r.provenance as any).createdAt ?? Date.now())
          }
        : { datasetId: args.targetId, datasetLabel: args.targetLabel, createdAt: Date.now() }
    };
    if (seen.has(rr.id)) rr.id = newRecipeId();
    seen.add(rr.id);
    return rr;
  }).filter(Boolean);
  return dedupeRecipesById([...incoming, ...args.existing]).slice(0, 200);
}

export function toCsvText(headers: string[], rows: string[][]) {
  const csvEscape = (v: string) => {
    const t = String(v ?? '');
    return /[",\n]/.test(t) ? `"${t.replaceAll('"', '""')}"` : t;
  };
  const lines = [headers.map(csvEscape).join(',')];
  for (const r of rows) lines.push(r.map(csvEscape).join(','));
  return lines.join('\n');
}

export function captureRecipeState(args: {
  autoRestoreEnabled: boolean;
  query: string;
  matchMode: 'fuzzy' | 'exact' | 'regex';
  targetColIdx: number | null;
  maxRowsScanText: string;
  numericF: { enabled: boolean; colIdx: number | null; minText: string; maxText: string };
  dateF: { enabled: boolean; colIdx: number | null; minIso: string; maxIso: string };
  catF: { enabled: boolean; colIdx: number | null; selected: Set<string> };
  sortColIdx: number | null;
  sortDir: 'asc' | 'desc';
  sortSpecs: { colIdx: number; dir: 'asc' | 'desc' }[];
  multiQueryEnabled?: boolean;
  multiQueryExpanded?: boolean;
  multiQueryClauses?: { id: string; query: string; mode: 'fuzzy' | 'exact' | 'regex' }[];
  visibleColumns: Set<number>;
  pinnedLeft: number[];
  pinnedRight: number[];
  hiddenColumns: number[];
  columnWidths: Record<number, number>;
}): RecipeState {
  return {
    version: 3,
    autoRestore: !!args.autoRestoreEnabled,
    query: args.query ?? '',
    matchMode: args.matchMode,
    targetColIdx: args.targetColIdx,
    maxRowsScanText: args.maxRowsScanText ?? '',
    numericF: { enabled: !!args.numericF.enabled, colIdx: args.numericF.colIdx, minText: args.numericF.minText ?? '', maxText: args.numericF.maxText ?? '' },
    dateF: { enabled: !!args.dateF.enabled, colIdx: args.dateF.colIdx, minIso: args.dateF.minIso ?? '', maxIso: args.dateF.maxIso ?? '' },
    catF: { enabled: !!args.catF.enabled, colIdx: args.catF.colIdx, selected: [...(args.catF.selected ?? new Set<string>())] },
    sortColIdx: args.sortColIdx,
    sortDir: args.sortDir,
    sortSpecs: [...(args.sortSpecs ?? [])],
    multiQueryEnabled: !!args.multiQueryEnabled,
    multiQueryExpanded: !!args.multiQueryExpanded,
    multiQueryClauses: [...(args.multiQueryClauses ?? [])].map((c) => ({
      id: String(c.id ?? ''),
      query: String(c.query ?? ''),
      mode: c.mode === 'exact' || c.mode === 'regex' ? c.mode : 'fuzzy'
    })),
    visibleColumns: [...(args.visibleColumns ?? new Set<number>())],
    pinnedLeft: [...(args.pinnedLeft ?? [])],
    pinnedRight: [...(args.pinnedRight ?? [])],
    hiddenColumns: [...(args.hiddenColumns ?? [])],
    columnWidths: { ...(args.columnWidths ?? {}) }
  };
}
