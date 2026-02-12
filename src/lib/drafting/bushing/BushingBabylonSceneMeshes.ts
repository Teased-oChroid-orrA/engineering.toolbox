import type { CanonicalDraftScene } from './BushingDraftRenderer';
import { buildLoopPolygons } from './BushingBabylonGeometry';
import { clearLoopMeshes, createSectionMaterial, createSolidMaterial } from './BushingBabylonMaterials';
import { diagnosticsWithInfo, type BabylonCallbackCtx, type BabylonCore, type BabylonLoaded, type SceneBounds } from './BushingBabylonShared';

type Vec2Like = { x: number; y: number };

function createRevolvedLoopMesh(
  B: BabylonCore,
  scene: InstanceType<BabylonCore['Scene']>,
  name: string,
  profile: Vec2Like[],
  tessellation = 72
): InstanceType<BabylonCore['Mesh']> | null {
  const ringCount = Math.max(12, Math.floor(tessellation));
  const cleaned: Vec2Like[] = [];
  for (const p of profile) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    if (!cleaned.length) {
      cleaned.push(p);
      continue;
    }
    const prev = cleaned[cleaned.length - 1];
    if (Math.hypot(p.x - prev.x, p.y - prev.y) > 1e-7) cleaned.push(p);
  }
  if (cleaned.length < 3) return null;
  if (Math.hypot(cleaned[0].x - cleaned[cleaned.length - 1].x, cleaned[0].y - cleaned[cleaned.length - 1].y) < 1e-7) {
    cleaned.pop();
  }
  if (cleaned.length < 3) return null;

  const positions: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const ringInv = 1 / ringCount;
  const segCount = cleaned.length;

  for (let i = 0; i < segCount; i += 1) {
    const p = cleaned[i];
    const r = Math.max(0, p.x);
    const z = p.y;
    const v = segCount <= 1 ? 0 : i / (segCount - 1);
    for (let j = 0; j < ringCount; j += 1) {
      const u = j * ringInv;
      const a = u * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      positions.push(r * ca, r * sa, z);
      uvs.push(u, v);
    }
  }

  for (let i = 0; i < segCount; i += 1) {
    const nextI = (i + 1) % segCount;
    for (let j = 0; j < ringCount; j += 1) {
      const nextJ = (j + 1) % ringCount;
      const a = i * ringCount + j;
      const b = i * ringCount + nextJ;
      const c = nextI * ringCount + j;
      const d = nextI * ringCount + nextJ;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  B.VertexData.ComputeNormals(positions, indices, normals);
  const vertexData = new B.VertexData();
  vertexData.positions = positions;
  vertexData.indices = indices;
  vertexData.normals = normals;
  vertexData.uvs = uvs;
  const mesh = new B.Mesh(name, scene);
  vertexData.applyToMesh(mesh, true);
  mesh.isPickable = true;
  return mesh;
}

export function renderLoopMeshes(
  loaded: BabylonLoaded,
  scene: InstanceType<BabylonCore['Scene']>,
  sceneModel: CanonicalDraftScene,
  callbacks: BabylonCallbackCtx,
  solidMode: boolean
): SceneBounds {
  const { B, earcut } = loaded;
  clearLoopMeshes(B, scene);

  const { polygons, diagnostics } = buildLoopPolygons(sceneModel);
  callbacks.onDiagnostics(diagnosticsWithInfo(sceneModel, diagnostics));

  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  const drawOrder = [...polygons].sort((a, b) => {
    const aVoid = a.loop.regionKind === 'void' ? 1 : 0;
    const bVoid = b.loop.regionKind === 'void' ? 1 : 0;
    if (aVoid !== bVoid) return aVoid - bVoid;
    return b.absArea - a.absArea;
  });

  const solidDepth = Math.max(sceneModel.height * 0.6, sceneModel.width * 0.35, 0.22);

  drawOrder.forEach((poly, idx) => {
    const shape = poly.points.map((p) => {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minZ = Math.min(minZ, p.y);
      maxZ = Math.max(maxZ, p.y);
      return new B.Vector3(p.x, 0, p.y);
    });

    if (!solidMode) {
      const mesh = B.MeshBuilder.CreatePolygon(
        `bushing_loop_${idx}`,
        { shape, sideOrientation: B.Mesh.DOUBLESIDE },
        scene,
        earcut
      );
      mesh.position.y = idx * 0.00045;
      mesh.isPickable = true;
      mesh.material = createSectionMaterial(B, scene, poly.loop.component, poly.loop.regionKind);

      const wire = B.MeshBuilder.CreateLines(`bushing_wire_${idx}`, { points: [...shape, shape[0]] }, scene);
      if (poly.loop.regionKind === 'void') {
        wire.color = new B.Color3(0.96, 0.98, 1);
      } else if (poly.loop.component === 'housing') {
        wire.color = new B.Color3(0.78, 0.9, 1.0);
      } else if (poly.loop.component === 'bushing') {
        wire.color = new B.Color3(0.28, 0.98, 0.9);
      } else {
        wire.color = new B.Color3(0.72, 0.9, 1.0);
      }
      wire.alpha = poly.loop.regionKind === 'void' ? 0.75 : 0.9;
      wire.position.y = mesh.position.y + 0.0012;
      wire.isPickable = false;
      return;
    }

    if (poly.loop.component === 'bushing' && poly.loop.regionKind !== 'void') {
      if (poly.points.some((p) => p.x < -1e-6)) return;
      const revolved = createRevolvedLoopMesh(B, scene, `bushing_solid_lathe_${idx}`, poly.points, 88);
      if (revolved) {
        revolved.material = createSolidMaterial(B, scene, poly.loop.component, poly.loop.regionKind);
      }
      return;
    }

    const top = B.MeshBuilder.CreatePolygon(`bushing_solid_top_${idx}`, { shape, sideOrientation: B.Mesh.DOUBLESIDE }, scene, earcut);
    top.position.y = solidDepth / 2;
    top.isPickable = true;
    top.material = createSolidMaterial(B, scene, poly.loop.component, poly.loop.regionKind);

    const bot = B.MeshBuilder.CreatePolygon(`bushing_solid_bot_${idx}`, { shape, sideOrientation: B.Mesh.DOUBLESIDE }, scene, earcut);
    bot.position.y = -solidDepth / 2;
    bot.rotation.x = Math.PI;
    bot.isPickable = true;
    bot.material = createSolidMaterial(B, scene, poly.loop.component, poly.loop.regionKind);

    const wallPts = [...shape, shape[0]];
    const solidLines = B.MeshBuilder.CreateLines(`bushing_solid_wire_${idx}`, { points: wallPts }, scene);
    solidLines.color = poly.loop.regionKind === 'void' ? new B.Color3(0.7, 0.85, 0.95) : new B.Color3(0.1, 0.2, 0.25);
    solidLines.alpha = 0.6;
    solidLines.isPickable = false;
    for (let i = 0; i < shape.length; i++) {
      const p = shape[i];
      const seg = B.MeshBuilder.CreateLines(`bushing_solid_edge_${idx}_${i}`, {
        points: [
          new B.Vector3(p.x, -solidDepth / 2, p.z),
          new B.Vector3(p.x, solidDepth / 2, p.z)
        ]
      }, scene);
      seg.color = solidLines.color;
      seg.alpha = 0.4;
      seg.isPickable = false;
    }
  });

  if (!isFinite(minX) || !isFinite(maxX) || !isFinite(minZ) || !isFinite(maxZ)) {
    return {
      minX: -sceneModel.width / 2,
      maxX: sceneModel.width / 2,
      minZ: -sceneModel.height / 2,
      maxZ: sceneModel.height / 2
    };
  }

  return { minX, maxX, minZ, maxZ };
}
