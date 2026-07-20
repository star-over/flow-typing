<script lang="ts">
  import { page } from '$app/state';
  import { dictionary } from '@/lib/i18n';

  // Страница ошибки навигации SvelteKit (404, сбой перехода). Рендерится
  // внутри +layout — Header с логотипом/навигацией остаётся живым, поэтому здесь
  // достаточно объяснить и предложить перезагрузку. Все надписи — из словаря
  // (ADR 0022); статус-код — число, не переводимая строка.
</script>

<div class="error-page">
  <h1 class="error-page__title">{$dictionary.app.error_title}</h1>
  <p class="error-page__body">{$dictionary.app.error_body}</p>
  {#if page.status}
    <p class="error-page__status">{page.status}</p>
  {/if}
  <button type="button" class="error-page__action" onclick={() => location.reload()}>
    {$dictionary.app.reload}
  </button>
</div>

<style>
  .error-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-3);
    max-width: 28rem;
    margin: 4rem auto;
    text-align: center;
  }

  .error-page__title {
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }

  .error-page__body {
    color: var(--color-text-secondary);
  }

  .error-page__status {
    color: var(--color-text-secondary);
    font-variant-numeric: tabular-nums;
  }

  .error-page__action {
    margin-top: var(--spacing-2);
    padding: var(--spacing-2) var(--spacing-4);
    border-radius: var(--radius-3);
    border: 1px solid var(--color-text-secondary);
    background: transparent;
    color: var(--color-text-primary);
    font-family: var(--font-sans);
    font-size: var(--font-size-sm);
    cursor: pointer;
  }

  .error-page__action:hover {
    border-color: var(--color-text-primary);
  }

  .error-page__action:focus-visible {
    outline: var(--focus-ring-width) solid var(--color-text-primary);
    outline-offset: var(--focus-ring-offset);
  }
</style>
