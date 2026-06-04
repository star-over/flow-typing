<script lang="ts">
  import { preferences, updatePreferences } from '$lib/preferences';
  import Select from './Select.svelte';
  import type { UserPreferences } from '$interfaces/user-preferences';

  interface Props {
    onBack: () => void;
    dictionary: {
      user_preferences: {
        title: string;
        language_label: string;
        keyboard_layout_label: string;
        back_button: string;
      };
    };
  }

  let { onBack, dictionary }: Props = $props();

  const languages: Array<{ value: UserPreferences['language']; label: string }> = [
    { value: 'en', label: 'English' },
    { value: 'ru', label: 'Русский' },
  ];

  const layouts: Array<{ value: UserPreferences['keyboardLayout']; label: string }> = [
    { value: 'qwerty', label: 'QWERTY' },
    { value: 'йцукен', label: 'ЙЦУКЕН' },
  ];
</script>

<div class="preferences-page">
  <h2>{dictionary.user_preferences.title}</h2>

  <label class="field">
    <span class="label-text">{dictionary.user_preferences.language_label}</span>
    <Select
      value={$preferences.language}
      options={languages}
      onChange={(v) => updatePreferences({ language: v as UserPreferences['language'] })}
    />
  </label>

  <label class="field">
    <span class="label-text">{dictionary.user_preferences.keyboard_layout_label}</span>
    <Select
      value={$preferences.keyboardLayout}
      options={layouts}
      onChange={(v) => updatePreferences({ keyboardLayout: v as UserPreferences['keyboardLayout'] })}
    />
  </label>

  <button class="btn" onclick={onBack}>
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
    border-radius: var(--radius-md);
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
