import type { BushingInputs } from './types';
import { aircraftReamerCatalogCsv } from './catalogs/aircraftReamerCatalogData';

export type ReamerCatalogSource = 'builtin' | 'custom';
export type ReamerAvailabilityTier = 'preferred' | 'common' | 'special';

export type ReamerCatalogEntry = {
  id: string;
  source: ReamerCatalogSource;
  sizeLabel: string;
  nominalIn: number;
  toolTolerancePlusIn: number;
  toolToleranceMinusIn: number;
  availabilityTier: ReamerAvailabilityTier;
  preferredRank: number | null;
  sourceFamily: string;
  sourceUrls: string[];
  notes: string;
};

const MM_PER_IN = 25.4;
const CUSTOM_REAMER_CSV_HEADERS = [
  'size_label',
  'nominal_in',
  'tool_tolerance_plus_in',
  'tool_tolerance_minus_in',
  'availability_tier',
  'preferred_rank',
  'source_family',
  'source_urls',
  'notes'
];

function csvKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let cell = '';
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < csvText.length; i += 1) {
    const ch = csvText[i];
    const next = csvText[i + 1];
    if (ch === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && ch === ',') {
      row.push(cell);
      cell = '';
      continue;
    }
    if (!inQuotes && (ch === '\n' || ch === '\r')) {
      if (ch === '\r' && next === '\n') i += 1;
      row.push(cell);
      cell = '';
      if (row.some((part) => part.trim().length > 0)) rows.push(row);
      row = [];
      continue;
    }
    cell += ch;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some((part) => part.trim().length > 0)) rows.push(row);
  }
  return rows;
}

function parseNumber(value: string | undefined): number {
  const next = Number(value ?? '');
  return Number.isFinite(next) ? next : 0;
}

function buildEntryId(source: ReamerCatalogSource, sizeLabel: string, nominalIn: number) {
  return `${source}:${csvKey(sizeLabel)}:${nominalIn.toFixed(4)}`;
}

function formatCsvNumber(value: number) {
  return Number.isFinite(value) ? value.toFixed(4) : '0.0000';
}

