use std::io::Read;

use anyhow::{Context, Result};
use bushing_solver::{compute_bushing, BushingInputRaw};
use clap::Parser;

#[derive(Parser)]
#[command(
    name    = "bushing",
    about   = "Structural bushing solver — offline, zero-admin, zero-network",
    version
)]
struct Args {
    /// JSON file containing bushing inputs (reads from stdin if omitted)
    #[arg(short, long)]
    input: Option<std::path::PathBuf>,

    /// Output format: json (default), compact
    #[arg(short, long, default_value = "json")]
    format: String,

    /// Pretty-print indent (ignored for compact format)
    #[arg(long, default_value = "2")]
    indent: usize,
}

fn main() -> Result<()> {
    let args = Args::parse();

    let raw_json = match args.input {
        Some(path) => std::fs::read_to_string(&path)
            .with_context(|| format!("reading input file {}", path.display()))?,
        None => {
            let mut buf = String::new();
            std::io::stdin()
                .read_to_string(&mut buf)
                .context("reading JSON from stdin")?;
            buf
        }
    };

    let value: serde_json::Value =
        serde_json::from_str(&raw_json).context("parsing input JSON")?;
    let raw = BushingInputRaw(value);

    let output = compute_bushing(raw).map_err(|e| anyhow::anyhow!("{e}"))?;

    let out_str = match args.format.as_str() {
        "compact" => serde_json::to_string(&output).context("serialising output")?,
        _ => serde_json::to_string_pretty(&output).context("serialising output")?,
    };

    println!("{out_str}");
    Ok(())
}
