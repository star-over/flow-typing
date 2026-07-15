<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import RhythmChannel from './RhythmChannel.svelte';

  // Канал — time-driven: каждый инкремент `beatIndex` = удар. Кромка прыгает и сбегает
  // к рецептору по центру (он вспыхивает зелёным на проходе). В Storybook бей по стрелке
  // управления `beatIndex`, чтобы увидеть прыжок и плавное оседание. В покое кромка стоит
  // на рецепторе (зелёный). Тап в зоне — держишь темп; вне зоны маркер и заливка янтарные,
  // сторону сноса несёт позиция (правее — частишь, левее — тормозишь).
  const { Story } = defineMeta({
    title: 'UI/RhythmChannel',
    component: RhythmChannel,
    args: {
      beatIndex: 0,
      ariaLabel: 'Typing rhythm indicator',
    },
    argTypes: {
      beatIndex: { control: { type: 'number', min: 0 }, description: 'Счётчик ударов — бей, чтобы толкнуть кромку' },
      ariaLabel: { control: 'text' },
    },
  });
</script>

<Story name="Default" />
