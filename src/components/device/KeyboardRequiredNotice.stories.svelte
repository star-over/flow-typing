<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import KeyboardRequiredNotice from './KeyboardRequiredNotice.svelte';

  const { Story } = defineMeta({
    title: 'device/KeyboardRequiredNotice',
    component: KeyboardRequiredNotice,
    args: {
      onContinue: () => {},
    },
  });
</script>

<Story
  name="Russian"
  args={{
    title: 'Нужна физическая клавиатура',
    body: 'FlowTyping — компьютерный тренажёр слепой печати. Для набора нужна физическая клавиатура — откройте его на компьютере.',
    continueLabel: 'Продолжить всё равно',
  }}
/>

<Story
  name="English"
  args={{
    title: 'A physical keyboard is required',
    body: 'FlowTyping is a touch-typing trainer built for the desktop. Typing needs a physical keyboard — open it on a computer.',
    continueLabel: 'Continue anyway',
  }}
/>
