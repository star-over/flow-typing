/**
 * @file Единый реестр действий приложения (ADR 0032): источник истины для
 * диспетчера сочетаний клавиш и визуальных подсказок (KeyHint). Новое действие =
 * одна запись в USER_ACTIONS. Поля будущей палитры (group/keywords/titleKey)
 * осознанно НЕ заводятся до её появления (YAGNI) — добавятся вместе с ней.
 *
 * Распознавание — по `KeyboardEvent.code` (физическая позиция), НЕ по `key`:
 * сочетания обязаны работать независимо от активной символьной раскладки
 * (qwerty/йцукен): Cmd+, на русской раскладке даёт key='ю', но code='Comma'.
 * `mod` = Cmd на macOS / Ctrl на остальных; проверяется по metaKey || ctrlKey.
 */
import type { KeyCapId } from '@/interfaces/key-cap-id';

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

export type UserActionId = 'OPEN_SETTINGS' | 'OPEN_STATS';

/** Роуты, в которые умеют уводить действия (значения resolve() из $app/paths). */
export type UserActionRoute = '/settings' | '/stats';

export interface UserActionContext {
  /** appActor в состоянии training — для гейта when: 'not-typing'. */
  readonly isTraining: boolean;
  /** Навигация на роут (в +layout — обёртка над goto(resolve(route))). */
  readonly navigate: (route: UserActionRoute) => void;
}

export interface UserAction {
  readonly id: UserActionId;
  /** Нет binding → действие без сочетания и подсказки (заготовка под палитру). */
  readonly binding?: KeyBinding;
  /** 'not-typing' глушит действие, пока appActor в training. */
  readonly when: 'always' | 'not-typing';
  readonly run: (context: UserActionContext) => void;
}

export const USER_ACTIONS: readonly UserAction[] = [
  {
    id: 'OPEN_SETTINGS',
    binding: { mod: true, code: 'Comma' },
    when: 'always',
    run: ({ navigate }) => navigate('/settings'),
  },
  {
    id: 'OPEN_STATS',
    binding: { mod: true, code: 'Period' },
    when: 'always',
    run: ({ navigate }) => navigate('/stats'),
  },
];

/** Достаёт действие по id; отсутствие — программная ошибка (реестр статичен). */
export function getUserAction(id: UserActionId): UserAction {
  const action = USER_ACTIONS.find((candidate) => candidate.id === id);
  if (!action) throw new Error(`Unknown user action: ${id}`);
  return action;
}
