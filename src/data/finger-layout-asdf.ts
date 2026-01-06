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

export const fingerLayoutASDF: FingerLayout = {
  // Left Hand
  "Backquote":    { fingerId: "L5" },
  "Digit1":       { fingerId: "L5" },
  "Digit2":       { fingerId: "L4" },
  "Digit3":       { fingerId: "L3" },
  "Digit4":       { fingerId: "L2" },
  "Digit5":       { fingerId: "L2" },

  "KeyQ":         { fingerId: "L5" },
  "KeyW":         { fingerId: "L4" },
  "KeyE":         { fingerId: "L3" },
  "KeyR":         { fingerId: "L2" },
  "KeyT":         { fingerId: "L2" },

  "KeyA":         { fingerId: "L5", isHomeKey: true },
  "KeyS":         { fingerId: "L4", isHomeKey: true },
  "KeyD":         { fingerId: "L3", isHomeKey: true },
  "KeyF":         { fingerId: "L2", isHomeKey: true },
  "KeyG":         { fingerId: "L2" },

  "KeyZ":         { fingerId: "L5" },
  "KeyX":         { fingerId: "L4" },
  "KeyC":         { fingerId: "L3" },
  "KeyV":         { fingerId: "L2" },
  "KeyB":         { fingerId: "L2" },

  "Tab":          { fingerId: "L5" },
  "CapsLock":     { fingerId: "L5" },
  "ShiftLeft":    { fingerId: "L5" },
  "ControlLeft":  { fingerId: "L5" },
  "MetaLeft":     { fingerId: "L5" },
  "AltLeft":      { fingerId: "L5" },

  "SpaceLeft":    { fingerId: "L1", isHomeKey: true },


  // Right Hand
  "Digit6":       { fingerId: "R2" },
  "Digit7":       { fingerId: "R2" },
  "Digit8":       { fingerId: "R3" },
  "Digit9":       { fingerId: "R4" },
  "Digit0":       { fingerId: "R5" },
  "Minus":        { fingerId: "R5" },
  "Equal":        { fingerId: "R5" },
  "Backspace":    { fingerId: "R5" },

  "KeyY":         { fingerId: "R2" },
  "KeyU":         { fingerId: "R2" },
  "KeyI":         { fingerId: "R3" },
  "KeyO":         { fingerId: "R4" },
  "KeyP":         { fingerId: "R5" },
  "BracketLeft":  { fingerId: "R5" },
  "BracketRight": { fingerId: "R5" },
  "Backslash":    { fingerId: "R5" },

  "KeyH":         { fingerId: "R2" },
  "KeyJ":         { fingerId: "R2", isHomeKey: true },
  "KeyK":         { fingerId: "R3", isHomeKey: true },
  "KeyL":         { fingerId: "R4", isHomeKey: true },
  "Semicolon":    { fingerId: "R5", isHomeKey: true },
  "Quote":        { fingerId: "R5" },
  "Enter":        { fingerId: "R5" },

  "KeyN":         { fingerId: "R2" },
  "KeyM":         { fingerId: "R2" },
  "Comma":        { fingerId: "R3" },
  "Period":       { fingerId: "R4" },
  "Slash":        { fingerId: "R5" },

  "ShiftRight":   { fingerId: "R5" },
  "ControlRight": { fingerId: "R5" },
  "MetaRight":    { fingerId: "R5" },
  "AltRight":     { fingerId: "R5" },
  "Fn":           { fingerId: "R5" },
  "ContextMenu":  { fingerId: "R5" },

  "SpaceRight":   { fingerId: "R1", isHomeKey: true },
};
