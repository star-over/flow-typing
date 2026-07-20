<script lang="ts">
  import type { KeyCapId } from '@/interfaces/key-cap-id';
  import type { KeyBinding } from '@/lib/user-actions/user-actions';
  import { isTouchOnlyDevice } from '@/lib/device';
  import { formatBinding, formatKeyCapGlyph, getPlatform } from '@/lib/platform';

  /**
   * Два режима: аккорд из реестра действий (`binding` — «⌘ + ,») или голая
   * клавиша (`code` — «Esc») для навигационных клавиш FSM (пауза/рестарт,
   * app.machine). Синхронизация code с картой клавиш машины — ручная:
   * машины читают свои литералы, диспетчер реестра их не обрабатывает.
   */
  type Props =
    | { binding: KeyBinding; code?: never }
    | { code: KeyCapId; binding?: never };

  const { binding, code }: Props = $props();

  // Глифы модификаторов (⌘⌥⇧) не входят в unicode-range Geist Mono —
  // рендерим --font-sans, а не --font-mono (system-ui на Mac их покрывает).
  // aria-hidden: подсказка — визуальный дубль; сочетание для AT объявлено
  // aria-keyshortcuts на триггере (кнопка/пункт меню).
  const touchOnly = isTouchOnlyDevice();

  // Одна пилюля на весь аккорд: «⌘ + ,» читается как одновременное
  // нажатие; раздельные <kbd> выглядели бы как последовательность.
  const label = $derived(
    binding !== undefined
      ? formatBinding({ binding, platform: getPlatform() }).join(' + ')
      : formatKeyCapGlyph(code),
  );
</script>

{#if !touchOnly}
  <kbd class="key-hint" aria-hidden="true">{label}</kbd>
{/if}

<style>
  /* Тихий хром (DESIGN.md): плоский бейдж на существующих ролях. Текст —
     text-primary: на xs/sm-размере muted-глиф нечитаем (точка и запятая
     сливаются), контраст primary на surface-accent проходит WCAG во всех
     темах (решение 2026-07-20, ADR 0032). */
  .key-hint {
    display: inline-flex;
    align-items: center;
    padding: 0.0625rem var(--spacing-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-2);
    background: var(--color-surface-accent);
    color: var(--color-text-primary);
    font-family: var(--font-sans);
    font-size: var(--font-size-sm);
    line-height: 1.3;
    white-space: nowrap;
    user-select: none;
  }
</style>
