<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import KeyCap from './KeyCap.svelte';

  const { Story } = defineMeta({
    title: 'UI/KeyCap',
    component: KeyCap,
    args: {
      symbol: 'A',
      pressResult: 'NONE',
      isActive: false,
    },
  });
</script>

<Story name="Default" />

<Story name="Correct" args={{ pressResult: 'CORRECT' }} />

<Story name="Error" args={{ pressResult: 'ERROR' }} />

<Story name="Active" args={{ isActive: true }} />
