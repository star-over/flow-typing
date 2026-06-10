import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'src',
          include: ['src/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'convex',
          include: ['convex/**/*.test.ts'],
          environment: 'edge-runtime',
          server: { deps: { inline: ['convex-test'] } },
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text'],
      include: ['src/**/*.{ts,svelte}', 'convex/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.stories.svelte', 'src/fixtures/**', 'src/scripts/**', 'convex/_generated/**', 'convex/**/*.test.ts'],
    },
  },
});
