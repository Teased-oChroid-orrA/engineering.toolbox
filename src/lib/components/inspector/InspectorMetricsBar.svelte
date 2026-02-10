<script lang="ts">
  import NumberFlow from '@number-flow/svelte';
  import { Button as FlowButton } from 'flowbite-svelte';

  let {
    columns = 0,
    rows = 0,
    filtered = 0,
    rendered = 0,
    startIdx = 0,
    endIdx = 0,
    overscan = 0,
    maxWindow = 0,
    parseDiagnostics = [],
    onBaselineReport
  } = $props<{
    columns?: number;
    rows?: number;
    filtered?: number;
    rendered?: number;
    startIdx?: number;
    endIdx?: number;
    overscan?: number;
    maxWindow?: number;
    parseDiagnostics?: Array<{ idx: number; name: string; numericFail: number; dateFail: number }>;
    onBaselineReport: () => void;
  }>();
</script>

<div class="glass-panel rounded-2xl p-4 border border-white/10 inspector-panel-slide inspector-pop-card" data-testid="inspector-metrics-bar">
  <div class="flex flex-wrap gap-6 text-xs text-white/70">
    <div class="flex flex-col">
      <span class="text-[10px] uppercase tracking-widest text-white/40">Columns</span>
      <span class="text-lg font-semibold text-white"><NumberFlow value={columns} /></span>
    </div>
    <div class="flex flex-col">
      <span class="text-[10px] uppercase tracking-widest text-white/40">Rows</span>
      <span class="text-lg font-semibold text-white"><NumberFlow value={rows} /></span>
    </div>
    <div class="flex flex-col">
      <span class="text-[10px] uppercase tracking-widest text-white/40">Filtered</span>
      <span class="text-lg font-semibold text-white"><NumberFlow value={filtered} /></span>
    </div>
    <div class="flex flex-col">
      <span class="text-[10px] uppercase tracking-widest text-white/40">Rendered</span>
      <span class="text-lg font-semibold text-white"><NumberFlow value={rendered} /></span>
    </div>
    <div class="ml-auto flex items-end text-[11px] text-white/45 font-mono gap-1">
      <span>Slice:</span>
      <span>&nbsp;</span>
      <NumberFlow value={startIdx} />
      <span>-</span>
      <NumberFlow value={endIdx} />
      <span>•</span>
      <span>overscan&nbsp;</span>
      <NumberFlow value={overscan} />
      <span>•</span>
      <span>maxWindow&nbsp;</span>
      <NumberFlow value={maxWindow} />
      <span>•</span>
      <span>rendered&nbsp;</span>
      <NumberFlow value={rendered} />
    </div>
    <FlowButton size="xs" color="alternative" class="ml-2" onclick={onBaselineReport}>Baseline Report</FlowButton>
  </div>
  {#if (parseDiagnostics?.length ?? 0) > 0}
    <div class="mt-3 border-t border-white/10 pt-3 text-[11px] text-white/65">
      <div class="font-semibold text-white/80 mb-1">Parser diagnostics (visible slice)</div>
      <div class="flex flex-wrap gap-2">
        {#each parseDiagnostics as d (`diag-${d.idx}`)}
          <span class="px-2 py-1 rounded-lg border border-white/10 bg-white/5 inspector-pop-sub">
            {d.name}: {#if d.numericFail > 0}num fail <NumberFlow value={d.numericFail} /> {/if}{#if d.dateFail > 0}date fail <NumberFlow value={d.dateFail} />{/if}
          </span>
        {/each}
      </div>
    </div>
  {/if}
</div>
