<script lang="ts">
  import { dictionary } from '@/lib/i18n';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
</script>

<div class="stats-page">
  <h2 class="screen-title">{$dictionary.app.stats_screen_title}</h2>
  <button type="button" class="btn" onclick={() => goto(resolve('/'))}>
    {$dictionary.settings.back_button}
  </button>
</div>

<style>
  .stats-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-6);
  }

  .screen-title {
    font-size: 1.5rem;
    font-weight: 700;
  }

  .btn {
    padding: var(--spacing-2) var(--spacing-4);
    border-radius: var(--radius-3);
    border: var(--settings-page-btn-border);
    background: var(--settings-page-btn-background);
    color: var(--settings-page-btn-color);
    cursor: pointer;
  }

  .btn:hover {
    background: var(--settings-page-btn-hover-background);
  }
</style>
