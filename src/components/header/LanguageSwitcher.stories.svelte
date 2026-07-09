<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import LanguageSwitcher from './LanguageSwitcher.svelte';

  const { Story } = defineMeta({
    title: 'header/LanguageSwitcher',
    component: LanguageSwitcher,
  });
</script>

<Story name="Default">
  <LanguageSwitcher />
</Story>
