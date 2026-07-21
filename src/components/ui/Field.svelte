<script lang="ts">
  /**
   * Поле формы: вертикальная колонка «подпись → поле ввода → подсказка».
   * Доменно-нейтральный лист — знает только про переданные строки; само поле
   * ввода приходит фрагментом. Оборачивает его в `<label>` (неявная связь
   * подписи с элементом). `hint` опционален.
   */
  import type { Snippet } from 'svelte';

  const {
    label,
    hint,
    children,
  }: {
    label: string;
    hint?: string;
    children: Snippet;
  } = $props();
</script>

<label class="field">
  <span class="label-text">{label}</span>
  {@render children()}
  {#if hint !== undefined}
    <span class="hint">{hint}</span>
  {/if}
</label>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .label-text {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .hint {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
  }
</style>
