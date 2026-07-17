<script lang="ts">
  import { settings, updateSettings } from '@/lib/settings';
  import Select from '@/components/ui/Select.svelte';
  import TrainingSettingsSection from './TrainingSettingsSection.svelte';
  import type { Dictionary } from '@/interfaces/types';
  import { setTheme, THEMES, type ThemeSetting } from '@/themes/registry';

  interface Props {
    dictionary: Dictionary;
    /**
     * Оригинальное имя текущего юзера от провайдера (`users.name ?? email`).
     * `null` — гость: поле «отображаемое имя» не показываем (аватара у гостя нет).
     */
    accountName?: string | null;
    /**
     * Обработчик удаления аккаунта (P0-4). Роут даёт его ТОЛЬКО авторизованному
     * юзеру — у гостя аккаунта нет; `null` → danger-зона скрыта. Возвращает
     * Promise: пока идёт — кнопки заблокированы, reject → показываем ошибку.
     * Успех размонтирует компонент (роут делает signOut + redirect).
     */
    onDeleteAccount?: (() => Promise<void>) | null;
  }

  const { dictionary, accountName = null, onDeleteAccount = null }: Props = $props();

  // Двухшаговое подтверждение удаления: idle → confirming → deleting.
  let confirming = $state(false);
  let deleting = $state(false);
  let errored = $state(false);

  async function confirmDelete() {
    if (onDeleteAccount === null) return;
    deleting = true;
    errored = false;
    try {
      await onDeleteAccount();
      // Успех: роут делает signOut + redirect, компонент размонтируется.
    } catch {
      errored = true;
      deleting = false;
      confirming = false;
    }
  }

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

  {#if accountName !== null}
    <label class="field">
      <span class="label-text">{dictionary.settings.display_name_label}</span>
      <input
        class="text-input"
        type="text"
        value={$settings.displayName}
        placeholder={accountName || dictionary.settings.display_name_placeholder}
        oninput={(e) => updateSettings({ displayName: e.currentTarget.value })}
      />
      <span class="hint">{dictionary.settings.display_name_description}</span>
    </label>
  {/if}

  <label class="field">
    <span class="label-text">{dictionary.settings.theme_label}</span>
    <Select
      value={$settings.theme}
      options={themeOptions}
      onChange={(v) => setTheme(v as ThemeSetting)}
    />
  </label>

  <TrainingSettingsSection {dictionary} />

  {#if onDeleteAccount !== null}
    <div class="danger-zone">
      {#if !confirming}
        <button
          type="button"
          class="btn-danger"
          onclick={() => {
            confirming = true;
            errored = false;
          }}
        >
          {dictionary.settings.delete_account_button}
        </button>
      {:else}
        <p class="danger-warning">{dictionary.settings.delete_account_warning}</p>
        <div class="danger-actions">
          <button type="button" class="btn-danger" disabled={deleting} onclick={confirmDelete}>
            {deleting
              ? dictionary.settings.delete_account_pending
              : dictionary.settings.delete_account_confirm}
          </button>
          <button
            type="button"
            class="btn btn-cancel"
            disabled={deleting}
            onclick={() => {
              confirming = false;
            }}
          >
            {dictionary.settings.delete_account_cancel}
          </button>
        </div>
      {/if}
      {#if errored}
        <p class="danger-error">{dictionary.settings.delete_account_error}</p>
      {/if}
    </div>
  {/if}

  <!-- Политика приватности (P0-4): статическая /privacy вне клиентской маршрутизации
       SPA; data-sveltekit-reload = полная навигация (клиентский роутер маршрут не знает).
       Видна всем, включая гостя — danger-зона выше только у авторизованного. -->
  <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
  <a class="privacy-link" href="/privacy" data-sveltekit-reload>{dictionary.app.privacy_policy}</a>
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

  .text-input {
    padding: var(--spacing-2) var(--spacing-4);
    border-radius: var(--radius-3);
    border: var(--settings-page-input-border);
    background: var(--settings-page-input-background);
    color: var(--settings-page-input-color);
    font: inherit;
  }

  .text-input::placeholder {
    color: var(--settings-page-input-color);
    opacity: 0.5;
  }

  .hint {
    font-size: 0.75rem;
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

  .danger-zone {
    margin-top: var(--spacing-6);
    padding-top: var(--spacing-6);
    border-top: var(--settings-page-input-border);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
    align-items: flex-start;
  }

  .btn-danger {
    padding: var(--spacing-2) var(--spacing-4);
    border-radius: var(--radius-3);
    border: var(--settings-page-danger-btn-border);
    background: var(--settings-page-danger-btn-background);
    color: var(--settings-page-danger-btn-color);
    cursor: pointer;
    align-self: flex-start;
    font: inherit;
  }

  .btn-danger:hover:not(:disabled) {
    background: var(--settings-page-danger-btn-hover-background);
  }

  .btn-danger:disabled,
  .btn-cancel:disabled {
    opacity: 0.6;
    cursor: default;
  }

  .danger-actions {
    display: flex;
    gap: var(--spacing-3);
  }

  /* В danger-actions кнопки в один ряд — снимаем top-margin базовой .btn. */
  .btn-cancel {
    margin-top: 0;
  }

  .danger-warning {
    font-size: 0.875rem;
    color: var(--settings-page-danger-text-color);
    max-width: 100%;
  }

  .danger-error {
    font-size: 0.75rem;
    color: var(--settings-page-danger-text-color);
  }

  .privacy-link {
    font-size: 0.75rem;
    color: var(--settings-page-label-color);
    text-decoration: underline;
    text-underline-offset: 2px;
    align-self: flex-start;
  }
</style>
