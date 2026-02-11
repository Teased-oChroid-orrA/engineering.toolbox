<script lang="ts">
  import { Card, CardContent, CardHeader, CardTitle, Input, Label, Select } from '$lib/components/ui';
  import { cn } from '$lib/utils';
  import { solveCountersink, type BushingInputs } from '$lib/core/bushing';
  import BushingCsInput from './BushingCsInput.svelte';

  export let form: BushingInputs;
  export let odInstalled = 0;

  const CS_MODES = [
    { value: 'depth_angle', label: 'Depth & Angle' },
    { value: 'dia_angle', label: 'Dia & Angle' },
    { value: 'dia_depth', label: 'Dia & Depth' }
  ];
  const CS_SYNC_EPSILON = 1e-9;

  let internalCsMode: BushingInputs['csMode'] = form.csMode;
  let externalCsMode: BushingInputs['extCsMode'] = form.extCsMode;

  $: setCountersinkMode('csMode', internalCsMode);
  $: setCountersinkMode('extCsMode', externalCsMode);
  $: internalCsBlocked = form.idType !== 'countersink';
  $: internalCsDiaDisabled = internalCsBlocked || form.csMode === 'depth_angle';
  $: internalCsDepthDisabled = internalCsBlocked || form.csMode === 'dia_angle';
  $: internalCsAngleDisabled = internalCsBlocked || form.csMode === 'dia_depth';
  $: externalCsBlocked = form.bushingType !== 'countersink';
  $: externalCsDiaDisabled = externalCsBlocked || form.extCsMode === 'depth_angle';
  $: externalCsDepthDisabled = externalCsBlocked || form.extCsMode === 'dia_angle';
  $: externalCsAngleDisabled = externalCsBlocked || form.extCsMode === 'dia_depth';
  $: internalComputedLabel = computedFieldLabel(form.csMode, false);
  $: externalComputedLabel = computedFieldLabel(form.extCsMode, true);
  $: if (form.idType === 'countersink') {
    const solved = solveCountersink(form.csMode, form.csDia, form.csDepth, form.csAngle, form.idBushing);
    const derived = getDerivedField(form.csMode);
    if (derived === 'dia') setNumericField('csDia', solved.dia);
    else if (derived === 'depth') setNumericField('csDepth', solved.depth);
    else setNumericField('csAngle', solved.angleDeg);
  }
  $: if (form.bushingType === 'countersink') {
    const baseOd = Number.isFinite(odInstalled) ? odInstalled : (form.boreDia + form.interference);
    const solved = solveCountersink(form.extCsMode, form.extCsDia, form.extCsDepth, form.extCsAngle, baseOd);
    const derived = getDerivedField(form.extCsMode);
    if (derived === 'dia') setNumericField('extCsDia', solved.dia);
    else if (derived === 'depth') setNumericField('extCsDepth', solved.depth);
    else setNumericField('extCsAngle', solved.angleDeg);
  }

  function getDerivedField(mode: BushingInputs['csMode']): 'dia' | 'depth' | 'angle' {
    if (mode === 'depth_angle') return 'dia';
    if (mode === 'dia_angle') return 'depth';
    return 'angle';
  }

  function isDifferent(current: number, next: number) {
    return !Number.isFinite(current) || !Number.isFinite(next) || Math.abs(current - next) > CS_SYNC_EPSILON;
  }

  function setNumericField<K extends keyof BushingInputs>(key: K, value: number) {
    if (!Number.isFinite(value)) return;
    const current = Number(form[key]);
    if (!isDifferent(current, value)) return;
    (form as unknown as Record<string, number>)[String(key)] = value;
    form = form;
  }

  function setCountersinkMode(key: 'csMode' | 'extCsMode', next: string | number | undefined) {
    const mode = String(next ?? '');
    if (mode !== 'depth_angle' && mode !== 'dia_angle' && mode !== 'dia_depth') return;
    if (form[key] === mode) return;
    (form as unknown as Record<string, string>)[key] = mode;
    form = form;
  }

  function computedFieldLabel(mode: BushingInputs['csMode'], external: boolean): string {
    const prefix = external ? 'External ' : '';
    if (mode === 'depth_angle') return `${prefix}CS Dia`;
    if (mode === 'dia_angle') return `${prefix}CS Depth`;
    return `${prefix}CS Angle`;
  }
</script>

