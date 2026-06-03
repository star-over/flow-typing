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

<Story name="Wide1_25U" args={{ symbol: 'Ctrl', unitWidth: '1.25U' }} />

<Story name="Wide1_5U" args={{ symbol: 'Tab', unitWidth: '1.5U' }} />

<Story name="Wide1_75U" args={{ symbol: 'Caps', unitWidth: '1.75U' }} />

<Story name="Wide2U" args={{ symbol: 'Shift', unitWidth: '2U' }} />

<Story name="Wide2_5U" args={{ symbol: 'Shift R', unitWidth: '2.5U' }} />

<Story name="Wide5U" args={{ symbol: 'Space', unitWidth: '5U' }} />
