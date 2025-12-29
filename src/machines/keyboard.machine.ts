import { KeyCapId } from "@/interfaces/key-cap-id";
import { isModifierKey, isTextKey } from "@/lib/symbol-utils";
import { assign, setup } from "xstate";

export interface KeyboardMachineContext {
  pressedKeys: Set<KeyCapId>;
  onRecognize: (keys: KeyCapId[]) => void;
}

export type KeyboardMachineEvent =
  | { type: "KEY_DOWN"; keyCapId: KeyCapId }
  | { type: "KEY_UP"; keyCapId: KeyCapId }
  | { type: "RESET" };

export const keyboardMachine = setup({
  types: {
    context: {} as KeyboardMachineContext,
    events: {} as KeyboardMachineEvent,
    input: {} as { onRecognize: (keys: KeyCapId[]) => void },
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
    recognizePressedKeys: ({
      context
    }) => {
      context.onRecognize(Array.from(context.pressedKeys));
    },
  },
  guards: {
    isTextKeyGuard: ({
      event
    }) => {
      if (event.type !== "KEY_DOWN") return false;
      return isTextKey(event.keyCapId);
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
  /** @xstate-layout N4IgpgJg5mDOIC5QGswE8BGB7AhgJwgGIBpAUQE0B9AVQAUBtABgF1FQAHLWASwBdusAOzYgAHogAcjAMwA6AKwAmAJzKALMoCMizYwBsitQBoQaRAFppM2QHYJBm4zWNl+m4YC+Hk6ky4CJBQ0DJqsSCCcPPxCIuIIyvLKsrqaynqMjPKMEpqaEiZmCOapjLKqjNqaenZqavLaXj7o2PhEAEqkAMqkACpMYRxcfALC4XF5agrSEtLVetLyesp28gUWKnLqNnpqVqp2Ko0gvi0BZFQAIgDyAOoAcv0ikcMxY4izmrY5au6ai1qZNZFDZlH47PbLCSHbzHZr+IjnSjXe70UJPIbRUagOLyRyyRiKbbVNR-Gw2ZRA4ppWSKWkSSEEpR5ZRHE7w2QAG24sF4YEE3EEUEIj3Cz0xsUQVSSansiihVWkaWmeiBZNstX09SlizlrLhrVkeDAAGMsFB+QAvSDCljoqIjCUINR6T6a6QLRJLHRVIGlVS1GzyRbzckyGxqLwwwRYCBwERs1p2l5YsSSlzJDRh6ryZ05SmKz66LRpFR1aSE+R6vwG7gQDlgJPit4IUkZ1zSbaB3OaSm6OS7eQSXHuTKaH6KKunCCc7m8-mCxsO5sB2yZNIuDtDxSq+TJRJ1cPzHRBicwhMEQ0ms2WyCL17Y97uWQSHI2RVKCrKWYq0wWPuyAchzJRRR3HSMPCAA */
  id: "keyboard",
  context: ({
    input
  }) => ({
    pressedKeys: new Set<KeyCapId>(),
    onRecognize: input.onRecognize,
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
