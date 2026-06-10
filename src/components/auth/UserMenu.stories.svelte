<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import type { Id } from '../../../convex/_generated/dataModel';
  import StorybookAuthFrame from './StorybookAuthFrame.svelte';
  import UserMenu from './UserMenu.svelte';

  const { Story } = defineMeta({
    title: 'auth/UserMenu',
    component: UserMenu,
  });
</script>

{#snippet loading()}
  <StorybookAuthFrame state={{ status: 'loading' }}>
    <UserMenu />
  </StorybookAuthFrame>
{/snippet}

{#snippet guest()}
  <StorybookAuthFrame state={{ status: 'guest' }}>
    <UserMenu />
  </StorybookAuthFrame>
{/snippet}

{#snippet authenticated()}
  <StorybookAuthFrame
    state={{
      status: 'authenticated',
      user: {
        _id: 'user_demo' as Id<'users'>,
        _creationTime: 0,
        email: 'demo@example.com',
        name: 'Demo User',
      },
    }}
  >
    <UserMenu />
  </StorybookAuthFrame>
{/snippet}

<Story name="Loading" template={loading} />
<Story name="Guest" template={guest} />
<Story name="Authenticated" template={authenticated} />
