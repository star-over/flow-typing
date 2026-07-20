<script lang="ts">
  /**
   * Экран-сообщение: центрированная колонка с заголовком, пояснением и одним
   * действием. Доменно-нейтральный лист — знает только про переданные строки,
   * поэтому одинаково обслуживает фатальную ошибку приложения, страницу 404 и
   * мягкий гейт устройства.
   *
   * Действие обязательно: экран без выхода — тупик. Опциональный `note` — для
   * технической приписки под текстом (статус-код HTTP); строку готовит
   * вызывающий, компонент не форматирует числа.
   *
   * Собственного отступа не имеет: все вызовы живут внутри `main.main`
   * (`src/routes/+layout.svelte`), который центрирует flex-колонкой.
   */
  const {
    title,
    body,
    note,
    actionLabel,
    onAction,
  }: {
    title: string;
    body: string;
    note?: string;
    actionLabel: string;
    onAction: () => void;
  } = $props();
</script>

<div class="message-screen">
  <h1 class="message-screen__title">{title}</h1>
  <p class="message-screen__body">{body}</p>
  {#if note !== undefined}
    <p class="message-screen__note">{note}</p>
  {/if}
  <button type="button" class="message-screen__action" onclick={onAction}>
    {actionLabel}
  </button>
</div>

<style>
  .message-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-3);
    max-width: 28rem;
    text-align: center;
  }

  .message-screen__title {
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }

  .message-screen__body {
    color: var(--color-text-secondary);
  }

  /* tabular-nums — под статус-код: для нецифрового текста no-op. */
  .message-screen__note {
    color: var(--color-text-secondary);
    font-variant-numeric: tabular-nums;
  }

  /* Ghost-кнопка: контур на прозрачном фоне — тихий хром (DESIGN.md).
     Единственное действие экрана, поэтому заливка не нужна. */
  .message-screen__action {
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

  .message-screen__action:hover {
    border-color: var(--color-text-primary);
  }

  .message-screen__action:focus-visible {
    outline: var(--focus-ring-width) solid var(--color-text-primary);
    outline-offset: var(--focus-ring-offset);
  }
</style>
