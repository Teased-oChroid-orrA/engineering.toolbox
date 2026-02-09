export type Point3D = { x: number; y: number; z: number };
export type Edge = [number, number];
export type Curve = { name: string; pts: number[] };
export type SurfaceFace = { name: string; pts: number[] };

export type DatumCsys = {
  name: string;
  origin: Point3D;
  xAxis: Point3D;
  yAxis: Point3D;
  zAxis: Point3D;
};

export type DatumPlane = {
  name: string;
  origin: Point3D;
  normal: Point3D;
  xDir?: Point3D;
  source?: string;
};

export type SelectionMode = 'none' | 'box' | 'lasso';
