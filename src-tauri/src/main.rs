#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod geometry;
mod inspector;
mod surface;

use std::sync::RwLock;
use tauri::State;
use geometry::{brep, solver, buckling};

pub struct AppState {
    pub nodes: RwLock<Vec<brep::Point3D>>,
    pub constraints: RwLock<Vec<solver::Constraint>>,
}

#[tauri::command(rename_all = "camelCase")]
async fn solve_and_analyze(
    state: State<'_, AppState>,
    moved_id: usize,
    new_pos: brep::Point3D,
) -> Result<(Vec<brep::Point3D>, brep::SectionProps, Vec<solver::AuditEntry>), String> {
    let mut nodes = state.nodes.write().map_err(|_| "state lock poisoned".to_string())?;
    let constraints = state.constraints.read().map_err(|_| "state lock poisoned".to_string())?;

    if moved_id >= nodes.len() {
        return Err(format!("moved_id {} out of range (nodes={})", moved_id, nodes.len()));
    }

    nodes[moved_id] = new_pos;
    let audit = solver::run_gcs_cycle(&mut nodes, &constraints)?;
    let props = brep::calculate_advanced_props(&nodes);
    Ok((nodes.clone(), props, audit))
}

#[tauri::command(rename_all = "camelCase")]
async fn eval_buckling(
    area: f64,
    r_g: f64,
    l: f64,
    k: f64,
    e: f64,
    sy: f64,
) -> Result<buckling::BucklingResult, String> {
    Ok(buckling::eval_buckling(area, r_g, l, k, e, sy))
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            // Default rectangle so the Profile Toolbox works immediately.
            nodes: RwLock::new(vec![
                brep::Point3D { x: 0.0, y: 0.0, z: 0.0 },
                brep::Point3D { x: 4.0, y: 0.0, z: 0.0 },
                brep::Point3D { x: 4.0, y: 6.0, z: 0.0 },
                brep::Point3D { x: 0.0, y: 6.0, z: 0.0 },
            ]),
            constraints: RwLock::new(vec![]),
        })
        .manage(inspector::DataState::default())
        .invoke_handler(tauri::generate_handler![
            solve_and_analyze,
            eval_buckling,
            surface::surface_calc_offset_intersection,
            surface::surface_profile_cut,
            surface::surface_transform_to_lcs,
            surface::surface_eval_best_fit_plane,
            surface::surface_eval_section_slices,
            surface::surface_eval_best_fit_cylinder,
            surface::surface_import_step_points,
            surface::surface_import_step_text,
            inspector::inspector_load_csv_text,
            inspector::inspector_sniff_has_headers_path,
            inspector::inspector_load_csv_path,
            inspector::inspector_filter,
            inspector::inspector_query_multiple_csv,
            inspector::inspector_get_row_slice,
            inspector::inspector_get_category_values,
            inspector::inspector_debug_log_clear,
            inspector::inspector_debug_log_batch,
            inspector::inspector_get_full_row_metadata,
            inspector::inspector_sort,
            inspector::inspector_set_quiet_logs,
            inspector::inspector_explain_row,
            // inspector_export_filtered_csv is optional and may be added later
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
