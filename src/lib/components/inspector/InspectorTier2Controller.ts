export type NumericFilterState = {
  enabled: boolean;
  colIdx: number | null;
  minText: string;
  maxText: string;
  error: string | null;
};

export type DateFilterState = {
  enabled: boolean;
  colIdx: number | null;
  minIso: string;
  maxIso: string;
  error: string | null;
};

export type CategoryFilterState = {
  enabled: boolean;
  colIdx: number | null;
  selected: Set<string>;
};

export const resetTier2Filters = (
  numeric: NumericFilterState,
  date: DateFilterState,
  category: CategoryFilterState
) => {
  numeric.enabled = false;
  date.enabled = false;
  category.enabled = false;
  category.selected = new Set();
};
