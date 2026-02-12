<script lang="ts">
  import type { BushingInputs, BushingOutput } from '$lib/core/bushing';

  export let form: BushingInputs;
  export let results: BushingOutput;

  const fmt = (n: number | null | undefined, d = 4) => (!Number.isFinite(Number(n)) ? '---' : Number(n).toFixed(d));

  function boreInputBand() {
    if (form.boreTolMode === 'limits') {
      const lower = Number(form.boreLower ?? form.boreNominal ?? form.boreDia ?? 0);
      const upper = Number(form.boreUpper ?? form.boreNominal ?? form.boreDia ?? lower);
      return { lower: Math.min(lower, upper), upper: Math.max(lower, upper) };
    }
    const nominal = Number(form.boreNominal ?? form.boreDia ?? 0);
    const plus = Math.max(0, Number(form.boreTolPlus ?? 0));
    const minus = Math.max(0, Number(form.boreTolMinus ?? 0));
    return { lower: nominal - minus, upper: nominal + plus };
  }

  $: inputBore = boreInputBand();
  $: inputWidth = Math.max(0, inputBore.upper - inputBore.lower);
  $: solvedWidth = Math.max(0, results.tolerance.bore.upper - results.tolerance.bore.lower);
  $: autoAdjusted = results.tolerance.enforcement.reasonCodes.includes('AUTO_ADJUST_BORE_WIDTH');
</script>

{#if results.tolerance.enforcement.enabled}
  <div class="mt-2 rounded-md border border-white/10 bg-black/25 p-2 text-[10px] text-white/75">
    <div class="font-semibold text-white/90">Interference Enforcement</div>
    <div>Status: {results.tolerance.enforcement.satisfied ? 'satisfied' : 'blocked'}</div>
    <div>Target width: {fmt(results.tolerance.enforcement.targetInterferenceWidth)}</div>
    <div>Bore width (input/solved/required): {fmt(inputWidth)} / {fmt(solvedWidth)} / {fmt(results.tolerance.enforcement.requiredBoreTolWidth)}</div>
    <div>Bore band input -> solved: {fmt(inputBore.lower)}..{fmt(inputBore.upper)} -> {fmt(results.tolerance.bore.lower)}..{fmt(results.tolerance.bore.upper)}</div>
    <div>OD (solved): {fmt(results.tolerance.odBushing.lower)}..{fmt(results.tolerance.odBushing.upper)} (nom {fmt(results.tolerance.odBushing.nominal)})</div>
    <div>Interference achieved: {fmt(results.tolerance.achievedInterference.lower)}..{fmt(results.tolerance.achievedInterference.upper)} (nom {fmt(results.tolerance.achievedInterference.nominal)})</div>
    <div>Auto-adjust applied: {autoAdjusted ? 'yes' : 'no'}</div>
    {#if results.tolerance.enforcement.blocked}
      <div>Containment violations (lower/upper): {fmt(results.tolerance.enforcement.lowerViolation)} / {fmt(results.tolerance.enforcement.upperViolation)}</div>
    {/if}
    <div class="mt-1">Reason codes: {results.tolerance.enforcement.reasonCodes.join(', ')}</div>
  </div>
{/if}
