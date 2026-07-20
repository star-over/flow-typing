/**
 * @file Диспетчер сочетаний клавиш (ADR 0032). Чистые функции поверх
 * структурного среза KeyboardEvent — тестируемо в node-окружении без DOM.
 * Точка встраивания — handleKeyDown в src/routes/+layout.svelte.
 */
import { isKnownKeyCapId, type KeyCapId } from '@/interfaces/key-cap-id';
import { COMMANDS, type Command, type CommandContext, type KeyBinding } from './registry';

/** Структурный срез KeyboardEvent — ровно то, что читает диспетчер. */
export interface CommandKeyEvent {
  readonly code: string;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly shiftKey: boolean;
  readonly repeat: boolean;
  readonly target: EventTarget | null;
}

const MODIFIER_KEY_CAP_IDS: readonly KeyCapId[] = [
  'AltLeft',
  'AltRight',
  'ControlLeft',
  'ControlRight',
  'MetaLeft',
  'MetaRight',
  'ShiftLeft',
  'ShiftRight',
];

/**
 * Аккорд-кандидат в команду: зажат Cmd/Ctrl/Alt и нажата клавиша, которая не
 * является модификатором. Исключения: shift-only — канал печати заглавных; ctrl+alt вместе —
 * AltGr на Windows, тоже печать (ADR 0017); auto-repeat зажатого аккорда
 * гасится, чтобы команда не дёргалась в цикле. Keydown самого модификатора
 * (MetaLeft с metaKey=true) — не аккорд: модификаторы продолжают жить в
 * keyboardMachine, как раньше.
 */
export function isCommandChord(event: CommandKeyEvent): boolean {
  if (event.repeat) return false;
  if (event.ctrlKey && event.altKey) return false;
  if (!event.metaKey && !event.ctrlKey && !event.altKey) return false;
  if (!isKnownKeyCapId(event.code)) return false;
  return !MODIFIER_KEY_CAP_IDS.includes(event.code);
}

/**
 * Фокус в поле ввода — сочетания не перехватываем (displayName и Select в
 * /settings, форма /signin). Duck-typing вместо instanceof: unit-тесты идут
 * в node-окружении без DOM-классов (паттерн stubGlobal из device.test.ts).
 */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (target === null || typeof target !== 'object') return false;
  // Обоснование `as`: структурная проверка вместо instanceof HTMLElement —
  // DOM-классов нет в node-окружении тестов.
  const element = target as Partial<HTMLElement>;
  return (
    element.isContentEditable === true ||
    element.tagName === 'INPUT' ||
    element.tagName === 'TEXTAREA' ||
    element.tagName === 'SELECT'
  );
}

function bindingsEqual({
  event,
  binding,
}: {
  event: CommandKeyEvent;
  binding: KeyBinding;
}): boolean {
  return (
    event.code === binding.code &&
    (event.metaKey || event.ctrlKey) === (binding.mod ?? false) &&
    event.altKey === (binding.alt ?? false) &&
    event.shiftKey === (binding.shift ?? false)
  );
}

export function matchCommand({
  event,
  commands,
  isTraining,
}: {
  event: CommandKeyEvent;
  commands: readonly Command[];
  isTraining: boolean;
}): Command | undefined {
  if (!isCommandChord(event)) return undefined;
  if (isEditableTarget(event.target)) return undefined;
  return commands.find((command) => {
    if (command.binding === undefined) return false;
    if (command.when === 'not-typing' && isTraining) return false;
    return bindingsEqual({ event, binding: command.binding });
  });
}

/**
 * Совпадение → выполняет команду и возвращает true (вызывающий гасит
 * браузерный дефолт через preventDefault). Промах → false.
 */
export function dispatchCommand({
  event,
  context,
}: {
  event: CommandKeyEvent;
  context: CommandContext;
}): boolean {
  const command = matchCommand({ event, commands: COMMANDS, isTraining: context.isTraining });
  if (!command) return false;
  command.run(context);
  return true;
}
