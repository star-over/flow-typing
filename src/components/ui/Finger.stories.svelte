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
    argTypes: {
      fingerId: {
        control: 'select',
        options: ['L1', 'L2', 'L3', 'L4', 'L5', 'LB', 'R1', 'R2', 'R3', 'R4', 'R5', 'RB'],
      },
    },
  });
</script>

<Story name="Default" />

<Story name="Active" args={{ isActive: true }} />

<Story name="L2Index" args={{ fingerId: 'L2' }} />

<Story name="R1Thumb" args={{ fingerId: 'R1' }} />

<Story name="R1ThumbActive" args={{ fingerId: 'R1', isActive: true }} />
