export type DatasetSource =
  | { kind: 'text'; text: string }
  | { kind: 'path'; path: string };

export type WorkspaceDataset = {
  id: string;
  label: string;
  hasHeaders: boolean;
  source: DatasetSource;
  rowCount?: number;
  colCount?: number;
  headerNames?: string[];
  filteredCount?: number;
};

export const hasLoadedDatasetSignals = (args: {
  hasLoaded: boolean;
  loadedDatasetsLength: number;
  activeDatasetId: string;
  datasetId: string;
  headersLength: number;
  totalRowCount: number;
}) =>
  args.hasLoaded ||
  args.loadedDatasetsLength > 0 ||
  Boolean(args.activeDatasetId) ||
  Boolean(args.datasetId) ||
  args.headersLength > 0 ||
  args.totalRowCount > 0;

export function isLikelyHeaderCell(s: string): boolean {
  const t = (s ?? '').trim();
  if (!t) return false;
  const hasAlpha = /[A-Za-z_]/.test(t);
  const isNum = /^[-+]?\d+(?:\.\d+)?$/.test(t.replace(/[,_]/g, ''));
  const isDate = /^\d{4}-\d{2}-\d{2}$/.test(t) || /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(t);
  return hasAlpha && !isNum && !isDate && t.length <= 64;
}

export function heuristicHasHeaders(first: string[], second: string[]): { decided: boolean; value: boolean; reason: string; confidence: number } {
  if (!first.length) return { decided: true, value: true, reason: 'Empty first record: defaulting to headers.', confidence: 0.5 };
  const n1 = first.length;
  const n2 = Math.max(1, second.length);
  const score1 = first.reduce((a, c) => a + (isLikelyHeaderCell(c) ? 1 : 0), 0) / Math.max(1, n1);
  const score2 = second.length ? second.reduce((a, c) => a + (isLikelyHeaderCell(c) ? 1 : 0), 0) / n2 : 0;
  const diff = score1 - score2;
  const reason = `Header score row1=${score1.toFixed(2)}, row2=${score2.toFixed(2)}, diff=${diff.toFixed(2)}`;
  
  // Calculate confidence based on score1 and diff
  let confidence = 0.5;
  if (score1 >= 0.75 && diff >= 0.15) {
    confidence = Math.min(0.95, 0.7 + (diff * 0.5));
    return { decided: true, value: true, reason, confidence };
  }
  if (score1 <= 0.25 && diff <= -0.05) {
    confidence = Math.min(0.95, 0.7 + (Math.abs(diff) * 0.5));
    return { decided: true, value: false, reason, confidence };
  }
  
  // Moderate scores - calculate confidence based on proximity to thresholds
  if (score1 >= 0.5) {
    confidence = 0.5 + (score1 - 0.5) * 0.5;
  } else {
    confidence = 0.5 - (0.5 - score1) * 0.5;
  }
  
  return { decided: false, value: score1 > 0.5, reason, confidence };
}

export function computeDatasetIdentity(source: string, hdrs: string[], rowCount: number, hashFn: (s: string) => string) {
  const base = `${source}\n${rowCount}\n${(hdrs ?? []).join('|')}`;
  const id = `ds_${hashFn(base)}`;
  
  // Extract a meaningful label from the source
  let label = source || 'Unknown File';
  
  // If source is a path, extract filename
  if (label.includes('/')) {
    label = label.split('/').pop() || label;
  }
  if (label.includes('\\')) {
    label = label.split('\\').pop() || label;
  }
  
  // If source starts with "text:", use row count as identifier
  if (source.startsWith('text:')) {
    label = `CSV Data (${rowCount} rows)`;
  }
  
  // If source starts with "path:", extract filename
  if (source.startsWith('path:')) {
    const pathPart = source.replace('path:', '');
    const parts = pathPart.split(/[/\\]/);
    label = parts[parts.length - 1] || `File (${rowCount} rows)`;
  }
  
  // Truncate if too long
  if (label.length > 80) {
    label = label.slice(0, 77) + '…';
  }
  
  return { id, label };
}

export function upsertWorkspaceDataset(list: WorkspaceDataset[], ds: WorkspaceDataset) {
  const curr = [...(list ?? [])];
  const at = curr.findIndex((x) => x.id === ds.id);
  if (at >= 0) curr[at] = ds;
  else curr.push(ds);
  return curr;
}
