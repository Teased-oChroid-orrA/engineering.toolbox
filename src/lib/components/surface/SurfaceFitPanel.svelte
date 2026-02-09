<script lang="ts">
  // UI-only extraction of Surface Evaluation + Cylinder Fit + Section Slicing panels.
  export let evalUseSelection: any;
  export let heatmapOn: any;
  export let evalTol: any;
  export let evalSigmaMult: any;
  export let computeSurfaceEval: any;
  export let evalBusy: any;
  export let evalErr: any;
  export let evalRes: any;
  export let pendingPointIdx: any;

  export let cylUseSelection: any;
  export let cylShowAxis: any;
  export let computeCylinderFit: any;
  export let cylBusy: any;
  export let cylErr: any;
  export let cylRes: any;
  export let cylRefineK: any;
  export let cylSelectOutliers: any;
  export let cylKeepInliers: any;
  export let cylRemoveOutliers: any;
  export let cylThresholdAbs: any;
  export let activeFitPointIds: any;
  export let selectedPointIds: any;
  export let cylFitPointIds: any;

  export let sliceAxis: any;
  export let sliceBins: any;
  export let sliceThickness: any;
  export let sliceMetric: any;
  export let computeSectionSlices: any;
  export let sliceBusy: any;
  export let sliceErr: any;
  export let sliceRes: any;
  export let pointsCount: number;
</script>

