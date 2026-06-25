use serde::Deserialize;
use serde_json::Value;

use crate::{
    error::BushingError,
    types::*,
};

/// Flexible raw input — accepts camelCase, snake_case, and legacy aliases.
/// Use `serde_json::Value` internally to handle the wide alias surface.
#[derive(Debug, Deserialize)]
pub struct BushingInputRaw(pub Value);

impl BushingInputRaw {
    pub fn normalize(self) -> Result<BushingInput, BushingError> {
        let v = &self.0;

        let f = |keys: &[&str]| -> Option<f64> {
            keys.iter().find_map(|k| v.get(k)?.as_f64())
        };
        let s = |keys: &[&str]| -> Option<String> {
            keys.iter().find_map(|k| v.get(k)?.as_str().map(str::to_owned))
        };
        let b = |keys: &[&str]| -> Option<bool> {
            keys.iter().find_map(|k| v.get(k)?.as_bool())
        };

        let units = s(&["units"]).unwrap_or_else(|| "imperial".into());
        let bore_dia = f(&["boreDia", "bore_dia"])
            .ok_or_else(|| BushingError::MissingField("boreDia"))?;
        let id_bushing = f(&["idBushing", "id_bushing", "bushID"])
            .ok_or_else(|| BushingError::MissingField("idBushing"))?;
        let interference = f(&["interference"])
            .ok_or_else(|| BushingError::MissingField("interference"))?;
        let housing_len = f(&["housingLen", "housing_len"])
            .ok_or_else(|| BushingError::MissingField("housingLen"))?;
        let housing_width = f(&["housingWidth", "housing_width"])
            .ok_or_else(|| BushingError::MissingField("housingWidth"))?;
        let edge_dist = f(&["edgeDist", "edge_dist"])
            .ok_or_else(|| BushingError::MissingField("edgeDist"))?;

        let bushing_type = match s(&["bushingType", "bushing_type"])
            .unwrap_or_default()
            .as_str()
        {
            "flanged"      => BushingType::Flanged,
            "countersink"  => BushingType::Countersink,
            _              => BushingType::Straight,
        };

        let id_type = match s(&["idType", "id_type"]).unwrap_or_default().as_str() {
            "countersink" => IdType::Countersink,
            _             => IdType::Straight,
        };

        let parse_cs_mode = |keys: &[&str]| match s(keys).unwrap_or_default().as_str() {
            "dia_angle" => CsMode::DiaAngle,
            "dia_depth" => CsMode::DiaDepth,
            _           => CsMode::DepthAngle,
        };

        let cs_mode     = parse_cs_mode(&["csMode",    "cs_mode"]);
        let ext_cs_mode = parse_cs_mode(&["extCsMode", "ext_cs_mode"]);

        let bore_tol_mode = match s(&["boreTolMode", "bore_tol_mode"])
            .unwrap_or_default()
            .as_str()
        {
            "limits" => ToleranceMode::Limits,
            _        => ToleranceMode::NominalTol,
        };

        let interference_tol_mode = match s(&["interferenceTolMode", "interference_tol_mode"])
            .unwrap_or_default()
            .as_str()
        {
            "limits" => ToleranceMode::Limits,
            _        => ToleranceMode::NominalTol,
        };

        let interference_policy = parse_interference_policy(v);
        let bore_capability     = parse_bore_capability(v);

        let end_constraint = match s(&["endConstraint", "end_constraint"])
            .unwrap_or_default()
            .as_str()
        {
            "one_end"   => EndConstraint::OneEnd,
            "both_ends" => EndConstraint::BothEnds,
            _           => EndConstraint::Free,
        };

        let process_route_id = match s(&["processRouteId", "process_route_id"])
            .unwrap_or_default()
            .as_str()
        {
            "press_fit_finish_ream"   => BushingProcessRouteId::PressFitFinishReam,
            "line_ream_repair"        => BushingProcessRouteId::LineReamRepair,
            "thermal_assist_install"  => BushingProcessRouteId::ThermalAssistInstall,
            "bonded_joint"            => BushingProcessRouteId::BondedJoint,
            _                         => BushingProcessRouteId::PressFitOnly,
        };

        let standards_basis = match s(&["standardsBasis", "standards_basis"])
            .unwrap_or_default()
            .as_str()
        {
            "faa_ac_43_13" => BushingStandardsBasis::FaaAc4313,
            "nas_ms"       => BushingStandardsBasis::NasMs,
            "sae_ams"      => BushingStandardsBasis::SaeAms,
            "oem_srm"      => BushingStandardsBasis::OemSrm,
            _              => BushingStandardsBasis::ShopDefault,
        };

        let criticality = match s(&["criticality"])
            .unwrap_or_default()
            .as_str()
        {
            "primary_structure" => BushingCriticality::PrimaryStructure,
            "repair"            => BushingCriticality::Repair,
            _                   => BushingCriticality::General,
        };

        let load_spectrum = match s(&["loadSpectrum", "load_spectrum"])
            .unwrap_or_default()
            .as_str()
        {
            "oscillating" => BushingLoadSpectrum::Oscillating,
            "rotating"    => BushingLoadSpectrum::Rotating,
            _             => BushingLoadSpectrum::Static,
        };

        let lubrication_mode = match s(&["lubricationMode", "lubrication_mode"])
            .unwrap_or_default()
            .as_str()
        {
            "greased"    => BushingLubricationMode::Greased,
            "oiled"      => BushingLubricationMode::Oiled,
            "solid_film" => BushingLubricationMode::SolidFilm,
            _            => BushingLubricationMode::Dry,
        };

        let contamination_level = match s(&["contaminationLevel", "contamination_level"])
            .unwrap_or_default()
            .as_str()
        {
            "shop"     => BushingContaminationLevel::Shop,
            "dirty"    => BushingContaminationLevel::Dirty,
            "abrasive" => BushingContaminationLevel::Abrasive,
            _          => BushingContaminationLevel::Clean,
        };

        Ok(BushingInput {
            units,
            bore_dia,
            id_bushing,
            interference,
            bore_tol_mode,
            bore_nominal:              f(&["boreNominal",    "bore_nominal"]),
            bore_tol_plus:             f(&["boreTolPlus",    "bore_tol_plus"]),
            bore_tol_minus:            f(&["boreTolMinus",   "bore_tol_minus"]),
            bore_lower:                f(&["boreLower",      "bore_lower"]),
            bore_upper:                f(&["boreUpper",      "bore_upper"]),
            interference_tol_mode,
            interference_nominal:      f(&["interferenceNominal",   "interference_nominal"]),
            interference_tol_plus:     f(&["interferenceTolPlus",   "interference_tol_plus"]),
            interference_tol_minus:    f(&["interferenceTolMinus",  "interference_tol_minus"]),
            interference_lower:        f(&["interferenceLower",     "interference_lower"]),
            interference_upper:        f(&["interferenceUpper",     "interference_upper"]),
            interference_policy,
            bore_capability,
            enforce_interference_tolerance: b(&["enforceInterferenceTolerance", "enforce_interference_tolerance"]).unwrap_or(false),
            lock_bore_for_interference:     b(&["lockBoreForInterference",       "lock_bore_for_interference"]).unwrap_or(false),
            housing_len,
            housing_width,
            edge_dist,
            bushing_type,
            id_type,
            cs_mode,
            cs_dia:                    f(&["csDia",    "cs_dia"]).unwrap_or(0.0),
            cs_depth:                  f(&["csDepth",  "cs_depth"]).unwrap_or(0.0),
            cs_depth_tol_plus:         f(&["csDepthTolPlus",  "cs_depth_tol_plus"]),
            cs_depth_tol_minus:        f(&["csDepthTolMinus", "cs_depth_tol_minus"]),
            cs_angle:                  f(&["csAngle",  "cs_angle"]).unwrap_or(100.0),
            ext_cs_mode,
            ext_cs_dia:                f(&["extCsDia",   "ext_cs_dia"]).unwrap_or(0.0),
            ext_cs_depth:              f(&["extCsDepth", "ext_cs_depth"]).unwrap_or(0.0),
            ext_cs_depth_tol_plus:     f(&["extCsDepthTolPlus",  "ext_cs_depth_tol_plus"]),
            ext_cs_depth_tol_minus:    f(&["extCsDepthTolMinus", "ext_cs_depth_tol_minus"]),
            ext_cs_angle:              f(&["extCsAngle", "ext_cs_angle"]).unwrap_or(100.0),
            flange_dia:                f(&["flangeDia",  "flange_dia"]),
            flange_od:                 f(&["flangeOd",   "flange_od"]),
            flange_thk:                f(&["flangeThk",  "flange_thk"]),
            mat_housing:               s(&["matHousing", "mat_housing"]).unwrap_or_else(|| "Al_7075_T6".into()),
            mat_bushing:               s(&["matBushing", "mat_bushing"]).unwrap_or_else(|| "SS_17_4_PH".into()),
            friction:                  f(&["friction"]).unwrap_or(0.15),
            d_t:                       f(&["dT", "d_t"]).unwrap_or(0.0),
            assembly_housing_temperature: f(&["assemblyHousingTemperature", "assembly_housing_temperature", "t1"]),
            assembly_bushing_temperature: f(&["assemblyBushingTemperature", "assembly_bushing_temperature", "t2"]),
            process_route_id,
            standards_basis,
            standards_revision:        s(&["standardsRevision",  "standards_revision"]),
            process_spec:              s(&["processSpec",         "process_spec"]),
            approval_notes:            s(&["approvalNotes",       "approval_notes"]),
            criticality,
            min_wall_straight:         f(&["minWallStraight",  "min_wall_straight"]).unwrap_or(0.010),
            min_wall_neck:             f(&["minWallNeck",      "min_wall_neck"]).unwrap_or(0.005),
            end_constraint,
            load:                      f(&["load"]),
            edge_load_angle_deg:       f(&["edgeLoadAngleDeg", "edge_load_angle_deg", "thetaDeg"]),
            service_temperature_hot:   f(&["serviceTemperatureHot",  "service_temperature_hot"]),
            service_temperature_cold:  f(&["serviceTemperatureCold", "service_temperature_cold"]),
            finish_ream_allowance:     f(&["finishReamAllowance",    "finish_ream_allowance"]),
            wear_allowance:            f(&["wearAllowance",          "wear_allowance"]),
            load_spectrum,
            oscillation_angle_deg:     f(&["oscillationAngleDeg",    "oscillation_angle_deg"]),
            oscillation_freq_hz:       f(&["oscillationFreqHz",      "oscillation_freq_hz"]),
            duty_cycle_pct:            f(&["dutyCyclePct",           "duty_cycle_pct"]),
            lubrication_mode,
            contamination_level,
            surface_roughness_ra_um:   f(&["surfaceRoughnessRaUm", "surface_roughness_ra_um"]),
            shaft_hardness_hrc:        f(&["shaftHardnessHrc",     "shaft_hardness_hrc"]),
            misalignment_deg:          f(&["misalignmentDeg",      "misalignment_deg"]),
            id_cs:  parse_cs_input(&v["idCS"]).or_else(|| parse_cs_input(&v["id_cs"])),
            od_cs:  parse_cs_input(&v["odCS"]).or_else(|| parse_cs_input(&v["od_cs"])),
        })
    }
}

