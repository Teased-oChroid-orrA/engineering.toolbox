use nalgebra::{Matrix3, Vector3};
use nalgebra::linalg::SymmetricEigen;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct Point3D {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct ReferenceFrame {
    pub origin: Point3D,
    pub axis_x: Point3D,
    pub axis_y: Point3D,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OffsetIntersectionResult {
    pub point: Point3D,
    pub skew_distance: f64,
    pub plane_normal: Point3D,
}

fn v(p: Point3D) -> Vector3<f64> {
    Vector3::new(p.x, p.y, p.z)
}

fn p(v: Vector3<f64>) -> Point3D {
    Point3D {
        x: v.x,
        y: v.y,
        z: v.z,
    }
}

/// Returns (p_closest_on_L1, p_closest_on_L2).
/// Lines are L1: a + s*u and L2: c + t*v.
fn closest_points_between_lines(
    a: Vector3<f64>,
    u: Vector3<f64>,
    c: Vector3<f64>,
    v: Vector3<f64>,
) -> (Vector3<f64>, Vector3<f64>) {
    // Based on standard least-squares solution.
    let w0 = a - c;
    let a_dot = u.dot(&u);
    let b_dot = u.dot(&v);
    let c_dot = v.dot(&v);
    let d_dot = u.dot(&w0);
    let e_dot = v.dot(&w0);

    let denom = a_dot * c_dot - b_dot * b_dot;

    // If denom ~ 0 => nearly parallel; fall back to projecting one endpoint.
    if denom.abs() < 1e-12 {
        let t = if c_dot.abs() < 1e-12 { 0.0 } else { e_dot / c_dot };
        let p2 = c + v * t;
        // s from projecting p2 onto L1
        let s = if a_dot.abs() < 1e-12 {
            0.0
        } else {
            u.dot(&(p2 - a)) / a_dot
        };
        let p1 = a + u * s;
        return (p1, p2);
    }

    let s = (b_dot * e_dot - c_dot * d_dot) / denom;
    let t = (a_dot * e_dot - b_dot * d_dot) / denom;

    (a + u * s, c + v * t)
}

#[tauri::command(rename_all = "camelCase")]
pub fn surface_calc_offset_intersection(
    p1_a: Point3D,
    p1_b: Point3D,
    p2_a: Point3D,
    p2_b: Point3D,
    offset_dist: f64,
    direction_ref: Point3D,
) -> Result<OffsetIntersectionResult, String> {
    if !offset_dist.is_finite() {
        return Err("offset_dist must be finite".into());
    }

    let a = v(p1_a);
    let b = v(p1_b);
    let c = v(p2_a);
    let d = v(p2_b);
    let r = v(direction_ref);

    let d1 = b - a;
    let d2 = d - c;
    if d1.norm() < 1e-12 || d2.norm() < 1e-12 {
        return Err("line endpoints must be distinct".into());
    }

    let u = d1.normalize();
    let v2 = d2.normalize();

    let n_raw = u.cross(&v2);
    if n_raw.norm() < 1e-10 {
        return Err("lines are parallel or nearly parallel; cannot define plane normal".into());
    }
    let n = n_raw.normalize();

    // In-plane, perpendicular offsets for each line.
    // offset_dir is perpendicular to line direction and lies in the plane.
    let off1_dir = n.cross(&u).normalize();
    let off2_dir = n.cross(&v2).normalize();

    // Pick direction that moves toward the reference point.
    let pick_dir = |base: Vector3<f64>, dir: Vector3<f64>| {
        let plus = base + dir;
        let minus = base - dir;
        if (plus - r).norm_squared() < (minus - r).norm_squared() {
            dir
        } else {
            -dir
        }
    };

    let o1 = pick_dir(a, off1_dir) * offset_dist;
    let o2 = pick_dir(c, off2_dir) * offset_dist;

    let a1 = a + o1;
    let b1 = b + o1;
    let c1 = c + o2;
    let d1p = d + o2;

    let u1 = (b1 - a1).normalize();
    let v1 = (d1p - c1).normalize();

    let (q1, q2) = closest_points_between_lines(a1, u1, c1, v1);
    let mid = (q1 + q2) * 0.5;
    let skew = (q1 - q2).norm();

    Ok(OffsetIntersectionResult {
        point: p(mid),
        skew_distance: skew,
        plane_normal: p(n),
    })
}

#[tauri::command(rename_all = "camelCase")]
pub fn surface_profile_cut(
    points: Vec<Point3D>,
    lines: Vec<[usize; 2]>,
    axis: String,
    plane_val: f64,
) -> Result<Vec<Point3D>, String> {
    let axis = axis.to_lowercase();
    if axis != "x" && axis != "y" && axis != "z" {
        return Err("axis must be 'x', 'y', or 'z'".into());
    }
    if !plane_val.is_finite() {
        return Err("plane_val must be finite".into());
    }

    let get_axis = |p: &Point3D| match axis.as_str() {
        "x" => p.x,
        "y" => p.y,
        _ => p.z,
    };

    let mut out: Vec<Point3D> = Vec::new();

    for [i0, i1] in lines {
        if i0 >= points.len() || i1 >= points.len() {
            continue;
        }
        let p0 = points[i0];
        let p1 = points[i1];
        let v0 = get_axis(&p0);
        let v1 = get_axis(&p1);

        // Segment straddles plane (inclusive).
        if (v0 <= plane_val && v1 >= plane_val) || (v0 >= plane_val && v1 <= plane_val) {
            let denom = v1 - v0;
            if denom.abs() < 1e-12 {
                continue;
            }
            let t = (plane_val - v0) / denom;
            if !(0.0..=1.0).contains(&t) {
                continue;
            }
            out.push(Point3D {
                x: p0.x + t * (p1.x - p0.x),
                y: p0.y + t * (p1.y - p0.y),
                z: p0.z + t * (p1.z - p0.z),
            });
        }
    }

    Ok(out)
}

#[tauri::command(rename_all = "camelCase")]
pub fn surface_transform_to_lcs(points: Vec<Point3D>, frame: ReferenceFrame) -> Result<Vec<Point3D>, String> {
    let o = v(frame.origin);
    let x_raw = v(frame.axis_x);
    let y_raw = v(frame.axis_y);
    if x_raw.norm() < 1e-12 || y_raw.norm() < 1e-12 {
        return Err("axis vectors must be non-zero".into());
    }

    let x = x_raw.normalize();
    let z_raw = x.cross(&y_raw);
    if z_raw.norm() < 1e-12 {
        return Err("axis_x and axis_y must not be colinear".into());
    }
    let z = z_raw.normalize();
    let y = z.cross(&x).normalize();

    // Rotation matrix whose columns are the LCS axes expressed in global coordinates.
    // To express a global point in LCS: p_lcs = R^T * (p_global - origin).
    let r_mat = nalgebra::Matrix3::from_columns(&[x, y, z]);
    let rt = r_mat.transpose();

    let mut out = Vec::with_capacity(points.len());
    for pt in points {
        let vg = v(pt) - o;
        let vl = rt * vg;
        out.push(p(vl));
    }
    Ok(out)
}


// -----------------------------
// Surface evaluation utilities
// -----------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlaneFitResult {
    pub centroid: Point3D,
    pub normal: Point3D, // unit
    pub rms: f64,
    pub mean_abs: f64,
    pub max_abs: f64,
    pub p95_abs: f64,
    pub sigma: f64,
    pub signed_distances: Vec<f64>,
    pub outlier_indices: Vec<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SliceBinStat {
    pub station: f64,
    pub n: usize,
    pub rms: f64,
    pub p95_abs: f64,
    pub max_abs: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SliceEvalResult {
    pub axis: String,
    pub min: f64,
    pub max: f64,
    pub slices: Vec<SliceBinStat>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CylinderFitResult {
    pub axis_point: Point3D,
    pub axis_dir: Point3D, // unit
    pub radius: f64,
    pub rms: f64,
    pub mean_abs: f64,
    pub max_abs: f64,
    pub p95_abs: f64,
    pub sigma: f64,
    pub abs_distances: Vec<f64>,
    pub outlier_indices: Vec<usize>,
}

// Compute p95 of absolute values (expects finite numbers).
fn p95_abs(vals: &[f64]) -> f64 {
    if vals.is_empty() {
        return 0.0;
    }
    let mut v: Vec<f64> = vals.iter().map(|x| x.abs()).collect();
    v.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let idx = ((v.len() as f64 - 1.0) * 0.95).round() as usize;
    v[idx.min(v.len() - 1)]
}

fn mean(vals: &[f64]) -> f64 {
    if vals.is_empty() {
        return 0.0;
    }
    vals.iter().sum::<f64>() / (vals.len() as f64)
}

fn rms(vals: &[f64]) -> f64 {
    if vals.is_empty() {
        return 0.0;
    }
    let m = vals.iter().map(|x| x * x).sum::<f64>() / (vals.len() as f64);
    m.sqrt()
}

fn sigma(vals: &[f64]) -> f64 {
    if vals.len() < 2 {
        return 0.0;
    }
    let mu = mean(vals);
    let var = vals.iter().map(|x| (x - mu) * (x - mu)).sum::<f64>() / ((vals.len() - 1) as f64);
    var.sqrt()
}

fn outliers_from_abs(absd: &[f64], tol: f64, sigma_mult: f64, max_outliers: usize) -> Vec<usize> {
    if absd.is_empty() {
        return vec![];
    }
    let thr = if tol.is_finite() && tol > 0.0 {
        tol
    } else {
        let s = sigma(absd);
        (sigma_mult.max(0.0)) * s
    };
    let mut idxs: Vec<(usize, f64)> = absd
        .iter()
        .enumerate()
        .filter_map(|(i, &d)| if d.is_finite() && d.abs() > thr { Some((i, d.abs())) } else { None })
        .collect();
    idxs.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    idxs.into_iter().take(max_outliers.max(1)).map(|x| x.0).collect()
}

// Best-fit plane via PCA: normal = eigenvector of smallest eigenvalue of covariance.
#[tauri::command(rename_all = "camelCase")]
pub fn surface_eval_best_fit_plane(
    points: Vec<Point3D>,
    tol: f64,
    sigma_mult: f64,
    max_outliers: usize,
) -> Result<PlaneFitResult, String> {
    if points.len() < 3 {
        return Err("Need at least 3 points".into());
    }
    let mut cx = 0.0;
    let mut cy = 0.0;
    let mut cz = 0.0;
    for p in &points {
        cx += p.x;
        cy += p.y;
        cz += p.z;
    }
    let n = points.len() as f64;
    cx /= n;
    cy /= n;
    cz /= n;
    let centroid = Point3D { x: cx, y: cy, z: cz };

    // covariance
    let mut c = Matrix3::<f64>::zeros();
    for p0 in &points {
        let x = p0.x - cx;
        let y = p0.y - cy;
        let z = p0.z - cz;
        c[(0, 0)] += x * x;
        c[(0, 1)] += x * y;
        c[(0, 2)] += x * z;
        c[(1, 1)] += y * y;
        c[(1, 2)] += y * z;
        c[(2, 2)] += z * z;
    }
    c[(1, 0)] = c[(0, 1)];
    c[(2, 0)] = c[(0, 2)];
    c[(2, 1)] = c[(1, 2)];
    c /= n.max(1.0);

    let eig = SymmetricEigen::new(c);
    // eigenvalues in ascending? not guaranteed. Find smallest eigenvalue index.
    let mut min_i = 0usize;
    let mut min_v = eig.eigenvalues[0];
    for i in 1..3 {
        if eig.eigenvalues[i] < min_v {
            min_v = eig.eigenvalues[i];
            min_i = i;
        }
    }
    let normal_v = eig.eigenvectors.column(min_i).normalize();
    let normal = p(normal_v);

    let mut signed = Vec::with_capacity(points.len());
    let mut absd = Vec::with_capacity(points.len());
    for p0 in &points {
        let d = (p0.x - cx) * normal_v.x + (p0.y - cy) * normal_v.y + (p0.z - cz) * normal_v.z;
        signed.push(d);
        absd.push(d.abs());
    }

    let rms_v = rms(&signed);
    let mean_abs_v = mean(&absd);
    let max_abs_v = absd
        .iter()
        .copied()
        .fold(0.0_f64, |a, b| if b.is_finite() { a.max(b) } else { a });
    let p95_v = p95_abs(&signed);
    let sig = sigma(&absd);

    let outlier_indices = outliers_from_abs(&absd, tol, sigma_mult, max_outliers);

    Ok(PlaneFitResult {
        centroid,
        normal,
        rms: rms_v,
        mean_abs: mean_abs_v,
        max_abs: max_abs_v,
        p95_abs: p95_v,
        sigma: sig,
        signed_distances: signed,
        outlier_indices,
    })
}

// Section slices along an axis with stats of plane residuals in each bin.
#[tauri::command(rename_all = "camelCase")]
pub fn surface_eval_section_slices(
    points: Vec<Point3D>,
    axis: String,
    bins: usize,
    thickness: f64,
) -> Result<SliceEvalResult, String> {
    if points.len() < 3 {
        return Err("Need at least 3 points".into());
    }
    let st = bins.clamp(2, 500);
    // Fit a global plane once and measure signed distances.
    let plane = surface_eval_best_fit_plane(points.clone(), 0.0, 3.0, 50)?;
    let signed = plane.signed_distances;

    let ax = axis.to_lowercase();
    let coord = |p: &Point3D| -> f64 {
        match ax.as_str() {
            "y" => p.y,
            "z" => p.z,
            _ => p.x,
        }
    };

    let mut mn = coord(&points[0]);
    let mut mx = mn;
    for p in &points[1..] {
        let c = coord(p);
        if c < mn { mn = c; }
        if c > mx { mx = c; }
    }
    if !mn.is_finite() || !mx.is_finite() || (mx - mn).abs() < 1e-12 {
        return Err("Invalid axis span".into());
    }

    let span = mx - mn;
    let bin_w = if thickness.is_finite() && thickness > 0.0 {
        thickness
    } else {
        span / (st as f64)
    };

    // build bins centered at mn + (i+0.5)*bin_w
    let mut bins: Vec<Vec<f64>> = vec![Vec::new(); st];
    let mut centers: Vec<f64> = Vec::with_capacity(st);
    for i in 0..st {
        centers.push(mn + (i as f64 + 0.5) * bin_w);
    }

    for (i, p0) in points.iter().enumerate() {
        let c = coord(p0);
        let mut bi = ((c - mn) / bin_w).floor() as isize;
        if bi < 0 { bi = 0; }
        if bi as usize >= st { bi = (st - 1) as isize; }
        bins[bi as usize].push(signed[i]);
    }

    let mut slices = Vec::with_capacity(st);
    for i in 0..st {
        let vals = &bins[i];
        if vals.is_empty() {
            slices.push(SliceBinStat { station: centers[i], n: 0, rms: 0.0, p95_abs: 0.0, max_abs: 0.0 });
            continue;
        }
        let absd: Vec<f64> = vals.iter().map(|x| x.abs()).collect();
        let max_abs_v = absd
            .iter()
            .copied()
            .fold(0.0_f64, |a, b| if b.is_finite() { a.max(b) } else { a });
        slices.push(SliceBinStat {
            station: centers[i],
            n: vals.len(),
            rms: rms(vals),
            p95_abs: p95_abs(vals),
            max_abs: max_abs_v,
        });
    }

    Ok(SliceEvalResult { axis: ax, min: mn, max: mx, slices })
}

// Best-fit cylinder using PCA axis init and circle fit in perpendicular plane.
#[tauri::command(rename_all = "camelCase")]
pub fn surface_eval_best_fit_cylinder(
    points: Vec<Point3D>,
    tol: f64,
    sigma_mult: f64,
    max_outliers: usize,
) -> Result<CylinderFitResult, String> {
    if points.len() < 6 {
        return Err("Need at least 6 points for cylinder fit".into());
    }

    // centroid
    let mut cx = 0.0;
    let mut cy = 0.0;
    let mut cz = 0.0;
    for p0 in &points {
        cx += p0.x; cy += p0.y; cz += p0.z;
    }
    let n = points.len() as f64;
    cx /= n; cy /= n; cz /= n;
    let cpt = Vector3::new(cx, cy, cz);

    // covariance for axis direction guess (largest eigenvalue)
    let mut cov = Matrix3::<f64>::zeros();
    for p0 in &points {
        let x = p0.x - cx;
        let y = p0.y - cy;
        let z = p0.z - cz;
        cov[(0,0)] += x*x; cov[(0,1)] += x*y; cov[(0,2)] += x*z;
        cov[(1,1)] += y*y; cov[(1,2)] += y*z;
        cov[(2,2)] += z*z;
    }
    cov[(1,0)] = cov[(0,1)];
    cov[(2,0)] = cov[(0,2)];
    cov[(2,1)] = cov[(1,2)];
    cov /= n.max(1.0);

    let eig = SymmetricEigen::new(cov);
    let mut max_i = 0usize;
    let mut max_v = eig.eigenvalues[0];
    for i in 1..3 {
        if eig.eigenvalues[i] > max_v {
            max_v = eig.eigenvalues[i];
            max_i = i;
        }
    }
    let axis = eig.eigenvectors.column(max_i).normalize();

    // Build orthonormal basis u,v perpendicular to axis.
    let mut tmp = Vector3::new(1.0, 0.0, 0.0);
    if axis.cross(&tmp).norm() < 1e-8 {
        tmp = Vector3::new(0.0, 1.0, 0.0);
    }
    let u = axis.cross(&tmp).normalize();
    let v2 = axis.cross(&u).normalize();

    // Project points to 2D (u,v) in plane perpendicular to axis (after removing component along axis).
    let mut xs = Vec::with_capacity(points.len());
    let mut ys = Vec::with_capacity(points.len());
    for p0 in &points {
        let pv = Vector3::new(p0.x, p0.y, p0.z) - cpt;
        let t = pv.dot(&axis);
        let perp = pv - axis * t;
        xs.push(perp.dot(&u));
        ys.push(perp.dot(&v2));
    }

    // Circle fit (Kasa): solve A*[a,b,c]^T = b where b = x^2+y^2 and A = [2x,2y,1]
    let mut ata = Matrix3::<f64>::zeros();
    let mut atb = Vector3::<f64>::zeros();
    for (&x, &y) in xs.iter().zip(ys.iter()) {
        let a1 = 2.0 * x;
        let a2 = 2.0 * y;
        let b = x * x + y * y;
        ata[(0,0)] += a1*a1;
        ata[(0,1)] += a1*a2;
        ata[(0,2)] += a1;
        ata[(1,1)] += a2*a2;
        ata[(1,2)] += a2;
        ata[(2,2)] += 1.0;

        atb[0] += a1 * b;
        atb[1] += a2 * b;
        atb[2] += b;
    }
    ata[(1,0)] = ata[(0,1)];
    ata[(2,0)] = ata[(0,2)];
    ata[(2,1)] = ata[(1,2)];

    let sol = ata
        .try_inverse()
        .ok_or_else(|| "Cylinder fit failed (singular circle system)".to_string())?
        * atb;

    let a = sol[0];
    let b = sol[1];
    let c = sol[2];
    let r2 = a*a + b*b + c;
    if !r2.is_finite() || r2 <= 0.0 {
        return Err("Cylinder fit produced invalid radius".into());
    }
    let radius = r2.sqrt();

    let mut absd = Vec::with_capacity(points.len());
    for (&x, &y) in xs.iter().zip(ys.iter()) {
        let rr = ((x - a).powi(2) + (y - b).powi(2)).sqrt();
        absd.push((rr - radius).abs());
    }

    let rms_v = rms(&absd);
    let mean_abs_v = mean(&absd);
    let max_abs_v = absd
        .iter()
        .copied()
        .fold(0.0_f64, |m, v| if v.is_finite() { m.max(v) } else { m });
    let p95_v = p95_abs(&absd);
    let sig = sigma(&absd);

    let outlier_indices = outliers_from_abs(&absd, tol, sigma_mult, max_outliers);

    Ok(CylinderFitResult {
        axis_point: Point3D { x: cx, y: cy, z: cz },
        axis_dir: p(axis),
        radius,
        rms: rms_v,
        mean_abs: mean_abs_v,
        max_abs: max_abs_v,
        p95_abs: p95_v,
        sigma: sig,
        abs_distances: absd,
        outlier_indices,
    })
}

// Minimal STEP/AP2xx point extractor: returns all CARTESIAN_POINT triples found.
// This is intentionally a "point cloud" import (no topology).
#[tauri::command(rename_all = "camelCase")]


fn parse_step_points_from_text(text: &str, max_points: usize) -> Result<Vec<Point3D>, String> {
    let mut out = Vec::new();
    let lim = max_points.max(1);

    // Example: #12=CARTESIAN_POINT('',(1.0,2.0,3.0));
    // Also handle D exponent (1.0D+03).
    let re = regex::Regex::new(r"(?i)CARTESIAN_POINT\s*\([^,]*,\s*\(\s*([^\)]+)\s*\)\s*\)")
        .map_err(|e| e.to_string())?;
    for cap in re.captures_iter(text) {
        if out.len() >= lim { break; }
        let nums = cap.get(1).unwrap().as_str();
        let parts: Vec<&str> = nums.split(',').map(|s| s.trim()).collect();
        if parts.len() < 3 { continue; }
        let parse = |s: &str| -> Result<f64, String> {
            let s2 = s.replace('D', "E").replace('d', "E");
            s2.parse::<f64>()
                .map_err(|_| format!("Failed to parse STEP coordinate: '{s}'"))
        };
        let x = parse(parts[0])?;
        let y = parse(parts[1])?;
        let z = parse(parts[2])?;
        out.push(Point3D { x, y, z });
    }
    if out.is_empty() {
        return Err("No CARTESIAN_POINT entries found in STEP file".into());
    }
    Ok(out)
}

/// Import STEP AP203/AP214/AP242 files by extracting CARTESIAN_POINT coordinates as a
/// "point cloud" import (no topology).
///
/// This variant accepts STEP text directly (useful for browser file inputs).
#[tauri::command(rename_all = "camelCase")]
pub fn surface_import_step_text(step_text: String, max_points: Option<usize>) -> Result<Vec<Point3D>, String> {
    let lim = max_points.unwrap_or(200_000);
    parse_step_points_from_text(&step_text, lim)
}

/// Import STEP from a filesystem path by extracting CARTESIAN_POINT coordinates as a
/// "point cloud" import (no topology).
///
/// Note: prefer `surface_import_step_text` for webview/browser file inputs.
#[tauri::command(rename_all = "camelCase")]
pub fn surface_import_step_points(path: String, max_points: Option<usize>) -> Result<Vec<Point3D>, String> {
    let text = std::fs::read_to_string(&path).map_err(|e| format!("Failed to read STEP: {e}"))?;
    let lim = max_points.unwrap_or(200_000);
    parse_step_points_from_text(&text, lim)
}
