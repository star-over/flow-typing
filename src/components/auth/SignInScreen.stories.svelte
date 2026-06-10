<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import SignInScreen from './SignInScreen.svelte';
  import StorybookAuthFrame from './StorybookAuthFrame.svelte';

  const { Story } = defineMeta({
    title: 'auth/SignInScreen',
    component: SignInScreen,
  });
</script>

{#snippet template()}
  <StorybookAuthFrame state={{ status: 'guest' }}>
    <SignInScreen />
  </StorybookAuthFrame>
{/snippet}

<Story name="Default" {template} />
