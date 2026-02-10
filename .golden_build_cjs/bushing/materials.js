"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MATERIALS = void 0;
exports.getMaterial = getMaterial;
// Material library intentionally mirrors the legacy web-tool baseline so the
// bushing + shear toolboxes stay consistent.
//
// Units:
//   - E in ksi
//   - Strengths in ksi
//   - alpha in microstrain/°F
exports.MATERIALS = [
    // Backwards compatible ids (used by existing saved inputs)
    {
        id: 'al7075',
        name: 'Al 7075-T6 (typical)',
        E_ksi: 10300,
        Sy_ksi: 70,
        Fbru_ksi: 121,
        Fsu_ksi: 48,
        Ftu_ksi: 77,
        nu: 0.33,
        alpha_uF: 12.8
    },
    {
        id: 'al2024',
        name: 'Al 2024-T3 (typical)',
        E_ksi: 10500,
        Sy_ksi: 47,
        Fbru_ksi: 98,
        Fsu_ksi: 41,
        Ftu_ksi: 64,
        nu: 0.33,
        alpha_uF: 12.5
    },
    {
        id: 'steel',
        name: 'Steel (typical)',
        E_ksi: 29000,
        Sy_ksi: 120,
        Fbru_ksi: 160,
        Fsu_ksi: 70,
        Ftu_ksi: 150,
        nu: 0.30,
        alpha_uF: 6.5
    },
    // Expanded set (ported from legacy data table)
    {
        id: 'al2024t3',
        name: 'Al 2024-T3 Bare',
        E_ksi: 10500,
        Sy_ksi: 47,
        Fbru_ksi: 98,
        Fsu_ksi: 41,
        Ftu_ksi: 64,
        nu: 0.33,
        alpha_uF: 12.5
    },
    {
        id: 'al7075t6',
        name: 'Al 7075-T6 Clad',
        E_ksi: 10300,
        Sy_ksi: 70,
        Fbru_ksi: 121,
        Fsu_ksi: 48,
        Ftu_ksi: 77,
        nu: 0.33,
        alpha_uF: 12.8
    },
    {
        id: 'al7050',
        name: 'Al 7050-T7451',
        E_ksi: 10300,
        Sy_ksi: 68,
        Fbru_ksi: 118,
        Fsu_ksi: 46,
        Ftu_ksi: 76,
        nu: 0.33,
        alpha_uF: 12.8
    },
    {
        id: 'ti6al4v',
        name: 'Ti-6Al-4V Gr.5',
        E_ksi: 16000,
        Sy_ksi: 126,
        Fbru_ksi: 215,
        Fsu_ksi: 76,
        Ftu_ksi: 130,
        nu: 0.34,
        alpha_uF: 4.9
    },
    {
        id: 'steel4340',
        name: 'Steel 4340',
        E_ksi: 29000,
        Sy_ksi: 217,
        Fbru_ksi: 360,
        Fsu_ksi: 130,
        Ftu_ksi: 260,
        nu: 0.29,
        alpha_uF: 6.6
    },
    {
        id: 'ph157mo',
        name: '15-7 Mo PH',
        E_ksi: 29000,
        Sy_ksi: 185,
        Fbru_ksi: 300,
        Fsu_ksi: 115,
        Ftu_ksi: 200,
        nu: 0.29,
        alpha_uF: 6.3
    },
    {
        id: 'ph174',
        name: '17-4 PH H1025',
        E_ksi: 28500,
        Sy_ksi: 145,
        Fbru_ksi: 240,
        Fsu_ksi: 105,
        Ftu_ksi: 160,
        nu: 0.29,
        alpha_uF: 6.0
    },
    {
        id: 'inconel718',
        name: 'Inconel 718',
        E_ksi: 29700,
        Sy_ksi: 150,
        Fbru_ksi: 260,
        Fsu_ksi: 100,
        Ftu_ksi: 180,
        nu: 0.29,
        alpha_uF: 7.1
    },
    {
        id: 'inconel625',
        name: 'Inconel 625',
        E_ksi: 30100,
        Sy_ksi: 60,
        Fbru_ksi: 180,
        Fsu_ksi: 75,
        Ftu_ksi: 120,
        nu: 0.29,
        alpha_uF: 7.3
    },
    {
        id: 'cfrp_qi',
        name: 'Carbon/Epoxy (QI)',
        E_ksi: 8500,
        Sy_ksi: 80,
        Fbru_ksi: 80,
        Fsu_ksi: 45,
        Ftu_ksi: 90,
        nu: 0.30,
        alpha_uF: 1.5
    },
    {
        id: 'washer_steel',
        name: 'Washer (Steel)',
        E_ksi: 29000,
        Sy_ksi: 30,
        Fbru_ksi: 90,
        Fsu_ksi: 30,
        Ftu_ksi: 45,
        nu: 0.29,
        alpha_uF: 6.5
    },
    {
        id: 'washer_al',
        name: 'Washer (Al)',
        E_ksi: 10300,
        Sy_ksi: 30,
        Fbru_ksi: 60,
        Fsu_ksi: 20,
        Ftu_ksi: 40,
        nu: 0.33,
        alpha_uF: 12.8
    },
    {
        id: 'bronze',
        name: 'Al-Bronze (C630)',
        E_ksi: 17000,
        Sy_ksi: 50,
        Fbru_ksi: 130,
        Fsu_ksi: 45,
        Ftu_ksi: 90,
        nu: 0.34,
        alpha_uF: 9.0
    },
    {
        id: 'beryllium',
        name: 'Be-Copper',
        E_ksi: 18000,
        Sy_ksi: 95,
        Fbru_ksi: 140,
        Fsu_ksi: 70,
        Ftu_ksi: 100,
        nu: 0.30,
        alpha_uF: 9.4
    }
];
function getMaterial(id) {
    const m = exports.MATERIALS.find((x) => x.id === id);
    return m ?? exports.MATERIALS[0];
}
