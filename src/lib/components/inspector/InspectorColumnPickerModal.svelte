<script lang="ts">
  let {
    open = false,
    uiAnimDur = 160,
    headers = [],
    visibleColumns = new Set<number>(),
    columnPickerNotice = null,
    onClose,
    onSmartSelect,
    onSelectAll,
    onAutoDefault,
    onToggle
  } = $props<{
    open: boolean;
    uiAnimDur: number;
    headers: string[];
    visibleColumns: Set<number>;
    columnPickerNotice: string | null;
    onClose: () => void;
    onSmartSelect: () => void;
    onSelectAll: () => void;
    onAutoDefault: () => void;
    onToggle: (idx: number) => void;
  }>();
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-6 relative" transition:fade={{ duration: uiAnimDur }}>
    <button type="button" class="absolute inset-0 modal-backdrop p-0 m-0 border-0" onclick={onClose} aria-label="Close column picker"></button>
    <div class="relative z-10 glass-panel w-full max-w-3xl rounded-2xl border border-white/10 p-5" transition:scale={{ duration: uiAnimDur, start: 0.96 }}>
      <div class="flex items-center justify-between gap-3">
        <div>
          <div class="text-sm font-semibold text-white">Column Picker</div>
          {#if columnPickerNotice}
            <div class="text-xs text-green-200/80 mt-1">{columnPickerNotice}</div>
          {/if}
        </div>
        <button class="btn btn-sm variant-soft" onclick={onClose}>Close</button>
      </div>
      <div class="mt-4 flex flex-wrap gap-2">
        <button class="btn btn-sm variant-soft" onclick={onSmartSelect}>Smart select</button>
        <button class="btn btn-sm variant-soft" onclick={onSelectAll}>Select all</button>
        <button class="btn btn-sm variant-soft" onclick={onAutoDefault}>Auto/default</button>
      </div>
      <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[50vh] overflow-auto pr-1">
        {#each headers as h, i (i)}
          <label class="flex items-center gap-2 px-2 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/7">
            <input class="checkbox checkbox-sm" type="checkbox" checked={visibleColumns.has(i)} onchange={() => onToggle(i)} />
            <span class="text-xs text-white/80 truncate">{i}. {h}</span>
          </label>
        {/each}
      </div>
    </div>
  </div>
{/if}
