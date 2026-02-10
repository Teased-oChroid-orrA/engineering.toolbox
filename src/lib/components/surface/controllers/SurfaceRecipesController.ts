import type { DatumSliceMode } from './SurfaceSlicingExportController';

export type SurfaceRecipeStep =
  | 'compute_offset_intersection'
  | 'compute_datum_slices'
  | 'export_datum_combined';

export type SurfaceRecipeConfig = {
  selEdgeA: number | null;
  selEdgeB: number | null;
  offsetDist: number;
  refPointIdx: number;
  datumSlicePlaneIdx: number;
  datumSliceMode: DatumSliceMode;
  datumSliceSpacing: number;
  datumSliceCount: number;
  datumSliceThickness: number;
  datumSliceUseSelection: boolean;
  includeOptionalSliceColumns: boolean;
};

export type SurfaceRecipe = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  steps: SurfaceRecipeStep[];
  config: SurfaceRecipeConfig;
};

type WorkspaceRecipes = {
  updatedAt: string;
  recipes: SurfaceRecipe[];
};

type RecipeStoreV2 = {
  v: 2;
  workspaces: Record<string, WorkspaceRecipes>;
};

const STORE_KEY_V2 = 'sc.surface.recipes.v2';
const STORE_KEY_V1 = 'sc.surface.recipes';

export const DEFAULT_RECIPE_STEPS: SurfaceRecipeStep[] = [
  'compute_offset_intersection',
  'compute_datum_slices',
  'export_datum_combined'
];

function safeWindow(): Window | null {
  return typeof window !== 'undefined' ? window : null;
}

function nowIso() {
  return new Date().toISOString();
}

function uid() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeSteps(steps: SurfaceRecipeStep[] | unknown): SurfaceRecipeStep[] {
  const valid = new Set<SurfaceRecipeStep>(DEFAULT_RECIPE_STEPS);
  const arr = Array.isArray(steps) ? steps.filter((s): s is SurfaceRecipeStep => typeof s === 'string' && valid.has(s as SurfaceRecipeStep)) : [];
  const unique = Array.from(new Set(arr));
  return unique.length > 0 ? unique : [...DEFAULT_RECIPE_STEPS];
}

function normalizeRecipe(raw: any): SurfaceRecipe | null {
  if (!raw || typeof raw !== 'object') return null;
  const name = String(raw.name ?? '').trim();
  if (!name) return null;
  const cfg = raw.config ?? {};
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : uid(),
    name,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : nowIso(),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : nowIso(),
    steps: normalizeSteps(raw.steps),
    config: {
      selEdgeA: Number.isInteger(cfg.selEdgeA) ? cfg.selEdgeA : null,
      selEdgeB: Number.isInteger(cfg.selEdgeB) ? cfg.selEdgeB : null,
      offsetDist: Number(cfg.offsetDist ?? 0),
      refPointIdx: Number.isInteger(cfg.refPointIdx) ? cfg.refPointIdx : 0,
      datumSlicePlaneIdx: Number.isInteger(cfg.datumSlicePlaneIdx) ? cfg.datumSlicePlaneIdx : 0,
      datumSliceMode: cfg.datumSliceMode === 'fixed_count' ? 'fixed_count' : 'fixed_spacing',
      datumSliceSpacing: Number(cfg.datumSliceSpacing ?? 5),
      datumSliceCount: Number(cfg.datumSliceCount ?? 24),
      datumSliceThickness: Number(cfg.datumSliceThickness ?? 0),
      datumSliceUseSelection: Boolean(cfg.datumSliceUseSelection ?? true),
      includeOptionalSliceColumns: Boolean(cfg.includeOptionalSliceColumns ?? false)
    }
  };
}

function parseV2(raw: unknown): RecipeStoreV2 | null {
  if (!raw || typeof raw !== 'object') return null;
  const x = raw as any;
  if (x.v !== 2 || typeof x.workspaces !== 'object' || !x.workspaces) return null;
  const workspaces: Record<string, WorkspaceRecipes> = {};
  for (const [wk, value] of Object.entries(x.workspaces as Record<string, any>)) {
    const recipes = Array.isArray(value?.recipes)
      ? (value.recipes as unknown[]).map(normalizeRecipe).filter((r): r is SurfaceRecipe => Boolean(r))
      : [];
    workspaces[wk] = {
      updatedAt: typeof value?.updatedAt === 'string' ? value.updatedAt : nowIso(),
      recipes
    };
  }
  return { v: 2, workspaces };
}

