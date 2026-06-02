import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      fallback: 'index.html',
      precompress: false,
    }),
    alias: {
      '$lib': './src/lib',
      '$machines': './src/machines',
      '$components': './src/components',
      '$data': './src/data',
      '$interfaces': './src/interfaces',
      '$user-preferences': './src/user-preferences',
      '@': './src',
    },
  },
};

export default config;
