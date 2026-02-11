<script lang="ts">
  export let visibleRows: string[][] = [];
  export let startIdx = 0;
  export let focusVisualIdx = 0;
  export let safeRowHeight = 36;
  export let translateY = 0;
  export let HEADER_HEIGHT = 42;
  export let BANNER_HEIGHT = 34;
  export let topBanner: string | null = null;
  export let enableRowFx = false;

  export let leftPins: number[] = [];
  export let rightPins: number[] = [];
  export let centerCols: number[] = [];
  export let virtualCenterCols: number[] = [];
  export let colStart = 0;
  export let colEnd = 0;
  export let EST_COL_WIDTH = 170;
  export let getColWidth: (idx: number) => number = () => 170;
  export let highlightCell: (value: string) => string = (v) => v;
  export let onActivateRow: (visualIdx: number) => void = () => {};
</script>

<table class="absolute left-0 min-w-full text-xs whitespace-nowrap" style="top: {HEADER_HEIGHT + (topBanner !== null ? BANNER_HEIGHT : 0)}px; transform: translate3d(0, {translateY}px, 0);">
  <tbody>
    {#each visibleRows as row, i (startIdx + i)}
      {@const visualIdx = startIdx + i}
      <tr
        class={`border-b border-white/5 cursor-pointer ${enableRowFx ? 'row-enter ' : ''}${visualIdx === focusVisualIdx ? 'bg-emerald-400/10' : 'hover:bg-white/5'}`}
        style={`height:${safeRowHeight}px;`}
        onclick={() => onActivateRow(visualIdx)}
      >
        {#each leftPins as c}
          {@const cell = row?.[c] ?? ''}
          <td class="px-3 py-2" style={`min-width:${getColWidth(c)}px;height:${safeRowHeight}px;`}>
            {#if (cell ?? '').trim().length === 0}
              <span class="italic text-white/35">∅</span>
            {:else}
              <span class={`font-mono ${enableRowFx ? 'cell-smooth ' : ''}inspector-pop-value`}>{@html highlightCell(String(cell))}</span>
            {/if}
          </td>
        {/each}

        {#if colStart > 0}
          <td class="px-0 py-0" style={`width:${colStart * EST_COL_WIDTH}px`}></td>
        {/if}
        {#each virtualCenterCols as c}
          {@const cell = row?.[c] ?? ''}
          <td class="px-3 py-2" style={`min-width:${getColWidth(c)}px;height:${safeRowHeight}px;`}>
            {#if (cell ?? '').trim().length === 0}
              <span class="italic text-white/35">∅</span>
            {:else}
              <span class={`font-mono ${enableRowFx ? 'cell-smooth ' : ''}inspector-pop-value`}>{@html highlightCell(String(cell))}</span>
            {/if}
          </td>
        {/each}
        {#if colEnd < centerCols.length}
          <td class="px-0 py-0" style={`width:${Math.max(0, centerCols.length - colEnd) * EST_COL_WIDTH}px`}></td>
        {/if}

        {#each rightPins as c}
          {@const cell = row?.[c] ?? ''}
          <td class="px-3 py-2" style={`min-width:${getColWidth(c)}px;height:${safeRowHeight}px;`}>
            {#if (cell ?? '').trim().length === 0}
              <span class="italic text-white/35">∅</span>
            {:else}
              <span class={`font-mono ${enableRowFx ? 'cell-smooth ' : ''}inspector-pop-value`}>{@html highlightCell(String(cell))}</span>
            {/if}
          </td>
        {/each}
      </tr>
    {/each}
  </tbody>
</table>

<style>
  .row-enter {
    will-change: opacity, transform;
  }
  .cell-smooth {
    display: inline-block;
  }
</style>
