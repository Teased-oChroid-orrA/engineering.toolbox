<script lang="ts">
  import type { RecipeRunState, SurfaceRecipe, SurfaceRecipeStep } from './controllers/SurfaceRecipesController';

  export let recipes: SurfaceRecipe[] = [];
  export let selectedRecipeId: string | null = null;
  export let recipeNameDraft = '';
  export let stepConfirmed = true;
  export let runState: RecipeRunState | null = null;

  export let onSaveCurrent: () => void;
  export let onDeleteSelected: () => void;
  export let onSelectRecipe: (id: string) => void;
  export let onToggleStep: (step: SurfaceRecipeStep, enabled: boolean) => void;
  export let onStartRun: () => void;
  export let onRunNext: () => void;
  export let onCancelRun: () => void;

  const steps: SurfaceRecipeStep[] = ['compute_offset_intersection', 'compute_datum_slices', 'export_datum_combined'];
  const labels: Record<SurfaceRecipeStep, string> = {
    compute_offset_intersection: 'Offset intersection',
    compute_datum_slices: 'Datum slicing',
    export_datum_combined: 'Combined export'
  };

  $: selected = recipes.find((r) => r.id === selectedRecipeId) ?? null;
  const includes = (step: SurfaceRecipeStep) => Boolean(selected?.steps.includes(step));
</script>

<div class="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
  <div class="text-[11px] font-semibold uppercase tracking-widest text-white/60">Workspace Recipes</div>

  <div class="grid grid-cols-[1fr_auto] gap-2">
    <input class="input input-sm glass-input" placeholder="Recipe name" bind:value={recipeNameDraft} />
    <button class="btn btn-sm variant-soft" onclick={onSaveCurrent}>Save current</button>
  </div>

  <div class="grid grid-cols-[1fr_auto] gap-2 items-center">
    <select class="select select-sm glass-input" bind:value={selectedRecipeId} onchange={(e) => onSelectRecipe((e.currentTarget as HTMLSelectElement).value)}>
      <option value="">Select recipe</option>
      {#each recipes as r (r.id)}
        <option value={r.id}>{r.name}</option>
      {/each}
    </select>
    <button class="btn btn-sm variant-soft" onclick={onDeleteSelected} disabled={!selectedRecipeId}>Delete</button>
  </div>

  {#if selected}
    <div class="space-y-1">
      <div class="text-[10px] uppercase tracking-widest text-white/50">Steps</div>
      {#each steps as step (step)}
        <label class="flex items-center justify-between text-[11px] text-white/60">
          <span>{labels[step]}</span>
          <input type="checkbox" class="checkbox checkbox-xs" checked={includes(step)} onchange={(e) => onToggleStep(step, (e.currentTarget as HTMLInputElement).checked)} />
        </label>
      {/each}
    </div>
  {/if}

  <label class="flex items-center justify-between text-[11px] text-white/60">
    <span>Step-confirmed run</span>
    <input type="checkbox" class="checkbox checkbox-xs" bind:checked={stepConfirmed} />
  </label>

  <div class="grid grid-cols-3 gap-2">
    <button class="btn btn-xs variant-soft" onclick={onStartRun} disabled={!selected}>Run</button>
    <button class="btn btn-xs variant-soft" onclick={onRunNext} disabled={!runState || runState.status !== 'waiting'}>Run next</button>
    <button class="btn btn-xs variant-soft" onclick={onCancelRun} disabled={!runState || runState.status === 'done'}>Cancel</button>
  </div>

  {#if runState}
    <div class="rounded-lg border border-white/10 bg-black/20 px-2 py-2 text-[11px] text-white/70">
      <div>Status: {runState.status}</div>
      <div>Step: {Math.min(runState.nextStepIdx + 1, runState.totalSteps)}/{runState.totalSteps}</div>
      {#if runState.lastMessage}<div>{runState.lastMessage}</div>{/if}
      {#if runState.error}<div class="text-rose-200">{runState.error}</div>{/if}
    </div>
  {/if}
</div>
