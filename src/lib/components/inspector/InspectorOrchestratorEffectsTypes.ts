/**
 * InspectorOrchestratorEffectsTypes.ts
 * 
 * Type definitions for InspectorOrchestratorEffects.
 * Separated to avoid Rollup @__PURE__ annotation warnings in .svelte.ts files.
 */

export type NumericFilter = {
  enabled: boolean;
  colIdx: number | null;
  minText: string;
  maxText: string;
};

export type DateFilter = {
  enabled: boolean;
  colIdx: number | null;
  minIso: string;
  maxIso: string;
};

export type CategoryFilter = {
  enabled: boolean;
  colIdx: number | null;
  selected: Set<string> | null;
};
