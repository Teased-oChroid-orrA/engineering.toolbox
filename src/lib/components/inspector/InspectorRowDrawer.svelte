<script lang="ts">
  import NumberFlow from '@number-flow/svelte';

  type KeyValue = { key: string; value: string; idx: number | null; type: 'numeric' | 'date' | 'string' | null };
  type Explain = { passes: boolean; reasons: string[]; sourceRowIdx: number } | null;

  let {
    open = false,
    uiAnimDur = 160,
    drawerVisualIdx = null,
    totalFilteredCount = 0,
    drawerSearch = '',
    drawerLoading = false,
    drawerError = null,
    drawerList = [],
    drawerExplain = null,
    onClose,
    onNavRow,
    onCopyJson,
    onSetSearch,
    onApplyTarget,
    onApplyCategory,
    onApplyNumeric,
    onApplyDate
  } = $props<{
    open: boolean;
    uiAnimDur: number;
    drawerVisualIdx: number | null;
    totalFilteredCount: number;
    drawerSearch: string;
    drawerLoading: boolean;
    drawerError: string | null;
    drawerList: KeyValue[];
    drawerExplain: Explain;
    onClose: () => void;
    onNavRow: (delta: number) => void;
    onCopyJson: () => void;
    onSetSearch: (value: string) => void;
    onApplyTarget: (idx: number) => void;
    onApplyCategory: (idx: number, value: string) => void;
    onApplyNumeric: (idx: number, value: string) => void;
    onApplyDate: (idx: number, value: string) => void;
  }>();
</script>

{#if open}
  <div class="fixed inset-0 z-40">
    <button class="absolute inset-0 modal-backdrop" transition:fade={{ duration: uiAnimDur }} onclick={onClose} aria-label="Close row details"></button>
    <div class="absolute top-0 right-0 h-full w-full max-w-2xl glass-panel border-l border-white/10 p-5 overflow-auto" transition:slide={{ duration: uiAnimDur, axis: 'x' }}>
      <div class="flex items-start justify-between gap-3">
        <div>
          <div class="text-sm font-semibold text-white">Row details</div>
          {#if drawerVisualIdx != null}
            <div class="mt-1 text-[11px] text-white/45 font-mono">visualIdx = <NumberFlow value={drawerVisualIdx} /></div>
          {/if}
        </div>
        <button class="btn btn-sm variant-soft" onclick={onClose}>Close</button>
      </div>
      <div class="mt-4 flex flex-wrap gap-2 items-center">
        <button class="btn btn-sm variant-soft" onclick={() => onNavRow(-1)} disabled={drawerVisualIdx == null || drawerVisualIdx <= 0}>Prev</button>
        <button class="btn btn-sm variant-soft" onclick={() => onNavRow(1)} disabled={drawerVisualIdx == null || drawerVisualIdx >= totalFilteredCount - 1}>Next</button>
      </div>
      <div class="mt-4 flex flex-wrap gap-2 items-end">
        <label class="flex-1 flex flex-col gap-1">
          <span class="text-[10px] uppercase tracking-widest text-white/50">Search in row</span>
          <input class="input input-sm glass-input" value={drawerSearch} oninput={(e) => onSetSearch((e.currentTarget as HTMLInputElement).value)} />
        </label>
        <button class="btn btn-sm variant-soft" onclick={onCopyJson} disabled={drawerLoading || drawerList.length === 0}>Copy JSON</button>
      </div>
      {#if drawerExplain}
        <div class={`mt-3 rounded-lg border p-3 text-xs ${drawerExplain.passes ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100' : 'border-amber-300/30 bg-amber-500/10 text-amber-100'}`}>
          <div class="font-semibold">{drawerExplain.passes ? 'Row passes active filters' : 'Row fails active filters'}</div>
        </div>
      {/if}
      {#if drawerLoading}
        <div class="mt-4 text-sm text-white/60">Loading…</div>
      {:else if drawerError}
        <div class="mt-4 text-sm text-red-300">{drawerError}</div>
      {:else}
        <div class="mt-4 space-y-2">
          {#each drawerList as kv (kv.key)}
            <div class="rounded-xl border border-white/10 bg-white/5 p-3">
              <div class="flex items-start gap-2">
                <div class="flex-1 min-w-0">
                  <div class="text-[10px] uppercase tracking-widest text-white/45 truncate">{kv.key}</div>
                  <div class="mt-1 font-mono text-xs text-white/85 break-words">{kv.value || '—'}</div>
                </div>
                {#if kv.idx != null}
                  <div class="flex flex-wrap gap-1 justify-end">
                    <button class="btn btn-xs variant-soft" onclick={() => onApplyTarget(kv.idx!)}>Target</button>
                    <button class="btn btn-xs variant-soft" onclick={() => onApplyCategory(kv.idx!, kv.value)}>Cat</button>
                    {#if kv.type === 'numeric'}
                      <button class="btn btn-xs variant-soft" onclick={() => onApplyNumeric(kv.idx!, kv.value)}>Num</button>
                    {:else if kv.type === 'date'}
                      <button class="btn btn-xs variant-soft" onclick={() => onApplyDate(kv.idx!, kv.value)}>Date</button>
                    {/if}
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/if}
