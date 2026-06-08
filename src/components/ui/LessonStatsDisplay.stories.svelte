<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import LessonStatsDisplay from './LessonStatsDisplay.svelte';
  import type { LessonStats } from '@/lib/stats-calculator';
  import enDictionary from '../../../dictionaries/en.json';

  const goodPerformanceStats: LessonStats = {
    durationInSeconds: 60.059,
    totalCharacters: 15,
    totalAttempts: 15,
    accuracy: 88.89,
    cpm: 55.94,
    wpm: 11.19,
  };

  const averagePerformanceStats: LessonStats = {
    durationInSeconds: 4,
    totalCharacters: 10,
    totalAttempts: 12,
    accuracy: 83.33,
    cpm: 150,
    wpm: 30,
  };

  const { Story } = defineMeta({
    title: 'UI/LessonStatsDisplay',
    component: LessonStatsDisplay,
    argTypes: {
      stats: { table: { disable: true } },
      dictionary: { table: { disable: true } },
    },
    args: {
      stats: goodPerformanceStats,
      dictionary: enDictionary,
    },
  });
</script>

<Story name="GoodPerformance" />

<Story name="AveragePerformance" args={{ stats: averagePerformanceStats }} />
