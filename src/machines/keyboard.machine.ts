import { assign, sendTo, setup } from "xstate";

import { KeyCapId, ParentActor, KeyboardLayout } from "@/interfaces/types";
import { isModifierKey, isTextKey } from "@/lib/symbol-utils";
/**
 * @description Контекст машины `keyboardMachine`.
 * @property {Set<KeyCapId>} pressedKeys - Множество кодов нажатых в данный момент клавиш.
 * @property {ParentActor} parentActor - Ссылка на родительский актор.
 */
export interface KeyboardMachineContext {
  pressedKeys: Set<KeyCapId>;
  parentActor: ParentActor;
  keyboardLayout: KeyboardLayout; // Added
}

export type KeyboardMachineEvent =
  | { type: "KEY_DOWN"; keyCapId: KeyCapId }
  | { type: "KEY_UP"; keyCapId: KeyCapId }
  | { type: "RESET" };

export const keyboardMachine = setup({
  types: {
    context: {} as KeyboardMachineContext,
    events: {} as KeyboardMachineEvent,
    input: {} as { parentActor: ParentActor; keyboardLayout: KeyboardLayout }, // Added
    // New types for output events
    output: {} as
      | { type: "KEYBOARD.CHARACTER_INPUT"; keys: KeyCapId[] }
      | { type: "KEYBOARD.NAVIGATION_KEY"; key: KeyCapId },
  },
  actions: {
    addKeyCapId: assign(({
      context,
      event
    }) => {
      if (event.type !== "KEY_DOWN") {
        return {};
      }
      const newSet = new Set(context.pressedKeys);
      newSet.add(event.keyCapId);
      return {
        pressedKeys: newSet,
      };
    }),
    removeKeyCapId: assign(({
      context,
      event
    }) => {
      if (event.type !== "KEY_UP") {
        return {};
      }
      const newSet = new Set(context.pressedKeys);
      newSet.delete(event.keyCapId);
      return {
        pressedKeys: newSet,
      };
    }),
    clearNonModifierKeysOnMetaUp: assign({
      pressedKeys: ({ context, event }) => {
        if (event.type !== 'KEY_UP') return context.pressedKeys;

        // При отпускании Meta клавиши удаляем все не модификаторы
        // Оставляем только другие модификаторы
        return new Set(
          Array.from(context.pressedKeys).filter(
            (key) => isModifierKey(key, context.keyboardLayout) && key !== event.keyCapId
          )
        );
      },
    }),
    clearKeys: assign(() => ({
      pressedKeys: new Set<KeyCapId>(),
    })),
    // New actions to send specific types of events
    sendCharacterInput: sendTo(
      ({ context }) => context.parentActor,
      ({ context }) => ({
        type: "KEYBOARD.CHARACTER_INPUT",
        keys: Array.from(context.pressedKeys),
      })
    ),
    sendNavigationKey: sendTo(
      ({ context, event: _event }) => context.parentActor, // Renamed event to _event
      ({ event }) => ({
        type: "KEYBOARD.NAVIGATION_KEY",
        // Cast event to KEY_DOWN to access keyCapId
        key: (event as { type: "KEY_DOWN"; keyCapId: KeyCapId }).keyCapId,
      })
    ),
  },
  guards: {
    isTextKeyGuard: ({
      context, // Added context to guard arguments
      event
    }) => {
      if (event.type !== "KEY_DOWN") return false;
      // The physical spacebar 'Space' should be treated as a text key
      // even though our virtual layout uses 'SpaceLeft' and 'SpaceRight'.
      if (event.keyCapId === 'Space') return true;
      const result = isTextKey(event.keyCapId, context.keyboardLayout);
      return result;
    },
    isNavigationalKeyGuard: ({ context, event }) => {
      if (event.type !== "KEY_DOWN") return false;
      // Only recognize as navigational if it's a single key press (no modifiers)
      if (context.pressedKeys.size > 0 && !context.pressedKeys.has(event.keyCapId)) return false; // Already pressing other keys

      const navKeys: KeyCapId[] = ['Escape', 'Enter']; // Add other navigational keys here if needed
      return navKeys.includes(event.keyCapId);
    },
    areKeysEmpty: ({
      context
    }) => context.pressedKeys.size === 0,
    isMetaKeyUp: ({ event }) => {
      if (event.type !== "KEY_UP") return false;
      return event.keyCapId === "MetaLeft" || event.keyCapId === "MetaRight";
    },
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QGswE8BGB7AhgJwgGIBpAUQE0B9AVQAUBtABgF1FQAHLWASwBdusAOzYgAHogCMUgHQSAbIwkB2RgBZGATgCsygBwAaEGkQBaJbumLtAJgDMW9buvWtWgL5vDqTLgIkKNAwSrEggnDz8QiLiCBK6WtKqyhrWjHIa6nJyqlqGxgip1tIajEqu1jmMtkpKGroeXujY+EQASqQAyqQAKkwhHFx8AsKhMRrasuMatlXmWnW2eaa6ttJytrqKrjULuvWeIN7NfmRUACIA8gDqAHJ9IuFDUaOI1atSjGpSdrpZuUbLVbrTYSba1FZ7BqHJq+IinSiXW70YIPQaREagGJ-aSpdZZTbzawaORLBAmFZrDZbLQ7CH7Ro+FrSAA23FgvDAgm4gighHuoUe6OiiCcEhxEOSG1U1jkBgBBRS0i0n3WdisWmyqihR1h0jwYAAxlgoFyAF6QPksVERYbChCqJRFWzTXQaKTpWzWJQ5UlxIFSWy2eRlLKO2weA6CLAQOAiHUta1PDFiRDrWQKZRqTQ6cxqUkmTPFBQpEpKbJ1ZzamFM7gQZlgRNCl4IcYJR1h+ZKT2qaWkmVKSyKazxRjD1RvLUHeMEFlsjlcnmN23NlQJUFlZyqdIVGV9kqJUHjEPWUHjquMmf6o0m7jmiBL56Y166VQ4iSjupOTRycwk+XqaQagUFxdCUd8Tw0JQIzcIA */
  id: "keyboard",
  context: ({ input }) => ({
    pressedKeys: new Set<KeyCapId>(),
    parentActor: input.parentActor,
    keyboardLayout: input.keyboardLayout,
  }),
  on: {
    // Общие обработчики для всех состояний
    KEY_UP: [
      {
        target: ".listening",
        guard: "isMetaKeyUp",
        actions: "clearNonModifierKeysOnMetaUp",
      },
      {
        target: ".listening", // The default handler
        actions: "removeKeyCapId",
      },
    ],
    RESET: {
      target: ".idle",
      actions: "clearKeys",
    },
    KEY_DOWN: [
      {
        target: ".recognizedNavigation",
        guard: "isNavigationalKeyGuard",
        actions: ["addKeyCapId", "sendNavigationKey", "clearKeys"],
      },
      {
        target: ".recognizedCharacter",
        guard: "isTextKeyGuard",
        actions: ["addKeyCapId", "sendCharacterInput", "clearKeys"], // Clear keys immediately after sending
      },
      {
        target: ".listening", // Fallback for other keys (e.g., modifiers)
        actions: ["addKeyCapId"],
      },
    ],
  },
  initial: "idle",
  states: {
    idle: {
      entry: "clearKeys",
    },
    listening: {
      // Если после KEY_UP не осталось клавиш, переходим в idle
      always: [{
        guard: "areKeysEmpty",
        target: "idle",
      }, ],
    },
    recognizedCharacter: {
      // Temporary state to send the event and then return to listening
      always: {
        target: "listening",
      },
    },
    recognizedNavigation: {
      // Temporary state to send the event and then return to listening
      always: {
        target: "listening",
      },
    },
  },
});
