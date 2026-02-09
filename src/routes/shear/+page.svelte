<script lang="ts">
  import { Card, CardHeader, CardTitle, CardContent, Label, Input, Select, Badge, Separator } from '$lib/components/ui';
  import ShearDrafting from '$lib/drafting/shear/ShearDrafting.svelte';
  import { renderDraftingSheetSvg } from '$lib/drafting/core/render';
  import { exportSvgText, exportPdfFromHtml } from '$lib/drafting/core/export';
  import { computeShear } from '$lib/core/shear/solve';
  import type { ShearInputs } from '$lib/core/shear/types';
  import { MATERIALS } from '$lib/core/bushing';
  import { cn } from '$lib/utils';

  const KEY = 'scd.shear.inputs.v9';

  let form: ShearInputs = {
    units: 'imperial', planes: 1, dia: 0.25, t1: 0.125, t2: 0.125, t3: 0.125,
    width: 1.0, edgeDist: 0.5, load: 1000, safetyFactor: 1.5, thetaDeg: 40,
    // Legacy preset selector for interaction exponent (see ShearInputs docs)
    toughness: 0.75,
    interactionExponent: undefined,
    plateMat: MATERIALS[0].id, fastenerFsu_ksi: 95,
    isCountersunk: false, csAngleDeg: 100
  };

  // Interaction exponent helpers (WP2.4)
  const presetExponent = (t: ShearInputs['toughness']) => (t === 0.25 ? 1.0 : t === 0.5 ? 1.5 : 2.0);
  $: interactionPresetM = presetExponent(form.toughness);
  $: interactionUseCustom = typeof form.interactionExponent === 'number' && !isNaN(form.interactionExponent);

  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(KEY);
    if (raw) { try { form = { ...form, ...JSON.parse(raw) }; } catch (e) { console.error(e); } }
  }
  $: if (typeof window !== 'undefined') localStorage.setItem(KEY, JSON.stringify(form));

  $: results = computeShear(form);
  $: margin = typeof results.governing.margin === 'number' ? results.governing.margin : -1;

  // Criticality Checks
  $: isFastenerCritical = results.governing.highlightMode === 'pinShear';
  $: isInteractionCritical = results.governing.highlightMode === 'interaction';

  $: warnings = [
    ...results.warnings,
    ...(form.safetyFactor < 1.0 ? [{ message: 'Safety Factor < 1.0', subItems: ['Results are non-conservative'], type: 'danger' }] : []),
    ...(form.planes === 2 && form.t3 <= 0 ? [{ message: 'Double shear selected but Thickness 3 is 0', type: 'warning' }] : [])
  ];

  $: isFailed = margin < 0 || warnings.some(w => w.type === 'danger' || w.message.includes('not met'));

  const fmt = (n: number | undefined) => (n !== undefined && !isNaN(n) ? n.toFixed(0) : '---');

  $: statusColor = isFailed ? 'text-red-400' : 'text-emerald-400';
  $: statusBorder = isFailed ? 'border-l-red-500' : 'border-l-emerald-500';
  $: statusBg = isFailed ? 'bg-red-500/10' : 'bg-emerald-500/10';
  const cardStyle = "glass-card"; 

  // --- WP2.8 Export (solver-authoritative drafting + report) ---
  function unitsLabel() {
    return form.units === 'metric' ? 'metric (mm, N, MPa)' : 'imperial (in, lbf, ksi)';
  }

  function buildAssumptions(): string[] {
    const a: string[] = [];
    a.push('Strength check uses applied ultimate demand (P × SF).');
    a.push('Sequencing check is capacity ordering (bearing-before-tear-out).');
    a.push(`Interaction exponent m = ${interactionUseCustom ? (form.interactionExponent ?? interactionPresetM) : interactionPresetM}.`);
    a.push(form.isCountersunk ? `Countersink modeled: bearing penalty sin(α/2), α = ${form.csAngleDeg}°.` : 'Countersink not modeled (standard head).');
    a.push('Default tear-out model is projected; explicit fracture-plane model increases required e/D when enabled.');
    return a;
  }

  function buildMeta() {
    return {
      title: 'Structural Companion — Shear Toolbox',
      subtitle: results.governing.reportMode ?? 'Shear Joint Section',
      drawingNo: 'SC-SHEAR',
      sheet: '1/1',
      scale: 'NTS',
      rev: 'A',
      date: new Date().toISOString().slice(0, 10),
      units: unitsLabel(),
      assumptions: buildAssumptions(),
      payload: {
        inputs: form,
        governing: results.governing,
        margin,
        candidates: (results as any).candidates ?? null
      }
    };
  }

  function makeReportHtml(svgText: string, title: string) {
    const escHtml = (s: string) => String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] as string));
    const assumptions = buildAssumptions().map(x => `<li>${escHtml(x)}</li>`).join('');
    const gov = results.governing?.reportMode ?? '—';
    const ms = Number.isFinite(margin) ? margin.toFixed(3) : '—';
    const demand = (results.loads as any)?.demandUlt ?? (form.load * form.safetyFactor);
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>${escHtml(title)}</title>
<style>
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;margin:24px;color:#111}
  h1{margin:0 0 8px 0;font-size:18px}
  .meta{font-size:12px;color:#333;margin-bottom:14px}
  table{border-collapse:collapse;font-size:12px;margin:12px 0}
  td,th{border:1px solid #bbb;padding:6px 8px;text-align:left}
  .box{border:1px solid #bbb;padding:10px;border-radius:8px}
  .muted{color:#555}
  svg{max-width:100%;height:auto;border:1px solid #ddd;border-radius:8px}
</style>
</head>
<body>
  <h1>Structural Companion — Shear Toolbox</h1>
  <div class="meta">Units: <b>${escHtml(unitsLabel())}</b> • Date: ${escHtml(new Date().toISOString().slice(0,10))}</div>
  <div class="box">
    <div><b>Governing:</b> ${escHtml(gov)}</div>
    <div><b>Margin of Safety:</b> ${escHtml(ms)}</div>
    <div class="muted"><b>Demand (Ult):</b> ${escHtml(String(demand))}</div>
  </div>
  <h2 style="font-size:14px;margin:16px 0 6px 0;">Assumptions</h2>
  <ul>${assumptions}</ul>
  <h2 style="font-size:14px;margin:16px 0 6px 0;">Drafting Sheet</h2>
  ${svgText}
</body>
</html>`;
  }

  async function onExportSvg() {
    const svgText = renderDraftingSheetSvg('shear', form, buildMeta());
    await exportSvgText(svgText, 'shear_drafting.svg');
  }

  async function onExportPdf() {
    const svgText = renderDraftingSheetSvg('shear', form, buildMeta());
    const html = makeReportHtml(svgText, 'Structural Companion — Shear Report');
    await exportPdfFromHtml(html, 'Structural Companion — Shear Report');
  }

</script>

<div class="grid h-[calc(100vh-6rem)] grid-cols-1 gap-4 overflow-hidden p-1 lg:grid-cols-[400px_1fr]">
  <div class="flex flex-col gap-4 overflow-y-auto pb-24 pr-2 scrollbar-hide">
    <div class="flex items-center justify-between px-1">
      <h2 class="text-lg font-semibold tracking-tight text-white">Shear Toolbox</h2>
      <Badge variant="outline" class="border-white/20 text-white/50">v3.3</Badge>
    </div>
    <Card class={cardStyle}>
      <CardHeader class="pb-2 pt-4">
        <CardTitle class="text-[10px] font-bold uppercase tracking-widest text-indigo-300">Configuration</CardTitle>
      </CardHeader>
      <CardContent class="grid grid-cols-1 gap-4">
        <div class="space-y-1">
          <Label class="text-white/70">Units</Label>
          <div class="flex rounded-lg border border-white/10 bg-black/30 p-1">
            <button class={cn("flex-1 rounded-md py-1 text-xs font-medium transition-all", form.units === 'imperial' ? "bg-white/10 text-white shadow-sm ring-1 ring-white/5" : "text-white/40 hover:text-white/70")} on:click={() => form.units = 'imperial'}>Imperial</button>
            <button class={cn("flex-1 rounded-md py-1 text-xs font-medium transition-all", form.units === 'metric' ? "bg-white/10 text-white shadow-sm ring-1 ring-white/5" : "text-white/40 hover:text-white/70")} on:click={() => form.units = 'metric'}>Metric</button>
          </div>
        </div>
        <div class="space-y-1"><Label class="text-white/70">Joint Type</Label><Select bind:value={form.planes} items={[{ value: 1, label: 'Single Shear (2-Ply)' }, { value: 2, label: 'Double Shear (3-Ply)' }]} /></div>
      </CardContent>
    </Card>
    <Card class={cardStyle}>
      <CardHeader class="pb-2 pt-4">
        <CardTitle class="text-[10px] font-bold uppercase tracking-widest text-indigo-300">Geometry</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1"><Label class="text-white/70">Fastener Dia (D)</Label><Input type="number" step="0.001" bind:value={form.dia} /></div>
          <div class="space-y-1"><Label class="text-white/70">Edge Distance (e)</Label><Input type="number" step="0.001" bind:value={form.edgeDist} /></div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1"><Label class="text-white/70">Member Width (w)</Label><Input type="number" step="0.01" bind:value={form.width} /></div>
        </div>
        <Separator class="bg-white/10" />
        <div class={cn("grid gap-2", form.planes === 2 ? "grid-cols-3" : "grid-cols-2")}>
          <div class="space-y-1"><Label class="text-[10px] uppercase text-white/50">Thickness 1</Label><Input type="number" step="0.001" bind:value={form.t1} /></div>
          <div class="space-y-1"><Label class="text-[10px] uppercase text-white/50">Thickness 2</Label><Input type="number" step="0.001" bind:value={form.t2} /></div>
          {#if form.planes === 2}
            <div class="space-y-1"><Label class="text-[10px] uppercase text-white/50">Thickness 3</Label><Input type="number" step="0.001" bind:value={form.t3} /></div>
          {/if}
        </div>
      </CardContent>
    </Card>
    <Card class={cardStyle}>
      <CardHeader class="pb-2 pt-4">
        <CardTitle class="text-[10px] font-bold uppercase tracking-widest text-indigo-300">Loads & Criteria</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1"><Label class="text-white/70">Applied Load (P)</Label><Input type="number" step="10" bind:value={form.load} /></div>
          <div class="space-y-1"><Label class="text-white/70">Safety Factor</Label><Input type="number" step="0.1" bind:value={form.safetyFactor} /></div>
          <div class="space-y-1"><Label class="text-white/70">Load Angle (θ)</Label><Input type="number" step="1" bind:value={form.thetaDeg} /></div>
          <div class="space-y-1">
            <div class="flex items-center justify-between">
              <Label class="text-white/70">Interaction exponent (m)</Label>
              <div class="group relative">
                <button type="button" class="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white/70 hover:bg-white/20 transition-colors">?</button>
                <div class="absolute right-0 bottom-full mb-2 w-80 origin-bottom-right scale-95 opacity-0 transition-all group-hover:scale-100 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto z-50">
                  <div class="bg-slate-900 p-4 rounded-xl border border-white/20 shadow-2xl text-slate-200">
                    <div class="text-[11px] font-bold tracking-wide text-white/90">What is “m”?</div>
                    <div class="mt-2 text-[11px] leading-snug text-white/70">
                      The interaction exponent <span class="font-mono text-white/90">m</span> controls how bearing combines with
                      net-section / shear-out.
                    </div>
                    <ul class="mt-3 space-y-1 text-[11px] text-white/70">
                      <li><span class="font-mono text-white/90">m = 1</span> → linear (more conservative; brittle-like)</li>
                      <li><span class="font-mono text-white/90">m = 2</span> → elliptical (ductile metals; common aerospace default)</li>
                      <li><span class="font-mono text-white/90">m</span> in-between → intermediate behavior</li>
                    </ul>
                    <div class="mt-3 text-[11px] text-amber-200/90">
                      Caution: using higher <span class="font-mono">m</span> than appropriate can be non-conservative.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Presets (legacy toughness selector) -->
            <Select
              bind:value={form.toughness}
              items={[
                { value: 0.75, label: 'Ductile (m = 2.0)' },
                { value: 0.5, label: 'Intermediate (m = 1.5)' },
                { value: 0.25, label: 'Conservative (m = 1.0)' }
              ]}
              on:change={() => {
                // If user is not using a custom override, keep exponent derived from preset.
                if (!interactionUseCustom) form.interactionExponent = undefined;
              }}
            />

            <!-- Optional explicit override -->
            <div class="mt-2 flex items-center justify-between gap-2">
              <label class="flex items-center gap-2 text-[11px] text-white/70 select-none">
                <input
                  type="checkbox"
                  class="checkbox checkbox-xs border-white/20 bg-black/30"
                  checked={interactionUseCustom}
                  on:change={(e) => {
                    const on = (e.currentTarget as HTMLInputElement).checked;
                    form.interactionExponent = on ? interactionPresetM : undefined;
                  }}
                />
                Custom m
              </label>

              {#if interactionUseCustom}
                <div class="flex items-center gap-2">
                  <Input type="number" step="0.1" min="1" max="4" bind:value={form.interactionExponent} />
                </div>
              {/if}
            </div>
          </div>
        </div>
        <Separator class="bg-white/10" />
        <div class="space-y-3">
          <div class="space-y-1"><Label class="text-white/70">Plate Material</Label><Select bind:value={form.plateMat} items={MATERIALS.map(m => ({ value: m.id, label: m.name }))} /></div>
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1"><Label class="text-white/70">Fastener Allowable (Fsu)</Label><div class="relative"><Input type="number" step="1" bind:value={form.fastenerFsu_ksi} /><span class="absolute right-3 top-2 text-xs text-white/50">ksi</span></div></div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>

  <div class="flex h-full flex-col gap-4 overflow-hidden">
    <Card class="flex-1 flex flex-col overflow-hidden border-teal-500/20 bg-teal-500/10 backdrop-blur-sm shadow-inner relative group p-0">
      <div class="border-b border-teal-500/10 bg-teal-900/20 px-4 py-3 z-10 backdrop-blur-sm shrink-0">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class={`h-2 w-2 rounded-full ${isFailed ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]'}`}></div>
            <span class="font-medium text-teal-100/90">Visualization</span>
          </div>
          <div class="flex gap-2">
            <button class="rounded-md border border-teal-200/10 bg-teal-500/5 px-2 py-1 text-[10px] font-mono text-teal-100/80 hover:bg-teal-500/10" on:click={onExportSvg} title="Export solver-authoritative drafting SVG">Export SVG</button>
            <button class="rounded-md border border-teal-200/10 bg-teal-500/5 px-2 py-1 text-[10px] font-mono text-teal-100/80 hover:bg-teal-500/10" on:click={onExportPdf} title="Print → Save as PDF (includes assumptions + embedded metadata)">Export PDF</button>
            {#if isFastenerCritical}
              <Badge variant="outline" class="font-mono text-[10px] text-teal-200/50 border-teal-200/10 bg-teal-500/5">FASTENER CRITICAL</Badge>
            {/if}
            <Badge variant="outline" class="font-mono text-[10px] text-teal-200/50 border-teal-200/10">{results.governing.reportMode}</Badge>
          </div>
        </div>
      </div>
      <div class="flex-1 min-h-0 w-full relative">
        <div class="absolute inset-0 opacity-[0.05] pointer-events-none" style="background-image: radial-gradient(#2dd4bf 1px, transparent 1px); background-size: 20px 20px;"></div>
        <ShearDrafting inputs={form} highlightMode={results.governing.highlightMode} />
      </div>
    </Card>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 shrink-0">
      <Card class={`border-l-4 ${statusBorder} ${statusBg} shadow-lg backdrop-blur-md transition-all duration-300`}>
        <CardContent class="pt-6">
          <div class="text-[10px] font-bold uppercase tracking-widest text-white/50">Margin of Safety</div>
          <div class={`mt-1 text-5xl font-black tracking-tighter ${statusColor} tabular-nums drop-shadow-sm`}>{margin.toFixed(3)}</div>
          <div class="mt-2 min-h-[20px]">
            {#if isFailed}
              <div class="flex items-center gap-2 text-xs font-bold text-red-400 animate-pulse"><span>⚠️</span><span>Design Requirements Not Met</span></div>
            {:else}
              <div class="flex items-center gap-2 text-xs font-bold text-emerald-400"><span>✓</span><span>Design Requirements Met</span></div>
            {/if}
          </div>
        </CardContent>
      </Card>

      <Card class="bg-white/5 border-white/5 shadow-lg backdrop-blur-md">
        <CardContent class="pt-5 max-h-[200px] overflow-y-auto custom-scrollbar">
          <div class="mb-3 text-[10px] font-bold uppercase tracking-widest text-indigo-300/70">Critical Capabilities</div>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between border-b border-white/5 pb-1">
              <span class={isFastenerCritical ? "text-primary font-bold" : "text-white/60"}>Pin Shear Cap</span>
              <span class="font-mono font-medium text-white/80">{fmt(results.loads.pinShear)}</span>
            </div>
            <div class="flex justify-between border-b border-white/5 pb-1">
              <span class={isInteractionCritical ? "text-primary font-bold" : "text-white/60"}>Interaction Cap</span>
              <span class="font-mono font-medium text-white/80">{fmt(results.loads.interaction)}</span>
            </div>
            <div class="mt-2">
              <div class="text-[9px] text-white/40 uppercase tracking-wider mb-1">Per Member Limits</div>
              {#each results.memberCapacities as m}
                <div class="grid grid-cols-3 gap-2 text-xs mb-1 hover:bg-white/5 p-1 rounded">
                  <span class="text-white/60">L{m.id}</span>
                  <span class="text-right font-mono text-teal-200/80">Br: {fmt(m.bearing)}</span>
                  <span class="text-right font-mono text-amber-200/80">TO: {fmt(m.tearOut)}</span>
                </div>
              {/each}
            </div>
            <div class="flex justify-between pt-2 border-t border-white/10 mt-2">
              <span class="font-medium text-indigo-200">Applied (P × SF)</span>
              <span class="font-mono font-bold text-white">{fmt(form.load * (form.safetyFactor || 1))}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    
    {#if warnings.length > 0}
      <div class="relative overflow-visible rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 backdrop-blur-md shadow-lg transition-all animate-in fade-in slide-in-from-bottom-2 shrink-0">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-3">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clip-rule="evenodd" /></svg>
            </div>
            <div><h3 class="text-sm font-bold text-amber-100 uppercase tracking-wide">Analysis Cautions</h3></div>
          </div>
          <div class="group relative">
            <button class="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white/70 hover:bg-white/20 transition-colors">?</button>
            <div class="absolute right-0 bottom-full mb-2 w-80 origin-bottom-right scale-95 opacity-0 transition-all group-hover:scale-100 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto z-50">
              <div class="bg-slate-900 p-4 rounded-xl border border-white/20 shadow-2xl text-slate-200">
                <h4 class="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-3">Engineering Context</h4>
                <div class="space-y-4">
                  <div><span class="block text-xs font-bold text-white mb-1">Sequencing (Ductility)</span><p class="text-[11px] leading-relaxed text-slate-400">Ensures Bearing failure precedes Shear-Out for safety.</p></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="space-y-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
          {#each warnings as w}
            <div class={`flex flex-col gap-1 p-2 rounded border border-transparent ${w.type === 'danger' ? 'bg-red-500/10 border-red-500/20' : 'hover:bg-white/5'}`}>
              <div class="flex items-start gap-3"><span class={`mt-0.5 ${w.type==='danger'?'text-red-400':'text-amber-500'}`}>➤</span><span class={`text-xs font-bold leading-relaxed ${w.type==='danger'?'text-red-200':'text-amber-100'}`}>{w.message}</span></div>
              {#if w.subItems && w.subItems.length > 0}<div class="pl-7 flex flex-col gap-1">{#each w.subItems as item}<div class="text-[11px] font-mono tracking-tight flex items-center gap-2 opacity-80"><span class="h-1 w-1 rounded-full bg-current"></span>{item}</div>{/each}</div>{/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>
