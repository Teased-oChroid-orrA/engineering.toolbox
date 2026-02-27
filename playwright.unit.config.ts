import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  // Unit tests: exclude E2E tests that require a dev server
  // E2E tests use page.goto() and need webServer
  testIgnore: [
    '**/bushing-e2e-*.spec.ts',
    '**/bushing-dnd-integrity.spec.ts',
    '**/bushing-ui-throughput.spec.ts',
    '**/console-*.spec.ts',
    '**/debug-*.spec.ts',
    '**/inspector-*.spec.ts',
    '**/native-dnd-*.spec.ts',
    '**/real-*.spec.ts',
    '**/simple-*.spec.ts',
    '**/surface-*.spec.ts',
    '**/toolbox-screenshots.spec.ts',
    '**/test-*.spec.ts',
    '**/visual/**',
    '**/wb/**' // Weight-balance E2E tests
  ]
});
