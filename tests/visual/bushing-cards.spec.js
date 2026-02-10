import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const summaryPath = path.join(root, 'src/lib/components/bushing/BushingResultSummary.svelte');
const diagnosticsPath = path.join(root, 'src/lib/components/bushing/BushingDiagnosticsPanel.svelte');

test.describe('bushing cards visual tokens', () => {
  test('semantic card tokens are present and dark-text regressions are absent', async () => {
    const summary = fs.readFileSync(summaryPath, 'utf8');
    const diagnostics = fs.readFileSync(diagnosticsPath, 'utf8');
    const combined = `${summary}\n${diagnostics}`;

    expect(combined).toContain('bushing-results-card');
    expect(combined).toContain('text-slate-100/95');
    expect(combined).toContain('text-indigo-200/95');
    expect(combined).not.toMatch(/text-black|text-surface-950|text-surface-900/);

    const semanticLines = combined
      .split('\n')
      .filter((line) => /text-slate-100\/95|text-indigo-200\/95|bushing-results-card/.test(line))
      .map((line) => line.trim())
      .join('\n');

    expect(semanticLines).toMatchSnapshot('bushing-cards-semantic-lines.txt');
  });
});
