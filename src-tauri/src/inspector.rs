use chrono::NaiveDate;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::fs::{File, OpenOptions};
use std::io::{BufReader, Read, Write};
use std::collections::{HashMap, HashSet};
use std::sync::RwLock;
use std::time::Instant;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::State;

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum MatchMode {
    Fuzzy,
    Exact,
    Regex,
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ColType {
    Numeric,
    Date,
    String,
}

pub struct DataState {
    pub headers: RwLock<Vec<String>>,
    pub columns: RwLock<Vec<Vec<String>>>, // column-major: columns[col][row]
    pub col_types: RwLock<Vec<ColType>>,
    pub row_count: RwLock<usize>,
    pub filtered_indices: RwLock<Vec<usize>>, // indices into row space
    pub last_filter: RwLock<Option<FilterSpec>>, // for diagnostics / optional reuse
    pub quiet_logs: RwLock<bool>,
}

impl Default for DataState {
    fn default() -> Self {
        Self {
            headers: RwLock::new(Vec::new()),
            columns: RwLock::new(Vec::new()),
            col_types: RwLock::new(Vec::new()),
            row_count: RwLock::new(0),
            filtered_indices: RwLock::new(Vec::new()),
            last_filter: RwLock::new(None),
            quiet_logs: RwLock::new(true),
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoadResult {
    pub headers: Vec<String>,
    pub row_count: usize,
    pub col_types: Vec<ColType>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NumericFilter {
    pub enabled: bool,
    pub col_idx: usize,
    pub min: f64,
    pub max: f64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DateFilter {
    pub enabled: bool,
    pub col_idx: usize,
    pub min_iso: String,
    pub max_iso: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CategoryFilter {
    pub enabled: bool,
    pub col_idx: usize,
    pub selected: Vec<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CategoryValuesRequest {
    pub col_idx: usize,
    pub search: Option<String>,
    pub offset: usize,
    pub limit: usize,
    pub max_rows_scan: Option<usize>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CategoryValueCount {
    pub value: String,
    pub count: usize,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CategoryValuesResponse {
    pub col_idx: usize,
    pub rows_scanned: usize,
    pub total_rows_in_view: usize,
    pub partial: bool,
    pub distinct_total: usize,
    pub offset: usize,
    pub limit: usize,
    pub values: Vec<CategoryValueCount>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FilterSpec {
    pub query: String,
    pub column_idx: Option<usize>,
    pub match_mode: MatchMode,
    pub numeric_filter: Option<NumericFilter>,
    pub date_filter: Option<DateFilter>,
    pub category_filter: Option<CategoryFilter>,
    // throttle: stop scanning after N rows (None = scan all)
    pub max_rows_scan: Option<usize>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MultiCsvDatasetInput {
    pub dataset_id: String,
    pub label: String,
    pub has_headers: bool,
    pub kind: String, // "text" | "path"
    pub text: Option<String>,
    pub path: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MultiCsvQueryRequest {
    pub datasets: Vec<MultiCsvDatasetInput>,
    pub spec: FilterSpec,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MultiCsvDatasetResult {
    pub dataset_id: String,
    pub label: String,
    pub filtered: usize,
    pub total: usize,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MultiCsvQueryResponse {
    pub dataset_results: Vec<MultiCsvDatasetResult>,
    pub merged_headers: Vec<String>,
    pub merged_rows: Vec<Vec<String>>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SortSpec {
    pub col_idx: usize,
    pub dir: String, // "asc" | "desc"
    pub stable: Option<bool>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExplainRowResponse {
    pub visual_idx: usize,
    pub source_row_idx: usize,
    pub passes: bool,
    pub reasons: Vec<String>,
}

#[tauri::command(rename_all = "camelCase")]
pub fn inspector_set_quiet_logs(state: State<'_, DataState>, quiet: bool) -> Result<(), String> {
    *state.quiet_logs.write().map_err(|_| "lock error")? = quiet;
    Ok(())
}

fn parse_f64_relaxed(s: &str) -> Option<f64> {
    let t = s.trim();
    if t.is_empty() {
        return None;
    }
    let cleaned = t.replace([',', '_'], "");
    cleaned.parse::<f64>().ok()
}

fn try_parse_date(s: &str) -> Option<NaiveDate> {
    let t = s.trim();
    if t.is_empty() {
        return None;
    }
    NaiveDate::parse_from_str(t, "%Y-%m-%d")
        .or_else(|_| NaiveDate::parse_from_str(t, "%m/%d/%Y"))
        .or_else(|_| NaiveDate::parse_from_str(t, "%Y/%m/%d"))
        .ok()
}

fn infer_col_type(values: &[String]) -> ColType {
    let mut n = 0usize;
    let mut num_ok = 0usize;
    let mut date_ok = 0usize;

    for v in values.iter().filter(|v| !v.trim().is_empty()).take(120) {
        n += 1;
        if parse_f64_relaxed(v).is_some() {
            num_ok += 1;
        }
        if try_parse_date(v).is_some() {
            date_ok += 1;
        }
    }

    if n == 0 {
        return ColType::String;
    }
    let num_r = num_ok as f64 / n as f64;
    let date_r = date_ok as f64 / n as f64;

    if num_r >= 0.60 && num_ok >= 2 {
        ColType::Numeric
    } else if date_r >= 0.60 && date_ok >= 2 {
        ColType::Date
    } else {
        ColType::String
    }
}

fn csv_reader_from_bytes(data: &[u8]) -> csv::Reader<&[u8]> {
    csv::ReaderBuilder::new()
        .flexible(true)
        .from_reader(data)
}

fn detect_delimiter(sample: &[u8]) -> u8 {
    // Candidates: comma, tab, semicolon, pipe
    // We count delimiter occurrences outside of quotes in the first ~200KB.
    let max_len = sample.len().min(200_000);
    let s = &sample[..max_len];
    let candidates: [u8; 4] = [b',', b'\t', b';', b'|'];
    let mut counts = [0usize; 4];

    let mut in_quotes = false;
    let mut i = 0usize;
    while i < s.len() {
        let b = s[i];
        if b == b'"' {
            // CSV escaping: "" inside a quoted field
            if in_quotes && i + 1 < s.len() && s[i + 1] == b'"' {
                i += 2;
                continue;
            }
            in_quotes = !in_quotes;
            i += 1;
            continue;
        }
        if !in_quotes {
            for (k, &c) in candidates.iter().enumerate() {
                if b == c {
                    counts[k] += 1;
                }
            }
        }
        i += 1;
    }

    let mut best = 0usize;
    for k in 1..counts.len() {
        if counts[k] > counts[best] {
            best = k;
        }
    }
    candidates[best]
}

fn build_reader_for_file(
    file: File,
    delimiter: u8,
    has_headers: bool,
) -> csv::Reader<BufReader<File>> {
    csv::ReaderBuilder::new()
        .delimiter(delimiter)
        .has_headers(has_headers)
        .flexible(true)
        .from_reader(BufReader::new(file))
}

fn is_likely_header_cell(s: &str) -> bool {
    let t = s.trim();
    if t.is_empty() {
        return false;
    }
    let has_alpha = t.chars().any(|c| c.is_ascii_alphabetic() || c == '_');
    if !has_alpha {
        return false;
    }
    // Reject pure numeric-ish
    let numericish = t
        .replace(',', "")
        .replace('_', "")
        .parse::<f64>()
        .is_ok();
    if numericish {
        return false;
    }
    // Reject common date patterns
    if NaiveDate::parse_from_str(t, "%Y-%m-%d").is_ok() {
        return false;
    }
    if NaiveDate::parse_from_str(t, "%m/%d/%Y").is_ok() {
        return false;
    }
    t.len() <= 64
}

fn header_heuristic(first: &[String], second: &[String]) -> (bool, bool, String) {
    if first.is_empty() {
        return (true, true, "Empty first record: defaulting to headers.".to_string());
    }
    if second.is_empty() {
        // Single-record files are common in generated numeric exports.
        // Default to "no headers" unless first row clearly looks header-like.
        let n1 = first.len().max(1) as f64;
        let score1 = first.iter().filter(|s| is_likely_header_cell(s)).count() as f64 / n1;
        let reason = format!("Single-row CSV: row1 header-likeness={:.2}", score1);
        if score1 >= 0.75 {
            return (true, true, reason);
        }
        return (true, false, reason);
    }
    let n1 = first.len().max(1) as f64;
    let n2 = second.len().max(1) as f64;
    let score1 = first.iter().filter(|s| is_likely_header_cell(s)).count() as f64 / n1;
    let score2 = second.iter().filter(|s| is_likely_header_cell(s)).count() as f64 / n2;
    let diff = score1 - score2;
    let reason = format!("Header score row1={:.2}, row2={:.2}, diff={:.2}", score1, score2, diff);
    if score1 >= 0.75 && diff >= 0.15 {
        return (true, true, reason);
    }
    if score1 <= 0.25 && diff <= -0.05 {
        return (true, false, reason);
    }
    (false, true, reason)
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SniffHeadersResult {
    pub decided: bool,
    pub has_headers: bool,
    pub reason: String,
}

/// Reads a small sample of a CSV file, auto-detects delimiter, and guesses whether the first row is headers.
/// If confidence is low, returns `decided=false` and a reason string.
#[tauri::command(rename_all = "camelCase")]
pub fn inspector_sniff_has_headers_path(path: String) -> Result<SniffHeadersResult, String> {
    let mut f = File::open(&path).map_err(|e| e.to_string())?;
    let mut sample = vec![0u8; 64 * 1024];
    let n = f.read(&mut sample).map_err(|e| e.to_string())?;
    sample.truncate(n);

    let delimiter = detect_delimiter(&sample);
    let file = File::open(&path).map_err(|e| e.to_string())?;
    let mut rdr = csv::ReaderBuilder::new()
        .delimiter(delimiter)
        .has_headers(false)
        .flexible(true)
        .from_reader(BufReader::new(file));

    let mut it = rdr.records();
    let first = match it.next() {
        Some(r) => r.map_err(|e| e.to_string())?,
        None => {
            return Ok(SniffHeadersResult {
                decided: true,
                has_headers: true,
                reason: "Empty file: defaulting to headers.".to_string(),
            })
        }
    };
    let second = match it.next() {
        Some(r) => r.map_err(|e| e.to_string())?,
        None => csv::StringRecord::new(),
    };

    let first_vec: Vec<String> = first.iter().map(|s| s.to_string()).collect();
    let second_vec: Vec<String> = second.iter().map(|s| s.to_string()).collect();

    let (decided, has_headers, reason) = header_heuristic(&first_vec, &second_vec);
    Ok(SniffHeadersResult {
        decided,
        has_headers,
        reason,
    })
}

#[tauri::command(rename_all = "camelCase")]
pub fn inspector_load_csv_text(state: State<'_, DataState>, text: String, has_headers: bool) -> Result<LoadResult, String> {
    let bytes = text.as_bytes();
    let mut rdr = csv_reader_from_bytes(bytes);

    let mut headers: Vec<String> = if has_headers {
        rdr.headers()
            .map_err(|e| e.to_string())?
            .iter()
            .map(|s| s.to_string())
            .collect()
    } else {
        vec![]
    };

    let mut rows: Vec<Vec<String>> = Vec::new();
    for r in rdr.records() {
        let rec = r.map_err(|e| e.to_string())?;
        rows.push(rec.iter().map(|s| s.to_string()).collect());
    }

    if !has_headers {
        let ncols = rows.get(0).map(|r| r.len()).unwrap_or(0);
        headers = (0..ncols).map(|i| format!("Column_{}", i + 1)).collect();
    }

    let ncols = headers.len();
    let mut columns: Vec<Vec<String>> = vec![Vec::new(); ncols];
    for row in &rows {
        for c in 0..ncols {
            columns[c].push(row.get(c).cloned().unwrap_or_default());
        }
    }

    let row_count = columns.get(0).map(|c| c.len()).unwrap_or(0);
    let col_types: Vec<ColType> = (0..ncols).map(|i| infer_col_type(&columns[i])).collect();
    let indices: Vec<usize> = (0..row_count).collect();

    *state.headers.write().map_err(|_| "lock error")? = headers.clone();
    *state.columns.write().map_err(|_| "lock error")? = columns;
    *state.col_types.write().map_err(|_| "lock error")? = col_types.clone();
    *state.row_count.write().map_err(|_| "lock error")? = row_count;
    *state.filtered_indices.write().map_err(|_| "lock error")? = indices;
    *state.last_filter.write().map_err(|_| "lock error")? = None;

    Ok(LoadResult { headers, row_count, col_types })
}

/// Streaming load path (Tauri): avoid holding full CSV text in JS memory.
///
/// - Handles commas/newlines inside quoted fields (csv crate)
/// - Auto-detects delimiter among: comma, tab, semicolon, pipe
/// - Supports headerless CSVs (generates Column_1..N)
/// - Flexible rows: shorter rows are padded with ""; longer rows extend schema
#[tauri::command(rename_all = "camelCase")]
pub fn inspector_load_csv_path(
    state: State<'_, DataState>,
    path: String,
    has_headers: bool,
) -> Result<LoadResult, String> {
    // Sample the first chunk for delimiter detection.
    let mut f = File::open(&path).map_err(|e| format!("Failed to open file: {e}"))?;
    let mut sample = vec![0u8; 256 * 1024];
    let n = f.read(&mut sample).map_err(|e| format!("Failed to read file: {e}"))?;
    sample.truncate(n);
    let delim = detect_delimiter(&sample);
    drop(f);

    let file = File::open(&path).map_err(|e| format!("Failed to open file: {e}"))?;
    let mut rdr = build_reader_for_file(file, delim, has_headers);

    let mut headers: Vec<String> = if has_headers {
        rdr.headers()
            .map_err(|e| e.to_string())?
            .iter()
            .map(|s| s.to_string())
            .collect()
    } else {
        vec![]
    };

    // Column-major storage. We grow schema if rows exceed current header count.
    let mut columns: Vec<Vec<String>> = Vec::new();
    let mut row_count: usize = 0;

    for r in rdr.records() {
        let rec = r.map_err(|e| e.to_string())?;

        if headers.is_empty() {
            // First record determines initial width.
            let ncols = rec.len();
            headers = (0..ncols).map(|i| format!("Column_{}", i + 1)).collect();
            columns = vec![Vec::new(); ncols];
        }

        if columns.is_empty() {
            columns = vec![Vec::new(); headers.len()];
        }

        // Extend schema if this record is wider than current columns.
        if rec.len() > headers.len() {
            let old = headers.len();
            for i in old..rec.len() {
                headers.push(format!("Column_{}", i + 1));
                columns.push(Vec::new());
            }
        }

        let ncols = headers.len();
        for c in 0..ncols {
            let v = rec.get(c).unwrap_or("").to_string();
            columns[c].push(v);
        }
        row_count += 1;
    }

    // Infer types once we have columns.
    let col_types: Vec<ColType> = (0..headers.len())
        // Wrap in closure so deref coercion (&Vec<String> -> &[String]) applies.
        .map(|i| columns.get(i).map(|col| infer_col_type(col)).unwrap_or(ColType::String))
        .collect();
    let indices: Vec<usize> = (0..row_count).collect();

    *state.headers.write().map_err(|_| "lock error")? = headers.clone();
    *state.columns.write().map_err(|_| "lock error")? = columns;
    *state.col_types.write().map_err(|_| "lock error")? = col_types.clone();
    *state.row_count.write().map_err(|_| "lock error")? = row_count;
    *state.filtered_indices.write().map_err(|_| "lock error")? = indices;
    *state.last_filter.write().map_err(|_| "lock error")? = None;

    Ok(LoadResult {
        headers,
        row_count,
        col_types,
    })
}

fn load_csv_text_dataset(text: &str, has_headers: bool) -> Result<(Vec<String>, Vec<Vec<String>>, Vec<ColType>, usize), String> {
    let bytes = text.as_bytes();
    let mut rdr = csv_reader_from_bytes(bytes);

    let mut headers: Vec<String> = if has_headers {
        rdr.headers()
            .map_err(|e| e.to_string())?
            .iter()
            .map(|s| s.to_string())
            .collect()
    } else {
        vec![]
    };

    let mut rows: Vec<Vec<String>> = Vec::new();
    for r in rdr.records() {
        let rec = r.map_err(|e| e.to_string())?;
        rows.push(rec.iter().map(|s| s.to_string()).collect());
    }

    if !has_headers {
        let ncols = rows.first().map(|r| r.len()).unwrap_or(0);
        headers = (0..ncols).map(|i| format!("Column_{}", i + 1)).collect();
    }

    let ncols = headers.len();
    let mut columns: Vec<Vec<String>> = vec![Vec::new(); ncols];
    for row in &rows {
        for c in 0..ncols {
            columns[c].push(row.get(c).cloned().unwrap_or_default());
        }
    }

    let row_count = columns.first().map(|c| c.len()).unwrap_or(0);
    let col_types: Vec<ColType> = (0..ncols).map(|i| infer_col_type(&columns[i])).collect();
    Ok((headers, columns, col_types, row_count))
}

fn load_csv_path_dataset(path: &str, has_headers: bool) -> Result<(Vec<String>, Vec<Vec<String>>, Vec<ColType>, usize), String> {
    let mut f = File::open(path).map_err(|e| format!("Failed to open file: {e}"))?;
    let mut sample = vec![0u8; 256 * 1024];
    let n = f.read(&mut sample).map_err(|e| format!("Failed to read file: {e}"))?;
    sample.truncate(n);
    let delim = detect_delimiter(&sample);
    drop(f);

    let file = File::open(path).map_err(|e| format!("Failed to open file: {e}"))?;
    let mut rdr = build_reader_for_file(file, delim, has_headers);

    let mut headers: Vec<String> = if has_headers {
        rdr.headers()
            .map_err(|e| e.to_string())?
            .iter()
            .map(|s| s.to_string())
            .collect()
    } else {
        vec![]
    };

    let mut columns: Vec<Vec<String>> = Vec::new();
    let mut row_count: usize = 0;

    for r in rdr.records() {
        let rec = r.map_err(|e| e.to_string())?;

        if headers.is_empty() {
            let ncols = rec.len();
            headers = (0..ncols).map(|i| format!("Column_{}", i + 1)).collect();
            columns = vec![Vec::new(); ncols];
        }
        if columns.is_empty() {
            columns = vec![Vec::new(); headers.len()];
        }
        if rec.len() > headers.len() {
            let old = headers.len();
            for i in old..rec.len() {
                headers.push(format!("Column_{}", i + 1));
                columns.push(Vec::new());
            }
        }
        let ncols = headers.len();
        for c in 0..ncols {
            let v = rec.get(c).unwrap_or("").to_string();
            columns[c].push(v);
        }
        row_count += 1;
    }

    let col_types: Vec<ColType> = (0..headers.len())
        .map(|i| columns.get(i).map(|col| infer_col_type(col)).unwrap_or(ColType::String))
        .collect();
    Ok((headers, columns, col_types, row_count))
}

fn passes_numeric(col: &[String], row: usize, f: &NumericFilter) -> bool {
    if !f.enabled {
        return true;
    }
    let v = col.get(row).map(|s| s.trim()).unwrap_or("");
    parse_f64_relaxed(v).map(|x| x >= f.min && x <= f.max).unwrap_or(false)
}

fn passes_date(col: &[String], row: usize, f: &DateFilter) -> bool {
    if !f.enabled {
        return true;
    }
    let v = col.get(row).map(|s| s.trim()).unwrap_or("");
    let d = match try_parse_date(v) { Some(d) => d, None => return false };
    let min_d = try_parse_date(&f.min_iso).unwrap_or(NaiveDate::from_ymd_opt(1900,1,1).unwrap());
    let max_d = try_parse_date(&f.max_iso).unwrap_or(NaiveDate::from_ymd_opt(3000,1,1).unwrap());
    d >= min_d && d <= max_d
}

fn filter_indices(columns: &[Vec<String>], row_count: usize, spec: &FilterSpec) -> Result<Vec<usize>, String> {
    if spec.match_mode == MatchMode::Regex && spec.query.len() > 256 {
        return Err("Regex pattern too long (max 256 chars)".to_string());
    }
    let mut compiled: Option<Regex> = None;
    if spec.match_mode == MatchMode::Regex && !spec.query.trim().is_empty() {
        compiled = Some(Regex::new(&spec.query).map_err(|e| format!("Invalid regex: {e}"))?);
    }

    let max_scan = spec.max_rows_scan.unwrap_or(row_count);
    let scan_n = row_count.min(max_scan);
    let no_tier2 = spec.numeric_filter.is_none() && spec.date_filter.is_none() && spec.category_filter.is_none();
    if spec.query.trim().is_empty() && no_tier2 {
        return Ok((0..scan_n).collect());
    }

    let mut out: Vec<usize> = Vec::with_capacity(scan_n.min(64_000));
    let q = spec.query.trim().to_string();
    let q_lower = q.to_lowercase();
    let cat_set: Option<HashSet<&str>> = spec
        .category_filter
        .as_ref()
        .filter(|f| f.enabled && !f.selected.is_empty())
        .map(|f| f.selected.iter().map(|s| s.as_str()).collect());

    for r in 0..scan_n {
        if let Some(f) = &spec.numeric_filter {
            if f.col_idx >= columns.len() || !passes_numeric(&columns[f.col_idx], r, f) {
                continue;
            }
        }
        if let Some(f) = &spec.date_filter {
            if f.col_idx >= columns.len() || !passes_date(&columns[f.col_idx], r, f) {
                continue;
            }
        }
        if q.is_empty() {
            if let (Some(f), Some(set)) = (&spec.category_filter, &cat_set) {
                if f.enabled && f.col_idx < columns.len() {
                    let v = columns[f.col_idx].get(r).map(|s| s.trim()).unwrap_or("");
                    if !set.contains(v) {
                        continue;
                    }
                }
            }
            out.push(r);
            continue;
        }

        let mut hit = false;
        if let Some(ci) = spec.column_idx {
            if ci < columns.len() {
                let cell = columns[ci].get(r).map(|s| s.as_str()).unwrap_or("");
                hit = match spec.match_mode {
                    MatchMode::Exact => cell.eq_ignore_ascii_case(&q),
                    MatchMode::Fuzzy => cell.to_lowercase().contains(&q_lower),
                    MatchMode::Regex => {
                        let re = compiled.as_ref().ok_or_else(|| "regex not compiled".to_string())?;
                        re.is_match(cell)
                    }
                };
            }
        } else {
            for c in columns.iter() {
                let cell = c.get(r).map(|s| s.as_str()).unwrap_or("");
                let matched = match spec.match_mode {
                    MatchMode::Exact => cell.eq_ignore_ascii_case(&q),
                    MatchMode::Fuzzy => cell.to_lowercase().contains(&q_lower),
                    MatchMode::Regex => {
                        let re = compiled.as_ref().ok_or_else(|| "regex not compiled".to_string())?;
                        re.is_match(cell)
                    }
                };
                if matched {
                    hit = true;
                    break;
                }
            }
        }
        if let (Some(f), Some(set)) = (&spec.category_filter, &cat_set) {
            if f.enabled && f.col_idx < columns.len() {
                let v = columns[f.col_idx].get(r).map(|s| s.trim()).unwrap_or("");
                if !set.contains(v) {
                    continue;
                }
            }
        }
        if hit {
            out.push(r);
        }
    }

    Ok(out)
}

#[tauri::command(rename_all = "camelCase")]
pub fn inspector_filter(state: State<'_, DataState>, spec: FilterSpec) -> Result<usize, String> {
    let t0 = Instant::now();
    let columns = state.columns.read().map_err(|_| "lock error")?;
    let row_count = *state.row_count.read().map_err(|_| "lock error")?;
    let quiet_logs = *state.quiet_logs.read().map_err(|_| "lock error")?;
    let scan_n = row_count.min(spec.max_rows_scan.unwrap_or(row_count));
    let out = filter_indices(&columns, row_count, &spec)?;

    let count = out.len();
    *state.filtered_indices.write().map_err(|_| "lock error")? = out;
    *state.last_filter.write().map_err(|_| "lock error")? = Some(spec);
    if !quiet_logs {
        eprintln!(
            "[SC][Inspector][backend] op=filter ms={} rows={} filtered={} early_exit=false",
            t0.elapsed().as_millis(),
            scan_n,
            count
        );
    }
    Ok(count)
}

#[tauri::command(rename_all = "camelCase")]
pub fn inspector_query_multiple_csv(req: MultiCsvQueryRequest) -> Result<MultiCsvQueryResponse, String> {
    let mut dataset_results: Vec<MultiCsvDatasetResult> = Vec::with_capacity(req.datasets.len());
    let mut raw_rows: Vec<(String, Vec<String>, Vec<String>)> = Vec::new(); // (source, headers, row)

    for ds in req.datasets.iter() {
        let (headers, columns, _col_types, row_count) = match ds.kind.as_str() {
            "text" => {
                let text = ds
                    .text
                    .as_ref()
                    .ok_or_else(|| format!("dataset '{}' missing text payload", ds.label))?;
                load_csv_text_dataset(text, ds.has_headers)?
            }
            "path" => {
                let path = ds
                    .path
                    .as_ref()
                    .ok_or_else(|| format!("dataset '{}' missing path payload", ds.label))?;
                load_csv_path_dataset(path, ds.has_headers)?
            }
            other => return Err(format!("unsupported dataset kind: {other}")),
        };

        let idxs = filter_indices(&columns, row_count, &req.spec)?;
        dataset_results.push(MultiCsvDatasetResult {
            dataset_id: ds.dataset_id.clone(),
            label: ds.label.clone(),
            filtered: idxs.len(),
            total: row_count,
        });

        for &row_idx in idxs.iter() {
            let mut row: Vec<String> = Vec::with_capacity(headers.len());
            for c in 0..headers.len() {
                row.push(columns.get(c).and_then(|col| col.get(row_idx)).cloned().unwrap_or_default());
            }
            raw_rows.push((ds.label.clone(), headers.clone(), row));
        }
    }

    let mut union: Vec<String> = Vec::new();
    let mut seen: HashSet<String> = HashSet::new();
    for (_, headers, _) in raw_rows.iter() {
        for h in headers.iter() {
            if seen.insert(h.clone()) {
                union.push(h.clone());
            }
        }
    }
    let merged_headers = {
        let mut v = Vec::with_capacity(union.len() + 1);
        v.push("_source_file".to_string());
        v.extend(union.clone());
        v
    };

    let merged_rows: Vec<Vec<String>> = raw_rows
        .into_iter()
        .map(|(source, hdrs, row)| {
            let mut m = HashMap::<String, String>::with_capacity(hdrs.len());
            for (i, h) in hdrs.iter().enumerate() {
                m.insert(h.clone(), row.get(i).cloned().unwrap_or_default());
            }
            let mut out = vec![String::new(); merged_headers.len()];
            out[0] = source;
            for i in 1..merged_headers.len() {
                out[i] = m.get(&merged_headers[i]).cloned().unwrap_or_default();
            }
            out
        })
        .collect();

    Ok(MultiCsvQueryResponse {
        dataset_results,
        merged_headers,
        merged_rows,
    })
}

fn inspector_debug_log_path() -> std::path::PathBuf {
    std::env::temp_dir().join("structural-companion-inspector-debug.log")
}

#[tauri::command(rename_all = "camelCase")]
pub fn inspector_debug_log_clear() -> Result<String, String> {
    let p = inspector_debug_log_path();
    std::fs::write(&p, "").map_err(|e| e.to_string())?;
    Ok(p.to_string_lossy().to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub fn inspector_debug_log_batch(lines: Vec<String>) -> Result<String, String> {
    if lines.is_empty() {
        return Ok(inspector_debug_log_path().to_string_lossy().to_string());
    }
    let p = inspector_debug_log_path();
    let mut f = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&p)
        .map_err(|e| e.to_string())?;
    for line in lines {
        let ts = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_millis().to_string())
            .unwrap_or_else(|_| "0".to_string());
        let _ = writeln!(f, "{} {}", ts, line);
    }
    Ok(p.to_string_lossy().to_string())
}

/// Phase 8: server-side sort aligned with filtered_indices.
/// This mutates ONLY filtered_indices ordering and does not touch source columns.
#[tauri::command(rename_all = "camelCase")]
pub fn inspector_sort(state: State<'_, DataState>, spec: SortSpec) -> Result<(), String> {
    let t0 = Instant::now();
    let quiet_logs = *state.quiet_logs.read().map_err(|_| "lock error")?;
    let columns = state.columns.read().map_err(|_| "lock error")?;
    let col_types = state.col_types.read().map_err(|_| "lock error")?;
    let mut idxs = state.filtered_indices.write().map_err(|_| "lock error")?;

    if spec.col_idx >= columns.len() {
        return Err("sort column out of range".to_string());
    }
    let asc = spec.dir.to_lowercase() != "desc";
    let stable = spec.stable.unwrap_or(true);
    let col = &columns[spec.col_idx];
    let ctype = col_types.get(spec.col_idx).cloned().unwrap_or(ColType::String);

    // Provide deterministic ordering (and optional stability) by adding a tie-breaker.
    // If stable=true, preserve the current filtered order for equal keys.
    // If stable=false, tie-break by row index for deterministic but potentially different ordering.
    let pos_map: Option<std::collections::HashMap<usize, usize>> = if stable {
        let mut m = std::collections::HashMap::with_capacity(idxs.len().min(1_000_000));
        for (p, &row_idx) in idxs.iter().enumerate() {
            m.insert(row_idx, p);
        }
        Some(m)
    } else {
        None
    };

    idxs.sort_by(|&a, &b| {
        let va = col.get(a).map(|s| s.as_str()).unwrap_or("");
        let vb = col.get(b).map(|s| s.as_str()).unwrap_or("");

        // empty last for asc; first for desc
        let ea = va.trim().is_empty();
        let eb = vb.trim().is_empty();
        if ea != eb {
            return if asc {
                if ea { std::cmp::Ordering::Greater } else { std::cmp::Ordering::Less }
            } else {
                if ea { std::cmp::Ordering::Less } else { std::cmp::Ordering::Greater }
            };
        }

        // invalid numeric/date values should behave like empty (after valid for asc).
        let ord = match ctype {
            ColType::Numeric => {
                let na = parse_f64_relaxed(va);
                let nb = parse_f64_relaxed(vb);
                match (na, nb) {
                    (Some(a1), Some(b1)) => a1.partial_cmp(&b1).unwrap_or(std::cmp::Ordering::Equal),
                    (Some(_), None) => {
                        if asc { std::cmp::Ordering::Less } else { std::cmp::Ordering::Greater }
                    }
                    (None, Some(_)) => {
                        if asc { std::cmp::Ordering::Greater } else { std::cmp::Ordering::Less }
                    }
                    (None, None) => std::cmp::Ordering::Equal,
                }
            }
            ColType::Date => {
                let da = try_parse_date(va);
                let db = try_parse_date(vb);
                match (da, db) {
                    (Some(a1), Some(b1)) => a1.cmp(&b1),
                    (Some(_), None) => {
                        if asc { std::cmp::Ordering::Less } else { std::cmp::Ordering::Greater }
                    }
                    (None, Some(_)) => {
                        if asc { std::cmp::Ordering::Greater } else { std::cmp::Ordering::Less }
                    }
                    (None, None) => std::cmp::Ordering::Equal,
                }
            }
            ColType::String => va.to_lowercase().cmp(&vb.to_lowercase()),
        };

        let ord = if asc { ord } else { ord.reverse() };
        if ord != std::cmp::Ordering::Equal {
            return ord;
        }

        // Tie-breaker for determinism.
        if let Some(m) = &pos_map {
            let pa = m.get(&a).cloned().unwrap_or(0);
            let pb = m.get(&b).cloned().unwrap_or(0);
            pa.cmp(&pb)
        } else {
            a.cmp(&b)
        }
    });

    if !quiet_logs {
        eprintln!(
            "[SC][Inspector][backend] op=sort ms={} col={} dir={} rows={}",
            t0.elapsed().as_millis(),
            spec.col_idx,
            spec.dir,
            idxs.len()
        );
    }
    Ok(())
}

#[tauri::command(rename_all = "camelCase")]
pub fn inspector_get_row_slice(state: State<'_, DataState>, start: usize, end: usize, cols: Option<Vec<usize>>) -> Result<Vec<Vec<String>>, String> {
    let t0 = Instant::now();
    let quiet_logs = *state.quiet_logs.read().map_err(|_| "lock error")?;
    let columns = state.columns.read().map_err(|_| "lock error")?;
    let headers = state.headers.read().map_err(|_| "lock error")?;
    let idxs = state.filtered_indices.read().map_err(|_| "lock error")?;

    let actual_end = end.min(idxs.len());
    if start >= actual_end {
        return Ok(vec![]);
    }

    let use_cols: Vec<usize> = match cols {
        Some(v) if !v.is_empty() => v.into_iter().filter(|&i| i < headers.len()).collect(),
        _ => (0..headers.len()).collect(),
    };

    let mut out = Vec::with_capacity(actual_end - start);
    for i in start..actual_end {
        let row_idx = idxs[i];
        let mut row = Vec::with_capacity(use_cols.len());
        for &ci in use_cols.iter() {
            row.push(columns.get(ci).and_then(|c| c.get(row_idx)).cloned().unwrap_or_default());
        }
        out.push(row);
    }
    if !quiet_logs {
        eprintln!(
            "[SC][Inspector][backend] op=slice ms={} start={} end={} rows={} cols={}",
            t0.elapsed().as_millis(),
            start,
            actual_end,
            out.len(),
            use_cols.len()
        );
    }
    Ok(out)
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KeyValue {
    pub key: String,
    pub value: String,
}

#[tauri::command(rename_all = "camelCase")]
pub fn inspector_get_full_row_metadata(state: State<'_, DataState>, visual_idx: usize) -> Result<Vec<KeyValue>, String> {
    let idxs = state.filtered_indices.read().map_err(|_| "lock error")?;
    if visual_idx >= idxs.len() {
        return Err("row out of range".to_string());
    }
    let row_idx = idxs[visual_idx];
    let headers = state.headers.read().map_err(|_| "lock error")?;
    let columns = state.columns.read().map_err(|_| "lock error")?;
    let mut out = Vec::with_capacity(headers.len());
    for (i, h) in headers.iter().enumerate() {
        let v = columns.get(i).and_then(|c| c.get(row_idx)).cloned().unwrap_or_default();
        out.push(KeyValue { key: h.clone(), value: v });
    }
    Ok(out)
}

#[tauri::command(rename_all = "camelCase")]
pub fn inspector_explain_row(
    state: State<'_, DataState>,
    visual_idx: usize,
) -> Result<ExplainRowResponse, String> {
    let idxs = state.filtered_indices.read().map_err(|_| "lock error")?;
    if visual_idx >= idxs.len() {
        return Err("row out of range".to_string());
    }
    let row_idx = idxs[visual_idx];
    let spec = state
        .last_filter
        .read()
        .map_err(|_| "lock error")?
        .clone()
        .ok_or_else(|| "no active filter".to_string())?;
    drop(idxs);

    let columns = state.columns.read().map_err(|_| "lock error")?;
    let mut reasons: Vec<String> = Vec::new();
    let mut passes = true;

    if let Some(f) = &spec.numeric_filter {
        if f.enabled {
            if f.col_idx >= columns.len() {
                passes = false;
                reasons.push("Numeric filter target is out of range.".to_string());
            } else {
                let raw = columns[f.col_idx]
                    .get(row_idx)
                    .map(|s| s.trim())
                    .unwrap_or("");
                match parse_f64_relaxed(raw) {
                    Some(v) if v >= f.min && v <= f.max => {
                        reasons.push(format!("Numeric pass: {v} in [{}, {}].", f.min, f.max));
                    }
                    Some(v) => {
                        passes = false;
                        reasons.push(format!("Numeric fail: {v} outside [{}, {}].", f.min, f.max));
                    }
                    None => {
                        passes = false;
                        reasons.push("Numeric fail: value is not parseable as number.".to_string());
                    }
                }
            }
        }
    }

    if let Some(f) = &spec.date_filter {
        if f.enabled {
            if f.col_idx >= columns.len() {
                passes = false;
                reasons.push("Date filter target is out of range.".to_string());
            } else {
                let raw = columns[f.col_idx]
                    .get(row_idx)
                    .map(|s| s.trim())
                    .unwrap_or("");
                let v = try_parse_date(raw);
                let min_d = try_parse_date(&f.min_iso);
                let max_d = try_parse_date(&f.max_iso);
                match (v, min_d, max_d) {
                    (Some(d), Some(lo), Some(hi)) if d >= lo && d <= hi => {
                        reasons.push(format!("Date pass: {d} in [{lo}, {hi}]."));
                    }
                    (Some(d), Some(lo), Some(hi)) => {
                        passes = false;
                        reasons.push(format!("Date fail: {d} outside [{lo}, {hi}]."));
                    }
                    _ => {
                        passes = false;
                        reasons.push("Date fail: value or bounds are not parseable dates.".to_string());
                    }
                }
            }
        }
    }

    if let Some(f) = &spec.category_filter {
        if f.enabled && !f.selected.is_empty() {
            if f.col_idx >= columns.len() {
                passes = false;
                reasons.push("Category filter target is out of range.".to_string());
            } else {
                let raw = columns[f.col_idx]
                    .get(row_idx)
                    .map(|s| s.trim())
                    .unwrap_or("");
                let set: HashSet<&str> = f.selected.iter().map(|s| s.as_str()).collect();
                if set.contains(raw) {
                    reasons.push("Category pass: value is in selected set.".to_string());
                } else {
                    passes = false;
                    reasons.push("Category fail: value is not in selected set.".to_string());
                }
            }
        }
    }

    if !spec.query.trim().is_empty() {
        let mut matched = false;
        let q = spec.query.trim().to_string();
        let q_lower = q.to_lowercase();
        let compiled = if spec.match_mode == MatchMode::Regex {
            Some(Regex::new(&spec.query).map_err(|e| format!("Invalid regex: {e}"))?)
        } else {
            None
        };
        if let Some(ci) = spec.column_idx {
            if ci >= columns.len() {
                passes = false;
                reasons.push("Query filter target is out of range.".to_string());
            } else {
                let cell = columns[ci].get(row_idx).map(|s| s.as_str()).unwrap_or("");
                matched = match spec.match_mode {
                    MatchMode::Exact => cell.eq_ignore_ascii_case(&q),
                    MatchMode::Fuzzy => cell.to_lowercase().contains(&q_lower),
                    MatchMode::Regex => compiled
                        .as_ref()
                        .ok_or_else(|| "regex not compiled".to_string())?
                        .is_match(cell),
                };
            }
        } else {
            for c in columns.iter() {
                let cell = c.get(row_idx).map(|s| s.as_str()).unwrap_or("");
                let hit = match spec.match_mode {
                    MatchMode::Exact => cell.eq_ignore_ascii_case(&q),
                    MatchMode::Fuzzy => cell.to_lowercase().contains(&q_lower),
                    MatchMode::Regex => compiled
                        .as_ref()
                        .ok_or_else(|| "regex not compiled".to_string())?
                        .is_match(cell),
                };
                if hit {
                    matched = true;
                    break;
                }
            }
        }
        if matched {
            reasons.push("Query pass.".to_string());
        } else {
            passes = false;
            reasons.push("Query fail: no matching cell.".to_string());
        }
    } else {
        reasons.push("Query skipped: empty query.".to_string());
    }

    Ok(ExplainRowResponse {
        visual_idx,
        source_row_idx: row_idx,
        passes,
        reasons,
    })
}

/// Server-backed category value browser for Tier-2 category filters.
///
/// - Operates on the CURRENT filtered view (filtered_indices).
/// - Supports search + paging.
/// - Can cap scanning for responsiveness on massive datasets.
#[tauri::command(rename_all = "camelCase")]
pub fn inspector_get_category_values(
    state: State<'_, DataState>,
    req: CategoryValuesRequest,
) -> Result<CategoryValuesResponse, String> {
    let t0 = Instant::now();
    let quiet_logs = *state.quiet_logs.read().map_err(|_| "lock error")?;
    let headers = state.headers.read().map_err(|_| "lock error")?;
    if req.col_idx >= headers.len() {
        return Err("category column out of range".to_string());
    }

    let columns = state.columns.read().map_err(|_| "lock error")?;
    let idxs = state.filtered_indices.read().map_err(|_| "lock error")?;
    let col = columns
        .get(req.col_idx)
        .ok_or_else(|| "category column out of range".to_string())?;

    let total_rows_in_view = idxs.len();
    let scan_cap = req.max_rows_scan.unwrap_or(total_rows_in_view).min(total_rows_in_view);

    let needle = req.search.as_ref().map(|s| s.to_lowercase());
    let mut counts: HashMap<String, usize> = HashMap::new();

    // Scan a bounded number of rows from the current view.
    for &row_idx in idxs.iter().take(scan_cap) {
        let v = col.get(row_idx).map(|s| s.as_str()).unwrap_or("").trim();
        if v.is_empty() {
            continue;
        }
        if let Some(n) = &needle {
            if !v.to_lowercase().contains(n) {
                continue;
            }
        }
        *counts.entry(v.to_string()).or_insert(0) += 1;
    }

    let rows_scanned = scan_cap;
    let partial = rows_scanned < total_rows_in_view;

    // Sort: count desc, then value asc.
    let mut items: Vec<CategoryValueCount> = counts
        .into_iter()
        .map(|(value, count)| CategoryValueCount { value, count })
        .collect();

    items.sort_by(|a, b| {
        b.count
            .cmp(&a.count)
            .then_with(|| a.value.to_lowercase().cmp(&b.value.to_lowercase()))
    });

    let distinct_total = items.len();

    // Paging
    let limit = req.limit.clamp(1, 1000);
    let offset = req.offset.min(distinct_total);
    let end = (offset + limit).min(distinct_total);
    let values = items[offset..end].to_vec();

    Ok(CategoryValuesResponse {
        col_idx: req.col_idx,
        rows_scanned,
        total_rows_in_view,
        partial,
        distinct_total,
        offset,
        limit,
        values,
    })
    .map(|resp| {
        if !quiet_logs {
            eprintln!(
                "[SC][Inspector][backend] op=category ms={} col={} rows_scanned={} distinct={} returned={}",
                t0.elapsed().as_millis(),
                req.col_idx,
                resp.rows_scanned,
                resp.distinct_total,
                resp.values.len()
            );
        }
        resp
    })
}
