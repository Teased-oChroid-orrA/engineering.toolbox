<script lang="ts">
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui';
  import type { BushingInputs, BushingOutput } from '$lib/core/bushing';
  import { BUSHING_FORMULA_INVENTORY } from '$lib/core/bushing/formulaInventory';
  import BushingLameStressPlot from './BushingLameStressPlot.svelte';
  import katex from 'katex';
  import 'katex/dist/katex.min.css';

  export let form: BushingInputs;
  export let results: BushingOutput;
  export let onBack: () => void = () => {};

  const f = (n: number | null | undefined, d = 6) => (!Number.isFinite(Number(n)) ? '---' : Number(n).toFixed(d));
  const k = (n: number | null | undefined, d = 3) => (!Number.isFinite(Number(n)) ? '---' : (Number(n) / 1000).toFixed(d));
  const pct = (n: number | null | undefined, d = 2) => (!Number.isFinite(Number(n)) ? '---' : `${(Number(n) * 100).toFixed(d)}%`);

  function formulaToLatex(id: string): string {
    switch (id) {
      case 'thermal_delta_interference':
        return String.raw`\Delta_{\text{thermal}} = \left(\alpha_b - \alpha_h\right)\,D_{\text{bore}}\,\Delta T_F`;
      case 'installed_outer_diameter':
        return String.raw`OD_{\text{installed}} = D_{\text{bore}} + \Delta`;
      case 'contact_pressure':
        return String.raw`p = \frac{\Delta}{T_b + T_h},\quad \Delta > 0`;
      case 'hoop_stress_housing':
        return String.raw`\sigma_{h} = p\left(\frac{D^2 + d^2}{D^2 - d^2}\right)`;
      case 'hoop_stress_bushing':
        return String.raw`\sigma_{b} = -p\left(\frac{d_o^2 + d_i^2}{d_o^2 - d_i^2}\right)`;
      case 'install_force':
        return String.raw`F_{\text{install}} = \mu\,p\,\pi\,D_{\text{bore}}\,L`;
      case 'margin_of_safety':
        return String.raw`MS = \frac{\text{allowable}}{\text{demand}} - 1`;
      default:
        return id;
    }
  }

  function renderLatex(tex: string, displayMode = true): string {
    return katex.renderToString(tex, {
      throwOnError: false,
      displayMode,
      strict: 'ignore'
    });
  }
</script>

