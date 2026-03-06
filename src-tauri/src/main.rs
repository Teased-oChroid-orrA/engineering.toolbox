#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod fastener;
mod geometry;
mod inspector;
mod surface;

use geometry::{brep, buckling, solver};
use serde::Serialize;
use std::sync::{Arc, Mutex, RwLock};
#[cfg(target_os = "windows")]
use std::time::Duration;
use std::time::Instant;
#[cfg(target_os = "windows")]
use tauri::Emitter;
use tauri::{Manager, State};

pub struct AppState {
    pub nodes: RwLock<Vec<brep::Point3D>>,
    pub constraints: RwLock<Vec<solver::Constraint>>,
}

#[derive(Debug)]
struct StartupHealthState {
    started_at: Instant,
    shell_mounted_at: Option<Instant>,
    app_ready_at: Option<Instant>,
    splash_finished_at: Option<Instant>,
    last_progress: u8,
    last_message: String,
    watchdog_forced_show: bool,
    watchdog_force_count: u32,
    main_window_visible: Option<bool>,
}

#[derive(Clone)]
pub struct StartupHealth(Arc<Mutex<StartupHealthState>>);

impl Default for StartupHealth {
    fn default() -> Self {
        Self(Arc::new(Mutex::new(StartupHealthState {
            started_at: Instant::now(),
            shell_mounted_at: None,
            app_ready_at: None,
            splash_finished_at: None,
            last_progress: 0,
            last_message: "App starting".to_string(),
            watchdog_forced_show: false,
            watchdog_force_count: 0,
            main_window_visible: None,
        })))
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct StartupHealthSnapshot {
    elapsed_ms: u64,
    shell_mounted: bool,
    app_ready: bool,
    splash_finished: bool,
    shell_mounted_elapsed_ms: Option<u64>,
    app_ready_elapsed_ms: Option<u64>,
    splash_finished_elapsed_ms: Option<u64>,
    last_progress: u8,
    last_message: String,
    watchdog_forced_show: bool,
    watchdog_force_count: u32,
    main_window_visible: Option<bool>,
    pid: u32,
    executable_path: Option<String>,
}

fn elapsed_ms(since: Instant, mark: Option<Instant>) -> Option<u64> {
    mark.map(|m| m.saturating_duration_since(since).as_millis() as u64)
}

#[tauri::command(rename_all = "camelCase")]
async fn startup_health_event(
    event: String,
    progress: Option<u8>,
    message: Option<String>,
    state: State<'_, StartupHealth>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let mut guard = state
        .0
        .lock()
        .map_err(|_| "startup health lock poisoned".to_string())?;
    if let Some(p) = progress {
        guard.last_progress = p.min(100);
    }
    if let Some(msg) = message {
        guard.last_message = msg;
    }
    match event.as_str() {
        "app-shell-mounted" => {
            if guard.shell_mounted_at.is_none() {
                guard.shell_mounted_at = Some(Instant::now());
            }
        }
        "app-ready" => {
            if guard.app_ready_at.is_none() {
                guard.app_ready_at = Some(Instant::now());
            }
        }
        "boot-overlay-finished" => {
            if guard.splash_finished_at.is_none() {
                guard.splash_finished_at = Some(Instant::now());
            }
        }
        _ => {}
    }
    if let Some(window) = app.get_webview_window("main") {
        guard.main_window_visible = window.is_visible().ok();
    }
    Ok(())
}

#[tauri::command(rename_all = "camelCase")]
async fn startup_health_get(
    state: State<'_, StartupHealth>,
    app: tauri::AppHandle,
) -> Result<StartupHealthSnapshot, String> {
    let mut guard = state
        .0
        .lock()
        .map_err(|_| "startup health lock poisoned".to_string())?;
    if let Some(window) = app.get_webview_window("main") {
        guard.main_window_visible = window.is_visible().ok();
    }
    let started = guard.started_at;
    Ok(StartupHealthSnapshot {
        elapsed_ms: Instant::now().saturating_duration_since(started).as_millis() as u64,
        shell_mounted: guard.shell_mounted_at.is_some(),
        app_ready: guard.app_ready_at.is_some(),
        splash_finished: guard.splash_finished_at.is_some(),
        shell_mounted_elapsed_ms: elapsed_ms(started, guard.shell_mounted_at),
        app_ready_elapsed_ms: elapsed_ms(started, guard.app_ready_at),
        splash_finished_elapsed_ms: elapsed_ms(started, guard.splash_finished_at),
        last_progress: guard.last_progress,
        last_message: guard.last_message.clone(),
        watchdog_forced_show: guard.watchdog_forced_show,
        watchdog_force_count: guard.watchdog_force_count,
        main_window_visible: guard.main_window_visible,
        pid: std::process::id(),
        executable_path: std::env::current_exe()
            .ok()
            .and_then(|path| path.to_str().map(|s| s.to_string())),
    })
}

#[tauri::command(rename_all = "camelCase")]
async fn solve_and_analyze(
    state: State<'_, AppState>,
    moved_id: usize,
    new_pos: brep::Point3D,
) -> Result<(Vec<brep::Point3D>, brep::SectionProps, Vec<solver::AuditEntry>), String> {
    let mut nodes = state
        .nodes
        .write()
        .map_err(|_| "state lock poisoned".to_string())?;
    let constraints = state
        .constraints
        .read()
        .map_err(|_| "state lock poisoned".to_string())?;

    if moved_id >= nodes.len() {
        return Err(format!(
            "moved_id {} out of range (nodes={})",
            moved_id,
            nodes.len()
        ));
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
    let startup_health = StartupHealth::default();
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(startup_health.clone())
        .manage(AppState {
            // Default rectangle so the Profile Toolbox works immediately.
            nodes: RwLock::new(vec![
                brep::Point3D {
                    x: 0.0,
                    y: 0.0,
                    z: 0.0,
                },
                brep::Point3D {
                    x: 4.0,
                    y: 0.0,
                    z: 0.0,
                },
                brep::Point3D {
                    x: 4.0,
                    y: 6.0,
                    z: 0.0,
                },
                brep::Point3D {
                    x: 0.0,
                    y: 6.0,
                    z: 0.0,
                },
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
            fastener::fastener_verify_stiffness,
            startup_health_event,
            startup_health_get,
            // inspector_export_filtered_csv is optional and may be added later
        ])
        .setup({
            let startup_health_clone = startup_health.clone();
            move |app| {
                #[cfg(target_os = "windows")]
                {
                    let app_handle = app.handle().clone();
                    let startup_health = startup_health_clone.clone();
                    std::thread::spawn(move || {
                        for _ in 0..30 {
                            std::thread::sleep(Duration::from_secs(2));
                            let mut force_show = false;
                            let mut should_break = false;
                            if let Ok(state) = startup_health.0.lock() {
                                let elapsed = Instant::now().saturating_duration_since(state.started_at);
                                if state.app_ready_at.is_some() {
                                    should_break = true;
                                } else if elapsed > Duration::from_secs(12)
                                    && state.shell_mounted_at.is_none()
                                {
                                    force_show = true;
                                }
                            }
                            if should_break {
                                break;
                            }
                            if force_show {
                                if let Some(window) = app_handle.get_webview_window("main") {
                                    let _ = window.show();
                                    let _ = window.unminimize();
                                    let _ = window.set_focus();
                                    let visible = window.is_visible().ok();
                                    if let Ok(mut state) = startup_health.0.lock() {
                                        state.watchdog_forced_show = true;
                                        state.watchdog_force_count =
                                            state.watchdog_force_count.saturating_add(1);
                                        state.main_window_visible = visible;
                                        state.last_message =
                                            "Startup watchdog force-show applied on Windows".to_string();
                                    }
                                    let _ = app_handle.emit(
                                        "startup-watchdog",
                                        serde_json::json!({
                                            "event": "force-show",
                                            "visible": visible
                                        }),
                                    );
                                }
                            }
                        }
                    });
                }
                #[cfg(not(target_os = "windows"))]
                {
                    let _ = &startup_health_clone;
                    let _ = app;
                }
                Ok(())
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
