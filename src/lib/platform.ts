/**
 * @file Платформа пользователя + функции форматирования KeyBinding для двух каналов
 * отображения: визуальные глифы (KeyHint) и `aria-keyshortcuts` (WAI-ARIA:
 * клавиша — значением event.key, модификаторы через '+').
 * Паттерн stubGlobal-тестов — как src/lib/device.ts / device.test.ts.
 */
import type { KeyCapId } from '@/interfaces/key-cap-id';
import type { KeyBinding } from './user-actions/user-actions';

export type Platform = 'mac' | 'other';

/**
 * `navigator.platform` deprecated, но универсален; userAgentData нет в
 * Firefox/Safari. Смотрим оба источника — для нашей бинарной задачи
 * (глиф ⌘ против подписи Ctrl) точности достаточно.
 */
export function getPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'other';
  const source = `${navigator.platform} ${navigator.userAgent}`;
  // Токены Intel/PPC — значения navigator.platform (MacIntel и т.п.).
  return /mac os|macintosh|mac(intel|ppc)|iphone|ipad|ipod/i.test(source) ? 'mac' : 'other';
}

const KEY_CAP_GLYPHS: Partial<Record<KeyCapId, string>> = {
  Comma: ',',
  Period: '.',
  Slash: '/',
  Semicolon: ';',
  Quote: "'",
  BracketLeft: '[',
  BracketRight: ']',
  Backquote: '`',
  Backslash: '\\',
  Minus: '-',
  Equal: '=',
  Space: '␣',
  Enter: '↵',
  Escape: 'Esc',
  Tab: '⇥',
  Backspace: '⌫',
};

/** Глиф одиночной клавиши для визуальной подсказки ('Escape' → 'Esc', 'KeyK' → 'K'). */
export function formatKeyCapGlyph(code: KeyCapId): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return KEY_CAP_GLYPHS[code] ?? code;
}

/** Визуальный аккорд: массив глифов, каждый рендерится своим <kbd>. */
export function formatBinding({
  binding,
  platform,
}: {
  binding: KeyBinding;
  platform: Platform;
}): string[] {
  const parts: string[] = [];
  if (platform === 'mac') {
    // Порядок по HIG: ⌥ ⇧ ⌘.
    if (binding.alt) parts.push('⌥');
    if (binding.shift) parts.push('⇧');
    if (binding.mod) parts.push('⌘');
  } else {
    if (binding.mod) parts.push('Ctrl');
    if (binding.alt) parts.push('Alt');
    if (binding.shift) parts.push('Shift');
  }
  parts.push(formatKeyCapGlyph(binding.code));
  return parts;
}

const ARIA_KEY_VALUES: Partial<Record<KeyCapId, string>> = {
  Comma: ',',
  Period: '.',
  Slash: '/',
  Semicolon: ';',
  Quote: "'",
  BracketLeft: '[',
  BracketRight: ']',
  Backquote: '`',
  Backslash: '\\',
  Minus: '-',
  Equal: '=',
  Space: 'Space',
  Enter: 'Enter',
  Escape: 'Escape',
  Tab: 'Tab',
  Backspace: 'Backspace',
};

/** ARIA-значение одиночной клавиши для `aria-keyshortcuts` ('Escape' → 'Escape', 'KeyK' → 'K'). */
export function formatAriaKey(code: KeyCapId): string {
  // Буква заглавная — APG/WAI-ARIA 1.2 записывает non-modifier в верхнем
  // регистре ('Meta+Shift+K'); пунктуация — как есть ('Meta+,').
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return ARIA_KEY_VALUES[code] ?? code;
}

/**
 * Значение `aria-keyshortcuts` на триггере (кнопка/пункт меню).
 * undefined binding → undefined → Svelte не рендерит атрибут.
 */
export function formatAriaBinding({
  binding,
  platform,
}: {
  binding: KeyBinding | undefined;
  platform: Platform;
}): string | undefined {
  if (!binding) return undefined;
  const parts: string[] = [];
  if (binding.mod) parts.push(platform === 'mac' ? 'Meta' : 'Control');
  if (binding.alt) parts.push('Alt');
  if (binding.shift) parts.push('Shift');
  parts.push(formatAriaKey(binding.code));
  return parts.join('+');
}
