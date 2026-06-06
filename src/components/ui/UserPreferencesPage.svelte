<script lang="ts">
  import { preferences, updatePreferences } from '@/lib/preferences';
  import Select from './Select.svelte';
  import type { UserPreferences } from '@/interfaces/user-preferences';
  import { getCompatibleSymbolLayoutsForTextLanguage } from '@/data/layouts/layouts';

  interface Props {
    onBack: () => void;
    dictionary: {
      user_preferences: {
        title: string;
        interface_language_label: string;
        text_language_label: string;
        symbol_layout_label: string;
        back_button: string;
      };
      options: {
        interfaceLanguages: Record<UserPreferences['interfaceLanguage'], string>;
        textLanguages: Record<UserPreferences['textLanguage'], string>;
        layouts: Record<UserPreferences['symbolLayoutId'], string>;
      };
    };
  }

  const { onBack, dictionary }: Props = $props();

  const interfaceLanguages = $derived([
    { value: 'en' as const, label: dictionary.options.interfaceLanguages.en },
    { value: 'ru' as const, label: dictionary.options.interfaceLanguages.ru },
  ]);

  const textLanguages = $derived([
    { value: 'en' as const, label: dictionary.options.textLanguages.en },
    { value: 'ru' as const, label: dictionary.options.textLanguages.ru },
  ]);

  // Опции раскладок зависят от выбранного textLanguage.
  const layoutOptions = $derived(
    getCompatibleSymbolLayoutsForTextLanguage($preferences.textLanguage)
      .map(d => ({
        value: d.symbolLayoutId,
        label: dictionary.options.layouts[d.symbolLayoutId],
      }))
  );
</script>

<div class="preferences-page">
  <h2>{dictionary.user_preferences.title}</h2>

  <label class="field">
    <span class="label-text">{dictionary.user_preferences.interface_language_label}</span>
    <Select
      value={$preferences.interfaceLanguage}
      options={interfaceLanguages}
      onChange={(v) => updatePreferences({ interfaceLanguage: v as UserPreferences['interfaceLanguage'] })}
    />
  </label>

  <label class="field">
    <span class="label-text">{dictionary.user_preferences.text_language_label}</span>
    <Select
      value={$preferences.textLanguage}
      options={textLanguages}
      onChange={(v) => updatePreferences({ textLanguage: v as UserPreferences['textLanguage'] })}
    />
  </label>

  <label class="field">
    <span class="label-text">{dictionary.user_preferences.symbol_layout_label}</span>
    <Select
      value={$preferences.symbolLayoutId}
      options={layoutOptions}
      onChange={(v) => updatePreferences({ symbolLayoutId: v as UserPreferences['symbolLayoutId'] })}
    />
  </label>

  <button type="button" class="btn" onclick={onBack}>
    {dictionary.user_preferences.back_button}
  </button>
</div>

<style>
  .preferences-page {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-6);
    max-width: 400px;
    width: 100%;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .label-text {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }

  .btn {
    margin-top: var(--spacing-4);
    padding: var(--spacing-2) var(--spacing-4);
    border-radius: var(--radius-3);
    border: 1px solid var(--color-border);
    background-color: var(--color-surface);
    color: var(--color-text-primary);
    cursor: pointer;
    align-self: flex-start;
  }

  .btn:hover {
    background-color: var(--color-surface-hover);
  }
</style>
