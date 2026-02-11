import {
  advanceRecipeRunUntilPause,
  createRecipeRun,
  finalizeRecipeTransaction,
  findRecipeForRun,
  recipeStepLabel,
  rollbackRecipeTransaction,
  toStatusFromIntersection,
  toStatusFromSliceWarnings,
  type RecipeRunState,
  type RecipeTransaction,
  type SurfaceRecipe,
  type SurfaceRecipeStep
} from '../SurfaceOrchestratorDeps';

type RecipeRunCtx = {
  getRecipeRun: () => RecipeRunState | null;
  setRecipeRun: (v: RecipeRunState | null) => void;
  getRecipes: () => SurfaceRecipe[];
  getSelectedRecipe: () => SurfaceRecipe | null;
  getRecipeStepConfirmed: () => boolean;
  getRecipeTx: () => RecipeTransaction | null;
  setRecipeTx: (v: RecipeTransaction | null) => void;
  beginRecipeTransaction: () => RecipeTransaction;
  getCurrentSnapshot: () => any;
  applySnapshot: (s: any) => void;
  getUndoRedoStacks: () => { undoStack: any[]; redoStack: any[] };
  setUndoRedoStacks: (v: { undoStack: any[]; redoStack: any[] }) => void;
  applyRecipeConfig: (cfg: any) => void;
  calcOffsetIntersection: () => Promise<void>;
  computeDatumSlices: () => Promise<void>;
  exportDatumSliceCombined: () => void;
  getDatumSliceRes: () => any;
  getIntersectionDiagnostics: () => any;
  emitStatusWarnings: (incoming: any[]) => void;
  getDatumSliceErr: () => string | null;
};

async function runRecipeStep(ctx: RecipeRunCtx, recipe: SurfaceRecipe, step: SurfaceRecipeStep): Promise<string> {
  ctx.applyRecipeConfig(recipe.config);
  if (step === 'compute_offset_intersection') {
    await ctx.calcOffsetIntersection();
    ctx.emitStatusWarnings(toStatusFromIntersection(ctx.getIntersectionDiagnostics()));
    return recipeStepLabel(step);
  }
  if (step === 'compute_datum_slices') {
    await ctx.computeDatumSlices();
    if (ctx.getDatumSliceRes()) ctx.emitStatusWarnings(toStatusFromSliceWarnings(ctx.getDatumSliceRes().warnings));
    return recipeStepLabel(step);
  }
  if (!ctx.getDatumSliceRes()) await ctx.computeDatumSlices();
  ctx.exportDatumSliceCombined();
  return recipeStepLabel(step);
}

export async function runRecipeUntilPauseUi(ctx: RecipeRunCtx): Promise<void> {
  const currentRun = ctx.getRecipeRun();
  if (!currentRun) return;
  const recipe = findRecipeForRun(ctx.getRecipes(), currentRun);
  if (!recipe) {
    ctx.setRecipeTx(null);
    ctx.setRecipeRun({ ...currentRun, status: 'failed', error: 'Recipe not found.', lastMessage: null });
    return;
  }

  const out = await advanceRecipeRunUntilPause({
    currentRun,
    recipe,
    executeStep: async (r, step) => runRecipeStep(ctx, r, step)
  });
  ctx.setRecipeRun(out.run);
  if (out.failed) {
    const tx = ctx.getRecipeTx();
    if (tx) {
      ctx.applySnapshot(rollbackRecipeTransaction(tx));
      ctx.setRecipeTx(null);
    }
    ctx.emitStatusWarnings([
      {
        id: `recipe:error:${Date.now()}`,
        when: new Date().toISOString(),
        source: 'recipe',
        severity: 'error',
        code: 'RECIPE_STEP_FAILED',
        message: out.error ?? 'Recipe step failed.'
      }
    ]);
    return;
  }
  const tx = ctx.getRecipeTx();
  if (tx) {
    const outTx = finalizeRecipeTransaction({
      tx,
      current: ctx.getCurrentSnapshot(),
      stacks: ctx.getUndoRedoStacks(),
      historyLimit: 100
    });
    ctx.setUndoRedoStacks(outTx.stacks);
    ctx.setRecipeTx(null);
  }
}

export async function startRecipeRunUi(ctx: RecipeRunCtx): Promise<void> {
  const recipe = ctx.getSelectedRecipe();
  if (!recipe) return;
  ctx.setRecipeTx(ctx.beginRecipeTransaction());
  ctx.setRecipeRun(createRecipeRun(recipe, ctx.getRecipeStepConfirmed()));
  if (!ctx.getRecipeStepConfirmed()) await runRecipeUntilPauseUi(ctx);
}

export async function runRecipeNextStepUi(ctx: RecipeRunCtx): Promise<void> {
  const run = ctx.getRecipeRun();
  if (!run || run.status !== 'waiting') return;
  await runRecipeUntilPauseUi(ctx);
}

export function cancelRecipeRunUi(ctx: RecipeRunCtx): void {
  const run = ctx.getRecipeRun();
  if (!run) return;
  const tx = ctx.getRecipeTx();
  if (tx) {
    ctx.applySnapshot(rollbackRecipeTransaction(tx));
    ctx.setRecipeTx(null);
  }
  ctx.setRecipeRun({ ...run, status: 'failed', error: 'Cancelled by user.' });
}
