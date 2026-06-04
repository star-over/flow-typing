<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import type { ComponentProps } from 'svelte';
  import Finger from './Finger.svelte';
  import { HAND_VIEW_BOX } from '@/data/finger-paths';

  const { Story } = defineMeta({
    title: 'UI/Finger',
    component: Finger,
    args: { fingerId: 'L2', state: 'TARGET' },
    argTypes: {
      fingerId: {
        control: 'select',
        options: ['L1', 'L2', 'L3', 'L4', 'L5', 'LB', 'R1', 'R2', 'R3', 'R4', 'R5', 'RB'],
      },
      state: {
        control: 'select',
        options: ['NONE', 'TARGET', 'INACTIVE', 'ERROR'],
      },
    },
    parameters: { layout: 'centered' },
  });
</script>

{#snippet template(args: ComponentProps<typeof Finger>)}
  <svg width="240" viewBox={HAND_VIEW_BOX} xmlns="http://www.w3.org/2000/svg">
    <Finger {...args} />
  </svg>
{/snippet}

<Story name="L1Target" args={{ fingerId: 'L1', state: 'TARGET' }} {template} />
<Story name="L2Target" args={{ fingerId: 'L2', state: 'TARGET' }} {template} />
<Story name="L3Target" args={{ fingerId: 'L3', state: 'TARGET' }} {template} />
<Story name="L4Target" args={{ fingerId: 'L4', state: 'TARGET' }} {template} />
<Story name="L5Target" args={{ fingerId: 'L5', state: 'TARGET' }} {template} />
<Story name="LBTarget" args={{ fingerId: 'LB', state: 'TARGET' }} {template} />
<Story name="L2Inactive" args={{ fingerId: 'L2', state: 'INACTIVE' }} {template} />
<Story name="L2None" args={{ fingerId: 'L2', state: 'NONE' }} {template} />
<Story name="L2Error" args={{ fingerId: 'L2', state: 'ERROR' }} {template} />
