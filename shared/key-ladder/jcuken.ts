/**
 * @file Рукотворная KeyLadder для раскладки йцукен. Шаги нарезаны вручную —
 * по пальцам (учебная программа). Геометрия/палец — из finger-layout-asdf.
 * Правится здесь же; версию поднимать, когда лестница уже использовалась для
 * расчёта таблицы отбора (иначе — та же dev-итерация).
 *
 * Шаги:
 *   0 — пробел + указательные (L2+R2), без цифр
 *   1 — средние (L3+R3)
 *   2 — безымянный левый (L4)
 *   3 — безымянный правый (R4)
 *   4 — мизинец левый (L5): буквы
 *   5 — мизинец правый (R5): ближние (з ж .)
 *   6 — Shift (открывает заглавные и шифтовую пунктуацию)
 *   7 — мизинец правый (R5): дальние (х ъ э \)
 *   8 — цифровой ряд (1234567890 - =)
 *   9 — ё (Backquote)
 */
import type { KeyLadder, KeyLadderEntry } from './types.ts';

function rung({ step, keys }: { step: number; keys: string[] }): KeyLadderEntry[] {
  return keys.map((keyCapId) => ({ keyCapId, step }));
}

export const jcukenKeyLadder: KeyLadder = {
  symbolLayoutId: 'йцукен',
  version: 1,
  keys: [
    // 0 — пробел + указательные
    ...rung({ step: 0, keys: ['Space', 'KeyR', 'KeyT', 'KeyF', 'KeyG', 'KeyV', 'KeyB', 'KeyY', 'KeyU', 'KeyH', 'KeyJ', 'KeyN', 'KeyM'] }),
    // 1 — средние
    ...rung({ step: 1, keys: ['KeyE', 'KeyD', 'KeyC', 'KeyI', 'KeyK', 'Comma'] }),
    // 2 — безымянный левый
    ...rung({ step: 2, keys: ['KeyW', 'KeyS', 'KeyX'] }),
    // 3 — безымянный правый
    ...rung({ step: 3, keys: ['KeyO', 'KeyL', 'Period'] }),
    // 4 — мизинец левый
    ...rung({ step: 4, keys: ['KeyQ', 'KeyA', 'KeyZ'] }),
    // 5 — мизинец правый, ближние (з ж .)
    ...rung({ step: 5, keys: ['KeyP', 'Semicolon', 'Slash'] }),
    // 6 — Shift
    ...rung({ step: 6, keys: ['ShiftLeft', 'ShiftRight'] }),
    // 7 — мизинец правый, дальние (х ъ э \)
    ...rung({ step: 7, keys: ['BracketLeft', 'BracketRight', 'Quote', 'Backslash'] }),
    // 8 — цифровой ряд
    ...rung({ step: 8, keys: ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal'] }),
    // 9 — ё
    ...rung({ step: 9, keys: ['Backquote'] }),
  ],
};
