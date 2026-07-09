<script lang="ts">
  import { settings, updateSettings } from '@/lib/settings';
  import { dictionary } from '@/lib/i18n';
  import type { UserSettings } from '@/interfaces/user-settings';

  // Порядок опций фиксирован; надписи — коды из словаря (ADR 0022: все UI-строки в i18n).
  const languages: UserSettings['interfaceLanguage'][] = ['en', 'ru'];
</script>

<span class="language-switcher">
  <svg
    class="language-switcher__globe"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18" />
  </svg>
  <select
    class="language-switcher__select"
    aria-label={$dictionary.settings.interface_language_label}
    value={$settings.interfaceLanguage}
    onchange={(e) =>
      updateSettings({
        interfaceLanguage: e.currentTarget.value as UserSettings['interfaceLanguage'],
      })}
  >
    {#each languages as lang (lang)}
      <option value={lang}>{$dictionary.options.interfaceLanguageCodes[lang]}</option>
    {/each}
  </select>
</span>

<style>
  /* Ghost-хром: прозрачный фон, рамка шапки, цвет наследуется — рифмуется с
     кнопкой паузы. Новых контракт-токенов нет (как у .pause в Header). */
  .language-switcher {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-1);
    padding: var(--spacing-1) var(--spacing-2);
    border: var(--header-border);
    border-radius: var(--radius-2);
    color: inherit;
  }

  .language-switcher__globe {
    width: 0.9rem;
    height: 0.9rem;
    flex-shrink: 0;
    opacity: 0.75;
  }

  /* Нативный select без формы: прозрачный, шрифт/цвет от хрома, своя стрелка. */
  .language-switcher__select {
    appearance: none;
    background: transparent;
    border: none;
    color: inherit;
    font-family: var(--font-sans);
    font-size: 0.875rem;
    line-height: 1;
    /* место справа под свою стрелку */
    padding: 0 var(--spacing-4) 0 0;
    cursor: pointer;
  }

  .language-switcher__select:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }

  /* Стрелка-шеврон mask-приёмом (как в Select.svelte), цвет из currentColor. */
  .language-switcher::after {
    content: '';
    position: absolute;
    right: var(--spacing-2);
    top: 50%;
    transform: translateY(-50%);
    width: 10px;
    height: 10px;
    background: currentColor;
    opacity: 0.6;
    mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='10' height='10'%3E%3Cpath d='m6 9 6 6 6-6' fill='none' stroke='black' stroke-width='2'/%3E%3C/svg%3E");
    mask-repeat: no-repeat;
    mask-position: center;
    pointer-events: none;
  }
</style>
