<script lang="ts">
  import NumberFlow from '@number-flow/svelte';
  import { fade, scale } from 'svelte/transition';
  import { safeAutoAnimate, isWebKitRuntime } from '$lib/utils/safeAutoAnimate';
  function aa(node: HTMLElement) {
    try {
      if (isWebKitRuntime()) return {} as any;
    } catch {
      if (isWebKitRuntime()) return {} as any;
    }
    const ctl = safeAutoAnimate(node, { duration: 160 });
    return { destroy() { try { (ctl as any)?.disable?.(); } catch {} } };
  }
  let {
    open = false,
    uiAnimDur = 160,
    genTab = 'builder',
    genFlagI = false,
    genFlagM = false,
    genFlagS = false,
    genOut = '',
    genErr = '',
    genWarn = '',
    regexTemplates = [],
    testText = '',
    testMatches = { count: 0, sample: [] as string[] },
    genBuildMode = 'inOrder',
    genClauses = [],
    genAddKind = 'contains',
    onClose,
    onSetTab,
    onToggleFlag,
    onApplyRegex,
    onSetTestText,
    onSetBuildMode,
    onMoveClause,
    onRemoveClause,
    onUpdateClauseKind,
    onUpdateClauseField,
    onAddClause,
    onClearClauses
  } = $props<any>();
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-6 relative" transition:fade={{ duration: uiAnimDur }}>
    <button type="button" class="absolute inset-0 modal-backdrop p-0 m-0 border-0" onclick={onClose} aria-label="Close regex generator"></button>
    <div class="relative z-10 glass-panel w-full max-w-4xl rounded-2xl border border-white/10 p-5" transition:scale={{ duration: uiAnimDur, start: 0.96 }}>
      <div class="flex items-center justify-between gap-3">
        <div><div class="text-sm font-semibold text-white">Regex Generator</div></div>
        <button class="btn btn-sm variant-soft" onclick={onClose}>Close</button>
      </div>
      <div class="mt-4 flex flex-wrap gap-2">
        <button class={`pill ${genTab === 'builder' ? 'active' : ''}`} onclick={() => onSetTab('builder')}>Builder</button>
        <button class={`pill ${genTab === 'templates' ? 'active' : ''}`} onclick={() => onSetTab('templates')}>Templates</button>
        <button class={`pill ${genTab === 'tester' ? 'active' : ''}`} onclick={() => onSetTab('tester')}>Tester</button>
      </div>
      {#key genTab}
        {#if genTab === 'templates'}
          <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3" transition:fade={{ duration: uiAnimDur }}>
            {#each regexTemplates as t}
              <div class="glass-panel rounded-xl border border-white/10 p-4">
                <div class="flex items-center justify-between gap-2">
                  <div class="text-xs font-semibold text-white/85">{t.label}</div>
                  <button class="btn btn-xs variant-filled" onclick={() => onApplyRegex(t.pattern)}>Use</button>
                </div>
                <div class="mt-2 font-mono text-xs text-white/85 break-words">{t.pattern}</div>
              </div>
            {/each}
          </div>
        {:else if genTab === 'tester'}
          <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4" transition:fade={{ duration: uiAnimDur }}>
            <div class="glass-panel rounded-xl border border-white/10 p-4">
              <textarea class="textarea textarea-sm w-full glass-input mt-1" rows="8" value={testText} oninput={(e) => onSetTestText((e.currentTarget as HTMLTextAreaElement).value)}></textarea>
            </div>
            <div class="glass-panel rounded-xl border border-white/10 p-4">
              <div class="text-xs text-white/60"><NumberFlow value={testMatches.count} /> match(es)</div>
            </div>
          </div>
        {:else}
          <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4" transition:fade={{ duration: uiAnimDur }}>
            <div class="glass-panel rounded-xl border border-white/10 p-4">
              <div class="mt-3 flex flex-col gap-3" use:aa>
                {#each genClauses as c, idx (c.id)}
                  <div class="rounded-2xl border border-white/10 bg-white/4 p-3">
                    <div class="flex items-center gap-2">
                      <select class="select select-sm glass-input" value={genClauses[idx].kind} onchange={(e) => onUpdateClauseKind(idx, (e.currentTarget as HTMLSelectElement).value)}>
                        <option value="prefix">Prefix</option><option value="contains">Contains</option><option value="suffix">Suffix</option><option value="exact">Exact</option><option value="family">Family</option><option value="dashOneOf">Dash set</option><option value="dashRange">Dash range</option><option value="custom">Custom</option>
                      </select>
                      <div class="ml-auto flex items-center gap-1">
                        <button type="button" class="btn btn-xs variant-soft" disabled={idx === 0} onclick={() => onMoveClause(idx, -1)}>↑</button>
                        <button type="button" class="btn btn-xs variant-soft" disabled={idx === (genClauses.length - 1)} onclick={() => onMoveClause(idx, 1)}>↓</button>
                        <button type="button" class="btn btn-xs variant-soft" onclick={() => onRemoveClause(idx)}>✕</button>
                      </div>
                    </div>
                    <div class="mt-2"><input class="input input-sm glass-input" value={genClauses[idx].a} oninput={(e) => onUpdateClauseField(idx, 'a', (e.currentTarget as HTMLInputElement).value)} /></div>
                  </div>
                {/each}
              </div>
              <div class="mt-3 flex items-center gap-2">
                <select class="select select-sm glass-input" value={genAddKind} onchange={(e) => onAddClause((e.currentTarget as HTMLSelectElement).value)}>
                  <option value="prefix">Prefix</option><option value="contains">Contains</option><option value="suffix">Suffix</option><option value="exact">Exact</option><option value="family">Family</option><option value="dashOneOf">Dash set</option><option value="dashRange">Dash range</option><option value="custom">Custom</option>
                </select>
                <button type="button" class="btn btn-sm variant-soft" onclick={onClearClauses}>Clear</button>
              </div>
            </div>
            <div class="glass-panel rounded-xl border border-white/10 p-4">
              <div class="font-mono text-xs text-white/85 break-words">{genOut || '—'}</div>
              {#if genErr}<div class="text-[11px] text-red-300">{genErr}</div>{/if}
              <button class="btn btn-sm variant-filled mt-3" disabled={!genOut || !!genErr} onclick={() => onApplyRegex(genOut)}>Use regex</button>
            </div>
          </div>
        {/if}
      {/key}
    </div>
  </div>
{/if}
