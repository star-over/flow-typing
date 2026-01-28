import { type ActorRefFrom,assign, sendTo, setup } from "xstate";

 import { keyboardLayoutANSI } from '@/data/keyboard-layout-ansi';
import { KeyCapId } from "@/interfaces/key-cap-id";
import { isModifierKey, isTextKey } from "@/lib/symbol-utils";

/**
 * @description Контекст машины `keyboardMachine`.
 * @property {Set<KeyCapId>} pressedKeys - Множество кодов нажатых в данный момент клавиш.
 * @property {ActorRefFrom<any>} parentActor - Ссылка на родительский актор.
 * ВАЖНО: Здесь используется `any` в качестве временного решения для обхода сложной
 * циклической зависимости типов между `keyboardMachine` и `appMachine`.
 * `appMachine` вызывает `keyboardMachine`, а `keyboardMachine` должна знать тип `appMachine`
 * для отправки событий. Это создает цикл, который сложно разрешить со строгой типизацией
 * в текущей конфигурации TypeScript и XState.
 */
export interface KeyboardMachineContext {
  pressedKeys: Set<KeyCapId>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parentActor: ActorRefFrom<any>; // Using any temporarily to resolve circular dependency
}

export type KeyboardMachineEvent =
  | { type: "KEY_DOWN"; keyCapId: KeyCapId }
  | { type: "KEY_UP"; keyCapId: KeyCapId }
  | { type: "RESET" };

export const keyboardMachine = setup({
  types: {
    context: {} as KeyboardMachineContext,
    events: {} as KeyboardMachineEvent,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    input: {} as { parentActor: ActorRefFrom<any> }, // Using any temporarily to resolve circular dependency
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
            (key) => isModifierKey(key, keyboardLayoutANSI) && key !== event.keyCapId
          )
        );
      },
    }),
    clearKeys: assign(() => ({
      pressedKeys: new Set<KeyCapId>(),
    })),
    recognizePressedKeys: sendTo(
      ({ context }) => context.parentActor, // Use explicitly passed parentActor
      ({ context }) => ({
        type: "KEYBOARD.RECOGNIZED",
        keys: Array.from(context.pressedKeys),
      })
    ),
  },
  guards: {
    isTextKeyGuard: ({
      event
    }) => {
      if (event.type !== "KEY_DOWN") return false;
      // The physical spacebar 'Space' should be treated as a text key
      // even though our virtual layout uses 'SpaceLeft' and 'SpaceRight'.
      if (event.keyCapId === 'Space') return true;
      const result = isTextKey(event.keyCapId, keyboardLayoutANSI);
      return result;
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
        target: ".recognized",
        guard: "isTextKeyGuard",
        actions: ["addKeyCapId"],
      },
      {
        target: ".listening",
        // This transition is taken if the guard on the first one fails.
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
    recognized: {
      entry: ["recognizePressedKeys"],
      always: {
        target: "listening",
      },
    },
  },
});
