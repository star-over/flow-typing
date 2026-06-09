<script lang="ts">
  import { settings, updateSettings } from '@/lib/settings';
  import Select from './Select.svelte';
  import type { UserSettings } from '@/interfaces/user-settings';
  import type { Dictionary } from '@/interfaces/types';
  import { setTheme, THEMES, type ThemeSetting } from '@/themes/registry';

  interface Props {
    onBack: () => void;
    dictionary: Dictionary;
  }

  const { onBack, dictionary }: Props = $props();

  const interfaceLanguages = $derived([
    { value: 'en' as const, label: dictionary.options.interfaceLanguages.en },
    { value: 'ru' as const, label: dictionary.options.interfaceLanguages.ru },
  ]);

  const themeOptions = $derived.by(() => {
    const lightThemes = THEMES
      .filter((t) => t.colorScheme === 'light')
      .map((t) => ({ value: t.id, label: dictionary.options.themes[t.id] }));
    const darkThemes = THEMES
      .filter((t) => t.colorScheme === 'dark')
      .map((t) => ({ value: t.id, label: dictionary.options.themes[t.id] }));

    return [
      { value: 'auto', label: dictionary.options.themes.auto },
      { label: dictionary.settings.theme_group_light, options: lightThemes },
      { label: dictionary.settings.theme_group_dark, options: darkThemes },
    ];
  });
</script>

<div class="settings-page">
  <h2>{dictionary.settings.title}</h2>

  <label class="field">
    <span class="label-text">{dictionary.settings.interface_language_label}</span>
    <Select
      value={$settings.interfaceLanguage}
      options={interfaceLanguages}
      onChange={(v) => updateSettings({ interfaceLanguage: v as UserSettings['interfaceLanguage'] })}
    />
  </label>

  <label class="field">
    <span class="label-text">{dictionary.settings.theme_label}</span>
    <Select
      value={$settings.theme}
      options={themeOptions}
      onChange={(v) => setTheme(v as ThemeSetting)}
    />
  </label>

  <button type="button" class="btn" onclick={onBack}>
    {dictionary.settings.back_button}
  </button>
</div>

<style>
  .settings-page {
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
    color: var(--settings-page-label-color);
  }

  .btn {
    margin-top: var(--spacing-4);
    padding: var(--spacing-2) var(--spacing-4);
    border-radius: var(--radius-3);
    border: var(--settings-page-btn-border);
    background: var(--settings-page-btn-background);
    color: var(--settings-page-btn-color);
    cursor: pointer;
    align-self: flex-start;
  }

  .btn:hover {
    background: var(--settings-page-btn-hover-background);
  }
</style>
