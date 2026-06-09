<!--
  Tech-debt note: MenuScreen намеренно не имеет рядом MenuScreen.contract.ts.
  Компонент пока тонкий и переиспользует существующие токены SettingsPage и
  FooterActions. Когда он стабилизируется как самостоятельная сущность —
  выделить собственные `--menu-screen-*` токены и завести контракт на общих
  условиях. См. docs/06 §6.2 и docs/superpowers/plans/2026-06-09-screen-routing-and-menu-refactor.md (Task 6).
-->
<script lang="ts">
  import { settings, updateSettings } from '@/lib/settings';
  import Select from './Select.svelte';
  import type { Dictionary, SymbolLayoutId, TextLanguage } from '@/interfaces/types';
  import { getCompatibleSymbolLayoutsForTextLanguage } from '@/lib/layouts';

  interface Props {
    dictionary: Dictionary;
    onStart: (params: { symbolLayoutId: SymbolLayoutId }) => void;
  }

  const { dictionary, onStart }: Props = $props();

  const textLanguages = $derived([
    { value: 'en' as const, label: dictionary.options.textLanguages.en },
    { value: 'ru' as const, label: dictionary.options.textLanguages.ru },
  ]);

  const layoutOptions = $derived(
    getCompatibleSymbolLayoutsForTextLanguage($settings.textLanguage)
      .map(d => ({
        value: d.symbolLayoutId,
        label: dictionary.options.layouts[d.symbolLayoutId],
      }))
  );
</script>

<div class="menu-screen">
  <label class="field">
    <span class="label-text">{dictionary.settings.text_language_label}</span>
    <Select
      value={$settings.textLanguage}
      options={textLanguages}
      onChange={(v) => updateSettings({ textLanguage: v as TextLanguage })}
    />
  </label>

  <label class="field">
    <span class="label-text">{dictionary.settings.symbol_layout_label}</span>
    <Select
      value={$settings.symbolLayoutId}
      options={layoutOptions}
      onChange={(v) => updateSettings({ symbolLayoutId: v as SymbolLayoutId })}
    />
  </label>

  <button
    type="button"
    class="btn primary"
    onclick={() => onStart({ symbolLayoutId: $settings.symbolLayoutId })}
  >
    {dictionary.app.start_training}
  </button>
</div>

<style>
  .menu-screen {
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
    padding: var(--spacing-2) var(--spacing-4);
    border-radius: var(--radius-3);
    border: var(--footer-actions-btn-primary-border);
    background: var(--footer-actions-btn-primary-background);
    color: var(--footer-actions-btn-primary-color);
    font-family: var(--font-sans);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    align-self: stretch;
  }

  .btn:hover {
    opacity: 0.9;
  }
</style>
