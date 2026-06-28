<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import RhythmChannel from './RhythmChannel.svelte';

  // Канал — time-driven: каждый инкремент `beatIndex` = удар (прыжок + последующее
  // оседание). В Storybook бей по стрелке контрола `beatIndex`, чтобы увидеть прыжок
  // маркера и плавное падение к центру. В покое маркер стоит в центре зоны (зелёный).
  const { Story } = defineMeta({
    title: 'UI/RhythmChannel',
    component: RhythmChannel,
    args: {
      beatIndex: 0,
      ariaLabel: 'Typing rhythm indicator',
    },
    argTypes: {
      beatIndex: { control: { type: 'number', min: 0 }, description: 'Счётчик ударов — бей, чтобы толкнуть маркер' },
      ariaLabel: { control: 'text' },
    },
  });
</script>

<Story name="Default" />
