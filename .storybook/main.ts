import type { StorybookConfig } from '@storybook/sveltekit';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(svelte|ts)'],
  addons: [
    '@storybook/addon-a11y',
    '@storybook/addon-svelte-csf',
  ],
  framework: {
    name: '@storybook/sveltekit',
    options: {},
  },
};

export default config;