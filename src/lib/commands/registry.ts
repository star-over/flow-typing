/**
 * @file Единый реестр команд приложения (ADR 0032): источник истины для
 * диспетчера сочетаний клавиш и визуальных подсказок (KeyHint). Новая команда =
 * одна запись в COMMANDS. Поля будущей палитры (group/keywords/titleKey)
 * осознанно НЕ заводятся до её появления (YAGNI) — добавятся вместе с ней.
 *
 * Распознавание — по `KeyboardEvent.code` (физическая позиция), НЕ по `key`:
 * сочетания обязаны работать независимо от активной символьной раскладки
 * (qwerty/йцукен): Cmd+, на русской раскладке даёт key='ю', но code='Comma'.
 * `mod` = Cmd на macOS / Ctrl на остальных; проверяется по metaKey || ctrlKey.
 */
import type { KeyCapId } from '@/interfaces/key-cap-id';

/**
 * Аккорд: физическая клавиша + обязательный командный модификатор (mod или
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

export type CommandId = 'OPEN_SETTINGS' | 'OPEN_STATS';

/** Роуты, в которые умеют уводить команды (значения resolve() из $app/paths). */
export type CommandRoute = '/settings' | '/stats';

export interface CommandContext {
  /** appActor в состоянии training — для гейта when: 'not-typing'. */
  readonly isTraining: boolean;
  /** Навигация на роут (в +layout — обёртка над goto(resolve(route))). */
  readonly navigate: (route: CommandRoute) => void;
}

export interface Command {
  readonly id: CommandId;
  /** Нет binding → команда без сочетания и подсказки (заготовка под палитру). */
  readonly binding?: KeyBinding;
  /** 'not-typing' глушит команду, пока appActor в training. */
  readonly when: 'always' | 'not-typing';
  readonly run: (context: CommandContext) => void;
}

export const COMMANDS: readonly Command[] = [
  {
    id: 'OPEN_SETTINGS',
    binding: { mod: true, code: 'Comma' },
    when: 'always',
    run: ({ navigate }) => navigate('/settings'),
  },
];

/** Достаёт команду по id; отсутствие — программная ошибка (реестр статичен). */
export function getCommand(id: CommandId): Command {
  const command = COMMANDS.find((candidate) => candidate.id === id);
  if (!command) throw new Error(`Unknown command: ${id}`);
  return command;
}
