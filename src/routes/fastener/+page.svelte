<script lang="ts">
  import { onMount } from 'svelte';
  import { Badge, Card, CardContent, CardHeader, CardTitle, Input, Label } from '$lib/components/ui';
  import type { AxialContinuumElementInput, FastenerSolverInput } from '$lib/core/fastener';
  import {
    applyBoltSizeToElements,
    buildNumericExample,
    computeFastenerSolver,
    getBoltSizeCatalog,
    getMaterialCatalog,
    resolveMaterialById,
    verifyFastenerStiffnessRust,
    type FastenerRustVerifyOutput
  } from '$lib/core/fastener';
  import SingleFastenerPreloadViz from '$lib/components/fastener/SingleFastenerPreloadViz.svelte';
  import { cn } from '$lib/utils';

  const STORAGE_KEY = 'scd.fastener.single-preload.v1';
  const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

  function toSinglePreloadInput(base: FastenerSolverInput): FastenerSolverInput {
    const out = clone(base);
    out.external.enabled = false;
    out.external.axialForce = 0;
    out.thermal.enabled = false;
    out.thermal.usePerElement = false;
    out.thermal.deltaT = 0;
    out.contact.enabled = false;
    out.row.enabled = false;
    out.row.force = 0;
    out.row.eccentricity = 0;
    out.row.bolts = [];
    return out;
  }

  const base = toSinglePreloadInput(buildNumericExample('imperial').input);
  let form = $state<FastenerSolverInput>(clone(base));
  let hydrated = $state(false);
  let selectedBoltSizeId = $state('3/8-24');
  let setupOpen = $state(true);
  let rustVerify = $state<FastenerRustVerifyOutput | null>(null);
  let rustVerifyBusy = $state(false);

  const materialCatalog = $derived(getMaterialCatalog(form.units));
  const boltCatalog = $derived(getBoltSizeCatalog(form.units));
  const forceUnit = $derived(form.units === 'metric' ? 'N' : 'lbf');
  const lengthUnit = $derived(form.units === 'metric' ? 'mm' : 'in');
  const areaUnit = $derived(form.units === 'metric' ? 'mm^2' : 'in^2');
  const stiffnessUnit = $derived(form.units === 'metric' ? 'N/mm' : 'lbf/in');
  const torqueUnit = $derived(form.units === 'metric' ? 'N*mm' : 'lbf*in');
  const fmt = (v: number, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : '---');
  const fmtPct = (v: number) => (Number.isFinite(v) ? `${(v * 100).toFixed(1)}%` : '---');

  onMount(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      hydrated = true;
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      const loaded = toSinglePreloadInput({
        ...form,
        ...parsed,
        elements: Array.isArray(parsed?.elements) && parsed.elements.length > 0 ? parsed.elements : form.elements
      });
      form = loaded;
      selectedBoltSizeId = parsed?.selectedBoltSizeId ?? selectedBoltSizeId;
      setupOpen = typeof parsed?.setupOpen === 'boolean' ? parsed.setupOpen : true;
    } finally {
      hydrated = true;
    }
  });

  $effect(() => {
    if (!hydrated || typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...form, selectedBoltSizeId, setupOpen }));
  });

  const solverInput = $derived.by(() => toSinglePreloadInput(form));
  const result = $derived(computeFastenerSolver(solverInput));
  const rustVerifySignature = $derived.by(() =>
    JSON.stringify({
      preload: solverInput.preload,
      elements: solverInput.elements.map((el) => ({
        id: el.id,
        label: el.label,
        kind: el.kind,
        group: el.group,
        length: el.length,
        area: el.area,
        tensileStressArea: el.tensileStressArea ?? null,
        youngsModulus: el.material.youngsModulus
      }))
    })
  );
  const relDiff = (a: number, b: number) => {
    const scale = Math.max(1e-12, Math.abs(a), Math.abs(b));
    return Math.abs(a - b) / scale;
  };
  const rustDelta = $derived.by(() => {
    if (!rustVerify) return null;
    return {
      stiffnessRel: relDiff(result.totals.stiffness, rustVerify.stiffness),
      complianceRel: relDiff(result.totals.compliance, rustVerify.compliance),
      preloadDefRel: relDiff(result.totals.preloadDeformation, rustVerify.preloadDeformation),
      boltRel: relDiff(result.totals.boltElongation, rustVerify.boltElongation),
      clampedRel: relDiff(result.totals.clampedCompression, rustVerify.clampedCompression)
    };
  });
  const rustVerifyPass = $derived.by(() => {
    if (!rustDelta) return false;
    const limit = 1e-9;
    return (
      rustDelta.stiffnessRel <= limit &&
      rustDelta.complianceRel <= limit &&
      rustDelta.preloadDefRel <= limit &&
      rustDelta.boltRel <= limit &&
      rustDelta.clampedRel <= limit
    );
  });
  const preloadDistribution = $derived.by(() => {
    const force = result.totals.preloadForce;
    const totalDeformation = Math.max(1e-12, result.totals.preloadDeformation);
    const totalEnergy = result.elementResults.reduce((sum, row) => sum + 0.5 * force * row.preloadDeformation, 0);
    const safeEnergy = Math.max(1e-12, totalEnergy);
    return result.elementResults.map((row) => {
      const stress = force / Math.max(1e-12, row.area);
      const strain = stress / Math.max(1e-12, row.youngsModulus);
      const strainEnergy = 0.5 * force * row.preloadDeformation;
      return {
        ...row,
        axialForce: force,
        stress,
        strain,
        strainEnergy,
        deformationShare: row.preloadDeformation / totalDeformation,
        energyShare: strainEnergy / safeEnergy
      };
    });
  });

  let verifySeq = 0;
  $effect(() => {
    const sig = rustVerifySignature;
    let cancelled = false;
    const seq = ++verifySeq;
    rustVerifyBusy = true;
    const timer = setTimeout(() => {
      void verifyFastenerStiffnessRust(solverInput).then((resp) => {
        if (cancelled || seq !== verifySeq) return;
        rustVerify = resp;
        rustVerifyBusy = false;
      });
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (seq === verifySeq) rustVerifyBusy = false;
      void sig;
    };
  });

  const setupSummary = $derived({
    units: form.units,
    preloadMode: form.torque.enabled ? 'Torque-derived preload' : 'Direct preload input',
    preload: result.totals.preloadForce,
    segments: form.elements.length,
    boltSegments: form.elements.filter((e) => e.group === 'bolt').length,
    clampedSegments: form.elements.filter((e) => e.group === 'clamped').length,
    boltPreset: selectedBoltSizeId
  });

  function reset(): void {
    form = toSinglePreloadInput(buildNumericExample(form.units).input);
    selectedBoltSizeId = form.units === 'metric' ? 'M10x1.5' : '3/8-24';
  }

  function applySelectedBoltSize(): void {
    const selected = boltCatalog.find((b) => b.id === selectedBoltSizeId);
    if (!selected) return;
    form.elements = applyBoltSizeToElements(form.elements, selected);
    if (form.torque.enabled) {
      form.torque.lead = form.units === 'metric' ? selected.pitchOrTpi : 1 / selected.pitchOrTpi;
      form.torque.pitchDiameter = selected.diameter * 0.9;
      form.torque.bearingMeanDiameter = selected.recommendedBearingDiameter;
    }
  }

  function selectedMaterialId(el: AxialContinuumElementInput): string {
    const found = materialCatalog.find((m) => m.data.name === el.material.name);
    return found?.id ?? '';
  }

  function setMaterial(element: AxialContinuumElementInput, id: string): void {
    const material = resolveMaterialById(form.units, id);
    if (!material) return;
    element.material = material;
  }

  function addMemberSegment(): void {
    const idx = form.elements.filter((e) => e.kind === 'joint-member').length + 1;
    const ref = form.elements.find((e) => e.kind === 'joint-member');
    const material = ref?.material ?? materialCatalog.find((m) => m.family === 'member')?.data ?? form.elements[0].material;
    const el: AxialContinuumElementInput = {
      id: `member-${Date.now()}`,
      label: `Joint Member ${idx}`,
      kind: 'joint-member',
      group: 'clamped',
      length: ref?.length ?? (form.units === 'metric' ? 10 : 0.4),
      area: ref?.area ?? (form.units === 'metric' ? 220 : 0.34),
      material: clone(material)
    };
    form.elements = [...form.elements, el];
  }

  function removeElement(id: string): void {
    if (form.elements.length <= 2) return;
    form.elements = form.elements.filter((el) => el.id !== id);
  }

  function onKindChange(el: AxialContinuumElementInput): void {
    const boltKinds = new Set(['bolt-head', 'bolt-shank', 'bolt-thread']);
    el.group = boltKinds.has(el.kind) ? 'bolt' : 'clamped';
  }
</script>

<div data-route-ready="fastener">
<div class={cn('grid h-[calc(100vh-6rem)] grid-cols-1 gap-4 overflow-hidden p-1', setupOpen ? 'lg:grid-cols-[420px_1fr]' : 'lg:grid-cols-1')}>
  {#if setupOpen}
    <div class="flex flex-col gap-4 overflow-y-auto pb-20 pr-2 scrollbar-hide">
      <div class="flex items-center justify-between px-1">
        <h2 class="text-lg font-semibold tracking-tight text-white">Single Fastener Preload Analysis</h2>
        <Badge variant="outline" class="border-white/20 text-white/60">Aircraft-Grade Focus</Badge>
      </div>

      <Card class="glass-card">
        <CardHeader class="pb-2 pt-4">
          <CardTitle class="text-[10px] font-bold uppercase tracking-widest text-amber-300">1. Preload Definition</CardTitle>
        </CardHeader>
        <CardContent class="space-y-3">
          <div class="grid grid-cols-2 gap-2">
            <div class="space-y-1">
              <Label class="text-white/70">Units</Label>
              <div class="flex rounded-lg border border-white/10 bg-black/30 p-1">
                <button class={cn('flex-1 rounded-md py-1 text-xs', form.units === 'imperial' ? 'bg-white/10 text-white' : 'text-white/45 hover:text-white/80')} onclick={() => { form.units = 'imperial'; selectedBoltSizeId = '3/8-24'; }}>Imperial</button>
                <button class={cn('flex-1 rounded-md py-1 text-xs', form.units === 'metric' ? 'bg-white/10 text-white' : 'text-white/45 hover:text-white/80')} onclick={() => { form.units = 'metric'; selectedBoltSizeId = 'M10x1.5'; }}>Metric</button>
              </div>
            </div>
            <div class="space-y-1">
              <Label class="text-white/70">Preload mode</Label>
              <div class="flex rounded-lg border border-white/10 bg-black/30 p-1">
                <button class={cn('flex-1 rounded-md py-1 text-xs', !form.torque.enabled ? 'bg-white/10 text-white' : 'text-white/45 hover:text-white/80')} onclick={() => (form.torque.enabled = false)}>Direct</button>
                <button class={cn('flex-1 rounded-md py-1 text-xs', form.torque.enabled ? 'bg-white/10 text-white' : 'text-white/45 hover:text-white/80')} onclick={() => (form.torque.enabled = true)}>Torque</button>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-[1fr_auto] gap-2">
            <select class="h-9 rounded-md border border-white/10 bg-black/30 px-2 text-xs text-white" bind:value={selectedBoltSizeId}>
              {#each boltCatalog as b (b.id)}
                <option value={b.id}>{b.label}</option>
              {/each}
            </select>
            <button class="rounded-md border border-white/15 bg-white/5 px-3 text-xs text-white/85 hover:bg-white/10" onclick={applySelectedBoltSize}>Apply Bolt Size</button>
          </div>

          {#if !form.torque.enabled}
            <div class="relative">
              <Label class="text-white/70">Target preload ({forceUnit})</Label>
              <Input type="number" step="10" bind:value={form.preload} />
            </div>
          {:else}
            <div class="grid grid-cols-2 gap-2">
              <div><Label class="text-white/70">Torque ({torqueUnit})</Label><Input type="number" step="1" bind:value={form.torque.appliedTorque} /></div>
              <div><Label class="text-white/70">Lead ({lengthUnit})</Label><Input type="number" step="0.001" bind:value={form.torque.lead} /></div>
              <div><Label class="text-white/70">Pitch diameter ({lengthUnit})</Label><Input type="number" step="0.001" bind:value={form.torque.pitchDiameter} /></div>
              <div><Label class="text-white/70">Thread half-angle (deg)</Label><Input type="number" step="0.1" bind:value={form.torque.threadHalfAngleDeg} /></div>
              <div><Label class="text-white/70">Thread friction</Label><Input type="number" step="0.001" bind:value={form.torque.threadFriction} /></div>
              <div><Label class="text-white/70">Bearing friction</Label><Input type="number" step="0.001" bind:value={form.torque.bearingFriction} /></div>
              <div class="col-span-2"><Label class="text-white/70">Bearing mean diameter ({lengthUnit})</Label><Input type="number" step="0.001" bind:value={form.torque.bearingMeanDiameter} /></div>
            </div>
          {/if}

          <button class="w-full rounded-md border border-white/15 bg-white/5 py-1.5 text-xs text-white/85 hover:bg-white/10" onclick={reset}>Reset Input Stack</button>
        </CardContent>
      </Card>

      <Card class="glass-card">
        <CardHeader class="pb-2 pt-4">
          <CardTitle class="text-[10px] font-bold uppercase tracking-widest text-amber-300">2. Joint Stackup</CardTitle>
        </CardHeader>
        <CardContent class="space-y-2">
          {#each form.elements as el, i (el.id)}
            <div class="rounded-lg border border-white/10 bg-black/20 p-2">
              <div class="mb-2 flex items-center justify-between gap-2">
                <Input class="h-7 text-xs" bind:value={el.label} />
                <button class="rounded border border-white/15 px-2 py-1 text-[10px] uppercase tracking-wide text-white/70 hover:bg-white/10" onclick={() => removeElement(el.id)} disabled={form.elements.length <= 2}>Remove</button>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <Label class="text-[10px] text-white/60">Kind</Label>
                  <select class="h-8 w-full rounded-md border border-white/10 bg-black/30 px-2 text-xs text-white" bind:value={el.kind} onchange={() => onKindChange(el)}>
                    <option value="bolt-head">Bolt Head</option>
                    <option value="bolt-shank">Bolt Shank</option>
                    <option value="bolt-thread">Bolt Thread</option>
                    <option value="washer-head">Washer Head</option>
                    <option value="washer-nut">Washer Nut</option>
                    <option value="joint-member">Joint Member</option>
                    <option value="nut-body">Nut Body</option>
                  </select>
                </div>
                <div>
                  <Label class="text-[10px] text-white/60">Group</Label>
                  <Input class="h-8 text-xs" value={el.group} disabled />
                </div>
                <div><Label class="text-[10px] text-white/60">Length ({lengthUnit})</Label><Input type="number" step="0.001" bind:value={el.length} /></div>
                <div><Label class="text-[10px] text-white/60">Area ({areaUnit})</Label><Input type="number" step="0.001" bind:value={el.area} /></div>
                {#if el.kind === 'bolt-thread'}
                  <div class="col-span-2"><Label class="text-[10px] text-white/60">Thread tensile stress area ({areaUnit})</Label><Input type="number" step="0.001" bind:value={el.tensileStressArea} /></div>
                {/if}
                <div class="col-span-2">
                  <Label class="text-[10px] text-white/60">Material</Label>
                  <select class="h-8 w-full rounded-md border border-white/10 bg-black/30 px-2 text-xs text-white" value={selectedMaterialId(el)} onchange={(e) => setMaterial(el, (e.currentTarget as HTMLSelectElement).value)}>
                    <option value="">Custom (manual)</option>
                    {#each materialCatalog as m (m.id)}
                      <option value={m.id}>{m.label}</option>
                    {/each}
                  </select>
                </div>
                <div><Label class="text-[10px] text-white/60">E</Label><Input type="number" step="1" bind:value={el.material.youngsModulus} /></div>
                <div><Label class="text-[10px] text-white/60">Alpha</Label><Input type="number" step="0.0000001" bind:value={el.material.thermalExpansion} /></div>
              </div>
              <div class="mt-1 text-[10px] text-white/40">Segment {i + 1}</div>
            </div>
          {/each}
          <button class="w-full rounded-md border border-white/15 bg-white/5 py-1.5 text-xs text-white/85 hover:bg-white/10" onclick={addMemberSegment}>Add Joint Member</button>
        </CardContent>
      </Card>
    </div>
  {/if}

  <div class="flex h-full flex-col gap-4 overflow-y-auto pb-16 scrollbar-hide">
    <Card class="glass-card">
      <CardHeader class="pb-2 pt-4">
        <CardTitle class="flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-widest text-amber-200">
          Setup Summary
          <button class="rounded border border-white/20 bg-white/5 px-2 py-1 text-[10px] font-semibold tracking-wide text-white/80 hover:bg-white/10" onclick={() => (setupOpen = !setupOpen)}>
            {setupOpen ? 'Hide Setup' : 'Edit Setup'}
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent class="grid grid-cols-2 gap-2 text-xs md:grid-cols-6">
        <div class="rounded border border-white/10 bg-black/20 px-2 py-1.5"><span class="text-white/50">units</span><div class="font-mono text-white">{setupSummary.units}</div></div>
        <div class="rounded border border-white/10 bg-black/20 px-2 py-1.5"><span class="text-white/50">mode</span><div class="font-mono text-white">{setupSummary.preloadMode}</div></div>
        <div class="rounded border border-white/10 bg-black/20 px-2 py-1.5"><span class="text-white/50">preload</span><div class="font-mono text-white">{fmt(setupSummary.preload, 2)} {forceUnit}</div></div>
        <div class="rounded border border-white/10 bg-black/20 px-2 py-1.5"><span class="text-white/50">segments</span><div class="font-mono text-white">{setupSummary.segments}</div></div>
        <div class="rounded border border-white/10 bg-black/20 px-2 py-1.5"><span class="text-white/50">bolt/clamped</span><div class="font-mono text-white">{setupSummary.boltSegments}/{setupSummary.clampedSegments}</div></div>
        <div class="rounded border border-white/10 bg-black/20 px-2 py-1.5"><span class="text-white/50">bolt preset</span><div class="font-mono text-white">{setupSummary.boltPreset}</div></div>
      </CardContent>
    </Card>

    <Card class={cn('glass-card border-l-4', result.errors.length > 0 ? 'border-l-red-500' : 'border-l-emerald-500')}>
      <CardHeader class="pb-2 pt-4"><CardTitle class="text-[10px] font-bold uppercase tracking-widest text-amber-200">Preload Response</CardTitle></CardHeader>
      <CardContent class="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <div class="rounded-lg border border-white/10 bg-black/20 p-3"><div class="text-[10px] uppercase tracking-widest text-white/45">k_total</div><div class="mt-1 font-mono text-sm text-white">{fmt(result.totals.stiffness, 3)} {stiffnessUnit}</div></div>
        <div class="rounded-lg border border-white/10 bg-black/20 p-3"><div class="text-[10px] uppercase tracking-widest text-white/45">C_total</div><div class="mt-1 font-mono text-sm text-white">{fmt(result.totals.compliance, 10)}</div></div>
        <div class="rounded-lg border border-white/10 bg-black/20 p-3"><div class="text-[10px] uppercase tracking-widest text-white/45">Preload force</div><div class="mt-1 font-mono text-sm text-white">{fmt(result.totals.preloadForce, 2)} {forceUnit}</div></div>
        <div class="rounded-lg border border-white/10 bg-black/20 p-3"><div class="text-[10px] uppercase tracking-widest text-white/45">Bolt elongation</div><div class="mt-1 font-mono text-sm text-white">{fmt(result.totals.boltElongation, 6)} {lengthUnit}</div></div>
        <div class="rounded-lg border border-white/10 bg-black/20 p-3"><div class="text-[10px] uppercase tracking-widest text-white/45">Member compression</div><div class="mt-1 font-mono text-sm text-white">{fmt(result.totals.clampedCompression, 6)} {lengthUnit}</div></div>
        <div class="rounded-lg border border-white/10 bg-black/20 p-3"><div class="text-[10px] uppercase tracking-widest text-white/45">Clamp retention</div><div class={cn('mt-1 font-mono text-sm', result.contact.clampForceAfterContact > 0 ? 'text-emerald-300' : 'text-red-300')}>{result.contact.clampForceAfterContact > 0 ? 'OK' : 'LOSS'}</div></div>
      </CardContent>
      <CardContent class="pt-0 text-[11px] text-white/65">
        Preload-only series equilibrium: axial force is identical through each segment in the closed load path ({fmt(result.totals.preloadForce, 2)} {forceUnit}). Segment-wise distribution is shown via stress, strain, deformation share, and strain-energy share.
      </CardContent>
    </Card>

    <Card class={cn('glass-card border-l-4', rustVerify ? (rustVerifyPass ? 'border-l-emerald-500' : 'border-l-red-500') : 'border-l-amber-500')}>
      <CardHeader class="pb-2 pt-4">
        <CardTitle class="text-[10px] font-bold uppercase tracking-widest text-amber-200">Built-In Rust Solver Cross-Verification</CardTitle>
      </CardHeader>
      <CardContent class="space-y-2 text-xs">
        {#if rustVerifyBusy}
          <div class="text-white/65">Running local Rust verifier...</div>
        {:else if !rustVerify}
          <div class="text-amber-200/90">Rust verifier unavailable in this runtime (expected in browser/unit mode).</div>
        {:else}
          <div class={cn('font-semibold', rustVerifyPass ? 'text-emerald-300' : 'text-red-300')}>
            {rustVerifyPass ? 'PASS: TS stiffness model matches Rust verifier (relative delta <= 1e-9).' : 'FAIL: TS and Rust outputs diverge beyond tolerance.'}
          </div>
          {#if rustDelta}
            <div class="grid grid-cols-2 gap-2 md:grid-cols-5">
              <div class="rounded border border-white/10 bg-black/20 p-2"><div class="text-white/50">k rel</div><div class="font-mono">{fmt(rustDelta.stiffnessRel, 12)}</div></div>
              <div class="rounded border border-white/10 bg-black/20 p-2"><div class="text-white/50">C rel</div><div class="font-mono">{fmt(rustDelta.complianceRel, 12)}</div></div>
              <div class="rounded border border-white/10 bg-black/20 p-2"><div class="text-white/50">delta rel</div><div class="font-mono">{fmt(rustDelta.preloadDefRel, 12)}</div></div>
              <div class="rounded border border-white/10 bg-black/20 p-2"><div class="text-white/50">bolt rel</div><div class="font-mono">{fmt(rustDelta.boltRel, 12)}</div></div>
              <div class="rounded border border-white/10 bg-black/20 p-2"><div class="text-white/50">clamped rel</div><div class="font-mono">{fmt(rustDelta.clampedRel, 12)}</div></div>
            </div>
          {/if}
          {#if rustVerify.warnings.length > 0}
            <div class="space-y-1">
              {#each rustVerify.warnings as w, i (`rw-${i}-${w}`)}<div class="text-amber-200/90">{w}</div>{/each}
            </div>
          {/if}
        {/if}
      </CardContent>
    </Card>

    <Card class="glass-card">
      <CardHeader class="pb-2 pt-4"><CardTitle class="text-[10px] font-bold uppercase tracking-widest text-amber-200">2D Joint Preload Visualization</CardTitle></CardHeader>
      <CardContent>
        <SingleFastenerPreloadViz
          elements={result.elementResults}
          preloadForce={result.totals.preloadForce}
          boltElongation={result.totals.boltElongation}
          clampCompression={result.totals.clampedCompression}
          stiffness={result.totals.stiffness}
          {lengthUnit}
          {forceUnit}
          {stiffnessUnit} />
      </CardContent>
    </Card>

    <Card class="glass-card">
      <CardHeader class="pb-2 pt-4"><CardTitle class="text-[10px] font-bold uppercase tracking-widest text-amber-200">Preload Distribution Along Stackup</CardTitle></CardHeader>
      <CardContent>
        <div class="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {#each preloadDistribution as row (row.id)}
            <div class="rounded-lg border border-white/10 bg-black/20 p-2.5">
              <div class="text-xs font-semibold text-white">{row.label}</div>
              <div class="mt-1 text-[10px] uppercase tracking-wider text-white/45">{row.group} • {row.kind}</div>
              <div class="mt-2 grid grid-cols-2 gap-1.5 text-[11px]">
                <div class="text-white/55">F</div><div class="text-right font-mono text-white">{fmt(row.axialForce, 2)} {forceUnit}</div>
                <div class="text-white/55">sigma = F/A</div><div class="text-right font-mono text-white">{fmt(row.stress, 3)}</div>
                <div class="text-white/55">epsilon = sigma/E</div><div class="text-right font-mono text-white">{fmt(row.strain, 8)}</div>
                <div class="text-white/55">delta share</div><div class="text-right font-mono text-cyan-300">{fmtPct(row.deformationShare)}</div>
                <div class="text-white/55">strain energy share</div><div class="text-right font-mono text-emerald-300">{fmtPct(row.energyShare)}</div>
              </div>
            </div>
          {/each}
        </div>
      </CardContent>
    </Card>

    <Card class="glass-card">
      <CardHeader class="pb-2 pt-4"><CardTitle class="text-[10px] font-bold uppercase tracking-widest text-amber-200">Segment Results</CardTitle></CardHeader>
      <CardContent>
        <div class="overflow-auto rounded-xl border border-white/10">
          <table class="min-w-full text-xs">
            <thead class="bg-surface-900/95">
              <tr>
                <th class="px-3 py-2 text-left text-[10px] uppercase tracking-widest text-white/55">Segment</th>
                <th class="px-3 py-2 text-right text-[10px] uppercase tracking-widest text-white/55">L ({lengthUnit})</th>
                <th class="px-3 py-2 text-right text-[10px] uppercase tracking-widest text-white/55">A ({areaUnit})</th>
                <th class="px-3 py-2 text-right text-[10px] uppercase tracking-widest text-white/55">E</th>
                <th class="px-3 py-2 text-right text-[10px] uppercase tracking-widest text-white/55">k</th>
                <th class="px-3 py-2 text-right text-[10px] uppercase tracking-widest text-white/55">F ({forceUnit})</th>
                <th class="px-3 py-2 text-right text-[10px] uppercase tracking-widest text-white/55">sigma = F/A</th>
                <th class="px-3 py-2 text-right text-[10px] uppercase tracking-widest text-white/55">epsilon</th>
                <th class="px-3 py-2 text-right text-[10px] uppercase tracking-widest text-white/55">delta preload</th>
                <th class="px-3 py-2 text-right text-[10px] uppercase tracking-widest text-white/55">delta share</th>
                <th class="px-3 py-2 text-right text-[10px] uppercase tracking-widest text-white/55">energy share</th>
              </tr>
            </thead>
            <tbody>
              {#each preloadDistribution as row (row.id)}
                <tr class="border-t border-white/10">
                  <td class="px-3 py-2 text-white/90">{row.label} <span class="text-white/40">({row.group})</span></td>
                  <td class="px-3 py-2 text-right font-mono">{fmt(row.length, 4)}</td>
                  <td class="px-3 py-2 text-right font-mono">{fmt(row.area, 4)}</td>
                  <td class="px-3 py-2 text-right font-mono">{fmt(row.youngsModulus, 0)}</td>
                  <td class="px-3 py-2 text-right font-mono">{fmt(row.stiffness, 2)}</td>
                  <td class="px-3 py-2 text-right font-mono">{fmt(row.axialForce, 2)}</td>
                  <td class="px-3 py-2 text-right font-mono">{fmt(row.stress, 3)}</td>
                  <td class="px-3 py-2 text-right font-mono">{fmt(row.strain, 8)}</td>
                  <td class="px-3 py-2 text-right font-mono">{fmt(row.preloadDeformation, 6)}</td>
                  <td class="px-3 py-2 text-right font-mono text-cyan-300">{fmtPct(row.deformationShare)}</td>
                  <td class="px-3 py-2 text-right font-mono text-emerald-300">{fmtPct(row.energyShare)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>

    {#if result.errors.length > 0 || result.warnings.length > 0}
      <Card class="glass-card">
        <CardHeader class="pb-2 pt-4"><CardTitle class="text-[10px] font-bold uppercase tracking-widest text-amber-200">Validation</CardTitle></CardHeader>
        <CardContent class="space-y-1 text-xs">
          {#each result.errors as msg, i (`e-${i}-${msg}`)}<div class="text-red-300">{msg}</div>{/each}
          {#each result.warnings as msg, i (`w-${i}-${msg}`)}<div class="text-amber-200/90">{msg}</div>{/each}
        </CardContent>
      </Card>
    {/if}
  </div>
</div>
</div>
