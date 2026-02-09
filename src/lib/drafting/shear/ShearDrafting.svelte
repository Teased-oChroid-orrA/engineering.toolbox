<script lang="ts">
  export let inputs: {
    units: 'imperial' | 'metric';
    planes: 1 | 2;
    dia: number;
    t1: number;
    t2: number;
    t3: number;
    width: number;
    edgeDist: number;
  } | undefined;

  // FIX: Removed unused 'governing' export to silence warning
  export let highlightMode: 'pinShear' | 'bearing' | 'shearOut' | 'netSection' | 'interaction' | '' = '';

  $: i = inputs || { dia: 0.25, t1: 0.125, t2: 0.125, t3: 0, planes: 1, width: 1.0, edgeDist: 0.5 };
  $: D = i.dia || 0.25;
  $: T_stack = i.planes === 1 ? (i.t1 + i.t2) : (i.t1 + i.t2 + i.t3);
  
  $: geomW = (i.edgeDist || D*2) + D * 2.5; 
  $: geomH = (T_stack || D*2) + D * 2;
  
  // Optimized ViewBox to prevent shrinkage
  $: vbX = -D * 1.0;
  $: vbY = -D * 1.5;
  $: vbW = geomW + D * 2;
  $: vbH = geomH + D * 3;

  const C_STROKE = "currentColor";
  const C_FAIL = "#ef4444"; 
  const C_DIM = "rgba(255,255,255,0.4)";

  function isFail(modes: string[]) {
    return modes.includes(highlightMode);
  }
</script>

<div class="w-full h-full flex items-center justify-center p-0 overflow-hidden">
  {#if inputs}
    <svg 
      width="100%" 
      height="100%" 
      viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
      preserveAspectRatio="xMidYMid meet"
      class="text-white/90 overflow-visible"
    >
      <defs>
        <pattern id="hatch" width="1" height="1" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="1" stroke="currentColor" stroke-width="0.05" opacity="0.25"/>
        </pattern>
        <mask id="holeMask">
            <rect x={vbX} y={vbY} width={vbW} height={vbH} fill="white"/>
            <rect x={i.edgeDist - D/2} y={-D} width={D} height={geomH*2} fill="black"/>
        </mask>
      </defs>

      <g>
        <text x={0} y={-D*0.8} font-size={D*0.25} fill={C_DIM} font-family="monospace" letter-spacing="0.1em">SECTION A-A</text>

        <g mask="url(#holeMask)">
            {#each Array(i.planes === 1 ? 2 : 3) as _, k}
                {@const thick = k===0 ? i.t1 : (k===1 ? i.t2 : i.t3)}
                {@const yPos = k===0 ? 0 : (k===1 ? i.t1 : i.t1 + i.t2)}
                
                <rect x={0} y={yPos} width={geomW} height={thick} fill="url(#hatch)" stroke={C_STROKE} stroke-width={D*0.02} />
            {/each}
        </g>

        {#each Array(i.planes === 1 ? 2 : 3) as _, k}
            {@const thick = k===0 ? i.t1 : (k===1 ? i.t2 : i.t3)}
            {@const yPos = k===0 ? 0 : (k===1 ? i.t1 : i.t1 + i.t2)}

            {#if isFail(['bearing', 'interaction'])}
                <path d={`M ${i.edgeDist + D/2} ${yPos} L ${i.edgeDist + D/2 + D*0.15} ${yPos + thick*0.2} L ${i.edgeDist + D/2} ${yPos + thick*0.4} L ${i.edgeDist + D/2 + D*0.15} ${yPos + thick*0.6} L ${i.edgeDist + D/2} ${yPos + thick}`} fill={C_FAIL} opacity="0.9" />
            {/if}

            {#if isFail(['shearOut', 'interaction']) && k===0}
                <line x1={0} y1={yPos + thick/2 - D/2} x2={i.edgeDist} y2={yPos + thick/2 - D/2} stroke={C_FAIL} stroke-width={D*0.06} stroke-dasharray={`${D*0.1}`} />
                <line x1={0} y1={yPos + thick/2 + D/2} x2={i.edgeDist} y2={yPos + thick/2 + D/2} stroke={C_FAIL} stroke-width={D*0.06} stroke-dasharray={`${D*0.1}`} />
            {/if}

            {#if isFail(['netSection', 'interaction'])}
                <polyline points={`${i.edgeDist},${yPos} ${i.edgeDist - D*0.1},${yPos + thick*0.5} ${i.edgeDist},${yPos + thick}`} stroke={C_FAIL} stroke-width={D*0.08} fill="none" />
            {/if}
        {/each}

        <g>
            <rect x={i.edgeDist - D/2} y={-D*0.5} width={D} height={T_stack + D} rx={D*0.05} fill="#ffffff" fill-opacity="0.1" stroke={C_STROKE} stroke-width={D*0.02} />
            <rect x={i.edgeDist - D*0.8} y={-D*0.8} width={D*1.6} height={D*0.3} rx={D*0.05} fill="#202020" stroke={C_STROKE} stroke-width={D*0.02} />

            {#if isFail(['pinShear'])}
                <line x1={i.edgeDist - D*0.6} y1={i.t1} x2={i.edgeDist + D*0.6} y2={i.t1} stroke={C_FAIL} stroke-width={D*0.1} />
                {#if i.planes === 2}
                    <line x1={i.edgeDist - D*0.6} y1={i.t1 + i.t2} x2={i.edgeDist + D*0.6} y2={i.t1 + i.t2} stroke={C_FAIL} stroke-width={D*0.1} />
                {/if}
            {/if}
        </g>

        <g opacity="0.5">
             <line x1={0} y1={T_stack + D*0.5} x2={i.edgeDist} y2={T_stack + D*0.5} stroke={C_STROKE} stroke-width={D*0.01} />
             <line x1={i.edgeDist} y1={T_stack + D*0.4} x2={i.edgeDist} y2={T_stack + D*0.6} stroke={C_STROKE} stroke-width={D*0.01} />
             <text x={i.edgeDist/2} y={T_stack + D*0.8} font-size={D*0.25} fill={C_STROKE} text-anchor="middle">e</text>
        </g>
      </g>
    </svg>
  {:else}
    <div class="text-white/20 text-xs">Initializing...</div>
  {/if}
</div>