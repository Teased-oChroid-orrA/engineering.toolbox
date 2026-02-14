import { newMultiQueryClause } from './InspectorMultiQueryController';
import { type MultiQueryClause } from './InspectorStateTypes';

type MultiQueryCtx = {
  clauses: MultiQueryClause[];
  setClauses: (next: MultiQueryClause[]) => void;
  setExpanded: (v: boolean) => void;
  setEnabled: (v: boolean) => void;
  scheduleFilter: (reason: string) => void;
};

export function addMultiQueryClause(ctx: MultiQueryCtx): void {
  ctx.setClauses([...ctx.clauses, newMultiQueryClause(ctx.clauses.length)]);
  ctx.setExpanded(true);
  ctx.scheduleFilter('multi-query-add');
}

export function removeMultiQueryClause(ctx: MultiQueryCtx, id: string): void {
  const next = ctx.clauses.filter((c) => c.id !== id);
  ctx.setClauses(next.length ? next : [newMultiQueryClause(0)]);
  ctx.scheduleFilter('multi-query-remove');
}

export function updateMultiQueryClause(
  ctx: MultiQueryCtx,
  id: string,
  patch: Partial<MultiQueryClause>
): void {
  ctx.setClauses(ctx.clauses.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  ctx.scheduleFilter('multi-query-update');
}

export function setMultiQueryEnabled(ctx: MultiQueryCtx, enabled: boolean): void {
  ctx.setEnabled(enabled);
  if (!enabled) ctx.setExpanded(false);
  ctx.scheduleFilter('multi-query-toggle');
}

export function setMultiQueryExpanded(ctx: MultiQueryCtx, expanded: boolean): void {
  ctx.setExpanded(expanded);
}
