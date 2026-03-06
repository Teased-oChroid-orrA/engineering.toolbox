import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ command }) => ({
  // file:// portability: ensure built asset URLs are relative
  base: './',
  plugins: [tailwindcss(), sveltekit()],
  // Bug 1 fix: Force re-bundle dependencies on dev startup to prevent 504 Outdated Optimize Dep
  optimizeDeps: command === 'serve' ? { force: true } : undefined,
  // Ensure imported static assets can be inlined when using
  // kit.output.bundleStrategy = 'inline' (portable file:// build).
  // See SvelteKit configuration docs.
  build: {
    assetsInlineLimit: Infinity,
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress Rollup warnings about @__PURE__ annotations in .svelte.ts files
        // These are added by the Svelte compiler and Rollup removes them automatically
        if (warning.message && warning.message.includes('@__PURE__')) {
          return; // Suppress this warning
        }
        // Suppress sourcemap warnings for .svelte.ts files
        if (warning.message && warning.message.includes('Error when using sourcemap')) {
          return; // Suppress this warning
        }
        // Suppress noisy unused-external-import warnings from third-party node_modules bundles.
        if (
          (warning.code === 'UNUSED_EXTERNAL_IMPORT' ||
            (warning.message?.includes('is imported from external module') &&
              warning.message?.includes('but never used in'))) &&
          (warning.id?.includes('node_modules') || warning.message?.includes('node_modules'))
        ) {
          return;
        }
        // Use default for everything else
        warn(warning);
      }
    }
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true
  }
}));
