<script lang="ts">
  import katex from 'katex';

  const latexRenderCache = new Map<string, string>();

  function renderLatex(latex: string, displayMode: boolean): string {
    const cacheKey = `${displayMode ? 'display' : 'inline'}:${latex}`;
    const cached = latexRenderCache.get(cacheKey);
    if (cached) return cached;
    const rendered = katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      strict: 'ignore',
      trust: false,
      output: 'mathml'
    });
    latexRenderCache.set(cacheKey, rendered);
    return rendered;
  }

  let {
    latex = '',
    displayMode = true,
    tag = '',
    definitions = []
  }: {
    latex?: string;
    displayMode?: boolean;
    tag?: string;
    definitions?: Array<{ latex: string; meaning: string }>;
  } = $props();
  let tooltipOpen = $state(false);

  const rendered = $derived(renderLatex(latex, displayMode));

  const renderedDefinitions = $derived(
    tooltipOpen
      ? definitions.map((definition) => ({
          ...definition,
          rendered: renderLatex(definition.latex, false)
        }))
      : []
  );
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  class="math-shell"
  class:has-definitions={definitions.length > 0}
  role={definitions.length > 0 ? 'button' : undefined}
  tabindex={definitions.length > 0 ? 0 : undefined}
  aria-label={definitions.length > 0 ? 'Show variable definitions for this equation' : undefined}
  onmouseenter={() => (tooltipOpen = true)}
  onmouseleave={() => (tooltipOpen = false)}
  onfocus={() => (tooltipOpen = true)}
  onblur={() => (tooltipOpen = false)}
  onkeydown={(event) => {
    if (!definitions.length) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      tooltipOpen = !tooltipOpen;
    } else if (event.key === 'Escape') {
      tooltipOpen = false;
    }
  }}
>
  <div class:math-display={displayMode} class:math-inline={!displayMode}>
    <div class="math-render">{@html rendered}</div>
    {#if displayMode && tag}
      <div class="math-tag">({tag})</div>
    {/if}
  </div>

  {#if definitions.length > 0 && tooltipOpen}
    <div class="math-tooltip" role="note">
      <div class="math-tooltip-title">Variable Definitions</div>
      <div class="math-tooltip-grid">
        {#each renderedDefinitions as definition (`${definition.latex}-${definition.meaning}`)}
          <div class="math-tooltip-row">
            <div class="math-tooltip-symbol">{@html definition.rendered}</div>
            <div class="math-tooltip-meaning">{definition.meaning}</div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .math-shell {
    position: relative;
  }

  .math-shell.has-definitions {
    cursor: help;
    outline: none;
  }

  .math-display {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.9rem;
    overflow-x: auto;
  }

  .math-inline {
    display: inline-flex;
    align-items: center;
  }

  .math-render :global(.katex-display) {
    margin: 0;
  }

  .math-render :global(math) {
    font-family: "STIX Two Math", "Cambria Math", "Times New Roman", serif;
    font-size: 1.02em;
    color: inherit;
    letter-spacing: 0.01em;
  }

  .math-inline .math-render :global(math) {
    font-size: 0.98em;
    vertical-align: middle;
  }

  .math-tag {
    min-width: 3.6rem;
    text-align: right;
    font-family: "STIX Two Text", "Times New Roman", serif;
    font-size: 0.83rem;
    color: rgba(191, 219, 254, 0.58);
    letter-spacing: 0.04em;
  }

  .math-tooltip {
    position: absolute;
    left: 0;
    top: calc(100% + 0.65rem);
    z-index: 25;
    width: min(24rem, 82vw);
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0);
    border: 1px solid rgba(125, 211, 252, 0.2);
    border-radius: 0.95rem;
    background:
      linear-gradient(180deg, rgba(14, 21, 34, 0.98), rgba(8, 14, 24, 0.98)),
      radial-gradient(circle at top left, rgba(56, 189, 248, 0.12), transparent 40%);
    box-shadow:
      0 18px 36px rgba(2, 8, 23, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.03);
    padding: 0.85rem;
  }

  .math-tooltip-title {
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(186, 230, 253, 0.8);
  }

  .math-tooltip-grid {
    margin-top: 0.65rem;
    display: grid;
    gap: 0.5rem;
  }

  .math-tooltip-row {
    display: grid;
    grid-template-columns: minmax(0, 5.5rem) minmax(0, 1fr);
    gap: 0.7rem;
    align-items: start;
    border-radius: 0.75rem;
    border: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(15, 23, 42, 0.56);
    padding: 0.55rem 0.65rem;
  }

  .math-tooltip-symbol {
    color: rgba(240, 249, 255, 0.94);
  }

  .math-tooltip-meaning {
    font-size: 0.77rem;
    line-height: 1.4;
    color: rgba(226, 232, 240, 0.84);
  }

  @media print {
    .math-tooltip {
      display: none;
    }

    .math-tag {
      color: rgba(15, 23, 42, 0.52);
    }
  }
</style>
