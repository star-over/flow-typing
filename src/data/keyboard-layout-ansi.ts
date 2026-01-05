/**
 * @file Определяет физический макет клавиатуры стандарта ANSI.
 *
 * @description
 * Этот файл представляет собой "холст" или "геометрию" клавиатуры.
 * Он описывает, какие клавиши существуют, как они сгруппированы по рядам,
 * и их физические свойства, такие как ширина и тип.
 *
 * Структура: Двумерный массив, где каждый вложенный массив представляет собой ряд клавиш.
 *
 * @see{@link /DOMAIN.md}
 * @see{@link /src/interfaces/types.ts}
 */
import { KeyboardLayout } from "@/interfaces/types";

export const keyboardLayoutANSI: KeyboardLayout = [
  // ROW 1
  [
    { keyCapId: "Backquote", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "Digit1", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "Digit2", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "Digit3", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "Digit4", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "Digit5", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "Digit6", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "Digit7", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "Digit8", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "Digit9", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "Digit0", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "Minus", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "Equal", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "Backspace", unitWidth: "2U", type: "SYSTEM" },
  ],
  // ROW 2
  [
    { keyCapId: "Tab", unitWidth: "1.5U", type: "SYSTEM" },
    { keyCapId: "KeyQ", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "KeyW", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "KeyE", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "KeyR", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "KeyT", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "KeyY", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "KeyU", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "KeyI", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "KeyO", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "KeyP", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "BracketLeft", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "BracketRight", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "Backslash", unitWidth: "1.5U", type: "SYMBOL" },
  ],
  // ROW 3
  [
    { keyCapId: "CapsLock", unitWidth: "1.75U", type: "SYSTEM" },
    { keyCapId: "KeyA", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "KeyS", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "KeyD", unitWidth: "1U", type: "SYMBOL", homeKeyMarker: "BAR" },
    { keyCapId: "KeyF", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "KeyG", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "KeyH", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "KeyJ", unitWidth: "1U", type: "SYMBOL", homeKeyMarker: "BAR" },
    { keyCapId: "KeyK", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "KeyL", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "Semicolon", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "Quote", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "Enter", unitWidth: "2U", type: "SYSTEM" },
  ],
  // ROW 4
  [
    { keyCapId: "ShiftLeft", unitWidth: "2U", type: "MODIFIER" },
    { keyCapId: "KeyZ", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "KeyX", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "KeyC", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "KeyV", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "KeyB", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "KeyN", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "KeyM", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "Comma", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "Period", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "Slash", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "ShiftRight", unitWidth: "2.5U", type: "MODIFIER" },
  ],
  // ROW 5
  [
    { keyCapId: "ControlLeft", unitWidth: "1.25U", type: "MODIFIER" },
    { keyCapId: "AltLeft", unitWidth: "1.25U", type: "MODIFIER" },
    { keyCapId: "MetaLeft", unitWidth: "1.25U", type: "MODIFIER" },
    { keyCapId: "SpaceLeft", unitWidth: "3U", type: "SYMBOL" },
    { keyCapId: "SpaceRight", unitWidth: "3U", type: "SYMBOL" },
    { keyCapId: "MetaRight", unitWidth: "1.25U", type: "MODIFIER" },
    { keyCapId: "AltRight", unitWidth: "1.25U", type: "MODIFIER" },
    { keyCapId: "ContextMenu", unitWidth: "1.25U", type: "SYSTEM" },
    { keyCapId: "ControlRight", unitWidth: "1.25U", type: "MODIFIER" }
  ]
]
