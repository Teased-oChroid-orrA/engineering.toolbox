<script lang="ts">
  import type { SurfaceIntegrityReport } from './SurfaceIntegrityAnalyzer';

  export let report: SurfaceIntegrityReport;
  export let nonManifoldThreshold = 4;
  export let onSetNonManifoldThreshold: (value: number) => void = () => {};
  export let onFixOrphans: () => void = () => {};
  export let onFixDuplicateLines: () => void = () => {};
</script>

<section class="glass-panel rounded-2xl p-4 space-y-3">
  <div class="flex items-center justify-between gap-3">
    <div>
      <div class="text-sm font-semibold text-white/90">Geometry Integrity</div>
      <div class="text-[11px] text-white/55">Live checks for orphan points, duplicate lines, and non-manifold warnings.</div>
    </div>
    <div class="text-[11px] text-white/50 font-mono">
      orphans {report.orphanPointIds.length} • duplicates {report.duplicateLineGroups.length} • non-manifold {report.nonManifoldIncidents.length}
    </div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
    <div class="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
      <div class="text-[11px] uppercase tracking-widest text-white/50">Orphan Points</div>
      <div class="text-lg font-semibold text-white/90">{report.orphanPointIds.length}</div>
      <button class="btn btn-xs variant-soft" onclick={onFixOrphans} disabled={report.orphanPointIds.length === 0}>
        Remove Orphans
      </button>
    </div>

    <div class="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
      <div class="text-[11px] uppercase tracking-widest text-white/50">Duplicate Lines</div>
      <div class="text-lg font-semibold text-white/90">{report.duplicateLineGroups.length}</div>
      <button class="btn btn-xs variant-soft" onclick={onFixDuplicateLines} disabled={report.duplicateLineGroups.length === 0}>
        Deduplicate
      </button>
    </div>

    <div class="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
      <div class="text-[11px] uppercase tracking-widest text-white/50">Non-Manifold Threshold</div>
      <input
        type="number"
        min="2"
        step="1"
        value={nonManifoldThreshold}
        class="input input-sm w-full bg-black/20 border border-white/10"
        oninput={(event) => onSetNonManifoldThreshold(Number((event.currentTarget as HTMLInputElement).value))}
      />
      <div class="text-[11px] text-white/60">Warnings: {report.nonManifoldIncidents.length}</div>
    </div>
  </div>

  {#if report.duplicateLineGroups.length}
    <div class="text-[11px] text-white/55">
      Duplicate examples:
      {#each report.duplicateLineGroups.slice(0, 3) as group, idx (group.key)}
        <span>{idx > 0 ? '; ' : ' '}[{group.lineIds.map((id) => `L${id + 1}`).join(', ')}]</span>
      {/each}
    </div>
  {/if}
</section>
