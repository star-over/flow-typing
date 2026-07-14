<script lang="ts">
  import type { SessionStats } from '@/lib/stats-calculator';
  import type { Dictionary } from '@/interfaces/types';

  interface Props {
    stats: SessionStats;
    dictionary: Dictionary;
  }

  const { stats, dictionary }: Props = $props();
  const stats_card = $derived(dictionary.stats_card);

  // Презентационное округление: CPM/WPM/duration читаемее как целые,
  // accuracy показываем с одним знаком — у неё дробная часть бывает
  // информативна (95.5 vs 100).
  const display = $derived({
    cpm: Math.round(stats.cpm),
    wpm: Math.round(stats.wpm),
    accuracy: stats.accuracy.toFixed(1),
    duration: Math.round(stats.durationInSeconds),
  });
</script>

<div class="stats-display">
  <h2 class="title">{stats_card.title}</h2>
  <div class="grid">
    <div class="stat-item">
      <p class="stat-label">{stats_card.cpm}</p>
      <p class="stat-value">{display.cpm}<span class="stat-unit">{stats_card.units.cpm}</span></p>
    </div>
    <div class="stat-item">
      <p class="stat-label">{stats_card.wpm}</p>
      <p class="stat-value">{display.wpm}<span class="stat-unit">{stats_card.units.wpm}</span></p>
    </div>
    <div class="stat-item">
      <p class="stat-label">{stats_card.accuracy}</p>
      <p class="stat-value">{display.accuracy}<span class="stat-unit">{stats_card.units.accuracy}</span></p>
    </div>
    <div class="stat-item">
      <p class="stat-label">{stats_card.duration}</p>
      <p class="stat-value">{display.duration}<span class="stat-unit">{stats_card.units.duration}</span></p>
    </div>
  </div>
</div>

<style>
  .stats-display {
    width: 100%;
    max-width: 640px;
    padding: var(--spacing-6);
    background: var(--session-stats-display-background);
    border-radius: var(--radius-4);
    border: var(--session-stats-display-border);
  }

  .title {
    font-size: 1.25rem;
    font-weight: 700;
    margin-bottom: var(--spacing-4);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-4);
  }

  @media (min-width: 768px) {
    .grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-4);
    background: var(--session-stats-display-item-background);
    border-radius: var(--radius-3);
    /* `min-width: 0` отключает grid-default min-content sizing — без него
     * stat-item не сжимается ниже ширины своего контента и весь grid
     * расширяется за пределы родителя при длинных значениях. */
    min-width: 0;
  }

  .stat-label {
    font-size: 0.875rem;
    color: var(--session-stats-display-label-color);
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--session-stats-display-value-color);
  }

  .stat-unit {
    font-size: 1rem;
    font-weight: 500;
    color: var(--session-stats-display-unit-color);
    margin-left: var(--spacing-1);
  }
</style>
