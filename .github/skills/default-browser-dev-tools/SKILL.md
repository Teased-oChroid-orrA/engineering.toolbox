---
name: default-browser-devtools
description: 'Cross-engine automation, debugging, regression testing, and performance analysis for a self-contained Svelte app. Use to validate UI behavior, capture screenshots/snapshots, inspect console + network activity, and profile performance when developing on macOS but targeting engine families: WebKit (macOS/iOS + many Linux WebKitGTK environments) and Blink (Windows/ChromeOS via Chromium/Edge). Includes a Playwright runner that implements the skill actions and provides deterministic workflows like Smoke Test and Golden Path.'
license: MIT
---

# Default Browser Engine DevTools Agent (Svelte Cross-Platform Testing)

## Overview

This skill is designed for testing a **self-contained Svelte app** across OS targets by focusing on **rendering engine families** instead of browser brand names or needing multiple physical machines.

Why this definition is high leverage:

- **Engine vs Browser**: Targets the real compatibility boundary: **Blink** vs **WebKit**.
- **Svelte specifics**: Explicitly hunts issues around **reactive update correctness**, **layout thrashing**, and measurement loops (e.g., **ResizeObserver** churn).
- **Tauri/Wails ready**: The âself-contained appâ model matches desktop WebViews. Playwright/WebDriver-style automation is the practical path to repeatable evidence.

This skill includes both:
- **Definition** (this file): When/what to test and how to interpret results.
- **Implementation** (runner.js): A Playwright-based âbridgeâ providing deterministic actions and workflows.

## Engine Targets

| Platform target | Practical engine family to test | Playwright engine |
|---|---|---|
| iOS / macOS | WebKit (Safari engine; iOS requires WebKit) | `webkit` |
| Windows / ChromeOS | Blink (Chromium/Edge family) | `chromium` |
| Linux | varies by distro/toolkit; often WebKitGTK; sometimes Chromium | `webkit` (default), optional `chromium` |

> Linux note: there is no single âdefault engineâ across distros. This skill treats Linux as **WebKit-first** (WebKitGTK-like environments), but supports **Chromium** if that matches your target.

## Prerequisites

- Node.js 18+
- Playwright dev dependency

### Setup

```bash
npm i -D playwright
npx playwright install
```

## Included Implementation

Directory layout:

```
.github/skills/default-browser-devtools/
âââ SKILL.md
âââ runner.js
âââ playwright.config.js
âââ examples/
    âââ README.md
```

### Quick Commands

Smoke test (both engines):

```bash
node .github/skills/default-browser-devtools/runner.js smoke --url http://localhost:5173 --engines webkit,chromium
```

Triage (console + network failures):

```bash
node .github/skills/default-browser-devtools/runner.js triage --url http://localhost:5173 --engine webkit
```

Golden path (deterministic steps you edit):

```bash
node .github/skills/default-browser-devtools/runner.js golden --url http://localhost:5173 --engines webkit,chromium
```

Performance trace (trace zip artifacts):

```bash
node .github/skills/default-browser-devtools/runner.js perf --url http://localhost:5173 --engine chromium
```

Artifacts output:
`./artifacts/default-browser-devtools/<timestamp>/<engine>/...`

## Action Surface

The runner implements these conceptual actions (mapped to Playwright):

### Navigation & Page Management
- `new_page`
- `navigate_page`
- `wait_for`
- `close_page`
- (parity) `list_pages` / `select_page`

### Input & Interaction
- `click`
- `fill` / `fill_form`
- `hover`
- `press_key`
- `drag`
- `handle_dialog`
- `upload_file`

### Debugging & Inspection
- `take_snapshot` (accessibility snapshot JSON)
- `take_screenshot`
- `list_console_messages` (JSON)
- `list_network_requests` (request failures JSON; extendable)
- `evaluate_script` (optional probes via CLI)

### Performance
- `performance_start_trace`
- `performance_stop_trace`
- `performance_analyze_insight` (lightweight heuristics + pointers)

## Workflows

### Workflow A â Smoke Test

Goal: verify load + hydration + basic interactions.

- Loads the app with `waitUntil: networkidle`
- Captures baseline screenshot + accessibility snapshot
- Performs a **conservative click sweep** to surface hydration/interaction errors
- Captures post-interaction screenshot + snapshot
- Writes console + network failure logs

Run:
```bash
node .github/skills/default-browser-devtools/runner.js smoke --url http://localhost:5173 --engines webkit,chromium
```

### Workflow B â Triage

Goal: fastest route to signal: âwhat broke?â

- Loads app
- Dumps console logs + request failures
- Captures screenshot

Run:
```bash
node .github/skills/default-browser-devtools/runner.js triage --url http://localhost:5173 --engine webkit
```

### Workflow C â Golden Path

Goal: deterministic âdonât lose featuresâ sequence.

Edit the `steps` array inside `runner.js` to match your appâs invariants.

Run:
```bash
node .github/skills/default-browser-devtools/runner.js golden --url http://localhost:5173 --engines webkit,chromium
```

### Workflow D â Perf Trace

Goal: capture traces around load + short interaction window.

Run:
```bash
node .github/skills/default-browser-devtools/runner.js perf --url http://localhost:5173 --engine webkit
```

## Cross-Platform Portability Checklist

- Case-sensitive assets/imports (Linux/CI)
- Path separator assumptions
- Keyboard modifiers (Cmd vs Ctrl)
- Font/layout dependencies
- ResizeObserver / measurement loops
- Scroll container behavior
- File input parsing + error UI

## Evidence Output

Per engine, you get:

- `baseline.png`, `post_interaction.png` (smoke)
- accessibility snapshots (`snapshot_*.json`)
- `console.json`
- `network_failures.json`
- `summary.json`
- `trace.zip` (perf)

Use this evidence to compare WebKit vs Blink behavior without needing separate machines.