function escapeCsvCell(value: string) {
  if (!/[",\n\r]/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

function fromDisplayUnits(value: number, units: BushingInputs['units']) {
  return units === 'metric' ? value / MM_PER_IN : value;
}

export function parseReamerCatalogCsv(csvText: string, source: ReamerCatalogSource = 'custom'): ReamerCatalogEntry[] {
  const rows = parseCsvRows(csvText);
  if (!rows.length) return [];
  const [headerRow, ...bodyRows] = rows;
  const indexByKey = new Map(headerRow.map((label, idx) => [csvKey(label), idx]));
  const get = (row: string[], key: string) => row[indexByKey.get(key) ?? -1] ?? '';
  const entries = bodyRows
    .map((row) => {
      const sizeLabel = get(row, 'size_label').trim();
      const nominalIn = parseNumber(get(row, 'nominal_in'));
      if (!sizeLabel || !Number.isFinite(nominalIn) || nominalIn <= 0) return null;
      const availabilityRaw = get(row, 'availability_tier').trim().toLowerCase();
      const availabilityTier: ReamerAvailabilityTier =
        availabilityRaw === 'preferred' ? 'preferred' : availabilityRaw === 'special' ? 'special' : 'common';
      const preferredRank = Number(get(row, 'preferred_rank'));
      return {
        id: buildEntryId(source, sizeLabel, nominalIn),
        source,
        sizeLabel,
        nominalIn,
        toolTolerancePlusIn: parseNumber(get(row, 'tool_tolerance_plus_in')),
        toolToleranceMinusIn: parseNumber(get(row, 'tool_tolerance_minus_in')),
        availabilityTier,
        preferredRank: Number.isFinite(preferredRank) && preferredRank > 0 ? preferredRank : null,
        sourceFamily: get(row, 'source_family').trim() || 'custom',
        sourceUrls: get(row, 'source_urls')
          .split(';')
          .map((part) => part.trim())
          .filter(Boolean),
        notes: get(row, 'notes').trim()
      } satisfies ReamerCatalogEntry;
    })
    .filter((entry): entry is ReamerCatalogEntry => entry !== null);

  return entries.sort((a, b) => a.nominalIn - b.nominalIn || a.sizeLabel.localeCompare(b.sizeLabel));
}

export const AIRCRAFT_REAMER_CATALOG = parseReamerCatalogCsv(aircraftReamerCatalogCsv, 'builtin');

export function formatReamerCatalogOptionLabel(entry: ReamerCatalogEntry): string {
  const tier =
    entry.availabilityTier === 'preferred'
      ? `Preferred${entry.preferredRank ? ` #${entry.preferredRank}` : ''}`
      : entry.availabilityTier === 'special'
        ? 'Special'
        : 'Common';
  return `${entry.sizeLabel} • ${entry.nominalIn.toFixed(4)} in • ${tier} • +${entry.toolTolerancePlusIn.toFixed(4)}/-${entry.toolToleranceMinusIn.toFixed(4)}`;
}

function toDisplayUnits(valueInches: number, units: BushingInputs['units']) {
  return units === 'metric' ? valueInches * MM_PER_IN : valueInches;
}

export function isReamerCatalogEntry(value: unknown): value is ReamerCatalogEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<ReamerCatalogEntry>;
  return (
    typeof entry.id === 'string' &&
    (entry.source === 'builtin' || entry.source === 'custom') &&
    typeof entry.sizeLabel === 'string' &&
    Number.isFinite(entry.nominalIn) &&
    Number.isFinite(entry.toolTolerancePlusIn) &&
    Number.isFinite(entry.toolToleranceMinusIn) &&
    (entry.availabilityTier === 'preferred' || entry.availabilityTier === 'common' || entry.availabilityTier === 'special') &&
    typeof entry.sourceFamily === 'string' &&
    Array.isArray(entry.sourceUrls) &&
    typeof entry.notes === 'string'
  );
}

export function createCustomReamerCatalogEntry(
  input: {
    sizeLabel?: string;
    nominal: number;
    tolerancePlus: number;
    toleranceMinus: number;
    notes?: string;
  },
  units: BushingInputs['units'],
  purpose: 'bore' | 'id'
): ReamerCatalogEntry {
  const nominalIn = fromDisplayUnits(input.nominal, units);
  const toolTolerancePlusIn = fromDisplayUnits(input.tolerancePlus, units);
  const toolToleranceMinusIn = fromDisplayUnits(input.toleranceMinus, units);
  const defaultLabel = `Custom ${purpose.toUpperCase()} ${nominalIn.toFixed(4)} in`;
  const sizeLabel = input.sizeLabel?.trim() || defaultLabel;
  return {
    id: buildEntryId('custom', sizeLabel, nominalIn),
    source: 'custom',
    sizeLabel,
    nominalIn,
    toolTolerancePlusIn,
    toolToleranceMinusIn,
    availabilityTier: 'special',
    preferredRank: null,
    sourceFamily: 'custom_catalog',
    sourceUrls: [],
    notes: input.notes?.trim() || `User-added ${purpose} reamer`
  };
}

export function serializeReamerCatalogCsv(entries: ReamerCatalogEntry[]): string {
  const lines = [CUSTOM_REAMER_CSV_HEADERS.join(',')];
  const sorted = [...entries]
    .filter((entry) => entry.source === 'custom')
    .sort((a, b) => a.nominalIn - b.nominalIn || a.sizeLabel.localeCompare(b.sizeLabel));
  for (const entry of sorted) {
    lines.push(
      [
        escapeCsvCell(entry.sizeLabel),
        formatCsvNumber(entry.nominalIn),
        formatCsvNumber(entry.toolTolerancePlusIn),
        formatCsvNumber(entry.toolToleranceMinusIn),
        entry.availabilityTier,
        entry.preferredRank ? String(entry.preferredRank) : '',
        escapeCsvCell(entry.sourceFamily || 'custom_catalog'),
        escapeCsvCell(entry.sourceUrls.join('; ')),
        escapeCsvCell(entry.notes)
      ].join(',')
    );
  }
  return lines.join('\n');
}

export function upsertCustomReamerCatalogCsv(
  csvText: string | null,
  entry: ReamerCatalogEntry
): { csvText: string; entries: ReamerCatalogEntry[]; appliedEntry: ReamerCatalogEntry } {
  const current = csvText ? parseReamerCatalogCsv(csvText, 'custom') : [];
  const nextEntries = [...current.filter((candidate) => candidate.id !== entry.id), { ...entry, source: 'custom' as const }]
    .sort((a, b) => a.nominalIn - b.nominalIn || a.sizeLabel.localeCompare(b.sizeLabel));
  const nextCsvText = serializeReamerCatalogCsv(nextEntries);
  return {
    csvText: nextCsvText,
    entries: nextEntries,
    appliedEntry: nextEntries.find((candidate) => candidate.id === entry.id) ?? { ...entry, source: 'custom' }
  };
}

export function removeCustomReamerEntryFromCsv(
  csvText: string | null,
  entryId: string
): { csvText: string | null; entries: ReamerCatalogEntry[] } {
  const current = csvText ? parseReamerCatalogCsv(csvText, 'custom') : [];
  const nextEntries = current.filter((entry) => entry.id !== entryId);
  if (!nextEntries.length) {
    return { csvText: null, entries: [] };
  }
  return {
    csvText: serializeReamerCatalogCsv(nextEntries),
    entries: nextEntries
  };
}

export function describeReamerEntryForDisplay(entry: ReamerCatalogEntry, units: BushingInputs['units']): string {
  const nominal = toDisplayUnits(entry.nominalIn, units).toFixed(units === 'metric' ? 3 : 4);
  const tolPlus = toDisplayUnits(entry.toolTolerancePlusIn, units).toFixed(units === 'metric' ? 3 : 4);
  const tolMinus = toDisplayUnits(entry.toolToleranceMinusIn, units).toFixed(units === 'metric' ? 3 : 4);
  const unitLabel = units === 'metric' ? 'mm' : 'in';
  return `${entry.sizeLabel} • ${nominal} ${unitLabel} • +${tolPlus}/-${tolMinus}`;
}

export function applyReamerEntryToBushingInputs(form: BushingInputs, entry: ReamerCatalogEntry): BushingInputs {
  const boreNominal = toDisplayUnits(entry.nominalIn, form.units);
  const boreTolPlus = toDisplayUnits(entry.toolTolerancePlusIn, form.units);
  const boreTolMinus = toDisplayUnits(entry.toolToleranceMinusIn, form.units);
  const boreLower = boreNominal - boreTolMinus;
  const boreUpper = boreNominal + boreTolPlus;
  const tolWidth = boreUpper - boreLower;
  const nextCapability = {
    ...(form.boreCapability ?? { mode: 'unspecified' as const }),
    mode: 'reamer_fixed' as const,
    minAchievableTolWidth: tolWidth,
    maxRecommendedTolWidth: tolWidth
  };
  const nextPolicy = {
    ...(form.interferencePolicy ?? {
      enabled: Boolean(form.enforceInterferenceTolerance),
      lockBore: true,
      preserveBoreNominal: true,
      allowBoreNominalShift: false
    }),
    lockBore: true,
    preserveBoreNominal: true,
    allowBoreNominalShift: false,
    maxBoreNominalShift: undefined
  };
  return {
    ...form,
    boreDia: boreNominal,
    boreTolMode: 'limits',
    boreNominal,
    boreTolPlus,
    boreTolMinus,
    boreLower,
    boreUpper,
    boreCapability: nextCapability,
    interferencePolicy: nextPolicy,
    lockBoreForInterference: true
  };
}

export function applyReamerEntryToBushingId(form: BushingInputs, entry: ReamerCatalogEntry): BushingInputs {
  return {
    ...form,
    idBushing: toDisplayUnits(entry.nominalIn, form.units)
  };
}
