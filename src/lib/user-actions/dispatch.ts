/**
 * @file Диспетчер сочетаний клавиш (ADR 0032). Чистые функции поверх
 * структурного среза KeyboardEvent — тестируемо в node-окружении без DOM.
 * Точка встраивания — handleKeyDown в src/routes/+layout.svelte.
 */
import type { StateValue } from 'xstate';
import { isKnownKeyCapId, type KeyCapId } from '@/interfaces/key-cap-id';
import {
  USER_ACTIONS,
  type KeyBinding,
  type UserAction,
  type UserActionContext,
  type UserActionTrigger,
} from './user-actions';

/** Структурный срез KeyboardEvent — ровно то, что читает диспетчер. */
export interface UserActionKeyEvent {
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
 * Аккорд-кандидат в действие: зажат Cmd/Ctrl/Alt и нажата клавиша, которая не
 * является модификатором. Исключения: shift-only — канал печати заглавных; ctrl+alt вместе —
 * AltGr на Windows, тоже печать (ADR 0017); auto-repeat зажатого аккорда
 * гасится, чтобы действие не дёргалось в цикле. Keydown самого модификатора
 * (MetaLeft с metaKey=true) — не аккорд: модификаторы продолжают жить в
 * keyboardMachine, как раньше.
 */
export function isShortcutChord(event: UserActionKeyEvent): boolean {
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

/**
 * true, если код фигурирует как голый key-триггер хотя бы в одном действии
 * реестра. Нужен +layout, чтобы гасить Escape/Enter глобально: иначе в
 * неактивном для действия состоянии нажатие протечёт в keyboardMachine.
 */
export function isUserActionKey(code: KeyCapId): boolean {
  return USER_ACTIONS.some((action) => action.trigger.key === code);
}

function bindingsEqual({
  event,
  binding,
}: {
  event: UserActionKeyEvent;
  binding: KeyBinding;
}): boolean {
  return (
    event.code === binding.code &&
    (event.metaKey || event.ctrlKey) === (binding.mod ?? false) &&
    event.altKey === (binding.alt ?? false) &&
    event.shiftKey === (binding.shift ?? false)
  );
}

/** Голая клавиша: ни одного модификатора — иначе это уже не тот жест. */
function isBareKeyPress(event: UserActionKeyEvent): boolean {
  return !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey;
}

function matchesTrigger({
  event,
  trigger,
}: {
  event: UserActionKeyEvent;
  trigger: UserActionTrigger;
}): boolean {
  if (trigger.binding !== undefined) {
    return isShortcutChord(event) && bindingsEqual({ event, binding: trigger.binding });
  }
  return event.code === trigger.key && isBareKeyPress(event);
}

/** Гейт по состоянию appMachine: 'always' либо хотя бы одно StateValue из списка. */
function passesWhen({
  when,
  context,
}: {
  when: UserAction['when'];
  context: UserActionContext;
}): boolean {
  if (when === 'always') return true;
  const values: readonly StateValue[] = Array.isArray(when) ? when : [when];
  return values.some((value) => context.isActive(value));
}

/**
 * Первое действие, чей гейт when открыт и триггер совпал. Auto-repeat и фокус
 * в поле ввода глушат оба вида триггеров (аккорд и голую клавишу).
 */
export function matchUserAction({
  event,
  actions,
  context,
}: {
  event: UserActionKeyEvent;
  actions: readonly UserAction[];
  context: UserActionContext;
}): UserAction | undefined {
  if (event.repeat) return undefined;
  if (isEditableTarget(event.target)) return undefined;
  return actions.find((action) => {
    if (!passesWhen({ when: action.when, context })) return false;
    return matchesTrigger({ event, trigger: action.trigger });
  });
}

/**
 * Совпадение → выполняет действие и возвращает true (вызывающий гасит
 * браузерный дефолт через preventDefault). Промах → false.
 */
export function dispatchUserAction({
  event,
  context,
}: {
  event: UserActionKeyEvent;
  context: UserActionContext;
}): boolean {
  const action = matchUserAction({ event, actions: USER_ACTIONS, context });
  if (!action) return false;
  action.run(context);
  return true;
}
