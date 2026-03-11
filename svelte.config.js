import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
  preprocess: vitePreprocess(),
  kit: {
    // Goal: a build that works when opening build/index.html directly (file://)
    // - Hash router avoids server-side routing requirements.
    // - Single bundle strategy avoids startup dynamic-import failures on
    //   slower/older WebView runtimes (notably some Windows systems).
    // - Relative paths ensure Windows file:// compatibility.
    // See SvelteKit config docs: kit.router.type = 'hash' and kit.output.bundleStrategy = 'inline'.
    adapter: adapter({ fallback: 'index.html' }),
    paths: {
      relative: true // Enable relative paths for file:// compatibility on all platforms
    },
    router: {
      type: 'hash'
    },
    output: {
      bundleStrategy: 'single'
    }
  }
};

export default config;
