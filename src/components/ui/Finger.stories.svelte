<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Finger from './Finger.svelte';

  const { Story } = defineMeta({
    title: 'UI/Finger',
    component: Finger,
    args: {
      fingerId: 'L1',
      isActive: false,
    },
  });
</script>

<Story name="Default" />

<Story name="Active" args={{ isActive: true }} />

<Story name="L2Index">
  {#snippet template(args)}
    <svg viewBox="0 0 100 100" width="100" height="100">
      <Finger {...args} fingerId="L2">
        <path d="M10 10 L90 90" fill="currentColor" />
      </Finger>
    </svg>
  {/snippet}
</Story>

<Story name="R1Thumb" args={{ fingerId: 'R1' }} />

<Story name="R1ThumbActive" args={{ fingerId: 'R1', isActive: true }} />
