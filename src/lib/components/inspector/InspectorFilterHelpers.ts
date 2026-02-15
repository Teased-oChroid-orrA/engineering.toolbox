/**
 * Helper functions for SVAR filter application
 * Extracted to keep InspectorOrchestratorFilterController.ts within size policy limits
 */

import type { IFilter } from '@svar-ui/svelte-filter';
import type { FilterControllerContext } from './InspectorControllerContext';

type SvarApplyState = {
  unsupported: number;
  textApplied: boolean;
  numericApplied: boolean;
  dateApplied: boolean;
  catApplied: boolean;
};

export function applySvarTextRule(ctx: FilterControllerContext, idx: number, filter: string, cleanVal: string): boolean {
  ctx.targetColIdx = idx;
  if (filter === 'equal') {
    ctx.matchMode = 'exact';
    ctx.query = cleanVal;
    return true;
  }
  if (filter === 'contains') {
    ctx.matchMode = 'fuzzy';
    ctx.query = cleanVal;
    return true;
  }
  if (filter === 'beginsWith') {
    ctx.matchMode = 'regex';
    ctx.query = `^${ctx.escapeRegExp(cleanVal)}`;
    return true;
  }
  if (filter === 'endsWith') {
    ctx.matchMode = 'regex';
    ctx.query = `${ctx.escapeRegExp(cleanVal)}$`;
    return true;
  }
  return false;
}

export function applySvarNumberRule(ctx: FilterControllerContext, idx: number, filter: string, rule: any, cleanVal: string): boolean {
  ctx.numericF.enabled = true;
  ctx.numericF.colIdx = idx;
  if (filter === 'between' && typeof rule.value === 'object' && rule.value != null) {
    const v = rule.value as { start?: unknown; end?: unknown };
    ctx.numericF.minText = v.start == null ? '' : String(v.start);
    ctx.numericF.maxText = v.end == null ? '' : String(v.end);
    return true;
  }
  if (filter === 'greater' || filter === 'greaterOrEqual') {
    ctx.numericF.minText = cleanVal;
    ctx.numericF.maxText = '';
    return true;
  }
  if (filter === 'less' || filter === 'lessOrEqual') {
    ctx.numericF.minText = '';
    ctx.numericF.maxText = cleanVal;
    return true;
  }
  if (filter === 'equal') {
    ctx.numericF.minText = cleanVal;
    ctx.numericF.maxText = cleanVal;
    return true;
  }
  return false;
}

export function applySvarDateRule(ctx: FilterControllerContext, idx: number, filter: string, rule: any): boolean {
  ctx.dateF.enabled = true;
  ctx.dateF.colIdx = idx;
  if (filter === 'between' && typeof rule.value === 'object' && rule.value != null) {
    const v = rule.value as { start?: unknown; end?: unknown };
    ctx.dateF.minIso = v.start == null ? '' : String(v.start).slice(0, 10);
    ctx.dateF.maxIso = v.end == null ? '' : String(v.end).slice(0, 10);
    return true;
  }
  if (filter === 'greater' || filter === 'greaterOrEqual') {
    ctx.dateF.minIso = String(rule.value ?? '').slice(0, 10);
    ctx.dateF.maxIso = '';
    return true;
  }
  if (filter === 'less' || filter === 'lessOrEqual') {
    ctx.dateF.minIso = '';
    ctx.dateF.maxIso = String(rule.value ?? '').slice(0, 10);
    return true;
  }
  if (filter === 'equal') {
    const iso = String(rule.value ?? '').slice(0, 10);
    ctx.dateF.minIso = iso;
    ctx.dateF.maxIso = iso;
    return true;
  }
  return false;
}

export function applySvarCategoryRule(ctx: FilterControllerContext, idx: number, rule: any): boolean {
  if (!Array.isArray(rule.includes) || rule.includes.length === 0) return false;
  ctx.catF.enabled = true;
  ctx.catF.colIdx = idx;
  ctx.catF.selected = new Set(rule.includes.map((v: unknown) => String(v)));
  return true;
}

export function applySingleSvarRule(ctx: FilterControllerContext, state: SvarApplyState, rule: IFilter, toColIdx: (field: unknown, headerCount: number) => number | null) {
  const idx = toColIdx(rule.field, ctx.headers.length);
  if (idx == null) {
    state.unsupported++;
    return;
  }
  const rawVal = rule.value == null ? '' : String(rule.value);
  const cleanVal = rawVal.trim();
  const filter = rule.filter ?? 'contains';
  const typ = (rule.type ?? 'text') as 'text' | 'number' | 'date' | 'tuple';

  if (!state.textApplied && typ === 'text') {
    state.textApplied = applySvarTextRule(ctx, idx, filter, cleanVal);
    if (!state.textApplied) state.unsupported++;
    return;
  }
  if (!state.numericApplied && typ === 'number') {
    state.numericApplied = applySvarNumberRule(ctx, idx, filter, rule, cleanVal);
    if (!state.numericApplied) state.unsupported++;
    return;
  }
  if (!state.dateApplied && typ === 'date') {
    state.dateApplied = applySvarDateRule(ctx, idx, filter, rule);
    if (!state.dateApplied) state.unsupported++;
    return;
  }
  if (!state.catApplied && applySvarCategoryRule(ctx, idx, rule)) {
    state.catApplied = true;
    return;
  }
  state.unsupported++;
}
