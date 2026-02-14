/**
 * Browser-compatible CSV parser for Inspector
 * Fallback when Tauri backend is not available
 */

type ColType = 'numeric' | 'date' | 'string';

export function parseCsvInBrowser(text: string, hasHeaders: boolean): {
  headers: string[];
  rowCount: number;
  colTypes: ColType[];
} {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  
  if (lines.length === 0) {
    return { headers: [], rowCount: 0, colTypes: [] };
  }

  const rows = lines.map(line => {
    // Simple CSV parsing (doesn't handle quoted commas)
    return line.split(',').map(cell => cell.trim());
  });

  let headers: string[];
  let dataRows: string[][];

  if (hasHeaders) {
    headers = rows[0];
    dataRows = rows.slice(1);
  } else {
    // Generate column names
    const colCount = rows[0]?.length ?? 0;
    headers = Array.from({ length: colCount }, (_, i) => `Column ${i + 1}`);
    dataRows = rows;
  }

  // Infer column types
  const colTypes: ColType[] = headers.map((_, colIdx) => {
    if (dataRows.length === 0) return 'string';

    const sample = dataRows.slice(0, 100).map(row => row[colIdx] ?? '');
    
    // Check if numeric
    const numericCount = sample.filter(v => {
      const trimmed = v.trim();
      return trimmed && !isNaN(Number(trimmed.replace(/[,_]/g, '')));
    }).length;

    if (numericCount / sample.length > 0.8) return 'numeric';

    // Check if date
    const dateCount = sample.filter(v => {
      const trimmed = v.trim();
      if (!trimmed) return false;
      const d = new Date(trimmed);
      return !isNaN(d.getTime());
    }).length;

    if (dateCount / sample.length > 0.8) return 'date';

    return 'string';
  });

  return {
    headers,
    rowCount: dataRows.length,
    colTypes
  };
}
