<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import SessionStatsDisplay from './SessionStatsDisplay.svelte';
  import type { SessionStats } from '@/lib/stats-calculator';
  import enDictionary from '../../../dictionaries/en.json';

  const goodPerformanceStats: SessionStats = {
    durationInSeconds: 60,
    accuracy: 88.89,
    cpm: 55.94,
    wpm: 11.19,
  };

  const averagePerformanceStats: SessionStats = {
    durationInSeconds: 4,
    accuracy: 83.33,
    cpm: 150,
    wpm: 30,
  };

  const { Story } = defineMeta({
    title: 'UI/SessionStatsDisplay',
    component: SessionStatsDisplay,
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
