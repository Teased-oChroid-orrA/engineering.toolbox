use serde::{Deserialize, Serialize};

// ── Primitives ────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum CsMode {
    #[default]
    DepthAngle,
    DiaAngle,
    DiaDepth,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum ToleranceMode {
    #[default]
    NominalTol,
    Limits,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum BushingProcessRouteId {
    #[default]
    PressFitOnly,
    PressFitFinishReam,
    LineReamRepair,
    ThermalAssistInstall,
    BondedJoint,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum BushingStandardsBasis {
    #[default]
    ShopDefault,
    FaaAc4313,
    NasMs,
    SaeAms,
    OemSrm,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum BushingCriticality {
    #[default]
    General,
    PrimaryStructure,
    Repair,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum BushingLoadSpectrum {
    #[default]
    Static,
    Oscillating,
    Rotating,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum BushingLubricationMode {
    #[default]
    Dry,
    Greased,
    Oiled,
    SolidFilm,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum BushingContaminationLevel {
    #[default]
    Clean,
    Shop,
    Dirty,
    Abrasive,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum BushingType {
    #[default]
    Straight,
    Flanged,
    Countersink,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum IdType {
    #[default]
    Straight,
    Countersink,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum EndConstraint {
    #[default]
    Free,
    OneEnd,
    BothEnds,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum InterferenceEnforcementReasonCode {
    #[default]
    EnforcementDisabled,
    ContainmentSatisfied,
    AutoAdjustBoreWidth,
    BlockedBoreLocked,
    BlockedCapabilityFloor,
    BlockedInfeasibleWidth,
    BlockedNominalShiftNoEffect,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum WearRisk {
    #[default]
    Low,
    Moderate,
    High,
    Severe,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum WarningSeverity {
    #[default]
    Info,
    Warning,
    Error,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum BushingWarningCode {
    #[default]
    InputInvalid,
    InputSchemaInvalid,
    BushingIdGeBore,
    BoreLimitsReversed,
    InterferenceLimitsReversed,
    BoreCapabilityRangeInvalid,
    PolicyPreserveShiftConflict,
    ReamerLockConflict,
    InternalCsDiaLtId,
    InternalCsAngleInvalid,
    ExternalCsDiaLtOd,
    ExternalCsAngleInvalid,
    InternalCsGeometryInvalid,
    ExternalCsGeometryInvalid,
    ToleranceInfeasible,
    InterferenceEnforcementBlocked,
    StraightWallBelowMin,
    NeckWallBelowMin,
    NetClearanceFit,
    ServiceStateClearance,
    DutyScreenHighRisk,
    ApprovalReviewRequired,
    EdgeDistanceSequenceFail,
    EdgeDistanceStrengthFail,
}

// ── Shared sub-types ──────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ToleranceRange {
    pub mode: ToleranceMode,
    pub lower: f64,
    pub upper: f64,
    pub nominal: f64,
    pub tol_plus: f64,
    pub tol_minus: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct InterferenceEnforcementPolicy {
    pub enabled: Option<bool>,
    pub lock_bore: Option<bool>,
    pub preserve_bore_nominal: Option<bool>,
    pub allow_bore_nominal_shift: Option<bool>,
    pub max_bore_nominal_shift: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct BoreProcessCapability {
    pub mode: Option<String>,
    pub min_achievable_tol_width: Option<f64>,
    pub max_recommended_tol_width: Option<f64>,
    pub preferred_it_class: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct CountersinkInput {
    pub enabled: Option<bool>,
    pub def_type: Option<String>,
    pub dia: Option<f64>,
    pub depth: Option<f64>,
    pub angle_deg: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaterialProps {
    pub id: &'static str,
    pub name: &'static str,
    /// Young's modulus in ksi
    pub e_ksi: f64,
    /// Yield strength in ksi
    pub sy_ksi: f64,
    /// Ultimate bearing strength in ksi
    pub fbru_ksi: f64,
    /// Ultimate shear strength in ksi
    pub fsu_ksi: f64,
    /// Ultimate tensile strength in ksi (optional)
    pub ftu_ksi: Option<f64>,
    /// Poisson's ratio
    pub nu: f64,
    /// Thermal expansion coefficient in µin/in/°F
    pub alpha_u_f: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BushingWarning {
    pub code: BushingWarningCode,
    pub message: String,
    pub severity: WarningSeverity,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BushingCandidate {
    pub name: String,
    pub margin: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StressSample {
    pub r: f64,
    pub sigma_r: f64,
    pub sigma_theta: f64,
    pub sigma_axial: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct StressBoundary {
    pub sigma_r_inner: f64,
    pub sigma_r_outer: f64,
    pub sigma_theta_inner: f64,
    pub sigma_theta_outer: f64,
    pub sigma_axial_inner: f64,
    pub sigma_axial_outer: f64,
    pub max_abs_hoop: f64,
    pub max_abs_hoop_at: f64,
    pub max_abs_axial: f64,
    pub max_abs_axial_at: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StressRegion {
    pub inner_radius: f64,
    pub outer_radius: f64,
    pub samples: Vec<StressSample>,
    pub boundary: StressBoundary,
}

// ── BushingInput (normalised, strict) ────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BushingInput {
    pub units: String,
    pub bore_dia: f64,
    pub id_bushing: f64,
    pub interference: f64,
    pub bore_tol_mode: ToleranceMode,
    pub bore_nominal: Option<f64>,
    pub bore_tol_plus: Option<f64>,
    pub bore_tol_minus: Option<f64>,
    pub bore_lower: Option<f64>,
    pub bore_upper: Option<f64>,
    pub interference_tol_mode: ToleranceMode,
    pub interference_nominal: Option<f64>,
    pub interference_tol_plus: Option<f64>,
    pub interference_tol_minus: Option<f64>,
    pub interference_lower: Option<f64>,
    pub interference_upper: Option<f64>,
    pub interference_policy: InterferenceEnforcementPolicy,
    pub bore_capability: BoreProcessCapability,
    pub enforce_interference_tolerance: bool,
    pub lock_bore_for_interference: bool,
    pub housing_len: f64,
    pub housing_width: f64,
    pub edge_dist: f64,
    pub bushing_type: BushingType,
    pub id_type: IdType,
    pub cs_mode: CsMode,
    pub cs_dia: f64,
    pub cs_depth: f64,
    pub cs_depth_tol_plus: Option<f64>,
    pub cs_depth_tol_minus: Option<f64>,
    pub cs_angle: f64,
    pub ext_cs_mode: CsMode,
    pub ext_cs_dia: f64,
    pub ext_cs_depth: f64,
    pub ext_cs_depth_tol_plus: Option<f64>,
    pub ext_cs_depth_tol_minus: Option<f64>,
    pub ext_cs_angle: f64,
    pub flange_dia: Option<f64>,
    pub flange_od: Option<f64>,
    pub flange_thk: Option<f64>,
    pub mat_housing: String,
    pub mat_bushing: String,
    pub friction: f64,
    pub d_t: f64,
    pub assembly_housing_temperature: Option<f64>,
    pub assembly_bushing_temperature: Option<f64>,
    pub process_route_id: BushingProcessRouteId,
    pub standards_basis: BushingStandardsBasis,
    pub standards_revision: Option<String>,
    pub process_spec: Option<String>,
    pub approval_notes: Option<String>,
    pub criticality: BushingCriticality,
    pub min_wall_straight: f64,
    pub min_wall_neck: f64,
    pub end_constraint: EndConstraint,
    pub load: Option<f64>,
    pub edge_load_angle_deg: Option<f64>,
    pub service_temperature_hot: Option<f64>,
    pub service_temperature_cold: Option<f64>,
    pub finish_ream_allowance: Option<f64>,
    pub wear_allowance: Option<f64>,
    pub load_spectrum: BushingLoadSpectrum,
    pub oscillation_angle_deg: Option<f64>,
    pub oscillation_freq_hz: Option<f64>,
    pub duty_cycle_pct: Option<f64>,
    pub lubrication_mode: BushingLubricationMode,
    pub contamination_level: BushingContaminationLevel,
    pub surface_roughness_ra_um: Option<f64>,
    pub shaft_hardness_hrc: Option<f64>,
    pub misalignment_deg: Option<f64>,
    pub id_cs: Option<CountersinkInput>,
    pub od_cs: Option<CountersinkInput>,
}

// ── BushingOutput ─────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CsSolved {
    pub id: Option<CsSolvedDim>,
    pub od: Option<CsSolvedDim>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CsSolvedDim {
    pub dia: f64,
    pub depth: f64,
    pub angle_deg: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LameField {
    pub sign_convention: String,
    pub axial_model: String,
    pub bushing: StressRegion,
    pub housing: StressRegion,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LameResult {
    pub model: String,
    pub delta_total: f64,
    pub delta_thermal: f64,
    pub delta_user: f64,
    pub bore_dia: f64,
    pub id_bushing: f64,
    pub effective_od_housing: f64,
    pub d_equivalent: f64,
    pub psi: f64,
    pub lambda: f64,
    pub w_eff: f64,
    pub e_eff: f64,
    pub term_b: f64,
    pub term_h: f64,
    pub pressure_psi: f64,
    pub pressure_ksi: f64,
    pub field: LameField,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HoopResult {
    pub housing_sigma: f64,
    pub housing_ms: f64,
    pub bushing_sigma: f64,
    pub bushing_ms: f64,
    pub ligament_sigma: f64,
    pub ligament_ms: f64,
    pub ed_required_ligament: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EdgeDistanceResult {
    pub ed_min_sequence: f64,
    pub ed_min_strength: f64,
    pub ed_actual: f64,
    pub governing: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PhysicsResult {
    pub delta_effective: f64,
    pub install_delta_effective: f64,
    pub contact_pressure: f64,
    pub install_contact_pressure: f64,
    pub install_force: f64,
    pub retained_install_force: f64,
    pub assembly_thermal_delta: f64,
    pub stress_hoop_housing: f64,
    pub stress_hoop_bushing: f64,
    pub margin_housing: f64,
    pub margin_bushing: f64,
    pub stress_axial_housing: f64,
    pub stress_axial_bushing: f64,
    pub axial_constraint_factor: f64,
    pub axial_length_factor: f64,
    pub ed_min_coupled: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeometryResult {
    pub od_bushing: f64,
    pub wall_straight: f64,
    pub wall_neck: f64,
    pub cs_internal: CsSolvedDim,
    pub cs_external: CsSolvedDim,
    pub is_saturation_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BushingServiceState {
    pub id: String,
    pub label: String,
    pub effective_interference: f64,
    pub contact_pressure: f64,
    pub projected_id: f64,
    pub id_change_from_free: f64,
    pub fit_class: String,
    pub note: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceEnvelopeResult {
    pub states: Vec<BushingServiceState>,
    pub governing_state_id: String,
    pub governing_state_label: String,
    pub finish_machining_required: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DutyScreenResult {
    pub load_spectrum: BushingLoadSpectrum,
    pub lubrication_mode: BushingLubricationMode,
    pub contamination_level: BushingContaminationLevel,
    pub specific_load_psi: f64,
    pub specific_load_mpa: f64,
    pub sliding_velocity_mps: f64,
    pub pv: f64,
    pub pv_limit: f64,
    pub pv_utilization: f64,
    pub wear_risk: WearRisk,
    pub risk_score: f64,
    pub dominant_drivers: Vec<String>,
    pub life_estimate_hours: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallForceBand {
    pub low: f64,
    pub nominal: f64,
    pub high: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessReviewResult {
    pub route_id: BushingProcessRouteId,
    pub route_label: String,
    pub tolerance_class: String,
    pub recommended_ra_um: f64,
    pub roundness_target_um: f64,
    pub finish_machining_required: bool,
    pub thermal_assist_recommended: bool,
    pub assembly_thermal_assist_active: bool,
    pub install_force_band: InstallForceBand,
    pub removal_force: f64,
    pub notes: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApprovalReviewResult {
    pub standards_basis: BushingStandardsBasis,
    pub standards_revision: String,
    pub process_spec: String,
    pub criticality: BushingCriticality,
    pub approval_required: bool,
    pub decision: String,
    pub traceability_refs: Vec<String>,
    pub assumptions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToleranceEnforcement {
    pub enabled: bool,
    pub satisfied: bool,
    pub blocked: bool,
    pub reason_codes: Vec<InterferenceEnforcementReasonCode>,
    pub required_bore_tol_width: f64,
    pub available_bore_tol_width: f64,
    pub target_interference_width: f64,
    pub lower_violation: f64,
    pub upper_violation: f64,
    pub bore_nominal_shift_applied: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToleranceResult {
    pub status: String,
    pub notes: Vec<String>,
    pub enforcement: ToleranceEnforcement,
    pub bore: ToleranceRange,
    pub interference_target: ToleranceRange,
    pub od_bushing: ToleranceRange,
    pub achieved_interference: ToleranceRange,
    pub cs_internal_dia: Option<ToleranceRange>,
    pub cs_internal_depth: Option<ToleranceRange>,
    pub cs_external_dia: Option<ToleranceRange>,
    pub cs_external_depth: Option<ToleranceRange>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InputBasis {
    pub bore: String,
    pub id: String,
    pub edge_dist: String,
    pub housing_width: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MeasuredPartSummary {
    pub applied: bool,
    pub basis: String,
    pub overrides: Vec<String>,
    pub notes: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BushingOutput {
    pub sleeve_wall: f64,
    pub neck_wall: Option<f64>,
    pub od_installed: f64,
    pub cs_solved: CsSolved,
    pub pressure: f64,
    pub lame: LameResult,
    pub hoop: HoopResult,
    pub edge_distance: EdgeDistanceResult,
    pub governing: BushingCandidate,
    pub physics: PhysicsResult,
    pub geometry: GeometryResult,
    pub service_envelope: ServiceEnvelopeResult,
    pub duty_screen: DutyScreenResult,
    pub process: ProcessReviewResult,
    pub review: ApprovalReviewResult,
    pub input_basis: InputBasis,
    pub measured_part_summary: MeasuredPartSummary,
    pub tolerance: ToleranceResult,
    pub candidates: Vec<BushingCandidate>,
    pub warning_codes: Vec<BushingWarning>,
    pub warnings: Vec<String>,
}
