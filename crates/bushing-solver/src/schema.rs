/// Input validation rules.
/// Ported from src/lib/core/bushing/schema.ts
use crate::{error::BushingError, types::BushingInput};

pub fn validate(input: &BushingInput) -> Result<(), BushingError> {
    if input.bore_dia <= 0.0 {
        return Err(BushingError::Schema("boreDia must be > 0".into()));
    }
    if input.id_bushing <= 0.0 {
        return Err(BushingError::Schema("idBushing must be > 0".into()));
    }
    if input.id_bushing >= input.bore_dia {
        return Err(BushingError::Schema("idBushing must be < boreDia".into()));
    }
    if input.housing_len <= 0.0 {
        return Err(BushingError::Schema("housingLen must be > 0".into()));
    }
    if input.housing_width <= 0.0 {
        return Err(BushingError::Schema("housingWidth must be > 0".into()));
    }
    if input.edge_dist <= 0.0 {
        return Err(BushingError::Schema("edgeDist must be > 0".into()));
    }
    if input.cs_angle < 60.0 || input.cs_angle > 160.0 {
        return Err(BushingError::Schema(
            "csAngle must be between 60° and 160°".into(),
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::*;

    fn base_input() -> BushingInput {
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
    fn valid_input_passes() {
        assert!(validate(&base_input()).is_ok());
    }

    #[test]
    fn id_ge_bore_fails() {
        let mut inp = base_input();
        inp.id_bushing = inp.bore_dia; // ID == bore → should fail
        assert!(validate(&inp).is_err());
    }
}
