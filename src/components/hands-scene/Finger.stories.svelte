<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import type { ComponentProps } from 'svelte';
  import Finger from './Finger.svelte';
  import { HAND_VIEW_BOX } from './finger-paths';
  import {
    FINGER_NAVIGATION_ROLES,
    LEFT_HAND_BASE,
    LEFT_HAND_FINGERS,
    RIGHT_HAND_BASE,
    RIGHT_HAND_FINGERS,
  } from '@/interfaces/types';

  const { Story } = defineMeta({
    title: 'UI/Finger',
    component: Finger,
    args: { fingerId: 'L2', navigationRole: 'TARGET' },
    argTypes: {
      centerRef: { table: { disable: true } },
      fingerId: {
        options: [...LEFT_HAND_FINGERS, ...RIGHT_HAND_FINGERS, LEFT_HAND_BASE, RIGHT_HAND_BASE],
        control: 'inline-radio',
      },
      navigationRole: {
        options: FINGER_NAVIGATION_ROLES,
        control: 'inline-radio',
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

<Story name="Default" args={{ fingerId: 'L1', navigationRole: 'NONE' }} {template} />
