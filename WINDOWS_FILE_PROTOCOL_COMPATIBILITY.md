# Windows file:// Protocol Compatibility Guide

## Overview

This document describes the configuration and best practices for ensuring the SvelteKit application works correctly when opened via `file://` protocol on Windows (and other platforms).

## Problem Statement

When building a single-file HTML application with SvelteKit's `adapter-static` and opening it via `file://` on Windows:

1. **Absolute paths break**: Paths starting with `/` point to the drive root (e.g., `C:/`) instead of the application directory
2. **CORS restrictions**: ES modules loaded via `file://` are blocked by browser security policies
3. **Path case-sensitivity**: Windows can be more rigid with import paths compared to macOS/Linux
4. **Asset loading**: External assets need to be inlined or use relative paths

## Solution Implementation

### 1. SvelteKit Configuration (`svelte.config.js`)

```javascript
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({ fallback: 'index.html' }),
    paths: {
      relative: true // ✅ Enable relative paths for file:// compatibility
    },
    router: {
      type: 'hash' // ✅ Hash routing for client-side navigation
    },
    output: {
      bundleStrategy: 'inline' // ✅ Inline all JS/CSS into single HTML
    }
  }
};
```

**Key Settings:**
- `paths.relative: true` - Generates relative asset paths (`./_app/...`) instead of absolute (`/_app/...`)
- `router.type: 'hash'` - Uses hash-based routing (`#/page`) to avoid server-side routing requirements
- `bundleStrategy: 'inline'` - Inlines all JavaScript and CSS into the HTML file

### 2. Vite Configuration (`vite.config.ts`)

```typescript
export default defineConfig({
  base: './', // ✅ Relative base path
  build: {
    assetsInlineLimit: Infinity, // ✅ Inline ALL assets (no size limit)
  },
  // ... other config
});
```

**Key Settings:**
- `base: './'` - Ensures all asset URLs are relative to the current directory
- `assetsInlineLimit: Infinity` - Forces all assets (images, fonts, etc.) to be base64-encoded and inlined

### 3. Static Asset References

**❌ Bad - Absolute paths:**
```html
<link rel="icon" href="/favicon.png" />
<link rel="icon" href="%sveltekit.assets%/favicon.png" />
```

**✅ Good - Relative paths:**
```html
<link rel="icon" href="./favicon.png" />
```

**Note:** The `%sveltekit.assets%` placeholder gets replaced with `/` for SPA fallback pages, creating absolute paths that break with `file://`.

### 4. Browser API Usage

Always check for browser environment before using window/document APIs:

```typescript
// ✅ Good - SSR-safe
if (typeof window !== 'undefined') {
  localStorage.setItem('key', 'value');
}

// ✅ Good - Using SvelteKit's browser check
import { browser } from '$app/environment';

if (browser) {
  // Browser-only code
}

// ✅ Good - Using onMount for browser-only code
import { onMount } from 'svelte';

onMount(() => {
  // Runs only in browser
  return () => {
    // Cleanup
  };
});
```

## Verification

### Build Verification Script

The `scripts/build-verify.mjs` automatically checks for common issues:

```bash
npm run build
# Checks for:
# - No absolute asset paths starting with "/"
# - No non-hash internal links
# - Outputs: ✅ build/index.html looks file://-robust
```

### Manual Testing Checklist

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Inspect generated HTML:**
   ```bash
   grep -o "href=\"[^\"]*\"" build/index.html | grep -v "^href=\"http" | grep -v "^href=\"data:"
   # Should only show relative paths like: href="./favicon.png"
   ```

3. **Test in browser:**
   - Open `build/index.html` directly in browser (file:// protocol)
   - Verify navigation works (hash routing)
   - Check browser console for errors
   - Test all features work offline

## Known Limitations

### SPA Fallback Pages

Even with `paths.relative: true`, SvelteKit's SPA fallback pages (`index.html`/`200.html`) may still use absolute paths for some resources. This is a known limitation as of SvelteKit 2.x.

**Workarounds:**
1. Use direct relative paths in `app.html` instead of `%sveltekit.assets%`
2. Set `kit.paths.base` at build time if deployment path is known
3. Post-process the build output to replace absolute paths (advanced)

**Related Issues:**
- [SvelteKit #13858 - SPA fallback pages with paths.relative](https://github.com/sveltejs/kit/issues/13858)
- [SvelteKit #10235 - Incorrect paths with paths.relative in SPAs](https://github.com/sveltejs/kit/issues/10235)

### External Resources

External CDN resources (fonts, icons) loaded via `<link>` or `<script>` tags will still require internet access:

```html
<!-- These still need internet -->
<link rel="preconnect" href="https://cdn.svar.dev" />
<link href="https://cdn.svar.dev/fonts/wxi/wx-icons.css" rel="stylesheet" />
```

**Options:**
1. Keep external CDN for smaller bundle size (requires internet)
2. Download and inline critical assets (fully offline)
3. Use font/icon packages from npm and let Vite bundle them

## Testing in CI

The CI workflow (`/.github/workflows/ci.yml`) includes:

1. **Type checking:** `npm run check`
2. **Build verification:** `npm run build` (includes automatic file:// compatibility check)
3. **Unit tests:** `npm run test:unit` (excludes E2E tests)
4. **E2E tests:** `npm run test:e2e` (runs with preview server)

### Unit vs E2E Tests

**Unit Tests** (`playwright.unit.config.ts`):
- Run without dev server
- Test pure logic and components
- Excluded patterns: E2E tests, inspector tests, visual tests, wb tests

**E2E Tests** (`playwright.config.ts`):
- Auto-start dev server via `webServer` config
- Test full user workflows with `page.goto()`
- Examples: `tests/bushing-e2e-smoke-ui.spec.ts`, `tests/wb/**/*.spec.ts`

## Troubleshooting

### Issue: Favicon not loading

**Symptom:** Browser shows "File not found" for favicon

**Fix:** Use relative path in `src/app.html`:
```html
<link rel="icon" href="./favicon.png" />
```

### Issue: Assets not loading on Windows

**Symptom:** Images, fonts, or other assets return 404 or CORS errors

**Fix:** Verify `vite.config.ts` has:
```typescript
build: {
  assetsInlineLimit: Infinity
}
```

### Issue: Navigation doesn't work with file://

**Symptom:** Clicking links reloads the page or shows 404

**Fix:** Verify hash routing is enabled in `svelte.config.js`:
```javascript
router: {
  type: 'hash'
}
```

### Issue: "window is not defined" error

**Symptom:** SSR build fails with "ReferenceError: window is not defined"

**Fix:** Wrap browser-only code:
```typescript
if (typeof window !== 'undefined') {
  // Use window, document, localStorage, etc.
}
```

## Best Practices

1. **Always use relative paths** for static assets in templates
2. **Check for browser environment** before using window/document APIs
3. **Test the build** with `file://` protocol on Windows before deployment
4. **Use hash routing** for client-side navigation
5. **Inline critical assets** to reduce external dependencies
6. **Verify builds** with the automated verification script

## References

- [SvelteKit Configuration Docs](https://svelte.dev/docs/kit/configuration)
- [SvelteKit adapter-static Docs](https://svelte.dev/docs/kit/adapter-static)
- [Building portable web apps with SvelteKit](https://khromov.se/building-portable-web-apps-with-sveltekits-new-single-file-bundle-strategy-and-hash-router/)
- [Vite Build Options](https://vitejs.dev/config/build-options.html)

## Changelog

- **2026-02-18**: Added `paths.relative: true` and fixed favicon path for Windows compatibility
- **2026-02-18**: Updated verification scripts and test configurations
