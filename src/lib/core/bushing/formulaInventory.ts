export type BushingFormulaEntry = {
  id: string;
  expression: string;
  units: string;
  location: string;
  note: string;
};

export const BUSHING_FORMULA_INVENTORY: BushingFormulaEntry[] = [
  {
    id: 'thermal_delta_interference',
    expression: 'deltaThermal = (alpha_b - alpha_h) * boreDia * dT_F',
    units: 'in',
    location: 'src/lib/core/bushing/solve.ts',
    note: 'Thermal contribution to effective interference'
  },
  {
    id: 'installed_outer_diameter',
    expression: 'odInstalled = boreDia + delta',
    units: 'in',
    location: 'src/lib/core/bushing/solve.ts',
    note: 'Installed OD under net interference'
  },
  {
    id: 'contact_pressure',
    expression: 'pressure = delta / (termB + termH), delta > 0',
    units: 'psi',
    location: 'src/lib/core/bushing/solve.ts',
    note: 'Lamé-compliance based contact pressure'
  },
  {
    id: 'hoop_stress_housing',
    expression: 'sigma_h = pressure * ((D^2 + d^2) / (D^2 - d^2))',
    units: 'psi',
    location: 'src/lib/core/bushing/solve.ts',
    note: 'Housing hoop stress'
  },
  {
    id: 'hoop_stress_bushing',
    expression: 'sigma_b = -pressure * ((d_o^2 + d_i^2) / (d_o^2 - d_i^2))',
    units: 'psi',
    location: 'src/lib/core/bushing/solve.ts',
    note: 'Bushing hoop stress (compressive)'
  },
  {
    id: 'install_force',
    expression: 'F_install = mu * pressure * pi * boreDia * housingLen',
    units: 'lbf',
    location: 'src/lib/core/bushing/solve.ts',
    note: 'Frictional installation force estimate'
  },
  {
    id: 'margin_of_safety',
    expression: 'MS = allowable / demand - 1',
    units: 'dimensionless',
    location: 'src/lib/core/bushing/solve.ts',
    note: 'Standard margin convention for governing checks'
  }
];

