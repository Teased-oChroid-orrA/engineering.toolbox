import type {
  BushingContaminationLevel,
  BushingCriticality,
  BushingLubricationMode,
  BushingProcessRouteId,
  BushingStandardsBasis
} from './types';

export type BushingProcessRouteDefinition = {
  id: BushingProcessRouteId;
  label: string;
  toleranceClass: string;
  recommendedRaUm: number;
  roundnessTargetUm: number;
  finishMachiningRequired: boolean;
  thermalAssistRecommended: boolean;
  removalForceFactor: number;
  installForceBand: { low: number; high: number };
  notes: string[];
};

export const BUSHING_PROCESS_ROUTES: BushingProcessRouteDefinition[] = [
  {
    id: 'press_fit_only',
    label: 'Press Fit Only',
    toleranceClass: 'reamed / controlled',
    recommendedRaUm: 1.6,
    roundnessTargetUm: 12,
    finishMachiningRequired: false,
    thermalAssistRecommended: false,
    removalForceFactor: 1.1,
    installForceBand: { low: 0.85, high: 1.15 },
    notes: ['Use when the installed ID remains acceptable without post-install machining.']
  },
  {
    id: 'press_fit_finish_ream',
    label: 'Press Fit + Finish Ream',
    toleranceClass: 'finish reamed',
    recommendedRaUm: 0.8,
    roundnessTargetUm: 8,
    finishMachiningRequired: true,
    thermalAssistRecommended: false,
    removalForceFactor: 1.15,
    installForceBand: { low: 0.85, high: 1.15 },
    notes: ['Use when press-fit closure must be recovered with final ID machining after installation.']
  },
  {
    id: 'line_ream_repair',
    label: 'Line Ream Repair',
    toleranceClass: 'repair / line ream',
    recommendedRaUm: 1.6,
    roundnessTargetUm: 15,
    finishMachiningRequired: true,
    thermalAssistRecommended: false,
    removalForceFactor: 1.2,
    installForceBand: { low: 0.9, high: 1.2 },
    notes: ['Use for oversize or misalignment repair workflows with final line-ream alignment control.']
  },
  {
    id: 'thermal_assist_install',
    label: 'Thermal Assist Install',
    toleranceClass: 'controlled with thermal assist',
    recommendedRaUm: 1.6,
    roundnessTargetUm: 10,
    finishMachiningRequired: false,
    thermalAssistRecommended: true,
    removalForceFactor: 1.05,
    installForceBand: { low: 0.65, high: 0.95 },
    notes: ['Use when press force is high enough that chill/heat assist is part of the planned process route.']
  },
  {
    id: 'bonded_joint',
    label: 'Bonded / Retained Joint',
    toleranceClass: 'bond line controlled',
    recommendedRaUm: 0.8,
    roundnessTargetUm: 10,
    finishMachiningRequired: false,
    thermalAssistRecommended: false,
    removalForceFactor: 0.8,
    installForceBand: { low: 0.45, high: 0.8 },
    notes: ['Use when retention is shared by bond or sealant and removal planning must protect the housing.']
  }
];

export function getBushingProcessRoute(id: BushingProcessRouteId | undefined): BushingProcessRouteDefinition {
  return BUSHING_PROCESS_ROUTES.find((entry) => entry.id === id) ?? BUSHING_PROCESS_ROUTES[0];
}

export const BUSHING_STANDARDS_BASIS_OPTIONS: Array<{ value: BushingStandardsBasis; label: string; refs: string[] }> = [
  { value: 'shop_default', label: 'Shop Default', refs: ['Internal process standard'] },
  { value: 'faa_ac_43_13', label: 'FAA AC 43.13', refs: ['FAA AC 43.13-1B, Ch. 7'] },
  { value: 'nas_ms', label: 'NAS / MS', refs: ['Applicable NAS/MS hardware basis'] },
  { value: 'sae_ams', label: 'SAE / AMS', refs: ['Applicable SAE/AMS material or process basis'] },
  { value: 'oem_srm', label: 'OEM SRM', refs: ['OEM SRM / repair authority'] }
];

export function getStandardsRefs(basis: BushingStandardsBasis | undefined): string[] {
  return BUSHING_STANDARDS_BASIS_OPTIONS.find((entry) => entry.value === basis)?.refs ?? ['Internal process standard'];
}

export const BUSHING_LUBRICATION_HINTS: Record<BushingLubricationMode, string> = {
  dry: 'Dry contact is least tolerant of PV, finish defects, and contamination.',
  greased: 'Grease improves startup and oscillating wear but can trap debris.',
  oiled: 'Oil gives the highest generic PV margin when containment is controlled.',
  solid_film: 'Solid film helps assembly and corrosion control, but life still depends on finish and load.'
};

export const BUSHING_CONTAMINATION_HINTS: Record<BushingContaminationLevel, string> = {
  clean: 'Clean assembly and service environment.',
  shop: 'Normal shop assembly debris and handling exposure.',
  dirty: 'Field contamination expected.',
  abrasive: 'Persistent abrasive contamination expected; treat as severe wear driver.'
};

export const BUSHING_CRITICALITY_HINTS: Record<BushingCriticality, string> = {
  general: 'General hardware with local engineering review.',
  primary_structure: 'Primary structure or critical joint; approval trail should be explicit.',
  repair: 'Repair scenario; authority and rework basis should be captured.'
};