<div class="min-h-screen space-y-4 p-4">
  <div class="flex items-center justify-between">
    <h2 class="text-xl font-semibold text-white">Bushing Engineering Information</h2>
    <button class="rounded-md border border-cyan-300/40 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-100 hover:bg-cyan-500/20" on:click={onBack}>
      Back To Main View
    </button>
  </div>

  <Card class="glass-card border-cyan-400/25">
    <CardHeader class="pb-2">
      <CardTitle class="text-sm text-cyan-100">What This Tool Is Doing</CardTitle>
    </CardHeader>
    <CardContent class="space-y-2 text-sm text-white/85">
      <p>
        This solver estimates whether a press-fit bushing design is mechanically acceptable using a combined tolerance,
        contact-pressure, yield-margin, and geometry-check workflow. In simple terms: it predicts how tight the fit is,
        what stress that creates, and whether geometry rules are still satisfied.
      </p>
      <p>
        A design can have positive yield margins but still fail overall if geometry checks (edge distance or wall
        thickness) are below minimum requirements. The governing margin is always the lowest margin across all active checks.
      </p>
    </CardContent>
  </Card>

  <Card class="glass-card border-indigo-300/20">
    <CardHeader class="pb-2">
      <CardTitle class="text-sm text-indigo-100">Core Equations Used</CardTitle>
    </CardHeader>
    <CardContent class="space-y-2 text-sm">
      {#each BUSHING_FORMULA_INVENTORY as eq}
        <div class="rounded-md border border-white/10 bg-black/25 p-2">
          <div class="text-cyan-100 [&_.katex-display]:my-1">{@html renderLatex(formulaToLatex(eq.id), true)}</div>
          <div class="mt-1 text-[11px] text-white/70">Units: {eq.units} | Note: {eq.note}</div>
          <div class="text-[11px] text-white/55">Source: {eq.location}</div>
        </div>
      {/each}
    </CardContent>
  </Card>

  <Card class="glass-card border-cyan-300/20">
    <CardHeader class="pb-2">
      <CardTitle class="text-sm text-cyan-100">Full Lamé Field Equations (Radial + Hoop)</CardTitle>
    </CardHeader>
    <CardContent class="space-y-2 text-sm text-white/85">
      <div class="rounded-md border border-white/10 bg-black/25 p-2">
        <div class="text-cyan-100">{@html renderLatex(String.raw`\sigma_r(r)=\frac{a^2 p_i-b^2 p_o}{b^2-a^2}-\frac{a^2b^2(p_i-p_o)}{(b^2-a^2)\,r^2}`, true)}</div>
        <div class="text-cyan-100">{@html renderLatex(String.raw`\sigma_\theta(r)=\frac{a^2 p_i-b^2 p_o}{b^2-a^2}+\frac{a^2b^2(p_i-p_o)}{(b^2-a^2)\,r^2}`, true)}</div>
        <div class="text-cyan-100">{@html renderLatex(String.raw`\sigma_z(r)=k_{\text{constraint}}\,k_{\text{length}}\,\nu\left(\sigma_r(r)+\sigma_\theta(r)\right)`, true)}</div>
        <div class="text-[11px] text-white/70">
          Boundary conditions used here:
          bushing: \(p_i=0,\; p_o=p\);
          housing: \(p_i=p,\; p_o=0\).
          Sign convention: tension positive, compressive radial pressure negative.
        </div>
        <div class="text-[11px] text-white/70">
          Current axial factors:
          <span class="text-cyan-100 align-middle">{@html renderLatex(`k_{\\text{constraint}}=${results.physics.axialConstraintFactor.toFixed(2)}`, false)}</span>,
          <span class="text-cyan-100 align-middle">{@html renderLatex(`k_{\\text{length}}=${results.physics.axialLengthFactor.toFixed(2)}`, false)}</span>.
          End constraints and bushing length influence only the axial field in this implementation.
        </div>
      </div>
      <BushingLameStressPlot field={results.lame.field} />
      <div class="grid grid-cols-1 gap-2 md:grid-cols-2 text-[12px]">
        <div class="rounded-md border border-white/10 bg-black/25 p-2">
          <div class="font-semibold text-emerald-200">Bushing key values</div>
          <div class="font-mono">max |σθ| = {f(results.lame.field.bushing.boundary.maxAbsHoop, 2)} psi at r = {f(results.lame.field.bushing.boundary.maxAbsHoopAt, 4)} in</div>
          <div class="font-mono">max |σz| = {f(results.lame.field.bushing.boundary.maxAbsAxial, 2)} psi at r = {f(results.lame.field.bushing.boundary.maxAbsAxialAt, 4)} in</div>
          <div class="font-mono">σr(inner/outer) = {f(results.lame.field.bushing.boundary.sigmaRInner, 2)} / {f(results.lame.field.bushing.boundary.sigmaROuter, 2)} psi</div>
        </div>
        <div class="rounded-md border border-white/10 bg-black/25 p-2">
          <div class="font-semibold text-blue-200">Housing key values</div>
          <div class="font-mono">max |σθ| = {f(results.lame.field.housing.boundary.maxAbsHoop, 2)} psi at r = {f(results.lame.field.housing.boundary.maxAbsHoopAt, 4)} in</div>
          <div class="font-mono">max |σz| = {f(results.lame.field.housing.boundary.maxAbsAxial, 2)} psi at r = {f(results.lame.field.housing.boundary.maxAbsAxialAt, 4)} in</div>
          <div class="font-mono">σr(inner/outer) = {f(results.lame.field.housing.boundary.sigmaRInner, 2)} / {f(results.lame.field.housing.boundary.sigmaROuter, 2)} psi</div>
        </div>
      </div>
    </CardContent>
  </Card>

  <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
    <Card class="glass-card border-emerald-300/20">
      <CardHeader class="pb-2">
        <CardTitle class="text-sm text-emerald-100">Step-By-Step Worked Example (Live Current Inputs)</CardTitle>
      </CardHeader>
      <CardContent class="space-y-2 text-sm text-white/85">
        <div class="rounded-md border border-white/10 bg-black/25 p-2">
          <div class="text-[11px] uppercase tracking-wide text-white/60">Step 1. Input + Tolerance Resolution</div>
          <div class="font-mono">Bore nominal = {f(results.tolerance.bore.nominal, 4)} in</div>
          <div class="font-mono">Bore lower/upper = {f(results.tolerance.bore.lower, 4)} / {f(results.tolerance.bore.upper, 4)} in</div>
          <div class="font-mono">Interference target nominal = {f(results.tolerance.interferenceTarget.nominal, 4)} in</div>
          <div class="font-mono">Interference target lower/upper = {f(results.tolerance.interferenceTarget.lower, 4)} / {f(results.tolerance.interferenceTarget.upper, 4)} in</div>
        </div>
        <div class="rounded-md border border-white/10 bg-black/25 p-2">
          <div class="text-[11px] uppercase tracking-wide text-white/60">Step 2. Solve OD To Respect Tolerance Window</div>
          <div class="font-mono">OD solved nominal = {f(results.tolerance.odBushing.nominal, 4)} in</div>
          <div class="font-mono">OD solved lower/upper = {f(results.tolerance.odBushing.lower, 4)} / {f(results.tolerance.odBushing.upper, 4)} in</div>
          <div class="font-mono">Achieved interference nominal = {f(results.tolerance.achievedInterference.nominal, 4)} in</div>
          <div class="font-mono">Achieved interference lower/upper = {f(results.tolerance.achievedInterference.lower, 4)} / {f(results.tolerance.achievedInterference.upper, 4)} in</div>
        </div>
        <div class="rounded-md border border-white/10 bg-black/25 p-2">
          <div class="text-[11px] uppercase tracking-wide text-white/60">Step 3. Contact Pressure (Lamé Compliance)</div>
          <div class="font-mono">deltaTotal = {f(results.lame.deltaTotal, 6)} in</div>
          <div class="font-mono">termB = {f(results.lame.termB, 9)}</div>
          <div class="font-mono">termH = {f(results.lame.termH, 9)}</div>
          <div class="font-mono">pressure = delta / (termB + termH) = {f(results.lame.pressurePsi, 2)} psi ({k(results.lame.pressurePsi, 3)} ksi)</div>
        </div>
        <div class="rounded-md border border-white/10 bg-black/25 p-2">
          <div class="text-[11px] uppercase tracking-wide text-white/60">Step 4. Stress + Assembly Force</div>
          <div class="font-mono">Housing hoop stress = {f(results.physics.stressHoopHousing, 2)} psi</div>
          <div class="font-mono">Bushing hoop stress = {f(results.physics.stressHoopBushing, 2)} psi</div>
          <div class="font-mono">Install force = {f(results.physics.installForce, 1)} lbf</div>
          <div class="font-mono">Housing margin = {f(results.physics.marginHousing, 3)}</div>
          <div class="font-mono">Bushing margin = {f(results.physics.marginBushing, 3)}</div>
        </div>
        <div class="rounded-md border border-white/10 bg-black/25 p-2">
          <div class="text-[11px] uppercase tracking-wide text-white/60">Step 5. Geometry Checks + Governing Margin</div>
          <div class="font-mono">Actual e/D = {f(results.edgeDistance.edActual, 4)}</div>
          <div class="font-mono">Min e/D (sequence) = {f(results.edgeDistance.edMinSequence, 4)}</div>
          <div class="font-mono">Min e/D (strength) = {f(results.edgeDistance.edMinStrength, 4)}</div>
          <div class="font-mono">Wall straight / neck = {f(results.geometry.wallStraight, 4)} / {f(results.geometry.wallNeck, 4)} in</div>
          <div class="font-mono">Governing check: {results.governing.name}</div>
          <div class="font-mono">Governing margin: {f(results.governing.margin, 4)}</div>
        </div>
      </CardContent>
    </Card>

    <Card class="glass-card border-amber-300/25">
      <CardHeader class="pb-2">
        <CardTitle class="text-sm text-amber-100">Interpretation Guide (Engineering + Plain Language)</CardTitle>
      </CardHeader>
      <CardContent class="space-y-2 text-sm text-white/85">
        <div class="rounded-md border border-white/10 bg-black/25 p-2">
          <div class="font-semibold text-white">Interference and pressure</div>
          <div>
            Positive interference means the bushing is larger than the bore before assembly, so both parts elastically deform and generate contact pressure.
            More interference usually increases retention, but also increases stress and install force.
          </div>
        </div>
        <div class="rounded-md border border-white/10 bg-black/25 p-2">
          <div class="font-semibold text-white">Yield margins</div>
          <div>
            Margin is `allowable / demand - 1`. A value above 0 passes, below 0 fails. Example: margin of 1.0 means the part can handle roughly double the current demand.
          </div>
        </div>
        <div class="rounded-md border border-white/10 bg-black/25 p-2">
          <div class="font-semibold text-white">Why governing can be negative even with good yield margins</div>
          <div>
            The global decision includes geometry checks (edge distance and wall thickness). If one of those is negative, the design is still rejected even when material yield checks pass.
          </div>
        </div>
        <div class="rounded-md border border-white/10 bg-black/25 p-2">
          <div class="font-semibold text-white">Tolerance feasibility</div>
          <div>
            If bore variation is wider than the allowed interference window, no single OD tolerance can satisfy all combinations. The solver reports infeasible or clamps toward the nearest feasible center.
          </div>
        </div>
        <div class="rounded-md border border-cyan-300/30 bg-cyan-500/8 p-2">
          <div class="font-semibold text-cyan-100">Interference Priority (strict containment mode)</div>
          <div>
            When enabled, the solver enforces interval containment: achieved lower must be greater than or equal to target lower, and achieved upper must be less than or equal to target upper.
            If constraints prevent this, the result is explicitly marked blocked with reason codes.
          </div>
          <div class="mt-1 font-mono text-[11px] text-cyan-100/90">
            required bore width = target upper - target lower
          </div>
          <div class="font-mono text-[11px] text-cyan-100/90">
            containment feasible only if available bore width is less than or equal to required bore width
          </div>
          <div class="mt-1 text-white/80">
            Reamer-fixed workflows should keep bore lock enabled. Adjustable workflows can allow bore-band tightening while preserving bore nominal.
          </div>
        </div>
        <div class="rounded-md border border-cyan-300/35 bg-cyan-500/10 p-2">
          <div class="text-[11px] uppercase tracking-wide text-cyan-100">Current design snapshot</div>
          <div class="font-mono">Units: {form.units}</div>
          <div class="font-mono">Profile: external={form.bushingType}, internal={form.idType}</div>
          <div class="font-mono">Effective interference = {f(results.physics.deltaEffective, 5)} in</div>
          <div class="font-mono">Contact pressure = {k(results.physics.contactPressure, 3)} ksi</div>
          <div class="font-mono">Governing margin = {f(results.governing.margin, 4)}</div>
          <div class="font-mono">Estimated utilization = {pct(1 / (results.governing.margin + 1), 1)}</div>
        </div>
      </CardContent>
    </Card>
  </div>
</div>
