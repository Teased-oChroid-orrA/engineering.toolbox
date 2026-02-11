<script lang="ts">
  export let datumsModalOpen = false;
  export let datumsModalPos = { x: 0, y: 0 };
  export let datumsModalPanelEl: HTMLElement | null = null;
  export let datumPickHint = '';
  export let csysCreateMode: 'global' | 'three_points' | 'point_line' | 'copy' = 'global';
  export let csysOriginPoint = 0;
  export let csysXPoint = 1;
  export let csysYPoint = 2;
  export let csysFromLine = 0;
  export let csysCopyIdx = 0;
  export let planeCreateMode: 'three_points' | 'point_normal' | 'offset_surface' | 'two_lines' | 'point_direction' | 'csys_principal' = 'three_points';
  export let planeP0 = 0;
  export let planeP1 = 1;
  export let planeP2 = 2;
  export let planeNormalVec = { x: 0, y: 0, z: 1 };
  export let planeOffsetSurface = 0;
  export let planeOffsetDist = 0;
  export let planeLineA = 0;
  export let planeLineB = 1;
  export let planeDirPoint = 0;
  export let planeDirVec = { x: 0, y: 0, z: 1 };
  export let planeCsysIdx = 0;
  export let planePrincipal: 'XY' | 'YZ' | 'ZX' = 'XY';
  export let csys: Array<{ name: string }> = [];
  export let planes: Array<{ name: string }> = [];
  export let datumPick: { target: 'csys3' | 'csysPointLine'; slot: 'origin' | 'x' | 'y' | 'line' } | null = null;
  export let startDatumsModalDrag: (ev: PointerEvent) => void;
  export let armDatumPick: (target: 'csys3' | 'csysPointLine', slot: 'origin' | 'x' | 'y' | 'line') => void;
  export let addDatumCsys: () => void;
  export let addDatumPlane: () => void;
</script>

