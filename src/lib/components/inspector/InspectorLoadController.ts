export type DatasetSource =
  | { kind: 'text'; text: string }
  | { kind: 'path'; path: string };

export type WorkspaceDataset = {
  id: string;
  label: string;
  hasHeaders: boolean;
  source: DatasetSource;
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

export function heuristicHasHeaders(first: string[], second: string[]): { decided: boolean; value: boolean; reason: string } {
  if (!first.length) return { decided: true, value: true, reason: 'Empty first record: defaulting to headers.' };
  const n1 = first.length;
  const n2 = Math.max(1, second.length);
  const score1 = first.reduce((a, c) => a + (isLikelyHeaderCell(c) ? 1 : 0), 0) / Math.max(1, n1);
  const score2 = second.length ? second.reduce((a, c) => a + (isLikelyHeaderCell(c) ? 1 : 0), 0) / n2 : 0;
  const diff = score1 - score2;
  const reason = `Header score row1=${score1.toFixed(2)}, row2=${score2.toFixed(2)}, diff=${diff.toFixed(2)}`;
  if (score1 >= 0.75 && diff >= 0.15) return { decided: true, value: true, reason };
  if (score1 <= 0.25 && diff <= -0.05) return { decided: true, value: false, reason };
  return { decided: false, value: true, reason };
}

export function computeDatasetIdentity(source: string, hdrs: string[], rowCount: number, hashFn: (s: string) => string) {
  const base = `${source}\n${rowCount}\n${(hdrs ?? []).join('|')}`;
  const id = `ds_${hashFn(base)}`;
  const label = source.length > 80 ? source.slice(0, 77) + '…' : source;
  return { id, label };
}

export function upsertWorkspaceDataset(list: WorkspaceDataset[], ds: WorkspaceDataset) {
  const curr = [...(list ?? [])];
  const at = curr.findIndex((x) => x.id === ds.id);
  if (at >= 0) curr[at] = ds;
  else curr.push(ds);
  return curr;
}
