<script lang="ts">
  import { Card, CardHeader, CardTitle, CardContent, Label, Input, Select, Badge, Separator } from '$lib/components/ui';
  import BushingDrafting from '$lib/drafting/bushing/BushingDrafting.svelte';
  import { renderDraftingSheetSvg } from '$lib/drafting/core/render';
  import { exportSvgText, exportPdfFromHtml } from '$lib/drafting/core/export';
  import { computeBushing, type BushingInputs } from '$lib/core/bushing/solve';
  import { MATERIALS } from '$lib/core/bushing/materials';
  import { cn } from '$lib/utils';

  const KEY = 'scd.bushing.inputs.v15';

  let form: BushingInputs = {
    units: 'imperial',
    boreDia: 0.5000,
    interference: 0.0015,
    housingLen: 0.500,
    housingWidth: 1.500,
    edgeDist: 0.750,
    bushingType: 'straight',
    flangeOd: 0.750,
    flangeThk: 0.063,
    idType: 'straight',
    idBushing: 0.3750,
    csMode: 'depth_angle',
    csDia: 0.500,
    csDepth: 0.125,
    csAngle: 100,
    extCsMode: 'depth_angle',
    extCsDia: 0.625,
    extCsDepth: 0.125,
    extCsAngle: 100,
    matHousing: MATERIALS[0].id,
    matBushing: 'bronze',
    friction: 0.15,
    dT: 0,
    minWallStraight: 0.050,
    minWallNeck: 0.040
  };

  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(KEY);
    if (raw) { try { form = { ...form, ...JSON.parse(raw) }; } catch (e) { console.error(e); } }
  }
  $: if (typeof window !== 'undefined') localStorage.setItem(KEY, JSON.stringify(form));

  $: results = computeBushing(form);
  $: isFailed = results?.physics?.marginHousing < 0 || results?.physics?.marginBushing < 0 || results?.governing?.margin < 0;

  const CS_MODES = [ {value: 'depth_angle', label: 'Depth & Angle'}, {value: 'dia_angle', label: 'Dia & Angle'}, {value: 'dia_depth', label: 'Dia & Depth'} ];
  const fmt = (n: number) => isNaN(n) ? '---' : n.toFixed(0);
  const fmtDec = (n: number) => isNaN(n) ? '---' : n.toFixed(4);
  const PSI_TO_MPA = 0.006894757;
  const LBF_TO_N = 4.4482216152605;

  $: matH = MATERIALS.find((m) => m.id === form.matHousing) || MATERIALS[0];
  $: baseFbruPsi = ((matH?.Fbru_ksi ?? matH?.Sy_ksi ?? 0) * 1000);
  $: pressurePsi = results?.physics?.contactPressure ?? 0;

  // Model coefficient used by the solver (Fbru_eff = Fbru + k*p).
  const kUplift = 0.8;
  $: upliftPsi = kUplift * pressurePsi;
  $: fbruEffPsi = baseFbruPsi + upliftPsi;
  $: upliftFrac = baseFbruPsi > 1e-9 ? upliftPsi / baseFbruPsi : 0;

  const fmtStress = (psi: number) => {
    if (!Number.isFinite(psi)) return '---';
    if (form.units === 'metric') return (psi * PSI_TO_MPA).toFixed(1); // MPa
    return (psi / 1000).toFixed(2); // ksi
  };

  const stressUnit = () => (form.units === 'metric' ? 'MPa' : 'ksi');

  const fmtForce = (lbf: number) => {
    if (!Number.isFinite(lbf)) return '---';
    if (form.units === 'metric') return (lbf * LBF_TO_N).toFixed(0); // N
    return lbf.toFixed(0); // lbf
  };

  const forceUnit = () => (form.units === 'metric' ? 'N' : 'lbf');

  // --- WP2.8 Export (solver-authoritative drafting + report) ---
  function unitsLabel() {
    return form.units === 'metric' ? 'metric (mm, N, MPa)' : 'imperial (in, lbf, ksi)';
  }

  function buildAssumptions(): string[] {
    const a: string[] = [];
    a.push('Interference fit pressure computed with Lamé thick-cylinder compatibility (finite plate equivalent OD).');
    a.push('Pressure-to-bearing uplift uses Fbru_eff = Fbru + k·p with k = 0.8.');
    a.push(form.fit?.mode === 'thermal' ? 'Thermal interference enabled (ΔT contributes to δ).' : 'Thermal interference not applied.');
    a.push('Units are converted for display; internal base is imperial (in, lbf, psi).');
    return a;
  }

  function buildMeta() {
    return {
      title: 'Structural Companion — Bushing Toolbox',
      subtitle: 'Bushing Section',
      drawingNo: 'SC-BUSHING',
      sheet: '1/1',
      scale: 'NTS',
      rev: 'A',
      date: new Date().toISOString().slice(0, 10),
      units: unitsLabel(),
      assumptions: buildAssumptions(),
      payload: {
        inputs: form,
        governing: results.governing,
        candidates: (results as any).candidates ?? null,
        lame: (results as any).lame ?? null
      }
    };
  }

  function makeReportHtml(svgText: string, title: string) {
    const escHtml = (s: string) => String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] as string));
    const assumptions = buildAssumptions().map(x => `<li>${escHtml(x)}</li>`).join('');
    const gov = results.governing?.mode ?? '—';
    const ms = Number.isFinite(results.governing?.margin) ? results.governing.margin.toFixed(3) : '—';
    const p = (results as any).lame?.pressureKsi;
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>${escHtml(title)}</title>
<style>
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;margin:24px;color:#111}
  h1{margin:0 0 8px 0;font-size:18px}
  .meta{font-size:12px;color:#333;margin-bottom:14px}
  .box{border:1px solid #bbb;padding:10px;border-radius:8px}
  .muted{color:#555}
  svg{max-width:100%;height:auto;border:1px solid #ddd;border-radius:8px}
</style>
</head>
<body>
  <h1>Structural Companion — Bushing Toolbox</h1>
  <div class="meta">Units: <b>${escHtml(unitsLabel())}</b> • Date: ${escHtml(new Date().toISOString().slice(0,10))}</div>
  <div class="box">
    <div><b>Governing:</b> ${escHtml(gov)}</div>
    <div><b>Margin of Safety:</b> ${escHtml(ms)}</div>
    ${p ? `<div class="muted"><b>Contact Pressure:</b> ${escHtml(String(p))} ksi</div>` : ''}
  </div>
  <h2 style="font-size:14px;margin:16px 0 6px 0;">Assumptions</h2>
  <ul>${assumptions}</ul>
  <h2 style="font-size:14px;margin:16px 0 6px 0;">Drafting Sheet</h2>
  ${svgText}
</body>
</html>`;
  }

  async function onExportSvg() {
    const svgText = renderDraftingSheetSvg('bushing', form, buildMeta());
    await exportSvgText(svgText, 'bushing_drafting.svg');
  }

  async function onExportPdf() {
    const svgText = renderDraftingSheetSvg('bushing', form, buildMeta());
    const html = makeReportHtml(svgText, 'Structural Companion — Bushing Report');
    await exportPdfFromHtml(html, 'Structural Companion — Bushing Report');
  }

</script>

<div class="grid h-[calc(100vh-6rem)] grid-cols-1 gap-4 overflow-hidden p-1 lg:grid-cols-[450px_1fr]">
  <div class="flex flex-col gap-4 overflow-y-auto pb-24 pr-2 scrollbar-hide">
    <div class="flex items-center justify-between px-1">
      <h2 class="text-lg font-semibold tracking-tight text-white">Bushing Toolbox</h2>
      <Badge variant="outline" class="border-white/20 text-white/50">v3.6</Badge>
    </div>

    <Card class="glass-card">
      <CardHeader class="pb-2 pt-4"><CardTitle class="text-[10px] font-bold uppercase text-indigo-300">Configuration</CardTitle></CardHeader>
      <CardContent class="grid grid-cols-1 gap-4">
        <div class="space-y-1">
          <Label class="text-white/70">Units</Label>
          <div class="flex rounded-lg border border-white/10 bg-black/30 p-1">
            <button class={cn("flex-1 rounded-md py-1 text-xs font-medium transition-all", form.units==='imperial'?"bg-white/10 text-white shadow-sm":"text-white/40 hover:text-white/70")} on:click={()=>form.units='imperial'}>Imperial</button>
            <button class={cn("flex-1 rounded-md py-1 text-xs font-medium transition-all", form.units==='metric'?"bg-white/10 text-white shadow-sm":"text-white/40 hover:text-white/70")} on:click={()=>form.units='metric'}>Metric</button>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1"><Label class="text-white/70">Housing Matl</Label><Select bind:value={form.matHousing} items={MATERIALS.map(m=>({value:m.id, label:m.name}))} /></div>
          <div class="space-y-1"><Label class="text-white/70">Bushing Matl</Label><Select bind:value={form.matBushing} items={MATERIALS.map(m=>({value:m.id, label:m.name}))} /></div>
        </div>
      </CardContent>
    </Card>

    <Card class="glass-card">
      <CardHeader class="pb-2 pt-4"><CardTitle class="text-[10px] font-bold uppercase text-indigo-300">Interface Geometry</CardTitle></CardHeader>
      <CardContent class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1"><Label class="text-white/70">Bore Dia</Label><Input type="number" step="0.0001" bind:value={form.boreDia} /></div>
          <div class="space-y-1"><Label class="text-white/70">Interference</Label><Input type="number" step="0.0001" bind:value={form.interference} class="text-amber-200"/></div>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <div class="space-y-1"><Label class="text-white/70">Housing Thk</Label><Input type="number" step="0.001" bind:value={form.housingLen} /></div>
          <div class="space-y-1"><Label class="text-white/70">Plate Width</Label><Input type="number" step="0.001" bind:value={form.housingWidth} /></div>
          <div class="space-y-1"><Label class="text-white/70">Edge Dist</Label><Input type="number" step="0.001" bind:value={form.edgeDist} /></div>
        </div>
      </CardContent>
    </Card>

    <Card class="glass-card">
      <CardHeader class="pb-2 pt-4"><CardTitle class="text-[10px] font-bold uppercase text-indigo-300">External Profile</CardTitle></CardHeader>
      <CardContent class="space-y-4">
        <div class="flex rounded-lg border border-white/10 bg-black/30 p-1 text-xs font-medium">
          <button class={cn("flex-1 rounded-md py-1 transition-all", form.bushingType==='straight'?"bg-white/10 text-white shadow-sm":"text-white/40 hover:text-white/70")} on:click={()=>form.bushingType='straight'}>Straight</button>
          <button class={cn("flex-1 rounded-md py-1 transition-all", form.bushingType==='flanged'?"bg-white/10 text-white shadow-sm":"text-white/40 hover:text-white/70")} on:click={()=>form.bushingType='flanged'}>Flanged</button>
          <button class={cn("flex-1 rounded-md py-1 transition-all", form.bushingType==='countersink'?"bg-white/10 text-white shadow-sm":"text-white/40 hover:text-white/70")} on:click={()=>form.bushingType='countersink'}>C'Sink</button>
        </div>

        {#if form.bushingType === 'flanged'}
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1"><Label class="text-white/70">Flange OD</Label><Input type="number" step="0.001" bind:value={form.flangeOd} /></div>
            <div class="space-y-1"><Label class="text-white/70">Flange Thk</Label><Input type="number" step="0.001" bind:value={form.flangeThk} /></div>
          </div>
        {/if}

        {#if form.bushingType === 'countersink'}
          <div class="rounded-lg border border-white/10 bg-white/5 p-3 space-y-3">
            <div class="flex items-center justify-between text-xs text-white/60">
              <span>External Countersink</span>
              <Select bind:value={form.extCsMode} items={CS_MODES} />
            </div>
            <div class="grid grid-cols-3 gap-2 text-xs">
              <div><Label class="text-white/50">Dia</Label><Input type="number" step="0.001" bind:value={form.extCsDia} /></div>
              <div><Label class="text-white/50">Depth</Label><Input type="number" step="0.001" bind:value={form.extCsDepth} /></div>
              <div><Label class="text-white/50">Angle</Label><Input type="number" step="1" bind:value={form.extCsAngle} /></div>
            </div>
          </div>
        {/if}
      </CardContent>
    </Card>

    <Card class="glass-card">
      <CardHeader class="pb-2 pt-4"><CardTitle class="text-[10px] font-bold uppercase text-indigo-300">Internal Profile</CardTitle></CardHeader>
      <CardContent class="space-y-3">
        <div class="flex rounded-lg border border-white/10 bg-black/30 p-1 text-xs font-medium">
          <button class={cn("flex-1 rounded-md py-1 transition-all", form.idType==='straight'?"bg-white/10 text-white shadow-sm":"text-white/40 hover:text-white/70")} on:click={()=>form.idType='straight'}>Straight</button>
          <button class={cn("flex-1 rounded-md py-1 transition-all", form.idType==='countersink'?"bg-white/10 text-white shadow-sm":"text-white/40 hover:text-white/70")} on:click={()=>form.idType='countersink'}>C'Sink</button>
        </div>
        <div class="grid grid-cols-3 gap-2 text-xs">
          <div class="space-y-1"><Label class="text-white/70">ID</Label><Input type="number" step="0.0001" bind:value={form.idBushing} /></div>
          <div class="space-y-1"><Label class="text-white/70">CS Dia</Label><Input type="number" step="0.001" bind:value={form.csDia} disabled={form.idType!=='countersink'} /></div>
          <div class="space-y-1"><Label class="text-white/70">CS Depth</Label><Input type="number" step="0.001" bind:value={form.csDepth} disabled={form.idType!=='countersink'} /></div>
        </div>
        {#if form.idType === 'countersink'}
          <div class="grid grid-cols-2 gap-2">
            <div><Label class="text-white/50 text-xs">CS Mode</Label><Select bind:value={form.csMode} items={CS_MODES} /></div>
            <div><Label class="text-white/50 text-xs">CS Angle</Label><Input type="number" step="1" bind:value={form.csAngle} /></div>
          </div>
        {/if}
      </CardContent>
    </Card>

    <Card class="glass-card">
      <CardHeader class="pb-2 pt-4"><CardTitle class="text-[10px] font-bold uppercase text-indigo-300">Process & Limits</CardTitle></CardHeader>
      <CardContent class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1"><Label class="text-white/70">ΔT</Label><Input type="number" step="5" bind:value={form.dT} class="text-amber-200" /></div>
          <div class="space-y-1"><Label class="text-white/70">Friction</Label><Input type="number" step="0.01" bind:value={form.friction} /></div>
        </div>
        <Separator class="bg-white/10" />
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1"><Label class="text-white/70">Min Straight Wall</Label><Input type="number" step="0.001" bind:value={form.minWallStraight} /></div>
          <div class="space-y-1"><Label class="text-white/70">Min Neck Wall</Label><Input type="number" step="0.001" bind:value={form.minWallNeck} /></div>
        </div>
      </CardContent>
    </Card>
        </div>

  <div class="flex h-full flex-col gap-4 overflow-hidden">
    <Card class="flex-1 flex flex-col overflow-hidden border-teal-500/20 bg-teal-500/10 backdrop-blur-sm relative group p-0">
      <div class="border-b border-teal-500/10 bg-teal-900/20 px-4 py-3 z-10 backdrop-blur-sm shrink-0 flex justify-between items-center">
        <div class="flex items-center gap-2">
          <span class="font-medium text-teal-100/90 text-sm">Assembly Visualization</span>
          {#if results?.geometry?.isSaturationActive}
            <Badge variant="outline" class="text-[9px] bg-indigo-500/20 text-indigo-300 border-indigo-400/30 animate-pulse">INFINITE PLATE</Badge>
          {/if}
        </div>
        <div class="flex items-center gap-2">
          <button class="rounded-md border border-teal-200/10 bg-teal-500/5 px-2 py-1 text-[10px] font-mono text-teal-100/80 hover:bg-teal-500/10" on:click={onExportSvg} title="Export solver-authoritative drafting SVG">Export SVG</button>
          <button class="rounded-md border border-teal-200/10 bg-teal-500/5 px-2 py-1 text-[10px] font-mono text-teal-100/80 hover:bg-teal-500/10" on:click={onExportPdf} title="Print → Save as PDF (includes assumptions + embedded metadata)">Export PDF</button>
          <Badge variant="outline" class="text-[10px] border-teal-500/30 text-teal-200">SECTION A-A</Badge>
        </div>
      </div>
      <div class="flex-1 min-h-0 w-full relative">
        <div class="absolute inset-0 opacity-[0.06] pointer-events-none" style="background-image: radial-gradient(#2dd4bf 1px, transparent 1px); background-size: 18px 18px;"></div>
        <BushingDrafting inputs={{...form, ...results?.geometry}} />
      </div>
    </Card>

    <div class="grid grid-cols-2 gap-4">
      <Card class="bg-white/5 border-l-4 border-emerald-500">
        <CardContent class="pt-5 text-sm">
          <div class="text-[10px] font-bold uppercase text-white/50 mb-2">Safety Margins (Yield)</div>
          <div class="flex justify-between"><span>Housing</span><span class="font-mono text-emerald-400">{results?.physics?.marginHousing?.toFixed(2) ?? '---'}</span></div>
          <div class="flex justify-between"><span>Bushing</span><span class="font-mono text-emerald-400">{results?.physics?.marginBushing?.toFixed(2) ?? '---'}</span></div>
          <div class="flex justify-between"><span>Governing</span><span class="font-mono text-indigo-200">{results?.governing?.margin?.toFixed(2) ?? '---'}</span></div>
        </CardContent>
      </Card>
      <Card class="bg-white/5">
        <CardContent class="pt-5 text-sm">
          <div class="text-[10px] font-bold uppercase text-indigo-300 mb-2">Fit Physics</div>

          <div class="flex justify-between"><span>Contact Pressure</span><span class="font-mono">{fmtStress(pressurePsi)} {stressUnit()}</span></div>
          <div class="flex justify-between"><span>Install Force</span><span class="font-mono">{fmtForce(results?.physics?.installForce)} {forceUnit()}</span></div>
          <div class="flex justify-between"><span>Interf.</span><span class="font-mono text-amber-200">{fmtDec(results?.physics?.deltaEffective)}</span></div>

          <div class="mt-3 rounded-md border border-white/10 bg-black/20 p-2">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-bold uppercase text-white/50">Bearing allowable uplift</span>
              <span class="text-[10px] text-white/40">Fbru_eff = Fbru + k·p (k={kUplift})</span>
            </div>
            <div class="mt-2 space-y-1">
              <div class="flex justify-between"><span class="text-white/70">Base Fbru</span><span class="font-mono">{fmtStress(baseFbruPsi)} {stressUnit()}</span></div>
              <div class="flex justify-between"><span class="text-white/70">Uplift (k·p)</span><span class="font-mono text-amber-200">+{fmtStress(upliftPsi)} {stressUnit()}</span></div>
              <div class="flex justify-between"><span class="text-white/70">Effective Fbru</span><span class="font-mono text-emerald-300">{fmtStress(fbruEffPsi)} {stressUnit()}</span></div>
            </div>
            <div class="mt-2 h-2 w-full overflow-hidden rounded bg-white/10">
              <div class="h-full bg-amber-400/70" style="width: {Math.min(1, Math.max(0, upliftFrac)) * 100}%"></div>
            </div>
            <div class="mt-1 text-[10px] text-white/40">Uplift fraction ≈ {(upliftFrac*100).toFixed(1)}%</div>
          </div>
        </CardContent>
      </Card>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card class="glass-card">
        <CardContent class="pt-4 text-sm space-y-2">
          <div class="text-[10px] font-bold uppercase text-indigo-300 mb-1">Edge Distance</div>
          <div class="flex justify-between"><span>Actual e/D</span><span class="font-mono">{fmtDec(results?.edgeDistance?.edActual)}</span></div>
          <div class="flex justify-between"><span>Min (Seq)</span><span class="font-mono">{fmtDec(results?.edgeDistance?.edMinSequence)}</span></div>
          <div class="flex justify-between"><span>Min (Strength)</span><span class="font-mono">{fmtDec(results?.edgeDistance?.edMinStrength)}</span></div>
          <div class="flex justify-between"><span>Mode</span><span class="font-mono text-white/70">{results?.edgeDistance?.governing ?? '---'}</span></div>
        </CardContent>
      </Card>
      <Card class="glass-card">
        <CardContent class="pt-4 text-sm space-y-2">
          <div class="text-[10px] font-bold uppercase text-indigo-300 mb-1">Wall Thickness</div>
          <div class="flex justify-between"><span>Straight</span><span class="font-mono">{fmtDec(results?.sleeveWall)}</span></div>
          <div class="flex justify-between"><span>Neck</span><span class="font-mono">{fmtDec(results?.neckWall)}</span></div>
          <div class="flex justify-between"><span>Governing</span><span class="font-mono text-white/70">{results?.governing?.name ?? '---'}</span></div>
        </CardContent>
      </Card>
    </div>

    {#if results?.warnings?.length}
      <Card class="border border-amber-400/30 bg-amber-500/5">
        <CardContent class="pt-4 text-sm space-y-2">
          <div class="text-[10px] font-bold uppercase text-amber-300 mb-1">Warnings</div>
          {#each results.warnings as w}
            <div class="flex items-start gap-2"><span>⚠️</span><span>{w}</span></div>
          {/each}
        </CardContent>
      </Card>
    {/if}
  </div>
</div>
