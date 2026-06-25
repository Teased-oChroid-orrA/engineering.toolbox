/// Core bushing state machine.
/// Stub — full port from solveEngine.ts::computeState() is Task #9.
use crate::{
    error::BushingError,
    materials,
    math,
    service,
    types::*,
};

pub fn compute(input: &BushingInput) -> Result<BushingOutput, BushingError> {
    let mat_h = materials::lookup(&input.mat_housing)
        .ok_or_else(|| BushingError::InvalidInput(format!("unknown housing material: {}", input.mat_housing)))?;
    let mat_b = materials::lookup(&input.mat_bushing)
        .ok_or_else(|| BushingError::InvalidInput(format!("unknown bushing material: {}", input.mat_bushing)))?;

    // Geometry
    let bore_r  = input.bore_dia / 2.0;
    let id_r    = input.id_bushing / 2.0;
    let wall    = bore_r - id_r;

    // Thermal delta (sign: housing expands → reduces interference)
    let dt = input.d_t;
    let delta_thermal = dt * (mat_h.alpha_u_f - mat_b.alpha_u_f) * input.bore_dia * 1e-6;

    // Effective interference
    let delta_total = input.interference - delta_thermal;

    // Effective housing OD (use housing_width as surrogate in simplified model)
    let od_housing = input.housing_width;

    // Contact pressure (Lame composite)
    let pressure = math::lame_contact_pressure(
        delta_total,
        input.bore_dia,
        input.id_bushing,
        od_housing,
        mat_b.e_ksi,
        mat_b.nu,
        mat_h.e_ksi,
        mat_h.nu,
    );

    // Stress field — 21 sample points
    let n_samples = 21;
    let bushing_samples: Vec<StressSample> = math::build_lame_field(id_r, bore_r, pressure, n_samples)
        .into_iter()
        .map(|(r, sigma_r, sigma_theta)| StressSample { r, sigma_r, sigma_theta, sigma_axial: 0.0 })
        .collect();
    let housing_inner_r = bore_r;
    let housing_outer_r = od_housing / 2.0;
    let housing_samples: Vec<StressSample> = math::build_lame_field(housing_inner_r, housing_outer_r, pressure, n_samples)
        .into_iter()
        .map(|(r, sigma_r, sigma_theta)| StressSample { r, sigma_r, sigma_theta, sigma_axial: 0.0 })
        .collect();

    let bushing_boundary = boundary_from_samples(&bushing_samples);
    let housing_boundary = boundary_from_samples(&housing_samples);

    // Hoop margins
    let sigma_hoop_b = bushing_samples.first().map(|s| s.sigma_theta.abs()).unwrap_or(0.0);
    let sigma_hoop_h = housing_samples.first().map(|s| s.sigma_theta.abs()).unwrap_or(0.0);
    let ms_b = if sigma_hoop_b > 0.0 { mat_b.sy_ksi / sigma_hoop_b - 1.0 } else { 999.0 };
    let ms_h = if sigma_hoop_h > 0.0 { mat_h.sy_ksi / sigma_hoop_h - 1.0 } else { 999.0 };

    // Edge distance (simplified)
    let ed_min_seq  = 1.5 * input.bore_dia;
    let ed_min_str  = 2.0 * input.bore_dia;
    let governing_ed = if input.edge_dist >= ed_min_str { "strength" } else { "sequencing" };

    let governing = if ms_b < ms_h {
        BushingCandidate { name: "bushing_hoop".into(), margin: ms_b }
    } else {
        BushingCandidate { name: "housing_hoop".into(), margin: ms_h }
    };

    let od_bushing = input.bore_dia;
    let sleeve_wall = wall;
    let neck_wall: Option<f64> = None;

    let si = service::ServiceInputs { input, pressure, od_bushing };
    let service_envelope = service::build_service_envelope(&si);
    let duty_screen      = service::build_duty_screen(input);
    let process          = service::build_process_review(input);
    let review           = service::build_approval_review(input);

    let lame = LameResult {
        model: "Lame thick-wall cylinder".into(),
        delta_total,
        delta_thermal,
        delta_user: input.interference,
        bore_dia: input.bore_dia,
        id_bushing: input.id_bushing,
        effective_od_housing: od_housing,
        d_equivalent: input.bore_dia,
        psi: 0.0,
        lambda: 0.0,
        w_eff: 0.0,
        e_eff: 0.0,
        term_b: 0.0,
        term_h: 0.0,
        pressure_psi: pressure,
        pressure_ksi: pressure / 1_000.0,
        field: LameField {
            sign_convention: "tension positive".into(),
            axial_model: "plane_stress".into(),
            bushing: StressRegion { inner_radius: id_r, outer_radius: bore_r, samples: bushing_samples, boundary: bushing_boundary },
            housing: StressRegion { inner_radius: housing_inner_r, outer_radius: housing_outer_r, samples: housing_samples, boundary: housing_boundary },
        },
    };

    let tolerance = build_tolerance_stub(input);
    let warnings  = build_warnings(input, pressure, ms_b, ms_h, input.edge_dist, ed_min_seq, ed_min_str);

    Ok(BushingOutput {
        sleeve_wall,
        neck_wall,
        od_installed: od_bushing,
        cs_solved: CsSolved { id: None, od: None },
        pressure,
        lame,
        hoop: HoopResult {
            housing_sigma: sigma_hoop_h,
            housing_ms: ms_h,
            bushing_sigma: sigma_hoop_b,
            bushing_ms: ms_b,
            ligament_sigma: 0.0,
            ligament_ms: 999.0,
            ed_required_ligament: None,
        },
        edge_distance: EdgeDistanceResult {
            ed_min_sequence: ed_min_seq,
            ed_min_strength: ed_min_str,
            ed_actual: input.edge_dist,
            governing: governing_ed.into(),
        },
        governing,
        physics: PhysicsResult {
            delta_effective: delta_total,
            install_delta_effective: delta_total,
            contact_pressure: pressure,
            install_contact_pressure: pressure,
            install_force: 0.0,
            retained_install_force: 0.0,
            assembly_thermal_delta: delta_thermal,
            stress_hoop_housing: sigma_hoop_h,
            stress_hoop_bushing: sigma_hoop_b,
            margin_housing: ms_h,
            margin_bushing: ms_b,
            stress_axial_housing: 0.0,
            stress_axial_bushing: 0.0,
            axial_constraint_factor: 0.0,
            axial_length_factor: 1.0,
            ed_min_coupled: ed_min_str,
        },
        geometry: GeometryResult {
            od_bushing,
            wall_straight: sleeve_wall,
            wall_neck: 0.0,
            cs_internal: CsSolvedDim { dia: input.cs_dia, depth: input.cs_depth, angle_deg: input.cs_angle },
            cs_external: CsSolvedDim { dia: input.ext_cs_dia, depth: input.ext_cs_depth, angle_deg: input.ext_cs_angle },
            is_saturation_active: false,
        },
        service_envelope,
        duty_screen,
        process,
        review,
        input_basis: InputBasis { bore: "nominal".into(), id: "nominal".into(), edge_dist: "nominal".into(), housing_width: "nominal".into() },
        measured_part_summary: MeasuredPartSummary { applied: false, basis: "nominal".into(), overrides: vec![], notes: vec![] },
        tolerance,
        candidates: vec![],
        warning_codes: warnings.0,
        warnings: warnings.1,
    })
}

