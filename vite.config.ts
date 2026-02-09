import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // file:// portability: ensure built asset URLs are relative
  base: './',
  plugins: [tailwindcss(), sveltekit()],
  // Ensure imported static assets can be inlined when using
  // kit.output.bundleStrategy = 'inline' (portable file:// build).
  // See SvelteKit configuration docs.
  build: {
    assetsInlineLimit: Infinity
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true
  }
});