<Card class="glass-card bushing-pop-card bushing-depth-2">
  <CardHeader class="pb-2 pt-4">
    <CardTitle class="text-[10px] font-bold uppercase text-indigo-300">3. Profile</CardTitle>
  </CardHeader>
  <CardContent class="space-y-4">
    <div class="rounded-lg border border-white/10 bg-white/5 p-3 bushing-pop-sub bushing-depth-1">
      <div class="mb-2 text-[10px] font-semibold uppercase tracking-wide text-indigo-200/90">External Profile + Settings</div>
      <div class="rounded-lg border border-white/10 bg-black/30 p-1 text-xs font-medium bushing-pop-sub bushing-depth-0">
        <div class="flex gap-1">
          <button class={cn('flex-1 rounded-md py-1 transition-all', form.bushingType === 'straight' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/70')} on:click={() => (form.bushingType = 'straight')}>Straight</button>
          <button class={cn('flex-1 rounded-md py-1 transition-all', form.bushingType === 'flanged' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/70')} on:click={() => (form.bushingType = 'flanged')}>Flanged</button>
          <button class={cn('flex-1 rounded-md py-1 transition-all', form.bushingType === 'countersink' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/70')} on:click={() => (form.bushingType = 'countersink')}>C'Sink</button>
        </div>
      </div>
      {#if form.bushingType === 'flanged'}
        <div class="mt-3 grid grid-cols-2 gap-3">
          <div class="space-y-1"><Label class="text-white/70">Flange OD</Label><Input type="number" step="0.001" bind:value={form.flangeOd} /></div>
          <div class="space-y-1"><Label class="text-white/70">Flange Thk</Label><Input type="number" step="0.001" bind:value={form.flangeThk} /></div>
        </div>
      {/if}
      {#if form.bushingType === 'countersink'}
        <div class="mt-3 space-y-3">
          <div>
            <Label class="text-white/50 text-xs">External CS Mode</Label>
            <Select bind:value={externalCsMode} items={CS_MODES} />
            <div class="mt-1 text-[10px] text-white/45">Computed: {externalComputedLabel} • Editable: the other two fields</div>
          </div>
          <div class="grid grid-cols-3 gap-2 text-xs">
            <BushingCsInput label="External CS Dia" labelClass="text-white/50" step={0.001} bind:value={form.extCsDia} disabled={externalCsDiaDisabled} blocked={externalCsBlocked} />
            <BushingCsInput label="External CS Depth" labelClass="text-white/50" step={0.001} bind:value={form.extCsDepth} disabled={externalCsDepthDisabled} blocked={externalCsBlocked} />
            <BushingCsInput label="External CS Angle" labelClass="text-white/50" step={1} bind:value={form.extCsAngle} disabled={externalCsAngleDisabled} blocked={externalCsBlocked} />
          </div>
        </div>
      {/if}
    </div>

    <div class="rounded-lg border border-white/10 bg-white/5 p-3 bushing-pop-sub bushing-depth-1">
      <div class="mb-2 text-[10px] font-semibold uppercase tracking-wide text-indigo-200/90">Internal Profile + Settings</div>
      <div class="rounded-lg border border-white/10 bg-black/30 p-1 text-xs font-medium bushing-pop-sub bushing-depth-0">
        <div class="flex gap-1">
          <button class={cn('flex-1 rounded-md py-1 transition-all', form.idType === 'straight' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/70')} on:click={() => (form.idType = 'straight')}>Straight</button>
          <button class={cn('flex-1 rounded-md py-1 transition-all', form.idType === 'countersink' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/70')} on:click={() => (form.idType = 'countersink')}>C'Sink</button>
        </div>
      </div>
      <div class="mt-3 grid grid-cols-1 gap-3">
        <div class="space-y-1"><Label class="text-white/70">ID</Label><Input type="number" step="0.0001" bind:value={form.idBushing} /></div>
        {#if form.idType === 'countersink'}
          <div class="space-y-3">
            <div>
              <Label class="text-white/50 text-xs">Internal CS Mode</Label>
              <Select bind:value={internalCsMode} items={CS_MODES} />
              <div class="mt-1 text-[10px] text-white/45">Computed: {internalComputedLabel} • Editable: the other two fields</div>
            </div>
            <div class="grid grid-cols-3 gap-2 text-xs">
              <BushingCsInput label="CS Dia" labelClass="text-white/50" step={0.001} bind:value={form.csDia} disabled={internalCsDiaDisabled} blocked={internalCsBlocked} />
              <BushingCsInput label="CS Depth" labelClass="text-white/50" step={0.001} bind:value={form.csDepth} disabled={internalCsDepthDisabled} blocked={internalCsBlocked} />
              <BushingCsInput label="Internal CS Angle" labelClass="text-white/50" step={1} bind:value={form.csAngle} disabled={internalCsAngleDisabled} blocked={internalCsBlocked} />
            </div>
          </div>
        {/if}
      </div>
    </div>
  </CardContent>
</Card>
