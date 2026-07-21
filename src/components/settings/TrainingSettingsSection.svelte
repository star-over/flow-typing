<script lang="ts">
  import { settings, updateSettings } from '@/lib/settings';
  import Select from '@/components/ui/Select.svelte';
  import Field from '@/components/ui/Field.svelte';
  import SessionDurationSelector from './SessionDurationSelector.svelte';
  import { getCompatibleSymbolLayoutsForTextLanguage } from '@/lib/layouts';
  import type {
    Dictionary,
    FingerLayoutId,
    FlowLineCursorType,
    SymbolLayoutId,
    TextLanguage,
  } from '@/interfaces/types';

  interface Props {
    dictionary: Dictionary;
  }

  const { dictionary }: Props = $props();

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

<div class="training-section">
  <h3 class="section-title">{dictionary.settings.training_group}</h3>

  <Field label={dictionary.settings.text_language_label} hint={dictionary.settings.text_language_description}>
    <Select
      value={$settings.textLanguage}
      options={textLanguages}
      onChange={(v) => updateSettings({ textLanguage: v as TextLanguage })}
    />
  </Field>

  <Field label={dictionary.settings.symbol_layout_label} hint={dictionary.settings.symbol_layout_description}>
    <Select
      value={$settings.symbolLayoutId}
      options={layoutOptions}
      onChange={(v) => updateSettings({ symbolLayoutId: v as SymbolLayoutId })}
    />
  </Field>

  <Field label={dictionary.settings.finger_layout_label} hint={dictionary.settings.finger_layout_description}>
    <Select
      value={$settings.fingerLayoutId}
      options={fingerLayouts}
      onChange={(v) => updateSettings({ fingerLayoutId: v as FingerLayoutId })}
    />
  </Field>

  <Field label={dictionary.settings.cursor_type_label} hint={dictionary.settings.cursor_type_description}>
    <Select
      value={$settings.cursorType}
      options={cursorTypes}
      onChange={(v) => updateSettings({ cursorType: v as FlowLineCursorType })}
    />
  </Field>

  <Field label={dictionary.settings.rhythm_channel_label} hint={dictionary.settings.rhythm_channel_description}>
    <Select
      value={$settings.rhythmChannelEnabled ? 'on' : 'off'}
      options={rhythmChannelOptions}
      onChange={(v) => updateSettings({ rhythmChannelEnabled: v === 'on' })}
    />
  </Field>

  <SessionDurationSelector
    label={dictionary.settings.session_duration_label}
    value={$settings.sessionDurationSeconds}
    options={sessionDurationOptions}
    onChange={(v) => updateSettings({ sessionDurationSeconds: v })}
  />
</div>

<style>
  .training-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }

  .section-title {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-secondary);
  }
</style>
