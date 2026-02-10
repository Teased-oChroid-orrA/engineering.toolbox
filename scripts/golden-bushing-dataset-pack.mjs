import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const casesPath = path.join(root, 'golden', 'bushing_cases.json');
const expectedPath = path.join(root, 'golden', 'bushing_expected.json');
const outDir = path.join(root, 'golden', 'bushing_dataset_pack');
const outCsv = path.join(outDir, 'bushing_combined.csv');
const outMeta = path.join(outDir, 'bushing_combined.metadata.json');

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function csvEscape(v) {
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function flattenRecord(name, input, expected) {
  return {
    case_name: name,
    units: input.units,
    bushing_type: input.bushingType,
    id_type: input.idType,
    bore_dia: input.boreDia,
    id_bushing: input.idBushing,
    interference: input.interference,
    housing_len: input.housingLen,
    housing_width: input.housingWidth,
    edge_dist: input.edgeDist,
    contact_pressure: expected?.pressure ?? '',
    governing_name: expected?.governing?.name ?? '',
    governing_margin: expected?.governing?.margin ?? '',
    sleeve_wall: expected?.sleeveWall ?? '',
    neck_wall: expected?.neckWall ?? '',
    warning_count: Array.isArray(expected?.warnings) ? expected.warnings.length : 0,
    warnings: Array.isArray(expected?.warnings) ? expected.warnings.join('|') : ''
  };
}

function main() {
  if (!fs.existsSync(casesPath) || !fs.existsSync(expectedPath)) {
    console.error('[golden:bushing:dataset-pack] missing golden source files');
    process.exit(1);
  }
  const cases = loadJson(casesPath);
  const expected = loadJson(expectedPath);
  fs.mkdirSync(outDir, { recursive: true });

  const rows = cases.map((c) => flattenRecord(c.name, c.input, expected[c.name]));
  const headers = Object.keys(rows[0] ?? {});
  const csv = [headers.join(','), ...rows.map((row) => headers.map((h) => csvEscape(row[h])).join(','))].join('\n');
  fs.writeFileSync(outCsv, csv);

  const metadata = {
    generatedAt: new Date().toISOString(),
    source: {
      cases: path.relative(root, casesPath),
      expected: path.relative(root, expectedPath)
    },
    records: rows.length,
    columns: headers
  };
  fs.writeFileSync(outMeta, JSON.stringify(metadata, null, 2));
  console.log(`[golden:bushing:dataset-pack] wrote ${path.relative(root, outCsv)} and metadata`);
}

main();

