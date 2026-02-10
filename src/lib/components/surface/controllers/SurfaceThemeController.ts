export const SURFACE_TECH_LAB_THEME = {
  typography: {
    display: 'var(--surface-font-display)',
    data: 'var(--surface-font-data)'
  },
  colors: {
    panel: 'var(--surface-lab-panel)',
    panelBorder: 'var(--surface-lab-panel-border)',
    accent: 'var(--surface-lab-accent)',
    accentStrong: 'var(--surface-lab-accent-strong)',
    metric: 'var(--surface-lab-metric)'
  }
} as const;

export const SURFACE_MOTION_SPEC = {
  fastMs: 180,
  standardMs: 220,
  deliberateMs: 300,
  easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)'
} as const;

export function motionMs(kind: 'fast' | 'standard' | 'deliberate') {
  if (kind === 'fast') return SURFACE_MOTION_SPEC.fastMs;
  if (kind === 'deliberate') return SURFACE_MOTION_SPEC.deliberateMs;
  return SURFACE_MOTION_SPEC.standardMs;
}
