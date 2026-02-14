/**
 * InspectorStateTypes.ts
 * 
 * Centralized type definitions for Inspector state shapes.
 * Extracted from InspectorOrchestratorContexts.ts to improve maintainability.
 */

// ============================================================================
// Column and Data Types
// ============================================================================

export type ColType = 'numeric' | 'date' | 'string';
export type MatchMode = 'fuzzy' | 'regex' | 'exact';
export type SortDirection = 'asc' | 'desc';
export type QueryScope = 'current' | 'all' | 'ask';

// ============================================================================
// Filter State Types
// ============================================================================

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

// ============================================================================
// Dataset and Workspace Types
// ============================================================================

export type DatasetSource =
  | { kind: 'text'; text: string }
  | { kind: 'path'; path: string };

export type WorkspaceDataset = {
  id: string;
  label: string;
  hasHeaders: boolean;
  source: DatasetSource;
};

// ============================================================================
// Load State (Reactive State Container)
// ============================================================================

export type LoadState = {
  headers: string[];
  totalRowCount: number;
  colTypes: ColType[];
  datasetId: string | null;
  datasetLabel: string;
  hasLoaded: boolean;
  isMergedView: boolean;
  mergedRowsAll: string[][];
  totalFilteredCount: number;
  visibleRows: string[][];
};

// ============================================================================
// Grid and Viewport Types
// ============================================================================

export type GridWindow = {
  startIdx: number;
  endIdx: number;
  renderedCount: number;
  maxWindow: number;
};

export type VisibleColumnIndices = number[];

// ============================================================================
// Sort Specification
// ============================================================================

export type SortSpec = {
  colIdx: number;
  dir: SortDirection;
};

// ============================================================================
// Cross-Query Results
// ============================================================================

export type CrossQueryResult = {
  datasetId: string;
  datasetLabel: string;
  matchCount: number;
};

// ============================================================================
// Schema and Statistics Types
// ============================================================================

export type SchemaColStat = {
  colIdx: number;
  colName: string;
  colType: ColType;
  nullCount: number;
  uniqueCount: number;
  minValue?: string | number;
  maxValue?: string | number;
  avgValue?: number;
  stdDev?: number;
};

// ============================================================================
// Recipe Types
// ============================================================================

export type Recipe = {
  id: string;
  label: string;
  query: string;
  matchMode: MatchMode;
  targetColIdx: number | null;
  description?: string;
};

export type RecipeState = {
  recipes: Recipe[];
  selectedRecipeId: string | null;
};

// ============================================================================
// Multi-Query Types
// ============================================================================

export type MultiQueryClause = {
  id: string;
  query: string;
  matchMode: MatchMode;
  targetColIdx: number | null;
  logicalOp: 'AND' | 'OR';
};

// ============================================================================
// Tab Types
// ============================================================================

export type GenTab = {
  id: string;
  label: string;
  active: boolean;
  datasetId?: string;
};

// ============================================================================
// Performance Tracking
// ============================================================================

export type PerfMetric = {
  op: string;
  ms: number;
  p95: number;
  slo: number;
  status: 'ok' | 'slow' | 'critical';
  start?: number;
  end?: number;
  renderedRows?: number;
  requestedCols?: number;
  merged?: boolean;
  reason?: string;
  filteredRows?: number;
  totalRows?: number;
  visibleCols?: number;
};

// ============================================================================
// Gate Token (Cancellation Pattern)
// ============================================================================

export type GateToken = {
  nextToken: () => number;
  isLatest: (token: number) => boolean;
};

// ============================================================================
// Tauri Dialog Module Type
// ============================================================================

export type DialogMod = typeof import('@tauri-apps/plugin-dialog');
