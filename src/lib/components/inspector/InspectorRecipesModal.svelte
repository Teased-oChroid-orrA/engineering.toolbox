<script lang="ts">
  import { fade, scale } from 'svelte/transition';

  let {
    open = false,
    uiAnimDur = 160,
    floatingStyle = '',
    recipeNotice = null,
    recipeName = '',
    recipeTags = '',
    hasLoaded = false,
    importMode = 'current',
    recipes = [],
    onClose,
    onReset,
    onBeginDrag,
    onSetRecipeName,
    onSetRecipeTags,
    onSave,
    onExport,
    onImport,
    onSetImportMode,
    onToggleFavorite,
    onApply,
    onDelete
  } = $props<{
    open: boolean;
    uiAnimDur: number;
    floatingStyle: string;
    recipeNotice: string | null;
    recipeName: string;
    recipeTags: string;
    hasLoaded: boolean;
    importMode: 'current' | 'file';
    recipes: any[];
    onClose: () => void;
    onReset: () => void;
    onBeginDrag: (e: MouseEvent) => void;
    onSetRecipeName: (v: string) => void;
    onSetRecipeTags: (v: string) => void;
    onSave: () => void;
    onExport: () => void;
    onImport: (file: File, mode: 'current' | 'file') => Promise<void> | void;
    onSetImportMode: (v: 'current' | 'file') => void;
    onToggleFavorite: (id: string) => void;
    onApply: (r: any) => void;
    onDelete: (id: string) => void;
  }>();
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-6 relative" role="dialog" aria-modal="true" aria-label="Inspector recipes" tabindex="-1" transition:fade={{ duration: uiAnimDur }}>
    <button type="button" class="absolute inset-0 modal-backdrop p-0 m-0 border-0" onclick={onClose} aria-label="Close recipes dialog"></button>
    <div class="relative z-10 glass-panel w-full max-w-3xl rounded-2xl border border-white/10 p-5 inspector-pop-layer" transition:scale={{ duration: uiAnimDur, start: 0.96 }} style={floatingStyle}>
      <div class="mb-2 flex items-center justify-between gap-2 border-b border-white/10 pb-2 cursor-move" role="button" tabindex="0" onmousedown={onBeginDrag}>
        <span class="text-[11px] uppercase tracking-widest text-white/50">Drag</span>
        <button class="btn btn-xs variant-soft" onclick={onReset}>Reset position</button>
      </div>
      <div class="flex items-center justify-between gap-3">
        <div>
          <div class="text-sm font-semibold text-white">View Recipes</div>
          {#if recipeNotice}
            <div class="text-xs text-white/70 mt-1">{recipeNotice}</div>
          {/if}
        </div>
        <button class="btn btn-sm variant-soft" onclick={onClose}>Close</button>
      </div>
      <div class="mt-4 flex flex-wrap gap-2 items-end">
        <label class="flex-1 flex flex-col gap-1">
          <span class="text-[10px] uppercase tracking-widest text-white/50">New recipe name</span>
          <input class="input input-sm glass-input" value={recipeName} oninput={(e) => onSetRecipeName((e.currentTarget as HTMLInputElement).value)} />
        </label>
        <label class="w-full md:w-64 flex flex-col gap-1">
          <span class="text-[10px] uppercase tracking-widest text-white/50">Tags (comma-separated)</span>
          <input class="input input-sm glass-input" value={recipeTags} oninput={(e) => onSetRecipeTags((e.currentTarget as HTMLInputElement).value)} />
        </label>
        <button class="btn btn-sm variant-filled" onclick={onSave} disabled={!hasLoaded}>Save current</button>
      </div>
      <div class="mt-3 flex flex-wrap gap-2 items-center">
        <button class="btn btn-sm variant-soft" onclick={onExport} disabled={!hasLoaded}>Export…</button>
        <label class="btn btn-sm variant-soft cursor-pointer">
          Import…
          <input
            class="hidden"
            type="file"
            accept="application/json"
            onchange={async (e) => {
              const f = (e.currentTarget as HTMLInputElement).files?.[0];
              if (!f) return;
              await onImport(f, importMode);
              (e.currentTarget as HTMLInputElement).value = '';
            }}
          />
        </label>
        <div class="flex items-center gap-2 text-xs text-white/60">
          <span>Import mode:</span>
          <select class="select select-sm glass-input" value={importMode} onchange={(e) => onSetImportMode((e.currentTarget as HTMLSelectElement).value as 'current' | 'file')}>
            <option value="current">to current dataset</option>
            <option value="file">to file's datasetId</option>
          </select>
        </div>
      </div>
      <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[50vh] overflow-auto pr-1">
        {#if (recipes?.length ?? 0) === 0}
          <div class="text-sm text-white/55">No recipes saved yet.</div>
        {:else}
          {#each recipes as r (r.id)}
            <div class="glass-panel rounded-xl border border-white/10 p-4 inspector-pop-sub">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <div class="text-xs font-semibold text-white/85">{r.favorite ? '★ ' : ''}{r.name}</div>
                  <div class="mt-1 text-[11px] text-white/55">{new Date(r.createdAt).toLocaleString()}</div>
                </div>
                <div class="flex gap-2">
                  <button class="btn btn-xs variant-soft" onclick={() => onToggleFavorite(r.id)}>★</button>
                  <button class="btn btn-xs variant-soft" onclick={() => onApply(r)} disabled={!hasLoaded}>Apply</button>
                  <button class="btn btn-xs variant-soft" onclick={() => onDelete(r.id)}>Delete</button>
                </div>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  </div>
{/if}
