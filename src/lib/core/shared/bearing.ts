export type BearingSegment = {
  d_top: number;
  d_bottom: number;
  height: number;
  // Optional: efficiency override. If omitted, cylinders default to 1.0, frustums to 0.35.
  eta?: number;
  // Optional: 'parent' vs 'doubler' etc (sequencing thickness uses parent segments)
  role?: string;
};

export type BearingSegmentResult = BearingSegment & {
  eta: number;
  rawArea: number;
  effectiveArea: number;
  geometry: 'CYLINDER' | 'FRUSTUM';
};

export type BearingProfileResult = {
  segments: BearingSegmentResult[];
  totalEffArea: number;
  totalHeight: number;
  refD: number;
  t_eff: number;
  t_eff_bearing: number;
  t_eff_sequence: number;
  isKnifeEdge: boolean;
};

// Ported from legacy: converts a bearing surface profile into a universal effective thickness.
export function calculateUniversalBearing(profile: BearingSegment[]): BearingProfileResult {
  if (!profile || profile.length === 0) {
    return {
      segments: [],
      totalEffArea: 0,
      totalHeight: 0,
      refD: 0,
      t_eff: 0,
      t_eff_bearing: 0,
      t_eff_sequence: 0,
      isKnifeEdge: false
    };
  }

  const results: BearingSegmentResult[] = profile.map((segment) => {
    const isCyl = Math.abs(segment.d_top - segment.d_bottom) < 1e-6;
    const autoEta = isCyl ? 1.0 : 0.35;
    const eta = typeof segment.eta === 'number' ? segment.eta : autoEta;
    const rawArea = segment.height * (segment.d_top + segment.d_bottom) / 2;
    const effectiveArea = rawArea * eta;
    return {
      ...segment,
      eta,
      rawArea,
      effectiveArea,
      geometry: isCyl ? 'CYLINDER' : 'FRUSTUM'
    };
  });

  const totalEffArea = results.reduce((s, r) => s + r.effectiveArea, 0);
  const totalHeight = results.reduce((s, r) => s + r.height, 0);
  const refD = Math.max(...results.map((r) => Math.max(r.d_top, r.d_bottom)));
  const t_eff = refD > 0 ? totalEffArea / refD : 0;

  const parentSegments = results.filter((s) => (s.role || 'parent') === 'parent');
  const t_eff_sequence = parentSegments.reduce((sum, s) => sum + s.height * s.eta, 0);

  const cylindricalHeight = results
    .filter((r) => r.geometry === 'CYLINDER' && r.eta >= 0.9)
    .reduce((s, r) => s + r.height, 0);
  const isKnifeEdge = totalHeight > 0 && cylindricalHeight / totalHeight < 0.4;

  return {
    segments: results,
    totalEffArea,
    totalHeight,
    refD,
    t_eff,
    t_eff_bearing: t_eff,
    t_eff_sequence,
    isKnifeEdge
  };
}
