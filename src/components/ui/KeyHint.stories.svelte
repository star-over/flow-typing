<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import KeyHint from './KeyHint.svelte';

  const { Story } = defineMeta({
    title: 'UI/KeyHint',
    component: KeyHint,
  });
</script>

<Story name="Mod + comma" args={{ binding: { mod: true, code: 'Comma' } }} />
<Story name="Mod + period" args={{ binding: { mod: true, code: 'Period' } }} />
<Story name="Mod + shift + K" args={{ binding: { mod: true, shift: true, code: 'KeyK' } }} />