fn parse_interference_policy(v: &Value) -> InterferenceEnforcementPolicy {
    let src = v.get("interferencePolicy")
        .or_else(|| v.get("interference_policy"))
        .cloned()
        .unwrap_or(Value::Null);

    InterferenceEnforcementPolicy {
        enabled:                src.get("enabled").and_then(|x| x.as_bool()),
        lock_bore:              src.get("lockBore").or_else(|| src.get("lock_bore")).and_then(|x| x.as_bool()),
        preserve_bore_nominal:  src.get("preserveBoreNominal").or_else(|| src.get("preserve_bore_nominal")).and_then(|x| x.as_bool()),
        allow_bore_nominal_shift: src.get("allowBoreNominalShift").or_else(|| src.get("allow_bore_nominal_shift")).and_then(|x| x.as_bool()),
        max_bore_nominal_shift: src.get("maxBoreNominalShift").or_else(|| src.get("max_bore_nominal_shift")).and_then(|x| x.as_f64()),
    }
}

fn parse_bore_capability(v: &Value) -> BoreProcessCapability {
    let src = v.get("boreCapability")
        .or_else(|| v.get("bore_capability"))
        .cloned()
        .unwrap_or(Value::Null);

    BoreProcessCapability {
        mode:                       src.get("mode").and_then(|x| x.as_str()).map(str::to_owned),
        min_achievable_tol_width:   src.get("minAchievableTolWidth").or_else(|| src.get("min_achievable_tol_width")).and_then(|x| x.as_f64()),
        max_recommended_tol_width:  src.get("maxRecommendedTolWidth").or_else(|| src.get("max_recommended_tol_width")).and_then(|x| x.as_f64()),
        preferred_it_class:         src.get("preferredItClass").or_else(|| src.get("preferred_it_class")).and_then(|x| x.as_str()).map(str::to_owned),
    }
}

fn parse_cs_input(v: &Value) -> Option<CountersinkInput> {
    if v.is_null() {
        return None;
    }
    Some(CountersinkInput {
        enabled:   v.get("enabled").and_then(|x| x.as_bool()),
        def_type:  v.get("defType").or_else(|| v.get("def_type")).and_then(|x| x.as_str()).map(str::to_owned),
        dia:       v.get("dia").and_then(|x| x.as_f64()),
        depth:     v.get("depth").and_then(|x| x.as_f64()),
        angle_deg: v.get("angleDeg").or_else(|| v.get("angle_deg")).and_then(|x| x.as_f64()),
    })
}
