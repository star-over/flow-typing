/**
 * @file Единый реестр пользовательских действий (ADR 0032): источник истины
 * выполнения И отображения — KeyHint и aria-keyshortcuts читают триггер
 * отсюда. Связь действие ↔ триггер строго 1:1: ровно один аккорд с
 * модификатором ИЛИ одна голая клавиша, без альтернатив — иначе подсказка
 * врала бы о том, что слушает диспетчер. Поля будущей палитры
 * (group/keywords/titleKey) осознанно НЕ заводятся до её появления (YAGNI) —
 * добавятся вместе с ней.
 *
 * Распознавание — по `KeyboardEvent.code` (физическая позиция), НЕ по `key`:
 * сочетания обязаны работать независимо от активной символьной раскладки
 * (qwerty/йцукен): Cmd+, на русской раскладке даёт key='ю', но code='Comma'.
 * `mod` = Cmd на macOS / Ctrl на остальных; проверяется по metaKey || ctrlKey.
 */
import type { StateValue } from 'xstate';
import type { KeyCapId } from '@/interfaces/key-cap-id';
import type { SymbolLayoutId } from '@/interfaces/types';
import type { AppEvent } from '@/machines/app.machine';

/**
 * Аккорд: физическая клавиша + обязательный модификатор действия (mod или
 * alt), опционально shift. Тип сужен под поведение диспетчера: binding из
 * одного shift не совпадёт с нажатием никогда (shift — канал печати
 * заглавных), поэтому запрещён типом — иначе KeyHint показывал бы сочетание,
 * которое не слушаем.
 */
export type KeyBinding = {
  readonly code: KeyCapId;
  readonly shift?: boolean;
} & (
  | { readonly mod: true; readonly alt?: boolean }
  | { readonly alt: true; readonly mod?: boolean }
);

/**
 * Триггер действия: РОВНО ОДИН — аккорд с модификатором ИЛИ одиночная клавиша
 * (1:1 с подсказкой KeyHint). Альтернативных триггеров у действия нет.
 */
export type UserActionTrigger =
  | { readonly binding: KeyBinding; readonly key?: never }
  | { readonly key: KeyCapId; readonly binding?: never };

export type UserActionId =
  | 'OPEN_SETTINGS'
  | 'OPEN_STATS'
  | 'PAUSE_TRAINING'
  | 'RESUME_TRAINING'
  | 'RESTART_TRAINING';

/** Роуты, в которые умеют уводить действия (значения resolve() из $app/paths). */
export type UserActionRoute = '/settings' | '/stats';

export interface UserActionContext {
  /** appMachine в указанном состоянии (обёртка inState над актуальным снимком). */
  readonly isActive: (value: StateValue) => boolean;
  /** Отправить событие в appMachine. */
  readonly send: (event: AppEvent) => void;
  /** Навигация на роут (в +layout — обёртка над goto(resolve(route))). */
  readonly navigate: (route: UserActionRoute) => void;
  /** Параметры свежей сессии для RESTART_TRAINING (UI владеет настройками). */
  readonly trainingParams: {
    readonly symbolLayoutId: SymbolLayoutId;
    readonly durationSeconds: number;
  };
}

export interface UserAction {
  readonly id: UserActionId;
  /** Ровно один триггер на действие — 1:1 с визуальной подсказкой. */
  readonly trigger: UserActionTrigger;
  /** Активно всегда, или только в перечисленных состояниях appMachine. */
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents -- литерал 'always' осознанно избыточен: документирует контракт для читателя
  readonly when: 'always' | StateValue | readonly StateValue[];
  readonly run: (context: UserActionContext) => void;
}

export const USER_ACTIONS: readonly UserAction[] = [
  {
    id: 'OPEN_SETTINGS',
    trigger: { binding: { mod: true, code: 'Comma' } },
    when: 'always',
    run: ({ navigate }) => navigate('/settings'),
  },
  {
    id: 'OPEN_STATS',
    trigger: { binding: { mod: true, code: 'Period' } },
    when: 'always',
    run: ({ navigate }) => navigate('/stats'),
  },
  {
    id: 'PAUSE_TRAINING',
    trigger: { key: 'Escape' },
    when: { training: 'running' },
    run: ({ send }) => send({ type: 'PAUSE' }),
  },
  {
    id: 'RESUME_TRAINING',
    trigger: { key: 'Escape' },
    when: { training: 'paused' },
    run: ({ send }) => send({ type: 'RESUME' }),
  },
  {
    id: 'RESTART_TRAINING',
    trigger: { key: 'Enter' },
    when: [{ training: 'paused' }, 'sessionComplete', 'sessionError'],
    run: ({ send, trainingParams }) => send({ type: 'START_TRAINING', ...trainingParams }),
  },
];

/** Достаёт действие по id; отсутствие — программная ошибка (реестр статичен). */
export function getUserAction(id: UserActionId): UserAction {
  const action = USER_ACTIONS.find((candidate) => candidate.id === id);
  if (!action) throw new Error(`Unknown user action: ${id}`);
  return action;
}

/**
 * Пропсы KeyHint для триггера действия: аккорд отдаётся как `binding`, голая
 * клавиша — как `code` (форма пропсов KeyHint 1:1). Разбор формы триггера
 * живёт здесь одним местом — компоненты его не повторяют.
 */
export function keyHintPropsForTrigger(
  trigger: UserActionTrigger,
): { binding: KeyBinding } | { code: KeyCapId } {
  return trigger.binding !== undefined ? { binding: trigger.binding } : { code: trigger.key };
}
