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
    { keyCapId: "Backquote",  label: "`\u202F~", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "Digit1",     label: "1\u202F!", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "Digit2",     label: "2\u202F@", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "Digit3",     label: "3\u202F#", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "Digit4",     label: "4\u202F$", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "Digit5",     label: "5\u202F%", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "Digit6",     label: "6\u202F^", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "Digit7",     label: "7\u202F&", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "Digit8",     label: "8\u202F*", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "Digit9",     label: "9\u202F(", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "Digit0",     label: "0\u202F)", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "Minus",      label: "-\u202F_", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "Equal",      label: "=\u202F+", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "Backspace",  label: "del", unitWidth: "2U", type: "SYSTEM" },
  ],
  // ROW 2
  [
    { keyCapId: "Tab", label: "Tab", unitWidth: "1.5U", type: "SYSTEM" },
    { keyCapId: "KeyQ", label: "Q", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "KeyW", label: "W", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "KeyE", label: "E", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "KeyR", label: "R", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "KeyT", label: "T", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "KeyY", label: "Y", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "KeyU", label: "U", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "KeyI", label: "I", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "KeyO", label: "O", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "KeyP", label: "P", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "BracketLeft", label: "[\u202F{", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "BracketRight", label: "]\u202F}", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "Backslash", label: "\\\u202F|", unitWidth: "1.5U", type: "SYMBOL" },
  ],
  // ROW 3
  [
    { keyCapId: "CapsLock", label: "Caps", unitWidth: "1.75U", type: "SYSTEM" },
    { keyCapId: "KeyA", label: "A", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "KeyS", label: "S", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "KeyD", label: "D", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "KeyF", label: "F", unitWidth: "1U", type: "SYMBOL", homeKeyMarker: "BAR" },
    { keyCapId: "KeyG", label: "G", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "KeyH", label: "H", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "KeyJ", label: "J", unitWidth: "1U", type: "SYMBOL", homeKeyMarker: "BAR" },
    { keyCapId: "KeyK", label: "K", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "KeyL", label: "L", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "Semicolon", label: ";\u202F:", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "Quote", label: `'\u202F"`, unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "Enter", label: "Enter", unitWidth: "2U", type: "SYSTEM" },
  ],
  // ROW 4
  [
    { keyCapId: "ShiftLeft", label: "Shift L", unitWidth: "2U", type: "MODIFIER" },
    { keyCapId: "KeyZ", label: "Z", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "KeyX", label: "X", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "KeyC", label: "C", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "KeyV", label: "V", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "KeyB", label: "B", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "KeyN", label: "N", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "KeyM", label: "M", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "Comma", label: ",\u202F<", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "Period", label: ".\u202F.", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "Slash", label: "/\u202F?", unitWidth: "1U", type: "SYMBOL" },
    { keyCapId: "ShiftRight", label: "Shift R", unitWidth: "2.5U", type: "MODIFIER" },
  ],
  // ROW 5
  [
    { keyCapId: "ControlLeft", label: "^", unitWidth: "1.25U", type: "MODIFIER" },
    { keyCapId: "AltLeft", label: "⌥", unitWidth: "1.25U", type: "MODIFIER" },
    { keyCapId: "MetaLeft", label: "⌘", unitWidth: "1.25U", type: "MODIFIER" },
    { keyCapId: "Space", label: "Space", unitWidth: "5U", type: "SYMBOL" },
    { keyCapId: "MetaRight", label: "⌘", unitWidth: "1.25U", type: "MODIFIER" },
    { keyCapId: "AltRight", label: "⌥", unitWidth: "1.25U", type: "MODIFIER" },
    { keyCapId: "ContextMenu", label: "xx", unitWidth: "1.25U", type: "SYSTEM" },
    { keyCapId: "ControlRight", label: " ^", unitWidth: "1.25U", type: "MODIFIER" }
  ]
];
