<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import SessionStatsDisplay from './SessionStatsDisplay.svelte';
  import type { SessionStats } from '@/lib/stats-calculator';
  import enDictionary from '../../../dictionaries/en.json';

  // Числа согласованы между собой: 72 предъявления за минуту, 64 чистых,
  // медиана 340 мс → темп в движении 176 зн/мин. Разрыв 176 против 72 — это
  // время раздумий, и он тут не случаен: на нём держится пояснение к темпу.
  const stats: SessionStats = {
    elapsedSeconds: 60,
    accuracy: 88.89,
    exposures: 72,
    misses: 8,
    latencyMedianMs: 340,
    paceInMotion: 176.47,
    rhythm: 82,
  };

  const trend = [71, 76, 74, 81, 79, 85, 84].map((accuracy) => ({ accuracy }));

  const { Story } = defineMeta({
    title: 'UI/SessionStatsDisplay',
    component: SessionStatsDisplay,
    argTypes: {
      stats: { table: { disable: true } },
      trend: { table: { disable: true } },
      dictionary: { table: { disable: true } },
    },
    args: {
      stats,
      trend,
      accuracyDelta: 4.9,
      rhythmDelta: 3,
      confusion: { from: 'г', to: 'р', count: 4 },
      dictionary: enDictionary,
    },
  });
</script>

<!-- Обжитой аккаунт: есть история, есть дельты, есть что подсказать. -->
<Story name="WithHistory" />

<!-- Первая сессия: истории нет — ни траектории, ни дельт. Экран обязан
     остаться целым, а не показать пустую рамку графика и «▲ 0». -->
<Story
  name="FirstSession"
  args={{ trend: [], accuracyDelta: undefined, rhythmDelta: undefined, confusion: undefined }}
/>

<!-- Истории мало (2 прошлые сессии): траектории всё ещё нет — на трёх точках
     линия не траектория, — и дельты ритма нет (порог MIN_BASELINE_SAMPLES). -->
<Story
  name="ShortHistory"
  args={{ trend: [{ accuracy: 80 }, { accuracy: 84 }], rhythmDelta: undefined }}
/>

<!-- Ритм не посчитан (меньше 5 интервалов) и латентности нет: показываем «—»,
     а не выдуманный 0 и не Infinity. -->
<Story
  name="NoRhythmNoPace"
  args={{
    stats: { ...stats, rhythm: undefined, latencyMedianMs: 0, paceInMotion: undefined },
    rhythmDelta: undefined,
  }}
/>

<!-- Спад: дельта вниз. Направление несёт глиф ▼, не цвет — хром не красим. -->
<Story
  name="BelowBaseline"
  args={{
    stats: { ...stats, accuracy: 76.4, rhythm: 68 },
    accuracyDelta: -7.2,
    rhythmDelta: -9,
  }}
/>

<!-- Длинная сессия: 15 минут обязаны читаться как 15:00, а не «900 с». -->
<Story
  name="LongSession"
  args={{ stats: { ...stats, elapsedSeconds: 900, exposures: 1080 } }}
/>
