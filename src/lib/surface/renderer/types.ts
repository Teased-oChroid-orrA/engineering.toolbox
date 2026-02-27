import type { Point3D } from '$lib/surface/types';

export type RendererMode = 'svg';
export type RendererTheme = 'technical' | 'studio' | 'high-contrast' | 'aurora';

export type RendererSceneSurface = {
  vertexIds: number[];
  name?: string;
};

export type RendererSceneDatumCsys = {
  name: string;
  origin: Point3D;
  xAxis: Point3D;
  yAxis: Point3D;
  zAxis: Point3D;
};

export type RendererSceneDatumPlane = {
  name: string;
  origin: Point3D;
  normal: Point3D;
};

export type SurfaceRendererScene = {
  points: Point3D[];
  edges: [number, number][];
  surfaces: RendererSceneSurface[];
  csys: RendererSceneDatumCsys[];
  planes: RendererSceneDatumPlane[];
};

export type RendererSnapshotStats = {
  points: number;
  edges: number;
  surfaces: number;
  csys: number;
  planes: number;
  digest: string;
};

export type RendererAvailability = {
  renderer: string;
  available: boolean;
  activeBackend: string;
  reason?: string | null;
};

export type RendererSubmitResult = {
  renderer: string;
  accepted: boolean;
  activeBackend: string;
  stats: RendererSnapshotStats;
  message?: string | null;
};

export type RendererThemeResult = {
  renderer: string;
  accepted: boolean;
  activeBackend: string;
  theme: RendererTheme | string;
};

export type RendererMetrics = {
  submitCount: number;
  rejectCount: number;
  failureCount: number;
  lastSyncMs: number;
  lastError?: string | null;
  lastSnapshot?: RendererSnapshotStats | null;
  selectedTheme: string;
};

export type RendererViewState = {
  zoomK: number;
  panX: number;
  panY: number;
  rotAlpha: number;
  rotBeta: number;
};

export type RendererBackendState = {
  renderer: string;
  available: boolean;
  running: boolean;
  sidecarPid?: number | null;
  sidecarPath?: string | null;
  launchHint?: string | null;
  reason?: string | null;
};
