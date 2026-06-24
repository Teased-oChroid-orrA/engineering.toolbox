# Engineering Toolbox — Audit Report

_Date: 2026-06-23 · Scope: full codebase audit, theme modernization, UI-kit consolidation_

## Application overview

`structural-companion-desktop` v0.1.0 — a **SvelteKit 2 + Svelte 5 + Vite 7 + Tauri 2** desktop
app for structural engineering (bushing, surface, inspector, weight-balance, buckling, shear,
preload). Static / hash-router / **inline-bundle** build tuned for Windows `file://` WebView2.
**147 `.svelte`, 207 `.ts`, 66 root `.md` files.**

## Baseline (this audit)

| Gate | Result |
|---|---|
| `npm install` | ✅ exit 0 (no lifecycle/`postinstall` scripts) |
| `svelte-check` | ✅ **0 errors, 0 warnings** |
| `npm run check` (architecture verifiers) | ✅ pass, with soft LOC warnings |
| `npm run verify:file-size-policy` | ❌ violations (see M-3) |
| `npm run build` | ✅ ~9.6s; `build/index.html` verified file://-robust |

---

## Findings (severity-ranked)

### 🔴 H-1 — No Content Security Policy (Tauri)
`src-tauri/tauri.conf.json` sets `app.security.csp: null`. The WebView runs with no CSP, so any
injected markup could load/execute arbitrary resources. Capabilities are otherwise minimal
(`core:default`, `dialog:default`, `dialog:allow-open`) — good.
**Fix:** set a restrictive CSP for an offline desktop app, e.g.
`default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self' data:; connect-src 'self' ipc: http://ipc.localhost`.
Verify the app still boots in `tauri:dev` (KaTeX/inline styles may require `'unsafe-inline'` for styles).

### 🔴 H-2 — Three competing theme systems
- `src/lib/stores/themeStore.ts` — key `scd.theme.mode.v2`, drives `data-theme` + `theme-*` classes.
- `src/lib/ui/theme.ts` — keys `scd.theme` / `scd.mode`, drives `data-theme` + `data-mode`.
Both write `<html data-theme>` with different storage keys → state desync; `theme.ts` is effectively
dead. **Fix:** unify on `themeStore.ts`; retire `theme.ts` (migrate any importers).

### 🔴 H-3 — No real light mode (root cause of "too dark")
`theme.ts` hardcodes `AppMode='dark'` and `toggleMode()` is a no-op; all four palettes in
`src/lib/styles/themes.css` are dark; `src/app.css` forces `color-scheme: dark` and a hardcoded
near-black body; `src/app.html` hardcodes `class="dark"`, `#020617` backgrounds and
`bg-zinc-950 text-white` on `<body>`. **Fix:** add a `light | dark | auto` mode axis, light token
sets per palette, and wire `prefers-color-scheme`. (See theme implementation plan.)

### 🟠 M-1 — `ThemeToggle.svelte` memory leak + Svelte 4 idioms
Uses `export let compact` and a top-level `themeStore.subscribe(...)` **with no unsubscribe** — the
subscription lives for the app's lifetime (leak), and the idioms are Svelte 4 in a Svelte 5 app.
**Fix:** convert to runes (`$props`, `$state`, `$themeStore` auto-subscription).

### 🟠 M-2 — Duplicate global `body` styling
`src/app.css` and `src/lib/styles/themes.css` both style `body` background/color; resolution is
load-order dependent (fragile). **Fix:** let `themes.css` own `body`; remove the hardcoded dark body
from `app.css`.

### 🟠 M-3 — File-size-policy violations (governance/CI gate)
`.sizepolicy.json` is `mode: "strict"` with no source exemptions, yet e.g.:
`src/routes/preload/+page.svelte` **6,190** (limit 500); `src-tauri/src/inspector.rs` **1,404**
(800); `src/routes/+layout.svelte` **806** (500); `src/lib/drafting/bushing/BushingD3Canvas.svelte`
**780** (300); plus many functions over the 100-line block limit. **Fix (backlog):** module
splits; large refactors are out of scope for the theme/consolidation pass.

### 🟠 M-4 — `vite.config.ts` forces dep re-bundle every dev start
`optimizeDeps: command === 'serve' ? { force: true } : undefined` re-optimizes all deps on every
`vite dev` (slow startup). It's a band-aid for a one-time "504 Outdated Optimize Dep".
**Fix:** remove `force: true`; if the 504 recurs, clear `.vite` cache once instead.

### 🟡 M-5 — PostCSS autoprefixer (KEEP — reviewed)
Initially flagged as redundant under Tailwind v4, but **kept**: this is a Tauri app that runs on
macOS via WKWebView (Safari engine), where `backdrop-filter` (used by `.glass-panel`) still requires
the `-webkit-` prefix on older Safari versions. Tailwind v4's Lightning CSS only prefixes the
Tailwind layers; `themes.css`/component CSS rely on the standalone autoprefixer pass. **Resolution:**
no change — `autoprefixer` stays.

### 🟡 L-1 — `{@html}` sinks (reviewed)
- `InspectorVirtualGridRows.svelte` → `highlightCell()`: **safe** — every segment is wrapped in
  `escapeHtml` in `InspectorOrchestratorHighlight.ts`, including the non-match remainder.
- `BushingLatex.svelte`: renders KaTeX output (trusted generator).
- `BushingDerivationBlock.svelte`: `objective`/`steps`/`note` come from internally generated
  derivation content. **Action:** confirm no untrusted/user input can reach these props; low risk.

### 🟡 L-2 — Three UI kits installed, two redundant
`flowbite-svelte` is imported in **0** files (dead dependency); `@skeletonlabs/skeleton-svelte` in
**1** (`AppBar` in `+layout.svelte`); the local shadcn-style `$lib/components/ui` is used in **21**.
**Fix:** see consolidation plan — remove flowbite + skeleton, standardize on Tailwind v4 + local ui.

### 🟡 L-3 — Repo clutter
66 root status/report `.md` files and a committed `.golden_build_cjs/` snapshot. **Fix (backlog):**
move historical reports into `docs/` or prune.

---

## Fix order this pass
1. H-1 CSP, H-2/H-3 unified hybrid theme, M-1 ThemeToggle, M-2 body conflict (theme work).
2. L-2 UI-kit consolidation.
3. M-4 / M-5 config cleanups.
4. Backlog: M-3 file-size refactors, L-1 verification, L-3 cleanup, broader Playwright triage.
