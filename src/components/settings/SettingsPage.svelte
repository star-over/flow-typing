<script lang="ts">
  import { settings, updateSettings } from '@/lib/settings';
  import Button from '@/components/ui/Button.svelte';
  import Select from '@/components/ui/Select.svelte';
  import Field from '@/components/ui/Field.svelte';
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
    <Field label={dictionary.settings.display_name_label} hint={dictionary.settings.display_name_description}>
      <input
        class="text-input"
        type="text"
        value={$settings.displayName}
        placeholder={accountName || dictionary.settings.display_name_placeholder}
        oninput={(e) => updateSettings({ displayName: e.currentTarget.value })}
      />
    </Field>
  {/if}

  <Field label={dictionary.settings.theme_label}>
    <Select
      value={$settings.theme}
      options={themeOptions}
      onChange={(v) => setTheme(v as ThemeSetting)}
    />
  </Field>

  <TrainingSettingsSection {dictionary} />

  {#if onDeleteAccount !== null}
    <div class="danger-zone">
      {#if !confirming}
        <Button
          variant="danger"
          type="button"
          onclick={() => {
            confirming = true;
            errored = false;
          }}
        >
          {dictionary.settings.delete_account_button}
        </Button>
      {:else}
        <p class="danger-warning">{dictionary.settings.delete_account_warning}</p>
        <div class="danger-actions">
          <Button variant="danger" type="button" disabled={deleting} onclick={confirmDelete}>
            {deleting
              ? dictionary.settings.delete_account_pending
              : dictionary.settings.delete_account_confirm}
          </Button>
          <Button
            variant="neutral"
            type="button"
            disabled={deleting}
            onclick={() => {
              confirming = false;
            }}
          >
            {dictionary.settings.delete_account_cancel}
          </Button>
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

  .text-input {
    padding: var(--spacing-2) var(--spacing-4);
    border-radius: var(--radius-3);
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text-primary);
    font: inherit;
  }

  .text-input::placeholder {
    color: var(--color-text-primary);
    opacity: 0.5;
  }

  .text-input:focus-visible {
    outline: var(--focus-ring-width) solid var(--color-text-primary);
    outline-offset: var(--focus-ring-offset);
  }

  .danger-zone {
    margin-top: var(--spacing-6);
    padding-top: var(--spacing-6);
    border-top: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
    align-items: flex-start;
  }

  .danger-actions {
    display: flex;
    gap: var(--spacing-3);
  }

  .danger-warning {
    font-size: var(--font-size-sm);
    color: var(--color-error);
    max-width: 100%;
  }

  .danger-error {
    font-size: var(--font-size-xs);
    color: var(--color-error);
  }

  .privacy-link {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    text-decoration: underline;
    text-underline-offset: 2px;
    align-self: flex-start;
  }
</style>
