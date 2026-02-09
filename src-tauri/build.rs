// Tauri build script
// Required so `tauri::generate_context!()` can find the generated config in OUT_DIR.
fn main() {
  tauri_build::build();
}
