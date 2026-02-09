export type UnitSystem = 'imperial' | 'metric';
export const IN_TO_MM = 25.4;
export const MM_TO_IN = 1 / IN_TO_MM;
// Base-force conversion
export const LBF_TO_N = 4.4482216152605;
export const ksi_to_mpa = (ksi: number) => ksi * 6.894757;
export const mpa_to_ksi = (mpa: number) => mpa / 6.894757;

/**
 * All solvers should compute in a single internal base unit system.
 * Current internal base: inches, pounds-force (lbf), psi.
 */

export function toImperialLen(v: number, units: UnitSystem): number {
  return units === 'metric' ? v * MM_TO_IN : v;
}

export function toImperialForce(v: number, units: UnitSystem): number {
  // Metric UI uses N as base force; internal uses lbf.
  return units === 'metric' ? v / LBF_TO_N : v;
}
