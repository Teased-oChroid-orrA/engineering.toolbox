import { defineConfig, devices } from '@playwright/test';

const playwrightPort = Number(process.env.PLAYWRIGHT_PORT ?? '4173');
const baseURL = `http://127.0.0.1:${playwrightPort}`;

export default defineConfig({
  testDir: './tests',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure'
  },
  // Unit tests: exclude E2E tests that require a dev server
  // Keep heavyweight drag/real-device suites excluded, but allow lightweight route tests.
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
  ],
  webServer: {
    command: `node ./scripts/preflight-check.mjs && npx svelte-kit sync && npx vite dev --host 127.0.0.1 --port ${playwrightPort} --strictPort`,
    url: baseURL,
    timeout: 120_000,
    reuseExistingServer: false
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
