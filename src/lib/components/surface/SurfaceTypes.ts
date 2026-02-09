export type Point3D = { x: number; y: number; z: number };
export type Edge = [number, number];

export type SelectionMode = 'off' | 'box' | 'lasso';
export type SelectionOp = 'replace' | 'add' | 'subtract';

// Broad shapes to avoid coupling; use the Rust schema as the real source of truth.
export type PlaneEvalResult = Record<string, any>;
export type CylinderFitResult = Record<string, any>;
export type SliceResult = Record<string, any>;