fn boundary_from_samples(samples: &[StressSample]) -> StressBoundary {
    if samples.is_empty() {
        return StressBoundary::default();
    }
    let first = &samples[0];
    let last  = &samples[samples.len() - 1];
    let max_hoop = samples.iter().map(|s| s.sigma_theta.abs()).fold(f64::NEG_INFINITY, f64::max);
    let max_axial = samples.iter().map(|s| s.sigma_axial.abs()).fold(f64::NEG_INFINITY, f64::max);
    let max_hoop_at = samples.iter().max_by(|a, b| a.sigma_theta.abs().partial_cmp(&b.sigma_theta.abs()).unwrap()).map(|s| s.r).unwrap_or(0.0);
    let max_axial_at = samples.iter().max_by(|a, b| a.sigma_axial.abs().partial_cmp(&b.sigma_axial.abs()).unwrap()).map(|s| s.r).unwrap_or(0.0);
    StressBoundary {
        sigma_r_inner: first.sigma_r,
        sigma_r_outer: last.sigma_r,
        sigma_theta_inner: first.sigma_theta,
        sigma_theta_outer: last.sigma_theta,
        sigma_axial_inner: first.sigma_axial,
        sigma_axial_outer: last.sigma_axial,
        max_abs_hoop: max_hoop,
        max_abs_hoop_at: max_hoop_at,
        max_abs_axial: max_axial,
        max_abs_axial_at: max_axial_at,
    }
}

