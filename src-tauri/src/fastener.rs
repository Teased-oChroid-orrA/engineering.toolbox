use serde::{Deserialize, Serialize};

const EPS: f64 = 1e-12;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MaterialInput {
    pub youngs_modulus: f64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AxialElementInput {
    pub id: String,
    pub label: String,
    pub kind: String,
    pub group: String,
    pub length: f64,
    pub area: f64,
    pub tensile_stress_area: Option<f64>,
    pub material: MaterialInput,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StiffnessVerifyInput {
    pub preload: f64,
    pub elements: Vec<AxialElementInput>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ElementVerifyResult {
    pub id: String,
    pub label: String,
    pub group: String,
    pub area_used: f64,
    pub compliance: f64,
    pub stiffness: f64,
    pub preload_deformation: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StiffnessVerifyOutput {
    pub preload: f64,
    pub compliance: f64,
    pub stiffness: f64,
    pub preload_deformation: f64,
    pub bolt_elongation: f64,
    pub clamped_compression: f64,
    pub element_results: Vec<ElementVerifyResult>,
    pub assumptions: Vec<String>,
    pub warnings: Vec<String>,
}

fn clamp_min(v: f64) -> f64 {
    if v.is_finite() && v > EPS {
        v
    } else {
        EPS
    }
}

#[tauri::command(rename_all = "camelCase")]
pub async fn fastener_verify_stiffness(input: StiffnessVerifyInput) -> Result<StiffnessVerifyOutput, String> {
    if input.elements.is_empty() {
        return Err("No elements supplied for stiffness verification.".to_string());
    }

    let preload = input.preload;
    let mut compliance = 0.0f64;
    let mut bolt_elongation = 0.0f64;
    let mut clamped_compression = 0.0f64;
    let mut warnings: Vec<String> = Vec::new();
    let mut rows: Vec<ElementVerifyResult> = Vec::with_capacity(input.elements.len());

    for el in &input.elements {
        let area_raw = if el.kind == "bolt-thread" {
            el.tensile_stress_area.unwrap_or(el.area)
        } else {
            el.area
        };
        let area_used = clamp_min(area_raw);
        let e = clamp_min(el.material.youngs_modulus);
        let l = clamp_min(el.length);

        if !el.length.is_finite() || el.length <= 0.0 {
            warnings.push(format!("Element '{}' had non-positive length; clamped to EPS.", el.label));
        }
        if !area_raw.is_finite() || area_raw <= 0.0 {
            warnings.push(format!("Element '{}' had non-positive area; clamped to EPS.", el.label));
        }
        if !el.material.youngs_modulus.is_finite() || el.material.youngs_modulus <= 0.0 {
            warnings.push(format!("Element '{}' had non-positive Young's modulus; clamped to EPS.", el.label));
        }

        let c = l / (e * area_used);
        let k = 1.0 / c;
        let delta = preload * c;

        compliance += c;
        if el.group == "bolt" {
            bolt_elongation += delta;
        } else if el.group == "clamped" {
            clamped_compression += delta;
        }

        rows.push(ElementVerifyResult {
            id: el.id.clone(),
            label: el.label.clone(),
            group: el.group.clone(),
            area_used,
            compliance: c,
            stiffness: k,
            preload_deformation: delta,
        });
    }

    let stiffness = if compliance > EPS { 1.0 / compliance } else { 0.0 };
    let preload_deformation = preload * compliance;

    Ok(StiffnessVerifyOutput {
        preload,
        compliance,
        stiffness,
        preload_deformation,
        bolt_elongation,
        clamped_compression,
        element_results: rows,
        assumptions: vec![
            "Linear elastic axial continuum segments: delta_i = F*L_i/(E_i*A_i).".to_string(),
            "Exact series compatibility: C_total = sum_i(L_i/(E_i*A_i)), k_total = 1/C_total.".to_string(),
            "Threaded segment uses provided tensileStressArea when available.".to_string(),
            "No pressure-cone/frustum/effective-area approximations in this verifier.".to_string(),
        ],
        warnings,
    })
}
