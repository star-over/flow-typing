<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import type { ComponentProps } from 'svelte';
  import NavArrow from './NavArrow.svelte';
  import { KEY_CAP_NAVIGATION_ARROWS } from '@/interfaces/types';

  const { Story } = defineMeta({
    title: 'UI/NavArrow',
    component: NavArrow,
    args: { direction: 'UP' },
    argTypes: {
      direction: {
        options: KEY_CAP_NAVIGATION_ARROWS,
        control: 'inline-radio',
      },
    },
    parameters: { layout: 'centered' },
  });
</script>

{#snippet template(args: ComponentProps<typeof NavArrow>)}
  <div class="demo-cap">
    <span class="demo-label">A</span>
    <NavArrow direction={args.direction} />
  </div>
{/snippet}

<Story name="Up" args={{ direction: 'UP' }} {template} />
<Story name="Down" args={{ direction: 'DOWN' }} {template} />
<Story name="Left" args={{ direction: 'LEFT' }} {template} />
<Story name="Right" args={{ direction: 'RIGHT' }} {template} />
<Story name="None" args={{ direction: 'NONE' }} {template} />

<style>
  .demo-cap {
    position: relative;
    width: 36px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--body-background);
    border: 1px dashed var(--keycap-color);
    border-radius: var(--radius-2);
    color: var(--keycap-color);
    font-family: var(--font-mono);
    font-size: 13px;
    margin: 64px;
  }

  .demo-label {
    user-select: none;
  }
</style>
