/// Service envelope analysis, duty screening, process review, approval review.
/// Stub — full port from serviceAnalysis.ts is Task #10.
use crate::types::*;

pub struct ServiceInputs<'a> {
    pub input: &'a BushingInput,
    pub pressure: f64,
    pub od_bushing: f64,
}

pub fn build_service_envelope(si: &ServiceInputs<'_>) -> ServiceEnvelopeResult {
    let free_state = BushingServiceState {
        id: "free".into(),
        label: "Free (pre-install)".into(),
        effective_interference: si.input.interference,
        contact_pressure: 0.0,
        projected_id: si.input.id_bushing,
        id_change_from_free: 0.0,
        fit_class: "interference".into(),
        note: "".into(),
    };
    let installed_state = BushingServiceState {
        id: "installed".into(),
        label: "Installed".into(),
        effective_interference: si.input.interference,
        contact_pressure: si.pressure,
        projected_id: si.input.id_bushing,
        id_change_from_free: 0.0,
        fit_class: "interference".into(),
        note: "".into(),
    };
    ServiceEnvelopeResult {
        states: vec![free_state, installed_state],
        governing_state_id: "installed".into(),
        governing_state_label: "Installed".into(),
        finish_machining_required: false,
    }
}

pub fn build_duty_screen(input: &BushingInput) -> DutyScreenResult {
    DutyScreenResult {
        load_spectrum: input.load_spectrum,
        lubrication_mode: input.lubrication_mode,
        contamination_level: input.contamination_level,
        specific_load_psi: 0.0,
        specific_load_mpa: 0.0,
        sliding_velocity_mps: 0.0,
        pv: 0.0,
        pv_limit: 0.0,
        pv_utilization: 0.0,
        wear_risk: WearRisk::Low,
        risk_score: 0.0,
        dominant_drivers: vec![],
        life_estimate_hours: None,
    }
}

pub fn build_process_review(input: &BushingInput) -> ProcessReviewResult {
    ProcessReviewResult {
        route_id: input.process_route_id,
        route_label: "Press Fit Only".into(),
        tolerance_class: "IT7".into(),
        recommended_ra_um: 1.6,
        roundness_target_um: 5.0,
        finish_machining_required: false,
        thermal_assist_recommended: false,
        assembly_thermal_assist_active: false,
        install_force_band: InstallForceBand { low: 0.0, nominal: 0.0, high: 0.0 },
        removal_force: 0.0,
        notes: vec![],
    }
}

pub fn build_approval_review(input: &BushingInput) -> ApprovalReviewResult {
    ApprovalReviewResult {
        standards_basis: input.standards_basis,
        standards_revision: input.standards_revision.clone().unwrap_or_default(),
        process_spec: input.process_spec.clone().unwrap_or_default(),
        criticality: input.criticality,
        approval_required: false,
        decision: "pass".into(),
        traceability_refs: vec![],
        assumptions: vec![],
    }
}
