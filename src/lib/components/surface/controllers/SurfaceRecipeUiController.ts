import {
  createRecipe,
  deleteRecipe,
  DEFAULT_RECIPE_STEPS,
  toggleRecipeStep,
  upsertRecipe,
  type SurfaceRecipe,
  type SurfaceRecipeConfig,
  type SurfaceRecipeStep
} from './SurfaceRecipesController';

type RecipeCtx = {
  getSelEdgeA: () => number | null;
  getSelEdgeB: () => number | null;
  getOffsetDist: () => number;
  getRefPointIdx: () => number;
  getDatumSlicePlaneIdx: () => number;
  getDatumSliceMode: () => any;
  getDatumSliceSpacing: () => number;
  getDatumSliceCount: () => number;
  getDatumSliceThickness: () => number;
  getDatumSliceUseSelection: () => boolean;
  getIncludeOptionalSliceColumns: () => boolean;
  setRecipeNameDraft: (v: string) => void;
  getRecipeNameDraft: () => string;
  getRecipes: () => SurfaceRecipe[];
  setRecipes: (v: SurfaceRecipe[]) => void;
  getSelectedRecipeId: () => string | null;
  setSelectedRecipeId: (v: string | null) => void;
  setRecipeRun: (v: any) => void;
  setSelEdgeA: (v: number | null) => void;
  setSelEdgeB: (v: number | null) => void;
  setOffsetDist: (v: number) => void;
  setRefPointIdx: (v: number) => void;
  setDatumSlicePlaneIdx: (v: number) => void;
  setDatumSliceMode: (v: any) => void;
  setDatumSliceSpacing: (v: number) => void;
  setDatumSliceCount: (v: number) => void;
  setDatumSliceThickness: (v: number) => void;
  setDatumSliceUseSelection: (v: boolean) => void;
  setIncludeOptionalSliceColumns: (v: boolean) => void;
};

export function snapshotRecipeConfig(ctx: RecipeCtx): SurfaceRecipeConfig {
  return {
    selEdgeA: ctx.getSelEdgeA(),
    selEdgeB: ctx.getSelEdgeB(),
    offsetDist: ctx.getOffsetDist(),
    refPointIdx: ctx.getRefPointIdx(),
    datumSlicePlaneIdx: ctx.getDatumSlicePlaneIdx(),
    datumSliceMode: ctx.getDatumSliceMode(),
    datumSliceSpacing: ctx.getDatumSliceSpacing(),
    datumSliceCount: ctx.getDatumSliceCount(),
    datumSliceThickness: ctx.getDatumSliceThickness(),
    datumSliceUseSelection: ctx.getDatumSliceUseSelection(),
    includeOptionalSliceColumns: ctx.getIncludeOptionalSliceColumns()
  };
}

export function applyRecipeConfig(ctx: RecipeCtx, cfg: SurfaceRecipeConfig): void {
  ctx.setSelEdgeA(cfg.selEdgeA);
  ctx.setSelEdgeB(cfg.selEdgeB);
  ctx.setOffsetDist(cfg.offsetDist);
  ctx.setRefPointIdx(cfg.refPointIdx);
  ctx.setDatumSlicePlaneIdx(cfg.datumSlicePlaneIdx);
  ctx.setDatumSliceMode(cfg.datumSliceMode);
  ctx.setDatumSliceSpacing(cfg.datumSliceSpacing);
  ctx.setDatumSliceCount(cfg.datumSliceCount);
  ctx.setDatumSliceThickness(cfg.datumSliceThickness);
  ctx.setDatumSliceUseSelection(cfg.datumSliceUseSelection);
  ctx.setIncludeOptionalSliceColumns(cfg.includeOptionalSliceColumns);
}

export function selectedRecipe(recipes: SurfaceRecipe[], id: string | null): SurfaceRecipe | null {
  return recipes.find((r) => r.id === id) ?? null;
}

export function saveCurrentRecipe(ctx: RecipeCtx): void {
  const recipes = ctx.getRecipes();
  const selected = selectedRecipe(recipes, ctx.getSelectedRecipeId());
  const cfg = snapshotRecipeConfig(ctx);
  if (selected) {
    const updated: SurfaceRecipe = {
      ...selected,
      name: ctx.getRecipeNameDraft().trim() || selected.name,
      config: cfg
    };
    ctx.setRecipes(upsertRecipe(recipes, updated));
    ctx.setRecipeNameDraft(updated.name);
    return;
  }
  const created = createRecipe(ctx.getRecipeNameDraft(), cfg, DEFAULT_RECIPE_STEPS);
  ctx.setRecipes(upsertRecipe(recipes, created));
  ctx.setSelectedRecipeId(created.id);
  ctx.setRecipeNameDraft(created.name);
}

export function deleteSelectedRecipe(ctx: RecipeCtx): void {
  const selectedId = ctx.getSelectedRecipeId();
  if (!selectedId) return;
  ctx.setRecipes(deleteRecipe(ctx.getRecipes(), selectedId));
  ctx.setSelectedRecipeId(null);
  ctx.setRecipeRun(null);
}

export function selectRecipe(ctx: RecipeCtx, id: string): void {
  ctx.setSelectedRecipeId(id || null);
  const recipe = selectedRecipe(ctx.getRecipes(), id || null);
  if (!recipe) {
    ctx.setRecipeNameDraft('');
    return;
  }
  ctx.setRecipeNameDraft(recipe.name);
  applyRecipeConfig(ctx, recipe.config);
}

export function toggleSelectedRecipeStep(
  ctx: RecipeCtx,
  step: SurfaceRecipeStep,
  enabled: boolean
): void {
  const recipe = selectedRecipe(ctx.getRecipes(), ctx.getSelectedRecipeId());
  if (!recipe) return;
  ctx.setRecipes(upsertRecipe(ctx.getRecipes(), toggleRecipeStep(recipe, step, enabled)));
}