fn build_tolerance_stub(input: &BushingInput) -> ToleranceResult {
    use crate::math::make_range;
    let bore_r   = make_range(input.bore_dia - 0.001, input.bore_dia + 0.001);
    let int_r    = make_range(input.interference - 0.0005, input.interference + 0.0005);
    let od_r     = make_range(input.bore_dia - 0.001, input.bore_dia + 0.001);
    let achiev_r = make_range(input.interference - 0.0005, input.interference + 0.0005);
    ToleranceResult {
        status: "ok".into(),
        notes: vec![],
        enforcement: ToleranceEnforcement {
            enabled: input.enforce_interference_tolerance,
            satisfied: true,
            blocked: false,
            reason_codes: vec![],
            required_bore_tol_width: 0.0,
            available_bore_tol_width: 0.0,
            target_interference_width: 0.0,
            lower_violation: 0.0,
            upper_violation: 0.0,
            bore_nominal_shift_applied: 0.0,
        },
        bore: bore_r,
        interference_target: int_r,
        od_bushing: od_r,
        achieved_interference: achiev_r,
        cs_internal_dia: None,
        cs_internal_depth: None,
        cs_external_dia: None,
        cs_external_depth: None,
    }
}

fn build_warnings(
    input: &BushingInput,
    _pressure: f64,
    ms_b: f64,
    ms_h: f64,
    ed_actual: f64,
    ed_seq: f64,
    ed_str: f64,
) -> (Vec<BushingWarning>, Vec<String>) {
    let mut codes = vec![];
    let mut msgs  = vec![];

    if input.id_bushing >= input.bore_dia {
        codes.push(BushingWarning { code: BushingWarningCode::BushingIdGeBore, message: "Bushing ID ≥ bore diameter.".into(), severity: WarningSeverity::Error });
        msgs.push("Bushing ID ≥ bore diameter.".into());
    }
    let sleeve_wall = (input.bore_dia - input.id_bushing) / 2.0;
    if sleeve_wall < input.min_wall_straight {
        codes.push(BushingWarning { code: BushingWarningCode::StraightWallBelowMin, message: format!("Wall {:.4} < min {:.4}", sleeve_wall, input.min_wall_straight), severity: WarningSeverity::Warning });
        msgs.push(format!("Wall {sleeve_wall:.4} < min {:.4}", input.min_wall_straight));
    }
    if ms_b < 0.0 || ms_h < 0.0 {
        codes.push(BushingWarning { code: BushingWarningCode::NetClearanceFit, message: "Negative margin of safety.".into(), severity: WarningSeverity::Error });
        msgs.push("Negative margin of safety.".into());
    }
    if ed_actual < ed_seq {
        codes.push(BushingWarning { code: BushingWarningCode::EdgeDistanceSequenceFail, message: format!("Edge distance {ed_actual:.4} < sequencing min {ed_seq:.4}"), severity: WarningSeverity::Warning });
        msgs.push(format!("Edge distance {ed_actual:.4} < sequencing min {ed_seq:.4}"));
    } else if ed_actual < ed_str {
        codes.push(BushingWarning { code: BushingWarningCode::EdgeDistanceStrengthFail, message: format!("Edge distance {ed_actual:.4} < strength min {ed_str:.4}"), severity: WarningSeverity::Warning });
        msgs.push(format!("Edge distance {ed_actual:.4} < strength min {ed_str:.4}"));
    }

    (codes, msgs)
}