function parseLegacyV1(raw: unknown): RecipeStoreV2 | null {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    const recipes = raw.map(normalizeRecipe).filter((r): r is SurfaceRecipe => Boolean(r));
    return {
      v: 2,
      workspaces: {
        'surface.main': { updatedAt: nowIso(), recipes }
      }
    };
  }
  if (typeof raw === 'object') {
    const x = raw as any;
    if (Array.isArray(x.recipes)) {
      const recipes = (x.recipes as unknown[]).map(normalizeRecipe).filter((r): r is SurfaceRecipe => Boolean(r));
      return {
        v: 2,
        workspaces: {
          'surface.main': { updatedAt: nowIso(), recipes }
        }
      };
    }
  }
  return null;
}

export function loadWorkspaceRecipes(workspaceKey: string) {
  const w = safeWindow();
  if (!w) return { recipes: [] as SurfaceRecipe[], migrated: false };

  let migrated = false;
  let store: RecipeStoreV2 | null = null;
  try {
    const rawV2 = w.localStorage.getItem(STORE_KEY_V2);
    store = rawV2 ? parseV2(JSON.parse(rawV2)) : null;
  } catch {
    store = null;
  }

  if (!store) {
    try {
      const rawV1 = w.localStorage.getItem(STORE_KEY_V1);
      const parsed = rawV1 ? parseLegacyV1(JSON.parse(rawV1)) : null;
      if (parsed) {
        store = parsed;
        migrated = true;
        w.localStorage.setItem(STORE_KEY_V2, JSON.stringify(store));
      }
    } catch {
      // no-op
    }
  }

  if (!store) return { recipes: [] as SurfaceRecipe[], migrated };
  return { recipes: [...(store.workspaces[workspaceKey]?.recipes ?? [])], migrated };
}

export function saveWorkspaceRecipes(workspaceKey: string, recipes: SurfaceRecipe[]) {
  const w = safeWindow();
  if (!w) return;
  let base: RecipeStoreV2 = { v: 2, workspaces: {} };
  try {
    const parsed = parseV2(JSON.parse(w.localStorage.getItem(STORE_KEY_V2) ?? 'null'));
    if (parsed) base = parsed;
  } catch {
    // no-op
  }
  base.workspaces[workspaceKey] = {
    updatedAt: nowIso(),
    recipes: recipes.slice(0, 200)
  };
  try {
    w.localStorage.setItem(STORE_KEY_V2, JSON.stringify(base));
  } catch {
    // no-op
  }
}

export function createRecipe(name: string, config: SurfaceRecipeConfig, steps: SurfaceRecipeStep[] = DEFAULT_RECIPE_STEPS): SurfaceRecipe {
  const ts = nowIso();
  return {
    id: uid(),
    name: name.trim() || `Recipe ${new Date().toLocaleString()}`,
    createdAt: ts,
    updatedAt: ts,
    steps: normalizeSteps(steps),
    config: { ...config }
  };
}

export function upsertRecipe(list: SurfaceRecipe[], recipe: SurfaceRecipe) {
  const idx = list.findIndex((r) => r.id === recipe.id);
  const next = [...list];
  const merged: SurfaceRecipe = {
    ...recipe,
    updatedAt: nowIso(),
    steps: normalizeSteps(recipe.steps)
  };
  if (idx >= 0) next[idx] = merged;
  else next.unshift(merged);
  return next.slice(0, 200);
}

export function deleteRecipe(list: SurfaceRecipe[], id: string) {
  return list.filter((r) => r.id !== id);
}

export function toggleRecipeStep(recipe: SurfaceRecipe, step: SurfaceRecipeStep, enabled: boolean): SurfaceRecipe {
  const set = new Set(recipe.steps);
  if (enabled) set.add(step);
  else set.delete(step);
  return { ...recipe, steps: normalizeSteps(Array.from(set)) };
}

export type RecipeRunState = {
  recipeId: string;
  stepConfirmed: boolean;
  nextStepIdx: number;
  totalSteps: number;
  status: 'waiting' | 'running' | 'failed' | 'done';
  lastMessage: string | null;
  error: string | null;
};

export function createRecipeRun(recipe: SurfaceRecipe, stepConfirmed: boolean): RecipeRunState {
  return {
    recipeId: recipe.id,
    stepConfirmed,
    nextStepIdx: 0,
    totalSteps: recipe.steps.length,
    status: stepConfirmed ? 'waiting' : 'running',
    lastMessage: null,
    error: null
  };
}

export function recipeStepLabel(step: SurfaceRecipeStep) {
  if (step === 'compute_offset_intersection') return 'Compute offset intersection';
  if (step === 'compute_datum_slices') return 'Compute datum slices';
  return 'Export combined CSV + JSON';
}
