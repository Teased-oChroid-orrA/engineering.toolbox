/// Embedded material database.
/// Ported from src/lib/core/bushing/materials.ts
use crate::types::MaterialProps;

/// Look up a material by ID string. Returns None if not in database.
pub fn lookup(id: &str) -> Option<MaterialProps> {
    DATABASE.iter().find(|m| m.id == id).cloned()
}

/// All known materials.  Values: E_ksi, Sy_ksi, Fbru_ksi, Fsu_ksi, Ftu_ksi?, nu, alpha_uF
pub static DATABASE: &[MaterialProps] = &[
    MaterialProps { id: "Al_7075_T6",    name: "Al 7075-T6",          e_ksi: 10_400.0, sy_ksi: 73.0,  fbru_ksi: 160.0, fsu_ksi: 48.0,  ftu_ksi: Some(83.0), nu: 0.33, alpha_u_f: 12.9 },
    MaterialProps { id: "Al_2024_T3",    name: "Al 2024-T3",          e_ksi: 10_500.0, sy_ksi: 50.0,  fbru_ksi: 130.0, fsu_ksi: 37.0,  ftu_ksi: Some(70.0), nu: 0.33, alpha_u_f: 12.9 },
    MaterialProps { id: "Al_6061_T6",    name: "Al 6061-T6",          e_ksi: 10_000.0, sy_ksi: 40.0,  fbru_ksi: 87.0,  fsu_ksi: 30.0,  ftu_ksi: Some(45.0), nu: 0.33, alpha_u_f: 13.1 },
    MaterialProps { id: "SS_17_4_PH",    name: "SS 17-4 PH (H900)",   e_ksi: 28_500.0, sy_ksi: 170.0, fbru_ksi: 290.0, fsu_ksi: 102.0, ftu_ksi: Some(190.0), nu: 0.272, alpha_u_f: 6.0 },
    MaterialProps { id: "SS_300",        name: "SS 304/316 Annealed",  e_ksi: 28_000.0, sy_ksi: 30.0,  fbru_ksi: 85.0,  fsu_ksi: 43.0,  ftu_ksi: Some(85.0), nu: 0.29,  alpha_u_f: 9.6 },
    MaterialProps { id: "Ti_6Al_4V",     name: "Ti-6Al-4V",            e_ksi: 16_000.0, sy_ksi: 128.0, fbru_ksi: 250.0, fsu_ksi: 82.0,  ftu_ksi: Some(138.0), nu: 0.342, alpha_u_f: 5.2 },
    MaterialProps { id: "Steel_4130",    name: "Steel 4130 (N)",       e_ksi: 29_000.0, sy_ksi: 70.0,  fbru_ksi: 130.0, fsu_ksi: 65.0,  ftu_ksi: Some(97.0), nu: 0.29, alpha_u_f: 6.3 },
    MaterialProps { id: "Steel_4340",    name: "Steel 4340 (180 ksi)", e_ksi: 29_000.0, sy_ksi: 170.0, fbru_ksi: 310.0, fsu_ksi: 99.0,  ftu_ksi: Some(185.0), nu: 0.29, alpha_u_f: 6.3 },
    MaterialProps { id: "Inconel_718",   name: "Inconel 718",          e_ksi: 29_900.0, sy_ksi: 150.0, fbru_ksi: 290.0, fsu_ksi: 103.0, ftu_ksi: Some(185.0), nu: 0.29, alpha_u_f: 7.2 },
    MaterialProps { id: "Bronze_C93200", name: "Bronze C93200",        e_ksi: 14_000.0, sy_ksi: 20.0,  fbru_ksi: 65.0,  fsu_ksi: 27.0,  ftu_ksi: Some(35.0), nu: 0.34, alpha_u_f: 10.0 },
];

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lookup_existing() {
        let m = lookup("Al_7075_T6").expect("should exist");
        assert_eq!(m.e_ksi, 10_400.0);
    }

    #[test]
    fn lookup_missing() {
        assert!(lookup("NotAMaterial").is_none());
    }
}
