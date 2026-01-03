import { type ActorRefFrom,assign, sendTo, setup } from "xstate";

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
            (key) => isModifierKey(key) && key !== event.keyCapId
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
      const result = isTextKey(event.keyCapId);
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
  /** @xstate-layout N4IgpgJg5mDOIC5QGswE8BGB7AhgJwgGIBpAUQE0B9AVQAUBtABgF1FQAHLWASwBdusAOzYgAHogAcjAMwA6AKwAmAJzKALMoCMizYwBsitQBoQaRAFppM2QHYJBm4zWNl+m4YC+Hk6ky4CJBQ0DJqsSCCcPPxCIuIIyvLKsrqaynqMjPKMEpqaEiZmCOapjLKqjNqaenZqavLaXj7o2PhEAEqkAMqkACpMYRxcfALC4XF5agrSEtLVetLyesp28gUWKnLqNnpqVqp2Ko0gvi0BZFQAIgDyAOoAcv0ikcMxY4izmrY5au6ai1qZNZFDZlH47PbLCSHbzHZr+IjnSjXe70UJPIbRUagOLyRyyRiybbVNR-Gw2ZRA4ppWSKWkSSEEpR5ZRHE7w2QAG24sF4YEE3EEUEIj3Cz0xsUQVSSansiihVWkaWmeiBZNstX09SlizlrLhrVkeDAAGMsFB+QAvSDCljoqIjCUINR6T6a6QLRJLHRVIGlVS1GzyRbzckyGxqLwwwRYCBwERs1p2l5YsSSlzJDRh6ryZ05SmKz66LRpFR1aSE+R6vwG7gQDlgJPit4IUkZ1zSbaB3OaSm6OS7eQSXHuTKaH6KKunCCc7m8-mCxsO5sB2yZNIuDtDxSq+TJRJ1cPzHRBicwhMEQ0ms2WyCL17Y97uWQSHI2RVKCrKWYq0wWPuyAchzJRRR3HSMPCAA */
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
