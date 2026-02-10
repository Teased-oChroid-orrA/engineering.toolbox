<script lang="ts">
  import { Badge, Card, CardContent } from '$lib/components/ui';
  import type { BushingInputs, BushingOutput } from '$lib/core/bushing';

  export let form: BushingInputs;
  export let results: BushingOutput;

  const PSI_TO_MPA = 0.006894757;
  const LBF_TO_N = 4.4482216152605;

  const fmt = (n: number | null | undefined, d = 2) => (!Number.isFinite(Number(n)) ? '---' : Number(n).toFixed(d));
  const fmtStress = (psi: number) => (!Number.isFinite(psi) ? '---' : (form.units === 'metric' ? (psi * PSI_TO_MPA).toFixed(1) : (psi / 1000).toFixed(2)));
  const fmtForce = (lbf: number) => (!Number.isFinite(lbf) ? '---' : (form.units === 'metric' ? (lbf * LBF_TO_N).toFixed(0) : lbf.toFixed(0)));
  const stressUnit = () => (form.units === 'metric' ? 'MPa' : 'ksi');
  const forceUnit = () => (form.units === 'metric' ? 'N' : 'lbf');
  $: failed = results.governing.margin < 0 || results.physics.marginHousing < 0 || results.physics.marginBushing < 0;
</script>

<div class="space-y-3">
  <div class="flex items-center justify-between">
    <h3 class="text-sm font-semibold text-slate-100">Results Summary</h3>
    <Badge variant="outline" class={failed ? 'border-amber-400/40 text-amber-200' : 'border-emerald-400/40 text-emerald-200'}>
      {failed ? 'ATTN' : 'PASS'}
    </Badge>
  </div>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <Card class="bushing-results-card border-l-4 border-emerald-500 bushing-pop-card">
      <CardContent class="pt-5 text-sm">
        <div class="text-[10px] mb-2 uppercase tracking-wide text-indigo-200/95 font-bold">Safety Margins (Yield)</div>
        <div class="flex justify-between"><span class="text-slate-100/95 font-medium">Housing</span><span class="font-mono text-emerald-300 font-semibold">{fmt(results.physics.marginHousing)}</span></div>
        <div class="flex justify-between"><span class="text-slate-100/95 font-medium">Bushing</span><span class="font-mono text-emerald-300 font-semibold">{fmt(results.physics.marginBushing)}</span></div>
        <div class="flex justify-between"><span class="text-slate-100/95 font-medium">Governing</span><span class="font-mono text-slate-100 font-semibold">{fmt(results.governing.margin)}</span></div>
      </CardContent>
    </Card>
    <Card class="bushing-results-card bushing-pop-card">
      <CardContent class="pt-5 text-sm space-y-1">
        <div class="text-[10px] mb-2 uppercase tracking-wide text-indigo-200/95 font-bold">Fit Physics</div>
        <div class="flex justify-between"><span class="text-slate-100/95 font-medium">Contact Pressure</span><span class="font-mono text-slate-100 font-semibold">{fmtStress(results.physics.contactPressure)} {stressUnit()}</span></div>
        <div class="flex justify-between"><span class="text-slate-100/95 font-medium">Install Force</span><span class="font-mono text-slate-100 font-semibold">{fmtForce(results.physics.installForce)} {forceUnit()}</span></div>
        <div class="flex justify-between"><span class="text-slate-100/95 font-medium">Interference (eff.)</span><span class="font-mono text-amber-200 font-semibold">{fmt(results.physics.deltaEffective, 4)}</span></div>
      </CardContent>
    </Card>
  </div>
</div>
