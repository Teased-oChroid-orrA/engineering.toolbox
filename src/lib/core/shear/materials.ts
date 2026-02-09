import type { ShearMaterial } from './types';

// Ported 1:1 (allowables) from legacy "toolbox-local only no ai" App.Data.MATERIALS
export const MATERIALS: ShearMaterial[] = [
  { id: 'al2024t3', name: 'Al 2024-T3 Bare', Fsu_imp: 41, Fsu_met: 283, Ftu_imp: 64, Ftu_met: 441, Fbru_imp: 98, Fbru_met: 676 },
  { id: 'al7075t6', name: 'Al 7075-T6 Clad', Fsu_imp: 48, Fsu_met: 331, Ftu_imp: 77, Ftu_met: 531, Fbru_imp: 121, Fbru_met: 834 },
  { id: 'al7050', name: 'Al 7050-T7451', Fsu_imp: 46, Fsu_met: 317, Ftu_imp: 76, Ftu_met: 524, Fbru_imp: 118, Fbru_met: 814 },
  { id: 'ti6al4v', name: 'Ti-6Al-4V Gr.5', Fsu_imp: 76, Fsu_met: 524, Ftu_imp: 130, Ftu_met: 896, Fbru_imp: 215, Fbru_met: 1480 },
  { id: 'steel4340', name: 'Steel 4340', Fsu_imp: 130, Fsu_met: 896, Ftu_imp: 260, Ftu_met: 1790, Fbru_imp: 360, Fbru_met: 2480 },
  { id: 'ph157mo', name: '15-7 Mo PH', Fsu_imp: 115, Fsu_met: 793, Ftu_imp: 200, Ftu_met: 1379, Fbru_imp: 300, Fbru_met: 2068 },
  { id: 'ph174', name: '17-4 PH H1025', Fsu_imp: 105, Fsu_met: 724, Ftu_imp: 160, Ftu_met: 1103, Fbru_imp: 240, Fbru_met: 1655 },
  { id: 'inconel718', name: 'Inconel 718', Fsu_imp: 100, Fsu_met: 690, Ftu_imp: 180, Ftu_met: 1241, Fbru_imp: 260, Fbru_met: 1792 },
  { id: 'inconel625', name: 'Inconel 625', Fsu_imp: 75, Fsu_met: 517, Ftu_imp: 120, Ftu_met: 827, Fbru_imp: 180, Fbru_met: 1241 },
  { id: 'cfrp_qi', name: 'Carbon/Epoxy (QI)', Fsu_imp: 45, Fsu_met: 310, Ftu_imp: 90, Ftu_met: 620, Fbru_imp: 80, Fbru_met: 550 },
  { id: 'washer_steel', name: 'Washer (Steel)', Fsu_imp: 30, Fsu_met: 207, Ftu_imp: 45, Ftu_met: 310, Fbru_imp: 90, Fbru_met: 620 },
  { id: 'washer_al', name: 'Washer (Al)', Fsu_imp: 20, Fsu_met: 138, Ftu_imp: 40, Ftu_met: 275, Fbru_imp: 60, Fbru_met: 413 },
  { id: 'bronze', name: 'Al-Bronze (C630)', Fsu_imp: 45, Fsu_met: 310, Ftu_imp: 90, Ftu_met: 620, Fbru_imp: 130, Fbru_met: 896 },
  { id: 'beryllium', name: 'Be-Copper', Fsu_imp: 70, Fsu_met: 482, Ftu_imp: 100, Ftu_met: 689, Fbru_imp: 140, Fbru_met: 965 },
];

export function getMaterial(id: string | undefined): ShearMaterial {
  const m = MATERIALS.find((x) => x.id === id);
  return m ?? MATERIALS[0];
}