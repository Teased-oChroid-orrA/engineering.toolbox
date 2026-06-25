use thiserror::Error;

#[derive(Debug, Error)]
pub enum BushingError {
    #[error("missing required field: {0}")]
    MissingField(&'static str),

    #[error("invalid input: {0}")]
    InvalidInput(String),

    #[error("schema validation failed: {0}")]
    Schema(String),

    #[error("computation error: {0}")]
    Computation(String),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
}
