<script lang="ts">
  import BushingLatex from './BushingLatex.svelte';

  let {
    title = '',
    objective = '',
    equations = [],
    steps = [],
    note = ''
  }: {
    title?: string;
    objective?: string;
    equations?: Array<{ latex: string; definitions?: Array<{ latex: string; meaning: string }> }>;
    steps?: string[];
    note?: string;
  } = $props();

  const sectionTag = $derived(title.match(/^(\d+)/)?.[1] ?? '');
</script>

<section class="derivation-card rounded-xl border border-white/10 bg-black/25 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
  <div class="flex items-start justify-between gap-3">
    <div class="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-100/78">{title}</div>
    {#if sectionTag}
      <div class="rounded-full border border-cyan-300/18 bg-cyan-500/8 px-2 py-1 text-[10px] font-semibold text-cyan-100/70">
        Sec. {sectionTag}
      </div>
    {/if}
  </div>
  {#if objective}
    <div class="mt-2 text-sm leading-relaxed text-white/84">{@html objective}</div>
  {/if}
  {#if equations.length}
    <div class="mt-4 space-y-3">
      {#each equations as equation, index (`${title}-${index}`)}
        <div class="latex-display">
          <BushingLatex latex={equation.latex} definitions={equation.definitions ?? []} tag={sectionTag ? `${sectionTag}.${index + 1}` : ''} />
        </div>
      {/each}
    </div>
  {/if}
  {#if steps.length}
    <ol class="mt-3 space-y-2">
      {#each steps as step, index (`${index}-${step}`)}
        <li class="flex items-start gap-3 text-[12px] leading-relaxed text-white/76">
          <span class="mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-cyan-300/18 bg-cyan-500/10 px-1 text-[10px] font-semibold text-cyan-100/84">
            {index + 1}
          </span>
          <span class="flex-1">{@html step}</span>
        </li>
      {/each}
    </ol>
  {/if}
  {#if note}
    <div class="mt-3 rounded-lg border border-amber-300/18 bg-amber-500/8 px-3 py-2 text-[11px] leading-relaxed text-amber-100/80">
      {@html note}
    </div>
  {/if}
</section>

<style>
  .derivation-card {
    background:
      linear-gradient(180deg, rgba(13, 19, 33, 0.96), rgba(8, 13, 24, 0.98)),
      radial-gradient(circle at top, rgba(56, 189, 248, 0.05), transparent 52%);
  }

  .latex-display {
    border: 1px solid rgba(148, 163, 184, 0.18);
    border-radius: 0.9rem;
    background:
      linear-gradient(180deg, rgba(25, 33, 51, 0.96), rgba(16, 23, 37, 0.98)),
      radial-gradient(circle at 0% 0%, rgba(56, 189, 248, 0.08), transparent 38%),
      linear-gradient(90deg, rgba(14, 165, 233, 0.03), rgba(250, 204, 21, 0.015));
    padding: 1rem 1.1rem;
    color: rgba(235, 241, 248, 0.97);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.03),
      0 12px 24px rgba(2, 8, 23, 0.16);
  }

  .latex-display :global(.math-soft) {
    color: rgba(191, 219, 254, 0.84);
  }

  .latex-display :global(.math-accent) {
    color: rgba(253, 224, 71, 0.92);
    font-weight: 600;
  }

  .latex-display :global(.math-value) {
    color: rgba(103, 232, 249, 0.94);
    font-variant-numeric: tabular-nums;
  }

  .latex-display :global(.math-label) {
    color: rgba(203, 213, 225, 0.75);
  }

  .latex-display :global(sub),
  .latex-display :global(sup) {
    font-size: 0.72em;
    line-height: 0;
  }
</style>
