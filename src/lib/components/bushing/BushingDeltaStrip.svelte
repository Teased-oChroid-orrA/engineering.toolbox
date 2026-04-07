<script lang="ts">
  import { Badge, Card, CardContent } from '$lib/components/ui';
  import type { BushingInputs } from '$lib/core/bushing';
  import type { BushingOutput } from '$lib/core/bushing/outputTypes';

  export type BushingLiveSnapshot = {
    label: string;
    results: BushingOutput;
  };

  let {
    form,
    current,
    previous = null
  }: {
    form: BushingInputs;
    current: BushingOutput;
    previous?: BushingLiveSnapshot | null;
  } = $props();

  const fmt = (value: number | null | undefined, digits = 3) =>
    Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : '---';
  const force = (valueLbf: number) => (form.units === 'metric' ? valueLbf * 4.4482216152605 : valueLbf);
  const stress = (valuePsi: number) => (form.units === 'metric' ? valuePsi * 0.006894757 : valuePsi / 1000);
  const forceUnit = () => (form.units === 'metric' ? 'N' : 'lbf');
  const stressUnit = () => (form.units === 'metric' ? 'MPa' : 'ksi');
  const deltaMargin = $derived(previous ? current.governing.margin - previous.results.governing.margin : null);
  const deltaForce = $derived(previous ? force(current.physics.installForce - previous.results.physics.installForce) : null);
  const deltaPressure = $derived(previous ? stress(current.physics.contactPressure - previous.results.physics.contactPressure) : null);
  const currentForce = $derived(force(current.physics.installForce));
  const currentPressure = $derived(stress(current.physics.contactPressure));
</script>

<Card class="border border-white/10 bg-black/25 bushing-pop-card bushing-depth-0">
  <CardContent class="space-y-3 pt-4 text-sm">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-100/85">Live Delta Strip</div>
      {#if previous}
        <Badge variant="outline" class="border-white/15 text-white/72">vs {previous.label}</Badge>
      {/if}
    </div>
    {#if previous}
      <div class="grid grid-cols-1 gap-2 md:grid-cols-3">
        <div class="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-white/78">
          <div class="font-semibold uppercase tracking-wide text-[9px] text-cyan-100/80">Margin</div>
          <div class="mt-1 flex items-baseline justify-between gap-3">
            <div class="font-mono text-slate-100">{fmt(current.governing.margin, 3)}</div>
            <div class={`font-mono ${Number(deltaMargin) >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{fmt(deltaMargin, 3)}</div>
          </div>
          <div class="mt-1 text-[10px] text-white/52">current / shift vs {previous.label}</div>
        </div>
        <div class="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-white/78">
          <div class="font-semibold uppercase tracking-wide text-[9px] text-cyan-100/80">Install Force</div>
          <div class="mt-1 flex items-baseline justify-between gap-3">
            <div class="font-mono text-slate-100">{fmt(currentForce, 0)} {forceUnit()}</div>
            <div class={`font-mono ${Number(deltaForce) <= 0 ? 'text-emerald-300' : 'text-cyan-200'}`}>{fmt(deltaForce, 0)} {forceUnit()}</div>
          </div>
          <div class="mt-1 text-[10px] text-white/52">current / shift vs {previous.label}</div>
        </div>
        <div class="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-white/78">
          <div class="font-semibold uppercase tracking-wide text-[9px] text-cyan-100/80">Contact Pressure</div>
          <div class="mt-1 flex items-baseline justify-between gap-3">
            <div class="font-mono text-slate-100">{fmt(currentPressure, form.units === 'metric' ? 1 : 2)} {stressUnit()}</div>
            <div class={`font-mono ${Number(deltaPressure) <= 0 ? 'text-emerald-300' : 'text-cyan-200'}`}>{fmt(deltaPressure, form.units === 'metric' ? 1 : 2)} {stressUnit()}</div>
          </div>
          <div class="mt-1 text-[10px] text-white/52">current / shift vs {previous.label}</div>
        </div>
      </div>
    {:else}
      <div class="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-white/62">
        Make one change and the strip will keep the prior solved case here so you can see what moved without opening a full compare snapshot.
      </div>
    {/if}
  </CardContent>
</Card>
