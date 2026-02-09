import type { ColType } from '$lib/components/inspector/InspectorSchemaController';
import { fmtDate, parseDateRelaxed, parseF64Relaxed } from '$lib/components/inspector/InspectorSchemaController';

export type DrawerKV = { key: string; value: string; idx: number | null; type: ColType | null };

export async function loadRowDrawerData(args: {
  invoke: (cmd: string, payload?: any) => Promise<any>;
  visualIdx: number;
  headers: string[];
  colTypes: ColType[];
}) {
  const kvs = (await args.invoke('inspector_get_full_row_metadata', { visualIdx: args.visualIdx })) as { key: string; value: string }[];
  const m = new Map<string, number>();
  for (let i = 0; i < (args.headers ?? []).length; i++) m.set(args.headers[i] ?? String(i), i);
  const drawerKVs: DrawerKV[] = Array.isArray(kvs)
    ? kvs.map((kv) => {
        const idx = m.get(kv.key) ?? null;
        const t = idx != null ? (args.colTypes?.[idx] ?? 'string') : null;
        return { key: kv.key, value: kv.value, idx, type: t };
      })
    : [];
  let drawerExplain: { passes: boolean; reasons: string[]; sourceRowIdx: number } | null = null;
  try {
    const ex = (await args.invoke('inspector_explain_row', { visualIdx: args.visualIdx })) as {
      passes: boolean;
      reasons: string[];
      sourceRowIdx: number;
    };
    drawerExplain = {
      passes: !!ex?.passes,
      reasons: Array.isArray(ex?.reasons) ? ex.reasons : [],
      sourceRowIdx: typeof ex?.sourceRowIdx === 'number' ? ex.sourceRowIdx : -1
    };
  } catch {
    drawerExplain = null;
  }
  return { drawerKVs, drawerExplain };
}

export async function copyDrawerAsJson(kvs: DrawerKV[]) {
  const obj: Record<string, string> = {};
  for (const kv of kvs) obj[kv.key] = kv.value;
  await navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
}

export function applyDrawerNumericExact(value: string) {
  const n = parseF64Relaxed(value);
  if (n == null) return null;
  return String(n);
}

export function applyDrawerDateExact(value: string) {
  const ts = parseDateRelaxed(value);
  if (ts == null) return null;
  return fmtDate(ts);
}
