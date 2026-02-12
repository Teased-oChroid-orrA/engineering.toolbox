import type { CanonicalDraftScene } from './BushingDraftRenderer';
import type { BabylonCore } from './BushingBabylonShared';

export function createHatchTexture(
  B: BabylonCore,
  scene: InstanceType<BabylonCore['Scene']>,
  key: string,
  bg: string,
  stroke: string,
  spacing = 10
): InstanceType<BabylonCore['DynamicTexture']> {
  const tex = new B.DynamicTexture(`hatch_${key}`, { width: 128, height: 128 }, scene, true);
  tex.wrapU = B.Texture.WRAP_ADDRESSMODE;
  tex.wrapV = B.Texture.WRAP_ADDRESSMODE;
  const ctx = tex.getContext();
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  for (let i = -128; i <= 256; i += spacing) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i - 128, 128);
    ctx.stroke();
  }
  tex.update(false);
  return tex;
}

export function createSectionMaterial(
  B: BabylonCore,
  scene: InstanceType<BabylonCore['Scene']>,
  component: CanonicalDraftScene['loops'][number]['component'],
  regionKind: CanonicalDraftScene['loops'][number]['regionKind']
): InstanceType<BabylonCore['StandardMaterial']> {
  const m = new B.StandardMaterial(`mat_${component}_${regionKind}`, scene);
  m.backFaceCulling = false;
  m.specularColor = new B.Color3(0.02, 0.02, 0.02);

  if (regionKind === 'void') {
    m.diffuseColor = new B.Color3(0.01, 0.03, 0.06);
    m.alpha = 0.9;
    return m;
  }

  if (component === 'housing') {
    m.diffuseColor = new B.Color3(0.49, 0.61, 0.76);
    m.diffuseTexture = createHatchTexture(B, scene, 'housing', 'rgba(85,118,150,0.96)', 'rgba(210,232,255,0.9)', 12);
    m.alpha = 0.98;
    return m;
  }

  if (component === 'bushing') {
    m.diffuseColor = new B.Color3(0.16, 0.78, 0.65);
    m.diffuseTexture = createHatchTexture(B, scene, 'bushing', 'rgba(26,128,104,0.98)', 'rgba(165,255,230,0.85)', 9);
    m.alpha = 0.98;
    return m;
  }

  if (component === 'bore') {
    m.diffuseColor = new B.Color3(0.56, 0.78, 0.95);
    m.diffuseTexture = createHatchTexture(B, scene, 'bore', 'rgba(78,124,168,0.95)', 'rgba(220,240,255,0.9)', 11);
    m.alpha = 0.94;
    return m;
  }

  m.diffuseColor = new B.Color3(0.78, 0.84, 0.9);
  m.alpha = 0.9;
  return m;
}

export function createSolidMaterial(
  B: BabylonCore,
  scene: InstanceType<BabylonCore['Scene']>,
  component: CanonicalDraftScene['loops'][number]['component'],
  regionKind: CanonicalDraftScene['loops'][number]['regionKind']
): InstanceType<BabylonCore['StandardMaterial']> {
  const m = new B.StandardMaterial(`mat3d_${component}_${regionKind}`, scene);
  m.backFaceCulling = false;
  m.specularColor = new B.Color3(0.12, 0.12, 0.12);

  if (regionKind === 'void') {
    m.diffuseColor = new B.Color3(0.03, 0.06, 0.1);
    m.alpha = 0.08;
    return m;
  }

  if (component === 'housing') {
    m.diffuseColor = new B.Color3(0.6, 0.7, 0.8);
    m.alpha = 0.28;
    return m;
  }

  if (component === 'bushing') {
    m.diffuseColor = new B.Color3(0.16, 0.86, 0.78);
    m.alpha = 0.45;
    return m;
  }

  if (component === 'bore') {
    m.diffuseColor = new B.Color3(0.58, 0.82, 0.96);
    m.alpha = 0.18;
    return m;
  }

  m.diffuseColor = new B.Color3(0.78, 0.84, 0.9);
  m.alpha = 0.25;
  return m;
}

export function clearLoopMeshes(B: BabylonCore, scene: InstanceType<BabylonCore['Scene']>): void {
  const existing = scene.meshes.filter((m) => m.name.startsWith('bushing_loop_') || m.name.startsWith('bushing_wire_') || m.name.startsWith('bushing_solid_'));
  for (const m of existing) m.dispose();
  const mats = scene.materials.filter((m) => m.name.startsWith('mat_') || m.name.startsWith('mat3d_'));
  for (const m of mats) m.dispose();
  const tex = scene.textures.filter((t) => t.name.startsWith('hatch_'));
  for (const t of tex) t.dispose();
}
