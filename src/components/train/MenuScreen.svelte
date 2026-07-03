<!--
  Tech-debt note: MenuScreen намеренно не имеет рядом MenuScreen.contract.ts.
  Компонент пока тонкий и повторно использует существующие токены SettingsPage и
  FooterActions. Когда он стабилизируется — выделить собственные `--menu-screen-*`
  токены и завести контракт на общих условиях (docs/06 §6.2).
  Запись в очереди: docs/backlog.md → «MenuScreen.contract.ts».
-->
<script lang="ts">
  import { settings, updateSettings } from '@/lib/settings';
  import Select from '@/components/ui/Select.svelte';
  import SessionDurationSelector from '@/components/train/SessionDurationSelector.svelte';
  import type {
    Dictionary,
    FingerLayoutId,
    FlowLineCursorType,
    SymbolLayoutId,
    TextLanguage,
  } from '@/interfaces/types';
  import { getCompatibleSymbolLayoutsForTextLanguage } from '@/lib/layouts';

  interface Props {
    dictionary: Dictionary;
    onStart: (params: { symbolLayoutId: SymbolLayoutId; durationSeconds: number }) => void;
  }

  const { dictionary, onStart }: Props = $props();

  const sessionDurationOptions = $derived([
    { seconds: 60, label: dictionary.options.sessionDurations['60'] },
    { seconds: 180, label: dictionary.options.sessionDurations['180'] },
    { seconds: 300, label: dictionary.options.sessionDurations['300'] },
    { seconds: 600, label: dictionary.options.sessionDurations['600'] },
    { seconds: 900, label: dictionary.options.sessionDurations['900'] },
  ]);

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

  const fingerLayouts = $derived([
    { value: 'asdf' as const, label: dictionary.options.fingerLayouts.asdf },
    { value: 'sdfv' as const, label: dictionary.options.fingerLayouts.sdfv },
  ]);

  const cursorTypes = $derived([
    { value: 'RECTANGLE' as const, label: dictionary.options.cursorTypes.RECTANGLE },
    { value: 'UNDERSCORE' as const, label: dictionary.options.cursorTypes.UNDERSCORE },
    { value: 'VERTICAL' as const, label: dictionary.options.cursorTypes.VERTICAL },
  ]);

  const rhythmChannelOptions = $derived([
    { value: 'on', label: dictionary.options.rhythmChannel.on },
    { value: 'off', label: dictionary.options.rhythmChannel.off },
  ]);
</script>

<div class="menu-screen">
  <div class="setup-list">
    <label class="field">
      <span class="label-text">{dictionary.settings.text_language_label}</span>
      <span class="field__control">
        <Select
          value={$settings.textLanguage}
          options={textLanguages}
          onChange={(v) => updateSettings({ textLanguage: v as TextLanguage })}
        />
      </span>
    </label>

    <label class="field">
      <span class="label-text">{dictionary.settings.symbol_layout_label}</span>
      <span class="field__control">
        <Select
          value={$settings.symbolLayoutId}
          options={layoutOptions}
          onChange={(v) => updateSettings({ symbolLayoutId: v as SymbolLayoutId })}
        />
      </span>
    </label>

    <label class="field">
      <span class="label-text">{dictionary.settings.finger_layout_label}</span>
      <span class="field__control">
        <Select
          value={$settings.fingerLayoutId}
          options={fingerLayouts}
          onChange={(v) => updateSettings({ fingerLayoutId: v as FingerLayoutId })}
        />
      </span>
    </label>

    <label class="field">
      <span class="label-text">{dictionary.settings.cursor_type_label}</span>
      <span class="field__control">
        <Select
          value={$settings.cursorType}
          options={cursorTypes}
          onChange={(v) => updateSettings({ cursorType: v as FlowLineCursorType })}
        />
      </span>
    </label>

    <label class="field">
      <span class="label-text">{dictionary.settings.rhythm_channel_label}</span>
      <span class="field__control">
        <Select
          value={$settings.rhythmChannelEnabled ? 'on' : 'off'}
          options={rhythmChannelOptions}
          onChange={(v) => updateSettings({ rhythmChannelEnabled: v === 'on' })}
        />
      </span>
    </label>
  </div>

  <SessionDurationSelector
    label={dictionary.settings.session_duration_label}
    value={$settings.sessionDurationSeconds}
    options={sessionDurationOptions}
    onChange={(v) => updateSettings({ sessionDurationSeconds: v })}
  />

  <button
    type="button"
    class="start-btn"
    onclick={() => onStart({ symbolLayoutId: $settings.symbolLayoutId, durationSeconds: $settings.sessionDurationSeconds })}
  >
    {dictionary.app.start_training}
  </button>
</div>

<style>
  .menu-screen {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-6);
    width: 100%;
    max-width: 23rem;
  }

  /* Компактный список «подпись слева — список справа»: тонкие строки.
     Подпись — фиксированная колонка, список сразу за ней одинаковой
     скромной ширины → подписи и списки выровнены в две колонки, шевроны
     в одну линию, зазор между подписью и списком постоянный. */
  .setup-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }

  .field {
    display: flex;
    align-items: center;
    gap: var(--spacing-4);
  }

  .label-text {
    width: 9.5rem;
    flex-shrink: 0;
    font-size: 0.8125rem;
    color: var(--settings-page-label-color);
  }

  .field__control {
    width: 12.5rem;
    flex-shrink: 0;
  }

  /* Бренд-янтарная CTA — те же токены, что у primary-CTA лендинга
     (`--landing-cta-*`), чтобы «Начать тренировку» выглядела одинаково на `/`
     и на `/train`. */
  .start-btn {
    width: 100%;
    padding: var(--spacing-3) var(--spacing-4);
    border-radius: var(--radius-3);
    border: var(--landing-cta-border);
    background: var(--landing-cta-background);
    color: var(--landing-cta-color);
    font-family: var(--font-sans);
    font-size: 0.9375rem;
    font-weight: 600;
    cursor: pointer;
  }

  .start-btn:hover {
    background: var(--landing-cta-hover-background);
  }

  .start-btn:focus-visible {
    outline: 2px solid var(--landing-cta-background);
    outline-offset: 2px;
  }

  /* Узкие экраны — подпись над списком, обе на всю ширину. */
  @media (max-width: 26rem) {
    .field {
      flex-direction: column;
      align-items: stretch;
      gap: var(--spacing-2);
    }

    .label-text,
    .field__control {
      width: 100%;
    }
  }
</style>
