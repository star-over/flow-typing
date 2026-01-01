// https://github.com/toptal/keycodes/blob/main/lib/keycodes/with-events.ts
// https://www.toptal.com/developers/keycode

// event.codes
export type KeyCapId =
  | "Unknown"            // Unknown symbol for edge cases

  | "AltLeft"            // Alt
  | "AltRight"           // Alt Graph
  | "ArrowDown"          // ArrowDown
  | "ArrowLeft"          // ArrowLeft
  | "ArrowRight"         // ArrowRight
  | "ArrowUp"            // ArrowUp
  | "Backspace"          // Backspace
  | "CapsLock"           // CapsLock
  | "ContextMenu"        // ContextMenu
  | "ControlLeft"        // Control Left
  | "ControlRight"       // Control Right
  | "Enter"              // Enter
  | "Escape"             // Escape
  | "Fn"                 // Unidentified
  | "Lang"               // Unidentified
  | "MetaLeft"           // Mac Command | WIN
  | "MetaRight"          // Mac Command | WIN
  | "ShiftLeft"          // Shift Left
  | "ShiftRight"         // Shift Right
  | "Tab"                // Tab

  | "Backquote"          // ` / ~
  | "Backslash"          // \ / |
  | "BracketLeft"        // [ / {
  | "BracketRight"       // ] / }
  | "Comma"              // , / <

  | "Digit0"             // 0 / )
  | "Digit1"             // 1 / !
  | "Digit2"             // 2 / @
  | "Digit3"             // 3 / #
  | "Digit4"             // 4 / $
  | "Digit5"             // 5 / %
  | "Digit6"             // 6 / ^
  | "Digit7"             // 7 / &
  | "Digit8"             // 8 / *
  | "Digit9"             // 9 / (

  | "Equal"              // = / +
  | "KeyA"               // a
  | "KeyB"               // b
  | "KeyC"               // c
  | "KeyD"               // d
  | "KeyE"               // e
  | "KeyF"               // f
  | "KeyG"               // g
  | "KeyH"               // h
  | "KeyI"               // i
  | "KeyJ"               // j
  | "KeyK"               // k
  | "KeyL"               // l
  | "KeyM"               // m
  | "KeyN"               // n
  | "KeyO"               // o
  | "KeyP"               // p
  | "KeyQ"               // q
  | "KeyR"               // r
  | "KeyS"               // s
  | "KeyT"               // t
  | "KeyU"               // u
  | "KeyV"               // v
  | "KeyW"               // w
  | "KeyX"               // x
  | "KeyY"               // y
  | "KeyZ"               // z

  | "Minus"              // - / _
  | "Period"             // . / >
  | "Quote"              // ' / "
  | "Semicolon"          // ; / :
  | "Slash"              // / / ?
  | "Space"              // " "
  | "SpaceLeft"          // " " special Id for lett | right hand pressing
  | "SpaceRight"         // " " special Id for lett | right hand pressing
