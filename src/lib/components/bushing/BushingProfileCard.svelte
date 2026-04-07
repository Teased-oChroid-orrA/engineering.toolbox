<script lang="ts">
  import { Card, CardContent, CardHeader, CardTitle, Input, Label, Select } from '$lib/components/ui';
  import { cn } from '$lib/utils';
  import { solveCountersink, type BushingInputs } from '$lib/core/bushing';
  import { describeReamerEntryForDisplay, type ReamerCatalogEntry } from '$lib/core/bushing/reamerCatalog';
  import BushingCsInput from './BushingCsInput.svelte';

  let {
    form = $bindable(),
    odInstalled = 0,
    selectedIdReamerEntry = null,
    onOpenReamerPicker = () => {},
    onClearIdReamerEntry = () => {}
  }: {
    form: BushingInputs;
    odInstalled?: number;
    selectedIdReamerEntry?: ReamerCatalogEntry | null;
    onOpenReamerPicker?: (target: 'id') => void;
    onClearIdReamerEntry?: () => void;
  } = $props();

  const CS_MODES = [
    { value: 'depth_angle', label: 'Depth & Angle' },
    { value: 'dia_angle', label: 'Dia & Angle' },
    { value: 'dia_depth', label: 'Dia & Depth' }
  ];
  const CS_SYNC_EPSILON = 1e-9;

  let internalCsMode = $state<BushingInputs['csMode']>(form.csMode);
  let externalCsMode = $state<BushingInputs['extCsMode']>(form.extCsMode);

  let internalCsBlocked = $derived(form.idType !== 'countersink');
  let internalCsDiaDisabled = $derived(internalCsBlocked || form.csMode === 'depth_angle');
  let internalCsDepthDisabled = $derived(internalCsBlocked || form.csMode === 'dia_angle');
  let internalCsAngleDisabled = $derived(internalCsBlocked || form.csMode === 'dia_depth');
  let internalDepthToleranceVisible = $derived(!internalCsBlocked && !internalCsDepthDisabled);
  let externalCsBlocked = $derived(form.bushingType !== 'countersink');
  let externalCsDiaDisabled = $derived(externalCsBlocked || form.extCsMode === 'depth_angle');
  let externalCsDepthDisabled = $derived(externalCsBlocked || form.extCsMode === 'dia_angle');
  let externalCsAngleDisabled = $derived(externalCsBlocked || form.extCsMode === 'dia_depth');
  let externalDepthToleranceVisible = $derived(!externalCsBlocked && !externalCsDepthDisabled);
  let internalComputedLabel = $derived(computedFieldLabel(form.csMode, false));
  let externalComputedLabel = $derived(computedFieldLabel(form.extCsMode, true));
  let idReamerActive = $derived(Boolean(selectedIdReamerEntry));
  let measuredIdActive = $derived(Boolean(form.measuredPart?.enabled));

  $effect(() => {
    if (!form.measuredPart) form.measuredPart = { enabled: false, basis: 'nominal', bore: {}, id: {} };
    if (!form.measuredPart.id) form.measuredPart.id = {};
  });

  $effect(() => {
    setCountersinkMode('csMode', internalCsMode);
  });

  $effect(() => {
    setCountersinkMode('extCsMode', externalCsMode);
  });

  $effect(() => {
    if (form.idType === 'countersink') {
      const solved = solveCountersink(form.csMode, form.csDia, form.csDepth, form.csAngle, form.idBushing);
      const derived = getDerivedField(form.csMode);
      if (derived === 'dia') setNumericField('csDia', solved.dia);
      else if (derived === 'depth') setNumericField('csDepth', solved.depth);
      else setNumericField('csAngle', solved.angleDeg);
    }
  });

  $effect(() => {
    if (form.bushingType === 'countersink') {
      const baseOd = Number.isFinite(odInstalled) ? odInstalled : (form.boreDia + form.interference);
      const solved = solveCountersink(form.extCsMode, form.extCsDia, form.extCsDepth, form.extCsAngle, baseOd);
      const derived = getDerivedField(form.extCsMode);
      if (derived === 'dia') setNumericField('extCsDia', solved.dia);
      else if (derived === 'depth') setNumericField('extCsDepth', solved.depth);
      else setNumericField('extCsAngle', solved.angleDeg);
    }
  });

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
    form = { ...form };
  }

  function setCountersinkMode(key: 'csMode' | 'extCsMode', next: string | number | undefined) {
    const mode = String(next ?? '');
    if (mode !== 'depth_angle' && mode !== 'dia_angle' && mode !== 'dia_depth') return;
    if (form[key] === mode) return;
    (form as unknown as Record<string, string>)[key] = mode;
    form = { ...form };
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
          <button class={cn('flex-1 rounded-md py-1 transition-all', form.bushingType === 'straight' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/70')} onclick={() => (form.bushingType = 'straight')}>Straight</button>
          <button class={cn('flex-1 rounded-md py-1 transition-all', form.bushingType === 'flanged' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/70')} onclick={() => (form.bushingType = 'flanged')}>Flanged</button>
          <button class={cn('flex-1 rounded-md py-1 transition-all', form.bushingType === 'countersink' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/70')} onclick={() => (form.bushingType = 'countersink')}>C'Sink</button>
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
            {#if externalDepthToleranceVisible}
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div class="space-y-1">
                  <Label class="text-white/45">External CS Depth +Tol</Label>
                  <Input type="number" min="0" step="0.0001" bind:value={form.extCsDepthTolPlus} />
                </div>
                <div class="space-y-1">
                  <Label class="text-white/45">External CS Depth -Tol</Label>
                  <Input type="number" min="0" step="0.0001" bind:value={form.extCsDepthTolMinus} />
                </div>
              </div>
            {/if}
          </div>
      {/if}
    </div>

    <div class="rounded-lg border border-white/10 bg-white/5 p-3 bushing-pop-sub bushing-depth-1">
      <div class="mb-2 text-[10px] font-semibold uppercase tracking-wide text-indigo-200/90">Internal Profile + Settings</div>
      <div class="rounded-lg border border-white/10 bg-black/30 p-1 text-xs font-medium bushing-pop-sub bushing-depth-0">
        <div class="flex gap-1">
          <button class={cn('flex-1 rounded-md py-1 transition-all', form.idType === 'straight' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/70')} onclick={() => (form.idType = 'straight')}>Straight</button>
          <button class={cn('flex-1 rounded-md py-1 transition-all', form.idType === 'countersink' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/70')} onclick={() => (form.idType = 'countersink')}>C'Sink</button>
        </div>
      </div>
      <div class="mt-3 grid grid-cols-1 gap-3">
        <div class="rounded-2xl border border-cyan-300/18 bg-cyan-500/10 p-3 text-[11px] text-cyan-100/88">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div class="font-semibold uppercase tracking-[0.18em] text-[10px] text-cyan-100/90">ID Definition Source</div>
              <div class="mt-1 text-sm font-semibold text-white">
                {#if selectedIdReamerEntry}
                  Reamer-defined ID
                {:else}
                  Manual ID input
                {/if}
              </div>
              <div class="mt-1 text-white/70">
                {#if selectedIdReamerEntry}
                  {describeReamerEntryForDisplay(selectedIdReamerEntry, form.units)}
                {:else}
                  Pick a tooling size for the internal diameter, or stay manual when you want direct numeric entry.
                {/if}
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="rounded-full bg-cyan-300 px-3 py-1.5 text-[11px] font-semibold text-slate-950 transition-colors hover:bg-cyan-200"
                data-testid="bushing-id-reamer-open"
                onclick={() => onOpenReamerPicker('id')}
              >
                {selectedIdReamerEntry ? 'Change reamer' : 'Select reamer'}
              </button>
              {#if selectedIdReamerEntry}
                <button
                  type="button"
                  class="rounded-full border border-white/14 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-white/80 transition-colors hover:bg-white/[0.08]"
                  onclick={onClearIdReamerEntry}
                >
                  Manual
                </button>
              {/if}
            </div>
          </div>
        </div>
        <div class="space-y-1">
          <Label class="text-white/70">ID</Label>
          <Input type="number" step="0.0001" bind:value={form.idBushing} disabled={idReamerActive} />
        </div>
        {#if measuredIdActive}
          <div class="grid grid-cols-2 gap-3 rounded-xl border border-white/10 bg-slate-950/25 p-3">
            <div class="space-y-1">
              <Label class="text-white/70">Measured ID</Label>
              <Input type="number" step="0.0001" bind:value={form.measuredPart!.id!.actual} />
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div class="space-y-1">
                <Label class="text-white/70">ID +Tol</Label>
                <Input type="number" min="0" step="0.0001" bind:value={form.measuredPart!.id!.tolPlus} />
              </div>
              <div class="space-y-1">
                <Label class="text-white/70">ID -Tol</Label>
                <Input type="number" min="0" step="0.0001" bind:value={form.measuredPart!.id!.tolMinus} />
              </div>
            </div>
          </div>
        {/if}
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
            {#if internalDepthToleranceVisible}
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div class="space-y-1">
                  <Label class="text-white/45">CS Depth +Tol</Label>
                  <Input type="number" min="0" step="0.0001" bind:value={form.csDepthTolPlus} />
                </div>
                <div class="space-y-1">
                  <Label class="text-white/45">CS Depth -Tol</Label>
                  <Input type="number" min="0" step="0.0001" bind:value={form.csDepthTolMinus} />
                </div>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </CardContent>
</Card>
