import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
  preprocess: vitePreprocess(),
  kit: {
    // Goal: a build that works when opening build/index.html directly (file://)
    // - Hash router avoids server-side routing requirements.
    // - Inline bundle strategy removes runtime JS chunk fetches entirely.
    //   This avoids tauri.localhost module fetch misses on some Windows installs.
    // - Relative paths ensure Windows file:// compatibility.
    // See SvelteKit config docs: kit.router.type = 'hash' and kit.output.bundleStrategy = 'inline'.
    adapter: adapter({ fallback: '200.html' }),
    paths: {
      relative: true // Enable relative paths for file:// compatibility on all platforms
    },
    router: {
      type: 'hash'
    },
    output: {
      bundleStrategy: 'inline'
    }
  }
};

export default config;
