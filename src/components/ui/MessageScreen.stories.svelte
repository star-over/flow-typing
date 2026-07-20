<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import MessageScreen from './MessageScreen.svelte';

  const { Story } = defineMeta({
    title: 'ui/MessageScreen',
    component: MessageScreen,
  });

  const noop = () => {};
</script>

<Story
  name="Without note"
  args={{
    title: 'Something went wrong',
    body: 'The page failed to render. Reloading usually helps.',
    actionLabel: 'Reload',
    onAction: noop,
  }}
/>

<Story
  name="With note"
  args={{
    title: 'Page not found',
    body: 'This address does not exist. Check the link or go back to the start.',
    note: '404',
    actionLabel: 'Reload',
    onAction: noop,
  }}
/>

<Story
  name="Long text"
  args={{
    title: 'A physical keyboard is required to continue training',
    body: 'FlowTyping is a touch-typing trainer built for the desktop. Typing needs a physical keyboard — open it on a computer, or continue anyway if this device has one attached.',
    actionLabel: 'Continue anyway',
    onAction: noop,
  }}
/>