#[cfg(test)]
mod tests {
    use super::*;
    fn base() -> BushingInput {
        BushingInput {
            units: "imperial".into(),
            bore_dia: 0.5005,
            id_bushing: 0.25,
            interference: 0.0015,
            bore_tol_mode: ToleranceMode::NominalTol,
            bore_nominal: None,
            bore_tol_plus: None,
            bore_tol_minus: None,
            bore_lower: None,
            bore_upper: None,
            interference_tol_mode: ToleranceMode::NominalTol,
            interference_nominal: None,
            interference_tol_plus: None,
            interference_tol_minus: None,
            interference_lower: None,
            interference_upper: None,
            interference_policy: InterferenceEnforcementPolicy::default(),
            bore_capability: BoreProcessCapability::default(),
            enforce_interference_tolerance: false,
            lock_bore_for_interference: false,
            housing_len: 0.75,
            housing_width: 1.5,
            edge_dist: 0.75,
            bushing_type: BushingType::Straight,
            id_type: IdType::Straight,
            cs_mode: CsMode::DepthAngle,
            cs_dia: 0.0,
            cs_depth: 0.0,
            cs_depth_tol_plus: None,
            cs_depth_tol_minus: None,
            cs_angle: 100.0,
            ext_cs_mode: CsMode::DepthAngle,
            ext_cs_dia: 0.0,
            ext_cs_depth: 0.0,
            ext_cs_depth_tol_plus: None,
            ext_cs_depth_tol_minus: None,
            ext_cs_angle: 100.0,
            flange_dia: None,
            flange_od: None,
            flange_thk: None,
            mat_housing: "Al_7075_T6".into(),
            mat_bushing: "SS_17_4_PH".into(),
            friction: 0.15,
            d_t: 0.0,
            assembly_housing_temperature: None,
            assembly_bushing_temperature: None,
            process_route_id: BushingProcessRouteId::PressFitOnly,
            standards_basis: BushingStandardsBasis::ShopDefault,
            standards_revision: None,
            process_spec: None,
            approval_notes: None,
            criticality: BushingCriticality::General,
            min_wall_straight: 0.010,
            min_wall_neck: 0.005,
            end_constraint: EndConstraint::Free,
            load: None,
            edge_load_angle_deg: None,
            service_temperature_hot: None,
            service_temperature_cold: None,
            finish_ream_allowance: None,
            wear_allowance: None,
            load_spectrum: BushingLoadSpectrum::Static,
            oscillation_angle_deg: None,
            oscillation_freq_hz: None,
            duty_cycle_pct: None,
            lubrication_mode: BushingLubricationMode::Dry,
            contamination_level: BushingContaminationLevel::Clean,
            surface_roughness_ra_um: None,
            shaft_hardness_hrc: None,
            misalignment_deg: None,
            id_cs: None,
            od_cs: None,
        }
    }

    #[test]
    fn compute_positive_pressure() {
        let out = compute(&base()).expect("should compute");
        assert!(out.pressure > 0.0, "pressure should be > 0, got {}", out.pressure);
    }

    #[test]
    fn compute_no_interference_zero_pressure() {
        let mut inp = base();
        inp.interference = 0.0;
        let out = compute(&inp).expect("should compute");
        assert_eq!(out.pressure, 0.0);
    }
}