<div class="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
        <div class="flex items-center justify-between">
          <div class="text-[11px] font-semibold uppercase tracking-widest text-white/60">Surface Evaluation</div>
          <div class="flex items-center gap-2">
            <label class="flex items-center gap-2 text-[11px] text-white/50">
              <input type="checkbox" class="checkbox checkbox-xs" bind:checked={evalUseSelection} />
              Use selection
            </label>
            <button
            class={heatmapOn ? 'btn btn-sm variant-soft' : 'btn btn-sm variant-soft opacity-70'}
            onclick={() => (heatmapOn = !heatmapOn)}
            title="Toggle heatmap overlay on points"
            disabled={!evalRes}
          >
            Heatmap
          </button>
          </div>
        </div>

        <div class="grid grid-cols-[1fr_1fr] gap-2">
          <label class="text-[11px] text-white/50">
            Tol (abs)
            <input
              type="number"
              step="0.001"
              min="0"
              class="mt-1 w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-xs"
              bind:value={evalTol}
              title="If 0, use sigmaMult * sigma"
            />
          </label>
          <label class="text-[11px] text-white/50">
            Sigma mult
            <input
              type="number"
              step="0.25"
              min="0.25"
              class="mt-1 w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-xs"
              bind:value={evalSigmaMult}
              title="Outlier threshold multiplier when Tol=0"
            />
          </label>
        </div>

        <button class="btn variant-filled-primary w-full" onclick={computeSurfaceEval} disabled={evalBusy}>
          {evalBusy ? 'Evaluating…' : 'Best-fit plane + residuals'}
        </button>

        {#if evalErr}
          <div class="text-[11px] text-rose-200 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">{evalErr}</div>
        {/if}

        {#if evalRes}
          <div class="rounded-xl bg-black/25 border border-white/10 p-3 space-y-2">
            <div class="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div>RMS {evalRes.rms.toExponential(3)}</div>
              <div>Mean |d| {evalRes.meanAbs.toExponential(3)}</div>
              <div>Max |d| {evalRes.maxAbs.toExponential(3)}</div>
              <div>P95 |d| {evalRes.p95Abs.toExponential(3)}</div>
              <div>σ {evalRes.sigma.toExponential(3)}</div>
              <div>Outliers {evalRes.outlierIndices.length}</div>
            </div>

            <div class="text-[11px] text-white/60 uppercase tracking-widest">Plane</div>
            <div class="text-[11px] font-mono text-white/70">
              n = ({evalRes.normal.x.toFixed(4)}, {evalRes.normal.y.toFixed(4)}, {evalRes.normal.z.toFixed(4)})
            </div>
            <div class="text-[11px] font-mono text-white/70">
              c = ({evalRes.centroid.x.toFixed(3)}, {evalRes.centroid.y.toFixed(3)}, {evalRes.centroid.z.toFixed(3)})
            </div>

            {#if evalRes.outlierIndices.length}
              <div class="text-[11px] text-white/60 uppercase tracking-widest pt-1">Worst points</div>
              <div class="max-h-28 overflow-auto pr-1 custom-scrollbar space-y-1">
                {#each evalRes.outlierIndices as oi (oi)}
                  {@const d = evalRes.signedDistances[oi] ?? 0}
                  <button
                    class="w-full text-left px-2 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[11px] font-mono text-rose-100"
                    onclick={() => (pendingPointIdx = oi)}
                    title="Click to preselect point"
                  >
                    P{oi}: d={d.toExponential(3)}
                  </button>
                {/each}
              </div>
            {/if}

	          </div>
	        {/if}


        <div class="mt-3 pt-3 border-t border-white/10 space-y-2">
          <div class="flex items-center justify-between">
            <div class="text-[11px] font-semibold uppercase tracking-widest text-white/60">Fit Cylinder</div>
            <div class="flex items-center gap-2">
              <label class="flex items-center gap-2 text-[11px] text-white/50">
                <input type="checkbox" class="checkbox checkbox-xs" bind:checked={cylUseSelection} />
                Use selection
              </label>
              <label class="flex items-center gap-2 text-[11px] text-white/50">
                <input type="checkbox" class="checkbox checkbox-xs" bind:checked={cylShowAxis} />
                Show axis
              </label>
            </div>
          </div>

          <button class="btn variant-filled-primary w-full" onclick={computeCylinderFit} disabled={cylBusy || activeFitPointIds().length < 6}>
            {cylBusy ? 'Fitting…' : 'Fit cylinder + residuals'}
          </button>

          {#if cylErr}
            <div class="text-[11px] text-rose-200 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">{cylErr}</div>
          {/if}

          {#if cylRes}
            <div class="rounded-xl bg-black/25 border border-white/10 p-3 space-y-2">
              <div class="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div>R {cylRes.radius.toExponential(3)}</div>
                <div>RMS {cylRes.rms.toExponential(3)}</div>
                <div>Mean |d| {cylRes.meanAbs.toExponential(3)}</div>
                <div>P95 |d| {cylRes.p95Abs.toExponential(3)}</div>
                <div>Max |d| {cylRes.maxAbs.toExponential(3)}</div>
                <div>Outliers {cylRes.outlierIndices.length}</div>
              </div>

              <div class="text-[11px] text-white/60 uppercase tracking-widest">Axis</div>
              <div class="text-[11px] font-mono text-white/70">
                dir = ({cylRes.axisDir.x.toFixed(4)}, {cylRes.axisDir.y.toFixed(4)}, {cylRes.axisDir.z.toFixed(4)})
              </div>
              <div class="text-[11px] font-mono text-white/70">
                p0 = ({cylRes.axisPoint.x.toFixed(3)}, {cylRes.axisPoint.y.toFixed(3)}, {cylRes.axisPoint.z.toFixed(3)})
              </div>


              <div class="mt-2 pt-2 border-t border-white/10 space-y-2">
                <div class="flex items-center justify-between">
                  <div class="text-[11px] text-white/60 uppercase tracking-widest">Refine selection</div>
                  <div class="text-[11px] text-white/40 font-mono">thr = {cylThresholdAbs().toExponential(2)}</div>
                </div>

                <div class="flex flex-wrap items-center gap-2">
                  <label class="text-[11px] text-white/50 flex items-center gap-2">
                    <span class="whitespace-nowrap">k×RMS</span>
                    <input type="number" min="0.25" step="0.25" class="w-20 input input-xs glass-input" bind:value={cylRefineK} />
                  </label>
                  <button class="btn btn-xs variant-soft" onclick={cylSelectOutliers} disabled={!cylRes}>Select outliers</button>
                  <button class="btn btn-xs variant-soft" onclick={cylKeepInliers} disabled={!cylRes}>Keep inliers</button>
                  <button class="btn btn-xs variant-soft" onclick={cylRemoveOutliers} disabled={!cylRes || selectedPointIds.length === 0}>Remove outliers</button>
                  <button class="btn btn-xs variant-filled-primary" onclick={computeCylinderFit} disabled={cylBusy || activeFitPointIds().length < 6}>Re-fit</button>
                </div>
              </div>

              {#if cylRes.outlierIndices.length}
                <div class="text-[11px] text-white/60 uppercase tracking-widest pt-1">Worst points</div>
                <div class="max-h-28 overflow-auto pr-1 custom-scrollbar space-y-1">
                  {#each cylRes.outlierIndices as oi (oi)}
                    {@const j = cylFitPointIds.indexOf(oi)}
                    {@const d = (j >= 0 ? (cylRes.absDistances[j] ?? 0) : 0)}
                    <button
                      class="w-full text-left px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] font-mono text-amber-100"
                      onclick={() => (pendingPointIdx = oi)}
                      title="Click to preselect point"
                    >
                      P{oi}: |d|={d.toExponential(3)}
                    </button>
                  {/each}
                </div>
              {/if}
            </div>
          {/if}
        </div>

        <div class="mt-3 pt-3 border-t border-white/10 space-y-2">
          <div class="text-[11px] font-semibold uppercase tracking-widest text-white/60">Section Slicing</div>

          <div class="grid grid-cols-3 gap-2">
            <label class="text-[11px] text-white/50">
              Axis
              <select class="mt-1 w-full select select-sm glass-input" bind:value={sliceAxis}>
                <option value="x">X</option>
                <option value="y">Y</option>
                <option value="z">Z</option>
              </select>
            </label>

            <label class="text-[11px] text-white/50">
              Stations
              <input type="number" min="6" max="200" step="1" class="mt-1 w-full input input-sm glass-input" bind:value={sliceBins} />
            </label>

            <label class="text-[11px] text-white/50">
              Thickness (0=auto)
              <input type="number" min="0" step="0.001" class="mt-1 w-full input input-sm glass-input" bind:value={sliceThickness} />
            </label>
          </div>

          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="text-[11px] text-white/50">Metric</span>
              <button class={sliceMetric==='p95' ? 'btn btn-xs variant-soft' : 'btn btn-xs variant-soft opacity-70'} onclick={() => (sliceMetric='p95')}>
                P95 |d|
              </button>
              <button class={sliceMetric==='rms' ? 'btn btn-xs variant-soft' : 'btn btn-xs variant-soft opacity-70'} onclick={() => (sliceMetric='rms')}>
                RMS
              </button>
            </div>

            <button class="btn btn-sm variant-soft" onclick={computeSectionSlices} disabled={sliceBusy || pointsCount < 3}>
              {sliceBusy ? 'Computing…' : 'Compute'}
            </button>
          </div>

          {#if sliceErr}
            <div class="text-[11px] text-red-200/80 font-mono">Error: {sliceErr}</div>
          {/if}

	          {#if sliceRes && sliceRes.slices.length > 0}
		            {@const vals = sliceRes.slices.map((s: any) => (sliceMetric==='p95' ? s.p95Abs : s.rms))}
	            {@const vMax = Math.max(...vals, 1e-12)}
		            {@const worst = sliceRes.slices.reduce((a: any, b: any) => {
	              const av = sliceMetric === 'p95' ? a.p95Abs : a.rms;
	              const bv = sliceMetric === 'p95' ? b.p95Abs : b.rms;
	              return bv > av ? b : a;
	            }, sliceRes.slices[0])}
            <div class="rounded-xl bg-black/25 border border-white/10 p-3 space-y-2">
              <div class="flex items-center justify-between text-[11px] text-white/50 font-mono">
                <div>{sliceAxis.toUpperCase()} range {sliceRes.min.toFixed(3)} → {sliceRes.max.toFixed(3)}</div>
                <div>bins {sliceRes.slices.length}</div>
              </div>

              <!-- simple inline SVG plot -->
              <svg viewBox="0 0 240 70" class="w-full h-[70px] rounded-lg bg-black/20 border border-white/5">
                <polyline
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  class="text-white/70"
	                  points={sliceRes.slices
	                    .map((s: any, i: number) => {
                      const x = (i / Math.max(1, sliceRes.slices.length - 1)) * 236 + 2;
                      const v = sliceMetric === 'p95' ? s.p95Abs : s.rms;
                      const y = 66 - (v / vMax) * 62;
                      return `${x},${y}`;
                    })
                    .join(' ')}
                />
              </svg>

	              <div class="grid grid-cols-3 gap-2 text-[11px] font-mono">
                <div class="rounded-xl bg-black/25 border border-white/10 px-2 py-2">Worst n {worst.n}</div>
                <div class="rounded-xl bg-black/25 border border-white/10 px-2 py-2">Worst P95 {worst.p95Abs.toExponential(3)}</div>
                <div class="rounded-xl bg-black/25 border border-white/10 px-2 py-2">Worst RMS {worst.rms.toExponential(3)}</div>
              </div>
            </div>
          {/if}
        </div>


          </div>
      
