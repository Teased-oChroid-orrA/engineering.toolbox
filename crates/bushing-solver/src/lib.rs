pub mod error;
pub mod inputs;
pub mod materials;
pub mod math;
pub mod schema;
pub mod service;
pub mod solver;
pub mod types;

pub use error::BushingError;
pub use inputs::BushingInputRaw;
pub use types::{BushingInput, BushingOutput};

/// Compute bushing fit analysis from raw (flexible-format) JSON input.
///
/// Accepts camelCase, snake_case, and legacy field aliases.
/// Returns a fully-populated [`BushingOutput`] or a [`BushingError`].
pub fn compute_bushing(raw: BushingInputRaw) -> Result<BushingOutput, BushingError> {
    let input = raw.normalize()?;
    schema::validate(&input)?;
    solver::compute(&input)
}

/// Convenience entry point for already-normalised input (e.g. from the Tauri IPC bridge).
pub fn compute_bushing_normalised(input: BushingInput) -> Result<BushingOutput, BushingError> {
    schema::validate(&input)?;
    solver::compute(&input)
}
