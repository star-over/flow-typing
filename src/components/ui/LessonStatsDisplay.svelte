<script lang="ts">
  import type { TypingStream } from '@/interfaces/types';
  import { calculateLessonStats } from '@/lib/stats-calculator';

  interface Props {
    stream: TypingStream;
    dictionary: {
      stats_card: {
        title: string;
        cpm: string;
        wpm: string;
        accuracy: string;
        duration: string;
        units: {
          cpm: string;
          wpm: string;
          accuracy: string;
          duration: string;
        };
      };
    };
  }

  const { stream, dictionary }: Props = $props();

  const stats = $derived(calculateLessonStats(stream));

  const stats_card = $derived(dictionary.stats_card);
</script>

{#if stream.length > 0 && stream.some((s) => s.attempts.length > 0)}
  <div class="stats-display">
    <h2 class="title">{stats_card.title}</h2>
    <div class="grid">
      <div class="stat-item">
        <p class="stat-label">{stats_card.cpm}</p>
        <p class="stat-value">{stats.cpm}<span class="stat-unit">{stats_card.units.cpm}</span></p>
      </div>
      <div class="stat-item">
        <p class="stat-label">{stats_card.wpm}</p>
        <p class="stat-value">{stats.wpm}<span class="stat-unit">{stats_card.units.wpm}</span></p>
      </div>
      <div class="stat-item">
        <p class="stat-label">{stats_card.accuracy}</p>
        <p class="stat-value">{stats.accuracy}<span class="stat-unit">{stats_card.units.accuracy}</span></p>
      </div>
      <div class="stat-item">
        <p class="stat-label">{stats_card.duration}</p>
        <p class="stat-value">{stats.durationInSeconds}<span class="stat-unit">{stats_card.units.duration}</span></p>
      </div>
    </div>
  </div>
{/if}

<style>
  .stats-display {
    width: 100%;
    max-width: 640px;
    padding: var(--spacing-6);
    background-color: var(--color-surface);
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-border);
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
    background-color: var(--color-bg);
    border-radius: var(--radius-md);
  }

  .stat-label {
    font-size: 0.875rem;
    color: var(--color-text-muted);
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-text-primary);
  }

  .stat-unit {
    font-size: 1rem;
    font-weight: 500;
    color: var(--color-text-secondary);
    margin-left: var(--spacing-1);
  }
</style>
