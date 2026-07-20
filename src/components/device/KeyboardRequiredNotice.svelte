<script lang="ts">
  // Предупреждение для тач-трафика: набор требует физической клавиатуры
  // (тренажёр десктопный by nature). Мягкий гейт, не блок — «Продолжить всё
  // равно» пропускает дальше, если эвристика обнаружения соврала (планшет с
  // клавиатурой). Презентационный: строки и обратный вызов приходят пропсами, разметка
  // читает только глобальные тему-токены (как .app-error в +layout) — свой
  // контракт темы не нужен.
  const {
    title,
    body,
    continueLabel,
    onContinue,
  }: {
    title: string;
    body: string;
    continueLabel: string;
    onContinue: () => void;
  } = $props();
</script>

<div class="keyboard-required">
  <h1 class="keyboard-required__title">{title}</h1>
  <p class="keyboard-required__body">{body}</p>
  <button type="button" class="keyboard-required__action" onclick={onContinue}>
    {continueLabel}
  </button>
</div>

<style>
  .keyboard-required {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-3);
    max-width: 28rem;
    margin: auto;
    text-align: center;
  }

  .keyboard-required__title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-text-primary);
  }

  .keyboard-required__body {
    color: var(--color-text-secondary);
  }

  .keyboard-required__action {
    margin-top: var(--spacing-2);
    padding: var(--spacing-2) var(--spacing-4);
    border-radius: var(--radius-3);
    border: 1px solid var(--color-text-secondary);
    background: transparent;
    color: var(--color-text-primary);
    font-family: var(--font-sans);
    font-size: 0.875rem;
    cursor: pointer;
  }

  .keyboard-required__action:hover {
    border-color: var(--color-text-primary);
  }

  .keyboard-required__action:focus-visible {
    outline: var(--focus-ring-width) solid var(--color-text-primary);
    outline-offset: var(--focus-ring-offset);
  }
</style>
