use bushing_solver::{compute_bushing, BushingInputRaw, BushingOutput};
use serde_json::Value;

/// Compute a full bushing fit analysis from the frontend.
/// Accepts raw JSON (camelCase or snake_case aliases) and returns BushingOutput.
#[tauri::command(rename_all = "camelCase")]
pub async fn bushing_compute(input: Value) -> Result<BushingOutput, String> {
    let raw = BushingInputRaw(input);
    compute_bushing(raw).map_err(|e| e.to_string())
}
