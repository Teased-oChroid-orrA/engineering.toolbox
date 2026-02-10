import type { RecipeRunState, SurfaceRecipe, SurfaceRecipeStep } from './SurfaceRecipesController';

export type RecipeStepExecutor = (recipe: SurfaceRecipe, step: SurfaceRecipeStep) => Promise<string>;

export type RecipeRunAdvanceResult = {
  run: RecipeRunState;
  failed: boolean;
  error: string | null;
};

export function findRecipeForRun(recipes: SurfaceRecipe[], run: RecipeRunState) {
  return recipes.find((r) => r.id === run.recipeId) ?? null;
}

export async function advanceRecipeRunUntilPause(args: {
  currentRun: RecipeRunState;
  recipe: SurfaceRecipe;
  executeStep: RecipeStepExecutor;
}): Promise<RecipeRunAdvanceResult> {
  let run: RecipeRunState = { ...args.currentRun, status: 'running', error: null };

  while (run.nextStepIdx < run.totalSteps) {
    const step = args.recipe.steps[run.nextStepIdx];
    try {
      const msg = await args.executeStep(args.recipe, step);
      run = {
        ...run,
        nextStepIdx: run.nextStepIdx + 1,
        lastMessage: msg,
        status: run.stepConfirmed ? 'waiting' : 'running'
      };
      if (run.stepConfirmed && run.nextStepIdx < run.totalSteps) {
        return { run, failed: false, error: null };
      }
    } catch (e: any) {
      const err = e?.message ? String(e.message) : String(e);
      return {
        run: { ...run, status: 'failed', error: err },
        failed: true,
        error: err
      };
    }
  }

  return {
    run: { ...run, status: 'done' },
    failed: false,
    error: null
  };
}
