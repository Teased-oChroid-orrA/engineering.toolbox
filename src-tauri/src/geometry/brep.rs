use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Point3D { pub x: f64, pub y: f64, pub z: f64 }

#[derive(Serialize, Deserialize, Default, Clone, Debug)]
pub struct SectionProps {
    pub area: f64,
    pub ixx: f64,
    pub iyy: f64,
    pub centroid_y: f64,
    pub sxx_top: f64,
    pub sxx_bot: f64,
    pub r_g: f64,
}

pub fn calculate_advanced_props(nodes: &[Point3D]) -> SectionProps {
    if nodes.len() < 3 { return SectionProps::default(); }
    let mut area = 0.0;
    let mut qx = 0.0;
    let mut ixx = 0.0;
    let mut iyy = 0.0;

    for i in 0..nodes.len() {
        let p1 = &nodes[i];
        let p2 = &nodes[(i + 1) % nodes.len()];
        let common = p1.x * p2.y - p2.x * p1.y;
        area += common;
        qx += common * (p1.y + p2.y);
        ixx += common * (p1.y.powi(2) + p1.y * p2.y + p2.y.powi(2));
        iyy += common * (p1.x.powi(2) + p1.x * p2.x + p2.x.powi(2));
    }

    let a = (area / 2.0).abs();
    let cy = if a > 0.0 { qx / (6.0 * a) } else { 0.0 };
    let i_xx_final = (ixx / 12.0).abs() - (a * cy.powi(2));

    let y_max = nodes.iter().map(|n| n.y).fold(f64::NEG_INFINITY, f64::max);
    let y_min = nodes.iter().map(|n| n.y).fold(f64::INFINITY, f64::min);

    SectionProps {
        area: a,
        centroid_y: cy,
        ixx: i_xx_final,
        iyy: (iyy / 12.0).abs(),
        sxx_top: if (y_max - cy).abs() > 1e-6 { i_xx_final / (y_max - cy).abs() } else { 0.0 },
        sxx_bot: if (cy - y_min).abs() > 1e-6 { i_xx_final / (cy - y_min).abs() } else { 0.0 },
        r_g: if a > 1e-9 { (i_xx_final / a).sqrt() } else { 0.0 },
    }
}