{#if datumsModalOpen}
  <div class="fixed inset-0 z-[300] pointer-events-none">
    <div
      class="absolute pointer-events-auto w-[760px] max-w-[95vw] rounded-2xl border border-white/15 bg-slate-950/95 shadow-2xl p-4 space-y-4"
      style={`left:${datumsModalPos.x}px; top:${datumsModalPos.y}px;`}
      bind:this={datumsModalPanelEl}
    >
      <div class="flex items-center justify-between cursor-move" role="button" tabindex="0" onpointerdown={startDatumsModalDrag} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.preventDefault(); }}>
        <div class="text-sm font-semibold tracking-wide text-white/90">Datums (CSYS & Planes)</div>
        <button class="btn btn-xs variant-soft" onclick={() => { datumsModalOpen = false; datumPick = null; }}>Close</button>
      </div>
      <div class="text-[11px] rounded-lg border border-white/10 bg-black/20 px-2 py-1 font-mono text-white/65">{datumPickHint}</div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div class="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
          <div class="text-[11px] text-white/50 uppercase tracking-widest">Create CSYS</div>
          <select class="select select-xs glass-input w-full" bind:value={csysCreateMode}>
            <option value="global">Global</option><option value="three_points">3 Points</option><option value="point_line">Point + Line</option><option value="copy">Copy Existing</option>
          </select>
          {#if csysCreateMode === 'three_points'}
            <div class="grid grid-cols-3 gap-1 text-[10px]">
              <button class={datumPick?.target === 'csys3' && datumPick.slot === 'origin' ? 'btn btn-xs variant-soft' : 'btn btn-xs variant-soft opacity-80'} onclick={() => armDatumPick('csys3', 'origin')}>Origin ({`P${csysOriginPoint + 1}`})</button>
              <button class={datumPick?.target === 'csys3' && datumPick.slot === 'x' ? 'btn btn-xs variant-soft' : 'btn btn-xs variant-soft opacity-80'} onclick={() => armDatumPick('csys3', 'x')}>X Ref ({`P${csysXPoint + 1}`})</button>
              <button class={datumPick?.target === 'csys3' && datumPick.slot === 'y' ? 'btn btn-xs variant-soft' : 'btn btn-xs variant-soft opacity-80'} onclick={() => armDatumPick('csys3', 'y')}>Y Ref ({`P${csysYPoint + 1}`})</button>
            </div>
          {:else if csysCreateMode === 'point_line'}
            <div class="grid grid-cols-2 gap-1 text-[10px]">
              <button class={datumPick?.target === 'csysPointLine' && datumPick.slot === 'origin' ? 'btn btn-xs variant-soft' : 'btn btn-xs variant-soft opacity-80'} onclick={() => armDatumPick('csysPointLine', 'origin')}>Origin ({`P${csysOriginPoint + 1}`})</button>
              <button class={datumPick?.target === 'csysPointLine' && datumPick.slot === 'line' ? 'btn btn-xs variant-soft' : 'btn btn-xs variant-soft opacity-80'} onclick={() => armDatumPick('csysPointLine', 'line')}>Line ({`L${csysFromLine + 1}`})</button>
            </div>
          {:else if csysCreateMode === 'copy'}
            <input class="input input-xs glass-input w-full" type="number" min="0" bind:value={csysCopyIdx} title="Source CSYS index" />
          {/if}
          <button class="btn btn-xs variant-soft w-full" onclick={addDatumCsys}>+ Add CSYS</button>
        </div>
        <div class="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
          <div class="text-[11px] text-white/50 uppercase tracking-widest">Create Plane</div>
          <select class="select select-xs glass-input w-full" bind:value={planeCreateMode}>
            <option value="three_points">3 Points</option><option value="point_normal">Point + Normal</option><option value="offset_surface">Offset Surface</option><option value="two_lines">2 Lines</option><option value="point_direction">Point + Direction</option><option value="csys_principal">CSYS Principal</option>
          </select>
          {#if planeCreateMode === 'three_points'}
            <div class="grid grid-cols-3 gap-1 text-[10px]"><input class="input input-xs glass-input" type="number" min="0" bind:value={planeP0} /><input class="input input-xs glass-input" type="number" min="0" bind:value={planeP1} /><input class="input input-xs glass-input" type="number" min="0" bind:value={planeP2} /></div>
          {:else if planeCreateMode === 'point_normal'}
            <div class="grid grid-cols-4 gap-1 text-[10px]"><input class="input input-xs glass-input" type="number" min="0" bind:value={planeP0} /><input class="input input-xs glass-input" type="number" step="0.1" bind:value={planeNormalVec.x} /><input class="input input-xs glass-input" type="number" step="0.1" bind:value={planeNormalVec.y} /><input class="input input-xs glass-input" type="number" step="0.1" bind:value={planeNormalVec.z} /></div>
          {:else if planeCreateMode === 'offset_surface'}
            <div class="grid grid-cols-2 gap-1 text-[10px]"><input class="input input-xs glass-input" type="number" min="0" bind:value={planeOffsetSurface} /><input class="input input-xs glass-input" type="number" step="0.1" bind:value={planeOffsetDist} /></div>
          {:else if planeCreateMode === 'two_lines'}
            <div class="grid grid-cols-2 gap-1 text-[10px]"><input class="input input-xs glass-input" type="number" min="0" bind:value={planeLineA} /><input class="input input-xs glass-input" type="number" min="0" bind:value={planeLineB} /></div>
          {:else if planeCreateMode === 'point_direction'}
            <div class="grid grid-cols-4 gap-1 text-[10px]"><input class="input input-xs glass-input" type="number" min="0" bind:value={planeDirPoint} /><input class="input input-xs glass-input" type="number" step="0.1" bind:value={planeDirVec.x} /><input class="input input-xs glass-input" type="number" step="0.1" bind:value={planeDirVec.y} /><input class="input input-xs glass-input" type="number" step="0.1" bind:value={planeDirVec.z} /></div>
          {:else}
            <div class="grid grid-cols-2 gap-1 text-[10px]"><input class="input input-xs glass-input" type="number" min="0" bind:value={planeCsysIdx} /><select class="select select-xs glass-input" bind:value={planePrincipal}><option value="XY">XY</option><option value="YZ">YZ</option><option value="ZX">ZX</option></select></div>
          {/if}
          <button class="btn btn-xs variant-soft w-full" onclick={addDatumPlane}>+ Add Plane</button>
        </div>
      </div>
      <div class="max-h-28 overflow-auto custom-scrollbar pr-1 text-[11px] text-white/60 rounded-xl border border-white/10 bg-black/20 p-2">
        {#if csys.length > 0}<div>CSYS: {csys.map((c, i) => `CS${i + 1}:${c.name}`).join(' • ')}</div>{/if}
        {#if planes.length > 0}<div>Planes: {planes.map((p, i) => `PL${i + 1}:${p.name}`).join(' • ')}</div>{/if}
      </div>
    </div>
  </div>
{/if}
