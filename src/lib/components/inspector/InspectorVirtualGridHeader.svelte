<script lang="ts">
  export let headers: string[] = [];
  export let leftPins: number[] = [];
  export let rightPins: number[] = [];
  export let centerCols: number[] = [];
  export let virtualCenterCols: number[] = [];
  export let colStart = 0;
  export let colEnd = 0;
  export let EST_COL_WIDTH = 170;
  export let getColWidth: (idx: number) => number = () => 170;
  export let onRequestSort: (idx: number, opts?: { multi?: boolean }) => void = () => {};
  export let sortColIdx: number | null = null;
  export let sortDir: 'asc' | 'desc' = 'asc';
  export let sortLabel: (idx: number) => string = () => '';
  export let beginResize: (e: MouseEvent, idx: number) => void = () => {};
</script>

<thead class="sticky top-0 z-20 bg-surface-900/80 backdrop-blur border-b border-white/10">
  <tr>
    {#each leftPins as idx}
      <th class="text-left px-3 py-2 text-[10px] uppercase tracking-widest text-white/55 select-none" style={`min-width:${getColWidth(idx)}px`}>
        <div class="inline-flex items-center gap-1">
          <button class="hover:text-white/85" title="Sort" onclick={(e) => onRequestSort(idx, { multi: e.shiftKey })}>{headers[idx]}</button>
          {#if sortColIdx === idx}
            <span class="text-[10px] text-white/55">{sortDir === 'asc' ? '▲' : '▼'}</span>
          {/if}
          {#if sortLabel(idx)}
            <span class="text-[10px] text-emerald-200/80">{sortLabel(idx)}</span>
          {/if}
        </div>
      </th>
    {/each}

    {#if colStart > 0}
      <th class="px-0 py-0" style={`width:${colStart * EST_COL_WIDTH}px`}></th>
    {/if}
    {#each virtualCenterCols as idx}
      <th class="text-left px-3 py-2 text-[10px] uppercase tracking-widest text-white/55 select-none relative group" style={`min-width:${getColWidth(idx)}px`}>
        <div class="inline-flex items-center gap-1">
          <button
            class="group inline-flex items-center gap-1 hover:text-white/80"
            title="Sort (Shift+click for multi-sort)"
            onclick={(e) => onRequestSort(idx, { multi: e.shiftKey })}
          >
            <span class="truncate">{headers[idx]}</span>
            {#if sortColIdx === idx}
              <span class="text-[10px] text-white/50 group-hover:text-white/70">{sortDir === 'asc' ? '▲' : '▼'}</span>
            {:else}
              <span class="text-[10px] text-white/20 group-hover:text-white/40">↕</span>
            {/if}
          </button>
          {#if sortLabel(idx)}
            <span class="text-[10px] text-emerald-200/80">{sortLabel(idx)}</span>
          {/if}
        </div>
        <button
          type="button"
          class="absolute right-0 top-0 h-full w-1 cursor-col-resize opacity-0 group-hover:opacity-100 bg-white/20"
          aria-label={`Resize ${headers[idx]}`}
          onmousedown={(e) => beginResize(e, idx)}
        ></button>
      </th>
    {/each}
    {#if colEnd < centerCols.length}
      <th class="px-0 py-0" style={`width:${Math.max(0, centerCols.length - colEnd) * EST_COL_WIDTH}px`}></th>
    {/if}

    {#each rightPins as idx}
      <th class="text-left px-3 py-2 text-[10px] uppercase tracking-widest text-white/55 select-none" style={`min-width:${getColWidth(idx)}px`}>
        <div class="inline-flex items-center gap-1">
          <button class="hover:text-white/85" title="Sort" onclick={(e) => onRequestSort(idx, { multi: e.shiftKey })}>{headers[idx]}</button>
          {#if sortColIdx === idx}
            <span class="text-[10px] text-white/55">{sortDir === 'asc' ? '▲' : '▼'}</span>
          {/if}
          {#if sortLabel(idx)}
            <span class="text-[10px] text-emerald-200/80">{sortLabel(idx)}</span>
          {/if}
        </div>
      </th>
    {/each}
  </tr>
</thead>
