<script lang="ts">
  export let inputs: any;
  $: D = inputs.boreDia || 0.5;
  $: L = inputs.housingLen || 0.5;
  $: W = inputs.housingWidth || 1.5;
  $: ID = inputs.idBushing || 0.375;
  $: od = inputs.geometry?.odBushing || inputs.boreDia || 0.5;
  $: vbW = W * 1.6;
  $: vbH = L * 3.4;

  const STROKE = '#94a3b8';
  const HOUSING_FILL = 'url(#hatchH)';
  const BUSHING_FILL = 'url(#hatchB)';

  function seg(side: 'left' | 'right') {
    const s = side === 'left' ? -1 : 1;
    const r_o = od / 2;
    const r_i = ID / 2;
    const ty = -L / 2;
    const by = L / 2;

    // Housing rectangle to bore
    const h_path = `M ${s * W / 2} ${ty} L ${s * W / 2} ${by} L ${s * r_o} ${by} L ${s * r_o} ${ty} Z`;

    // Bushing profile (straight or flanged)
    let b_pts = [];
    if (inputs.bushingType === 'flanged') {
      const fr = (inputs.flangeOd || od) / 2;
      const ft = inputs.flangeThk || 0;
      b_pts = [
        { x: s * fr, y: ty - ft },
        { x: s * fr, y: ty },
        { x: s * r_o, y: ty },
        { x: s * r_o, y: by },
        { x: s * r_i, y: by },
        { x: s * r_i, y: ty - ft }
      ];
    } else if (inputs.bushingType === 'countersink' && inputs.geometry?.csExternal) {
      const cs = inputs.geometry.csExternal;
      const top = cs.dia / 2;
      const depth = cs.depth || 0;
      const cs_y = Math.min(by, ty + depth);
      b_pts = [
        { x: s * top, y: ty },
        { x: s * r_o, y: cs_y },
        { x: s * r_o, y: by },
        { x: s * r_i, y: by },
        { x: s * r_i, y: ty }
      ];
    } else {
      b_pts = [
        { x: s * r_o, y: ty },
        { x: s * r_o, y: by },
        { x: s * r_i, y: by },
        { x: s * r_i, y: ty }
      ];
    }
    return { h_path, b_path: `M ${b_pts.map((p) => `${p.x},${p.y}`).join(' L ')} Z` };
  }
</script>

<div class="w-full h-full flex items-center justify-center">
  <svg viewBox="{-vbW/2} {-vbH/2} {vbW} {vbH}" class="w-full h-full max-h-[420px] drop-shadow-lg">
    <defs>
      <pattern id="gridDots" width="14" height="14" patternUnits="userSpaceOnUse">
        <circle cx="1" cy="1" r="0.6" fill="rgba(45,212,191,0.15)" />
      </pattern>
      <pattern id="hatchH" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="4" stroke="rgba(255,255,255,0.18)" stroke-width="0.6" />
      </pattern>
      <pattern id="hatchB" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(135)">
        <line x1="0" y1="0" x2="0" y2="3" stroke="#2dd4bf" stroke-width="0.8" />
      </pattern>
      <linearGradient id="glow" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="rgba(59,130,246,0.35)" />
        <stop offset="100%" stop-color="rgba(59,130,246,0)" />
      </linearGradient>
    </defs>

    <rect x={-vbW/2} y={-vbH/2} width={vbW} height={vbH} fill="url(#glow)" opacity="0.3" />
    <rect x={-vbW/2} y={-vbH/2} width={vbW} height={vbH} fill="url(#gridDots)" opacity="0.35" />

    <g>
      <path d={seg('left').h_path} fill={HOUSING_FILL} stroke={STROKE} stroke-width="0.9" />
      <path d={seg('right').h_path} fill={HOUSING_FILL} stroke={STROKE} stroke-width="0.9" />
    </g>

    <g>
      <path d={seg('left').b_path} fill={BUSHING_FILL} stroke="#2dd4bf" stroke-width="1.1" />
      <path d={seg('right').b_path} fill={BUSHING_FILL} stroke="#2dd4bf" stroke-width="1.1" />
    </g>

    <line x1="0" y1={-L} x2="0" y2={L} stroke="rgba(255,255,255,0.35)" stroke-dasharray="5,3" />
    <line x1={-W/2} y1={0} x2={W/2} y2={0} stroke="rgba(255,255,255,0.15)" stroke-dasharray="4,4" />

    <g font-family="ui-monospace, SFMono-Regular" font-size={D * 0.18} fill="#cbd5e1">
      <text x="0" y={-L - D * 0.6} text-anchor="middle">SECTION A-A</text>
      <text x={-W/2} y={-L / 2 - D * 0.2} text-anchor="middle" opacity="0.7">Housing</text>
      <text x={-od/2} y={L / 2 + D * 0.4} text-anchor="middle" fill="#2dd4bf">Bushing</text>
    </g>
  </svg>
</div>
