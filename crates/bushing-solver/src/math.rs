/// Tolerance, Lame stress, countersink geometry math.
/// Ported from src/lib/core/bushing/solveMath.ts
use crate::types::ToleranceRange;

/// Build a tolerance range from nominal ± tol or lower/upper limits.
pub fn make_range(lower: f64, upper: f64) -> ToleranceRange {
    let nominal   = (lower + upper) / 2.0;
    let tol_plus  = upper - nominal;
    let tol_minus = nominal - lower;
    ToleranceRange {
        mode: crate::types::ToleranceMode::NominalTol,
        lower,
        upper,
        nominal,
        tol_plus,
        tol_minus,
    }
}

/// Hoop (circumferential) stress in a thick-walled cylinder at radius r,
/// under internal pressure p (Lame's equations, sign convention: tension +).
pub fn lame_hoop_stress(inner_r: f64, outer_r: f64, pressure: f64, r: f64) -> f64 {
    let ri2 = inner_r * inner_r;
    let ro2 = outer_r * outer_r;
    pressure * ri2 / (ro2 - ri2) * (1.0 + ro2 / (r * r))
}

/// Radial stress in a thick-walled cylinder at radius r (Lame).
pub fn lame_radial_stress(inner_r: f64, outer_r: f64, pressure: f64, r: f64) -> f64 {
    let ri2 = inner_r * inner_r;
    let ro2 = outer_r * outer_r;
    pressure * ri2 / (ro2 - ri2) * (1.0 - ro2 / (r * r))
}

/// Sample the Lame stress field for bushing or housing at N evenly-spaced radii.
pub fn build_lame_field(inner_r: f64, outer_r: f64, pressure: f64, samples: usize) -> Vec<(f64, f64, f64)> {
    (0..samples)
        .map(|i| {
            let t = i as f64 / (samples - 1) as f64;
            let r = inner_r + t * (outer_r - inner_r);
            let sigma_theta = lame_hoop_stress(inner_r, outer_r, pressure, r);
            let sigma_r     = lame_radial_stress(inner_r, outer_r, pressure, r);
            (r, sigma_r, sigma_theta)
        })
        .collect()
}

/// Compute contact pressure between bushing OD and housing bore from interference fit.
/// Uses the composite Lame formulation (Shigley / Boresi).
pub fn lame_contact_pressure(
    delta_total: f64,
    bore_dia: f64,
    id_bushing: f64,
    od_housing: f64,
    e_bushing_ksi: f64,
    nu_bushing: f64,
    e_housing_ksi: f64,
    nu_housing: f64,
) -> f64 {
    if delta_total <= 0.0 {
        return 0.0;
    }
    let d    = bore_dia;
    let id_b = id_bushing;
    let od_h = od_housing;

    let term_b = (d * d + id_b * id_b) / (d * d - id_b * id_b) - nu_bushing;
    let term_h = (od_h * od_h + d * d) / (od_h * od_h - d * d) + nu_housing;
    let w_eff  = term_b / e_bushing_ksi + term_h / e_housing_ksi;

    delta_total / (d * w_eff)
}

/// Countersink geometry solver: given two of {dia, depth, angle}, compute the third.
/// Returns (dia, depth) after resolution.
pub fn solve_countersink(
    dia: Option<f64>,
    depth: Option<f64>,
    angle_deg: f64,
) -> Option<(f64, f64)> {
    let half_angle = (angle_deg / 2.0).to_radians();
    let tan_half   = half_angle.tan();
    if tan_half.abs() < 1e-12 {
        return None;
    }
    match (dia, depth) {
        (Some(d), Some(h)) => Some((d, h)),
        (Some(d), None)    => Some((d, (d / 2.0) / tan_half)),
        (None, Some(h))    => Some((h * tan_half * 2.0, h)),
        (None, None)       => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lame_hoop_at_inner_wall() {
        let p  = 10.0; // ksi
        let ri = 0.25;
        let ro = 0.50;
        let sigma = lame_hoop_stress(ri, ro, p, ri);
        // Classic result: sigma_theta_inner = p(ri²+ro²)/(ro²-ri²) = 10*(0.0625+0.25)/(0.25-0.0625) ≈ 16.67 ksi
        assert!((sigma - 16.666_666).abs() < 1e-3, "got {sigma}");
    }

    #[test]
    fn countersink_depth_from_dia() {
        let (d, h) = solve_countersink(Some(0.5), None, 100.0).unwrap();
        assert!((d - 0.5).abs() < 1e-9);
        let expected_h = (0.5 / 2.0) / (50_f64.to_radians().tan());
        assert!((h - expected_h).abs() < 1e-6, "h={h} expected={expected_h}");
    }
}
