use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct BucklingResult {
    pub critical_load: f64,
    pub mode: String,
    pub slenderness: f64,
}

pub fn eval_buckling(a: f64, r: f64, l: f64, k: f64, e: f64, sy: f64) -> BucklingResult {
    let le = l * k;
    let sr = if r.abs() > 1e-12 { le / r } else { 0.0 };
    let fe = if sr.abs() > 1e-12 { (std::f64::consts::PI.powi(2) * e) / sr.powi(2) } else { 0.0 };
    let cc = if sy.abs() > 1e-12 { (2.0 * std::f64::consts::PI.powi(2) * e / sy).sqrt() } else { 0.0 };

    let (stress, mode) = if sr > cc {
        (fe, "Euler")
    } else {
        let sj = sy * (1.0 - (sy * sr.powi(2)) / (4.0 * std::f64::consts::PI.powi(2) * e));
        (sj.max(0.0), "Johnson")
    };

    BucklingResult { critical_load: stress * a, mode: mode.into(), slenderness: sr }
}
