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
      {
        extends: true,
        test: {
          name: 'auto-flow',
          include: ['auto-flow/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'shared',
          include: ['shared/**/*.test.ts'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text'],
      include: ['src/**/*.{ts,svelte}', 'convex/**/*.ts', 'auto-flow/**/*.ts', 'shared/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.stories.svelte', 'src/lib/dev/**', 'src/fixtures/**', 'src/scripts/**', 'src/layouts/**', 'src/**/*.contract.ts', 'convex/_generated/**', 'convex/**/*.test.ts', 'auto-flow/**/*.test.ts', 'auto-flow/scripts/**', 'shared/**/*.test.ts'],
    },
  },
});
