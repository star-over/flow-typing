/**
 * @file Определяет "пальцевый" макет для стандартного расположения рук ASDF.
 *
 * @description
 * Этот файл представляет собой "инструкцию" по правильной технике печати.
 * Он определяет, какой палец отвечает за нажатие каждой конкретной клавиши.
 * Также здесь задаются "домашние" клавиши для каждого пальца.
 *
 * Структура: Объект, где ключ - это `KeyCapId`, а значение - объект `FingerKey`,
 * содержащий `fingerId` и опциональный флаг `isHomeKey`.
 *
 * @see{@link /DOMAIN.md}
 * @see{@link /src/interfaces/types.ts}
 */
import { FingerLayout } from "@/interfaces/types";

export const fingerLayoutASDF: FingerLayout = [
  // Left Hand
  { keyCapId: "Backquote",    fingerId: "L5" },
  { keyCapId: "Digit1",       fingerId: "L5" },
  { keyCapId: "Digit2",       fingerId: "L4" },
  { keyCapId: "Digit3",       fingerId: "L3" },
  { keyCapId: "Digit4",       fingerId: "L2" },
  { keyCapId: "Digit5",       fingerId: "L2" },

  { keyCapId: "KeyQ",         fingerId: "L5" },
  { keyCapId: "KeyW",         fingerId: "L4" },
  { keyCapId: "KeyE",         fingerId: "L3" },
  { keyCapId: "KeyR",         fingerId: "L2" },
  { keyCapId: "KeyT",         fingerId: "L2" },

  { keyCapId: "KeyA",         fingerId: "L5", isHomeKey: true },
  { keyCapId: "KeyS",         fingerId: "L4", isHomeKey: true },
  { keyCapId: "KeyD",         fingerId: "L3", isHomeKey: true },
  { keyCapId: "KeyF",         fingerId: "L2", isHomeKey: true },
  { keyCapId: "KeyG",         fingerId: "L2" },

  { keyCapId: "KeyZ",         fingerId: "L5" },
  { keyCapId: "KeyX",         fingerId: "L4" },
  { keyCapId: "KeyC",         fingerId: "L3" },
  { keyCapId: "KeyV",         fingerId: "L2" },
  { keyCapId: "KeyB",         fingerId: "L2" },

  { keyCapId: "Tab",          fingerId: "L5" },
  { keyCapId: "CapsLock",     fingerId: "L5" },
  { keyCapId: "ShiftLeft",    fingerId: "L5" },
  { keyCapId: "ControlLeft",  fingerId: "L5" },
  { keyCapId: "MetaLeft",     fingerId: "L5" },
  { keyCapId: "AltLeft",      fingerId: "L5" },

  // Right Hand
  { keyCapId: "Digit6",       fingerId: "R2" },
  { keyCapId: "Digit7",       fingerId: "R2" },
  { keyCapId: "Digit8",       fingerId: "R3" },
  { keyCapId: "Digit9",       fingerId: "R4" },
  { keyCapId: "Digit0",       fingerId: "R5" },
  { keyCapId: "Minus",        fingerId: "R5" },
  { keyCapId: "Equal",        fingerId: "R5" },
  { keyCapId: "Backspace",    fingerId: "R5" },

  { keyCapId: "KeyY",         fingerId: "R2" },
  { keyCapId: "KeyU",         fingerId: "R2" },
  { keyCapId: "KeyI",         fingerId: "R3" },
  { keyCapId: "KeyO",         fingerId: "R4" },
  { keyCapId: "KeyP",         fingerId: "R5" },
  { keyCapId: "BracketLeft",  fingerId: "R5" },
  { keyCapId: "BracketRight", fingerId: "R5" },
  { keyCapId: "Backslash",    fingerId: "R5" },

  { keyCapId: "KeyH",         fingerId: "R2" },
  { keyCapId: "KeyJ",         fingerId: "R2", isHomeKey: true },
  { keyCapId: "KeyK",         fingerId: "R3", isHomeKey: true },
  { keyCapId: "KeyL",         fingerId: "R4", isHomeKey: true },
  { keyCapId: "Semicolon",    fingerId: "R5", isHomeKey: true },
  { keyCapId: "Quote",        fingerId: "R5" },
  { keyCapId: "Enter",        fingerId: "R5" },

  { keyCapId: "KeyN",         fingerId: "R2" },
  { keyCapId: "KeyM",         fingerId: "R2" },
  { keyCapId: "Comma",        fingerId: "R3" },
  { keyCapId: "Period",       fingerId: "R4" },
  { keyCapId: "Slash",        fingerId: "R5" },

  { keyCapId: "ShiftRight",   fingerId: "R5" },
  { keyCapId: "ControlRight", fingerId: "R5" },
  { keyCapId: "MetaRight",    fingerId: "R5" },
  { keyCapId: "AltRight",     fingerId: "R5" },
  { keyCapId: "Fn",           fingerId: "R5" },
  { keyCapId: "ContextMenu",  fingerId: "R5" },

  { keyCapId: "Space",   fingerId: "R1", isHomeKey: true },
];
