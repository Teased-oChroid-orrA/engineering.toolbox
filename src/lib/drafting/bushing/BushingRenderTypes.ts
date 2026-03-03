export type BushingRenderDiagnostic = {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
};
